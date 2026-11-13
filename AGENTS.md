# Starlight Intelligence — Agent Operating Contract

Scope: All repositories under the **Starlight-Intelligence** GitHub Organization (https://starlightintelligence.ai).
Brand register: `sis`

## Responsible Agent Team & Governance

| Role | Assigned Owner |
| :--- | :--- |
| **Human Codeowner** | `@frankxai` |
| **Organization Steward** | `steward-starlight` |
| **Executive Seat** | CTO (Technology & Infrastructure) + CDO (Data & Memory) |
| **Universal IS** | Starlight Orchestrator,Code IS,Second Brain IS,Voice & Video IS |
| **Council Lead** | starlight-architect,starlight-orchestrator,starlight-sentinel |
| **Primary Harnesses** | `Claude Code`, `Antigravity`, `Codex`, `Grok`, `Hermes` |

## Core Guardrails

1. **Think before coding.** State assumptions and surface tradeoffs. Verify file contents and branch state before writing.
2. **Surgical changes.** Touch only the files required for the active slice. Never overwrite or reset another agent's uncommitted worktree.
3. **Branch and worktree discipline.** Never push directly to `main`. Work on `agent/<harness>/<scope>` in a dedicated worktree and open a **draft** pull request first.
4. **Maker != Checker.** The harness that authors a pull request never approves or merges its own pull request.
5. **CI budget discipline.** Keep pull requests in draft until local verification (`lint`, `typecheck`, `test`, `build`) passes. Mark ready for review once.
6. **Non-waivable safety.**
   - Never commit secrets, API keys, or `.env` files.
   - Preserve repository visibility parity: never copy or mirror private repository contents into a public repository.
   - Money fails closed; no autonomous spend or paid API provisioning without explicit human approval.
   - In health and mind domains, model observations only; never diagnose or make clinical claims.

## Repository roster

This organisation holds more repositories than are listed in this file. Do not work
from a hardcoded list in this file, and do not trust a list you find elsewhere in the
estate: read [`ORG-MAP.md`](./ORG-MAP.md). It carries one row per public repository
with status, entry point and language, and it states the date it was verified. Private
repositories are not indexed there; access is by invitation.

Two ownership facts that are not obvious from a repository name:

- **`Starlight-Intelligence-System` is canonical here.** The older `frankxai/...` path
  redirects to this organisation. Open pull requests against this organisation, never
  against a same-named mirror elsewhere.
- **Archived repositories follow the `-retired-YYYYMMDD` pattern** and name their
  successor in their README. Do not revive an archive; patch the successor.

## Where to start

| Your task | Read first |
| :--- | :--- |
| Understand the contract you are implementing | `Starlight-Intelligence-System` → `SIP.md` |
| Route to the right repository | [`ORG-MAP.md`](./ORG-MAP.md) |
| Add or change a shared skill | the owning repository's `skills/` tree, then `starlight-agent-skills` |
| Change anything organization-wide | this file, `CHARTER.md`, then `CONTRIBUTING.md` |
| Publish a claim about the system | the evidence file the claim points at; if none exists, cut the claim |

## Definition of done

A slice is done when every line below holds, not when the happy path works once.

1. The work sits on `agent/<harness>/<scope>` and has a draft pull request.
2. `lint`, `typecheck`, `test` and `build` have run locally and passed, or the pull
   request states which one could not run and why.
3. A different harness, or a person, has read the diff. Self-approval is not review.
4. Every claim in the description points at a file, a run, or a URL that resolves.
5. Whatever is unfinished is named in the description as unfinished.

## Machine surfaces

- [`ORG-MAP.md`](./ORG-MAP.md) — repository routing index.
- [`profile/README.md`](./profile/README.md) — the public front door.
- [`CHARTER.md`](./CHARTER.md) and [`VOCABULARY.md`](./VOCABULARY.md) — governance and shared terms.
- `https://starlightintelligence.ai/llms.txt` and `/llms-full.txt` — site discovery and expanded section text.
- `https://starlightintelligence.org/sip.md` — the protocol spec as markdown, for citation-stable reads.

Built on SIP
