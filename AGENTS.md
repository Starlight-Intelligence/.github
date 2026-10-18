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

## Federated Repository Roster (10 repositories)

| Repository | Visibility | Primary Owner | Role |
| :--- | :--- | :--- | :--- |
| `starlight-command-center` | `private` | `Starlight-Intelligence` | org-primary (canonical) |
| `starlight-agent-config` | `private` | `frankxai` | federated-mirror (SSOT: frankxai/starlight-agent-config) |
| `starlight-memory` | `private` | `frankxai` | federated-mirror (SSOT: frankxai/starlight-memory) |
| `starlight-voice` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/starlight-voice) |
| `starlight-technology` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/starlight-technology) |
| `starlight-design-intelligence` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/starlight-design-intelligence) |
| `starlight-agent-skills` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/starlight-agent-skills) |
| `starlight-evals` | `public` | `frankxai` | federated-mirror (SSOT: frankxai/starlight-evals) |
| `starlight-android` | `private` | `frankxai` | federated-mirror (SSOT: frankxai/starlight-android) |
| `starlightintelligence.ai` | `private` | `frankxai` | federated-mirror (SSOT: frankxai/starlightintelligence.ai) |

Built on SIP
