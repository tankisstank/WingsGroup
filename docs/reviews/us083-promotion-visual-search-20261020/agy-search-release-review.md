# Pre-Production Release Audit: CMS TourDepartures Search

- **Audited Commit:** `58633ae36834bcc0869237f5565d12ccac41929d` (`fix(tours): enable search by tour title and departure metadata in cms tour-departures`)
- **Reviewer:** Antigravity (Search Scope Owner)
- **Target Release:** Production Oracle Cloud ARM64 (Release Candidate with US-083 Promotion UI)
- **Audit Timestamp:** 2026-10-20T23:45:00+07:00

---

## 1. HEAD & Working Tree Verification

| Item | Expected | Actual Evidence | Status |
|---|---|---|---|
| **HEAD Commit** | `58633ae36834bcc0869237f5565d12ccac41929d` | `git rev-parse HEAD` returned `58633ae36834bcc0869237f5565d12ccac41929d` | PASS |
| **`TourDepartures.ts` Status** | Clean against HEAD | `git diff HEAD app/src/collections/TourDepartures.ts` returned empty | PASS |
| **`tourDeparturesSearch.unit.spec.ts` Status** | Clean against HEAD | `git diff HEAD app/tests/unit/tourDeparturesSearch.unit.spec.ts` returned empty | PASS |
| **Dedicated Unit Test** | 2/2 tests pass | `vitest run tests/unit/tourDeparturesSearch.unit.spec.ts`: 2 passed (3ms) | PASS |
| **TypeScript Typecheck** | Exit code 0 | `tsc --noEmit` exited with 0 (SanitizedCollectionConfig compatible) | PASS |

---

## 2. Real PostgreSQL Read-Only Verification (Rehearsal DB 55432)

Verification performed against local container `wingstravel-rehearsal-postgres` (`wingstravel` DB, port `55432`) without modifying any data.

### 2.1. Regression Evidence (Old Behavior in PostgreSQL)
Before commit `58633ae`, searching `SING` defaulted to `departure_date ILIKE '%SING%'`:
```sql
SELECT count(*) FROM tour_departures WHERE departure_date ILIKE '%SING%';
```
- **Result:** `ERROR: operator does not exist: timestamp with time zone ~~* unknown` (Exit code 1).
- **Finding:** Hard PostgreSQL syntax failure on production schema when `departure_date` (timestamp) is queried with ILIKE.

### 2.2. Resolution Evidence (New Behavior in PostgreSQL)
With `listSearchableFields` configured, Payload generates text ILIKE queries across text fields and joined relationship tables:
```sql
SELECT tour_departures.id, tour_products_locales.title
FROM tour_departures
LEFT JOIN tour_products ON tour_products.id = tour_departures.tour_product_id
LEFT JOIN tour_products_locales ON tour_products_locales._parent_id = tour_products.id AND tour_products_locales._locale = 'vi'
LEFT JOIN tour_departures_locales ON tour_departures_locales._parent_id = tour_departures.id AND tour_departures_locales._locale = 'vi'
WHERE (
  tour_products_locales.title ILIKE '%Hàn Quốc%'
  OR tour_departures_locales.departure_city ILIKE '%Hàn Quốc%'
  OR tour_departures.flight_number ILIKE '%Hàn Quốc%'
  OR tour_departures_locales.airline ILIKE '%Hàn Quốc%'
  OR tour_departures.variant_key ILIKE '%Hàn Quốc%'
  OR tour_departures.inventory_identity ILIKE '%Hàn Quốc%'
);
```
- **Result:** Successfully returned `id: 1, title: 'Tour Hàn Quốc 5N4D Mùa Thu'` with 0 SQL errors.

---

## 3. Release Risk Audit: Search Scope

### 3.1. Access & Site Isolation
- **Mechanism:** In Payload CMS list view (`@payloadcms/next/dist/views/List/index.js`), list queries run with `overrideAccess: false`.
- **Query Combination:** `payload.find` executes collection access (`siteScopedOrPublished` on `tour-departures`). For authenticated tenant users, `buildSiteWhere` generates `{ site: { in: [userSiteID] } }`. Payload's `combineQueries` merges access constraints with list search using `AND`:
  `{ and: [ { site: { in: [siteID] } }, { or: [ ...searchFields ] } ] }`.
- **PostgreSQL Validation:**
  - With `WHERE td.site_id = 2 AND (...)`: matched 1 row (correct site).
  - With `WHERE td.site_id = 1 AND (...)`: returned 0 rows (isolated).
- **Cross-site Tour Risk:** `TourDepartures.ts` line 65 specifies `filterOptions: sameSiteFilterOptions`, preventing departures from pointing to cross-site tour products in the CMS UI.
- **Verdict:** Site isolation is preserved.

### 3.2. Locale Semantics
- **Localized Fields:** `tourProduct.title`, `departureCity`, `airline` are localized.
- **Non-Localized Fields:** `flightNumber`, `variantKey`, `inventoryIdentity` reside on the root `tour_departures` table.
- **Session Locale Dependency:** Payload list view passes current session locale (`locale: fullLocale`, `fallbackLocale: false`).
  - When admin locale is `vi`, search queries `tour_products_locales._locale = 'vi'`.
  - When admin locale is `en`, Vietnamese titles do NOT match unless English translation exists. Non-localized fields (`flightNumber`, `variantKey`, `inventoryIdentity`) match regardless of active locale.
- **Verdict:** Consistent with standard Payload CMS bilingual authoring model.

### 3.3. Title Relationship Search Semantics
- **Join Strategy:** Payload Drizzle ORM uses `LEFT JOIN` for `tour_products` and `tour_products_locales`.
- **Deduplication:** Drizzle ORM avoids duplicate departure rows by grouping on `tour_departures.id`.
- **Null Safety:** If a departure has an unassigned or broken `tourProduct` reference, `LEFT JOIN` returns NULL for `title`; the remaining `OR` branches (`departureCity`, `flightNumber`, etc.) evaluate normally without throwing runtime errors.
- **Verdict:** Safe and non-breaking.

### 3.4. Where Merging & Test Coverage Gap
- **Logic:** `mergeListSearchAndWhere` in `payload/shared` calls `hoistQueryParamsToAnd`.
  - If existing `where` is empty `{}`: returns `{ or: [ searchConditions ] }`.
  - If existing `where` has filters (e.g. `{ site: { equals: 2 } }`): wraps in `{ and: [ existingWhere, { or: searchConditions } ] }`.
- **Tested:**
  - [x] Unit test `tourDeparturesSearch.unit.spec.ts` verifies `mergeListSearchAndWhere` with empty `where: {}`.
  - [x] Manual SQL test verifies `site_id` combined with search `OR` in PostgreSQL.
- **Untested in committed test suite:**
  - [ ] Automated unit test asserting `mergeListSearchAndWhere` when `where` already contains `site` or pre-existing `and`/`or` filters.
  - [ ] Automated end-to-end integration test querying through `payload.find` directly against PostgreSQL in CI.

---

## 4. Findings & Actionable Risk Classification

### Finding 1: P2 — Test Suite Gap on Pre-existing Where Merging
- **Severity:** P2 (Non-blocking for production, recommended follow-up test enhancement)
- **Location:** `app/tests/unit/tourDeparturesSearch.unit.spec.ts:18-34`
- **Evidence:** The committed unit test only exercises `where: {}`. While Payload's internal `hoistQueryParamsToAnd` handles non-empty `where`, repo test suite lacks an explicit assertion for `{ and: [{ site: { equals: 2 } }, { or: [...] }] }`.
- **Impact:** Low release risk because `hoistQueryParamsToAnd` is standard Payload core utility, but repo lacks local regression guard for complex filter UI combinations (e.g., filtering by site/status dropdown AND searching keyword simultaneously).
- **Remediation (Post-release):** Add unit test cases for pre-existing `where` with `site` and status filters once root completes current release.

### Finding 2: P3 — Locale Search Awareness for Admin Operators
- **Severity:** P3 (Operational behavior note)
- **Location:** `app/src/collections/TourDepartures.ts:46-51`
- **Evidence:** Searching by tour title depends on current Content Locale selector (`/admin/collections/tour-departures?locale=...`). If operator is on English view (`locale=en`) searching a Vietnamese tour title, 0 results will appear.
- **Impact:** Expected Payload localized field behavior; operator guidance should note switching locale selector if searching localized names.

---

## 5. Pre-Deployment Verdict

- **Commit `58633ae36834bcc0869237f5565d12ccac41929d` is verified in HEAD.**
- **No schema migrations are introduced or required** for this search configuration change (`listSearchableFields` is purely Payload admin runtime configuration).
- **Zero blocking P1 findings.**
- **Safe to include in Production Release Candidate.**
