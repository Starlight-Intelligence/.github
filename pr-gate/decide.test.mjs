import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decide, harnessOfBranch, shaMatches, protectedReasons, ciState } from './decide.mjs';

const HEAD = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const codexBot = { login: 'chatgpt-codex-connector[bot]', type: 'Bot' };
const claudeBot = { login: 'claude[bot]', type: 'Bot' };
const human = { login: 'frankxai', type: 'User' };
const greenCI = [{ name: 'test', status: 'completed', conclusion: 'success' }];
const cleanReview = { user: codexBot, commitId: HEAD, state: 'COMMENTED', body: "Codex Review: Didn't find any major issues.", bodyText: "Codex Review: Didn't find any major issues." };
const codexMetadata = (sha = HEAD) => [
  '<!-- codex-review-state:v1 ' + JSON.stringify({ code_review: { commit_sha: sha, has_any_findings: false } }) + ' -->',
  '<!-- codex-security-review:v1 ' + JSON.stringify({ blockingSeverityThreshold: 'P0', headSha: sha }) + ' -->',
].join('\n');

const base = (over = {}) => {
  const facts = {
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
  };
  // Plain-text fixtures contain no images unless explicitly supplied. Do not
  // fabricate rendered Markdown; bodyText is always explicit in each fixture.
  return { ...facts, comments: facts.comments.map(c => ({bodyHTML:'',...c})), reviews: facts.reviews.map(r => ({bodyHTML:'',...r})) };
};

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
  assert.equal(decide(base({ reviews: [{ user: codexBot, commitId: HEAD, state: 'COMMENTED', body: 'Critical security issue', bodyText: 'Critical security issue' }] })).ok, false);
  const d = decide(base({ reviews: [{ user: codexBot, commitId: HEAD, state: 'COMMENTED', body: '![P1 Badge] token leaks', bodyText: 'P1 Badge token leaks' }] }));
  assert.match(d.reasons.join(), /blocked on this commit by codex/);
});

test('a human account or a look-alike bot claiming to be Codex signs nothing', () => {
  assert.equal(decide(base({ reviews: [{ ...cleanReview, user: human }] })).ok, false);
  assert.equal(decide(base({ reviews: [{ ...cleanReview, user: { login: 'my-codex-helper[bot]', type: 'Bot' } }] })).ok, false);
});

test('Codex metadata does not block a summary comment or make it a signoff', () => {
  const body = `${codexMetadata()}\nDidn't find any major issues. Reviewed ${HEAD.slice(0, 7)}`;
  const d = decide(base({ reviews: [], comments: [{ user: codexBot, body, bodyText: `Didn't find any major issues. Reviewed ${HEAD.slice(0, 7)}` }] }));
  assert.deepEqual(d.reasons, []);
  assert.equal(d.pending, true);
  assert.equal(d.ok, false);
  assert.deepEqual(d.signers, []);
  assert.match(d.waiting.join(), /needs a review/);
});

test('a clean head review is not vetoed by metadata in its summary comment', () => {
  const d = decide(base({ comments: [{ user: codexBot, body: `${codexMetadata()}\nCode review completed.`, bodyText: 'Code review completed.' }] }));
  assert.equal(d.ok, true, JSON.stringify(d));
});

test('metadata does not veto a clean review or replace its commit binding', () => {
  for (const state of ['COMMENTED', 'APPROVED']) {
    const review = { ...cleanReview, state, body: `${codexMetadata()}\nDidn't find any major issues.`, bodyText: "Didn't find any major issues." };
    assert.equal(decide(base({ reviews: [review] })).ok, true, state);
    for (const commitId of ['', 'ffffffffffffffffffffffffffffffffffffffff']) {
      assert.equal(decide(base({ reviews: [{ ...review, commitId }] })).ok, false, `${state}: ${commitId}`);
    }
  }
});

test('visible P0/P1 comments still block when only metadata identifies the head', () => {
  for (const severity of ['P0', 'P1']) {
    const body = `${codexMetadata()}\n${severity}: a real finding remains.`;
    const d = decide(base({ comments: [{ user: codexBot, body, bodyText: `${severity}: a real finding remains.` }] }));
    assert.equal(d.ok, false, severity);
    assert.match(d.reasons.join(), /blocked on this commit by codex/);
  }
});

test('visible P0/P1 findings still block reviews alongside metadata', () => {
  for (const severity of ['P0', 'P1']) {
    const body = `${codexMetadata()}\n${severity}: a real finding remains.`;
    const d = decide(base({ reviews: [{ ...cleanReview, state: 'APPROVED', body, bodyText: `${severity}: a real finding remains.` }] }));
    assert.equal(d.ok, false, severity);
    assert.match(d.reasons.join(), /blocked on this commit by codex/);
  }
});

test('a clean phrase hidden in metadata cannot sign off a commented review', () => {
  const body = '<!-- codex-review-state:v1 {"summary":"Didnt find any major issues"} -->';
  const d = decide(base({ reviews: [{ ...cleanReview, body, bodyText: '' }] }));
  assert.equal(d.ok, false);
  assert.deepEqual(d.signers, []);
});

test('HTML-comment literals visible as Markdown code or escaped text still block', () => {
  const literal = '<!-- P1: visible serious finding -->';
  const bodies = [
    '`' + literal + '`',
    '`` a ` ' + literal + ' ``',
    '```html\n' + literal + '\n```',
    '~~~html\n' + literal + '\n~~~~',
    '```html\n' + literal,
    '    ' + literal,
    ' \t' + literal,
    '-     ' + literal,
    '\\' + literal,
    '> ```html\n> ' + literal + '\n> ```',
    '- ```html\n  ' + literal + '\n  ```',
    '- item\n\n    ```html\n  ' + literal + '\n  ```',
    '```html\n    ```\n' + literal + '\n```',
  ];
  for (const visible of bodies) {
    const body = `${codexMetadata()}\n${visible}`;
    for (const facts of [
      { comments: [{ user: codexBot, body, bodyText: literal }] },
      { reviews: [{ ...cleanReview, state: 'APPROVED', body, bodyText: literal }] },
    ]) {
      const d = decide(base(facts));
      assert.equal(d.ok, false, visible);
      assert.match(d.reasons.join(), /blocked on this commit by codex/, visible);
    }
  }
});

test('backticks in hidden metadata stay hidden alongside visible ordinary code', () => {
  const body = '<!-- threshold: `P0` -->\n`ordinary code`\nDidnt find any major issues.';
  assert.equal(decide(base({ reviews: [{ ...cleanReview, body, bodyText: 'ordinary code\nDidnt find any major issues.' }] })).ok, true);
  const fenced = '```js\nconst value = 1;\n```\n' + body;
  assert.equal(decide(base({ reviews: [{ ...cleanReview, body: fenced, bodyText: 'const value = 1;\nordinary code\nDidnt find any major issues.' }] })).ok, true);
});

test('short or ambiguous comment endings cannot swallow a later visible finding', () => {
  for (const opening of ['<!-->', '<!--->', '<!-- ambiguous --!>']) {
    const body = `${opening}\nP1: visible serious finding\n${codexMetadata()}`;
    for (const facts of [
      { comments: [{ user: codexBot, body, bodyText: 'P1: visible serious finding' }] },
      { reviews: [{ ...cleanReview, state: 'APPROVED', body, bodyText: 'P1: visible serious finding' }] },
    ]) {
      const d = decide(base(facts));
      assert.equal(d.ok, false, opening);
      assert.match(d.reasons.join(), /blocked on this commit by codex/, opening);
    }
  }
});

// Codex review of 1404c37 reproduced the next two as false passes.
test('bot comments never sign off; a P0/P1 bot comment on the head blocks', () => {
  const clean = decide(base({ reviews: [], comments: [{ user: codexBot, body: `Didn't find any major issues. Reviewed ${HEAD.slice(0, 10)}`, bodyText: `Didn't find any major issues. Reviewed ${HEAD.slice(0, 10)}` }] }));
  assert.equal(clean.ok, false);
  const mixed = decide(base({ comments: [{ user: codexBot, body: `Didnt find any major issues on ${HEAD.slice(0, 7)}. P1: auth bypass remains.`, bodyText: `Didnt find any major issues on ${HEAD.slice(0, 7)}. P1: auth bypass remains.` }] }));
  assert.match(mixed.reasons.join(), /blocked on this commit by codex/);
  assert.equal(decide(base({ reviews: [{ user: codexBot, commitId: HEAD, state: 'COMMENTED', body: 'p1 regression', bodyText: 'p1 regression' }] })).ok, false);
});

test('renames are judged on both ends', () => {
  assert.ok(protectedReasons([{ filename: 'docs/old-ci.yml', previousFilename: '.github/workflows/ci.yml', status: 'renamed' }]).length > 0);
  const page = protectedReasons([{ filename: 'app/new/page.tsx', previousFilename: 'app/about/page.tsx', status: 'renamed' }]);
  assert.equal(page.length, 2);
  assert.equal(decide(base({ files: [{ filename: 'app/new/page.tsx', previousFilename: 'app/about/page.tsx', status: 'renamed' }] })).ok, false);
});

test('Claude bot approval signs a Codex PR on the exact head', () => {
  const d = decide(base({ headRef: 'codex/x', reviews: [{ user: claudeBot, commitId: HEAD, state: 'APPROVED', body: '', bodyText: '' }] }));
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

test('GitHub-rendered text prevents an indented-code metadata false block', () => {
  const body = '    ```\n    ordinary code\n    ```\n\n<!-- codex-security-review:v1 threshold P0 -->\n';
  // Authenticated GitHub GFM rendering observed on 2026-11-04. The comment is
  // hidden after an indented code block; its threshold is not a finding.
  const bodyText = '```\nordinary code\n```\n\n';
  const d = decide(base({ reviews: [{ ...cleanReview, state: 'APPROVED', body, bodyText }] }));
  assert.equal(d.ok, true, JSON.stringify(d));
});

test('missing rendered text holds current bot evidence instead of guessing visibility', () => {
  for (const facts of [
    { reviews: [{ ...cleanReview, state: 'APPROVED', bodyText: undefined }] },
    { comments: [{ user: codexBot, body: codexMetadata() }] },
  ]) {
    const d = decide(base(facts));
    assert.equal(d.ok, false);
    assert.match(d.reasons.join(), /review text unavailable/);
    assert.doesNotMatch(d.reasons.join(), /blocked on this commit/);
  }
});

// Execute the real producer with an in-process fake server. Every request is
// intercepted, including report writes; this never calls or changes GitHub.
function runProducer(data) {
  const parent = realpathSync(tmpdir());
  const dir = mkdtempSync(join(parent, 'starlight-prgate-render-'));
  const receipt = join(dir, 'requests.json');
  const hook = join(dir, 'mock.mjs');
  const source = `
    import { writeFileSync } from 'node:fs';
    const data = JSON.parse(process.env.FIXTURE_JSON), calls = [];
    process.on('exit', () => writeFileSync(process.env.FIXTURE_RECEIPT, JSON.stringify(calls)));
    globalThis.fetch = async (url, init = {}) => {
      const u = new URL(url), method = init.method || 'GET';
      if (u.origin !== 'https://api.github.com') throw new Error('Unexpected server');
      calls.push({ path: u.pathname, page: u.searchParams.get('page'), method, accept: init.headers?.accept });
      const rendered = (rows, media) => init.headers?.accept === media ? rows : rows.map(({body_text, ...raw}) => raw);
      let value;
      if (u.pathname === '/graphql' && method === 'POST') value = {data:{repository:{pullRequest:{reviewThreads:{nodes:[],pageInfo:{hasNextPage:false,endCursor:null}}}}}};
      else if (u.pathname.endsWith('/pulls/1') && method === 'GET') value = {head:{sha:'${HEAD}',ref:'agent/claude/example'},body:'Serves #7',labels:[],state:'open',draft:false,changed_files:1};
      else if (u.pathname.endsWith('/files') && method === 'GET') value = [{filename:'src/lib/x.ts',status:'modified'}];
      else if (u.pathname.endsWith('/reviews') && method === 'GET') value = rendered(data.reviews, 'application/vnd.github-commitcomment.full+json');
      else if (u.pathname.endsWith('/check-runs') && method === 'GET') value = {check_runs:[{name:'test',status:'completed',conclusion:'success'}]};
      else if (u.pathname.endsWith('/comments') && method === 'GET') {
        const page = Number(u.searchParams.get('page') || 1);
        value = rendered(data.commentPages?.[page-1] ?? (page === 1 ? data.comments : []), 'application/vnd.github.full+json');
      } else if (u.pathname.endsWith('/comments') && method === 'POST') value = {id:1000};
      else throw new Error('Unexpected request: '+method+' '+u.pathname);
      return new Response(JSON.stringify(value), {status:200});
    };
  `;
  writeFileSync(hook, source);
  const env = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
  Object.assign(env, { GITHUB_TOKEN: 'test-only-token', GITHUB_REPOSITORY: 'example/repo', PR_NUMBER: '1', PR_GATE_MERGE: 'false', PR_GATE_WAIT_MINUTES: '0', PR_GATE_REQUIRED_CHECKS: 'test', FIXTURE_JSON: JSON.stringify(data), FIXTURE_RECEIPT: receipt });
  try {
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(hook).href, fileURLToPath(new URL('./run.mjs', import.meta.url))], {env,encoding:'utf8',timeout:10_000});
    assert.equal(result.error, undefined, result.error?.message);
    return { ...result, calls: JSON.parse(readFileSync(receipt, 'utf8')) };
  } finally {
    const target = realpathSync(dir);
    assert.equal(dirname(target), parent);
    assert.ok(basename(target).startsWith('starlight-prgate-render-'));
    rmSync(target, {recursive:true,force:true});
  }
}
const restReview = (over = {}) => ({user:codexBot,commit_id:HEAD,state:'APPROVED',body:'Reviewed.',body_text:'Reviewed.',body_html:'<p>Reviewed.</p>',...over});
const restComment = {user:codexBot,body:codexMetadata(),body_text:'',body_html:codexMetadata()};

test('producer requests and preserves raw plus rendered comment/review representations', () => {
  const r = runProducer({reviews:[restReview()],comments:[restComment]});
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(r.calls.some(c => c.path.endsWith('/reviews') && c.accept === 'application/vnd.github-commitcomment.full+json'));
  assert.ok(r.calls.some(c => c.path.endsWith('/comments') && c.method === 'GET' && c.accept === 'application/vnd.github.full+json'));
});

test('producer uses rendered text for the actual indented-code regression', () => {
  const r = runProducer({reviews:[restReview({body:'    ```\n    ordinary code\n    ```\n\n<!-- threshold P0 -->',body_text:'```\nordinary code\n```\n'})],comments:[]});
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /blocked on this commit/);
});

test('producer preserves visible comment literals and metadata-only head association', () => {
  const r = runProducer({reviews:[restReview()],comments:[{user:codexBot,body:codexMetadata()+'\n`<!-- P1: real finding -->`',body_text:'<!-- P1: real finding -->',body_html:'<p><code>&lt;!-- P1: real finding --&gt;</code></p>'}]});
  assert.equal(r.status, 1);
  assert.match(r.stdout, /blocked on this commit by codex/);
});

test('producer fails closed if the server omits rendered review text', () => {
  const r = runProducer({reviews:[restReview({body_text:undefined})],comments:[]});
  assert.equal(r.status, 1);
  assert.match(r.stdout, /review text unavailable/);
});

test('producer retains the full representation across comment pagination', () => {
  const page = Array.from({length:100}, () => ({user:human,body:'ordinary note',body_text:'ordinary note',body_html:'<p>ordinary note</p>'}));
  const r = runProducer({reviews:[restReview()],comments:[],commentPages:[page,[restComment]]});
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const reads = r.calls.filter(c => c.path.endsWith('/comments') && c.method === 'GET');
  assert.ok(reads.some(c => c.page === '2'));
  assert.ok(reads.every(c => c.accept === 'application/vnd.github.full+json'));
});

test('producer retains severity badge labels omitted from GitHub plain text', () => {
  // Real full-media review comments observed on 2026-11-04 omit the image's
  // alt label from body_text while body_html retains alt="P1 Badge".
  const r = runProducer({reviews:[restReview()],comments:[{
    user:codexBot,body:codexMetadata()+'\n![P1 Badge](https://example.invalid/badge.svg) Fix the issue.',
    body_text:'Fix the issue.',body_html:'<p><img src="https://example.invalid/badge.svg" alt="P1 Badge"> Fix the issue.</p>',
  }]});
  assert.equal(r.status, 1);
  assert.match(r.stdout, /blocked on this commit by codex/);
});

test('rendered image alt labels retain visible severity with quotes and entities', () => {
  for (const bodyHTML of [
    '<p><img src="badge.svg" alt="P1 Badge"> Fix it.</p>',
    '<img title="example > boundary" alt="P0 Badge" src="badge.svg">',
    "<img alt='P&#49; Badge' src='badge.svg'>",
    '<img alt=P1 src=badge.svg>',
  ]) {
    const body = codexMetadata()+'\n![severity](badge.svg) Fix it.';
    for (const facts of [
      {comments:[{user:codexBot,body,bodyText:'Fix it.',bodyHTML}]},
      {reviews:[{...cleanReview,state:'APPROVED',body,bodyText:'Fix it.',bodyHTML}]},
    ]) assert.match(decide(base(facts)).reasons.join(), /blocked on this commit by codex/, bodyHTML);
  }
});

test('hidden image metadata and other attributes cannot manufacture badge findings', () => {
  for (const bodyHTML of [
    '<!-- metadata <img alt="P0 Badge"> -->',
    '<!-- unterminated metadata <img alt="P0 Badge">',
    '<img title="example alt=\'P0 Badge\'" alt="ordinary" src="badge.svg">',
    '<a title="example <img alt=\'P0 Badge\'>">ordinary</a>',
    '<img alt="ordinary" alt="P0 Badge">',
    '<img alt="P&amp;#49; Badge">',
  ]) {
    const d = decide(base({reviews:[{...cleanReview,state:'APPROVED',bodyText:'Reviewed.',bodyHTML}]}));
    assert.equal(d.ok, true, JSON.stringify({bodyHTML,d}));
  }
});

test('missing or malformed rendered representations never grant an approval', () => {
  for (const fields of [{bodyText:null},{bodyText:{}},{bodyHTML:undefined},{bodyHTML:null},{bodyHTML:[]}]) {
    const d = decide(base({reviews:[{...cleanReview,state:'APPROVED',...fields}]}));
    assert.equal(d.ok, false);
    assert.deepEqual(d.signers, []);
    assert.match(d.reasons.join(), /review text unavailable/);
  }
});
