# US-092 Phase 1c Report — Context-Bound Keyset Cursor & Endpoint Real-Path Verification

- **Story:** US-092 WingsGo Tour Catalog v2
- **Epic:** E07 Tour Product Platform
- **Phase:** Phase 1c (Codex Gate 2 Remediations)
- **Date:** 2026-10-29
- **Branch:** `feat/us-092-tour-catalog-v2`
- **Commit Baseline:** `ef5f2f4`

---

## 1. Executive Summary

Following Codex Gate 2 review on commit `ef5f2f4`, Phase 1c addresses all architectural findings:
- **P1.1 + P1.2 (Cursor v2 Context Binding & Embedded Featured Exclusions)**: Upgraded cursor payload to version 2 (`{ v: 2, ctx, sort, date, price, title, id, x }`), binding the cursor cryptographically to the exact request context via `fnv1a32` hex hash of canonical `siteID | locale | sort | canonicalFilters` and embedding the featured tour exclusion set `x` directly in the cursor. Dropped the separate client/API `exclude` query parameter end-to-end. If context mismatches or cursor is invalid, the query safely falls back to a fresh page 1 starting at offset 0.
- **P2.2 (Single `enabled` Expression)**: Aligned the API route `app/src/app/(payload)/api/wingsgo/tour-catalog/route.ts` to use `page?.wingsGoTourCatalog?.enabled !== true`, matching `queryWingsGoTourCatalog`. Non-boolean truthy values (e.g. `'true'` or `1`) now return safe empty DTO.
- **P2.3 (Real-Path Endpoint Verification)**: Added comprehensive endpoint tests that execute the real unmocked `queryWingsGoTourCatalog` implementation, testing two-page cursor pagination, inventory mutations (card removal, curation change, departure expiration), context-mismatch fallback, and tampered cursor rejection.

---

## 2. Implemented Remediations

### 2.1 Cursor v2 Context Binding and Embedded Featured IDs (Codex P1.1 + P1.2)

1. **Payload Structure `v: 2`**:
   - `CatalogCursorPayload`: `{ v: 2, ctx, sort, date, price, title, id, x }`.
   - `ctx`: `fnv1a32` hex hash of canonical string `site.id | locale | sort | canonicalFilters`. `canonicalFilters` formats sorted keys (`departureMonth`, `durationMax`, `durationMin`, `market`, `priceMax`, `priceMin`, `season`), omitting empty/undefined values and `sort`.
   - `x`: Array of up to 6 string IDs matching `^[A-Za-z0-9_-]{1,64}$` representing the initial featured tours excluded from `all`. Embedded directly in the cursor when filters are not active; empty array when filters are active.
   - Exported `buildCatalogCursorContext({ siteID, locale, filters })` helper.
2. **Decoding and Validation**:
   - `decodeCatalogCursor`: Accepts only `v === 2`. Rejects `v: 1` cursors (`null`). Enforces maximum encoded string length of 1024 characters, base64url characters, valid sort, valid scalar types, and valid string entries in `x` ($\le 6$). Never throws on malformed, oversized, or tampered input.
3. **Query Logic**:
   - `queryWingsGoTourCatalog` computes `currentCtx = buildCatalogCursorContext(...)`.
   - Decoded cursor is used if and only if `cursor.ctx === currentCtx`.
   - When cursor is present but invalid/mismatched, `offset` is ignored and forced to 0 (`effectiveOffset = cursor ? 0 : offset`), resetting to page 1.
   - When a valid cursor is active without active filters, exactly `cursor.x` is excluded from `all`.
4. **End-to-End Clean-up of `exclude` Param**:
   - Dropped `parseExcludeParam` from `wingsGoCatalog.ts`.
   - Dropped `exclude` parameter from `/api/wingsgo/tour-catalog` route.
   - Dropped `exclude` argument from `queryWingsGoTourCatalog`.
   - Dropped `exclude` parameter from `WingsGoTourCatalogClient.tsx`. Client transmits only `cursor`.
5. **No HMAC Rationale**:
   - The catalog is public, read-only data.
   - Modifying or tampering with a cursor only affects the requester's own client response (e.g. falling back to page 1 or showing items relative to a different sort key).
   - A signed HMAC is unnecessary overhead because there is no privilege escalation, state modification, or private data access possible through the cursor.

### 2.2 Single `enabled` Expression (Codex P2.2)

- In `app/src/app/(payload)/api/wingsgo/tour-catalog/route.ts`:
  ```ts
  if (page?.wingsGoTourCatalog?.enabled !== true) return jsonNoStore(emptyCatalog)
  ```
- Any truthy non-boolean (`'true'`, `1`, `{}`) evaluates to `!== true` and cleanly returns `emptyCatalog`.

### 2.3 Real-Path API Endpoint Verification (Codex P2.3)

- Added endpoint test suite in `app/tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts` executing the real `queryWingsGoTourCatalog` pipeline:
  - Page 1 $\to$ `nextCursor` $\to$ Page 2 with cursor: union of `all` contains all 8 expected cards in order without duplicates, and featured cards are excluded from `all`.
  - Inventory mutations between page requests (card deletion, curation change, departure expiration): page 2 with cursor reliably returns remaining cards in order without skips.
  - Context mismatch (different `locale`, different `market`, different `site`): cursor is ignored, resetting to page 1.
  - Tampered cursors (`ctx` modified, `x` containing invalid IDs, `v: 1`, length > 1024, garbage characters): treated as no cursor, 200 response with `Cache-Control: no-store`.

---

## 3. Residual Risks

1. **Sort Key Mutation**: A tour whose own sort key (departure date, price, or title) moves before the cursor between requests will not be shown on subsequent pages. This is an inherent, standard characteristic of stateless keyset pagination; crucially, other tours are never skipped or duplicated.
2. **Unsnapshot Database Reads**: Wrapper pages, tour products, and tour departures are read sequentially from Payload CMS without an atomic database snapshot. A CMS write operation occurring precisely between these queries could result in a mixed inventory state for that individual request.
3. **Cursor Tampering Scope**: Tampering with the opaque cursor string can only alter the response returned to the user submitting that cursor; no backend state, cache, or other user's session can be affected.

---

## 4. Test Evidence

### 4.1 Targeted Specifications

```bash
pnpm exec vitest run --config ./vitest.unit.config.mts \
  tests/unit/businessCalendar.unit.spec.ts \
  tests/unit/wingsGoCatalog.unit.spec.ts \
  tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts \
  tests/unit/wingsGoTourCuration.unit.spec.ts
```
**Result**: 4 passed, 0 failed, 109 tests passed.

```bash
pnpm exec vitest run --config ./vitest.component.config.mts \
  tests/component/wingsGoTourCatalog.component.spec.tsx
```
**Result**: 1 passed, 0 failed, 8 tests passed.

### 4.2 Full Test Suites

- **Full Component Suite (`pnpm run test:component`)**:
  - 56 test files passed out of 56 (375 tests passed, 0 failed).
- **Full Unit Suite (`pnpm run test:unit`)**:
  - 161 test files passed out of 162 (1331 tests passed).
  - 1 pre-existing failure: `tests/unit/wingsGroupV3Shell.unit.spec.ts:42` (unrelated footer theme selector expectation from prior Epic).

### 4.3 Static Analysis & Whitespace

- **TypeScript (`tsc --noEmit`)**:
  - 0 errors in WingsGo catalog and tests.
  - 2 pre-existing errors in `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts` (lines 116, 155).
- **ESLint**:
  - Passed with 0 errors across all changed source and test files.
- **Git diff whitespace (`git diff --check HEAD~1..HEAD`)**:
  - Clean; exited 0.
