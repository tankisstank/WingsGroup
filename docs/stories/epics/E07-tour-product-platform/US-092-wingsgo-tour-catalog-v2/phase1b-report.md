# US-092 Phase 1b Report — Codex Gate Remediations & Keyset Pagination

- **Story:** US-092 WingsGo Tour Catalog v2
- **Epic:** E07 Tour Product Platform
- **Phase:** Phase 1b (Codex Consultation Gate Remediations)
- **Date:** 2026-10-29
- **Branch:** `feat/us-092-tour-catalog-v2`
- **Commit Baseline:** `8980e23`

---

## 1. Executive Summary

Following the Codex architectural review gate (`docs/consultations/2026-10-29-us092-phase1-codex-gate.md`) and the orchestrator triage table in `validation.md` (commit `b1e3f23`), Phase 1b addresses all triaged gate findings:
- **P1.1**: Keyset cursor pagination replacing offset pagination on load-more to eliminate inventory shift skips without adding server-side state or Redis dependency.
- **P2.1**: Deterministic pre-sorting of market image candidates before hash modulo.
- **P2.3**: Enforcing a single `enabled` gate across all catalog entry points while preserving the homepage high-impact featured helper.
- **P3.2**: Eliminating duplicate curation resolution calls in `getWingsGoFeaturedTours`.
- **Whitespace**: Fixing trailing whitespace in owned documentation while preserving the Codex consultation report and core specification documents untouched in compliance with explicit project governance rules.

---

## 2. Implemented Remediations

### 2.1 P1.1 — Keyset Cursor Pagination for Load-More

- **Opaque Cursor Format**:
  - `encodeCatalogCursor(card, sort)`: Serializes `{ v: 1, sort, date, price, title, id }` to base64url JSON. For contact pricing, `price` is encoded as `null`.
  - `decodeCatalogCursor(value)`: Validates format, length ($\le 512$ chars), base64url character set, schema version (`v === 1`), sort enum, and non-empty string/number fields. Returns `null` on any mismatch; never throws on malformed or tampered input.
- **Comparator-Consistent Continuation**:
  - `selectWingsGoCatalogCards` accepts `after?: CatalogCursorPayload | null`. A stub card is generated with the cursor values and evaluated using the exact same multi-key comparator:
    $$\text{compareCards}(\text{card}, \text{stub}, \text{sort}) > 0$$
  - When `after` is present and matches the active sort, cards strictly greater than the cursor are retained and bounded by `limit`. Plain `offset` is bypassed.
  - If `after.sort !== filters.sort`, the cursor is safely disregarded, resetting pagination to page 1 (`offset: 0`).
- **DTO Backwards-Compatibility**:
  - `WingsGoCatalogData` exposes `nextCursor: string | null` (cursor derived from the last item on the page when `hasMore: true`, else `null`).
  - `nextOffset` is preserved for legacy or testing compatibility.
- **Client & Endpoint Parameter Forwarding**:
  - Endpoint `/api/wingsgo/tour-catalog`: Parses `cursor` and `exclude` (comma-separated IDs, up to 6 valid entries matching `^[A-Za-z0-9_-]{1,64}$`), forwarding them to `queryWingsGoTourCatalog`. Keeps `Cache-Control: no-store`.
  - Client island `WingsGoTourCatalogClient`: Stores `nextCursor` in component state; on "Load more" (`loadMore`), supplies `cursor` and `exclude` (from `initial.featured` IDs when `!initial.filtersActive`). When filters change, `cursor` is reset to `initial.nextCursor`.
- **Residual Risk Analysis**:
  - *Documented Residual Risk*: A tour whose sort key changes (e.g. its departure date moves earlier than the cursor position) between the initial page load and a subsequent page request will not be shown on later pages. This is standard keyset pagination behavior; crucially, other tours are never skipped or duplicated.
- **Automated Regression Proof**:
  - In `app/tests/unit/wingsGoCatalog.unit.spec.ts`:
    - Scenario (a): Removing a card from page 1 causes offset pagination to skip card 7; cursor pagination correctly continues from card 6 and returns card 7.
    - Scenario (b): Curation change un-features a tour; offset pagination duplicates card 5; cursor + exclude continuation returns card 6 cleanly.
    - Scenario (c): A departure on page 1 expires; offset pagination skips card 7; cursor pagination returns card 7 and 8 without skip.

### 2.2 P2.1 — Stable Market Image Candidates

- In `selectDeterministicMarketImage`, candidate cards with images are pre-sorted by:
  1. `String(left.id).localeCompare(String(right.id), 'en')`
  2. `String(left.image.url).localeCompare(String(right.image.url), 'en')`
- This guarantees that database query retrieval order or memory reordering does not alter the index selected by `fnv1a32(siteID|market|calendarDay) % candidates.length`.
- Verified with unit tests supplying identical card collections in reversed/shuffled orders.

### 2.3 P2.3 — Single `enabled` Policy

- Enforced unified gate: `if (site.code !== 'wings-go' || page.wingsGoTourCatalog?.enabled !== true) return emptyCatalog`.
- Removed legacy bypass `(!page.wingsGoTourCatalog?.enabled && page.pathname !== '/tour')`.
- `getWingsGoFeaturedTours` continues functioning as designed for the homepage HighImpact section by explicitly setting `enabled: true` in its synthesized wrapper page.
- Verified with direct catalog queries and endpoint requests returning `emptyCatalog` when `enabled === false`.

### 2.4 P3.2 — One Curation Resolve for Homepage

- `getWingsGoFeaturedTours` previously queried `resolveCuratedTourIDs` a second time after `queryWingsGoTourCatalog` had already resolved curation.
- Refactored `getWingsGoFeaturedTours` to directly return `catalog.featured.slice(0, limit)`.
- Verified with regression test and unit spy confirming `payload.find` for `tour-curations` is invoked exactly once per call.

### 2.5 Whitespace & Document Governance

- Repaired trailing whitespace in `docs/stories/epics/E07-tour-product-platform/US-092-wingsgo-tour-catalog-v2/phase0-date-audit.md` on SQL query samples.
- Strictly respected negative governance constraints: `validation.md`, `design.md`, and `docs/consultations/2026-10-29-us092-phase1-codex-gate.md` were left completely untouched.

---

## 3. Verification & Test Evidence

### 3.1 Targeted Specifications

```bash
pnpm exec vitest run --config ./vitest.unit.config.mts \
  tests/unit/businessCalendar.unit.spec.ts \
  tests/unit/wingsGoCatalog.unit.spec.ts \
  tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts \
  tests/unit/wingsGoTourCuration.unit.spec.ts
```
**Result**: 4 passed, 0 failed, 104 tests passed.

```bash
pnpm exec vitest run --config ./vitest.component.config.mts \
  tests/component/wingsGoTourCatalog.component.spec.tsx
```
**Result**: 1 passed, 0 failed, 8 tests passed.

### 3.2 Full Test Suites

- **Full Component Suite (`pnpm run test:component`)**:
  - 56 test files passed out of 56 (375 tests passed).
  - 0 failures.
- **Full Unit Suite (`pnpm run test:unit`)**:
  - 161 test files passed out of 162 (1326 tests passed).
  - 1 pre-existing failure: `tests/unit/wingsGroupV3Shell.unit.spec.ts:42` (unrelated footer theme selector expectation from prior Epic).

### 3.3 Static Analysis & Whitespace

- **TypeScript (`tsc --noEmit`)**:
  - 0 errors in WingsGo code.
  - 2 pre-existing errors in `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts` (lines 116, 155).
- **ESLint**:
  - Passed with 0 errors across all modified source and test files.
- **Git diff whitespace (`git diff --check`)**:
  - Clean; exited 0 on all working tree changes.
