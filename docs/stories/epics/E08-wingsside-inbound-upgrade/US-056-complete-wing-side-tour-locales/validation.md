# US-056 Validation

## Audit Baseline — 2026-07-29

Production strict API audit (`fallbackLocale: false`) found:

| Locale | Tour title | Summary | Route/CTA/meta | Itinerary title/route/summary | Includes |
| --- | ---: | ---: | ---: | ---: | ---: |
| EN | 22/22 | 22/22 | 22/22 | 116/116 | 331/331 |
| VI | 0/22 | 0/22 | 0/22 | 0/116 | 0/331 |
| ES | 0/22 | 0/22 | 0/22 | 0/116 | 0/331 |
| IT | 0/22 | 0/22 | 0/22 | 0/116 | 0/331 |
| PT | 0/22 | 0/22 | 0/22 | 0/116 | 0/331 |

The 22 localized wrapper Pages retain translated title and metadata in all
four target locales. The checked-in approved editorial catalog passes its
focused localization/production tests `9/9`.

Browser inspection confirms:

- VI, ES, IT and PT Journeys cards use English tour titles and summaries.
- VI shows `Gia theo yeu cau` and
  `Gia cuoi cung duoc xac nhan truoc khi giu cho`.
- PT shows `Preco sob consulta` and
  `O preco final e confirmado antes de qualquer bloqueio`.
- ES renders `1 DÍAS`; IT renders `1 GIORNI`; PT renders `1 DIAS`.
- The VI Tour Detail sample has localized shell labels but an empty H1 and
  missing localized product sections.

## Proof Strategy

The story is complete only when content-source validation, PostgreSQL
restoration proof, application tests and public production browser checks all
agree. HTTP 200, route count or English fallback is not sufficient evidence.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Catalog checksum, required fields, English-leak detection, VI/PT accents, locale singular/plural |
| Integration | Strict Payload locale reads; Page/TourProduct write and rollback; taxonomy-only update preserves all target locale checksums |
| E2E | Five Journeys routes; all 110 Tour Detail locale routes; non-empty localized sections; no English sentence leakage |
| Platform | PostgreSQL backup/restore drill; signed plan dry-run/apply/verify/idempotence/rollback; canary and production smoke |
| Performance | Locale projection does not introduce unbounded per-card queries; listing response remains within release baseline |
| Logs/Audit | Machine-readable before/after field counts, checksums, mutation totals and blocked promotion reasons |

## Fixtures

- Exact 22 published WingSide BestPrice TourProducts.
- Exact 22 same-site wrapper Pages.
- English source manifest and accepted `vi`, `es`, `it`, `pt` editorial JSON.
- Representative tours: one-day Mekong, four-day Central Vietnam and a
  long multi-region itinerary.
- Taxonomy-only update fixture that must preserve localized editorial rows.

## Planned Commands

```text
pnpm exec vitest run <focused US-056 unit tests> --config ./vitest.unit.config.mts
pnpm exec vitest run <focused US-056 integration tests> --config ./vitest.config.mts
pnpm run test:e2e:wingsside:tour-locales
pnpm run import:wingsside:tour-editorial:prod:plan
pnpm run import:wingsside:tour-editorial:prod:apply
pnpm run import:wingsside:tour-editorial:prod:verify
```

Production commands must include the existing explicit environment, release,
operator, plan and backup guards. Exact invocations and artifact paths are
added only after the implementation is prepared.

## Release Gates

1. Source catalog and checksums pass.
2. Current broken state fails the new strict validator.
3. PostgreSQL rehearsal proves apply, verify, idempotence and rollback.
4. Encrypted production backup and restore drill pass.
5. Production apply restores all 88 translated tour-locale pairs.
6. API audit reports complete required fields and zero English leakage.
7. Browser E2E and representative visual checks pass across five locales.
8. Canonical, hreflang, responsive layout and console checks pass.

## Acceptance Evidence

Prepared locally and on disposable PostgreSQL:

- Approved normalized English baseline: 22 tours, 129 inclusions, 202 exclusions.
- Target catalogs: VI/IT/ES/PT each contain 22 tours, 129 inclusions and 202 exclusions.
- Strict catalog findings: 0.
- Focused automated suite: 4 files, 19 tests passed.
- Fresh migration and schema assertion: 4 tables, 10 enums, 10 foreign keys, 2 unique locale indexes.
- Rehearsal seed: 22 tours, 22 wrappers, 5 locales.
- Canary apply: 4 updated, 84 unchanged; strict verify checked 88.
- Full apply after canary: 84 updated, 4 unchanged; strict verify checked 88.
- Idempotent re-apply: 0 updated, 88 unchanged.
- Rollback: 88 updated back to the signed before state.

Production backup, production mutation, public strict API audit and browser E2E
remain pending explicit production approval.
