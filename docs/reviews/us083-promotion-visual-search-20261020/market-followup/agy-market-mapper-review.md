# Release Review: Market Commercial Departure Selection Alignment

- **Target Module:** `app/src/tours/queries.ts` (`getToursByMarketRoute` lines 498-585)
- **Unit Test File:** `app/tests/unit/marketCommercialDeparture.unit.spec.ts`
- **Reviewer:** Antigravity (Market Mapper Scope Owner)
- **Status:** READY FOR ROOT PRODUCTION BUILD (FROZEN SOURCE)

---

## 1. Summary of Changes in Production Source

### 1.1 `app/src/tours/queries.ts` (Frozen)
Implemented `selectMarketNextDeparture` helper matching the exact contract:

```typescript
export const selectMarketNextDeparture = (
  linkedFuture: DepartureCardViewModel[],
  linkedVisible: DepartureCardViewModel[],
): DepartureCardViewModel | null => {
  const preferredCommercialDeparture = linkedFuture.find(
    (departure) =>
      departure.commerceVerified === true &&
      departure.availabilityStatus !== 'sold-out' &&
      Boolean(
        normalizeGovernedTourPrice({
          currency: departure.currency,
          value: departure.priceFrom,
        }),
      ),
  )

  return preferredCommercialDeparture || getNextDeparture(linkedVisible)
}
```

In `getToursByMarketRoute`:
```typescript
      return {
        ...tour,
        departureCount: linkedVisible.length,
        hasFutureDepartures,
        lowestPrice: getLowestPrice(linkedVisible),
        nextDeparture: selectMarketNextDeparture(linkedFuture, linkedVisible),
      }
```

### 1.2 Behavior Guarantees & Contract Adherence
1. **Commercial Priority:** Prefers the earliest sorted future departure that is `commerceVerified === true`, `availabilityStatus !== 'sold-out'`, and has a valid `normalizeGovernedTourPrice`.
2. **Unsupported Currency Exclusion (JPY):** Because `supportedTourCurrencyCodes` are `['VND', 'USD']`, `normalizeGovernedTourPrice` returns `null` for `JPY`. Thus, any unverified or unsupported currency departure (e.g., JPY) is automatically bypassed in favor of a valid commercial VND departure.
3. **Sold-Out Departure Skipping:** Even if an earlier departure is `commerceVerified === true`, having `availabilityStatus === 'sold-out'` causes the selector to bypass it and choose the next available commercial departure.
4. **Fallback:** If no departure satisfies commercial verification, falls back safely to `getNextDeparture(linkedVisible)`.
5. **Identity Preservation:** Entire `nextDeparture` DTO originates from a single departure record. It **never mixes** `originalPrice` or `promoLabel` across different departures.
6. **Legacy Compatibility:** `lowestPrice: getLowestPrice(linkedVisible)`, `departureCount`, and `hasFutureDepartures` remain unchanged.

---

## 2. Test & Verification Results

### 2.1 Dedicated Unit Test (`marketCommercialDeparture.unit.spec.ts`)
- **Command:** `pnpm --dir app exec vitest run --config vitest.unit.config.mts tests/unit/marketCommercialDeparture.unit.spec.ts`
- **Result:** **7/7 passed** (4ms).
  - [x] Prefers first verified departure with valid governed price over an earlier unverified departure.
  - [x] **Regression (JPY):** Skips departures with unsupported currency like JPY and selects the valid VND departure.
  - [x] **Regression (Sold-Out):** Skips sold-out departures even if verified and selects the next available commercial departure.
  - [x] Preserves single departure identity and never mixes `originalPrice` or `promoLabel` across departures.
  - [x] Falls back to `getNextDeparture(linkedVisible)` when no future departure has verified governed price.
  - [x] Falls back cleanly when `linkedFuture` is empty (all past departures).
  - [x] Returns `null` when `linkedVisible` is empty.

### 2.2 TypeScript Typecheck
- **Command:** `pnpm --dir app exec tsc --noEmit`
- **Result:** **Exit code 0** (clean, 0 type errors).

### 2.3 Search Unit Test Regression Check
- **Command:** `pnpm --dir app exec vitest run --config vitest.unit.config.mts tests/unit/tourDeparturesSearch.unit.spec.ts`
- **Result:** **3/3 passed** (3ms).

---

## 3. Scope & Deployment Safety

- No database migrations or schema additions required.
- Source code in `app/src/tours/queries.ts` is completely frozen (no edits during or after Root build start).
- Root can safely proceed with candidate build and deployment.
