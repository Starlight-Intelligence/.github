# ORG-MAP

A routing index for agents and engineers. One row per active repository in the
Starlight-Intelligence organisation: what it is for, its state, where to start, and
whether you can reach it.

Read this before you clone anything. It should take one pass.

- **Last verified:** 2026-11-13
- **Active repositories:** 33
- **Archived repositories:** 11 (excluded here; each names its successor)
- **Source of each row:** the repository's own README. Where a repository is private,
  the purpose comes from its GitHub description field and the entry point is withheld,
  so no private contents are mirrored into this public repository.

## Route yourself in one step

| You need to | Open |
| :--- | :--- |
| Understand the contract | [`Starlight-Intelligence-System`](https://github.com/Starlight-Intelligence/Starlight-Intelligence-System) → `SIP.md` |
| Give several agents one memory | `starlight-memory`, or `Starlight-Intelligence-System` → `SETUP.md` |
| Prove a change was checked | [`starlight-evals`](https://github.com/Starlight-Intelligence/starlight-evals), then `starlight-kernel` if you have access |
| Add skills to a coding agent | [`starlight-agent-skills`](https://github.com/Starlight-Intelligence/starlight-agent-skills) → `npx skills add` |
| Control model routing and spend | [`starlight-ai-harness`](https://github.com/Starlight-Intelligence/starlight-ai-harness) → `routing.schema.json` |
| Review interface work | [`starlight-design-intelligence`](https://github.com/Starlight-Intelligence/starlight-design-intelligence) → `brand-packs/` |
| See the operator surface | `starlight-command-center`, or [starlightintelligence.ai](https://starlightintelligence.ai) |

## Status vocabulary

| Status | Meaning |
| :--- | :--- |
| `active` | Used or shipped. The README describes current behavior. |
| `internal` | Real and maintained, but a tool for this estate rather than a product. |
| `pilot` | Pre-release. The README states what is unfinished; do not assume the happy path works. |

Entry is the file or command the README itself points at. `members only` means the
repository is private and its entry point is not published here.

## Index

| Repository | Status | Purpose | Entry | Language | Visibility |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Starlight-Intelligence-System` | active | SIP protocol plus the reference build: six semantic vaults, an MCP server, and agent definitions several tools read from one record. | `SIP.md`, then `SETUP.md` | TypeScript | public |
| `starlight-agent-canvas` | active | Local canvas where sources, prompts, MCP calls and agent runs become typed nodes you can inspect and export as context. | `pnpm install && pnpm dev` | TypeScript | public |
| `starlight-agent-skills` | active | Portable skill files for Claude Code, Codex, Cursor, Gemini, Grok and OpenCode. | `npx skills add Starlight-Intelligence/starlight-agent-skills` | Python | public |
| `starlight-ai-harness` | active | Routing schema for task classes and model chains, spend caps, deterministic eval checkers, and one receipt per model call. | `python fleet/route_task.py "<task>"` | Python | public |
| `starlight-evals` | active | Whole-system eval runs for models, memory, retrieval and routing, publishing receipts and naming the weakness each run exposed. | `npm run validate` | JavaScript | public |
| `starlight-design-intelligence` | active | Brand packs, UI rubrics and motion rules used to review interface work for FrankX, Starlight and Arcanea. | `brand-packs/` | JavaScript | public |
| `starlight-knowledge-tree` | active | Graph of domains, concepts, skills, papers and open problems, with a contribution path on each node. | `npm run validate` | TypeScript | public |
| `starlight-academy-plugin` | active | Five learning skills, eight local MCP tools and four practice missions, packaged for the Codex and Claude marketplaces. | `docs/academy/README.md` | JavaScript | public |
| `marketing-intelligence` | active | Marketing skills and an agent team that draft and stage work; publishing, sending and spending stay with a person. | `npx skills add Starlight-Intelligence/marketing-intelligence` | JavaScript | public |
| `starlight-technology` | active | Buying research for AI hardware and studio systems, with evidence status and wrong-purchase conditions per recommendation. | <https://starlight.technology> | TypeScript | public |
| `starlight-voice` | pilot | Tauri tray and Python sidecar for push-to-talk control of local agents; live audio, latency and RAM acceptance are listed as pending. | `docs/ARCHITECTURE-2026-10-10.md` | Python | public |
| `starlight-genius-forge` | pilot | Agent-run talent discovery and competition platform aimed at Japan, the Philippines and Indonesia, with a supporter community attached. | `README.md` only | Python | public |
| `.github` | internal | Organization profile, governance contracts, the agent operating contract, and the reusable pull-request gate. | `profile/README.md` | JavaScript | public |
| `starlight-memory` | active | Memory provider contract, router and resource policy; the vault is authoritative and providers stay replaceable. | members only | JavaScript | private |
| `starlight-kernel` | pilot | Acceptance kernel for multi-vendor coding agents: verifies mission receipts and signs its own. | members only | JavaScript | private |
| `starlight-command-center` | active | Operator cockpit and launcher for the estate: apps that read state and propose changes rather than write them. | members only | HTML | private |
| `starlight-agent-config` | internal | Git-backed source for fleet-wide skills, commands, doctrine and policies across harnesses. | members only | JavaScript | private |
| `starlightintelligence.ai` | active | Next.js source for the starlightintelligence.ai product platform. | members only | TypeScript | private |
| `starlight-token-tracker` | internal | Local-first token usage and cost tracking across multiple machines. | members only | Python | private |
| `starlight-atlas` | pilot | Read-only Atlas over a Markdown vault: search, link graph, MCP server and Worker API; not deployed. | members only | JavaScript | private |
| `customer-research-platform` | pilot | Customer research that runs in the customer's own Cloudflare account; `main` holds the contract, not the app. | members only | — | private |
| `digital-product-os-plugin` | active | Six-skill product engineering plugin that carries a brief and its acceptance checks between ChatGPT Work and Codex. | members only | Python | private |
| `starlight-social` | internal | Human-gated multi-brand communications office exposed as an MCP server, built on SIP. | members only | TypeScript | private |
| `starlight-network` | pilot | Signed A2A agent cards, an MCP-registry-compatible directory, and a tenant runtime; MVP in progress. | members only | TypeScript | private |
| `starlight-you` | pilot | Personal operator twin front door, with an optional bounded public inference pilot. | members only | TypeScript | private |
| `starlight-intelligence-lab` | active | Applied lab notes on how agent systems behave and fail on real work. | members only | HTML | private |
| `starlight-android` | pilot | Three Android build-and-see skills layered over Google's `android` CLI. | members only | PowerShell | private |
| `agentic-browser-skills` | pilot | Browser skills whose results are checked and signed by the kernel; evals written, not yet run. | members only | — | private |
| `starlight-playbooks` | internal | Paid playbook source: skill packs whose evals are pre-registered as hashes in the public repo. | members only | JavaScript | private |
| `estate-canvas` | internal | One map of domains, live sites, products, personas, memory stores and agent teams. | members only | HTML | private |
| `starlight-marketing` | internal | Fork of the Vercel marketing-team template, adapted for the Starlight estate. | members only | TypeScript | private |
| `eve-lab` | internal | Test bench for Vercel eve agents: catalog, production deploys, shared probes and a run ledger. | `README.md` only | — | private |
| `starlight-heldout` | internal | Private held-out eval tasks for the playbooks; only hashes are published elsewhere. | none | JavaScript | private |

## Rows that could not be fully verified

Four rows carry a weaker entry point because the repository's README does not name
one. They are listed with `README.md` only or `none` above rather than guessed:

| Repository | What is missing |
| :--- | :--- |
| `starlight-genius-forge` | README describes intent and ecosystem alignment; no build, run, or test command is given. |
| `eve-lab` | Two-line README. Purpose is clear; no entry point is stated. |
| `starlight-heldout` | Three-line README. It is a private task set, so no entry point is expected. |
| `starlight-intelligence-lab` | Notes and a start-here reading path, but no command or build target. |

## Conventions that apply to every row

- Push to `agent/<harness>/<scope>`, never to `main`. Open a draft pull request first.
- The harness that authors a change does not approve it. See [`AGENTS.md`](./AGENTS.md).
- A repository marked `pilot` may change its interface between minor versions without notice.
- Private repositories are named here for routing only. Their contents, entry points and
  internal detail are not published in this document or anywhere else in this repository.
