# pr-gate

Report-only PR diagnostics. This implementation cannot authorize a merge or
certify provider independence. `merge: true` is refused before any API request.

The runner reads PR files, reviews, comments, threads and checks through GitHub's
API without executing PR source. It binds observations to a full head SHA,
checks current-attempt job membership, and rejects missing or ambiguous CI.
Typed receipts and clean prose never supply approval. A review bot identifies
the reviewer account; the maker's actual provider remains unverified because
all harnesses can push under the same human GitHub account and choose branch names.

Call the reusable workflow at an immutable commit with `gate-ref` set to that
same commit. Required contexts use JSON, for example:

```yaml
required-checks: >-
  [{"name":"Starlight CI / release aggregate","appId":15368,"workflowPath":".github/workflows/ci.yml"}]
merge: false
```

Legacy comma-separated context names are diagnostic only and fail provenance
validation. Existing pinned consumers retain their old behavior until separately
reviewed. Do not change every consumer or enable required enforcement in a batch.

Permissions: contents/checks/actions read; issues/pull-requests write for reports.
No contents write, secrets, id-token write or production credentials are needed.
The zero-permission review relay triggers a fresh API read and supplies no verdict.

Tests: `node --test pr-gate/*.test.mjs`.
Threat model: `Review-threat-model-Codex-2026-11-03-v1.md`.
