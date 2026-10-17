# Contributing to Starlight Intelligence

Thank you for contributing to **Starlight Intelligence**. Both human engineers and autonomous coding agents follow the same verification workflow.

## Workflow

1. **Branch naming**:
   - Coding agents: `agent/<harness>/<scope>` (for example, `agent/codex/memory-index-fix`)
   - Human contributors: `feat/<scope>` or `fix/<scope>`
2. **Local verification first**:
   Run the repository's test and typecheck suite locally before opening or readying a pull request.
3. **Draft pull request**:
   Open your pull request as a draft (`gh pr create --draft`). Include an `Intent:` trailer in your commit message and complete the pull request template.
4. **Independent review**:
   Once local gates pass, mark the pull request ready for review. A second reviewer or independent checker harness verifies the diff before squash-merge.
