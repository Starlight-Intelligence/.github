# pr-gate

The estate merge gate, running on GitHub instead of a laptop. A pull request passes when all of these hold on its current head commit:

- A harness other than the author reviewed that exact commit. The author is read from the branch prefix, because every harness pushes as the same GitHub account.
- At least one CI check run passed and none failed. Commit statuses do not count: anything with a token can post one, which is how 20 PRs merged on 2026-10-19 with no check having run.
- No unresolved review threads, no `hold` / `do-not-merge` / `blocked` / `wip` label, not a draft.
- The body links the intent it serves: an issue, a board item or a ruling.
- Nothing touches a path that is Frank's call (workflows, env, dependencies, money, auth and middleware, deploy config, a new or deleted public page) unless the PR carries `frank-approved`.

## What counts as a review

| Source | Harness | Bound to the commit by |
| --- | --- | --- |
| Codex GitHub review (`chatgpt-codex-connector[bot]`) | codex | the review's commit id |
| Codex bot comment "Didn't find any major issues" | codex | posted after the head commit |
| `Checker: claude-cloud · head <sha> · verdict PASS` | claude | the sha in the line |
| `starlight-signoff: harness=<h> verdict=pass sha=<sha>` (estate `tools/pr-gate.mjs`) | `<h>` | the sha in the line |
| A review from a `claude*` bot | claude | the review's commit id |

A Codex verdict counts only from the Codex bot account. Typed lines from the shared account are trusted the same way the estate gate always trusted them, so they are only as strong as the agents writing them.

Branch prefixes: `agent/claude/`, `claude/`, `ccr-` and `factory/` (Foreman, whose implementer is an Anthropic model) are Claude; `codex/`, `agent/codex/`, `agent/gpt*` are Codex; `agent/antigravity/`, `agent/gemini/`, Jules and `sentinel-` branches are Gemini.

## Install in a repo

1. Copy `caller.yml` to `.github/workflows/pr-gate.yml` and replace both `GATE_SHA` with a commit of this repo.
2. Turn on Codex code review and automatic reviews for the repo in Codex settings, so Claude-authored PRs get a non-Claude review with no laptop involved.
3. Add the review rules from `CODE-REVIEW-RULES.md` to the repo's `AGENTS.md`.
4. Start with `merge: false` (report only). Flip to `merge: true` where autonomous landing is ruled.

## Known limits

- A PR that edits `.github/workflows/` runs its own workflows, so it could post a check named like this one. The gate blocks such PRs unless Frank labels them `frank-approved`, but only an org ruleset that requires this workflow from this repo removes the gap.
- If this check is made a required status check, the in-job merge will be refused (the check is still running). Use GitHub auto-merge with the required check instead.
- A squash merge made with the workflow token does not trigger push workflows on the base branch. Vercel's git integration still deploys.

Tests: `node --test pr-gate/decide.test.mjs`.
