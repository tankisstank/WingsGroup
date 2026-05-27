# US-003 Site Registry And Settings

## Status

implemented

## Lane

normal

## Product Contract

The platform must have a durable `site` model and site-specific settings so one
codebase can serve multiple brands without hardcoded content coupling.

## Relevant Product Docs

- `docs/product/phase-1-scope.md`
- `docs/product/multisite-platform.md`

## Acceptance Criteria

- A `site` record can represent identity, domain, locale support, and active status.
- Site settings own brand, SEO, navigation, and shared contact data per site.
- Public rendering and admin behavior can resolve the correct site context.

## Design Notes

- Commands: site bootstrap, site seed, settings update.
- Queries: resolve current site, fetch active site settings.
- API: internal CMS and frontend data access only.
- Tables: `sites`, `site-settings`.
- Domain rules: site is the top-level scope for content and access.
- UI surfaces: Payload admin, shared frontend layout.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Site resolution and settings fetch rules |
| Integration | CMS queries return site-correct settings |
| E2E | Local path-based site simulation works on key routes |
| Platform | Local bootstrap with SQLite |
| Release | First site can launch without hardcoded brand data |

## Harness Delta

Seeded from current strategy docs as a bounded phase-1 platform story.

## Evidence

2026-05-27 Agent A audit/implementation:

- Verified `sites` collection includes identity, code, primary/additional domains, supported/default locale, and active status.
- Verified `site-settings` collection owns per-site brand, SEO defaults, header/footer nav, support contact, and footer note.
- Added middleware-backed local path-prefix context so `/wingstravel`, `/wingsgo`, `/wingscare`, and `/wingsinsurance` set `x-site-code` and `x-site-prefix` for shared layout/header/footer reads.
- Updated public site lookup to resolve only active site records.
- Added integration tests for local path alias/code mapping and site-aware link prefixing.

Validation:

- `cd app; pnpm run test:int` passed outside sandbox after initial sandbox `spawn EPERM`: 4 test files, 12 tests.
- `cd app; pnpm lint` failed before linting code because ESLint config loading throws `TypeError: Converting circular structure to JSON` from `@eslint/eslintrc` / Next flat config compatibility.
- `cd app; pnpm exec tsc --noEmit --pretty false --incremental false` still fails on existing baseline type issues outside the US-003 patch, including seed/static content missing required `site`, missing `@payloadcms/next/css` type declarations, and legacy `src/payload-types` imports. The new middleware type error found during audit was fixed and no longer appears.

2026-05-27 launch smoke update:

- Added Playwright public smoke coverage for `/`, `/wingsgo`, `/wingscare`,
  and `/wingsinsurance`.
- E2E now runs with one worker because Payload + SQLite local bootstrap is not
  safe to initialize concurrently.
- `pnpm run test:e2e` passed outside sandbox with 10 tests.
- `pnpm lint` passed with zero warnings.
- `pnpm exec tsc --noEmit --pretty false --incremental false` passed.
- `pnpm build` passed outside sandbox; Next.js still warns that the
  `middleware` file convention is deprecated in favor of `proxy`.
