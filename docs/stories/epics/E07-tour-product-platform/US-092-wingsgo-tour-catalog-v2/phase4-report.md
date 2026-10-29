# US-092 Phase 4 Report — "Sắp cất cánh" Strip, Market Tiles & Integration Verification

- **Story:** US-092 WingsGo Tour Catalog v2
- **Epic:** E07 Tour Product Platform
- **Phase:** Phase 4 ("Sắp cất cánh" Strip and Market Tiles)
- **Date:** 2026-10-29
- **Branch:** `feat/us-092-tour-catalog-v2`
- **Baseline Commit:** `667a529` (`docs(us-092): D10 scope the no-duplicate rule and the upcoming strip`)

---

## 1. Executive Summary

Phase 4 delivers the "Sắp cất cánh" (imminent departures) strip, the market destination tiles, and integration-style tests for the four-tier curation resolver, snapshot non-duplication across sections, and multi-tenant isolation.

1. **DTO: Applied D10 to `upcoming` (`wingsGoCatalog.ts`):**
   - Per Decision D10, "Sắp cất cánh" is a navigation shortcut rather than a filtered search result.
   - Capped at up to 6 cards sorted by `next-departure` from the unfiltered snapshot.
   - **Exclusion rule:** Excludes all 6 `featured` IDs (Hero slots #1–#3 and "Tour nổi bật" slots #4–#6).
   - **Filter deactivation:** Evaluates to `[]` whenever `filtersActive` is true (strip is completely hidden when filters are active).
   - Filters out any cards lacking a real departure date (`card.nextDeparture && card.nextDeparture.date`).
   - Cards in `upcoming` can appear in "Tất cả tour" (intentional duplicate per D10, as upcoming is a separate quick-access strip).

2. **"Sắp cất cánh" Strip Component (`WingsGoUpcomingStrip.tsx`):**
   - Server component rendered by `WingsGoTourCatalogSection.tsx` between `<WingsGoCommerceHero>` and `<WingsGoTourCatalogClient>` using the same server-rendered `initial` snapshot.
   - Returns `null` when `cards` is empty or null (no heading, no wrapper element rendered).
   - Card information: tour title, formatted departure date (Vietnamese calendar convention), departure city and airline when present, "Giá từ" via `PromotionPrice` (verified) or localized contact label, and `daysUntilDeparture` badge text ("Khởi hành hôm nay" / "Departs today" for 0 days; "Khởi hành sau N ngày" / "Departs in N days" for N > 0).
   - Responsive layout: mobile horizontal scroll strip with snap-alignment (`overflow-x-auto snap-x snap-mandatory`, no horizontal page overflow at 390px), responsive grid on desktop (`md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`).
   - Direct keyboard focusable links to `card.href` (with `/en` prefix in English), visible brand focus rings, ≥44px touch targets, and `motion-reduce:transition-none`.

3. **Market Tiles Component (`WingsGoMarketTiles.tsx`):**
   - Interactive destination hub rendering `initial.markets` computed from the unfiltered catalog snapshot.
   - Localized destination labels from `WINGSGO_MARKET_LABELS`, tour count with singular/plural support in English (`1 tour` / `12 tours`, `12 tour` in Vietnamese), and lowest price "Giá từ …" via `PromotionPrice` (or contact price label).
   - Background image support when non-null; static brand gradient tile with SVG icon fallback when `image` is null (no broken images, zero binary assets added).
   - Accessible interactive buttons: `aria-pressed="true"` for the currently selected market, `aria-pressed="false"` otherwise.
   - **URL helper semantics:** Clicking a tile sets `?market=<code>` while preserving other active filters (e.g. `season=autumn`), removes `offset` and `cursor`, calls `router.replace(targetUrl, { scroll: false })` in `startTransition`, and scrolls smoothly to `#wingsgo-all-tours` via `window.scrollTo` (or `behavior: 'auto'` if `prefers-reduced-motion` is active). `Element.prototype.scrollIntoView` is never called.
   - Clicking an already selected tile toggles off the filter, removing `market` from the query string.

4. **Placement Decision for Market Tiles:**
   - Placed inside `WingsGoTourCatalogClient.tsx` immediately preceding the "Tour nổi bật" (Featured tours) section.
   - **Rationale:** Market tiles serve as high-level destination exploration shortcuts. Placing them above the featured section allows users arriving on `/tour` to immediately discover tours by region before diving into individual featured cards or the filtered catalog grid. Because they are computed from the unfiltered snapshot, they remain permanently visible both with and without filters, providing persistent destination jumping capabilities.

5. **Integration-Style Verification:**
   - **Four-tier curation resolver:** Verified that Hero `/tour` properly follows each tier:
     - Tier 1: Page-bound curation (`curation` ID on page) delivers curated cards.
     - Tier 2: Site default curation (`isDefault: true` on `tour-curations` for site) delivers site default cards when page curation is absent.
     - Tier 3: Legacy `featuredTours` array on page delivers legacy cards when curations are absent.
     - Tier 4: Algorithmic fallback selects earliest departures when no curation exists.
   - **One snapshot, no duplicates:** Verified mutual disjointness across `hero` (slots #1–#3), `featured.slice(hero.length)` (slots #4–#6), `all` page 1 (slots #7–#12), and `all` page 2 via cursor (slots #13–#14). Verified that `upcoming` contains none of the `featured` IDs (#1–#6) and collapses to `[]` under active filters.
   - **Strict tenant isolation:** Verified that WingsGo catalog queries never leak products, departures, or market aggregates from WingSide (`site: 8`) or WingsGroup (`site: 9`).
   - **Tenant endpoint responses:** Verified that `/api/wingsgo/tour-catalog` returns empty DTO (`hero: []`, `upcoming: []`, `markets: []`) with `Cache-Control: no-store` for both `wing-side` and `wings-group`.

---

## 2. Changes Summary

| File | Change |
|---|---|
| `app/src/tours/wingsGoCatalogCopy.ts` | Added copy entries for upcoming strip and market tiles in VI and EN: `upcomingKicker`, `upcomingTitle`, `upcomingDescription`, `marketTilesKicker`, `marketTilesTitle`, `marketTilesDescription`, `marketToursCount` (singular/plural in EN), `marketAllLabel`, `marketLowestPriceFrom`. |
| `app/src/tours/wingsGoCatalog.ts` | Updated `upcoming` derivation to implement D10: excludes all `featured` IDs (`hero` + `featured`), returns `[]` when `filtersActive` is true, requires non-null departure date, sorted by `next-departure`, capped at 6. |
| `app/src/tours/WingsGoUpcomingStrip.tsx` | New server component rendering upcoming departure cards horizontally on mobile and in grid on desktop. Returns `null` when cards array is empty. Formats dates, airline, departure city, days until departure badge, and verified pricing. |
| `app/src/tours/WingsGoMarketTiles.tsx` | New client component rendering destination market tiles. Displays localized market labels, tour counts, lowest prices, and images/fallbacks. URL update preserves active filters, clears pagination, and smooth scrolls to `#wingsgo-all-tours` without `scrollIntoView`. |
| `app/src/tours/WingsGoTourCatalogSection.tsx` | Rendered `<WingsGoUpcomingStrip cards={initial.upcoming} locale={copyLocale} />` between `<WingsGoCommerceHero>` and `<WingsGoTourCatalogClient>`. |
| `app/src/tours/WingsGoTourCatalogClient.tsx` | Rendered `<WingsGoMarketTiles>` immediately before "Tour nổi bật", ensuring visibility with and without filters. |
| `app/tests/component/wingsGoUpcomingStrip.component.spec.tsx` | Component tests: hidden when empty, renders VI copy and badges (today, in N days), renders EN copy with zero Vietnamese characters, mobile scroll and desktop grid layout classes, focus rings. |
| `app/tests/component/wingsGoMarketTiles.component.spec.tsx` | Component tests: hidden when empty, renders VI and EN labels/counts, image and SVG gradient fallbacks, URL building preserving other filters, smooth scroll without `scrollIntoView`, active tile toggle off, reduced motion support. |
| `app/tests/component/wingsGoTourCatalogSection.component.spec.tsx` | Updated SSR tests to assert all 3 section children (`Hero`, `UpcomingStrip`, `CatalogClient`) and verify `upcoming` is delivered in unfiltered SSR and empty under filters. |
| `app/tests/component/wingsGoTourCatalog.component.spec.tsx` | Updated price label count assertion to account for market tiles "From" labels in EN test. |
| `app/tests/unit/wingsGoCatalog.unit.spec.ts` | Updated D10 unit tests for upcoming strip. Added Phase 4 integration tests: four-tier curation resolver feeding Hero `/tour`, snapshot non-duplication across hero/featured/all/upcoming, and strict tenant isolation. |
| `app/tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts` | Verified empty DTO response (`hero: []`, `upcoming: []`, `markets: []`) for `wing-side` and `wings-group`. |

---

## 3. Test Evidence

### Component Test Suite (`pnpm run test:component`)
```
Test Files  63 passed (63)
     Tests  418 passed (418)
  Duration  19.02s
```

All 63 component test files passed with 100% success rate (including `wingsGoUpcomingStrip.component.spec.tsx`, `wingsGoMarketTiles.component.spec.tsx`, `wingsGoTourCatalogSection.component.spec.tsx`, and `wingsGoTourCatalog.component.spec.tsx`).

### Unit Test Suite (`pnpm run test:unit`)
```
Test Files  1 failed | 163 passed (164)
     Tests  1 failed | 1368 passed (1369)
  Duration  91.38s
```
- **Known pre-existing failure (unrelated to WingsGo):** `tests/unit/wingsGroupV3Shell.unit.spec.ts:42` (expects `'!isWingsGroup ? <ThemeSelector'`, actual code has `'!isWingsGroup && !isWingsGo ? <ThemeSelector'`).
- All 58 tests in `wingsGoCatalog.unit.spec.ts` passed.
- All 17 tests in `wingsGoTourCatalogEndpoint.unit.spec.ts` passed.

### TypeScript Check (`pnpm exec tsc --noEmit`)
```
tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(116,21): error TS2353: Object literal may only specify known properties, and 'type' does not exist in type '{ richText?: unknown; }'.
tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(155,9): error TS2322: Type '"lo"' is not assignable to type '"vi" | "en" | "it" | "es" | "pt" | "ja" | "ko" | "fr" | "de" | null | undefined'.
```
- Zero errors across all WingsGo and Phase 4 files.
- Only the 2 pre-existing errors in `wingsGroupCorporateRoutes.unit.spec.ts` (documented in brief).

### Linter Check (`eslint`)
- Ran `eslint` on all changed files: 0 errors.

### Git Diff Check
- `git diff --check 8980e23..HEAD`: Clean (0 whitespace/formatting errors).

---

## 4. Open Questions & Next Steps

1. **Market Imagery:**
   - Currently, if no tour product in a market has an image, `WingsGoMarketTiles` renders the branded SVG gradient tile fallback. In a future content authoring update, editors may wish to define designated cover images directly on market taxonomy records in Payload CMS.
2. **Next Phase:**
   - Phase 4 completes the functional implementation of the WingsGo Tour Catalog v2. Pre-deployment audit and Codex release consultation gate can proceed.
