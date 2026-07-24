# WingSide Tour Discovery And Taxonomy

## Purpose

This document defines how real WingSide `TourProduct` records power destination,
travel-style, and featured-journey discovery without replacing the approved
hi-fi composition.

## Source Of Truth

- Product truth: `tour-products` scoped to tenant code `wing-side`; the
  intentionally separate theme key remains `wings-side`.
- Imported baseline: batch `wingsside-bestprice-22-20260717`.
- Route truth: the published `wrapperPage` belonging to the same site.
- Home curation truth: explicit CMS relationships and order, not component
  constants or translated titles.

## Controlled Taxonomy

### Destination keys

The six approved Home-card keys remain stable:

- `hanoi`
- `halong`
- `hoian`
- `hue`
- `mekong`
- `sapa`

The imported inventory also needs governed keys for real destinations that do
not belong to the six Home cards:

- `ninh-binh`
- `mai-chau`
- `da-nang`
- `ho-chi-minh-city`
- `phu-quoc`
- `ninh-thuan`
- `siem-reap`

One tour may carry multiple destination keys. Labels are localized separately.
The extended keys make the 22-tour map truthful; they do not add Home cards.

### Travel-style keys

- `luxury`
- `family`
- `culture`
- `adventure`
- `wellness`
- `romance`
- `business`

These are governed multi-select values. They are not free-form tags and are not
derived from title text at render time.

### Product eligibility

A tour is eligible for discovery only when all conditions hold:

- site is WingSide;
- publication status is published;
- `wrapperPage` exists and belongs to WingSide;
- `heroMedia`, localized title and summary exist;
- at least one destination and one travel style exist;
- price/currency are present when a price is displayed.

## CMS Curation Contract

Home needs three ordered relationship groups:

1. `destinationTourSelections`: six keyed slots;
2. `styleTourSelections`: six keyed slots;
3. `featuredJourneySelections`: exactly three ordered tour relationships.

Relationship filters must enforce same-site records. Validation must reject a
destination/style selection whose tour does not contain the matching taxonomy
key. Unpublished or deleted relationships produce an explicit validation gap.

## Card Projection

### Destination discovery

Each destination card keeps the approved destination label and visual slot, but
its representative image and supporting copy come from the selected real tour.
The CTA contract must be explicit in the CMS decision:

- destination hub CTA when the card is category-first; or
- selected Tour Detail CTA when the card is product-first.

Wave-1 acceptance must choose one mode consistently and must not mix hidden
static URLs with real product content.

### Travel-style discovery

The six style cards remain stable category entry points. A selected real tour
proves that each style is backed by actual inventory. The style page/filter may
then list all published tours carrying the same stable style key.

### Sample Journeys

Each card projects these values from `TourProduct`:

- hero thumbnail, with CMS override only when explicitly modeled;
- localized title and summary;
- duration days/nights;
- `priceFrom` and `currency`;
- approved badge/priority label;
- public wrapper/tour-detail URL.

No sample price, duration, image, title or URL may come from `copy.packages` or
`wingsSideHiFiCardBindings`.

## Empty And Invalid States

- Missing optional slots may be hidden with layout-safe spacing.
- Required Sample Journey slots block release validation.
- Invalid cross-site or unpublished references never render.
- The UI must not substitute a static card that looks like a real tour.
- Audit output names the missing slot and reason.

## Import And Backfill

The 22-tour mapping is maintained in the US-049 data map. The implementation
must provide:

- dry-run output before mutation;
- deterministic update plan by `sourceProvenance.importBatchId` and tour ID;
- transaction or equivalent rollback-safe apply;
- idempotence proof after apply;
- PostgreSQL migration and CRUD smoke;
- no mutation of WingsGo or other site records.

US-049 implements these values as controlled Payload `select` arrays on
`TourProducts`, with a separate read-only `taxonomyProvenance` audit object.
The query contract always combines the stable key with current-site and
publication filtering.

## Observability And Review Markers

Cards retain stable `data-od-id` markers. Add non-public diagnostic attributes
only when needed for tests, such as the selected tour ID/slug. Marker identity
must not depend on translated title.

## Acceptance Summary

- 22-tour taxonomy coverage is complete and reviewed.
- Home has six destination cards, six style cards and three real sample tours.
- Editors can replace and reorder selections through Payload.
- Public cards contain no static tour facts.
- Route, locale, site and publication filtering are covered by tests.
