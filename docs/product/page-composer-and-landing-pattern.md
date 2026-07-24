# WingsGroup Page Composer And Landing Pattern

## Purpose

Phase 1 uses the Payload `pages` collection as the reusable page and landing
page composer. Editors should create standard marketing pages and campaign
landing pages by changing structured fields and blocks, not frontend code.

## Composer Baseline

The current composer surface is:

- `hero`: editable hero type, rich text, media, and CTA links.
- `layout`: ordered block list for content, media, CTA, form, archive, stats,
  testimonials, comparison, FAQ, feature, pricing, info-strip, and reusable
  credentials/awards carousel sections.
- `layoutPresetKey`: provenance for pages generated from a code-owned preset.
- `meta`: SEO title, description, image, and breadcrumb label.
- `parentPage` and `relatedPages`: hierarchy and crawlable internal linking.
- `site` and localized fields: site-aware and locale-aware editorial control.

## Guided Creation

Phase 1 includes a guided creation flow at `/admin/page-wizard` with template
scaffolds for common WingsGroup use cases. The current wizard uses code-owned
layout presets:

- Homepage editorial
- Homepage service hub
- Destination showcase
- Tour conversion
- Service detail
- Campaign launch
- Lead capture
- Contact and support
- Pricing and package comparison
- Magazine and content hub
- Long-form guide
- Trust and social proof

For lead-oriented presets, the wizard attempts to attach a site-relevant
`formBlock` when a form exists. All wizard outputs are draft pages. A generated
page stores a snapshot of `hero` and `layout`; future preset updates do not
mutate existing pages.

## Phase 1 Landing Pattern

The reusable campaign landing pattern must include these block types:

- `content`: campaign promise, proof points, or value proposition.
- `mediaBlock`: editable visual proof or campaign image.
- `cta`: primary conversion action.
- `formBlock`: inquiry or contact capture using a Payload form.

The seed/sample implementation creates a `/campaign` page per site using this
pattern. The copy and images are placeholders for customer-approved content, but
the structure is production-relevant and editable from Payload.

## Editorial Rule

Adding a normal campaign variant should require CMS edits only:

- update hero copy and image
- update proof/supporting sections
- update CTA labels and destinations
- select the relevant form
- update SEO metadata and breadcrumb label

Frontend code changes are reserved for new block types or structural behavior,
not routine campaign page creation.

## Reusable Credentials And Awards

The `credentialsCarousel` block is the governed module for certificates,
awards, memberships, and standards. Editors can place it in the localized
`layout` of any Page and control:

- section eyebrow, title, description, and accessible label
- full-width presentation, autoplay, and transition interval
- one to twelve ordered records
- record type, Media Library image/logo, fallback mark, label, title, and body

Claims must only be published while their source record is verified and
current. Removing an uploaded image falls back to the editor-provided mark; it
does not replace or fabricate a credential. On the WingSide hi-fi Home route,
the first configured credentials block replaces the legacy fallback carousel
at its locked design position. On other Page Composer routes, the block renders
in the configured layout order.
