# Community operations and responsible agents

Maintainer approval is the final control point. Agents may read, analyze, propose, draft and verify; they cannot impersonate people, independently solicit private contact data, send mass outreach, announce unverified releases, enable paid services, approve their own code, or merge protected changes.

## Responsibility map

| Seat | Primary responsibility | Output | Gate |
| --- | --- | --- | --- |
| Community Steward | Clear first-response path, contributor support, maintainer triage | Human-readable reply drafts and routed issues | No unsupervised public posting |
| Substrate Maintainer | SIP conformance and SIS reference implementation | Narrow change proposal + reproducible evidence | Protocol compatibility review |
| SDK/Skills Maintainer | Portable skills, examples, adapters, packages | Versioned contribution PR | Interface and license check |
| Docs and Accessibility | Installation success, broken links, first-run experience | Quickstart changes with tested commands | Reviewer verification |
| Evaluation Lead | Reproducible performance/interoperability evidence | Dated, source-linked scorecard | Independent checker |
| Security Reviewer | Disclosure triage, dependency and secret hygiene | Private finding and verified remediation | Restrict disclosure to maintainers |
| Community Editor | Release notes, demo requests, monthly event calendar | Approval-ready copy | Owner approves external communications |
| Observatory | Track issues, PR latency, installs and contributor trends | Evidence ledger, not invented metrics | Publish only attributable aggregate data |

One task ID -> one repo -> one branch/PR -> one named accountable maintainer. Maker and Checker are separate. The standing source for cross-brand governance is the private `AI-Architect-Studio/agentic-ops`; GitHub holds accepted code and release truth.

## Workflow

`observe -> classify -> reproduce -> select canonical repo -> claim -> draft -> locally verify -> independent review -> maintainers accept -> publish verified note -> measure outcome`

- Put proposals in Discussions where appropriate, actionable scoped defects in repo issues, and security findings in private advisories.
- Community agents operate with least-privilege GitHub App tokens; use distinct service identities and auditable provenance instead of fake human personas.
- Prefer read-only polling or existing event-driven automation to noisy scheduled scans; deduplicate events, cap spend, and respect GitHub rate limits.
- Use gated reusable CI, concurrency cancellation and short timeouts; never create a large per-contributor CI bill on draft PRs.
- Mark automated contributions transparently and use externally reviewable artifacts.
- Record verified claims, evidence links, revision SHA, author, checker and license. Build-on-SIP attribution must be truthful, not retroactively stamped on unrelated code.

## Sequencing

**P0:** settle SI ownership and migration ledger; one org profile and community entry point; organization Discussions sourced from `.github`; contribution and security routes.

**P1:** validate reproducible 60-second start for SIP/SIS and skills; publish a small sample repo or template only if the existing reference is too heavy; triage beginner issues.

**P2:** publish a maintained adopter registry, demonstrations and integration stories with consent, verified version and provenance; ship one recurring community demo.

**P3:** introduce sophisticated agent-assisted quest matching, knowledge-graph contribution mapping, multilingual docs and ambassador programs only after community demand and privacy review.

## Metrics

Track weekly: new verified external contributors, first response median, time to first merged contribution, setup success from independent clean environments, returning contributors, unanswered questions and open security reports. Report a baseline before setting growth targets.
