## Code Review Rules

Codex reviews here as the second provider: most PRs in this repo are written by Claude. Flag as P0 or P1:

- A claim in code, copy or docs with no evidence behind it: invented metrics, counts, testimonials, "verified" or "trusted by" without a source.
- Anything that fakes or bypasses CI: posting commit statuses by hand, skipping tests, `--admin`, `--no-verify`, tests rewritten to match broken behavior, graders a do-nothing run can pass.
- Secrets, tokens or keys in code, logs or tests; `.env` values committed.
- Money, auth, env or dependency changes, and new or deleted public pages, without a linked ruling from Frank.
- A checkout, buy button or install command for something that is not purchasable or published yet. Unlaunched products use the waitlist.
- Unbounded loops, retries or agent fan-out with no cap.
- On web surfaces: `100vh` in shells, hover styles outside `(hover: hover) and (pointer: fine)`, inputs under 16px, zoom disabled, motion with no `prefers-reduced-motion` path.

Do not flag style preferences already enforced by the linter.
