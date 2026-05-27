# US-010 Breadcrumbs, Internal Linking, And SEO Fields

## Status

implemented

## Lane

normal

## Product Contract

The site must expose clear hierarchy and crawlable relationships, and Payload
must contain the minimum SEO-supporting fields required for durable editorial
operation across sites and locales.

## Relevant Product Docs

- `docs/product/ai-agent-seo-and-theme.md`
- `docs/product/ai-agent-seo-implementation-checklist.md`
- `docs/product/editorial-operations.md`

## Acceptance Criteria

- Breadcrumb-capable hierarchy exists where route structure supports it.
- Launch-critical pages are not orphaned from meaningful internal links.
- Payload collections expose the minimum fields needed for stable SEO
  management on selected page types.
- New fields remain site-aware and locale-aware where needed.

## Design Notes

- Commands: update page hierarchy, define internal link rules, extend SEO fields.
- Queries: page hierarchy reads, SEO field reads, related-page linking.
- API: frontend breadcrumb rendering and collection field usage.
- Tables: pages, posts, site settings, future service-like collections if added.
- Domain rules: semantic structure must survive theme and layout reuse.
- UI surfaces: page templates, navigation, breadcrumb UI, editor forms.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Breadcrumb and linking helpers |
| Integration | Collection field support and route hierarchy behavior |
| E2E | Representative page navigation and breadcrumb rendering |
| Platform | Multisite route smoke check |
| Release | Editorial SEO field checklist complete |

## Harness Delta

This story converts hierarchy and content-model support into a bounded
implementation packet.

## Evidence

2026-05-27 implementation:

- Added reusable breadcrumb helpers in `app/src/utilities/breadcrumbs.ts`.
- Added visible breadcrumb UI in `app/src/components/Breadcrumbs.tsx`.
- Page detail routes now render visible breadcrumbs and emit `BreadcrumbList`
  only from the same visible breadcrumb items.
- Post detail routes now render `Home / Posts / Post` breadcrumbs and emit
  matching `BreadcrumbList` JSON-LD.
- Added `parentPage`, localized `meta.breadcrumbLabel`, and `relatedPages` to
  the Pages collection for hierarchy and internal linking.
- Added localized `meta.breadcrumbLabel` to Posts for editorial breadcrumb
  labels.
- Added `RelatedPages` rendering below page content so editors can expose
  crawlable same-site internal links and reduce orphaned launch-critical pages.
- Kept URL shape unchanged: hierarchy is editorial/semantic for phase 1 and
  does not introduce nested route paths before US-004 routing work.

Route samples:

- Home page: one breadcrumb item only; visible breadcrumb and `BreadcrumbList`
  are suppressed.
- Standard page: `Home / Page` or `Home / Parent / Page` when `parentPage` is
  populated.
- Post detail: `Home / Posts / Post`.

Validation:

- `cd app; $env:DATABASE_URL='file:./payload-us010-test.db'; pnpm run test:int`
  passed outside sandbox with 5 files and 18 tests after sandbox `spawn EPERM`.
- `cd app; pnpm lint` remains blocked before project linting by the existing
  ESLint 9 circular config error.
- Full `tsc --noEmit` still fails on existing baseline issues, but filtered
  output for US-010 touched files returned no matching errors after fixing the
  touched `Posts.index` filterOptions type issue.

2026-05-27 launch smoke update:

- Added Playwright smoke assertion that `/wingsgo/campaign` renders visible
  breadcrumb navigation containing `Campaign`.
- `pnpm run test:e2e` passed outside sandbox with 10 tests.
- `pnpm lint` passed with zero warnings.
- `pnpm exec tsc --noEmit --pretty false --incremental false` passed.
