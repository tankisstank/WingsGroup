# US-092 Phase 2 Report — WingsGo Commerce Hero & Business Calendar Detail

- **Story:** US-092 WingsGo Tour Catalog v2
- **Epic:** E07 Tour Product Platform
- **Phase:** Phase 2 (Commerce Hero `/tour` & Shared Retail Rows)
- **Date:** 2026-10-29
- **Branch:** `feat/us-092-tour-catalog-v2`
- **Commit Baseline:** `afe8dd0`
- **Snapshot Commit:** `9992ee0` (`test(wingsgo): US-092 phase 2 regression snapshots`)

---

## 1. Executive Summary

Phase 2 completes the commerce hero on the WingsGo tour catalog route (`/tour`), extracts shared departure card row presentation for homepage parity, unblocks the VN business calendar on tour detail month grouping, and adds full SSR and component test verification:

1. **D1 (Hero Without CMS Registry Migration):**
   - Created `WingsGoCommerceHero` in `app/src/heros/WingsGoCommerceHero.tsx` and interactive `WingsGoQuickSearchForm` in `app/src/heros/WingsGoQuickSearchForm.tsx`.
   - Rendered directly by `WingsGoTourCatalogSection` on `/tour` without adding keys to `heroPresentationDefinitions`, `hero.presentation` enum, or requiring database migrations.
2. **D6 & Additive DTO (`hero` property):**
   - Added `hero: WingsGoCatalogCard[]` to `WingsGoCatalogData`.
   - Computed as `hero = filtersActive ? [] : featured.slice(0, 3)`.
   - `featured` remains 6 slots, excluded from `all` and carried in keyset cursor `x`.
   - Client catalog renders remaining slots `featured.slice(initial.hero.length)` (slots #4–#6) in "Tour nổi bật". When that slice is empty while hero has cards, the section is hidden with no empty message.
3. **Single Snapshot Per Request:**
   - In `cmsPage.tsx`, `RenderHero` is omitted when `useWingsGoTourCatalog === true`.
   - `WingsGoTourCatalogSection` executes a single `queryWingsGoTourCatalog` call, providing `initial.hero` to `WingsGoCommerceHero` and `initial` to `WingsGoTourCatalogClient`. No redundant queries or timing drift.
4. **Shared Row Extraction with Byte-Identical Regression Parity:**
   - Pre-refactor regression snapshot tests were created and committed first under `test(wingsgo): US-092 phase 2 regression snapshots` (`9992ee0`).
   - Extracted `WingsGoHeroTourRow` into `WingsGoCommerceHero.tsx` and reused it in `HighImpactHero` (`variant="retail-departures"`).
   - Post-refactor regression test verified byte-identical HTML snapshot output in both VI and EN.
5. **Detail Page on VN Business Calendar:**
   - Updated `groupDeparturesByMonth` in `app/src/tours/utils.ts` to use `businessCalendarMonth`.
   - Existing 00:00:00Z departures matched the pre-refactor snapshot 100%.
   - Added unit test proving that `17:00:00.000Z` on the previous UTC day correctly groups into the next VN month (`Asia/Ho_Chi_Minh` UTC+7).
6. **Quick Search Navigation:**
   - Interactive quick search form supports `market` (whitelisted from `WINGSGO_CATALOG_MARKETS`), `departureMonth` (next 12 VN business months), and `season`.
   - Submits via `router.push(url, { scroll: false })` preserving other active filters and dropping empty parameters. Zero calls to `scrollIntoView`.
   - Motion styles respect `prefers-reduced-motion`.
7. **SSR Test for `initial.nextCursor`:**
   - Added integration test proving that with >6 eligible `all` cards, the SSR section outputs non-null `initial.nextCursor` and `initial.hero` slots #1–#3.

---

## 2. Changes Summary

| File | Change |
|---|---|
| `app/src/tours/wingsGoCatalogCopy.ts` | Extended `WingsGoCatalogCopy` interface and dictionaries with hero titles, subtitles, quick-search labels, season names, and `daysUntilDepartureBadge` formatter for VI and EN. |
| `app/src/tours/wingsGoCatalog.ts` | Added `hero: WingsGoCatalogCard[]` to `WingsGoCatalogData`, `emptyCatalog`, and `queryWingsGoTourCatalog`. Added locale-aware `/en` prefix to `card.href` in `buildCard`. |
| `app/src/app/(payload)/api/wingsgo/tour-catalog/route.ts` | Added `hero: []` to endpoint `emptyCatalog`. |
| `app/src/heros/WingsGoQuickSearchForm.tsx` | New interactive client component with dropdowns for market, next 12 business months, and seasons. Submits with `router.push(url, { scroll: false })` without `scrollIntoView`. |
| `app/src/heros/WingsGoCommerceHero.tsx` | New commerce hero component. Exports `WingsGoHeroTourRow` (shared row), `WingsGoHeroLargeCard` (slot #1 with hot rainbow, editorial stickers, PromotionBadge, dateMeta, airline, daysUntilDeparture badge), and `WingsGoCommerceHero`. |
| `app/src/heros/HighImpact/index.tsx` | Refactored departure row rendering to use shared `WingsGoHeroTourRow`. Removed redundant row formatting logic. |
| `app/src/app/(frontend)/cmsPage.tsx` | Omitted `RenderHero` when `useWingsGoTourCatalog === true`. |
| `app/src/tours/WingsGoTourCatalogSection.tsx` | Rendered `<WingsGoCommerceHero />` above `<WingsGoTourCatalogClient />` using the single `initial` query snapshot. |
| `app/src/tours/WingsGoTourCatalogClient.tsx` | Rendered `initial.featured.slice(initial.hero.length)` in "Tour nổi bật". Hides section when remaining slice is empty and hero has cards. |
| `app/src/tours/utils.ts` | Switched `groupDeparturesByMonth` month grouping to `businessCalendarMonth`. |
| `app/tests/unit/groupDeparturesByMonth.unit.spec.ts` | Added snapshot regression test (committed in `9992ee0`) and test for 17:00Z UTC day boundary. |
| `app/tests/component/highImpactRetailDeparturesSnapshot.component.spec.tsx` | Added 4-card VI and EN snapshot regression test for `HighImpactHero` (committed in `9992ee0`). |
| `app/tests/component/wingsGoCommerceHero.component.spec.tsx` | Added component tests: hot+sticker+promo badges on slot #1, clean markup without empty badge wrappers, EN copy without Vietnamese strings, `/en` links, contact price localization, filtersActive card omission, quick search submit navigation and no scrollIntoView. |
| `app/tests/component/wingsGoTourCatalogSection.component.spec.tsx` | Added SSR component test for non-null `initial.nextCursor` and `initial.hero` slots #1-#3, and `hero: []` with active filters. |
| `app/tests/component/wingsGoTourCatalog.component.spec.tsx` | Added tests for slots #4–#6 display in featured section, hiding featured section when empty, and zero card intersection across hero/featured/all. |
| `app/tests/unit/wingsGoCatalog.unit.spec.ts` | Updated empty catalog assertion to include `hero: []`. |
| `app/tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts` | Updated empty catalog assertions to include `hero: []`. |

---

## 3. Test Evidence

### 3.1 Targeted Specs
- `tests/unit/groupDeparturesByMonth.unit.spec.ts`: 2/2 passed (snapshot verified identical).
- `tests/component/highImpactRetailDeparturesSnapshot.component.spec.tsx`: 2/2 passed (snapshot verified identical).
- `tests/component/wingsGoCommerceHero.component.spec.tsx`: 6/6 passed.
- `tests/component/wingsGoTourCatalogSection.component.spec.tsx`: 2/2 passed.
- `tests/component/wingsGoTourCatalog.component.spec.tsx`: 11/11 passed.
- `tests/unit/businessCalendar.unit.spec.ts`: 17/17 passed.
- `tests/unit/wingsGoCatalog.unit.spec.ts`: 52/52 passed.
- `tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts`: 16/16 passed.
- `tests/unit/wingsGoTourCuration.unit.spec.ts`: 26/26 passed.

### 3.2 Full Test Suites
- **Component Suite (`pnpm run test:component`):** 59/59 test files passed, 388/388 tests passed.
- **Unit Suite (`pnpm run test:unit`):** 162/163 test files passed, 1335/1336 tests passed.
  - The single failure is the pre-existing test in `wingsGroupV3Shell.unit.spec.ts:42` (reported below).
- **TypeScript (`pnpm exec tsc --noEmit`):** 0 errors in story code. Only the 2 pre-existing errors in `wingsGroupCorporateRoutes.unit.spec.ts` (reported below).
- **ESLint:** 0 errors across all changed and created files.
- **Git Diff Check:** `git diff --check 8980e23..HEAD` clean.

---

## 4. Pre-existing Failures Reported Separately

As noted in the orchestrator brief and preserved without modification:
1. `tests/unit/wingsGroupV3Shell.unit.spec.ts:42`: Expects `'!isWingsGroup ? <ThemeSelector'`, actual code has `'!isWingsGroup && !isWingsGo ? <ThemeSelector'`.
2. `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(116, 155)`: 2 TypeScript type mismatch errors.

---

## 5. Anything Could Not Do & Open Questions

- **None.** All Phase 2 specifications (D1 commerce hero without CMS registry change, D6 additive `hero` DTO, shared row extraction with identical snapshot, VN business calendar grouping, SSR cursor test, and component tests) have been fully implemented and verified.
