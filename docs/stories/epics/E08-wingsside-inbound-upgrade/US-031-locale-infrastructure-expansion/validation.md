# US-031 Validation

## Proof Strategy

This story is not complete until code, generated types, public locale exposure,
and PostgreSQL migration proof are all validated. Current work has completed
the metadata/typegen/code/E2E/platform slices.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Locale metadata, CMS/public/ads lists, English fallback |
| Integration | Site path parsing, canonical helpers, generated Payload locale union |
| E2E | `/wingsside/en`, `/wingsside/it`, `/wingsside/es`, `/wingsside/pt`, CMS-only locale hidden checks |
| Platform | `db:migrate:smoke`, staging PostgreSQL apply |
| Performance | No new dependency; no runtime locale bundle added beyond Payload i18n config |
| Logs/Audit | Harness trace and locale hardcode audit |

## Fixtures

- Existing multisite seed data.
- Payload local SQLite bootstrap for typegen.
- PostgreSQL/Docker environment for `db:migrate:smoke`.

## Commands

```powershell
cd app
pnpm run generate:types
pnpm run test:unit -- tests/unit/locales.unit.spec.ts
pnpm run test:int -- tests/int/site-seo.int.spec.ts tests/int/sitePaths.int.spec.ts
pnpm run test:int -- tests/int/breadcrumbs.int.spec.ts tests/int/site-seo.int.spec.ts tests/int/sitePaths.int.spec.ts
pnpm run test:int -- tests/int/breadcrumbs.int.spec.ts tests/int/site-seo.int.spec.ts tests/int/sitePaths.int.spec.ts tests/int/tourDetailBuilder.int.spec.ts
pnpm run test:e2e -- tests/e2e/frontend.e2e.spec.ts -g "WingSide public ad locales|CMS-only locales"
pnpm exec eslint src/utilities/locales.ts src/utilities/sitePaths.ts src/payload.config.ts src/collections/Sites.ts 'src/app/(frontend)/[...slug]/page.tsx' src/Header/Component.tsx src/Header/Component.client.tsx src/Header/Nav/index.tsx src/blocks/Form/Component.tsx src/components/RelatedPages.tsx
pnpm exec eslint src/utilities/breadcrumbs.ts src/Header/Nav/index.tsx src/search/Component.tsx src/components/Card/index.tsx src/heros/PostHero/index.tsx 'src/app/(frontend)/search/page.tsx' 'src/app/(frontend)/posts/page.tsx' 'src/app/(frontend)/posts/page/[pageNumber]/page.tsx' src/tours/utils.ts scripts/seed-subsites.ts tests/helpers/seedPhase1Launch.ts
pnpm exec prettier --check src/utilities/breadcrumbs.ts src/Header/Nav/index.tsx src/search/Component.tsx src/components/Card/index.tsx src/heros/PostHero/index.tsx 'src/app/(frontend)/search/page.tsx' 'src/app/(frontend)/posts/page.tsx' 'src/app/(frontend)/posts/page/[pageNumber]/page.tsx' src/tours/utils.ts scripts/seed-subsites.ts tests/helpers/seedPhase1Launch.ts
pnpm exec tsc --noEmit
$env:SMOKE_PG_PORT='15432'; pnpm run db:migrate:smoke
```

## Acceptance Evidence

Evidence completed on 2026-07-07:

- `pnpm run generate:types` passed and regenerated `app/src/payload-types.ts`
  with 9 locale union.
- `pnpm run test:unit -- tests/unit/locales.unit.spec.ts tests/unit/tourDetailBuilder.unit.spec.ts`
  passed: 8 tests.
- `pnpm run test:int -- tests/int/site-seo.int.spec.ts tests/int/sitePaths.int.spec.ts`
  passed: 11 tests.
- `pnpm run test:int -- tests/int/breadcrumbs.int.spec.ts tests/int/site-seo.int.spec.ts tests/int/sitePaths.int.spec.ts`
  passed after the second cleanup slice: 14 tests.
- `pnpm run test:int -- tests/int/breadcrumbs.int.spec.ts tests/int/site-seo.int.spec.ts tests/int/sitePaths.int.spec.ts tests/int/tourDetailBuilder.int.spec.ts`
  passed: 16 tests.
- `pnpm run test:e2e -- tests/e2e/frontend.e2e.spec.ts -g "WingSide public ad locales|CMS-only locales"`
  passed: 2 tests.
- Targeted eslint passed on the locale/config/header/form/page files touched by
  this slice.
- Targeted eslint passed with 0 errors on breadcrumbs/search/posts/card/post
  hero/tour utils/seed helper cleanup. Existing warnings remain in
  `scripts/seed-subsites.ts` for unrelated `any` usage.
- Prettier check passed on touched locale/config/header/form/page files.
- Prettier check passed on breadcrumbs/search/posts/card/post hero/tour
  utils/seed helper cleanup files.
- Locale hardcode audit: `rg -n -F "locale === 'en'" app/src app/tests app/scripts`
  returned no matches.
- `pnpm exec tsc --noEmit` passed after test-only `tourDetailBuilder` typing
  fixes.
- `$env:SMOKE_PG_PORT='15432'; pnpm run db:migrate:smoke` passed on
  `postgres:16-alpine` / PostgreSQL `16.14`. It applied all committed
  migrations empty-to-head, `migrate:status` reported every migration as `Yes`,
  and the ephemeral smoke container was torn down. Port `15432` was used because
  Windows reserved the default `55432` range.
