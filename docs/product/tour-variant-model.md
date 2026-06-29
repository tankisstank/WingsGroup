# Tour Variant Model

## Purpose

`departure-variants` exist to prevent cloning full tour pages when the public
tour is mostly the same but a subset of content changes by origin, airline, or
line presentation.

## Current Contract

Each variant belongs to one base `tour-product` and may override:

- summary
- hero media
- route visual
- service summaries
- selected itinerary day fields

Each variant may also link the departures that belong to it.

## Fields

Key fields:

- `tourProduct`
- `variantKey`
- `label`
- `status`
- `departureCity`
- `airline`
- `displayPriority`
- `summaryOverride`
- `heroMediaOverride`
- `rvo`
- `servicesOverride`
- `itineraryDayOverrides`
- `activeDepartures`

## Merge Rules

When resolving a public page:

1. load base `tour-product`
2. load active variants for that product
3. choose the featured/active variant
4. merge allowed overrides only
5. apply departure-level commerce notes

Variants are not allowed to change:

- product slug
- canonical identity
- related-tour truth
- FAQ truth unless the model is extended later
- arbitrary section registry shape
