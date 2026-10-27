# pr-gate

The estate merge gate, running on GitHub instead of a laptop. On the PR's current head commit it passes only when:

- A review from a GitHub bot identity of a different harness than the author exists for that commit: `chatgpt-codex-connector[bot]` (Codex) or `claude[bot]` (Claude). The author is read from the branch prefix, because every harness pushes as the same GitHub account.
- That review is an approval, or a review whose body says it found no major issues. Dismissed and pending reviews are ignored. A bot review mentioning P0 or P1 blocks, and so does a bot comment that names a P0 or P1 against the head. Bot comments never sign off, because they carry no commit id.
- A renamed file is judged on both its old and new path.
- Every check named in the repo's `required-checks` has a latest attempt that succeeded, no other check failed, and nothing is still running. Commit statuses never count: anything holding a token can post one, which is how 20 PRs merged on 2026-10-19 with no check having run.
- All review threads are resolved (every page read; an unreadable answer blocks) and the full list of changed files was read.
- It is not a draft, carries no `hold` / `do-not-merge` / `blocked` / `wip` label, and its body links the intent it serves (an issue, board item or ruling).
- It touches none of Frank's paths: workflows, env files, dependencies, money, auth and middleware, `vercel.json`, or a new or deleted public page. No label overrides this. Labels prove nothing about who applied them on a shared account, so Frank merges those himself.

In merge mode it decides again from fresh facts just before merging and merges with a head-SHA guard.

## What does not count

Typed lines (`starlight-signoff: ...` from the estate `tools/pr-gate.mjs`, `Checker: claude-cloud · head <sha> · verdict PASS`) are shown as advisory but never pass the gate: the author can type them. The estate `pr-gate.mjs` still honours them for a merge a human runs.

So today, Claude-authored PRs pass once Codex reviews them. Codex- and Gemini-authored PRs pass only after a review from the Claude GitHub bot, or a human-run merge.

Branch prefixes: `agent/claude/`, `claude/`, `ccr-` and `factory/` (Foreman, whose implementer is an Anthropic model) are Claude; `codex/`, `agent/codex/`, `agent/gpt*` are Codex; `agent/antigravity/`, `agent/gemini/`, Jules and `sentinel-` branches are Gemini.

## Install in a repo

1. Copy `caller.yml` to `.github/workflows/pr-gate.yml` and `poke.yml` to `.github/workflows/pr-gate-poke.yml`. Replace both `GATE_SHA` with a commit of this repo, list the repo's CI workflow names under `workflow_run`, and its check names in `required-checks`.
2. Turn on Codex code review and automatic reviews for the repo in Codex settings.
3. Add the section in `CODE-REVIEW-RULES.md` to the repo's `AGENTS.md`.
4. Start with `merge: false` (report only). Flip to `merge: true` where autonomous landing is ruled.

Every trigger runs the caller from the default branch. Review events go through `pr-gate-poke`, which holds no permissions, and come back as `workflow_run`.

## Known limits

- Without branch protection nothing stops someone merging around the gate; the private repos on the free plan cannot have it. The gate is the merge path agents are told to use, not a lock.
- Between the final decision and the merge call a few milliseconds remain in which a review could be dismissed. Only a required status check under branch protection closes that.
- A same-repo PR's own workflows run with the repo token. The gate refuses to merge any PR that edits workflows, but cannot stop such a PR from posting a same-named check on itself.
- A squash merge made with the workflow token does not trigger push workflows on the base branch. Vercel's git integration still deploys.

Tests: `node --test pr-gate/decide.test.mjs`.
