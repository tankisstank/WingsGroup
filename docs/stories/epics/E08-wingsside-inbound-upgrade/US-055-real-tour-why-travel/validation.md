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

Targeted component coverage and a real PostgreSQL migration/CRUD smoke now
exist. The five-locale Home → Tour Detail browser matrix remains a release
gate after approved curation data is applied.

## Acceptance Evidence

Implementation evidence:

- Payload schema exposes the four fixed roles, manual selection, governed rule
  selection, fallback, and localized presentation overrides.
- The approved mapping is stored by importer source ID so numeric local IDs are
  not treated as a production contract.
- The editorial catalog already contains authored `vi`, `it`, `es`, and `pt`
  records for the four selected tours.
- The governed four-slot projection fails closed for invalid, unpublished,
  cross-site or non-display-ready candidates.
- `pnpm exec tsc --noEmit` passes.
- Full unit suite after the S3 corrective integration: 64 files and 514 tests
  pass.
- Full component suite: 14 files and 74 tests pass.
- Empty-to-head PostgreSQL migration plus real Payload CRUD passed for EN and
  VI after correcting the localized version-column migration contract.
- Independent S3 corrective re-review ran 94 targeted tests and reproduced the
  prior empty-media, conflicting-evidence, forged-ledger and missing-release-
  evidence attacks. No remaining P0 code false-pass was found.
- Production editorial apply/rollback now requires the reviewed catalog-v2
  artifact and checksum plus plan, release, backup, restore-drill, database,
  operator and rollback-release evidence before Payload initialization.

Release remains intentionally held until:

- the pricing-disclosure localization blocker recorded in
  `../go-live-audit-2026-07-28-implementation.md` is resolved;
- the canonical transactional runtime for the governed 22-tour English
  rewrite plan is implemented and rehearsed;
- approved media bytes, provenance, OCR/frame evidence and authenticated
  manual review are available;
- the approved PostgreSQL localization and Home curation plans are applied and
  audited;
- exact 22/22 inventory and Home → Tour Detail behavior pass for EN, VI, IT, ES
  and PT; and
- production deployment/data-write approval is explicit.
