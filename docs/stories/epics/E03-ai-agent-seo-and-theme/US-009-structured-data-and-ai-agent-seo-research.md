# US-009 Structured Data And AI Agent SEO Research

## Status

implemented

## Lane

normal

## Product Contract

Phase 1 must choose and implement a bounded structured-data baseline that helps
public pages remain understandable to search systems and browsing agents, while
staying aligned with visible content and search-engine policies.

## Relevant Product Docs

- `docs/product/ai-agent-seo-and-theme.md`
- `docs/product/ai-agent-seo-implementation-checklist.md`

## Acceptance Criteria

- The project records which structured-data types are adopted in phase 1.
- A reusable JSON-LD implementation path exists instead of page-by-page ad hoc markup.
- The selected markup set is applied to the appropriate representative page types.
- Research notes and implementation choices are written back into durable docs.

## Design Notes

- Commands: JSON-LD generation and structured-data validation.
- Queries: page, post, and site-level data needed for schema output.
- API: site-level and page-level schema injection in frontend layout/routes.
- Tables: pages, posts, site settings, future FAQ-capable content if applicable.
- Domain rules: schema must match visible content exactly.
- UI surfaces: public pages and posts.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Schema builders for supported types |
| Integration | JSON-LD output on representative routes |
| E2E | Public page source includes selected schema correctly |
| Platform | Manual validation against selected external tools when possible |
| Release | Research note and rollout note complete |

## Harness Delta

This story gives AI Agent SEO research a durable engineering home instead of a
generic SEO note.

## Evidence

### Research Sources

- Google Search Central structured data guidelines: JSON-LD is the preferred
  maintainable format where supported, and structured data must match visible
  page content.
- Google Search Central `Organization` guidance: organization markup belongs on
  the home page or an organization description page and must use real public
  organization details.
- Google Search Central `BreadcrumbList` guidance: breadcrumb markup should
  represent a user path and is eligible only when required properties are
  present.
- Google Search Central `FAQPage` guidance: FAQ rich result markup applies only
  to pages that visibly contain FAQ content.
- Schema.org references for `Organization`, `WebSite`, `WebPage`,
  `BreadcrumbList`, `Article`, and `FAQPage`.
- OpenAI search/crawler guidance: AI-assisted search requires crawlable public
  pages and host/CDN/robots access for relevant crawlers.

### Adopted In Code

- `Organization` from `site-settings` in
  `app/src/app/(frontend)/layout.tsx`.
- `WebSite` from `site-settings` in `app/src/app/(frontend)/layout.tsx`.
- `WebPage` for public CMS pages in
  `app/src/app/(frontend)/[slug]/page.tsx`.
- `WebPage` and `Article` for post detail pages in
  `app/src/app/(frontend)/posts/[slug]/page.tsx`.
- Reusable JSON-LD generation path in `app/src/utilities/structuredData.ts`.
- Centralized script rendering in `app/src/components/JsonLd.tsx`.

### Deferred

- `BreadcrumbList` emission is deferred until US-010 adds visible breadcrumb UI
  and hierarchy rules. The utility builder exists for that rollout.
- `FAQPage` is deferred until a visible FAQ block or page contract exists.
- Service/tour schema is deferred until a stable service/tour collection exists.

### Representative JSON-LD Shape

Home/page routes emit a graph containing `Organization`, `WebSite`, and
`WebPage`. Post detail routes emit `Organization`, `WebSite`, `WebPage`, and
`Article`. Canonical URLs are built through the shared site URL helper instead
of a separate schema-only URL path.

### Validation Notes

- Static validation added for JSON-LD builders and serialization.
- 2026-05-27 supervisor audit: removed premature `BreadcrumbList` route emission
  from page and post routes so implementation matches the documented deferral
  until US-010 ships visible breadcrumb UI and hierarchy rules.
- 2026-05-27 supervisor validation: `cd app; pnpm run test:int` passed with 4
  test files and 12 tests.
- 2026-05-27 supervisor validation: `cd app; pnpm lint` remains blocked before
  code linting by the existing ESLint 9 circular config error.
- 2026-05-27 supervisor validation: full `tsc --noEmit` remains blocked by
  existing baseline issues, but filtering the typecheck output for touched
  US-003/US-009/US-011 files returned no matching errors.
- External rich-result validation remains pending until public URLs exist.

2026-05-27 proof completion:

- Added Playwright smoke coverage that parses public
  `script[type="application/ld+json"]` on `/wingsgo/campaign`.
- E2E asserts the rendered graph includes `Organization`, `WebSite`,
  `WebPage`, and `BreadcrumbList`, proving structured data is present in public
  HTML and aligned with visible breadcrumb content.

Validation:

- `pnpm run test:e2e` passed outside sandbox with 14 tests.
- `pnpm lint` passed with zero warnings.
- `pnpm exec tsc --noEmit --pretty false --incremental false` passed.
