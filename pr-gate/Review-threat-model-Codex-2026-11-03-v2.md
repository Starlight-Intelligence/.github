# pr-gate review reconciliation, Codex, 3 November 2026, revision 2

Author: Codex. Actual reviewer: Claude via the existing agentic-ops GitHub workflow.
Original candidate: 68cac61112403f68af7a9a6836d70899157a36e7. State: refined candidate;
the new head still requires exact-revision follow-up. Revision 1 is preserved.

Review evidence: https://github.com/frankxai/agentic-ops/pull/439#issuecomment-6606894236
The reviewer read all 13 supplied files in the combined source packet. It did not
recompute the hashes, fetch upstream source or review either complete product.
Its 2m16s workflow completion is supported by an actual substantive review comment,
not inferred from exit status. No specific model version or cash charge is asserted.

Reconciliation:

- Medium, self-attested aggregate code: protect .github/scripts and the aggregate
  test path alongside workflows. This adds a human-gate reason in diagnostics;
  report-only logic is still not server-side CODEOWNERS or required-workflow enforcement.
- Low-medium, fork relay/title: discard event titles and attached PR arrays. Read
  the triggering workflow run and resolve its current PR from repository/head/fork
  identity through the commits/pulls API. Reject unknown workflows or ambiguity.
  Concurrency uses head SHA instead of title. Fork relay, stale and adversarial
  title tests exercise this path directly.
- Low, source pin mismatch: use GitHub's documented job.workflow_sha and
  job.workflow_repository (not github.job_workflow_sha) to compare the loaded gate
  ref with the actual reusable job source before checkout. Missing context fails
  closed. The actual inline validator is exercised in separate Node processes.
  The privileged reusable workflow's existing checkout/setup-node v4 refs are now
  pinned to their observed tag commits without changing major versions.
- Low, unused wait input/dead branch: mark the compatibility input deprecated
  and remove the unreachable branch. Conservative free-text severity blocking
  remains a diagnostic false-positive risk; it does not permit a merge. A trusted
  structured finding protocol is required before this can become enforcement.
- Conditional medium, self-hosted fork code in the Starlight build: current
  repository variable inventory returned no variables, including CI_RUNNER.
  No self-hosted admission is observed. This remains a future configuration risk;
  a later runner change must qualify untrusted-PR isolation and explicit approval.
- Low-medium, tested merge SHA/base: current Starlight logic relies on GitHub's
  same-run needs and checkout semantics. It does not independently inspect merge
  parents or enforce a current base. Do not claim those properties. Strict branch
  protection or a qualified merge queue remains a separate release decision.

57 focused tests pass after these repairs, including the 44 initial cases and
13 additional protected-path, event-routing and actual workflow-validator cases.
No consumer pin, live protection, billing, app grant, sensitive merge or deployment
has changed. New runtime contexts need actual integration proof before adoption.

Primary sources checked 3 November 2026:
- https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- https://docs.github.com/en/rest/actions/workflow-runs
- Live Starlight pr-gate run 41656793060 referenced_workflows corroborates its
  actual old reusable source pin; it does not qualify this new candidate.
