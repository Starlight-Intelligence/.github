import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, harnessOfBranch, shaMatches, protectedReasons, ciState } from './decide.mjs';

const HEAD = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const codexBot = { login: 'chatgpt-codex-connector[bot]', type: 'Bot' };
const claudeBot = { login: 'claude[bot]', type: 'Bot' };
const human = { login: 'frankxai', type: 'User' };
const greenCI = [{ name: 'test', status: 'completed', conclusion: 'success' }];
const cleanReview = { user: codexBot, commitId: HEAD, state: 'COMMENTED', body: "Codex Review: Didn't find any major issues." };

const base = (over = {}) => ({
  headRef: 'agent/claude/thing',
  headSha: HEAD,
  draft: false,
  state: 'open',
  body: 'Serves #12',
  labels: [],
  files: [{ filename: 'src/lib/x.ts', status: 'modified' }],
  comments: [],
  reviews: [cleanReview],
  checkRuns: greenCI,
  requiredChecks: ['test'],
  unresolvedThreads: 0,
  ...over,
});

test('clean Claude PR with a clean Codex bot review on head passes', () => {
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
  const d = decide(base({ reviews: [{ ...cleanReview, commitId: 'ffffffffffffffffffffffffffffffffffffffff' }] }));
  assert.equal(d.ok, false);
  assert.match(d.waiting.join(), /older commit/);
});

// Codex review of b526896 reproduced these three as false passes.
test('typed sign-off lines are unauthenticated and never pass, even with the right sha', () => {
  for (const body of [`starlight-signoff: harness=claude verdict=pass sha=${HEAD}`, `Checker: claude-cloud · head ${HEAD} · verdict PASS`]) {
    const d = decide(base({ headRef: 'codex/x', reviews: [], comments: [{ user: human, body }] }));
    assert.equal(d.ok, false, body);
    assert.ok(d.advisory.length > 0, 'still reported as advisory');
  }
});

test('dismissed and pending bot reviews do not count', () => {
  for (const state of ['DISMISSED', 'PENDING']) assert.equal(decide(base({ reviews: [{ ...cleanReview, state }] })).ok, false, state);
});

test('a bot review that is neither approval nor clean is not a pass; P0/P1 text blocks', () => {
  assert.equal(decide(base({ reviews: [{ user: codexBot, commitId: HEAD, state: 'COMMENTED', body: 'Critical security issue' }] })).ok, false);
  const d = decide(base({ reviews: [{ user: codexBot, commitId: HEAD, state: 'COMMENTED', body: '![P1 Badge] token leaks' }] }));
  assert.match(d.reasons.join(), /blocked on this commit by codex/);
});

test('a human account or a look-alike bot claiming to be Codex signs nothing', () => {
  assert.equal(decide(base({ reviews: [{ ...cleanReview, user: human }] })).ok, false);
  assert.equal(decide(base({ reviews: [{ ...cleanReview, user: { login: 'my-codex-helper[bot]', type: 'Bot' } }] })).ok, false);
});

// Codex review of 1404c37 reproduced the next two as false passes.
test('bot comments never sign off; a P0/P1 bot comment on the head blocks', () => {
  const clean = decide(base({ reviews: [], comments: [{ user: codexBot, body: `Didn't find any major issues. Reviewed ${HEAD.slice(0, 10)}` }] }));
  assert.equal(clean.ok, false);
  const mixed = decide(base({ comments: [{ user: codexBot, body: `Didnt find any major issues on ${HEAD.slice(0, 7)}. P1: auth bypass remains.` }] }));
  assert.match(mixed.reasons.join(), /blocked on this commit by codex/);
  assert.equal(decide(base({ reviews: [{ user: codexBot, commitId: HEAD, state: 'COMMENTED', body: 'p1 regression' }] })).ok, false);
});

test('renames are judged on both ends', () => {
  assert.ok(protectedReasons([{ filename: 'docs/old-ci.yml', previousFilename: '.github/workflows/ci.yml', status: 'renamed' }]).length > 0);
  const page = protectedReasons([{ filename: 'app/new/page.tsx', previousFilename: 'app/about/page.tsx', status: 'renamed' }]);
  assert.equal(page.length, 2);
  assert.equal(decide(base({ files: [{ filename: 'app/new/page.tsx', previousFilename: 'app/about/page.tsx', status: 'renamed' }] })).ok, false);
});

test('Claude bot approval signs a Codex PR on the exact head', () => {
  const d = decide(base({ headRef: 'codex/x', reviews: [{ user: claudeBot, commitId: HEAD, state: 'APPROVED', body: '' }] }));
  assert.equal(d.ok, true, JSON.stringify(d));
  assert.equal(shaMatches(HEAD, 'a1b2'), false);
});

test('required checks must exist and pass; skipped or unrelated green is not CI', () => {
  assert.match(decide(base({ checkRuns: [] })).reasons.join(), /never ran/);
  assert.match(decide(base({ checkRuns: [{ name: 'docs', status: 'completed', conclusion: 'success' }, { name: 'test', status: 'completed', conclusion: 'skipped' }] })).reasons.join(), /did not pass: test \(skipped\)/);
  assert.match(decide(base({ requiredChecks: [] })).reasons.join(), /no required CI checks/);
});

test('failing or running CI blocks or waits; the gate ignores its own runs', () => {
  assert.match(decide(base({ checkRuns: [...greenCI, { name: 'Lint', status: 'completed', conclusion: 'failure' }] })).reasons.join(), /CI failing: Lint/);
  const w = decide(base({ checkRuns: [...greenCI, { name: 'build', status: 'in_progress', conclusion: null }] }));
  assert.equal(w.pending, true);
  assert.equal(ciState([...greenCI, { name: 'pr-gate / decide', status: 'completed', conclusion: 'failure' }], ['test']).bad.length, 0);
});

test('unresolved threads, incomplete reads, drafts, hold labels and missing intent all block', () => {
  assert.equal(decide(base({ unresolvedThreads: 2 })).ok, false);
  assert.match(decide(base({ incomplete: 'saw 3000 of 3200 changed files' })).reasons.join(), /could not read/);
  assert.equal(decide(base({ draft: true })).ok, false);
  assert.equal(decide(base({ labels: ['hold'] })).ok, false);
  assert.match(decide(base({ body: 'no link here' })).reasons.join(), /no linked intent/);
});

test('changes requested by the Codex bot block', () => {
  const d = decide(base({ reviews: [{ user: codexBot, commitId: HEAD, state: 'CHANGES_REQUESTED', body: '' }] }));
  assert.match(d.reasons.join(), /blocked on this commit by codex/);
});

test("Frank's paths block and no label overrides them", () => {
  for (const filename of ['.github/workflows/ci.yml', 'package.json', 'app/checkout/route.ts', '.env.production', 'src/middleware.ts', 'vercel.json']) {
    const d = decide(base({ files: [{ filename, status: 'modified' }], labels: ['frank-approved'] }));
    assert.equal(d.ok, false, filename);
    assert.match(d.reasons.join(), /Frank merges this one/, filename);
  }
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
