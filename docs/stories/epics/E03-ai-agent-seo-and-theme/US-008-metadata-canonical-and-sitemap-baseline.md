# US-008 Metadata, Canonical, And Sitemap Baseline

## Status

implemented

## Lane

normal

## Product Contract

Launch-critical public routes must expose a consistent metadata baseline for
humans, search systems, and AI-assisted search surfaces. Canonical URL rules
and sitemap coverage must remain correct across sites and locales.

## Relevant Product Docs

- `docs/product/ai-agent-seo-and-theme.md`
- `docs/product/ai-agent-seo-implementation-checklist.md`
- `docs/product/acceptance-and-kpis.md`

## Acceptance Criteria

- Launch-critical routes generate stable title, description, canonical, and
  sharing image metadata.
- Canonical URLs do not collide across sites or locales.
- Existing sitemap routes cover the selected launch-critical route set.
- Metadata logic remains site-aware and locale-aware.

## Design Notes

- Commands: metadata generation, sitemap generation.
- Queries: site-aware page and post reads for SEO fields.
- API: Next.js metadata generation and sitemap routes.
- Tables: pages, posts, site settings.
- Domain rules: local path-prefix behavior must not leak into production
  canonical logic.
- UI surfaces: public routes only.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Metadata helpers and canonical rules |
| Integration | Sitemap output and representative page metadata |
| E2E | Representative public routes render correct metadata |
| Platform | Local multisite smoke check |
| Release | Launch-critical route checklist complete |

## Harness Delta

This story operationalizes the first implementation slice from the AI Agent SEO
checklist.

## Evidence

2026-05-27 implementation:

- Metadata baseline now uses the shared `generateMeta` path for page detail,
  post detail, posts archive, paginated posts archive, and search.
- Root layout metadata now sets site-aware canonical and Open Graph URLs using
  normalized `site-settings.seo.canonicalDomain`.
- Search metadata is marked `noindex, follow` and is no longer included in
  sitemap output because it is not a launch-critical indexable content route.
- Page and post sitemap routes now build URLs from each document's site settings
  instead of one global `SITE_URL`, preventing canonical collisions across
  child sites.
- Sitemap URL generation deduplicates identical loc values and keeps `lastmod`
  from document or site-setting `updatedAt` where available.
- Added integration assertions for canonical domain normalization, per-site URL
  separation, and site-setting lookup by site id.

Validation:

- `cd app; pnpm run test:int` passed with 4 files and 15 tests.
- `cd app; pnpm lint` remains blocked before project linting by the existing
  ESLint 9 circular config error.
- `cd app; pnpm exec tsc --noEmit --pretty false --incremental false` still
  fails on existing baseline issues, but filtering output for US-008 touched
  files returned no matches.

2026-05-27 launch smoke update:

- Added Playwright smoke coverage for `pages-sitemap.xml`.
- `pnpm run test:e2e` passed outside sandbox with 10 tests.
- `pnpm lint` passed with zero warnings.
- `pnpm exec tsc --noEmit --pretty false --incremental false` passed.
- `pnpm build` passed outside sandbox and `next-sitemap` generated sitemap
  output.
