# US-054 Design

## Frozen Public Contract

- Stable route: `/journeys`; the label is localized but the pathname is not.
- Scalar query keys: `destination`, `style`, and `duration`.
- Duration codes: `1-7`, `8-14`, and `15-plus`, with inclusive day bounds.
- Destination/style/duration combine with AND semantics.
- Unknown values are dropped before query execution, produce a localized notice,
  and are never copied raw into logs or downstream context.
- Exact results sort by `durationDays` ascending, then stable record ID.

## Domain Model

- `DiscoveryQuery`: optional stable destination/style/duration codes.
- `DiscoveryResult`: a published same-site TourProduct projection with localized
  title/summary, hero media, duration, governed price state and valid URL.
- `DiscoveryContext`: normalized query values plus `source=journeys`; no PII.

## Application Flow

1. Parse site, locale and search params at the route boundary.
2. Reject non-WingSide tenants and normalize values against governed registries.
3. Query published TourProduct records scoped to `wing-side` with locale
   fallback disabled.
4. Project only records with same-site wrapper routes and required display data.
5. Render exact results or find the first non-empty broader set by removing
   duration, then style, then destination.
6. Preserve normalized context through Tour Detail, Plan and Contact.

## Interface Contract

- Back/Forward/Share and locale switching restore the same normalized state.
- Filter changes update the URL without unexpected focus or scroll loss.
- Broader results are explicitly labeled with the removed criterion.
- Empty state always exposes reset and consultation actions.
- Plan/Contact receives stable codes and source attribution, never raw labels.

## Data Model

No new collection or migration. Reuse TourProduct, US-049 taxonomy and US-050
readiness rules. Public UI receives a typed projection rather than raw Payload
documents.

## UI Direction

- Visual thesis: calm, image-led premium travel editorial with restrained chrome.
- Content: orientation and filters, real-tour results, then recovery/consultation.
- Motion: small filter/result transitions, clear hover/focus treatment and
  reduced-motion support.
- Entry points: global navigation, Home, destination hub and style hub.

## SEO Contract

- Unfiltered `/journeys` is self-canonical, indexable and the only discovery URL
  eligible for sitemaps.
- Any URL containing valid or invalid filter params canonicalizes to `/journeys`
  and emits `noindex,follow`.
- Tenant hostname and locale alternates follow US-053 gates.

## Observability

Use existing structured logs for normalized filter codes, result count,
invalid-filter count and request duration. `source=journeys` attributes
downstream transitions without adding a new analytics provider.

