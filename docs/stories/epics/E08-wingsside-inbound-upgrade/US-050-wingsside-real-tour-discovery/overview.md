# US-050: Wire WingSide discovery sections to real tours

## Status

Production released on 2026-07-25 in immutable release
`d35825129aae198aad6f2377feafb5960c37df03`.

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

Selections are bound to stable `sourceProvenance.sourceId` values and resolved
to environment-specific relation IDs inside the WingSide tenant. Production
resolved the approved set to:

- Destinations: Hanoi 63, Ha Long 68, Hoi An 70, Hue 62, Mekong 71, Sapa 79.
- Styles: Luxury 81, Family 76, Culture 69, Adventure 77, Wellness 78, Romance 82.
- Featured journeys: 69, 63, 62.
