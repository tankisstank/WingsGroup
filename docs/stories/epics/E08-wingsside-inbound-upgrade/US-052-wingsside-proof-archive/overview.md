# US-052 - Redesign WingSide credentials as Proof Archive

## Current Behavior

The WingSide home credentials section renders as a carousel-like band. The live
data path verified for this story is:

`Payload Page 142 localized layout -> queryPageByPath(depth=3) -> filterCmsLayoutBlocksForHiFiComposer -> WingsSideHiFiPageBody -> HomeHiFiPage -> RenderBlocks -> CredentialsCarouselBlock -> CredentialsCarousel`.

Production content contains 24 CMS rows per locale, with 21 public verified
records. The previous renderer could fall back to `copy.creds.slides`, and the
legacy `wingsSideHiFi.home.credentials` seed/dispatch surface could carry sample
records separate from the CMS block.

## Target Behavior

The credentials section is a responsive Proof Archive backed only by CMS
`credentialsCarousel.items`. It preserves `data-od-id="home-creds"`, semantic
section rendering, locale routing, the depth-3 Payload Media relationship
pipeline, and WingSide hi-fi composer boundaries.

Only verified `cert` and `award` records with stable row IDs and populated Media
relationships render publicly. Unsupported `member` and `iso` rows remain
compatible as stored data but are excluded from this two-filter archive. There is
no runtime fallback to locale credential records and no JavaScript autoplay
timer. The visible credential index is a single horizontal, continuously moving
card rail; it pauses on hover or keyboard focus and disables movement for visitors
who request reduced motion.

## Affected Users

- Public WingSide visitors inspecting airline appointments and awards.
- CMS editors authoring WingSide credentials and awards.
- QA/release reviewers verifying fixed-frame responsive behavior.

## Affected Product Docs

- `docs/product/page-composer-and-landing-pattern.md`
- `docs/stories/epics/E08-wingsside-inbound-upgrade/US-047-reusable-credentials-carousel-block.md`

## Non-Goals

- No destructive migration.
- No production database access or production data mutation.
- No changes outside the WingSide credentials section and its mapping/tests.
- No Plane API sync from this feature worker.
