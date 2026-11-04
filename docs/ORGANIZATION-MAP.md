# Starlight GitHub organization policy

Proposal date: 2026-11-02. **Proposed target: one active public Starlight organization, `Starlight-Intelligence`.** This draft requires owner adoption and separate approval for each migration; it does not mean transfers have already occurred.

## Product vocabulary

- **Starlight Intelligence (SI):** brand, product and the one canonical GitHub organization for Starlight open-source and platform repositories.
- **Starlight Intelligence Protocol (SIP):** an open interoperability and sovereignty contract, not a separate organization.
- **Starlight Intelligence System (SIS):** reference implementation of SIP, not a separate ongoing public organization.
- **`Starlight-Intelligence-Systems`:** existing transitional organization. Keep live repositories and redirects functioning until reconciled; ultimately stop publishing active Starlight work there.
- **`frankxai`:** founder identity and existing source-of-truth for a number of repositories; migrate with specific evidence and no silent re-parenting.
- **Other product orgs:** Arcanea, GenCreator, FrankX, Agentic Income, AI Architect Studio and others retain their own product/application repositories; interoperable code can depend on the SI protocol and SDKs rather than duplicating them.

## Target structure

| Repository/domain | Canonical target | Migration notes |
| --- | --- | --- |
| `Starlight-Intelligence-System` / SIP reference | `Starlight-Intelligence/Starlight-Intelligence-System` | No same-name repository currently appears in **SI**; the SIS org's same-name mirror is a separate owner and does not itself block transfer. Verify target name remains available and pass operational gates before moving the original from `frankxai` |
| `starlight-agent-skills`, `starlight-evals`, `starlight-voice`, `starlight-design-intelligence`, `starlight-technology` | Existing SI repositories | Verify mirror/origin provenance, publish status, badges, contributor routes |
| `starlight-swarm`, `starlight-knowledge-tree`, `starlight-cosmos-engine`, `starlight-research-hub` | SI | Promote authoritative origin after comparison; do not simply transfer a stale replica |
| `starlight-memory-vault` | Private SI, only if safe and needed | No publicization, secrets, private memory, or raw personal data migration |
| `starlight-memory`, `starlight-kernel`, `starlight-command-center`, `starlightintelligence.ai` | SI | Keep product/private boundaries and release controls |
| `Arcanea-Labs/Starlight-Intelligence-System` | Archive or explicitly identify as compatibility mirror | Audit historical fork consumers before retirement |
| Private portfolio Registry | Existing reviewed canonical source | Portfolio-level policy and evidence; ownership changes require a separate Registry decision, not this community proposal |
| `Starlight-Intelligence/.github` | SI | Central profile, community standards, and long-lived org Discussions source |

## Non-negotiable migration gate

1. Inspect active source, default branches, open PRs/issues, origin/mirror references, tags/releases, branch rules, GitHub App installations, Actions budgets, packages, deployment hooks, webhooks, environments, and public/private boundaries.
2. Identify **one source of truth** per component, including any synchronized mirror and downstream package consumers; stop unsafe write synchronization only after the authoritative branch is established.
3. Confirm target-name availability at transfer time. The existing same-name repo in the **SIS** org is not a target-SI collision; compare and retain its unique history before demoting the mirror. Never delete unique issues, PRs or commits as a transfer shortcut.
4. Transfer the original repo through approved GitHub ownership controls. Validate redirect URLs, branch and checkout, stars/forks, issues, CODEOWNERS, status checks, deployment targets, npm/package publishing, Actions permissions, and documentation links.
5. Update first-party references to the new canonical URL; keep redirect compatibility for third-party links. Never recreate a repo at the old path while redirects matter.
6. Archive/demote redundant mirrors only after comparison, backfill or explicit divergence records, and independently validated consumer health.
7. Retire SIS as an **active** organization only when all repositories have an explicit owner, all external services are green and there is no contributor confusion.

Transfers and org-level settings need authorized human/admin action. Do not describe a documented plan as a completed move. No bulk deletions, repo visibility changes, or autonomous merges.

## Do not create yet

No additional intelligence-system roots, generic framework wrappers, or duplicate organization hubs until a working onboarding funnel, an authoritative registry, and at least one outside contributor's repeatable installation demonstrate demand.
