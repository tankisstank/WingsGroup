# Production release — US-085 footer

## Delivered

User explicitly authorized: “đồng ý deploy thay đổi footer”. Cutover completed on **2026-10-23 at21:29:13+07 /14:29:13Z**. No push, production CMS write, schema migration or Redis flush was performed.

- Candidate: `d6057d41c2b3897b27cbd656356f83873d652870`.
- Base: previous live `6a0dac015340f7279bfe352e377193c38b3d0d91`.
- Isolated worktree: `deploy/oracle/us085-footer-20261023`.
- Active release: `/home/ubuntu/wings-travel/releases/release-us085-footer-d6057d4`.
- Runtime image: `sha256:b189e9f428e6e1c372916d378108198376a9cdf528e26c1a838167bb670eee3d`.
- Next BUILD_ID: `KZO1JJYEFmtAhk9MhsCjv`.
- Container start: `2026-10-23T14:29:11.028862774Z`, restart0.

Scope: WingsGroup V3 contact section has one “Gọi ngay / Call now” link. Footer has one resolved hotline **0948 786 775** and one preferred email **info@wingsgroup.vn**. Footer secondary phones, second email, Zalo and repeated consultation CTA were removed. Header disclosure retains secondary contacts, Zalo and inquiry; original form, legal/privacy/address/navigation remain. Existing CMS-cleared and invalid-phone behavior is covered. Other tenant branches remain intact.

Six changed files only: Footer/Component.tsx; frontend/wingsgroup-v3.css; blocks/WingsGroupContact/Component.tsx; components/WingsGroupV3/WingsGroupV3.module.css; footerHotlines.component.spec.tsx; wingsGroupHeaderOptionA.component.spec.tsx. No migration, collection, dependency, lockfile or generated-type change. Unrelated dirty main-workspace changes were excluded.

## Review and preflight

Codex reviewed source/callers and exact six-file diff independently of agy's Footer implementation. Agy additionally reviewed candidate and ran component tests. See `codex-release-review.md`, `agy-release-review.md`, `component.log`; earlier implementation findings and fixes remain in `../review.md`.

Codex corrected agy's overstatements: missing main alone does not clear configured additional phones;44px is a project target, not blanket WCAG conformance; rollback must retag pinned image and restore symlink; no guaranteed rollback duration; app restart does not flush Redis. No scoped finding remains open.

| Command / operation | Actual result / evidence |
| --- | --- |
| `pnpm install --offline --frozen-lockfile` in isolated app | Exit0; install.log. |
| `PAYLOAD_DB_PUSH=false pnpm run build` including postbuild | Exit0; build.log. |
| `pnpm run test:component --` six files | Exit0,59/59; exact arguments in agy-release-review.md/component.log. |
| `node scripts/wingsgroup-v3-release-gates.mjs --json` | Exit0,approvedtrue,errors[]; release-gates.json. |
| `deploy/oracle/package-release.ps1` | Exit0;108021767bytes,17155 entries; no .env/public-media; package.log. |
| Buildx ARM64 operations image | Exit0; ops-build.log, exact candidate OCI revision verified before backup. |
| `backup-restore.sh` | Exit0, encrypted backup and real disposable PostgreSQL restore,6 sites/6 homepages. |
| `migration.sh`: exact candidate `pnpm payload migrate:status` | Exit0,28/28 applied. Migration inventory identical to base; no migrate/DDL/db-push. |
| `prepare-candidate.sh` runtime build/native checks | Exit0; libsql memory write/read and sharp/libvips PNG90bytes on actual ARM64. Four existing Dockerfile warnings retained in candidate-build.log. |
| `check-browser.ps1` private candidate |12/12 UI cases,6 routes ×320/1280; candidate-browser.json. |
| `cutover.sh` | Exit0; exact previous/current immutable images, BUILD_ID and app readiness verified; cutover.log. |
| `check-browser.ps1` public production |24/24,6 routes ×320/390/768/1280; live-browser.json/log. |

Routes: `/`, `/en`, `/lien-he`, `/en/lien-he`, `/ve-wingsgroup`, `/en/ve-wingsgroup`. Public checks assert one correct phone/email, no footer secondary channels/consultation CTA,44px aligned call target, correct VI/EN direct-call labels, contact form present and no horizontal overflow.

## Data safety and runtime

Fresh encrypted backup: `shared/backups/release-us085-footer-d6057d4/wingstravel-2026-10-23T14-19-48-385Z.dump.age`,4786606bytes, SHA256 `e4c866cb2d09a41ba507e22add688db8572c51bef0b89e2c4313d8d4859b00a5`. Real restore receipt passed at14:20:00.529Z, disposable database `us085_restore_d6057d4`, duration10sec. Receipt and backup retained on VPS.

Read-only PostgreSQL comparisons used `PGOPTIONS=-c default_transaction_read_only=on`. Before/after JSON matches exactly:

- 6 site_settings rows, whole-row aggregate fingerprint `63c3def5f5abe122f16631647efb9435`.
- 4 site_settings_additional_hotlines rows, fingerprint `8d69583193003dd0417f7ac0a17313c0`.

See settings-readonly.sh and settings-before/after.jsonl. All fields and updatedAt values unchanged. No cache flush or database/Redis restart. Readiness at14:30:50.295Z: databaseup,redisup,leadDeliveryconfigured,statusready. See runtime.log.

## Rollback

Previous release `/home/ubuntu/wings-travel/releases/release-us085-6a0dac0` retained. Previous immutable image `sha256:54821addabf22f01d90986cc1fcea3e00e4d842627bf4738729b14d2f3c0b962` pinned as `wingstravel-app:rollback-us085-footer-d6057d4`. Restore that image's latest tag AND previous current symlink, then compose recreate only app with no build/pull/dependencies. cutover.sh has readiness-failure rollback; it was not triggered. No rollback-duration claim or destructive data rollback.

## Limits

No real calls, Zalo conversations or lead submission; no physical devices, true200% browser zoom or full repository suite. Fresh59 component tests are this release's test result;58 earlier unit tests belong to historical header release, not a fresh footer run. Existing dev-push marker remains untouched. VPS had2.5GB free after cutover and2.6GB free (95% used) after owned-resource cleanup; historical rollback images and backups are preserved. Header historical proof remains in header-a-implementation-20261023/production-release/.

Browser runner issue: initial PowerShell shim hung after navigation; only verified owned hung runners were stopped. Native agent-browser executable in the same owned session passed candidate and public matrices. Candidate log's original “four widths” progress string is inaccurate; actual candidate JSON records12 cases at two widths. Public runner now reports dynamic width count. No app modification was made for tooling observations.

## Final live checks and cleanup

- `check-tenants.ps1`: exit0, **8/8 cases**, tenant-browser-verified.log/results.json. WingsGo VI/EN at390/1280 retain3 distinct footer numbers, Zalo and correct EN header labels; WingSide at390/1280 retains2 links to its original main number. No WingsGroup controls/number leak or horizontal overflow. WingSide `/en` redirects to its English canonical `/`; those two URL inputs are not two distinct locale pages.
- `check-contact.ps1`: exit0, **2/2 VI/EN** live contact flows; contact-flow-final.log/results.json. Disclosure retains2 supplementary phones, Zalo and locale-correct inquiry route. Tab enters disclosure; Escape closes and restores trigger focus. Form config GET200, available/enabledtrue; name/brief fields, consent checkbox and privacy links present. No form submit or external channel activation.
- Codex viewed fresh public screenshots `live-footer-en-320.png` and `live-contact-vi-1280.png`. Phone icon/number aligned; direct-contact repetition removed. Existing floating consultation trigger remains as approved.
- `agent-browser --session footer-candidate errors --json`: exit0, errors[]; browser-errors.json.
- `cleanup.sh`: exit0 at14:45:26Z, removed only owned private candidate container and restored temporary database. Backup, receipt, operations image and pinned rollback retained.
- `final-runtime.sh`: exit0 at14:46:00Z; active release/image/BUILD_ID still exact, restart0, database/Redisup and deliveryconfigured. Verified owned candidate container/database absent, backup present and previous rollback tag correct; final-runtime.log.
- Owned SSH tunnel60212, local proxy38840 and browser sessionfooter-candidate closed after command-line ownership check. Isolated candidate worktree clean after restoring only generated relink.sh; main dirty workspace preserved.

Runner corrections are recorded, not application failures: navigation timeout was followed by actual complete-document/footer/destination checks; final tenant run includes one CLI navigation timeout but8 DOM assertions pass. Initial expectation that WingSide must expose Zalo was incorrect: its unchanged separate branch conditionally renders configured channels. Source diff and settings invariance were checked before adjusting tenant-specific expectations. Initial consent assertion looked only for native required input; live form uses an accessible role=checkbox. Snapshot confirmed it, then fresh corrected runner passed both locales. Original failed outputs remain in tenant-browser-original-assertions.json, tenant-browser-*.log and contact-flow.log.

## Tracking

Harness US-085: implemented, scoped unit/integration/E2E/platform proof recorded; existing unit proof is explicitly historical. Plane preview and sync patched5/missing0; readback PASS at14:44:01Z: correct WGCORE project/E09 parent, US plus4 named children all Đã bàn giao, ownerc0508g, missingDates0/genericChildNames0. Original planned dates23–26/10 retained; actual early delivery23/10 recorded here. Delivery does not imply stakeholder acceptance. Plane outputs: plane-preview.log, plane-sync.log, plane-readback.json.
