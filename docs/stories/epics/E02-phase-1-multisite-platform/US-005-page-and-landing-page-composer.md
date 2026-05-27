# US-005 Page And Landing Page Composer

## Status

implemented

## Lane

normal

## Product Contract

Phase 1 must provide reusable page composition for core marketing pages and at
least one landing page pattern without recurring structural frontend edits.

## Relevant Product Docs

- `docs/product/phase-1-scope.md`
- `docs/product/editorial-operations.md`
- `docs/product/acceptance-and-kpis.md`
- `docs/product/page-composer-and-landing-pattern.md`

## Acceptance Criteria

- Core marketing pages can be managed from structured content in Payload.
- At least one landing page pattern is reusable for campaign or market-specific variants.
- Editors can change hero, CTA, and supporting sections without code changes for standard cases.

## Design Notes

- Commands: create page, create landing page, publish draft.
- Queries: fetch blocks and shared settings for render.
- API: page and landing page read models.
- Tables: pages, posts, future services if introduced in scope.
- Domain rules: page structure remains block-based and reusable.
- UI surfaces: frontend marketing pages and CMS block editor.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Block config and serialization helpers |
| Integration | CMS documents render expected block payloads |
| E2E | Create/edit/publish path for one page and one landing page |
| Platform | Mobile and desktop smoke checks |
| Release | One reusable landing page pattern demonstrated |

## Harness Delta

This story anchors reusable composition as a durable acceptance requirement.

## Evidence

2026-05-27 implementation:

- Documented the reusable page composer and phase-1 landing pattern in
  `docs/product/page-composer-and-landing-pattern.md`.
- Added a phase-1 landing page pattern helper requiring `content`,
  `mediaBlock`, `cta`, and `formBlock`.
- Added a `/campaign` sample landing page to `scripts/seed-subsites.ts` for
  each configured site. The page includes editable hero, content proof points,
  media, CTA, form, SEO metadata, breadcrumb label, parent page, and related
  page links.
- Added `Campaign` to seeded site navigation so the sample landing page is not
  orphaned.

Validation:

- `pnpm exec tsc --noEmit --pretty false --incremental false` passed after
  preflight cleanup.
- Landing pattern integration tests cover required block composition.

2026-05-27 launch smoke update:

- Added E2E seed helper for Phase 1 launch smoke so `/wingsgo/campaign` exists
  in the local SQLite test database without downloading remote assets.
- Added Playwright smoke coverage for `/wingsgo/campaign`, including campaign
  title, visible landing heading, breadcrumb, and contact link.
- `pnpm run test:e2e` passed outside sandbox with 10 tests.
- `pnpm lint` passed with zero warnings.
- `pnpm exec tsc --noEmit --pretty false --incremental false` passed.
