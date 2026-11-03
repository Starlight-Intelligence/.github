# pr-gate threat model, Codex, 3 November 2026, revision 1

Author: Codex. Source base: e3faf85affc49cc8b97a87bebdf20bd97833d6b4.
Review state: candidate, independent-provider review pending. Existing consumers remain pinned.

Protect source, production, review evidence and write permissions. PR source,
branch names, comments, event titles, diffs and artifacts are untrusted. API
identities prove GitHub actors, not the model used by a human-account maker.
No trusted maker attestation exists, so different bot/harness names cannot
certify provider independence.

Ten new regression tests failed against the old source. They cover abbreviated
SHAs, free-form clean prose, unauthenticated maker identity, ignored same-provider
P1s, absent app/workflow/head provenance, retry ordering, duplicate names and
missing thread data. Origin cases exercise the missing provenance contract;
they do not claim every existing configuration exposed an identical exploit.

Repairs: full SHA equality; native APPROVED review state; blocking findings count
regardless of branch hint; app/workflow/repository/head/suite/current-attempt job
binding; failed newer attempts beat old success; incomplete data fails closed;
15-second API deadlines, at most three GET attempts, no retry of uncertain writes;
no private error-body printing; head re-read before report; only Actions Bot's
own sticky marker is updated; immutable gate checkout; no contents-write or
automatic merge; immediate reports replace billed idle polling.

Provider independence remains unverified. Every candidate stays WAITING or
BLOCKED, and merge=true is refused. This is a diagnostic limit, not production
authorization. Human review can evaluate declared authorship separately; typed
comments do not become authenticated remote attestations.

`pull_request_target` and `workflow_run` must load trusted default-branch callers.
Only pinned gate code is checked out; no PR executable, artifact or fork source
runs with reporting permissions. Relay numbers cause fresh API reads. Workflow
edits remain sensitive changes requiring security review and human authorization.

The head or reviews can still change after the final API read. Reports identify
their exact head and confer no merge authority. Actions app identity alone cannot
prove immutable workflow logic. Current protection and independent review must
cover workflow changes; no stronger enforcement is claimed by this candidate.

44 local tests pass: 17 reconciled existing tests, ten regression tests and 17
runner/API tests covering spoofed comments, races, missing data, pagination,
partial GraphQL results, retry/denial behavior and malicious URLs. Fixtures do
not establish live GitHub integration or independent security review.

Sources read 3 November 2026: GitHub required-status-check troubleshooting,
secure pull_request_target docs, REST check-runs/workflow-runs/jobs docs, and
the exact pinned source consumed by Starlight main. No existing app permission,
billing, default-branch rule, production deployment or PR finding is changed.
