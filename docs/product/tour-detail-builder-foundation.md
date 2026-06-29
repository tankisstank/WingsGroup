# Tour Detail Builder Foundation

## Purpose

This document defines the builder-ready foundation already implemented for
`WingsGo` tour detail pages.

The current phase does **not** add a generic drag/drop builder UI. It adds the
contracts that a later builder UI will read and edit safely.

## Implemented Foundation

The public tour detail renderer now uses a governed section model instead of
generic page blocks.

Approved section ids:

- `hero`
- `facts`
- `reviews`
- `why-choose`
- `route`
- `itinerary`
- `services`
- `departures`
- `faq`
- `related`
- `sticky-cta`

Section behavior is controlled by `tour-products` fields:

- `sectionVisibility`
- `sectionOrder`
- `bcfg`

## Authoring Rules

Editors can:

- change the product content behind each approved section
- toggle section visibility
- change section order within the approved registry

Editors cannot:

- insert arbitrary generic page-builder blocks into the tour core
- replace departures or itinerary truth with rich-text-only content
- bypass structured review, route, or departure data

## Future Admin Builder Path

Planned future expansion:

1. foundation now: fields + registry + renderer
2. admin MVP later: toggle/order UI inside Payload admin
3. full builder later: richer controls, presets, and itinerary override tools

This staged approach keeps the current model stable while avoiding a second
rebuild when the admin builder arrives.
