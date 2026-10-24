# US-085 — Production release report

## Delivered

- WingsGroup Option A deployed on wingsgroup.vn, VI and EN, desktop/mobile.
- CMS SiteSettings14 / site1 / code wings-group: supportPhone0912910101 →0948786775, display0948 786 775. Existing additionalHotlines0915250101 and0915260101 preserved. Full settings comparison across six sites passed; only target supportPhone and updatedAt changed.
- Release current: /home/ubuntu/wings-travel/releases/release-us085-6a0dac0.
- Candidate commit: 6a0dac015340f7279bfe352e377193c38b3d0d91, isolated from active0701404. Main workspace and unrelated modifications preserved; no push.
- Running app digest: sha256:54821addabf22f01d90986cc1fcea3e00e4d842627bf4738729b14d2f3c0b962.
- BUILD_ID: wYS7T-NhV_t69ozSUjTj3. Cutover completed2026-10-23T08:12:01Z =15:12:01+07.

## Execution and actual results

| Command / operation | Result |
| --- | --- |
| pnpm install --offline --frozen-lockfile (isolated app) | exit0; no new dependencies |
| pnpm run build + postbuild | exit0 |
| pnpm run test:unit -- six US085/resolver/contract files | exit0;58/58 |
| pnpm run test:component -- five header/contact/homepage files | exit0;45/45 |
| node scripts/wingsgroup-v3-release-gates.mjs --json | exit0; approved, no errors |
| deploy/oracle/package-release.ps1 | exit0;103.02MiB;17155 entries, no env/public-media |
| docker buildx build --platform linux/arm64, exact release SHA | exit0; immutable ops revision verified on VPS |
| postgres-backup.mjs / postgres-restore-drill.mjs | exit0; encrypted4786535bytes, real disposable restore six sites/six homepages |
| cms-operation.mts rehearse | exit0; transaction row lock, one update + second call noop, all other fields/tenants unchanged |
| pnpm payload migrate:status | exit0; all28 registered migrations applied |
| ARM64 native smoke | libsql memory write/read PASS; sharp/libvips PNG90bytes PASS |
| candidate browser via SSH tunnel + host proxy |4/4 VI/EN ×320/1280; old production number expected before apply |
| cms-operation.mts apply | exit0 at08:11:43Z; exact production database/site, same assertions and post-commit cache invalidation |
| cutover.sh | exit0; image and BUILD_ID match, DB/Redis up, lead delivery configured, restart0 |
| check-layout.ps1 on public production domain | exit0;44/44, four routes ×11 widths320..1536; zero overlap/clipping/overflow/mixed EN labels;44px controls |
| check-keyboard.ps1 | exit0; VI/EN popup and drawer Escape restores trigger focus |
| check-inquiry.ps1 | exit0 twice after navigation readiness correction; VI320/EN1280, exact locale contact URL, full-name focused, context preserved, no second dialog |
| check-tenants.ps1 | exit0;8 browser checks WingsGo/WingSide, no US085 controls/number introduced; WingsGo EN accessible label correct |
| Public phone scan | VI5 / EN4 links to new main; zero old main links on Group homepage |
| FAB real browser | exact consultation-fab selector after scroll opens native dialog; snapshot contains new main and preserved additional numbers; Escape closes |
| Browser exception buffer | empty after final check |

Commands, full outputs, JSON measurements and screenshots are in this directory. Codex viewed live-en-320-popup.png and live-vi-1280-popup.png directly.

## Release gates and deviations

Independent Codex review is codex-release-review.md, with agy second opinion in agy-release-review.md. All release findings have explicit dispositions.

Payload CLI migrate detected an existing dev-push marker and prompted about data loss. The owned waiting CLI container was stopped BEFORE confirmation or schema migration. Fresh migrate:status showed all28 applied; source migration inventory is identical to production0701404. US085 introduced no schema delta. No dev marker removed, no force migration or DB push used. The no-pending gate is met; this is NOT a claim that a new migration ran.

Initial inquiry assertion saw a transient focus loss because it checked the field before proving destination document readiness. Corrected runner requires exact destination URL + complete document + focused field. Both locale cases passed twice; first report retained. No application change was made to hide this result.

Initial candidate localhost alias404 was a production host-routing mismatch, resolved with a host proxy. New-session Windows output capture also stalled a runner; only owned runners were stopped. Early FAB attempts used a broad/stale selector and are not proof; final exact visible FAB interaction passed.

## Backup and rollback

Encrypted dump: shared/backups/release-us085-6a0dac0/wingstravel-2026-10-23T08-00-50-028Z.dump.age.
SHA256:c32a55aa5fc22471039539ce95f2cbb8d52af15dffd7df8a005028c91f9797b0. Actual disposable restore verified08:01:02.237Z, followed by candidate updater rehearsal.

Previous current: release-0701404. Previous immutable app image:b2625ab337b68f47029d9310e616efcc1ba9cd8680f5c8c5286eeb98b44f5458, retained as wingstravel-app:rollback-us085-6a0dac0. Application rollback must retag this digest to wingstravel-app:latest AND restore previous symlink before compose recreate. The activation script implements automatic rollback on readiness/image/build failure. No rollback was needed.

Old UI remains compatible with the new CMS phone. An application rollback would retain the requested new phone. Reverting data would require a separately reviewed targeted CMS write; full DB restore is a recovery option, not the default hotline rollback.

## Limits

No real telephone call, external Zalo conversation, lead submission, physical-device test or true browser200% zoom. Full repository E2E/integration suites were not rerun; scoped browser, restored PostgreSQL, Redis and ARM64 checks are recorded explicitly. Existing dev-push marker remains; no new migration. VPS had3.6GB available after release; historical releases/images preserved for rollback.

## Operational closure

Harness trace313 completed; US085 implemented with four scoped proof flags1. Plane preview and sync-workitems both exit0; patchedCount5, missingCount0. API readback2026-10-23T08:27:24Z PASS: correct WGCORE project/E09 parent, US085 plus four named children all Đã bàn giao, exactly one c0508g owner each, missingDates0, genericChildNames0. The original planned timeline23–26October is retained; actual production delivery23October is explicit in report and descriptions. Plane Initiatives unavailable, archived sibling projects skipped; no structure/pages change required.

Owned candidate container and disposable restore database removed with exit0. Owned local host proxy/SSH tunnel and three browser sessions closed. Backup and previous immutable rollback image retained. Fresh after-cleanup readiness remains DB/Redis up, delivery configured, correct active digest/restart0; candidate absent. Candidate worktree generated type/relink outputs restored to its own commit, status clean; main workspace unrelated changes preserved.
