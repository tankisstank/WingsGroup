# 0030 — WingSide Journeys v2 price posture

## Decision

`TourProduct.priceFrom` is not a per-person commerce claim. Journeys v2 only
permits a per-person display when a future group departure has positive price,
valid currency, explicit `per-person` basis, verified availability and an
actual CTA capability. Until all conditions are present, group cards show
Schedule on request; missing or private tour type maps to private and shows
Tailor-made quote.

## Consequence

The schema is additive and contains no data backfill. Existing product prices
remain on-request at the public discovery boundary.
