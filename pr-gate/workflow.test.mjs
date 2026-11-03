import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolvePrNumber } from './run.mjs';
const head = 'a'.repeat(40), repo = 'frankxai/example';

async function fixture(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'pr-gate-relay-'));
  const path = join(dir, 'event.json');
  writeFileSync(path, JSON.stringify({ workflow_run: { id: 10, display_title: '999', pull_requests: [] } }));
  const env = { GITHUB_EVENT_NAME: 'workflow_run', GITHUB_EVENT_PATH: path, GITHUB_REPOSITORY: repo, PR_NUMBER: '999' };
  try { await fn(env); } finally { rmSync(dir, { recursive: true, force: true }); }
}
function relay(over = {}, prs) {
  return async path => {
    if (path.endsWith('/actions/runs/10')) return { path: '.github/workflows/ci.yml', event: 'pull_request', head_sha: head, repository: { full_name: repo }, head_repository: { full_name: 'outside/fork' }, ...over };
    if (path.includes('/commits/')) return prs ?? [{ number: 12, state: 'open', head: { sha: head, repo: { full_name: 'outside/fork' } }, base: { repo: { full_name: repo } } }];
    throw new Error('untrusted title caused a request: '+path);
  };
}
test('fork CI completion resolves PR by API head and never uses a numeric title', () => fixture(async env => assert.equal(await resolvePrNumber(env, relay()), 12)));
test('stale completion does not select another PR', () => fixture(async env => assert.equal(await resolvePrNumber(env, relay({}, [])), null)));
test('untrusted workflow path is refused', () => fixture(env => assert.rejects(resolvePrNumber(env, relay({ path: '.github/workflows/fake.yml' })), /untrusted/)));
test('untrusted repository is refused', () => fixture(env => assert.rejects(resolvePrNumber(env, relay({ repository: { full_name: 'outside/fork' } })), /untrusted/)));
test('ambiguous current heads fail closed', () => fixture(env => {
  const pr = { number: 12, state: 'open', head: { sha: head, repo: { full_name: 'outside/fork' } }, base: { repo: { full_name: repo } } };
  return assert.rejects(resolvePrNumber(env, relay({}, [pr, { ...pr, number: 13 }])), /multiple/);
}));
test('caller cannot use a PR title for routing or concurrency', () => {
  const caller = readFileSync(new URL('./caller.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(caller, /display_title/); assert.match(caller, /workflow_run\.head_sha/);
});
const workflow = readFileSync(new URL('../.github/workflows/pr-gate.yml', import.meta.url), 'utf8');
const validator = workflow.split('// source-ref-validator:start')[1].split('// source-ref-validator:end')[0];
for (const [label, vars, status] of [
  ['same immutable reusable/code source', { GATE_REF: head, JOB_WORKFLOW_SHA: head, JOB_WORKFLOW_REPOSITORY: 'Starlight-Intelligence/.github' }, 0],
  ['mismatched reusable/code source', { GATE_REF: head, JOB_WORKFLOW_SHA: 'b'.repeat(40), JOB_WORKFLOW_REPOSITORY: 'Starlight-Intelligence/.github' }, 1],
  ['mutable ref', { GATE_REF: 'main', JOB_WORKFLOW_SHA: head, JOB_WORKFLOW_REPOSITORY: 'Starlight-Intelligence/.github' }, 1],
  ['wrong reusable repository', { GATE_REF: head, JOB_WORKFLOW_SHA: head, JOB_WORKFLOW_REPOSITORY: 'outside/fork' }, 1],
  ['missing runtime provenance', { GATE_REF: head }, 1],
]) test(`actual workflow validator: ${label}`, () => assert.equal(spawnSync(process.execPath, ['-e', validator], { env: vars }).status, status));
