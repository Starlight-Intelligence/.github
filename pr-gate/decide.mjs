// decide.mjs: the merge gate as a pure function over facts already fetched from GitHub.
//
// The local `tools/pr-gate.mjs` in the estate root enforced maker != checker, but only on a laptop,
// so nothing could land while it slept. This is the same rule moved onto GitHub, plus the checks the
// 2026-10-19 incident showed were missing: a forged commit status must never count as CI, and an
// unresolved review thread must never be merged over.

// Every harness pushes as the same GitHub account, so the branch prefix is the only author signal.
// Keep in step with `tools/lib/harness-identity.mjs` in the estate root.
export function harnessOfBranch(branch) {
  const b = String(branch || '').toLowerCase();
  if (b.startsWith('dependabot/') || b.startsWith('renovate/')) return 'dependabot';
  if (b.startsWith('agent/codex') || b.startsWith('codex/')) return 'codex';
  if (b.startsWith('agent/gpt')) return 'codex';
  if (b.startsWith('agent/claude') || b.startsWith('claude/') || b.startsWith('ccr-')) return 'claude';
  // Foreman (eve software factory) writes code with an Anthropic model; its in-pipeline reviewer
  // does not count, because it saw the same plan. An outside non-Claude review is still required.
  if (b.startsWith('factory/')) return 'claude';
  if (b.startsWith('agent/hermes')) return 'hermes';
  if (b.startsWith('agent/grok')) return 'grok';
  if (b.startsWith('agent/antigravity') || b.startsWith('agent/agy') || b.startsWith('agent/gemini')) return 'gemini';
  if (b.startsWith('agent/jules') || b.startsWith('sentinel-') || b.startsWith('jules/')) return 'gemini';
  if (b.startsWith('cursor/')) return 'cursor';
  if (b.startsWith('copilot/')) return 'copilot';
  if (b.startsWith('agent/')) return 'agent-other';
  return 'unlabeled';
}

// Under 7 hex chars a "sha" is a typo or a forgery and must never match a future head.
export function shaMatches(head, given) {
  const h = String(head || '').toLowerCase();
  const g = String(given || '').toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(h) || !/^[0-9a-f]{7,40}$/.test(g)) return false;
  return g.length <= h.length ? h.startsWith(g) : g.startsWith(h);
}

const MARKER_RE = /^\s*starlight-signoff:\s*harness=(\S+)\s+verdict=(\S+)\s+sha=([0-9a-fA-F]{7,40})\b/i;
const CHECKER_RE = /^\s*Checker:\s*([a-z0-9_-]+?)(?:-cloud)?\s*[·|-]\s*head\s+([0-9a-fA-F]{7,40})\s*[·|-]\s*verdict\s+(PASS|FAIL|BLOCK)\b/i;
const CODEX_CLEAN_RE = /didn'?t find any major issues/i;

const isBot = (u) => u && (u.type === 'Bot' || /\[bot\]$/.test(u.login || ''));
const botHarness = (u) => {
  const l = String(u?.login || '').toLowerCase();
  if (/codex/.test(l)) return 'codex';
  if (/^claude/.test(l)) return 'claude';
  return null;
};

// Turn comments and reviews into sign-offs. Codex counts only from its GitHub bot identity, so an
// agent typing "Codex found no issues" from the shared account signs nothing.
export function collectSignoffs({ comments = [], reviews = [], headSha, headCommittedAt }) {
  const out = [];
  for (const c of comments) {
    for (const line of String(c.body || '').split('\n')) {
      let m = MARKER_RE.exec(line);
      if (m) { out.push({ harness: m[1].toLowerCase(), verdict: m[2].toLowerCase(), sha: m[3].toLowerCase(), via: 'marker' }); continue; }
      m = CHECKER_RE.exec(line);
      if (m) out.push({ harness: m[1].toLowerCase(), verdict: m[3].toLowerCase(), sha: m[2].toLowerCase(), via: 'checker-line' });
    }
    // Codex's clean result arrives as a comment with no commit id, so bind it by time instead: it
    // only counts if it was posted after the head commit.
    if (isBot(c.user) && botHarness(c.user) === 'codex' && CODEX_CLEAN_RE.test(c.body || '')
        && headCommittedAt && Date.parse(c.createdAt) > Date.parse(headCommittedAt)) {
      out.push({ harness: 'codex', verdict: 'pass', sha: String(headSha).toLowerCase(), via: 'codex-comment' });
    }
  }
  for (const r of reviews) {
    const h = isBot(r.user) ? botHarness(r.user) : null;
    if (!h) continue;
    const verdict = r.state === 'CHANGES_REQUESTED' ? 'block' : 'pass';
    out.push({ harness: h, verdict, sha: String(r.commitId || '').toLowerCase(), via: 'bot-review' });
  }
  return out;
}

// Paths whose change is Frank's call under Doctrine 0 and AGENTS.md 5e: money, auth, env,
// dependencies, workflows (a PR that edits CI could edit this gate), and public route deletion.
const FRANK_PATHS = [
  [/^\.github\/workflows\//, 'edits CI workflows'],
  [/(^|\/)\.env/, 'touches env files'],
  [/(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|uv\.lock|pyproject\.toml)$/, 'changes dependencies'],
  [/(checkout|billing|pricing|payment|payout|refund|stripe|polar|wallet)/i, 'touches a money path'],
  [/(^|\/)(auth|middleware|proxy)(\.|\/)/i, 'touches auth or request middleware'],
  [/(^|\/)vercel\.json$/, 'changes deploy config'],
];
const PAGE_RE = /(^|\/)(app|pages)\/.*page\.(t|j)sx?$|(^|\/)pages\/(?!api\/).*\.(t|j)sx?$/;

export function protectedReasons(files = []) {
  const reasons = new Set();
  for (const f of files) {
    for (const [re, why] of FRANK_PATHS) if (re.test(f.filename)) reasons.add(`${why} (${f.filename})`);
    if (PAGE_RE.test(f.filename) && f.status === 'removed') reasons.add(`deletes a public page (${f.filename})`);
    if (PAGE_RE.test(f.filename) && f.status === 'added') reasons.add(`publishes a new public page (${f.filename})`);
  }
  return [...reasons];
}

// CI counts only as check runs. Commit statuses are excluded on purpose: anything holding a token
// can post `state=success`, which is how 20 PRs merged on 2026-10-19 with no check having run.
export function ciState(checkRuns = [], selfPrefix = 'pr-gate') {
  const runs = checkRuns.filter((r) => !String(r.name || '').toLowerCase().startsWith(selfPrefix));
  const bad = runs.filter((r) => r.status === 'completed' && ['failure', 'cancelled', 'timed_out', 'action_required', 'stale', 'startup_failure'].includes(r.conclusion));
  const pending = runs.filter((r) => r.status !== 'completed');
  const passed = runs.filter((r) => r.status === 'completed' && r.conclusion === 'success');
  return { bad, pending, passed, total: runs.length };
}

const HOLD_LABELS = ['hold', 'do-not-merge', 'blocked', 'wip'];
const INTENT_RE = /(#\d+|github\.com\/[^\s/]+\/[^\s/]+\/issues\/\d+|claude\.ai\/artifact\/\S+)/i;

export function decide(f) {
  const author = harnessOfBranch(f.headRef);
  const head = String(f.headSha || '').toLowerCase();
  const labels = (f.labels || []).map((l) => String(l).toLowerCase());
  const signoffs = collectSignoffs({ comments: f.comments, reviews: f.reviews, headSha: head, headCommittedAt: f.headCommittedAt });
  const onHead = (s) => shaMatches(head, s.sha);

  const reasons = [];
  const waiting = [];

  if (f.state && f.state !== 'open') reasons.push(`PR is ${f.state}`);
  if (f.draft) reasons.push('PR is a draft');
  const held = labels.filter((l) => HOLD_LABELS.includes(l));
  if (held.length) reasons.push(`held by label: ${held.join(', ')}`);

  if (!INTENT_RE.test(f.body || '') && !labels.includes('intent:frank')) {
    reasons.push('no linked intent: reference the issue, board item or ruling this PR serves');
  }

  const blocks = signoffs.filter((s) => (s.verdict === 'block' || s.verdict === 'fail') && onHead(s) && s.harness !== author);
  const valid = signoffs.filter((s) => s.verdict === 'pass' && onHead(s) && s.harness !== author);
  if (blocks.length) reasons.push(`blocked on this commit by ${[...new Set(blocks.map((b) => b.harness))].join(', ')}`);
  if (!valid.length) {
    const stale = signoffs.filter((s) => s.verdict === 'pass' && s.harness !== author && !onHead(s));
    if (stale.length) waiting.push(`cross-harness review exists for an older commit; head is ${head.slice(0, 7)}`);
    else waiting.push(`needs a review from a harness other than ${author} on ${head.slice(0, 7)}`);
  }

  if ((f.unresolvedThreads || 0) > 0) reasons.push(`${f.unresolvedThreads} unresolved review thread(s)`);

  const ci = ciState(f.checkRuns, f.selfPrefix);
  if (ci.bad.length) reasons.push(`CI failing: ${ci.bad.map((r) => r.name).join(', ')}`);
  if (ci.pending.length) waiting.push(`CI still running: ${ci.pending.map((r) => r.name).join(', ')}`);
  else if (!ci.passed.length) reasons.push('no CI check run has passed on this commit (commit statuses do not count)');

  const prot = protectedReasons(f.files);
  if (prot.length && !labels.includes('frank-approved')) reasons.push(...prot.map((p) => `Frank's call: ${p}`));

  return {
    ok: reasons.length === 0 && waiting.length === 0,
    pending: reasons.length === 0 && waiting.length > 0,
    reasons,
    waiting,
    author,
    head,
    signers: [...new Set(valid.map((s) => s.harness))],
  };
}
