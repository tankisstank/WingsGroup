# WingsTravel AI Agent SEO And Theme System

## Purpose

This document adds two phase-1 product requirements that should not stay
implicit:

- the site must be optimized not only for traditional SEO, but also for AI
  agents and AI-assisted search surfaces
- the project must ship with a coherent theme system suitable for a multisite
  brand family

## AI Agent SEO Requirement

Phase 1 must include a bounded research and implementation track for
`AI Agent SEO`.

The goal is not to invent a separate crawler-only website. The goal is to make
the public site easier for search systems, AI-assisted search, and browsing
agents to understand using clean, public, machine-readable signals.

## Current Practical Direction

Based on current official guidance and platform behavior, the minimum direction
for phase 1 is:

- use clean canonical URLs for public pages
- maintain XML sitemap coverage for launch-critical routes
- use structured data that matches visible content and supported page types
- keep page hierarchy explicit with breadcrumbs and internal linking
- maintain clear titles, descriptions, headings, and entity names
- keep important service and site information available in public HTML, not only
  in client-side interaction

## Structured Data Baseline

The implementation should evaluate and apply the relevant subset of:

- `Organization`
- `WebSite`
- `WebPage`
- `BreadcrumbList`
- `Article` where editorial content exists
- `FAQPage` only where the page truly contains FAQ content

Structured data must stay aligned with visible content and comply with search
engine policies. It is not acceptable to add misleading or hidden markup.

### US-009 Phase 1 Decision

Reviewed sources:

- Google Search Central general structured data guidelines and JSON-LD
  introduction.
- Google Search Central documentation for `Organization`, `BreadcrumbList`, and
  `FAQPage`.
- Schema.org type references for `Organization`, `WebSite`, `WebPage`,
  `BreadcrumbList`, `Article`, and `FAQPage`.
- OpenAI crawler/search guidance that public AI-assisted search visibility
  depends on crawlable public pages, robots/CDN access, and clear public
  content.

Adopted for the first implementation path:

- `Organization`: emitted once per public layout from site settings.
- `WebSite`: emitted once per public layout from site settings.
- `WebPage`: emitted on CMS pages and post detail routes.
- `Article`: emitted on post detail routes when a post is rendered.

Deferred until visible content and route assumptions are stable:

- `BreadcrumbList`: builder exists, but page emission is deferred until US-010
  adds visible breadcrumb UI and hierarchy rules.
- `FAQPage`: deferred until a true FAQ block or FAQ page exists and the same
  question/answer content is visible on the page.
- Service/tour-specific schema: deferred until a dedicated services or tour
  collection exists.

Implementation path:

- JSON-LD must be generated through `app/src/utilities/structuredData.ts` and
  rendered through `app/src/components/JsonLd.tsx`.
- Public layout owns site-level schema only.
- Page and post routes own document-level schema only.
- Canonical URL construction is shared with the metadata path and should not be
  forked inside schema builders.

## Research Output Required

Phase 1 should not treat this as an ad hoc SEO note. It needs a small durable
output:

- what AI-agent-oriented SEO patterns were reviewed
- which structured data types are adopted in `WingsTravel`
- which routes receive markup first
- what content fields need to exist in Payload to support this cleanly
- what validation checks are used before release

## Implementation Output Required

- site-level metadata defaults
- page-level metadata rules
- sitemap coverage for public launch routes
- breadcrumb-capable page hierarchy where applicable
- structured data injection for selected page types
- internal linking rules that help humans and agents navigate site structure

## Theme System Requirement

Phase 1 must include a theme system suitable for the first release and for the
multisite model.

The theme system should define:

- brand colors
- typography direction
- spacing rhythm
- CTA styles
- header and footer treatment
- reusable section styling for marketing pages and landing pages

## Multisite Theme Rule

The theme system must support:

- one shared design foundation
- site-specific brand overrides where approved
- consistent editorial composition across child sites

This means the project should avoid both extremes:

- a single rigid look that ignores site identity
- a fully fragmented per-site design approach that breaks reuse

## Theme Foundation Implementation Notes

The frontend theme foundation is implemented as shared CSS variables and
component classes, with site overrides applied from Payload `site-settings`.

Current phase-1 baseline:

- Shared tokens live in `app/src/app/(frontend)/globals.css` for brand/accent
  colors, surface, border, radius, section spacing, card, media, nav, header,
  and footer chrome.
- Site-specific overrides are applied in `app/src/app/(frontend)/layout.tsx`
  through `--site-brand` and `--site-accent`, sourced from
  `branding.brandColor` and `branding.accentColor`.
- Tailwind prose styling uses the same site brand/accent variables so rich text,
  links, bullets, CTAs, and reusable blocks stay visually coherent.
- Header, footer, and marketing blocks keep semantic elements such as `header`,
  `nav`, `footer`, `section`, and `aside`, and continue using `CMSLink` and
  `SiteLink` so public links remain crawlable and site-aware.

Future extensions should add new theme behavior by extending the shared
`--site-*` tokens or theme component classes first. Per-site exceptions should
remain controlled settings, not one-off page CSS.

## Acceptance Direction

Phase 1 is not complete unless:

- AI Agent SEO has both research notes and implementation choices recorded
- the selected SEO features are applied to launch-critical routes
- the theme system is visible in the delivered public experience
- the theme system is documented well enough for future extension
