# US-056: Restore complete WingSide tour locales

## Status

in_progress — production restoration and strict verification are documented on
2026-07-29; the 2026-09-25 live UI spot-check found remaining locale display
defects, with a local fix awaiting release and full acceptance QA still open.

## Lane

high-risk

## Current Behavior

The 22 WingSide tours are discoverable again in production, but their
localized `TourProduct` presentation data is incomplete.

Strict production API reads with `fallbackLocale: false` show that `vi`, `es`,
`it` and `pt` each have:

- `0/22` localized tour titles and summaries.
- `0/22` localized route, CTA and SEO metadata fields.
- `0/116` localized itinerary titles, routes and summaries.
- `0/331` localized inclusion labels.

The localized wrapper Pages remain present and translated. The approved
editorial catalog also remains in the repository and its focused unit suite
passes `9/9`. The production regression is therefore in the localized
`TourProduct` data/write path, not in the approved source content.

The `/journeys` pages currently remain populated through English fallback.
This avoids an empty result page but produces mixed-language cards. Vietnamese
and Portuguese also contain unaccented price copy, while Spanish, Italian and
Portuguese duration labels do not handle singular forms correctly.

## Target Behavior

All 22 published WingSide tours render complete, approved content in
`en`, `vi`, `es`, `it` and `pt` on both the Journeys listing and Tour Detail.
Canonical inventory and taxonomy may use a controlled English fallback for
identity and eligibility, but user-facing title, summary, itinerary, service
and metadata fields must come from the requested locale.

No runtime machine translation or silent English presentation fallback is
allowed for the four translated locales. A release must fail before promotion
if any required localized field is missing, copied verbatim from English or
fails the locale copy checks.

## User Story

As a WingSide visitor, I want journey cards and tour details to be complete in
my selected language so that I can evaluate and request a private journey
without mixed-language or blank content.

## Acceptance Criteria

- Strict locale API is complete for all 88 translated tour pairs.
- Journeys renders 22 fully localized cards in every public locale.
- All 110 localized Tour Detail routes pass the content matrix.
- Accent, pluralization and English-leak checks pass in every locale.
- Restore apply, verify, idempotence and rollback evidence passes.
- Maintenance writes preserve every localized editorial checksum.

## Acceptance Detail

The detailed field counts, copy rules, backup requirements and canary gates
for these six criteria are defined in `validation.md`.

## Affected Users

- WingSide visitors using Vietnamese, Spanish, Italian or Portuguese.
- Editors responsible for approved tour translations.
- Release operators applying and verifying production content plans.
- Reviewers checking locale quality and SEO continuity.

## Affected Product Docs

- `docs/product/wingsside-tour-discovery-and-taxonomy.md`
- `docs/product/tour-product-platform.md`
- `docs/product/wingsside-identity-contract.md`
- `source/strategy/25 Yêu cầu taxonomy và real-tour discovery cho WingSide.md`

## Dependencies

- US-045 remains the exact 22-tour source inventory.
- US-049 remains the taxonomy contract.
- US-054 remains the Journeys discovery behavior.
- US-055 remains complete and is referenced only for its accepted locale
  editorial catalog and production tooling.

## Non-Goals

- Reopening or changing the Why Travel mapping delivered by US-055.
- Translating additional locales outside `vi`, `es`, `it` and `pt`.
- Importing more tours or changing the 22-tour taxonomy.
- Runtime machine translation or word-for-word automatic translation.
- Redesigning the Journeys grid or Tour Detail information architecture.
