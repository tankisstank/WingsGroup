# US-050: Wire WingSide discovery sections to real tours

## Status

Locally accepted on 2026-07-25. Production deployment remains outside this
story and is still governed by the release gates in the Harness.

## Current Behavior

The former implementation rendered product-like facts from static bindings.
US-050 now stores governed Page-to-TourProduct curation and projects real,
published, same-site records at the server boundary. Any incomplete or invalid
configuration fails closed.

## Target Behavior

The approved Home layout remains visually stable while destination/style
sections are backed by classified inventory and Sample Journeys project real,
CMS-selected `TourProduct` records.

## User Story

As a WingSide traveler, I want discovery cards to represent tours the operator
actually manages so that the destination, style, price and CTA I choose remain
truthful through Tour Detail.

## Acceptance Criteria

1. Home exposes six destination slots and six style slots in the approved order.
2. Each slot is backed by a published, same-site TourProduct carrying the matching tag.
3. Sample Journeys contains exactly three explicitly selected real tours.
4. Sample cards use real title, hero image, summary, duration, price/currency and URL.
5. Editor can replace/reorder selections without a frontend code change.
6. Unpublished, missing or cross-site relationships do not render.
7. Required missing selections produce a validation finding, not a static-tour fallback.
8. Existing `data-od-id` marker contract remains stable.
9. Desktop 1440x900 and mobile 390x844 remain visually aligned with the prototype.
10. No overflow at 360, 390, 430, 768, 1024 and 1440 px.
11. Destination/style filtering returns only matching published WingSide tours.
12. `BUG-WS-001` is closed with automated proof that static sample-tour facts are unused.

## Dependencies

- US-049 migration and taxonomy backfill accepted locally.
- Three featured tours and twelve representative slot selections approved by editorial.
- Tour wrapper/detail URLs remain valid.

## Non-Goals

- Rebuilding Tour Detail.
- Importing new inventory.
- Real-time pricing or availability.
- Changing the approved Home visual hierarchy.

## Accepted Selection

- Destinations: Hanoi 491, Ha Long 226, Hoi An 506, Hue 486, Mekong 326, Sapa 442.
- Styles: Luxury 533, Family 517, Culture 504, Adventure 518, Wellness 498, Romance 534.
- Featured journeys: 504, 491, 486.
