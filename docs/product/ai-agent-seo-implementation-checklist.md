# WingsTravel AI Agent SEO Implementation Checklist

## Purpose

This checklist turns the `AI Agent SEO` requirement into concrete engineering
work for the app in `app/`.

Use it as an implementation and review checklist, not as a marketing document.

## Current App References

Primary code locations to inspect first:

- `app/src/utilities/generateMeta.ts`
- `app/src/utilities/getSiteSettings.ts`
- `app/src/utilities/siteContext.ts`
- `app/src/app/(frontend)/layout.tsx`
- `app/src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts`
- `app/src/app/(frontend)/(sitemaps)/posts-sitemap.xml/route.ts`
- `app/src/collections/Pages/index.ts`
- `app/src/collections/Posts/index.ts`

## Track 1: Research And Decision Capture

- [x] Confirm which public route types matter for launch:
  - home
  - standard pages
  - posts
  - service pages if added
  - landing pages if exposed publicly
- [x] Confirm which structured data types will ship in phase 1:
  - `Organization`
  - `WebSite`
  - `WebPage`
  - `Article`
  - `BreadcrumbList` utility only until visible breadcrumbs ship
  - `FAQPage` deferred until true visible FAQ content exists
- [x] Record the chosen subset in durable docs before broad rollout.
- [x] Record any route types deliberately excluded from phase 1.

## Track 2: Metadata Baseline

- [x] Review `generateMeta.ts` for site-aware title, description, canonical URL,
  Open Graph, and fallback behavior.
- [x] Ensure every launch-critical route can generate:
  - canonical URL
  - stable page title
  - stable description
  - social sharing image fallback
- [x] Ensure metadata is driven by site settings and document content, not
  duplicated hardcoded strings.
- [x] Verify child sites produce different metadata where expected.

US-008 implementation note:

- `generateMeta.ts` is the shared metadata path for pages, posts, posts archive,
  paginated posts archive, and search.
- Canonical and Open Graph URLs use normalized `site-settings.seo.canonicalDomain`.
- Search is explicitly `noindex, follow` because search result pages are not
  launch-critical indexable content.

## Track 3: Canonical And Indexable Public URLs

- [x] Define canonical URL rules for:
  - home pages
  - localized pages
  - posts
  - child-site paths or mapped domains
- [x] Prevent accidental canonical collisions across sites.
- [x] Review whether local path-prefix behavior leaks into production canonical
  logic.
- [x] Decide which routes should be indexable versus excluded.

US-008 canonical rule:

- Production canonical URLs are domain-first and come from `site-settings`, not
  from local path-prefix aliases such as `/wingsgo`.
- Home resolves to `/`, pages resolve to `/{slug}`, posts resolve to
  `/posts/{slug}`, and archive pages resolve to `/posts` or `/posts/page/{n}`.

## Track 4: Sitemap Coverage

- [x] Review existing sitemap routes for pages and posts.
- [x] Confirm sitemap output is site-aware where needed.
- [ ] Confirm localized public URLs are represented correctly.
- [x] Add sitemap coverage for any launch-critical route type not currently
  included.
- [x] Verify last-modified timestamps and canonical URLs are consistent.

US-008 sitemap note:

- Page and post sitemap routes now build `loc` per document/site using the same
  canonical helper as metadata.
- `/posts` archive entries are generated per site settings.
- Locale-specific sitemap expansion remains pending until US-004 finalizes
  locale-aware public routing.

## Track 5: Structured Data

- [x] Add a reusable JSON-LD utility layer instead of scattering ad hoc markup.
- [x] Implement site-level structured data where relevant:
  - `Organization`
  - `WebSite`
- [x] Implement page-level structured data where relevant:
  - `WebPage`
  - `BreadcrumbList` deferred until visible breadcrumb UI exists
- [x] Implement `Article` for posts where content structure is suitable.
- [x] Defer `FAQPage` until a page visibly contains FAQ entries.
- [x] Ensure structured data always matches visible on-page content.
- [ ] Validate JSON-LD output on representative pages before rollout.

US-009 implementation note:

- JSON-LD is generated in `app/src/utilities/structuredData.ts`.
- Rendering is centralized in `app/src/components/JsonLd.tsx`.
- Site-level schema is injected in `app/src/app/(frontend)/layout.tsx`.
- `WebPage` schema is injected in `app/src/app/(frontend)/[slug]/page.tsx`.
- `WebPage` plus `Article` schema is injected in
  `app/src/app/(frontend)/posts/[slug]/page.tsx`.
- `BreadcrumbList` and `FAQPage` are deliberately not emitted yet because the
  visible breadcrumb and FAQ content contracts are not implemented.

## Track 6: Page Hierarchy And Internal Linking

- [x] Define breadcrumb rules for public page hierarchy.
- [x] Ensure major pages link to related pages in human-meaningful ways.
- [x] Ensure site-specific navigation and footer links support crawlable
  structure.
- [x] Avoid orphaned launch-critical pages.

US-010 hierarchy and linking note:

- Pages use `Home / Parent / Page` when an optional same-site `parentPage` is
  populated; otherwise they use `Home / Page`.
- Posts use `Home / Posts / Post`.
- `BreadcrumbList` JSON-LD is emitted only from the same visible breadcrumb
  items rendered on the page.
- Pages expose optional same-site `relatedPages` links below page content for
  crawlable internal linking.

## Track 7: Payload Content Model Support

- [x] Review whether current collections expose enough fields for:
  - SEO title
  - SEO description
  - canonical URL override if needed
  - sharing image
  - breadcrumb label
  - FAQ content where applicable
- [x] Add missing fields only where they support stable editorial workflows.
- [x] Keep field design site-aware and locale-aware where required.

US-010 field note:

- Existing plugin SEO fields cover title, description, and sharing image.
- Added localized `meta.breadcrumbLabel` for pages and posts.
- Added same-site `parentPage` and `relatedPages` to pages.
- FAQ content remains deferred until a real FAQ block/page contract exists.

## Track 8: Server-Rendered Public HTML

- [ ] Verify critical entity information appears in public HTML and not only
  after client-side interaction.
- [ ] Verify titles, headings, and key content blocks render server-side on
  launch-critical routes.
- [ ] Verify public pages are still understandable when JavaScript enhancement
  is minimal.

## Track 9: Theme And SEO Alignment

- [ ] Ensure theme work does not weaken semantic HTML structure.
- [ ] Keep heading hierarchy meaningful within reusable blocks.
- [ ] Ensure CTA and navigation styling does not hide crawlable links behind
  inaccessible patterns.
- [ ] Keep site-specific theme overrides compatible with shared metadata and
  structured-data components.

## Track 10: Validation

- [ ] Build a manual validation checklist for representative routes:
  - one home page
  - one standard page
  - one post
  - one child-site page
- [ ] Check page source for metadata, canonical, and JSON-LD presence.
- [ ] Check sitemap outputs for the same routes.
- [ ] Run Google Rich Results Test or equivalent manual validation on selected
  pages when public URLs exist.
- [ ] Record proof and remaining gaps in Harness evidence or handover docs.

## Suggested Backlog Slice

If the team wants this split into small implementation slices, use this order:

1. Metadata and canonical cleanup
2. Sitemap completeness
3. Reusable structured-data utilities
4. Page and post JSON-LD rollout
5. Breadcrumb and internal-linking cleanup
6. Payload field additions and editorial documentation

## Done Definition

This work is not done when the team merely adds meta tags.

It is done when:

- the chosen SEO baseline is implemented on launch-critical routes
- structured data is correct and aligned with visible content
- child-site and locale behavior are still correct
- the implementation choices are written back into durable docs
