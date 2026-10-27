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
const SEVERE_RE = /\bp[01]\b|p[01] badge/i;

// GitHub's own bot accounts are the only reviewer identity an agent cannot type its way into.
// Exact logins on purpose: a substring match would accept any app whose name contains "codex".
const BOT_HARNESS = { 'chatgpt-codex-connector[bot]': 'codex', 'claude[bot]': 'claude' };
const botHarness = (u) => (u && u.type === 'Bot' ? BOT_HARNESS[String(u.login || '').toLowerCase()] || null : null);

// Turn comments and reviews into sign-offs. Typed lines (the estate `starlight-signoff` marker and
// `Checker:` lines) are collected but marked unauthenticated: every harness posts as the same human
// account, so anyone, the author included, can write one. They never count toward a pass here; the
// estate `tools/pr-gate.mjs` still honours them for a human-run merge.
export function collectSignoffs({ comments = [], reviews = [], headSha }) {
  const head = String(headSha || '').toLowerCase();
  const out = [];
  for (const c of comments) {
    for (const line of String(c.body || '').split('\n')) {
      let m = MARKER_RE.exec(line);
      if (m) { out.push({ harness: m[1].toLowerCase(), verdict: m[2].toLowerCase(), sha: m[3].toLowerCase(), via: 'typed', trusted: false }); continue; }
      m = CHECKER_RE.exec(line);
      if (m) out.push({ harness: m[1].toLowerCase(), verdict: m[3].toLowerCase(), sha: m[2].toLowerCase(), via: 'typed', trusted: false });
    }
    // Bot comments are not sign-offs: they carry no commit id, and a "no major issues" line can sit
    // beside a P1 in the same comment. Only commit-bound bot reviews pass. A bot comment that names
    // a P0/P1 against the head still blocks.
    const h = botHarness(c.user);
    if (h && SEVERE_RE.test(c.body || '') && head.length >= 7 && String(c.body).toLowerCase().includes(head.slice(0, 7))) {
      out.push({ harness: h, verdict: 'block', sha: head, via: 'bot-comment', trusted: true });
    }
  }
  for (const r of reviews) {
    const h = botHarness(r.user);
    if (!h || r.state === 'DISMISSED' || r.state === 'PENDING') continue;
    const body = String(r.body || '');
    let verdict = null;
    if (r.state === 'CHANGES_REQUESTED' || SEVERE_RE.test(body)) verdict = 'block';
    else if (r.state === 'APPROVED' || CODEX_CLEAN_RE.test(body)) verdict = 'pass';
    // A COMMENTED review that neither approves nor says it is clean is not a verdict either way;
    // its inline findings surface as unresolved threads.
    if (verdict) out.push({ harness: h, verdict, sha: String(r.commitId || '').toLowerCase(), via: 'bot-review', trusted: true });
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
    // A rename is judged on both ends: moving a protected file out of its path still changes it.
    for (const name of [f.filename, f.previousFilename].filter(Boolean)) {
      for (const [re, why] of FRANK_PATHS) if (re.test(name)) reasons.add(`${why} (${name})`);
    }
    const renamed = f.status === 'renamed' && f.previousFilename;
    if (f.status === 'removed' && PAGE_RE.test(f.filename)) reasons.add(`deletes a public page (${f.filename})`);
    if (f.status === 'added' && PAGE_RE.test(f.filename)) reasons.add(`publishes a new public page (${f.filename})`);
    if (renamed && PAGE_RE.test(f.previousFilename)) reasons.add(`deletes a public page (${f.previousFilename})`);
    if (renamed && PAGE_RE.test(f.filename)) reasons.add(`publishes a new public page (${f.filename})`);
  }
  return [...reasons];
}

// CI counts only as check runs. Commit statuses are excluded on purpose: anything holding a token
// can post `state=success`, which is how 20 PRs merged on 2026-10-19 with no check having run.
// Each repo names the checks that must pass; one unrelated green check is not CI.
export function ciState(checkRuns = [], required = [], selfPrefix = 'pr-gate') {
  const runs = checkRuns.filter((r) => !String(r.name || '').toLowerCase().startsWith(selfPrefix));
  const bad = runs.filter((r) => r.status === 'completed' && ['failure', 'cancelled', 'timed_out', 'action_required', 'stale', 'startup_failure'].includes(r.conclusion));
  const pending = runs.filter((r) => r.status !== 'completed');
  const missing = [];
  const notPassed = [];
  for (const name of required) {
    const r = runs.find((x) => x.name === name);
    if (!r) missing.push(name);
    else if (r.status === 'completed' && r.conclusion !== 'success') notPassed.push(`${name} (${r.conclusion})`);
  }
  return { bad, pending, missing, notPassed };
}

const HOLD_LABELS = ['hold', 'do-not-merge', 'blocked', 'wip'];
const INTENT_RE = /(#\d+|github\.com\/[^\s/]+\/[^\s/]+\/issues\/\d+|claude\.ai\/artifact\/\S+)/i;

export function decide(f) {
  const author = harnessOfBranch(f.headRef);
  const head = String(f.headSha || '').toLowerCase();
  const labels = (f.labels || []).map((l) => String(l).toLowerCase());
  const all = collectSignoffs({ comments: f.comments, reviews: f.reviews, headSha: head });
  const signoffs = all.filter((s) => s.trusted);
  const onHead = (s) => shaMatches(head, s.sha);

  const reasons = [];
  const waiting = [];

  if (f.state && f.state !== 'open') reasons.push(`PR is ${f.state}`);
  if (f.draft) reasons.push('PR is a draft');
  const held = labels.filter((l) => HOLD_LABELS.includes(l));
  if (held.length) reasons.push(`held by label: ${held.join(', ')}`);

  if (!INTENT_RE.test(f.body || '')) {
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

  if (f.incomplete) reasons.push(`could not read the whole PR: ${f.incomplete}`);
  if ((f.unresolvedThreads || 0) > 0) reasons.push(`${f.unresolvedThreads} unresolved review thread(s)`);

  const required = f.requiredChecks || [];
  const ci = ciState(f.checkRuns, required, f.selfPrefix);
  if (!required.length) reasons.push('no required CI checks are configured for this repo');
  if (ci.bad.length) reasons.push(`CI failing: ${ci.bad.map((r) => r.name).join(', ')}`);
  if (ci.notPassed.length) reasons.push(`required check did not pass: ${ci.notPassed.join(', ')}`);
  if (ci.pending.length) waiting.push(`CI still running: ${ci.pending.map((r) => r.name).join(', ')}`);
  else if (ci.missing.length) reasons.push(`required check never ran on this commit: ${ci.missing.join(', ')} (commit statuses do not count)`);

  // No label can override this: every harness acts as the same account, so a label proves nothing
  // about who applied it. Protected changes are merged by Frank, outside this gate.
  const prot = protectedReasons(f.files);
  if (prot.length) reasons.push(...prot.map((p) => `Frank merges this one: ${p}`));

  const typed = all.filter((s) => !s.trusted && s.verdict === 'pass' && onHead(s) && s.harness !== author);
  return {
    ok: reasons.length === 0 && waiting.length === 0,
    pending: reasons.length === 0 && waiting.length > 0,
    reasons,
    waiting,
    author,
    head,
    signers: [...new Set(valid.map((s) => s.harness))],
    advisory: [...new Set(typed.map((s) => s.harness))],
  };
}
