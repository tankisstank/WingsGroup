# US-083 CMS promotion release continuation — 20/10/2026

Scope: ship the already verified per-departure CMS promotion editor. User selected per-departure offers, no bulk. Continue prior VPS release objective. Source is frozen at build GHux1OjjppK42suiKM04m, manifest source hashes verified before packaging. Do not rebuild from the concurrently changing departure-search workspace.

Target: ubuntu@168.110.212.116, /home/ubuntu/wings-travel. Expected current release release-us082-us083-consent-20261020-120500 and image sha256:15ee80cde57fb60e478b015da903d8e3b70cf52ecb815700f7032723dbbf12b4 independently observed healthy. Candidate release release-us083-cms-promotion-20261020-150000, isolated container wingstravel-candidate-us083-cms-20261020 on loopback3104.

Gates: source/build identity; existing Codex review findings resolved; fresh agy read-only review; clean ARM64 package excludes media/secrets; checksum upload; backup decode and pinned rollback image; ARM64 libsql memory query + sharp image creation; readiness database/Redis/leadDelivery; read-only English consent/tenant/catalog price governance; switch app only with rollback trap; live desktop/mobile read-only smoke and identity; retain evidence and synchronize Harness/Plane.

No migration, database/Redis restart, global cache flush, CMS pricing mutation or production form submission. Packaging uses deploy/oracle/package-release.ps1 and generated relink.sh per runbook. Candidate build uses its own image tag and Compose override so latest tags remain on running production until activation. Existing media bind mount retained.

Backup /home/ubuntu/wings-travel/shared/backups/release-us083-cms-promotion-20261020-150000.dump is 4585853 bytes, 3662 entries. SHA256 4fd0c527e3e78a226e61e0948d0a1f595f518aeb6a0b8ce4ec99580a5eea1881; full pg_restore decode to /dev/null exit0. Initial prepare script created backup and pinned rollback but returned127 due final Windows CR-only line; separate verification exit0. Never run prepare again over existing backup.

Rollback: retag wingstravel-app:rollback-release-us083-cms-promotion-20261020-150000 to wingstravel-app:latest and app-app:latest, restore current symlink to previous release, compose up --no-deps --no-build --pull never --force-recreate app, check readiness. No DB restore required because this release does not migrate/write business records.

Resources preserved: existing Herdr panes including separate departure-search agy work, user dev3000, local rehearsal3102. Only own temporary candidate container will be removed after successful post-activation evidence. No Docker prune or deletion of older releases.
