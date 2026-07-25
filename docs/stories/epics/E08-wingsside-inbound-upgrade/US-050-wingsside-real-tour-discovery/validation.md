# Validation

## Result

Local acceptance: **PASS** on 2026-07-25.

## Automated Proof

| Layer       | Required proof                                                          |
| ----------- | ----------------------------------------------------------------------- |
| Unit        | Eligibility, stable sorting, card projection, no static fallback        |
| Component   | Six destination, six style and three sample cards with real records     |
| Integration | Same-site/published filters, relationship validation, locale projection |
| Data        | Selected IDs exist, match slot taxonomy and have valid wrappers         |
| DOM         | Stable marker counts and tour slug/ID evidence                          |
| Responsive  | 8-page regression plus focused Home at six breakpoints                  |
| Visual      | Home 1440x900 and 390x844 against locked prototype state                |
| Platform    | Typecheck, formatter, changed-file lint, build, go-live review          |

## Truthfulness Assertions

- Every Sample Journey title equals its selected Payload record.
- Displayed price and currency equal Payload values.
- Duration and href equal the selected record/wrapper.
- Hero media belongs to the record or an explicit CMS override.
- Static package copy changes do not change rendered Sample Journeys.
- Unpublishing a selected tour removes it and raises a validation gap.

## Browser State

Clear `sessionStorage['wingsside-promo-dismissed']`, freeze the same Home carousel
index and capture from scroll-top. Do not submit real forms.

## Exit Decision

Local UI/data acceptance is separate from production go-live. Record remaining
SEO, SMTP, migration or VPS blockers explicitly.

## Recorded Evidence

- `pnpm run audit:wingsside:home-curation`: PASS; Home 298, exact approved
  selections, 12 unique TourProducts, zero findings, and ready 6/6/3
  projections for EN/VI/IT/ES/PT (English content fallback is explicit where a
  localized TourProduct field is not yet authored).
- `pnpm run test:unit`: PASS; 47 files, 327 tests.
- `pnpm run test:component`: PASS; 13 files, 43 tests.
- Focused post-correction proof: 10 curation/model unit tests and 5 Home/hub
  component tests pass.
- `tests/int/wingsSideHomeCurationSQLite.int.spec.ts`: PASS against an isolated
  hermetic SQLite fixture after creating the parent Page tables, repairing all
  six curation tables, and running a real Pages SQL query.
- `pnpm run db:migrate:smoke`: PASS, PostgreSQL 16 empty-to-head with no pending
  migration.
- `node scripts/wings-side-hifi-pg-crud-smoke.mjs`: PASS, PostgreSQL migration
  plus Payload nested-array CRUD in EN and VI.
- `pnpm run build`: PASS after validating concurrent SQLite bootstrap across
  19 Next.js workers.
- Committed E2E corrections re-run on disposable PostgreSQL: Home
  carousel/planner PASS; Specials layout PASS; `/he-sinh-thai` smoke PASS.
- TypeScript and ESLint: PASS with zero errors; repository-wide lint retains
  only pre-existing warnings.
- Browser QA with `agent-browser`: ready real-tour Home and canonical tour
  links. Destination `hanoi` and style `romance` hub filters were initially
  checked visually; final component proof additionally asserts that each hub
  links the one matching projected TourProduct rather than a static category
  card.
- Cache dependency audit: curated-tour changes query the enabled Home directly
  (no 100-page truncation); Tour deletion, wrapper Page changes/deletion, Media
  changes/deletion, localized paths and the local `/wingsside` alias invalidate
  the bounded discovery surfaces.
- Visual captures:
  `artifacts/us050-runtime/home-desktop.png` (1440x1000) and
  `artifacts/us050-runtime/home-mobile.png` (390x844).

## Release Boundary

Local data was updated and audited. No production deployment, production
migration, SMTP change or VPS action was performed.
