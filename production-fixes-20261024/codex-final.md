**Closed:** the failed-build stale `APP_IMAGE_ID` P2 finding.

In [Step 5](E:/repo/WingsTravel/docs/runbooks/oracle-vps-arm64-deployment.md), `set -eu` now precedes `cd`, extraction, build, and image capture. The standalone `docker build` command is subject to `set -e`; a failed build stops execution before the following inspect can record an older tagged image.

**Remaining findings within the changed deployment block: P1: none. P2: none. P3: none.**

Evidence: local `Get-Content -LiteralPath` reads of `codex-review.md`, `codex-followup.md`, and the current runbook all exited **0**. Prior rollback-pairing and empty-volume conclusions remain unchanged.

Not checked: live deployment or runtime failure execution; closure is based on static review. No SSH, agents, edits, or tracking changes.