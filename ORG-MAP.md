# ORG-MAP

A routing index for agents and engineers. One row per public repository in the
Starlight-Intelligence organisation: what it is for, its state, and where to start.

Read this before you clone anything. It should take one pass.

- **Last verified:** 2026-11-13
- **Scope:** the 13 public repositories
- **Source of each row:** the repository's own README, read on the date above. Every
  link below resolves without an account, and every entry point is a file or command
  the README itself names.

The organisation also maintains private repositories for internal operations, research
and unreleased products. They are not indexed here. Access is by invitation.

## Route yourself in one step

| You need to | Open |
| :--- | :--- |
| Understand the contract | [`Starlight-Intelligence-System`](https://github.com/Starlight-Intelligence/Starlight-Intelligence-System) → `SIP.md` |
| Give several agents one memory | [`Starlight-Intelligence-System`](https://github.com/Starlight-Intelligence/Starlight-Intelligence-System) → `SETUP.md` |
| Prove a change was checked | [`starlight-evals`](https://github.com/Starlight-Intelligence/starlight-evals) → `npm run validate` |
| Add skills to a coding agent | [`starlight-agent-skills`](https://github.com/Starlight-Intelligence/starlight-agent-skills) → `npx skills add` |
| Control model routing and spend | [`starlight-ai-harness`](https://github.com/Starlight-Intelligence/starlight-ai-harness) → `routing.schema.json` |
| Review interface work | [`starlight-design-intelligence`](https://github.com/Starlight-Intelligence/starlight-design-intelligence) → `brand-packs/` |
| See the operator surface | [starlightintelligence.ai](https://starlightintelligence.ai) |

## Status vocabulary

| Status | Meaning |
| :--- | :--- |
| `active` | Used or shipped. The README describes current behavior. |
| `internal` | Real and maintained, but a tool for this estate rather than a product. |
| `pilot` | Pre-release. The README states what is unfinished; do not assume the happy path works. |

Entry is the file or command the README itself points at.

## Index

| Repository | Status | Purpose | Entry | Language |
| :--- | :--- | :--- | :--- | :--- |
| [`Starlight-Intelligence-System`](https://github.com/Starlight-Intelligence/Starlight-Intelligence-System) | active | SIP protocol plus the reference build: six semantic vaults, an MCP server, and agent definitions several tools read from one record. | `SIP.md`, then `SETUP.md` | TypeScript |
| [`starlight-agent-canvas`](https://github.com/Starlight-Intelligence/starlight-agent-canvas) | active | Local canvas where sources, prompts, MCP calls and agent runs become typed nodes you can inspect and export as context. | `pnpm install && pnpm dev` | TypeScript |
| [`starlight-agent-skills`](https://github.com/Starlight-Intelligence/starlight-agent-skills) | active | Portable skill files for Claude Code, Codex, Cursor, Gemini, Grok and OpenCode. | `npx skills add Starlight-Intelligence/starlight-agent-skills` | Python |
| [`starlight-ai-harness`](https://github.com/Starlight-Intelligence/starlight-ai-harness) | active | Routing schema for task classes and model chains, spend caps, deterministic eval checkers, and one receipt per model call. | `python fleet/route_task.py "<task>"` | Python |
| [`starlight-evals`](https://github.com/Starlight-Intelligence/starlight-evals) | active | Whole-system eval runs for models, memory, retrieval and routing, publishing receipts and naming the weakness each run exposed. | `npm run validate` | JavaScript |
| [`starlight-design-intelligence`](https://github.com/Starlight-Intelligence/starlight-design-intelligence) | active | Brand packs, UI rubrics and motion rules used to review interface work for FrankX, Starlight and Arcanea. | `brand-packs/` | JavaScript |
| [`starlight-knowledge-tree`](https://github.com/Starlight-Intelligence/starlight-knowledge-tree) | active | Graph of domains, concepts, skills, papers and open problems, with a contribution path on each node. | `npm run validate` | TypeScript |
| [`starlight-academy-plugin`](https://github.com/Starlight-Intelligence/starlight-academy-plugin) | active | Five learning skills, eight local MCP tools and four practice missions, packaged for the Codex and Claude marketplaces. | `docs/academy/README.md` | JavaScript |
| [`marketing-intelligence`](https://github.com/Starlight-Intelligence/marketing-intelligence) | active | Marketing skills and an agent team that draft and stage work; publishing, sending and spending stay with a person. | `npx skills add Starlight-Intelligence/marketing-intelligence` | JavaScript |
| [`starlight-technology`](https://github.com/Starlight-Intelligence/starlight-technology) | active | Buying research for AI hardware and studio systems, with evidence status and wrong-purchase conditions per recommendation. | <https://starlight.technology> | TypeScript |
| [`starlight-voice`](https://github.com/Starlight-Intelligence/starlight-voice) | pilot | Tauri tray and Python sidecar for push-to-talk control of local agents; live audio, latency and RAM acceptance are listed as pending. | `docs/ARCHITECTURE-2026-10-10.md` | Python |
| [`starlight-genius-forge`](https://github.com/Starlight-Intelligence/starlight-genius-forge) | pilot | Agent-run talent discovery and competition platform aimed at Japan, the Philippines and Indonesia, with a supporter community attached. | `README.md` only | Python |
| [`.github`](https://github.com/Starlight-Intelligence/.github) | internal | Organization profile, governance contracts, the agent operating contract, and the reusable pull-request gate. | `profile/README.md` | JavaScript |

## Rows that could not be fully verified

One row carries a weaker entry point because the repository's README does not name
one. It is listed with `README.md` only above rather than guessed:

| Repository | What is missing |
| :--- | :--- |
| `starlight-genius-forge` | README describes intent and ecosystem alignment; no build, run, or test command is given. |

## Conventions that apply to every row

- Push to `agent/<harness>/<scope>`, never to `main`. Open a draft pull request first.
- The harness that authors a change does not approve it. See [`AGENTS.md`](./AGENTS.md).
- A repository marked `pilot` may change its interface between minor versions without notice.
