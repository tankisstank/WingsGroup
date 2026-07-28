# US-055 Validation

## Proof Strategy

Prove that each stable Why Travel role resolves to one real, published,
same-site, display-ready TourProduct in EN, VI, IT, ES and PT; allowed
editorial overrides remain explicit; and invalid configurations fail closed
without static product-like fallback.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Slot parsing, exact-key validation, manual/rule resolution, deterministic ordering, override merge and canonical URL projection. |
| Integration | Same-site/published/readiness filters, locale projection, duplicate handling, cross-site rejection, migration and idempotent backfill. |
| Component | Featured plus three supporting cards, real media/CTA output, override behavior, invalid state, markers and accessible labels. |
| E2E | Home Why Travel -> Tour Detail for four roles at 390px and 1440px in EN/VI/IT/ES/PT. |
| Platform | TypeScript, lint, build, PostgreSQL migration, DB/Redis health, tenant isolation and production HTTP checks. |
| Regression | US-050 Home 6/6/3, US-051 process board, US-052 proof archive and US-054 discovery behavior remain intact. |

## Fixtures

- Four approved published WingSide tours covering the initial role mappings.
- Manual and rule-based configurations with deterministic candidate order.
- Unpublished, cross-site and incomplete TourProducts proving fail-closed
  behavior.
- EN, VI, IT, ES and PT Page and TourProduct content.
- Explicit copy/media/CTA override cases and inherited-default cases.

## Commands

```text
pnpm run test:unit
pnpm run test:component
pnpm run test:int
pnpm run test:e2e
pnpm run validate:wingsside:locales
pnpm run build
```

Add a targeted US-055 browser command and PostgreSQL migration/CRUD smoke when
implementation exists.

## Acceptance Evidence

Implementation evidence in progress:

- Payload schema exposes the four fixed roles, manual selection, governed rule
  selection, fallback, and localized presentation overrides.
- The approved mapping is stored by importer source ID so numeric local IDs are
  not treated as a production contract.
- The editorial catalog already contains authored `vi`, `it`, `es`, and `pt`
  records for the four selected tours.
- `pnpm exec tsc --noEmit`, unit tests (378) and component tests (50) pass.

Release is intentionally held until the guarded PostgreSQL editorial rehearsal
imports the four locale records and the Home curation apply/audit proves all
five locale projections. The rehearsal refuses local SQLite by design.
