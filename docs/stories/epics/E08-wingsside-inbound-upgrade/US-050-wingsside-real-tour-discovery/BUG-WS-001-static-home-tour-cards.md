# BUG-WS-001: Home Sample Journeys renders static tour data

## Resolution

Closed locally on 2026-07-25 by US-050.

Sample Journeys now render only a ready real-tour projection. Missing,
unpublished, cross-site, incomplete or unconfigured curation produces the
explicit empty state; it cannot fall back to static titles, prices, images or
URLs. Component and runtime audit proof cover this behavior.

## Classification

- Type: content-integrity defect
- Severity: P0 for public go-live
- Owner story: US-050
- Discovered during: post-US-048 product-data review

## Observed Behavior

`HomeHiFiPage` builds Sample Journeys from `copy.packages.cards.slice(0, 3)` and
static media bindings. Titles, summaries, prices and links can look like real
inventory while not corresponding to the 22 imported `TourProduct` records.

Destination and style cards are also static bindings, but their current visual
role is category navigation. They are tracked as the broader US-050 integration
gap; the false product facts in Sample Journeys are the release-blocking defect.

## Expected Behavior

Each Sample Journey is an explicitly selected, published WingSide TourProduct.
Every displayed product fact and CTA resolves from Payload.

## Reproduction

1. Open `/wingsside`.
2. Inspect the three Sample Journey cards.
3. Compare their title, price, duration, image and href with the selected 22-tour records.
4. Observe that the current renderer sources values from static copy/bindings.

## Risk

- Public display of a non-authoritative price.
- CTA to a package route instead of the real tour detail.
- Editor changes in Payload do not update Home.
- Visual QA can pass while product truth is wrong.

## Fix Contract

- Implemented by US-050 after US-049 taxonomy readiness.
- Remove product-like static fallback.
- Add tests proving values match selected Payload records.
- Local data, DOM and browser evidence passed; production release remains a
  separate go-live decision.
