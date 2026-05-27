# WingsTravel Page Composer And Landing Pattern

## Purpose

Phase 1 uses the Payload `pages` collection as the reusable page and landing
page composer. Editors should create standard marketing pages and campaign
landing pages by changing structured fields and blocks, not frontend code.

## Composer Baseline

The current composer surface is:

- `hero`: editable hero type, rich text, media, and CTA links.
- `layout`: ordered block list for `content`, `mediaBlock`, `cta`, `formBlock`,
  and `archive`.
- `meta`: SEO title, description, image, and breadcrumb label.
- `parentPage` and `relatedPages`: hierarchy and crawlable internal linking.
- `site` and localized fields: site-aware and locale-aware editorial control.

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
