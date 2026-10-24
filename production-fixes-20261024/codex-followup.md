**P1: none. P2: one. P3: none.**

### P2 — Failed build can record the previous image as the candidate

[Runbook:86](E:/repo/WingsTravel/docs/runbooks/oracle-vps-arm64-deployment.md:86): Step 5 does not stop explicitly when `docker build` fails; `set -eu` appears only in Step 7. If `wingstravel-app:latest` already exists, the following inspect can write that older image into the candidate’s `APP_IMAGE_ID`.

Step 7 then accepts this image, recreates the old application alongside candidate release metadata, and can pass both readiness and intended-image checks—the intended digest was captured incorrectly.

**Correction:** make successful build completion a prerequisite for writing `APP_IMAGE_ID`, using fail-fast execution in Step 5 or an explicit failure guard.

### Prior rollback finding

The original failed-cutover pairing risk is addressed: the running image must match current release metadata before cutover; candidate and rollback overrides use immutable image IDs; symlink replacements are atomic; failure/signal handling restores the prior link and image; successful cutover requires readiness and image identity validation.

### Empty-volume review

No concrete findings. The script restricts deletion to the four authorized names, checks local driver/options, exact mountpoints, empty directories and absent container references, then removes without force and confirms absence. The log records all four removals at **2026-10-24 09:27:00 UTC**.

**Evidence:** `git diff` and local `Get-Content` reads completed with exit **0**.

Not checked: live production or execution of either procedure. No files or tracking changed. The remaining risk is incorrect candidate image capture after a failed build.