// run.mjs: fetch the facts for one PR, decide, report, and merge on a clean pass.
// No dependencies: Node 20+ fetch against the GitHub API with the workflow's GITHUB_TOKEN.
// It never checks out or executes the PR's code.
import { appendFileSync } from 'node:fs';
import { decide } from './decide.mjs';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const number = Number(process.env.PR_NUMBER);
const merge = process.env.PR_GATE_MERGE === 'true';
const waitMinutes = Number(process.env.PR_GATE_WAIT_MINUTES || 8);
const selfPrefix = (process.env.PR_GATE_SELF_PREFIX || 'pr-gate').toLowerCase();
const requiredChecks = String(process.env.PR_GATE_REQUIRED_CHECKS || '').split(',').map((s) => s.trim()).filter(Boolean);
const STICKY = '<!-- starlight-pr-gate -->';

if (!token || !repo || !number) { console.error('GITHUB_TOKEN, GITHUB_REPOSITORY and PR_NUMBER are required'); process.exit(2); }
const [owner, name] = repo.split('/');

async function api(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(init.headers || {}) },
  });
  if (!res.ok) throw Object.assign(new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`), { status: res.status });
  return res.status === 204 ? null : res.json();
}
async function all(path) {
  const out = [];
  for (let page = 1; page < 50; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const batch = await api(`${path}${sep}per_page=100&page=${page}`);
    const items = Array.isArray(batch) ? batch : batch.check_runs;
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}
// Every page, and a GraphQL error is a failure: a missing answer must never read as zero threads.
async function unresolvedThreads() {
  const q = `query($o:String!,$n:String!,$p:Int!,$c:String){repository(owner:$o,name:$n){pullRequest(number:$p){reviewThreads(first:100,after:$c){nodes{isResolved}pageInfo{hasNextPage endCursor}}}}}`;
  let count = 0;
  let cursor = null;
  for (let i = 0; i < 50; i++) {
    const r = await api('/graphql', { method: 'POST', body: JSON.stringify({ query: q, variables: { o: owner, n: name, p: number, c: cursor } }) });
    const t = r.data?.repository?.pullRequest?.reviewThreads;
    if (r.errors?.length || !t) throw new Error(`review threads unreadable: ${JSON.stringify(r.errors || 'no data').slice(0, 300)}`);
    count += t.nodes.filter((n) => !n.isResolved).length;
    if (!t.pageInfo.hasNextPage) return count;
    cursor = t.pageInfo.endCursor;
  }
  throw new Error('review threads exceed 5,000');
}

async function facts() {
  const pr = await api(`/repos/${repo}/pulls/${number}`);
  const head = pr.head.sha;
  const [files, comments, reviews, checkRuns, threads] = await Promise.all([
    all(`/repos/${repo}/pulls/${number}/files`),
    all(`/repos/${repo}/issues/${number}/comments`),
    all(`/repos/${repo}/pulls/${number}/reviews`),
    // filter=latest: only the newest attempt of each check counts, so a rerun that failed wins
    // over an older success.
    all(`/repos/${repo}/commits/${head}/check-runs?filter=latest`),
    unresolvedThreads(),
  ]);
  // The files endpoint stops at 3,000; a protected path past that point must not go unseen.
  const incomplete = files.length < pr.changed_files ? `saw ${files.length} of ${pr.changed_files} changed files` : '';
  return {
    pr,
    f: {
      headRef: pr.head.ref,
      headSha: head,
      incomplete,
      requiredChecks,
      draft: pr.draft,
      state: pr.state,
      body: pr.body || '',
      labels: pr.labels.map((l) => l.name),
      files: files.map((x) => ({ filename: x.filename, status: x.status })),
      comments: comments.filter((c) => !String(c.body || '').includes(STICKY)).map((c) => ({ body: c.body, user: c.user, createdAt: c.created_at })),
      reviews: reviews.map((r) => ({ user: r.user, commitId: r.commit_id, state: r.state, body: r.body })),
      checkRuns: checkRuns.map((r) => ({ name: r.name, status: r.status, conclusion: r.conclusion })),
      unresolvedThreads: threads,
      selfPrefix,
    },
  };
}

// Wait only when CI is the sole thing outstanding, so a PR that is otherwise clean lands in the
// same run instead of waiting for the next event.
let { pr, f } = await facts();
let d = decide(f);
const deadline = Date.now() + waitMinutes * 60_000;
while (d.pending && d.waiting.every((w) => w.startsWith('CI still running')) && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 30_000));
  ({ pr, f } = await facts());
  d = decide(f);
}

let merged = null;
if (d.ok && merge) {
  // Decide again from fresh facts immediately before merging, so a dismissal, hold label or failed
  // rerun during the wait is seen. The window that remains is milliseconds, not minutes; only a
  // required check under branch protection closes it fully.
  ({ pr, f } = await facts());
  d = decide(f);
}
if (d.ok && merge) {
  try {
    // `sha` makes the merge refuse if the head moved after the decision was made.
    const r = await api(`/repos/${repo}/pulls/${number}/merge`, { method: 'PUT', body: JSON.stringify({ merge_method: 'squash', sha: d.head }) });
    merged = r.sha;
  } catch (e) {
    d.ok = false;
    d.reasons.push(`merge refused by GitHub: ${e.message.slice(0, 300)}`);
  }
}

const verdict = merged ? 'MERGED' : d.ok ? 'PASS' : d.pending ? 'WAITING' : 'BLOCKED';
const lines = [
  STICKY,
  `**pr-gate: ${verdict}** on \`${d.head.slice(0, 7)}\` · author harness \`${d.author}\`${d.signers.length ? ` · reviewed by ${d.signers.join(', ')}` : ''}`,
  d.advisory.length ? `- typed sign-off from ${d.advisory.join(', ')} noted; typed lines are unauthenticated and do not count here (use the estate pr-gate for a human-run merge)` : '',
  ...d.reasons.map((r) => `- blocked: ${r}`),
  ...d.waiting.map((w) => `- waiting: ${w}`),
  merged ? `- squash-merged as \`${merged.slice(0, 7)}\`` : '',
  d.ok && !merge ? '- this repo runs the gate in report-only mode; merge through `pr-gate merge`' : '',
  '',
  '_Re-evaluates on push, bot review, bot comment, label and CI completion. Comment `/gate` to re-run. A new push invalidates every review._',
].filter(Boolean);
const body = lines.join('\n');

const existing = (await all(`/repos/${repo}/issues/${number}/comments`)).find((c) => String(c.body || '').includes(STICKY));
if (existing) await api(`/repos/${repo}/issues/comments/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
else await api(`/repos/${repo}/issues/${number}/comments`, { method: 'POST', body: JSON.stringify({ body }) });

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${body}\n`);
console.log(body);
process.exit(d.ok ? 0 : 1);
