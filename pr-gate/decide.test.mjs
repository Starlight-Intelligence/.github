import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, harnessOfBranch, shaMatches, protectedReasons, ciState } from './decide.mjs';

const HEAD = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const codexBot = { login: 'chatgpt-codex-connector[bot]', type: 'Bot' };
const human = { login: 'frankxai', type: 'User' };
const greenCI = [{ name: 'Build', status: 'completed', conclusion: 'success' }];

const base = (over = {}) => ({
  headRef: 'agent/claude/thing',
  headSha: HEAD,
  headCommittedAt: '2026-10-27T03:00:00Z',
  draft: false,
  state: 'open',
  body: 'Serves #12',
  labels: [],
  files: [{ filename: 'src/lib/x.ts', status: 'modified' }],
  comments: [],
  reviews: [{ user: codexBot, commitId: HEAD, state: 'COMMENTED' }],
  checkRuns: greenCI,
  unresolvedThreads: 0,
  ...over,
});

test('clean Claude PR reviewed by the Codex bot on head passes', () => {
  const d = decide(base());
  assert.equal(d.ok, true, JSON.stringify(d));
  assert.deepEqual(d.signers, ['codex']);
});

test('author cannot be the checker', () => {
  const d = decide(base({ headRef: 'codex/x' }));
  assert.equal(d.ok, false);
  assert.match(d.waiting.join(), /other than codex/);
});

test('a review of an older commit does not count', () => {
  const d = decide(base({ reviews: [{ user: codexBot, commitId: 'ffffffffffffffffffffffffffffffffffffffff', state: 'COMMENTED' }] }));
  assert.equal(d.ok, false);
  assert.match(d.waiting.join(), /older commit/);
});

test('a human-account comment claiming to be Codex signs nothing', () => {
  const d = decide(base({ reviews: [], comments: [{ user: human, body: "Codex Review: Didn't find any major issues.", createdAt: '2026-10-27T04:00:00Z' }] }));
  assert.equal(d.ok, false);
});

test('Codex bot clean comment counts only when posted after the head commit', () => {
  const after = decide(base({ reviews: [], comments: [{ user: codexBot, body: "Codex Review: Didn't find any major issues.", createdAt: '2026-10-27T04:00:00Z' }] }));
  assert.equal(after.ok, true, JSON.stringify(after));
  const before = decide(base({ reviews: [], comments: [{ user: codexBot, body: "Codex Review: Didn't find any major issues.", createdAt: '2026-10-27T02:00:00Z' }] }));
  assert.equal(before.ok, false);
});

test('Claude checker line signs a Codex PR on the exact head', () => {
  const d = decide(base({ headRef: 'codex/x', reviews: [], comments: [{ user: human, body: `Checker: claude-cloud · head ${HEAD} · verdict PASS\n\nfindings...`, createdAt: '2026-10-27T04:00:00Z' }] }));
  assert.equal(d.ok, true, JSON.stringify(d));
  assert.deepEqual(d.signers, ['claude']);
});

test('estate pr-gate marker lines are honoured, short shas are not', () => {
  const ok = decide(base({ reviews: [], comments: [{ user: human, body: `starlight-signoff: harness=codex verdict=pass sha=${HEAD.slice(0, 12)}` }] }));
  assert.equal(ok.ok, true);
  assert.equal(shaMatches(HEAD, 'a1b2'), false);
});

test('commit statuses never count as CI: no check runs means blocked', () => {
  const d = decide(base({ checkRuns: [] }));
  assert.equal(d.ok, false);
  assert.match(d.reasons.join(), /commit statuses do not count/);
});

test('failing or running CI blocks or waits; the gate ignores its own runs', () => {
  assert.match(decide(base({ checkRuns: [...greenCI, { name: 'Lint', status: 'completed', conclusion: 'failure' }] })).reasons.join(), /CI failing: Lint/);
  const w = decide(base({ checkRuns: [...greenCI, { name: 'Test', status: 'in_progress', conclusion: null }] }));
  assert.equal(w.pending, true);
  assert.equal(ciState([...greenCI, { name: 'pr-gate / decide', status: 'completed', conclusion: 'failure' }]).bad.length, 0);
});

test('unresolved threads, drafts, hold labels and missing intent all block', () => {
  assert.equal(decide(base({ unresolvedThreads: 2 })).ok, false);
  assert.equal(decide(base({ draft: true })).ok, false);
  assert.equal(decide(base({ labels: ['hold'] })).ok, false);
  assert.match(decide(base({ body: 'no link here' })).reasons.join(), /no linked intent/);
});

test('changes requested by the Codex bot block', () => {
  const d = decide(base({ reviews: [{ user: codexBot, commitId: HEAD, state: 'CHANGES_REQUESTED' }] }));
  assert.match(d.reasons.join(), /blocked on this commit by codex/);
});

test("Frank's paths need the frank-approved label", () => {
  for (const filename of ['.github/workflows/ci.yml', 'package.json', 'app/checkout/route.ts', '.env.production', 'src/middleware.ts', 'vercel.json']) {
    const d = decide(base({ files: [{ filename, status: 'modified' }] }));
    assert.equal(d.ok, false, filename);
    assert.match(d.reasons.join(), /Frank's call/, filename);
  }
  assert.equal(decide(base({ files: [{ filename: 'package.json', status: 'modified' }], labels: ['frank-approved'] })).ok, true);
});

test('publishing or deleting a public page is protected; editing one is not', () => {
  assert.equal(protectedReasons([{ filename: 'app/playbooks/page.tsx', status: 'added' }]).length, 1);
  assert.equal(protectedReasons([{ filename: 'app/about/page.tsx', status: 'removed' }]).length, 1);
  assert.equal(protectedReasons([{ filename: 'app/about/page.tsx', status: 'modified' }]).length, 0);
});

test('branch prefixes map to harnesses, Foreman and cloud sessions count as Claude', () => {
  assert.equal(harnessOfBranch('factory/fix-reset-email'), 'claude');
  assert.equal(harnessOfBranch('ccr-a491b337-99lzm2'), 'claude');
  assert.equal(harnessOfBranch('agent/gpt6/motion'), 'codex');
  assert.equal(harnessOfBranch('sentinel-fix-timing'), 'gemini');
  assert.equal(harnessOfBranch('dependabot/npm_and_yarn/x'), 'dependabot');
});
