# US-092 Phase 3 Report — Catalog Chips, Card v2, Empty State & Filtered URL SEO

- **Story:** US-092 WingsGo Tour Catalog v2
- **Epic:** E07 Tour Product Platform
- **Phase:** Phase 3 (Catalog Chips, Card v2, Empty State & Filtered-URL SEO)
- **Date:** 2026-10-29
- **Branch:** `feat/us-092-tour-catalog-v2`
- **Baseline Commit:** `74e2a88`
- **Snapshot Commit:** `65f4aaf` (`test(wingsgo): US-092 phase 3 card regression snapshot`)

---

## 1. Executive Summary

Phase 3 delivers the catalog filter chips, card v2 (wide and grid layouts with departure timing and badges), the explanatory empty state with recovery actions, and search engine optimization (noindex, follow on filtered query URLs while retaining clean canonicals).

1. **Card v2 (`WingsGoTourCard.tsx`):**
   - Added `layout?: 'grid' | 'wide'` prop (default `'grid'`).
   - Pre-refactor regression snapshot test was committed first in commit `65f4aaf`. Post-refactor regression test verifies that default grid layout output remains 100% byte-identical.
   - Info row displays departure date, departure city, airline, and `daysUntilDeparture` badge text ("Khởi hành sau N ngày" / "Departs in N days"; 0 ⇒ "Khởi hành hôm nay" / "Departs today") when `daysUntilDeparture` is non-null. When null, output matches legacy string.
   - `wide` layout: horizontal side-by-side (`md:flex-row`, image `md:w-2/5 shrink-0`, content `flex-1 md:p-6 flex flex-col justify-between`) from `md` up, and stacked vertically on 390px mobile screens.
   - "Tour nổi bật" (slots #4–#6) renders in `layout="wide"`. "Tất cả tour" renders in `layout="grid"`.
   - Badges (US-084): single `hot-rainbow-card` pseudo-element (no duplicate rainbow border on wide card), `sr-only` hot label, `specialized` / `vip` corner stickers positioned top-left, `PromotionBadge` positioned top-right. Zero empty badge wrappers when no badges exist.
   - Direct navigation to `card.href` without quick-view modal triggers. Supports locale-aware `/en` prefix.

2. **Filter Chips & Interactive Controls (`WingsGoTourCatalogClient.tsx`):**
   - Replaced market `<select>` with `<button type="button" aria-pressed>` chips for all `WINGSGO_CATALOG_MARKETS` having `count > 0` in `initial.markets`, plus the currently active market, plus "Tất cả" / "All" chip.
   - Added season chips (all, spring, summer, autumn, winter) with accessible toggle state.
   - Added departure month `<select>` showing the next 12 VN business months (`getNextBusinessMonths` moved to plain module `app/src/tours/businessCalendar.ts` to prevent client-reference proxy issues across server/client boundaries).
   - Replaced sort `<select>` with a segmented button group (`role="group" aria-label={copy.filterSort}`).
   - Duration and price numeric inputs use local component state committed on `onBlur` or `Enter` keydown.
   - Added active-filter row with removable chips for each active filter (`market`, `departureMonth`, `season`, `duration`, `price`; `sort` omitted) with accessible remove labels and a "Xóa tất cả bộ lọc" / "Clear all filters" button.
   - Unified URL commit helper with `pendingParamsRef`: handles rapid sequential chip clicks safely so both filters are removed in the final target URL without reading stale `window.location.search`. Deletes `offset` and `cursor`.

3. **Empty State & Recovery Actions (Design Line 8):**
   - When `cards.length === 0` with active filters: displays `copy.emptyFiltered`.
   - When a price filter is active (`priceMin !== undefined || priceMax !== undefined`), additionally renders explanatory text: "Các tour có giá \"Liên hệ\" không tham gia vào bộ lọc ngân sách." (`copy.emptyBudgetExplanation`).
   - Recovery buttons: "Xóa bộ lọc" / "Clear filters" button, and if a price filter is active, "Bỏ lọc ngân sách" / "Remove budget filter" button (clears `priceMin` and `priceMax`).

4. **SEO for Filtered URLs (D9):**
   - Passed `searchParams` from `[...slug]/page.tsx` `generateMetadata` into `generateCmsPageMetadataByPath`.
   - For site `wings-go`, path `/tour` (including `/en/tour`), if ANY catalog query parameter is present (`market`, `departureMonth`, `season`, `durationMin`, `durationMax`, `priceMin`, `priceMax`, `sort`, `cursor`, `offset`), sets `robots: { index: false, follow: true }`. Canonical remains the clean `/tour` or `/en/tour` (without query string).
   - Unfiltered `/tour` remains indexable. Other sites (e.g. WingSide `/tour?market=korea`) and other paths (e.g. `/about`) remain untouched.

---

## 2. Changes Summary

| File | Change |
|---|---|
| `app/src/tours/wingsGoCatalogCopy.ts` | Added copy entries for active filters, clear buttons, empty budget note, and localized remove aria-labels in VI and EN. |
| `app/src/tours/businessCalendar.ts` | Moved `getNextBusinessMonths` and `BusinessMonthOption` to plain business calendar module for clean cross-boundary imports. |
| `app/src/heros/WingsGoCommerceHero.tsx` | Re-exported `getNextBusinessMonths` from `businessCalendar.ts` and removed unused imports. |
| `app/src/tours/WingsGoTourCard.tsx` | Added `layout?: 'grid' \| 'wide'` prop. Added `daysUntilDeparture` badge text in info row. Added wide card layout with desktop horizontal flex and mobile vertical stack. Maintained single rainbow border. |
| `app/src/tours/WingsGoTourCatalogClient.tsx` | Upgraded filters to market chips, season chips, month select, sort segmented buttons, blur/Enter numeric inputs, active filter removable chips, rapid-removal race protection via `pendingParamsRef`, wide layout for "Tour nổi bật", and explanatory empty state with recovery buttons. |
| `app/src/app/(frontend)/[...slug]/page.tsx` | Passed `searchParams` from `generateMetadata` into `generateCmsPageMetadataByPath`. |
| `app/src/app/(frontend)/cmsPage.tsx` | Exported `WINGSGO_CATALOG_FILTER_PARAMS` and `hasWingsGoCatalogFilterParams`. Added `robots: { index: false, follow: true }` when catalog params are present on WingsGo `/tour`. |
| `app/tests/component/wingsGoTourCardSnapshot.component.spec.tsx` | Pre-refactor regression snapshot test for grid card output (committed in `65f4aaf`). |
| `app/tests/component/wingsGoTourCard.component.spec.tsx` | Component tests: `daysUntilDeparture` badge (0 ⇒ today, 1 ⇒ 1 day, 3 ⇒ 3 days, null ⇒ omitted), wide layout desktop and 390px mobile stacking classes, overlapping badges (hot + vip + specialized + promo), clean markup without empty badge wrappers, and direct links without modal triggers. |
| `app/tests/component/wingsGoTourCatalog.component.spec.tsx` | Updated filter control assertions for chips. Added tests for rapid chip removal race condition, empty state with recovery buttons and budget note only when price filter active, and EN locale verification ensuring zero Vietnamese characters. |
| `app/tests/unit/wingsGoTourCatalogSeo.unit.spec.ts` | Unit tests for `hasWingsGoCatalogFilterParams` and `generateCmsPageMetadataByPath`: unfiltered `/tour` indexable, each of the 10 catalog params sets `noindex, follow`, EN clean canonical `/en/tour`, WingSide `/tour?market=korea` unaffected, non-catalog paths unaffected. |

---

## 3. Test Evidence

### 3.1 Targeted Specs
- `tests/component/wingsGoTourCardSnapshot.component.spec.tsx`: 2/2 passed (byte-identical snapshot match).
- `tests/component/wingsGoTourCard.component.spec.tsx`: 12/12 passed.
- `tests/component/wingsGoTourCatalog.component.spec.tsx`: 14/14 passed.
- `tests/unit/wingsGoTourCatalogSeo.unit.spec.ts`: 26/26 passed.
- `tests/component/wingsGoCommerceHero.component.spec.tsx`: 6/6 passed.
- `tests/component/wingsGoTourCatalogSection.component.spec.tsx`: 2/2 passed.
- `tests/unit/businessCalendar.unit.spec.ts`: 17/17 passed.
- `tests/unit/wingsGoCatalog.unit.spec.ts`: 52/52 passed.
- `tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts`: 16/16 passed.

### 3.2 Full Test Suites
- **Component Suite (`pnpm run test:component`):** 61/61 test files passed, 405/405 tests passed.
- **Unit Suite (`pnpm run test:unit`):** 163/164 test files passed, 1361/1362 tests passed.
  - The single failure is the pre-existing test in `wingsGroupV3Shell.unit.spec.ts:42` (reported below).
- **TypeScript (`pnpm exec tsc --noEmit`):** 0 errors in story code. Only the 2 pre-existing errors in `wingsGroupCorporateRoutes.unit.spec.ts`.
- **ESLint:** 0 errors, 0 warnings across all changed and created files.
- **Git Diff Check:** `git diff --check 8980e23..HEAD` clean.

---

## 4. Pre-existing Failures Reported Separately

As noted in the orchestrator brief and preserved without modification:
1. `tests/unit/wingsGroupV3Shell.unit.spec.ts:42`: Expects `'!isWingsGroup ? <ThemeSelector'`, actual code has `'!isWingsGroup && !isWingsGo ? <ThemeSelector'`.
2. `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(116, 155)`: 2 TypeScript type mismatch errors.

---

## 5. Decisions & Design Integrity

- **D1–D9 strictly respected:** No database migrations or schema modifications were made. DTO remains additive and backward compatible.
- **Client/Server boundary hygiene:** Shared helpers (`getNextBusinessMonths`, `WINGSGO_MARKET_LABELS`) reside in plain TS modules (`businessCalendar.ts`, `wingsGoCatalogCopy.ts`), avoiding client reference proxy issues.
- **Race conditions prevented:** `pendingParamsRef` tracks active updates sequentially during rapid chip removal; generation guards and `AbortController` in load-more requests prevent stale responses from landing.
- **Unstaged Payload files:** `app/src/payload-types.ts` is kept uncommitted as instructed.
