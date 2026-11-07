# pr-gate concurrency reconciliation, Codex, 3 November 2026, revision 3

Author: Codex. Reviewer: actual Claude GitHub workflow, follow-up comment
https://github.com/frankxai/agentic-ops/pull/439#issuecomment-6607435620.
State: refined source candidate; new exact-head follow-up and live reusable-source
qualification remain required. Earlier revisions and review limits are preserved.

Claude read all seven v2 packet files and confirmed earlier protected-path,
title-routing and source-pin repairs in the report-only scope. It identified a
medium availability defect: workflow-level cancellation happened before the
comment authorization condition, so an ineligible comment could cancel a report.
Different event groups could also overwrite same-head diagnostics out of order.

The caller now has no workflow concurrency. A read-only resolver in the pinned
reusable source obtains the actual PR before the report job. Only eligible,
resolved report jobs join one repository/PR group, with cancel-in-progress=false.
Every event type for that PR uses the same group. Main push completion is a no-op.
The report reloads current facts after it acquires its job slot; resolved identity
uses PR_GATE_EVENT_RESOLVED rather than attempting to override GITHUB_* variables.
Reports disclose observation time and run identity. This prevents overlapping
workflow reports; manual invocations outside that scheduler remain a limitation.

Repository identity comparison follows GitHub's case-insensitive semantics. New
tests exercise the actual resolver, actual inline source validator, resolved
identity handoff, pinned checkout refs and the workflow's concurrency contract.
They do not simulate GitHub's scheduler or prove a live reusable workflow context.
62 focused tests pass. Same-head facts can change immediately after collection;
diagnostic comments are snapshots and never authorize merge or production.

Remaining limits: app/workflow path does not prove immutable PR workflow content;
workflow changes still require the human gate. Conservative free-text severity
matching may block a clean bot comment. No authenticated maker-provider protocol
exists, so every report remains WAITING or BLOCKED. The gate stays report-only.
