import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, all, unresolvedThreads, facts, main } from './run.mjs';

const head = 'a'.repeat(40), repo = 'frankxai/example';
const spec = [{ name: 'release aggregate', appId: 15368, workflowPath: '.github/workflows/ci.yml' }];
const env = { GITHUB_TOKEN: 'fixture-not-a-credential', GITHUB_REPOSITORY: repo, PR_NUMBER: '12', PR_GATE_REQUIRED_CHECKS: JSON.stringify(spec) };
const pr = { head: { sha: head, ref: 'codex/example' }, state: 'open', draft: false, changed_files: 1, body: 'Serves #1', labels: [] };
const threads = { data: { repository: { pullRequest: { reviewThreads: { nodes: [], pageInfo: { hasNextPage: false } } } } } };
function mock(options = {}) {
  const writes = []; let prReads = 0, jobReads = 0;
  const api = async (path, init = {}) => {
    if (init.method && init.method !== 'GET' && path !== '/graphql') { writes.push({ path, ...init }); return {}; }
    if (path === '/graphql') return options.threads ?? threads;
    if (path === `/repos/${repo}/pulls/12`) { prReads++; return { ...pr, ...(options.pr ?? {}), head: { ...pr.head, sha: options.race && prReads > 1 ? 'b'.repeat(40) : head } }; }
    if (path.includes('/pulls/12/files')) return [{ filename: 'src/x.mjs', status: 'modified' }];
    if (path.includes('/pulls/12/reviews')) return [];
    if (path.includes('/issues/12/comments')) return options.comments ?? [];
    if (path.includes('/check-runs?')) return { check_runs: options.checks ?? [{ id: 99, name: 'release aggregate', head_sha: head, status: 'completed', conclusion: 'success', app: { id: 15368 }, check_suite: { id: 7 }, details_url: `https://github.com/${repo}/actions/runs/77/job/100` }] };
    if (path.includes('/actions/runs/77/attempts/2/jobs')) { jobReads++; return { jobs: options.jobs ?? [{ name: 'release aggregate', check_run_url: `https://api.github.com/repos/${repo}/check-runs/99` }] }; }
    if (path.endsWith('/actions/runs/77')) return { id: 77, head_sha: options.runHead ?? head, check_suite_id: 7, path: '.github/workflows/ci.yml', run_attempt: 2, repository: { full_name: repo } };
    throw new Error('unexpected endpoint ' + path);
  };
  return { api, writes, jobReads: () => jobReads };
}

test('report mode never calls a merge endpoint', async () => {
  const m = mock(); assert.equal(await main(env, m.api), 1);
  assert.equal(m.writes.length, 1); assert.match(m.writes[0].path, /\/comments$/);
  assert.match(JSON.parse(m.writes[0].body).body, /independence is \*\*unverified\*\*/);
});
test('merge=true is refused before any API call', async () => {
  let calls = 0; await assert.rejects(main({ ...env, PR_GATE_MERGE: 'true' }, async () => { calls++; }), /automatic merging disabled/); assert.equal(calls, 0);
});
test('a forged sticky marker in a human comment is never edited', async () => {
  const m = mock({ comments: [{ id: 1, body: '<!-- starlight-pr-gate --> forged', user: { type: 'User', login: 'frankxai' } }] });
  await main(env, m.api); assert.equal(m.writes[0].method, 'POST');
});
test('own sticky report is updated instead of duplicated on re-evaluation', async () => {
  const m = mock({ comments: [{ id: 2, body: '<!-- starlight-pr-gate --> old', user: { type: 'Bot', login: 'github-actions[bot]' } }] });
  await main(env, m.api); assert.equal(m.writes[0].method, 'PATCH'); assert.match(m.writes[0].path, /comments\/2$/);
});
test('head race prevents a stale report write', async () => {
  const m = mock({ race: true }); await assert.rejects(main(env, m.api), /head moved/); assert.equal(m.writes.length, 0);
});
test('missing checks still produce a blocked diagnostic', async () => {
  const m = mock({ checks: [] }); await main(env, m.api); assert.match(m.writes[0].body, /never ran/);
});
test('incomplete file lists are identified instead of certified', async () => {
  const m = mock({ pr: { changed_files: 3001 } }); const r = await facts(m.api, repo, 12, spec); assert.equal(r.f.incomplete, 'saw 1 of 3001 changed files');
});
test('check provenance includes current-attempt job membership', async () => {
  const m = mock(); const r = await facts(m.api, repo, 12, spec);
  assert.equal(r.f.checkRuns[0].workflowPath, '.github/workflows/ci.yml'); assert.equal(r.f.checkRuns[0].runAttempt, 2); assert.equal(m.jobReads(), 1);
});
test('older attempts are excluded using the current attempt job API', async () => {
  const m = mock({ jobs: [] }); const r = await facts(m.api, repo, 12, spec); assert.equal(r.f.checkRuns[0].superseded, true);
});
test('run metadata from a stale head is untrusted', async () => {
  const m = mock({ runHead: 'b'.repeat(40) }); const r = await facts(m.api, repo, 12, spec); assert.equal(r.f.checkRuns[0].workflowPath, undefined);
});
test('GraphQL errors with partial data fail closed', async () => {
  const m = mock({ threads: { ...threads, errors: [{ message: 'partial result' }] } }); await assert.rejects(main(env, m.api), /unreadable/); assert.equal(m.writes.length, 0);
});
test('unreadable thread state and repeated cursors fail closed', async () => {
  await assert.rejects(unresolvedThreads(async () => ({}), 'x', 'y', 1), /unreadable/);
  const data = { data: { repository: { pullRequest: { reviewThreads: { nodes: [], pageInfo: { hasNextPage: true, endCursor: 'same' } } } } } };
  await assert.rejects(unresolvedThreads(async () => data, 'x', 'y', 1), /did not advance/);
});
test('pagination reads every page and rejects truncated or malformed responses', async () => {
  let calls = 0; const result = await all(async () => ++calls === 1 ? Array(100).fill({}) : [{ last: true }], '/test'); assert.equal(result.length, 101); assert.equal(calls, 2);
  await assert.rejects(all(async () => ({}), '/test'), /invalid paginated/);
  await assert.rejects(all(async () => Array(100).fill({}), '/test'), /exceeded 5,000/);
});
test('invalid PR numbers cannot inject shell, path or extra API requests', async () => {
  for (const PR_NUMBER of ['12/merge', '12;echo hi', '-1', '1e2', '0']) assert.equal(await main({ ...env, PR_NUMBER }, () => { throw new Error('must not be called'); }), 0);
});
test('GET retries are bounded; API denial does not retry or print response bodies', async () => {
  let calls = 0; const client = createClient('fixture', async (_, init) => { assert.ok(init.signal); calls++; return { ok: false, status: 503 }; }, async () => {});
  await assert.rejects(client('/test'), /HTTP 503/); assert.equal(calls, 3);
  calls = 0; const denied = createClient('fixture', async () => { calls++; return { ok: false, status: 403, text: () => { throw new Error('private body'); } }; });
  await assert.rejects(denied('/test'), /HTTP 403/); assert.equal(calls, 1);
});
test('uncertain writes are never retried', async () => {
  let calls = 0; const client = createClient('fixture', async () => { calls++; return { ok: false, status: 503 }; });
  await assert.rejects(client('/comments', { method: 'POST' }), /HTTP 503/); assert.equal(calls, 1);
});
test('malicious check details URLs are not fetched', async () => {
  const m = mock({ checks: [{ id: 99, name: 'release aggregate', app: { id: 15368 }, details_url: 'https://evil.invalid/actions/runs/77' }] });
  const r = await facts(m.api, repo, 12, spec); assert.equal(r.f.checkRuns[0].workflowPath, undefined); assert.equal(m.jobReads(), 0);
});
