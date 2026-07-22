# Design

## Ownership

`TourProduct` owns product facts and taxonomy. The WingsSide Home page owns
curation: selected IDs, slot keys and order. The component only projects the
resolved model and never invents product facts.

## Selection Model

Add governed Home discovery configuration to the existing WingsSide hi-fi page
contract or an established site/page settings boundary:

- six destination selections keyed by destination;
- six style selections keyed by travel style;
- three ordered featured journey relationships.

Do not create a second global source of tour truth. Relationships point to
`tour-products` and use same-site filter options.

## Server Projection

Resolve relationships server-side with bounded depth and a stable projection:

- ID and slug;
- localized title/summary;
- hero or approved thumbnail override;
- duration;
- price/currency;
- wrapper/public pathname;
- taxonomy and publication status.

The client receives only fields required for cards. Avoid per-card requests.

## URL Rules

- Sample Journey CTA always opens the selected tour detail/wrapper.
- Destination/style category CTA behavior is explicit and consistent.
- URL builders remain site-aware and locale-aware.
- Broken wrappers block eligibility rather than linking to `/`.

## Fallback Rules

- No fallback to `copy.packages.cards` for product-like cards.
- No fallback to static price/title/URL.
- Optional representative media may use a documented category visual only when
  the card remains a category link and does not present itself as a tour.
- Missing required featured tours creates an audit failure.

## Cache And Revalidation

Changing a selected TourProduct or Home curation must revalidate the WingsSide
Home and relevant destination/style routes. Existing tour revalidation hooks
must be extended without invalidating unrelated sites.

## Accessibility And Markers

Use real media alt text or a truthful localized fallback derived from the tour
title. Preserve existing Home markers and add stable selected-tour test
attributes only if required for automated proof.
