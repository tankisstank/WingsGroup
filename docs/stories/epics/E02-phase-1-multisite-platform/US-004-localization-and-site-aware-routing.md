# US-004 Localization And Site-Aware Routing

## Status

implemented

## Lane

normal

## Product Contract

Phase 1 must support localized content and correct site-aware public routing for
the first approved locales without cross-site or cross-locale leakage.

## Relevant Product Docs

- `docs/product/phase-1-scope.md`
- `docs/product/multisite-platform.md`
- `docs/product/editorial-operations.md`

## Acceptance Criteria

- The platform starts with `vi` and `en`.
- Content editing can switch locale within the CMS.
- Public routes and metadata render the correct locale and site context.

## Design Notes

- Commands: publish localized content, preview localized content.
- Queries: fetch page and post content by site and locale.
- API: frontend payload queries with site and locale filters.
- Tables: localized page and post records plus site locale config.
- Domain rules: locale support belongs to site configuration.
- UI surfaces: frontend routes, metadata, Payload editor locale switch.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Locale fallback and site-path helpers |
| Integration | Localized collection queries by site |
| E2E | Locale switch and page render on representative routes |
| Platform | Local dev route simulation |
| Release | Main locales work on launch-critical pages |

## Harness Delta

This story makes localization a first-class proof target instead of an implicit CMS feature.

## Evidence

2026-05-27 implementation:

- Confirmed Payload localization starts with `vi` and `en` in
  `app/src/payload.config.ts`.
- Added locale parsing helpers for local route simulation, including
  `/vi/...` and `/{siteAlias}/en/...`.
- Middleware now sets `x-locale` and includes locale in `x-site-prefix` when a
  localized site-prefixed path is requested.
- Next rewrites now support `/{siteAlias}/{locale}` and
  `/{siteAlias}/{locale}/:slug*` while preserving existing site-only aliases.
- Public layout now sets `<html lang>` from current locale.
- Page detail, post detail, posts archive, paginated posts archive, and search
  queries pass the resolved locale into Payload reads.
- `SiteLink`, `CMSLink`, and pagination path helpers preserve the active site
  alias and locale when building internal links.

Validation:

- `cd app; $env:DATABASE_URL='file:./payload-us010-test.db'; pnpm run test:int`
  passed outside sandbox with 5 files and 19 tests.
- Filtered `tsc --noEmit` output for US-004 touched files returned no matching
  errors.
- `pnpm lint` remains blocked before project linting by the existing ESLint 9
  circular config error.

Known follow-up:

- Locale-specific sitemap expansion remains pending after this story because it
  depends on the final production URL strategy for locale paths versus mapped
  domains.

2026-05-27 launch smoke update:

- Added Playwright smoke coverage for the localized child-site route
  `/wingsgo/en`.
- `pnpm run test:e2e` passed outside sandbox with 10 tests.
- `pnpm lint` passed with zero warnings.
- `pnpm exec tsc --noEmit --pretty false --incremental false` passed.
- `pnpm build` passed outside sandbox.
