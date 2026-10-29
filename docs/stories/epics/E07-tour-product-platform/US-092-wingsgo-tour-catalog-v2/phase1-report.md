# US-092 Phase 1 — Execution Report

## 1. Summary

Phase 1 of US-092 (WingsGo Tour Catalog v2 — Snapshot & Filter Contract / Data Layer) has been executed strictly within `E:\repo\WingsTravel-us092` on branch `feat/us-092-tour-catalog-v2`. All requirements defined in the orchestrator brief have been implemented and thoroughly verified. No remote, staging, or production systems were accessed; no migrations or schema changes were performed; `validation.md` was not edited; and no code was pushed.

---

## 2. Files Changed & Added

### Core Implementation
1. **`app/src/tours/businessCalendar.ts` (modified):**
   - Added `BusinessSeason = 'spring' | 'summer' | 'autumn' | 'winter'` and constant `BUSINESS_SEASONS`.
   - Added `isBusinessSeason(value): value is BusinessSeason` type guard.
   - Added `seasonOfBusinessMonth(value): BusinessSeason | null` mapping Vietnam calendar months (Spring: 3–5, Summer: 6–8, Autumn: 9–11, Winter: 12, 1, 2). Accepts number (1–12), `YYYY-MM` string, ISO string, or Date object.
2. **`app/src/tours/wingsGoCatalog.ts` (modified):**
   - Added `departureMonth?: string` and `season?: BusinessSeason` to `WingsGoCatalogFilters`.
   - Added `daysUntilDeparture?: number | null` to `WingsGoCatalogCard['nextDeparture']`.
   - Added `filtersActive: boolean`, `markets: WingsGoCatalogMarketSummary[]`, and `upcoming: WingsGoCatalogCard[]` to `WingsGoCatalogData`.
   - Added `hasActiveCatalogFilters(filters)` (`sort` alone is not considered an active filter).
   - Added `fnv1a32(input: string): number` pure 32-bit hash utility.
   - Hardened `parseWingsGoCatalogFilters(source, now = new Date())`:
     - Whitelisted `market` against TourProducts values (`korea, japan, china, vietnam, thailand, cambodia, laos, myanmar, indochina, other`). Unknown market is dropped.
     - Whitelisted `season` against canonical 4 seasons.
     - Validated `departureMonth`: strictly matches `YYYY-MM` and lies between the current VN month (`businessCalendarMonth(now)`) and current month + 24 inclusive; otherwise dropped.
   - Updated `buildCard`:
     - Added optional `window?: { departureMonth?: string; season?: BusinessSeason }`.
     - Departure matching evaluates published status, tour product association, site match, future timestamp relative to `now`, and the intersection (AND) of `departureMonth` and `season`.
     - Identifies nearest matching departure for `nextDeparture` and lowest price from verified matching departures; returns `null` if no departures match the window.
     - Computes `daysUntilDeparture: daysUntilBusinessDay(nearestDeparture.departureDate, now)`.
   - Updated `queryWingsGoTourCatalog`:
     - Enforces single inventory read and consistent `now` per request.
     - Builds `unfilteredCards` (no window) and `windowCards` (window applied).
     - Derives `featured` strictly from `unfilteredCards` (curated slots #1–#6, fallback fill unchanged).
     - Derives `all`: if `filtersActive` is true, does not exclude `featuredIDs`; if false, excludes `featuredIDs` (US-091 behavior).
     - Aggregates `markets`: counts from `unfilteredCards`, lowest verified price per market, and deterministic image pick using FNV-1a hash of `${site.id}|${market}|${toBusinessCalendarDay(now)}`, preferring cards outside featured slot #1.
     - Derives `upcoming`: first 6 cards of `unfilteredCards` sorted by `next-departure`.
     - Logs `console.warn` once per call when docs count reaches `WINGSGO_CATALOG_MAX_INVENTORY` (without PII).
     - Multisite isolation defense-in-depth: enforces `sameID(item.site, site.id)` in-memory for wrappers, products, and departures.
   - Hardened `resolveCuratedTourIDs` (Tier 1):
     - Both populated-object and `findByID` branches strictly require curation site to be present AND match `siteID`.
3. **`app/src/app/(payload)/api/wingsgo/tour-catalog/route.ts` (modified):**
   - Updated `emptyCatalog` DTO to include `filtersActive: false, markets: [], upcoming: []`.
   - Instantiated a consistent `const now = new Date()` passed to both `parseWingsGoCatalogFilters` and `queryWingsGoTourCatalog`.
4. **`app/src/tours/WingsGoTourCatalogSection.tsx` (modified):**
   - Passed consistent `now` to both `parseWingsGoCatalogFilters` and `queryWingsGoTourCatalog`.
5. **`app/src/tours/WingsGoTourCatalogClient.tsx` (modified):**
   - Added `'departureMonth'` and `'season'` to the parameters forwarded by `loadMore`.
   - Conditionally hides `<section aria-labelledby="wingsgo-featured-tours">` when `initial.filtersActive` is true.

### Test Suites
6. **`app/tests/unit/businessCalendar.unit.spec.ts` (modified):**
   - 4 new unit tests verifying `isBusinessSeason` and `seasonOfBusinessMonth` across numbers, strings, and cross-year winter months (17 tests total).
7. **`app/tests/unit/wingsGoTourCuration.unit.spec.ts` (modified):**
   - Updated Tier 1 mock to specify `site: 1`.
   - Added 3 new tests asserting fallthrough to Tier 2 when:
     - Populated curation object lacks `site`.
     - Populated curation object has different `site`.
     - Curation document from `findByID` lacks `site`.
8. **`app/tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts` (modified):**
   - Updated empty response assertions to match new DTO shape.
   - Added test verifying forwarding of `departureMonth` and `season` query params, presence of Phase 1 DTO fields (`filtersActive`, `markets`, `upcoming`), and retention of `Cache-Control: no-store` (7 tests total).
9. **`app/tests/unit/wingsGoCatalog.unit.spec.ts` (modified):**
   - Added comprehensive Phase 1 test suite (41 tests total):
     - Parser tests: `departureMonth` bounds [0, 24], past month drop, future +25 drop, malformed strings, canonical seasons, unknown seasons, market whitelist, and `sort` alone not active.
     - Window tests: month only, season only, month AND season intersection, cross-year winter (Dec, Jan, Feb), nearest + lowest price inside window, sold-out/expired fallbacks, product omitted on empty window, budget filters comparing against windowed price.
     - Snapshot tests: `daysUntilDeparture` computed relative to same `now` across day boundary, featured unaffected by filters, `all` includes featured only when filters are active, market summaries with deterministic image selection, upcoming ordering, inventory-cap warning without PII, cross-site isolation.
     - Homepage regression test: verified `getWingsGoFeaturedTours` returns expected cards for homepage HighImpact consumption.
10. **`app/tests/component/wingsGoTourCatalog.component.spec.tsx` (modified):**
    - Updated mock DTO factory with Phase 1 fields.
    - Added component test verifying featured tours section is omitted from the DOM when `filtersActive` is true (7 tests total).

---

## 3. Decisions Taken

- **Window Filtering Intersection (AND):** Both `departureMonth` and `season` must match for a departure to be included in the card's active window. When a product has no departures satisfying the intersection, the product is omitted from catalog cards rather than displaying invalid departure info.
- **Independence of Featured Rail & Homepage:** The `featured` rail is strictly derived from `unfilteredCards` and remains unaffected by active search/filter state. This guarantees that `getWingsGoFeaturedTours` continues returning identical results for the homepage HighImpact component.
- **Deterministic Market Images via FNV-1a:** To satisfy the requirement for deterministic image selection without `Math.random()`, a 32-bit FNV-1a pure hash is computed over `${site.id}|${market}|${toBusinessCalendarDay(now)}`. If multiple eligible cards with images exist, the function prioritizes cards other than featured slot #1.
- **Multisite Isolation Defense-in-Depth:** In addition to Payload `where` clauses filtering by `site.id`, `queryWingsGoTourCatalog` applies in-memory `sameID(item.site, site.id)` filtering across wrappers, products, and departures, eliminating any possibility of cross-tenant leakage.
- **Additive DTO Changes:** Added `daysUntilDeparture?: number | null` to `WingsGoCatalogCard['nextDeparture']`, and `filtersActive`, `markets`, and `upcoming` to `WingsGoCatalogData`. The optional typing for `daysUntilDeparture` ensures full backwards compatibility with external test fixtures and legacy card builders.

---

## 4. DTO Additions

### `WingsGoCatalogFilters`
```ts
export type WingsGoCatalogFilters = {
  departureMonth?: string // Format 'YYYY-MM', validated within [now, now + 24 months]
  durationMax?: number
  durationMin?: number
  market?: string         // Whitelisted TourProducts market value
  priceMax?: number
  priceMin?: number
  season?: BusinessSeason // 'spring' | 'summer' | 'autumn' | 'winter'
  sort?: WingsGoCatalogSort
}
```

### `WingsGoCatalogCard['nextDeparture']`
```ts
daysUntilDeparture?: number | null // Difference in business calendar days in Asia/Ho_Chi_Minh
```

### `WingsGoCatalogData`
```ts
export type WingsGoCatalogMarketSummary = {
  count: number
  image: { alt: string; url: string } | null
  lowestPrice:
    | { currency: string; kind: 'verified'; originalPrice?: number | null; value: number }
    | null
  market: string
}

export type WingsGoCatalogData = {
  all: WingsGoCatalogCard[]
  featured: WingsGoCatalogCard[]
  filtersActive: boolean
  hasMore: boolean
  markets: WingsGoCatalogMarketSummary[]
  nextOffset: number
  upcoming: WingsGoCatalogCard[]
}
```

---

## 5. Test Results & Verification

All verification commands were executed in `E:\repo\WingsTravel-us092\app`:

| Test Suite / Command | Scope | Pass | Fail | Notes |
|---|---|---|---|---|
| `vitest run --config ./vitest.unit.config.mts tests/unit/wingsGoCatalog.unit.spec.ts tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts tests/unit/wingsGoTourCuration.unit.spec.ts tests/unit/businessCalendar.unit.spec.ts` | Targeted Unit Specs | **91** (4 files) | **0** | 17 calendar + 41 catalog + 7 endpoint + 26 curation tests. |
| `vitest run --config ./vitest.component.config.mts tests/component/wingsGoTourCatalog.component.spec.tsx` | Targeted Component Specs | **7** (1 file) | **0** | Featured section hiding when `filtersActive: true` + pagination + retry. |
| `pnpm run test:component` | Full Component Suite | **374** (56 files) | **0** | 100% pass across all 56 component test files. |
| `pnpm run test:unit` | Full Unit Suite | **1,313** (161 files) | **1** | 161 files passed. 1 pre-existing failure in unrelated `wingsGroupV3Shell.unit.spec.ts:42` (asserts old footer code `!isWingsGroup ? <ThemeSelector`). |
| `pnpm exec eslint <changed_files>` | ESLint Changed Files | **10 files** | **0** | Exit code 0, 0 errors. |
| `pnpm exec tsc --noEmit` | TypeScript Typecheck | All changed files clean | **2 pre-existing** | Zero errors in changed files. 2 pre-existing errors in unrelated `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts:116,155`. |

---

## 6. Open Questions / Next Phase Notes

- **Phase 2 Ready:** The data layer and filter contract are fully in place. Phase 2 will introduce the SSR filter parsing in the page route, synchronize query params with URL state, and wire the quick-filter pills (markets and departure windows).
