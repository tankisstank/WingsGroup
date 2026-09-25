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
- Canary apply: 4 updated, 106 unchanged; strict verify checked 88.
- Full apply after canary: 84 updated, 26 unchanged; strict verify checked 88.
- Idempotent re-apply: 0 updated, 110 unchanged (22 English + 88 locale entries).
- Rollback: 88 locale entries updated back to the signed before state; 22 English entries unchanged.

The 2026-07-29 production-attempt report records the backup, production apply
and strict verification. Current direct strict API and complete browser-matrix
evidence still need to be rechecked after the remaining UI copy fix is released.

The three independent-review blockers are implemented and covered by the
rehearsal: signed English commercial-array mutation, enforced encrypted
backup/checksum/restore-drill evidence in the write CLI, and a parent full-plan
checksum embedded in the canary plan and required during promotion/rollback.

## Production UI spot-check — 2026-09-25

Read-only browser checks against `https://wingside.vn` found:

- Journeys pages in `en`, `vi`, `es`, `it` and `pt` returned rendered content,
  the expected localized heading, and a total of 22 journeys. Eight cards are
  initially rendered; the load-more interaction was not exhaustively checked.
- The `central-vietnam-adventure-4-days` detail route rendered a localized H1,
  summary and itinerary headings in `vi`, `es`, `it` and `pt`.
- A one-day card exposed the remaining copy defect: `1 DÍAS`, `1 GIORNI` and
  `1 DIAS` instead of singular units. The Vietnamese and Portuguese on-request
  price labels also lacked diacritics.
- The correction handles singular/plural day and night units across all five
  locales and fixes `Giá ...` / `Preço ...`. Component regression is 19/19,
  focused editorial unit tests are 24/24, TypeScript, targeted ESLint and
  `git diff --check` pass. The app-only production release is recorded below.
- A direct unauthenticated request to the production Payload API returned
  HTTP 403, so this session could not independently repeat the strict locale
  data audit. A batch check of all 110 detail URLs did not finish and is not
  counted as evidence.

The 2026-07-29 `production-attempt` report records the encrypted backup and
restore drill, production full apply, strict verification `88/88`, idempotent
re-apply `0/110`, rollback rehearsal, and representative public route checks.
Those recorded results are not a substitute for the still-missing current
strict API report, complete 110-route browser matrix and five-locale editorial
sign-off. US-056 remains `in_progress`.

## Production copy-fix release — 2026-09-25

- Source commit: `4d2ade77820089565e6e8a12a6ad15b9cc79716e`, pushed on
  `release/us056-wingside-locale-display-20260925`.
- Artifact: `wingside-us056-locale-4d2ade7-20260925T135732Z.tar.gz`,
  SHA-256 `7dca228c23d514e07460ff5a004b7a0b0ee1cc76ba0817a00db04a664fe42361`.
- Production release: `/home/ubuntu/wings-travel/releases/wingside-us056-locale-4d2ade7-20260925T135732Z`.
  ARM64 image SHA-256:
  `3b87bb64b4eefb5245b900081aaaddd8ebc98a637388a5fef74b621593f449b1`.
- Rollback image retained as
  `wingstravel-app:rollback-before-us056-locale-20260925T135732Z` (previous
  image `sha256:e540df4de79164ee883ede7b17eb921a48a2452a191352377dcd3f3d88b5dcca`).
- Production ARM64 build passed TypeScript and static generation `20/20`;
  source component test passed `19/19`; targeted ESLint and `tsc --noEmit`
  passed.
- App-only rollout succeeded. No Payload migration, CMS content write or Redis
  flush was performed. PostgreSQL container
  `ab500698a619dea4c99d03602bc2268dce64b1c59d1aee2368ccb7dad71d8944` and Redis
  container `b59a6251dcfd200a9dc9f2358c1b9df87145449bbec04163e800669e3f7aee6c`
  remained unchanged. Local `/api/health/live` and `/api/health/ready` returned
  `200`; health endpoints on all six production domains returned `200`.
- Public browser checks in `en`, `vi`, `es`, `it` and `pt` each showed 22
  Journeys. One-day and two-day/one-night cards now use correct singular forms
  (for example, `1 DÍA / 0 NOCHES`, `1 GIORNO / 0 NOTTI`, `1 NGÀY / 0 ĐÊM`);
  no browser page errors or console errors were reported.

## Production strict audit and complete route matrix — 2026-09-25

- The existing read-only `audit-multisite-locale-content.ts` validator was run
  against the production PostgreSQL database through an SSH tunnel, with
  `fallbackLocale=false` and `overrideAccess=true`. No CMS write, migration,
  seed, cache flush or publication occurred.
- The `wing-side` slice passed with `220` rows and zero blockers: `44` rows in
  each of `en`, `vi`, `it`, `es` and `pt`; zero missing, fallback-approved,
  mixed-language, placeholder or editorial-review rows for this site. The
  whole-system report had 19 findings on other sites and those were excluded
  from the US-056 result.
- The existing production E2E matrix
  `wingsside-tour-locale-matrix.e2e.spec.ts` passed `1/1` in `3.0m` against
  `https://wingside.vn`: exactly `110/110` unique detail URLs, `22` tours ×
  `5` locales, all HTTP 200, with matching `html lang`, canonical and full
  reciprocal hreflang metadata.
- The earlier anonymous HTTP API `403` is therefore an access-control result,
  not a content failure; the authenticated server-side read-only audit is now
  the strict API evidence for WingSide.
- Still open: five-locale editorial sign-off and explicit external metrics
  acknowledgement. Keep US-056 `in_progress` / Plane `Chờ xác nhận` until
  those stakeholder gates are recorded.
