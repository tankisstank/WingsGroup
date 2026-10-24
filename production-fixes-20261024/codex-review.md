**P1: none. P2: one. P3: none.**

### P2 — Failed cutover can corrupt the next deployment’s rollback pairing

[oracle-vps-arm64-deployment.md:156](/E:/repo/WingsTravel/docs/runbooks/oracle-vps-arm64-deployment.md:156) captures the release from `current` and the image from the running container independently. Line 173 advances `current` before container recreation at line 176.

If recreation fails, `current` can identify candidate B while container A remains running. A subsequent deployment C then records **release B with image A** as its rollback pair, without detecting the mismatch. B’s operations image may consequently accompany A’s application image during recovery.

**Required correction:** verify the release/container identity pairing before saving rollback metadata, and document restoring `current` when recreation fails. Post-cutover verification should also compare the running image with the intended candidate image; readiness alone does not establish that identity.

### Reviewed evidence

`git diff -- docs/runbooks/oracle-vps-arm64-deployment.md` and numbered reads of all six authorized files completed with exit **0**. Recorded evidence supports successful cleanup, atomic `previous` repair, readiness, and restart count **0**. No additional concrete issue was found in those operations.

Not checked: live production or browser state; no scripts were executed or files changed. The finding concerns future deployment recovery, not evidence of current production failure.