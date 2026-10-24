# US-083 promotion presentation and departure-search production release

Scope authorized by user: image/card promotion badge on homepage, /tour and detail; original price crossed out before red sale price; deploy with commit 58633ae36834bcc0869237f5565d12ccac41929d. No production content writes or schema migration.

Implementation: shared pure PromotionPrice/PromotionBadge reused by HighImpact hot-offer row, WingsGoTourCard, homepage schedule and StructuredPages. Invalid or non-discount prices never create del/red sale. Numeric-only labels are hidden. Text labels overlay images, with wrapping within image bounds. Detail badge and rail both respect null/current departure selection.

Independent review: Codex found server/client helper boundary and stale detail badge after empty city/month selection. Removed unnecessary client boundary, respected null provider selection, added real filter regression; Codex follow-up closed P2, no P1/P2/P3 newly outstanding in scoped fixes. Agy promotion review passed 11 new component cases. Agy search review confirmed commit/config, noted missing nonempty-where regression; root added site+published-filter test. Expected locale-specific title search is an operator note, not a defect.

Verification before release:
- Component: 4 files, 28/28 (includes HighImpact/card shared prices, labels, detail filter reset).
- Unit: 3 files, 25/25 (search config/merge, mapper eligibility, cache paths).
- TypeScript exit0; scoped ESLint exit0, 67 existing warnings; git diff --check exit0.
- Final pnpm build + postbuild exit0. BUILD_ID wgqUkwWtCKGG7aKW-11iv. Build contains existing HEAD 58633ae plus uncommitted visual delta; no commit/push performed.
- Real local PostgreSQL search through Payload mergeListSearchAndWhere + find matched existing departure1 by related title Hàn Quốc with site2/published AND conditions. Read-only, overrideAccess true; not a production CMS auth test.
- Standalone with PostgreSQL55432/Redis56379 and local Host proxy: /tour and detail at1440/390, correct textual badge and discount pair, no document overflow. Existing fixture only; no data writes. Media is absent locally; real production images checked after activation.

Production preparation:
- Expected previous current release-us083-cms-promotion-20261020-150000, image sha256:8756cce56b9bf7978f2586d382e0039a16075962463248bbc39f7beeb3d3541f.
- Backup release-us083-promotion-search-20261020-170000.dump: 4,593,717 bytes, SHA256066a723b260a74d349d54bab0e84ba2ab3ac26263c8b94f0215b6efd9adb5030; pg_restore list3662 entries. Rollback image pinned. Production readiness database/redis up, delivery configured. Backup created2026-10-20T16:45:58Z.
- Intake145; activation and production browser evidence pending. Do not treat this preparation document as proof of deployment.

## Core activation and market follow-up checkpoint — 21/10/2026 00:10 +07

Core release activated2026-10-20T17:00:47Z (=21/10/2026 00:00:47+07), current release-us083-promotion-search-20261020-170000, image sha256:46d8b184fd48cb485ba0c38398893830325be517580987c46d516cffd132758c, BUILD_ID wgqUkwWtCKGG7aKW-11iv. Archive111478112 bytes/SHA256ac6bf1309887b55d65da3e1ea68aee3882e1d83388adf3735577b40b193411a8,17209 entries,no media/env. Candidate/active read-only API and rendered homepage/catalog/detail pass; running server bundle contains all6 search fields from58633ae. Exact public promotion asset hash457eba508cf5509805cc00e3998c4dfbad2c44efe3ad223dc496ff9c60f2d25d matches local. Current production data119 is original42.9M/sale40.9M; numeric label40900000 is hidden visually, unchanged in CMS. No business data mutation.

Browser first process stalled during viewport initialization (about:blank); stopped only owned runner, reopened own session and reran. Live desktop home/catalog/detail/HanQuoc passed no overflow. Japan route gate correctly FAILED: TourMarketPage still used formatTourPrice(tour.lowestPrice) without currency, returning Contact and no eligible discount. Core screenshots confirm requested price pair works; market failure is not reported as success. Owned first candidate removed; core production remains ready. No blanket rollback because market behavior predated this visual delta and core fix/search are valid.

Intake146 tracks market follow-up. Root replaces market card price with normalized selected departure + shared components; agy handles eligible verified-governed-price selection and independent tests. Market promotion component9 cases plus related suites total41/41, tsc exit0 before final selector test changes. Codex initial market snapshot flagged pending selector patch; follow-up reviews final selector before release. Follow-up activation/build/native/browser gate remains pending at this checkpoint.

## Market follow-up build gate — 21/10/2026 00:17 +07

Final source frozen and matching fingerprints: queries market selector prefers first verified, nonsoldout, supported-currency positive-price future departure, then preserves previous fallback. Shared market renderer ignores unrelated tour.lowestPrice and uses selected departure original/sale/label. Codex pending-selector/unsupported-currency P2 and sold-out-preference P2 are resolved in final source; dedicated seven-case suite includes both exact regressions and single-departure identity. No unaddressed scoped findings remain after root closure in audit-20261020.md.

Final local gates: unit4files32/32, component6files41/41, integration query perimeter1file11/11, TypeScript exit0 including final test additions, scoped ESLint exit0/99 existing warnings. Build+postbuild exit0, BUILD_ID Jbkhivn63kcHi42C2Be4O. Root checked frozen production source hashes after build. No fixtures created/written for this follow-up.

Next candidate release-us083-promotion-search-market-20261020-172000 prepared with a fresh backup4593773 bytes/SHA256e845a6fb4e727f0fd3bb509418b3918f62b69c78c5f89a5508de9c1655b66837. pg_restore list3662 and full archive decode to /dev/null exit0; no database restore. Rollback tag pins core image46d8b184. Packaging/native/candidate-render/full-browser completion is recorded below only after execution. Harness trace304 is partial, US083 platform proof0 until that gate completes.

### Commands executed for the final market source

From app/:
```powershell
pnpm exec vitest run --config vitest.unit.config.mts tests/unit/marketCommercialDeparture.unit.spec.ts tests/unit/tourDeparturesSearch.unit.spec.ts tests/unit/wingsGoCatalog.unit.spec.ts tests/unit/wingsGoCatalogRevalidation.unit.spec.ts
# exit0; 4files /32tests
pnpm exec vitest run --config vitest.component.config.mts tests/component/promotionPrice.component.spec.tsx tests/component/marketPromotion.component.spec.tsx tests/component/marketDepartureCta.component.spec.tsx tests/component/retailTourDepartureSync.component.spec.tsx tests/component/wingsGoTourCatalog.component.spec.tsx tests/component/heroPresentations.component.spec.tsx
# exit0; 6files /41tests
pnpm run test:int -- tests/int/wingsSideTourScoping.int.spec.ts
# exit0; 1file /11tests (mocked query perimeter)
pnpm exec tsc --noEmit
# exit0
pnpm exec eslint src/tours/queries.ts src/tours/StructuredPages.tsx
# exit0; 0errors /99warnings
pnpm run build
# exit0 including postbuild
```

Repo-root packaging: `./deploy/oracle/package-release.ps1`; immutable archive and hashes verified before upload. Production scripts in evidence folder are executed through SSH with CRLF stripped. Candidate and live checks never submit leads or write CMS records.

## Final production gate — 21/10/2026 00:25 +07

Activated `release-us083-promotion-search-market-20261020-172000` at 2026-10-20T17:25:02Z (21/10/2026 00:25:02+07). BUILD_ID `Jbkhivn63kcHi42C2Be4O`, image `sha256:bf1387fd6dfb057b8ac2774f85746708683e0f40b373aff7fac14b43d7f6703f`. Includes HEAD `58633ae36834bcc0869237f5565d12ccac41929d` plus frozen visual/market fixes. No commit/push, migration, production content write, Redis flush, or database/Redis restart. Only app recreated.

- Mandatory packager exit0: archive111478743 bytes,17209 entries, no public/media or env files; SHA256 `1279f517351a9ce48b4a9be77670f5b5daf24f396cd4e31fa7e4bee62eee3e10`. Remote checksum manifest and inner BUILD_ID matched.
- Isolated ARM64 candidate exit0: readiness database/Redis up, lead delivery configured; libsql CREATE/INSERT/SELECT in memory matched exact value; sharp/libvips PNG90bytes. Same image promoted. Owned candidate removed after live verification.
- Candidate and active read-only API/render assertions exit0: English consent/privacy, trusted locale, invalid locale400, tenant isolation; verified catalog original/sale pair; homepage, /tour, detail119, Japan market HTML all show42.9M original/40.9M sale. Running server bundle contains all six listSearchableFields from58633ae.
- Exact public JS asset `static/chunks/0-2pc54y_pauc.js` SHA256 `942168d0912a9474b4315ebb2f02780ed5a309781ae496c859dfd60e0502aef6` matches verified build,437257 bytes.
- `production-browser-smoke.ps1` exit0,12/12: homepage, /tour, detail119, HanQuoc, Japan, WingsGroup/en at1440x900 and390x844. Exact URL/heading/body, eligible discount presence, numeric badge suppression, English privacy link, no horizontal overflow; pageErrors0. Additional price closeups reviewed by root confirm gray crossed original and red sale on catalog/mobile and Japan/mobile. Numeric CMS label40900000 intentionally suppressed; no business data edited.
- Backup4593773bytes, full pg_restore decode to /dev/null exit0. Rollback tag `wingstravel-app:rollback-release-us083-promotion-search-market-20261020-172000` pins previous core image46d8b184 and previous release path. Activation script includes app-only restore on failed readiness. No rollback was needed. Remaining disk5.7G (88% used), observed after candidate removal; no global pruning performed.

Durable evidence and screenshots: `docs/reviews/us083-promotion-visual-search-20261020/market-followup/`. Earlier partial checkpoints above are superseded by this final gate. Full repository integration/E2E suite, authenticated production CMS save, production lead submission/email and database restore drill were not run for this visual delta. Integration11 cases test query perimeter with mocks; production smoke is read-only. Badge with textual copy was exercised in local component/browser fixtures; current production numeric label is unchanged.

Tracking closure: Harness US-083 implemented, unit/integration/e2e/platform all1, trace305 completed. `PLANE_STORY_IDS=US-083 pnpm run plane:preview` exit0; `pnpm run plane:sync:workitems` exit0, patchedCount1/missingCount0. Read-only Plane API verification at2026-10-20T17:29:12Z confirms US082 in core/E09 and US083 in WingsGo/E07, both Đã bàn giao, start/target2026-10-19 retained, missingDates0/genericChildNames0. No structure/page changes or imports. Frozen source hashes still match and HEAD remains58633ae. Owned browser session closed. Detail screenshot retaken after lazy image loaded; loaded screenshot reviewed successfully.

## CMS preview refresh follow-up — 21/10/2026 00:44 +07

User reported that editing a departure's price/promotion did not refresh the embedded Tour preview. Root cause was confirmed: the separate `tour-departures` REST mutation only refreshed the departure table/readiness and did not emit Payload's document event consumed by `RefreshRouteOnSave`. In addition, a published parent TourProduct could receive a published handoff and therefore exclude the draft departure during preview rendering.

The follow-up now emits a `tour-departures` update event only after a successful save/delete, reloads readiness through `departureRevision`, guards stale locale/document responses, and emits `tour-products` events after successful authoring actions. Authenticated `tour-products` preview handoffs use draft mode so related draft departures are included; other collections and public routes retain their prior rules.

Focused component suites pass27/27, preview handoff unit suites pass19/19, TypeScript exit0, production build exit0, and affected-file diff check exit0. Evidence and worker reports are in `artifacts/tmp/us083-preview-refresh-20261021/`. No production deployment or data write was performed for this follow-up. Existing signed preview handoff TTL remains60 seconds; it was not extended.
