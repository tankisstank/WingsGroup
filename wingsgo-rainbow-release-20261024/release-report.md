# WingsGo rainbow border release — 2026-10-24

## Delivered

User authorized push/deploy. Cutover completed 2026-10-24T08:56:28Z (15:56:28+07).

- GitHub master: `1c71d71`; isolated release: `643a40d4c871ec5fe4f6add44c12cd2084cdf7cd`, based on live `16ff60a28ba48489d7d06de648780c522372e13f`.
- Both commits contain the same single CSS change. Release excludes unrelated master changes to generated Payload types/import map and historical docs.
- Active release: `/home/ubuntu/wings-travel/releases/release-rainbow-643a40d`.
- Runtime image: `sha256:0ef04a9a1cfded2efec835f32d68e0cac72cc05f1314530871a949493f9c523b`.
- Only gradient angle animates 0–360 degrees over 5 seconds. Seven colors travel inside the fixed masked 2px rounded border. Existing reduced-motion rule remains.
- Corrected earlier implementation before release: rotating the whole rectangular pseudo-element would move the border away from its card. No transform rotation was shipped.

## Fresh evidence

- `pnpm install --offline --frozen-lockfile`: exit 0.
- `PAYLOAD_DB_PUSH=false pnpm run build`: exit 0 including postbuild; `build-final.log`.
- `pnpm run test:component -- tests/component/editorialBadges.component.spec.tsx tests/component/wingsGoTourCatalog.component.spec.tsx tests/component/promotionPrice.component.spec.tsx`: exit 0, 24/24; `component-final.log`.
- Independent Codex review: no P1/P2/P3 code findings; `codex-review.md` and full `codex-review.log`. Required operational/browser gates recorded below.
- `deploy/oracle/generate-symlinks.js`, `deploy/oracle/package-release.ps1`: clean zip 108022888 bytes; archive listing has no public/media or .env.
- ARM64 operations build: success, label matches exact candidate; verified again on VPS before backup.
- Fresh encrypted PostgreSQL backup: `shared/backups/release-rainbow-643a40d/wingstravel-2026-10-24T08-50-46-953Z.dump.age`, 4786558 bytes, SHA256 `66f4478073189a632a2e7fd533ecfc222d8d03329c9d9b7e15c1716b2ddcfaf5`.
- Real disposable PostgreSQL restore: exit 0, 6 active sites / 6 homepages, checksum verified, at 08:51:01Z; `backup-restore.log`. Owned disposable database removed afterward.
- Candidate operations `pnpm payload migrate:status`: exit 0, all 28 applied, no pending; `migration-status.log`. Read-only session; no migrate/DDL or production CMS writes.
- Actual ARM64 native smoke: libsql memory create/insert/read and sharp/libvips PNG generation pass; `load-candidate.log`.
- Private candidate browser: moving gradient angle, transform none, fixed 26px radius, pointer-events none, focusable tour link, no overflow at 390/1280, reduced-motion disables animation. Homepage/catalog/Japan-market cards checked.
- Public browser: six route/width cases (homepage, /tour, Japan market at 390/1280), plus reduced-motion; `live-browser.log`. Angle advanced across 700ms samples; transform none; focus pass; no overflow. Browser errors empty. Viewed fresh `live-tour-1280.png`, `live-tour-390.png`.
- `cutover.sh`: exit 0; immutable image + expected BUILD_ID verified, restart count 0, database/Redis up, lead delivery configured; `cutover.log`.

## Operational recovery

On-VPS runtime build failed with `No space left on device` during chown; production was unchanged. Built the same packaged standalone with the existing Dockerfile on local Buildx for ARM64, uploaded the completed 211807232-byte image, and loaded it on VPS. This changes build location, not architecture/runtime/source. Existing Dockerfile ENV warnings retained in `runtime-build.log`.

Removed only this release's extracted node_modules/.next/public and the exact cache IDs created by this session's failed build. No global prune or deletion of other releases/containers. Latest observed available disk: approximately 1.1GB; ongoing low headroom remains an infrastructure risk.

Pinned previous runtime: `sha256:6ff0106b45f4eba6a5019e502891903a7103105ca893a65602bbabac5e1a8f27`, tag `wingstravel-app:rollback-rainbow-643a40d`; previous release `release-us081-wingsgo-16ff60a`. Cutover has automatic readiness/image/BUILD_ID failure rollback. Manual rollback must restore previous current symlink and use rollback-compose.yml with the pinned previous image. Database schema stays unchanged. Backup/receipt and operations image retained.

## Limits

No full repository suite, physical devices, Safari/Firefox, sustained performance profile or real lead submission. Existing browser-session tooling timeout during an additional click check is not accepted as navigation proof. Earlier local 404 had no usable tour fixture and is not accepted as UI proof. Initial build/test commands ran before installation completed; fresh final runs above supersede those failures.

## Final tracking and cleanup

`plane:preview` and filtered `plane:sync:workitems` exited 0: patchedCount1/missingCount0. Fresh API readback at09:01:22Z confirms WGO/E07/US-084, Đã bàn giao, ownerc0508g, start2026-10-20/target2026-10-24, missingDates0/genericChildNames0. This existing item has zero child tasks; none were invented for the CSS follow-up. Plane plan does not support Initiatives; Project/Epic/US sync completed.

`final-runtime.sh` exit0 at09:01:42Z: owned private candidate removed, production immutable image unchanged, restart0, database/Redis up and lead delivery configured. Latest app tags rebound to the reviewed image for future standard Compose use. Previous pinned rollback image still present. Disk approximately1.1GB free (98% used); backups and historical resources preserved.
