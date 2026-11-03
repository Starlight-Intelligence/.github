import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, shaMatches, ciState, collectSignoffs } from './decide.mjs';
const head = 'a'.repeat(40);
const bot = { login: 'chatgpt-codex-connector[bot]', type: 'Bot', id: 196283668 };
const check = { id: 2, name: 'test', status: 'completed', conclusion: 'success', appId: 15368, headSha: head, workflowPath: '.github/workflows/ci.yml', runId: 2, runAttempt: 1 };
const facts = () => ({ headRef: 'agent/claude/change', headSha: head, state: 'open', body: 'Serves #12', files: [], requiredChecks: [{ name: 'test', appId: 15368, workflowPath: '.github/workflows/ci.yml' }], checkRuns: [check], reviews: [{ user: bot, commitId: head, state: 'APPROVED', body: '' }], unresolvedThreads: 0 });

test('abbreviated SHA never satisfies exact-head binding', () => assert.equal(shaMatches(head, head.slice(0, 7)), false));
test('free-form clean prose is not an authenticated approval', () => {
  const s = collectSignoffs({ headSha: head, reviews: [{ user: bot, commitId: head, state: 'COMMENTED', body: 'Example output: "Didn\'t find any major issues."' }] });
  assert.equal(s.some(x => x.trusted && x.verdict === 'pass'), false);
});
test('a branch prefix and reviewer bot cannot prove implementation-provider independence', () => {
  const f = facts(); f.requiredChecks = ['test'];
  assert.equal(decide(f).ok, false);
});
test('same-provider P1 blocks even when another provider approved', () => {
  const f = facts(); f.headRef = 'codex/change'; f.reviews.push({ user: { login: 'claude[bot]', type: 'Bot' }, commitId: head, state: 'APPROVED', body: '' }); f.reviews[0].state = 'CHANGES_REQUESTED';
  assert.match(decide(f).reasons.join(), /blocked on this commit/);
});
test('a check from an arbitrary app is not CI', () => {
  const r = ciState([{ ...check, appId: 999 }], [{ name: 'test', appId: 15368, workflowPath: '.github/workflows/ci.yml' }], 'pr-gate', head);
  assert.ok(r.invalid?.length);
});
test('the correct app on the wrong workflow is not CI', () => {
  const r = ciState([{ ...check, workflowPath: '.github/workflows/fake.yml' }], [{ name: 'test', appId: 15368, workflowPath: '.github/workflows/ci.yml' }], 'pr-gate', head);
  assert.ok(r.invalid?.length);
});
test('a check from an older SHA cannot pass', () => {
  const r = ciState([{ ...check, headSha: 'b'.repeat(40) }], [{ name: 'test', appId: 15368, workflowPath: '.github/workflows/ci.yml' }], 'pr-gate', head);
  assert.ok(r.invalid?.length);
});
test('a newer failing retry beats an older success regardless of API order', () => {
  const r = ciState([check, { ...check, id: 3, runAttempt: 2, conclusion: 'failure' }], [{ name: 'test', appId: 15368, workflowPath: '.github/workflows/ci.yml' }], 'pr-gate', head);
  assert.equal(r.notPassed.length, 1);
});
test('duplicate check names within the latest attempt fail closed', () => {
  const r = ciState([check, { ...check, id: 3 }], [{ name: 'test', appId: 15368, workflowPath: '.github/workflows/ci.yml' }], 'pr-gate', head);
  assert.ok(r.invalid?.length);
});
test('missing review-thread data never means zero unresolved threads', () => assert.match(decide({ ...facts(), unresolvedThreads: undefined }).reasons.join(), /thread.*unavailable/));
