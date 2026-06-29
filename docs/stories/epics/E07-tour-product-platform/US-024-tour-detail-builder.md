# US-024 Tour Detail Builder

## Status

implemented

## Lane

high-risk

## Product Contract

`WingsGo` must have a governed tour detail builder that can reproduce a dense
BestPrice-style tour page while keeping the core tour, departure, and itinerary
data tied to structured CMS records instead of generic landing-page blocks.

The first goal is a copy-first public rendering close to the benchmark.

The second goal is a reusable builder surface that editors can use to create
future tour pages faster and with controlled flexibility, including itinerary
section configuration and optional section ordering.

## Relevant Product Docs

- `docs/product/tour-product-platform.md`
- `docs/product/layout-preset-library.md`
- `docs/product/page-composer-and-landing-pattern.md`
- `source/notes/07 Research vong 2 VietWings/94-ui-preview-review-va-thiet-ke-de-xuat.md`
- `source/strategy/21 Kế hoạch triển khai production theo site WingsTravel.md`

## Acceptance Criteria

- The platform provides a governed tour detail builder or template system with
  approved section types for travel-product pages.
- A `WingsGo` tour page can render these sections from structured data:
  hero summary, decision facts, why choose this trip, map/route, itinerary,
  inclusions/exclusions, departure table, FAQ, related tours, and sticky CTA.
- Editors can toggle and order approved optional sections without breaking the
  core product truth.
- The itinerary section supports structured day-by-day rendering and bounded
  overrides for future flexible itinerary handling.
- The public tour page is visually dense and decision-friendly on desktop and
  mobile, close to the BestPrice benchmark but still site-aware and brand-aware.
- The design leaves a clean extension point for phase-2 lead form and booking
  intent without redesigning the page architecture.

## Design Notes

- Builder surface:
  - governed template or section registry for tour pages
  - distinct from generic `Pages.layout`
  - current phase implements foundation fields and renderer contracts, not a
    drag/drop admin builder UI
- Approved section types:
  - `HeroSummary`
  - `DecisionFacts`
  - `WhyChooseThisTrip`
  - `TripMap`
  - `ItineraryTimeline`
  - `InclusionExclusion`
  - `DepartureTable`
  - `ReviewsProof`
  - `FAQ`
  - `RelatedTours`
  - `StickyBookingCTA`
- Domain rules:
  - section copy may be editable where allowed
  - core departure data must resolve from structured records
  - itinerary is a structured array, not a single long rich-text blob
  - future lead and booking modules should mount into reserved conversion zones
- UI surfaces:
  - primary: `WingsGo` tour detail
  - secondary reuse: market page cards, campaign embeds, schedule modules

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Section registry and itinerary/section mapping tests validate allowed builder shapes. |
| Integration | Payload admin surfaces and frontend resolvers load approved section configs without arbitrary layout escape hatches. |
| E2E | Editor creates or edits a structured tour page, previews desktop/mobile output, and changes section visibility/order within allowed rules. |
| Platform | A seeded `WingsGo` tour page visually matches the intended dense travel-product pattern and remains responsive. |
| Release | Visual screenshots compare the implemented tour detail against the benchmark and show a stable extension point for later lead/booking work. |

## Harness Delta

Adds a durable packet for the governed tour-page builder so implementation does
not drift into an unbounded generic page-composer solution.

## Evidence

- Public renderer now uses a governed section model for:
  - hero
  - facts
  - reviews
  - route
  - itinerary
  - services
  - departures
  - FAQ
  - related
  - sticky CTA
- Schedule page now has browse-and-convert structure with featured departures,
  filters, grouped rows, trust strip, and CTA band.
- Validation:
  - `pnpm run generate:types`
  - `pnpm exec tsc --noEmit`
  - `pnpm run build`

## Beta Hardening Delta

- Conversion CTAs across the tour detail (hero, departure matrix, sticky band),
  the departure strip, and the schedule module now emit a machine-readable
  inquiry path via `getTourInquiryPath({ tourSlug, tourId, departureId, intent,
  source })`, reserving the phase-2 lead/booking prefill contract without
  implementing a form.
- Full-card overlay links that competed with inner CTAs were removed from the
  market card, departure strip, and `PricingTable` block; the title/image is now
  the explicit link and each CTA is a real, separately focusable control.
- Renderer prop types adopt the typed view models (`TourCardViewModel`,
  `DepartureCardViewModel`, `MarketPageViewModel`, `SchedulePageViewModel`).
- Public seed copy for schedule/market/tour/campaign wrapper pages was cleaned
  of internal/technical language.
- See `docs/product/tour-product-platform.md` → "Beta Hardening" for the full
  contract, accessibility pattern, and validation matrix.
