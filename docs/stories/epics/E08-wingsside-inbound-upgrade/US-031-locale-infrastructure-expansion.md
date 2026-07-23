# US-031 Locale infrastructure expansion

## Status

implemented

## Lane

high-risk

## Product Contract

The app supports CMS-enabled target locales while exposing only public-enabled
locales in routing, nav, sitemap, hreflang and ads launch surfaces.

## Relevant Product Docs

- `docs/product/wingsside-inbound-implementation-plan.md`
- `docs/stories/epics/E08-wingsside-inbound-upgrade/audit.md`

## Acceptance Criteria

- Shared locale metadata exists.
- Payload localization and `Sites` locale options include target locales.
- Public sitemap/nav/hreflang use public-enabled locales only.
- IT/ES/PT route chrome falls back to English, not Vietnamese.
- JA/KO/FR/DE do not appear publicly until enabled.
- PostgreSQL migration smoke and staging migration gate are satisfied.

## Design Notes

- Commands: `generate:types`, `tsc`, lint, integration tests,
  `db:migrate:smoke`.
- Tables: Payload localized tables and locale enums.
- UI surfaces: Header, search, forms, breadcrumbs, posts, tours, sitemaps.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Locale metadata/fallback helpers |
| Integration | Payload config/schema and sitemap generation |
| E2E | `/wingsside/it`, `/es`, `/pt`, public-disabled locale checks |
| Platform | PostgreSQL migration smoke and staging apply |
| Release | Locale audit table closed |

## Harness Delta

High-risk story evidence includes migration and rollback notes. PostgreSQL
migration smoke is satisfied on a real PostgreSQL 16.14 container.

## Evidence

Implementation completed on 2026-07-07:

- Added `app/src/utilities/locales.ts` as the central locale metadata contract.
  CMS-enabled locales are `vi`, `en`, `it`, `es`, `pt`, `ja`, `ko`, `fr`, `de`.
  Public-enabled locales are `vi`, `en`, `it`, `es`, `pt`. Ads-ready locales are
  `en`, `it`, `es`, `pt`.
- Updated Payload localization and `Sites` locale options to use the central
  locale contract.
- Regenerated `app/src/payload-types.ts`; generated types now include the 9
  locale union.
- Updated sitemap and revalidation loops to use public-enabled locales only, so
  JA/KO/FR/DE do not leak into sitemap/revalidate public surfaces by default.
- Added `getCopyLocale()` fallback so IT/ES/PT and CMS-only draft locales fall
  back to English public chrome rather than Vietnamese where touched.
- Added `tests/unit/locales.unit.spec.ts` and updated
  `tests/int/sitePaths.int.spec.ts`.
- Completed the second hardcode cleanup slice for breadcrumbs, search, posts,
  post hero/cards, tour utility labels/dates, `seed-subsites` locale types, and
  phase-1 seed helper locale types. Route/query locale still uses the real
  requested locale; only missing UI copy falls back through `getCopyLocale()`.
- Preserved the legacy no-locale breadcrumb default as Vietnamese in the
  breadcrumb helper by passing `locale ?? 'vi'` before copy fallback. The lower
  level `getCopyLocale(undefined)` helper itself intentionally returns English,
  and explicit non-`vi` locales also fall back to English copy until native
  chrome translations exist.
- Added E2E coverage for `/wingsside/en/search`, `/wingsside/it/search`,
  `/wingsside/es/search`, `/wingsside/pt/search`, English chrome fallback, and
  public sitemap exclusion for CMS-only locales `ja`, `ko`, `fr`, `de`.
- Fixed unrelated `tourDetailBuilder` test-only TypeScript blockers so
  `pnpm exec tsc --noEmit` can act as a real gate again.
- Completed PostgreSQL migration smoke on Docker Desktop with
  `SMOKE_PG_PORT=15432` because Windows reserved the default `55432` range.
  The smoke script started `postgres:16-alpine`, applied all committed
  migrations empty-to-head, verified `migrate:status` had every migration
  marked `Yes`, confirmed PostgreSQL `16.14`, and tore down the ephemeral
  container.

Validation:

- `pnpm run generate:types` passed.
- `pnpm run test:unit -- tests/unit/locales.unit.spec.ts tests/unit/tourDetailBuilder.unit.spec.ts`
  passed: 8 tests.
- `pnpm run test:int -- tests/int/site-seo.int.spec.ts tests/int/sitePaths.int.spec.ts`
  passed: 11 tests.
- `pnpm run test:int -- tests/int/breadcrumbs.int.spec.ts tests/int/site-seo.int.spec.ts tests/int/sitePaths.int.spec.ts tests/int/tourDetailBuilder.int.spec.ts`
  passed: 16 tests.
- `pnpm run test:e2e -- tests/e2e/frontend.e2e.spec.ts -g "WingsSide public ad locales|CMS-only locales"`
  passed: 2 tests.
- Targeted eslint passed for touched locale/config/header/form/page files.
- Targeted eslint for the second cleanup slice passed with 0 errors. It still
  reports existing `@typescript-eslint/no-explicit-any` warnings in
  `scripts/seed-subsites.ts`.
- Prettier check passed for touched locale/config/header/form/page files.
- Prettier check passed for the second cleanup slice.
- `rg -n -F "locale === 'en'" app/src app/tests app/scripts` returned no
  remaining matches.
- `pnpm exec tsc --noEmit` passed.
- `$env:SMOKE_PG_PORT='15432'; pnpm run db:migrate:smoke` passed. The default
  port `55432` was not used because Windows had reserved `55361-55460`.

Locale audit snapshot after this slice:

| File/pattern | Hardcode type | Risk | Fix strategy | Status |
| --- | --- | --- | --- | --- |
| `app/src/utilities/locales.ts` | intentional `CopyLocaleCode = 'en' | 'vi'` | low | keep as explicit copy fallback until native chrome exists | intentional |
| `app/src/Header/*` | primary action/nav copy fallback | medium | converted to `getCopyLocale()` | fixed for current slice |
| `app/src/blocks/Form/Component.tsx` | form chrome fallback | medium | converted to `getCopyLocale()` | fixed for current slice |
| `app/src/components/RelatedPages.tsx` | related pages copy fallback | medium | converted to `getCopyLocale()` | fixed for current slice |
| `app/src/utilities/breadcrumbs.ts` | `locale === 'en'` branches | medium | converted to copy map with no-locale Vietnamese default | fixed |
| `app/src/search/*`, `app/src/app/(frontend)/search/*` | search copy fallback | medium | converted to `getCopyLocale()` copy maps | fixed |
| `app/src/app/(frontend)/posts/*`, `app/src/heros/PostHero/*`, `app/src/components/Card/*` | posts/card copy fallback | medium | converted to `getCopyLocale()` copy maps | fixed |
| `app/src/tours/utils.ts` | structured tour utility labels/dates `en/vi` | medium | accepts real supported locale and normalizes through `getCopyLocale()` | fixed |
| `app/src/tours/StructuredPages.tsx` | component props `en/vi` | low | intentionally receives `CopyLocaleCode` from caller until native translations exist | intentional |
| `app/scripts/seed-subsites.ts`, `app/tests/helpers/seedPhase1Launch.ts` | seed locale types `en/vi` | medium | converted to `CopyLocaleCode` alias | fixed |
| `app/src/components/AdminNavIntro/index.tsx` | admin intro language toggle `en/vi` | low | admin-only copy toggle, outside public locale exposure | intentional |
