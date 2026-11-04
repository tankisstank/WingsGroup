# CMS tour edit regression — 2026-11-03

## Scope and diagnosis

- Reported route: `/admin/collections/tour-products/181` on production WingsGroup CMS.
- Existing authenticated Edge tab reproduced “This page couldn’t load”. Client console: React 306, lazy resolved `[object Module]`. Server: invalid element type object, digest `2310470905`.
- The response Flight record `6f:I[94326,...,"*"]` maps to `app/src/components/TourAuthoring/index.tsx` in the exact deployed client reference manifest.
- That client entry point re-exported the departure component and all types. Payload requests its default component. No consumers of the two barrel re-exports were found.
- Commit `5585697f039acea4b5829d1bf8670949f39cc944` deletes those two re-exports; component implementation, access controls, requests, data, schema and migrations are unchanged.

## Independent verification

Candidate: `E:\repo\WingsTravel\cms-tour-edit-20261103\candidate`, based on `07b5f15` (production code `5b81a19`). Evidence root: `E:\repo\WingsTravel\cms-tour-edit-20261103`.

| Command / action | Result |
| --- | --- |
| `pnpm install --offline --frozen-lockfile --ignore-scripts` | Exit 0, isolated dependencies |
| `pnpm exec vitest run --config vitest.unit.config.mts tests/unit/compactDocumentControls.unit.spec.ts tests/unit/tourAuthoring.unit.spec.ts` | Exit 0, 20 tests |
| `pnpm exec vitest run --config vitest.component.config.mts tests/component/tourAuthoring.component.spec.tsx tests/component/tourAuthoringPreviewRefresh.component.spec.tsx tests/component/tourAuthoringReadiness.component.spec.tsx` | Exit 0, 11 tests |
| `pnpm exec eslint src/components/TourAuthoring/index.tsx` | Exit 0 |
| `pnpm run build --webpack` | Exit 0, includes TypeScript and standalone preparation |
| Authenticated agent-browser against production build on loopback port 3098 | Tour edit form, authoring panel and itinerary tab render |
| Flight assertion against loaded local edit response | Exactly one TourAuthoring reference, export `default`, authoring region present, failure absent |
| Save departure using local fixture UI | Draft departure appears in table; readiness refresh lists departure #1 |
| Browser errors and console | No errors captured |

Local fixture uses a dedicated SQLite bootstrap database and test user. Its creation initially exposed fixture setup requirements (authenticated request, required tour fields, disable Next cache revalidation outside a server). Those were fixed only in the disposable seed script. Generated Payload types were reverted; no fixture, credentials or database are included in the release.

## Codex consultation gate

Independent read-only `codext exec` review exited 0. Full transcript and result: `codex-review.log`, `codex-review.md` in the evidence root. Result: **no P1/P2/P3 findings**.

Review requested runtime proof rather than inferring success from source deletion. Root subsequently verified the exact candidate production build, Flight `default` reference, authenticated form render, itinerary navigation, draft departure save and readiness refresh. Production tour 181 was also checked after cutover. No departure or tour content was edited in production as part of QA.

## Release preparation

- Build, package and ARM64 operations image completed from the same code commit.
- Fresh encrypted PostgreSQL backup restored successfully in an isolated disposable container.
- Operation: `3b9ab16f-e7cd-4681-8fac-f17bbb164205`.
- Encrypted backup SHA-256: `52047e8f852bafd1c947ebe4076b076c2bede0ac97416a3da40ff441f6fc0c82`.
- Protected server evidence: `/home/ubuntu/wings-travel/shared/backups/release-5585697-3b9ab16f-e7cd-4681-8fac-f17bbb164205`.
- Existing immutable application and operations images remain available for rollback. Deployment does not require content updates or new migrations.

## Limits

Browser save testing used disposable local content. Production QA is read-only. The fix targets tour authoring module resolution; unrelated CMS features are outside this regression scope.

## Production verification and rollback

- Production cutover succeeded at `2026-11-03T05:15:38.829Z` (12:15 Bangkok).
- Current release: `/home/ubuntu/wings-travel/releases/release-5585697`.
- Previous release: `/home/ubuntu/wings-travel/releases/release-5b81a19`.
- Application image: `sha256:8237fe547fd07df23f0ae46f8a4d5ee4b7c4bd6d0c7fca95157a4102ac037654`.
- Operations image: `sha256:526c96cb256bc75dcfb0e73dfa21af8f3c0a663108ad31c85bfe9cb5884dd84d`.
- Migration gate: all 52 registered migrations applied across 28 historical batches; none pending. The temporary preflight initially confused batch count with migration count, stopped safely, and was corrected against `src/migrations/index.ts` before cutover.
- Readiness confirms PostgreSQL and Redis up, lead delivery configured.
- Reloaded the exact existing authenticated Edge tab for tour 181: title field enabled, authoring panel rendered, existing published departure loaded.
- Flight record `6f:I[94326,...,"default"]` now resolves the default component.
- Opened Lịch trình: 11 itinerary rows rendered. No new browser errors after cutover; the previously captured React306 entries predate cutover.
- Server logs contain no new invalid-element/React306 error. Separate translation-key and CSP warnings remain outside this module-resolution regression.
- Production evidence: `cutover.log`, `preflight.log`, `production-qa.json`, `production-logs.log` in the evidence root. UI screenshot was inspected in the authenticated browser.
- Candidate preview container removed; local test server and browser closed. Existing production volumes and rollback release retained.

For application rollback, use the candidate `rollback-compose.yml` with the previous release Compose file and shared environment, and atomically point `current` back to `release-5b81a19`, following the Oracle runbook. No database/content rollback is needed for this source-only fix. The previous image is `sha256:3097df8f8542cf245a2fd2abe52df77b0b6cbc9e4e916e5260a775339a995d50`.

## Tracking handover

- App source commit pushed to `origin/work/cms-tour-edit-20261103`; production continues to run that immutable code commit, not a later documentation commit.
- Appended this follow-up to US-075 validation and its Plane mapping proof note. Existing story acceptance status was retained.
- Filtered Plane preview and `sync-workitems` exited 0. The current Harness database lacks US-075, so preview selected 0 stories and normal sync patched 0 (`missingCount=0`); this is not claimed as proof of story synchronization.
- Existing Plane US-075 was then read and updated directly with the matching source note. API readback verified marker `CMS-EDIT181-20261103`, project WGO, parent Epic E07, preserved story name/state/start/target dates, 6 existing children, missing dates 0 and generic child names 0.
- No duplicate story or acceptance task was created. Missing Harness registration remains an existing tracking inconsistency; it does not invalidate the production regression proof.
- Plane evidence: `plane-preview.log`, `plane-sync.log`, `plane-note-verify.log` in the evidence root.
