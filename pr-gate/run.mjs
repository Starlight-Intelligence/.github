// Trusted default-branch report runner. Never checks out or executes PR source.
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { decide } from './decide.mjs';

const STICKY = '<!-- starlight-pr-gate -->';
const ACTIONS_BOT = 'github-actions[bot]';
export function createClient(token, request = fetch, pause = ms => new Promise(r => setTimeout(r, ms))) {
  return async function api(path, init = {}) {
    const method = init.method || 'GET';
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await request(`https://api.github.com${path}`, {
        ...init,
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
        signal: AbortSignal.timeout(15_000),
      });
      if (method === 'GET' && [429, 502, 503, 504].includes(response.status) && attempt < 2) { await pause(250 * 2 ** attempt); continue; }
      // Do not echo private response bodies or retry uncertain writes.
      if (!response.ok) throw new Error(`${method} ${path} -> HTTP ${response.status}`);
      return response.status === 204 ? null : response.json();
    }
  };
}

export async function all(api, path) {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const batch = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    const items = Array.isArray(batch) ? batch : batch?.check_runs ?? batch?.jobs;
    if (!Array.isArray(items)) throw new Error('invalid paginated API response');
    out.push(...items);
    if (items.length < 100) return out;
  }
  throw new Error('API pagination exceeded 5,000 items');
}

export async function resolvePrNumber(env, api) {
  if (env.PR_GATE_EVENT_RESOLVED === 'true' || env.GITHUB_EVENT_NAME !== 'workflow_run') {
    const raw = String(env.PR_NUMBER || '').trim();
    return /^[1-9][0-9]{0,8}$/.test(raw) ? Number(raw) : null;
  }
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  const id = event.workflow_run?.id;
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('workflow run identity unavailable');
  // The event title, relay output and attached PR array supply no authority.
  // Re-read the run and resolve current open PRs by its actual repository/head.
  const run = await api(`/repos/${env.GITHUB_REPOSITORY}/actions/runs/${id}`);
  const allowed = String(env.PR_GATE_ALLOWED_WORKFLOWS || '.github/workflows/ci.yml,.github/workflows/pr-gate-poke.yml').split(',');
  if (run.repository?.full_name !== env.GITHUB_REPOSITORY || !/^[a-f0-9]{40}$/.test(run.head_sha || '') || !allowed.includes(run.path?.split('@')[0])) throw new Error('untrusted workflow run relay');
  if (run.event === 'push') return null; // Main CI completion is not a PR review event.
  if (!['pull_request', 'pull_request_review'].includes(run.event)) throw new Error('untrusted workflow run relay');
  const prs = await all(api, `/repos/${env.GITHUB_REPOSITORY}/commits/${run.head_sha}/pulls`);
  const candidates = prs.filter(p => p.state === 'open' && p.head?.sha === run.head_sha && p.head?.repo?.full_name === run.head_repository?.full_name && p.base?.repo?.full_name === env.GITHUB_REPOSITORY);
  if (candidates.length > 1) throw new Error('workflow head maps to multiple open PRs');
  return candidates[0]?.number ?? null;
}

export async function unresolvedThreads(api, owner, name, number) {
  const query = 'query($o:String!,$n:String!,$p:Int!,$c:String){repository(owner:$o,name:$n){pullRequest(number:$p){reviewThreads(first:100,after:$c){nodes{isResolved}pageInfo{hasNextPage endCursor}}}}}';
  let count = 0, cursor = null;
  for (let page = 0; page < 50; page++) {
    const r = await api('/graphql', { method: 'POST', body: JSON.stringify({ query, variables: { o: owner, n: name, p: number, c: cursor } }) });
    const threads = r?.data?.repository?.pullRequest?.reviewThreads;
    if (r?.errors?.length || !Array.isArray(threads?.nodes) || typeof threads?.pageInfo?.hasNextPage !== 'boolean' || threads.nodes.some(n => typeof n?.isResolved !== 'boolean')) throw new Error('review threads unreadable');
    count += threads.nodes.filter(n => !n.isResolved).length;
    if (!threads.pageInfo.hasNextPage) return count;
    if (!threads.pageInfo.endCursor || threads.pageInfo.endCursor === cursor) throw new Error('review thread cursor did not advance');
    cursor = threads.pageInfo.endCursor;
  }
  throw new Error('review threads exceeded 5,000');
}

export async function facts(api, repo, number, requiredChecks) {
  const [owner, name] = repo.split('/');
  const pr = await api(`/repos/${repo}/pulls/${number}`);
  if (!/^[a-f0-9]{40}$/.test(pr?.head?.sha || '')) throw new Error('full PR head unavailable');
  const head = pr.head.sha;
  const [files, comments, reviews, checks, threads] = await Promise.all([
    all(api, `/repos/${repo}/pulls/${number}/files`),
    all(api, `/repos/${repo}/issues/${number}/comments`),
    all(api, `/repos/${repo}/pulls/${number}/reviews`),
    all(api, `/repos/${repo}/commits/${head}/check-runs?filter=all`),
    unresolvedThreads(api, owner, name, number),
  ]);
  if (checks.length > 300) throw new Error('too many check runs for bounded provenance inspection');
  const runCache = new Map();
  const jobCache = new Map();
  const checkRuns = [];
  // Only authenticated required contexts can earn CI credit. Never fetch an
  // untrusted details_url: parse its run ID and use the selected repo's API.
  for (const c of checks) {
    let workflowPath, runId, runAttempt, superseded = false;
    if (requiredChecks.some(s => (typeof s === 'string' ? s : s.name) === c.name) && c.app?.id === 15368) {
      let url;
      try { url = new URL(c.details_url); } catch { /* invalid origin stays untrusted */ }
      const prefix = `/${repo}/actions/runs/`;
      const match = url?.origin === 'https://github.com' && url.pathname.startsWith(prefix) ? /^(\d+)(?:\/job\/\d+)?$/.exec(url.pathname.slice(prefix.length)) : null;
      if (match) {
        const id = Number(match[1]);
        if (!runCache.has(id)) runCache.set(id, await api(`/repos/${repo}/actions/runs/${id}`));
        const run = runCache.get(id);
        if (run.head_sha === head && run.repository?.full_name === repo && run.check_suite_id === c.check_suite?.id) {
          if (!Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1) throw new Error('run attempt unavailable');
          if (!jobCache.has(id)) jobCache.set(id, await all(api, `/repos/${repo}/actions/runs/${id}/attempts/${run.run_attempt}/jobs`));
          const jobs = jobCache.get(id);
          const job = jobs.find(j => j.check_run_url === `https://api.github.com/repos/${repo}/check-runs/${c.id}`);
          if (job && job.name === c.name) {
            workflowPath = run.path?.split('@')[0]; runId = run.id; runAttempt = run.run_attempt;
          } else superseded = true;
        }
      }
    }
    checkRuns.push({ id: c.id, name: c.name, status: c.status, conclusion: c.conclusion, appId: c.app?.id, headSha: c.head_sha, workflowPath, runId, runAttempt, superseded });
  }
  return { pr, f: {
    headRef: pr.head.ref, headSha: head, requiredChecks, draft: pr.draft, state: pr.state,
    body: pr.body || '', labels: pr.labels.map(l => l.name),
    incomplete: !Number.isSafeInteger(pr.changed_files) || files.length !== pr.changed_files ? `saw ${files.length} of ${pr.changed_files} changed files` : '',
    files: files.map(x => ({ filename: x.filename, status: x.status, previousFilename: x.previous_filename })),
    comments: comments.filter(c => !(c.user?.type === 'Bot' && c.user?.login === ACTIONS_BOT && c.body?.includes(STICKY))),
    reviews: reviews.map(r => ({ user: r.user, commitId: r.commit_id, state: r.state, body: r.body })),
    checkRuns, unresolvedThreads: threads, selfPrefix: 'pr-gate',
  } };
}

export async function main(env = process.env, apiOverride) {
  if (env.PR_GATE_MERGE === 'true') throw new Error('automatic merging disabled: gate qualification and authenticated maker evidence are missing');
  const repo = env.GITHUB_REPOSITORY;
  if (!env.GITHUB_TOKEN || !/^[\w.-]+\/[\w.-]+$/.test(repo || '')) throw new Error('valid repository and token required');
  const api = apiOverride || createClient(env.GITHUB_TOKEN);
  const number = await resolvePrNumber(env, api);
  if (!number) { console.log('no current PR associated with this event; no report'); return 0; }
  const raw = env.PR_GATE_REQUIRED_CHECKS || '';
  const requiredChecks = raw.startsWith('[') ? JSON.parse(raw) : raw.split(',').map(s => s.trim()).filter(Boolean);
  if (!Array.isArray(requiredChecks) || requiredChecks.some(s => typeof s !== 'string' && (!s || typeof s.name !== 'string'))) throw new Error('invalid required-check policy');
  const { f } = await facts(api, repo, number, requiredChecks);
  const d = decide(f);
  // Do not overwrite a newer report with facts from an older head.
  const current = await api(`/repos/${repo}/pulls/${number}`);
  if (current.head?.sha !== f.headSha) throw new Error('head moved while collecting facts; wait for the synchronize event');
  const body = [STICKY, `**pr-gate report: ${d.reasons.length ? 'BLOCKED' : 'WAITING'}** on \`${d.head}\``,
    `Branch routing hint: \`${d.author}\`; implementation-provider independence is **unverified**.`,
    ...d.reasons.map(s => `- blocked: ${s}`), ...d.waiting.map(s => `- waiting: ${s}`),
    '', `Observed at ${new Date().toISOString()}; run ${env.GITHUB_RUN_ID || 'local'}.`,
    'Report-only. No merge, production approval or independently authenticated maker receipt is supplied by this workflow.',
  ].join('\n');
  const comments = await all(api, `/repos/${repo}/issues/${number}/comments`);
  const own = comments.filter(c => c.user?.type === 'Bot' && c.user?.login === ACTIONS_BOT && c.body?.startsWith(STICKY)).sort((a, b) => b.id - a.id)[0];
  if (own) await api(`/repos/${repo}/issues/comments/${own.id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
  else await api(`/repos/${repo}/issues/${number}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, body + '\n');
  console.log(body);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.exitCode = await main(); }
  catch (e) { console.error(`pr-gate failed closed: ${e.message}`); process.exitCode = 1; }
}
