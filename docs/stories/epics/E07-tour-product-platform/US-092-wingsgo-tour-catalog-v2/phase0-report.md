# US-092 Phase 0 — Execution Report

## 1. Summary

Phase 0 of US-092 (WingsGo Tour Catalog v2) has been executed strictly within `E:\repo\WingsTravel-us092` on branch `feat/us-092-tour-catalog-v2`. All requirements defined in the orchestrator brief have been implemented and verified. No remote, staging, or production systems were accessed; no migrations or schema changes were performed; and no code was pushed.

---

## 2. Files Changed & Added

### Core Implementation
1. **`app/src/tours/wingsGoCatalogCopy.ts` (new):**
   - Centralized Vietnamese/English copy module (`WINGSGO_CATALOG_COPY`, `getWingsGoCatalogCopy`, `resolveWingsGoCopyLocale`).
   - Default fallback for omitted, null, or undefined locale safely resolves to `'vi'`.
   - Covers contact price label, featured section headings/kickers/descriptions, catalog section headers, filter labels, market options (South Korea, Japan, China), sort options, duration/price inputs & placeholders, retry/error states, load more button, and empty filter messaging.
2. **`app/src/tours/businessCalendar.ts` (new):**
   - Pure business calendar helper for `Asia/Ho_Chi_Minh` (UTC+7).
   - Exports:
     - `toBusinessCalendarDay(value)`: returns `YYYY-MM-DD` in VN calendar (or `null` for invalid).
     - `businessCalendarMonth(value)`: returns `YYYY-MM` (or `null` for invalid).
     - `daysUntilBusinessDay(target, now)`: returns integer calendar-day difference in VN calendar.
3. **`app/src/tours/wingsGoCatalog.ts` (modified):**
   - `buildCard`: Updated contact price fallback to use `getWingsGoCatalogCopy(locale).contactPriceLabel`.
   - Preserved DTO contract (`price.kind = 'contact'`, `price.label`), backwards compatible.
4. **`app/src/tours/WingsGoTourCatalogSection.tsx` (modified):**
   - Added `locale` prop, normalized via `getCopyLocale(locale)`.
   - Forwards `locale` to `queryWingsGoTourCatalog` and passes `locale={copyLocale}` to `<WingsGoTourCatalogClient />`.
5. **`app/src/app/(frontend)/cmsPage.tsx` (modified):**
   - Passes `locale={getCopyLocale(locale)}` to `WingsGoTourCatalogSection`, matching homepage behavior.
6. **`app/src/app/(payload)/api/wingsgo/tour-catalog/route.ts` (modified):**
   - Added explicit query param check for `?locale=`, whitelisting `en` and `vi`.
   - Falls back to `getCopyLocale(await getCurrentLocale())`.
   - Forwards `resolvedLocale` to `payload.find` (`fallbackLocale: resolvedLocale === 'en' ? false : 'vi'`) and `queryWingsGoTourCatalog({ locale: resolvedLocale })`.
7. **`app/src/tours/WingsGoTourCatalogClient.tsx` (modified):**
   - Added `locale` prop.
   - Replaced all hard-coded Vietnamese strings with `getWingsGoCatalogCopy(locale)`.
   - Updated `loadMore` to append `params.set('locale', copyLocale)`.
   - Forwards `locale={copyLocale}` to `CatalogGrid` and `WingsGoTourCard`.

### Guard & Unit/Component Tests
8. **`app/tests/unit/businessCalendar.unit.spec.ts` (new):**
   - 13 unit tests: `…T00:00:00.000Z`, `…T12:00:00.000Z`, `…T17:00:00.000Z` (previous UTC day → next VN day), boundary 16:59:59Z vs 17:00:00Z, month/year rollover (31 Dec → 1 Jan, 31 Mar → 1 Apr), invalid input, and `daysUntilBusinessDay`.
9. **`app/tests/unit/cmsPageRouteGuard.unit.spec.ts` (new):**
   - Guard test asserting `app/src/app/(frontend)/[...slug]/page.tsx` exports `dynamic = 'force-dynamic'`.
10. **`app/tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts` (modified):**
    - 6 unit tests asserting:
      - 400 rejection on limit > 6 with `Cache-Control: no-store`.
      - 200 safe empty DTO on disabled wrapper with `Cache-Control: no-store`.
      - 200 safe empty DTO on non-`wings-go` site with `Cache-Control: no-store`.
      - 200 success with `Cache-Control: no-store` and locale forwarding to query.
      - Explicit `?locale=en` forwarding to page find and catalog query with `Cache-Control: no-store`.
      - 500 error on query throw with `Cache-Control: no-store`.
11. **`app/tests/unit/wingsGoCatalog.unit.spec.ts` (modified):**
    - Added test asserting that `locale: 'en'` yields `card.price.label = 'Contact us for latest pricing'`.
12. **`app/tests/component/wingsGoTourCatalog.component.spec.tsx` (modified):**
    - Added component tests proving that when `locale="en"`, all section kickers, headings, filter controls, select options, button labels, and card labels render in English.
    - Verified all existing Vietnamese component tests pass unchanged.

### Documentation & Audit
13. **`docs/stories/epics/E07-tour-product-platform/US-092-wingsgo-tour-catalog-v2/phase0-date-audit.md` (new):**
    - Full record of read-only SQLite date audit and production-ready PostgreSQL query.
14. **`docs/stories/epics/E07-tour-product-platform/US-092-wingsgo-tour-catalog-v2/phase0-report.md` (this file):**
    - Completion report for Phase 0.

---

## 3. Decisions Taken

- **Locale Query Param in Catalog API:** Because client fetch requests to `/api/wingsgo/tour-catalog` have an `/api/...` pathname prefix, the Edge proxy cannot derive locale from the URL pathname. The API route therefore checks `url.searchParams.get('locale')` with a strict whitelist (`'vi' | 'en'`), falling back to `getCopyLocale(await getCurrentLocale())`.
- **Preserved DTO Field `price.label`:** Backwards compatibility is preserved; only the localized text changes based on locale.
- **Deterministic Business Calendar:** Implemented using `Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', ... })` and `formatToParts`, ensuring reliable string parsing across any host environment without third-party dependencies.
- **Isolation of Catch-All Route Guard Test:** Mocked `@/app/(frontend)/cmsPage` in `cmsPageRouteGuard.unit.spec.ts` to assert `export const dynamic = 'force-dynamic'` without triggering full Payload/Next bundling in jsdom.
- **Preserved Detail-Page Code:** In accordance with the Phase 0 brief, `groupDeparturesByMonth` in `app/src/tours/utils.ts` and detail-page code were left untouched pending orchestrator approval of production date audit.

---

## 4. Test Commands & Verification Results

All verification was executed from `E:\repo\WingsTravel-us092\app`:

| Test Suite / Command | Scope | Pass | Fail | Notes |
|---|---|---|---|---|
| `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/businessCalendar.unit.spec.ts tests/unit/cmsPageRouteGuard.unit.spec.ts tests/unit/wingsGoCatalog.unit.spec.ts tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts` | Targeted Unit Specs | **44** | **0** | All 4 files passed (13 calendar + 1 guard + 24 catalog + 6 endpoint). |
| `pnpm exec vitest run --config ./vitest.component.config.mts tests/component/wingsGoTourCatalog.component.spec.tsx` | Targeted Component Specs | **6** | **0** | All 6 tests passed (VI + EN catalog render & pagination). |
| `pnpm run test:component` | Full Component Suite | **373** (56 files) | **0** | 100% pass across all 56 component test files. |
| `pnpm run test:unit` | Full Unit Suite | **1,285** (160 files) | **1** | 160 files passed. 1 pre-existing failure in unrelated `wingsGroupV3Shell.unit.spec.ts:42` (asserts old footer code `!isWingsGroup ? <ThemeSelector`). |
| `pnpm exec eslint <changed_files>` | ESLint Changed Files | **12 files** | **0** | Exit code 0, clean output with zero warnings or errors. |
| `pnpm exec tsc --noEmit` | TypeScript Typecheck | All changed files clean | **2 pre-existing** | Zero errors in changed files. 2 pre-existing errors in unrelated `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts:116,155`. |

---

## 5. Local Date-Audit Numbers

Executed against `app/payload-tourplatform.db` (local SQLite):
- **Total `tour_departures` rows:** 164
- **Discrepancies (VN day ≠ UTC day):** **0 (0.0%)**
- **Time-of-day distribution:**
  - `00:00:00Z`: 164 (100.0%)
  - `12:00:00Z`: 0 (0.0%)
  - `17:00:00Z`: 0 (0.0%)
  - Other: 0 (0.0%)
- **By Site:**
  - `wings-go` (Site 1): 39 rows (all 00:00:00Z, 0 discrepancies)
  - `wing-side` (Site 3): 125 rows (all 00:00:00Z, 0 discrepancies)
  - Other sites: 0 rows

The production-ready read-only PostgreSQL query has been documented in `phase0-date-audit.md`.

---

## 6. Open Questions / Next Steps for Orchestrator

1. **Production Date Audit:** Request approval to execute the documented PostgreSQL read-only query against production/staging.
2. **Detail Page Decision (Phase 1):** If production confirms 0 discrepancies (100% at 00:00:00Z), `groupDeparturesByMonth` in `app/src/tours/utils.ts` can be safely migrated to `toBusinessCalendarDay` with zero output change (backed by a WingSide regression snapshot). If discrepancies exist, create a separate story as planned.
