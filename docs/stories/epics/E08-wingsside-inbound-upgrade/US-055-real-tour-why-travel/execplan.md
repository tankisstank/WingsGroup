# US-055 Exec Plan

## Goal

Connect all four WingSide Why Travel roles to real, governed TourProduct
inventory while preserving the approved Home composition and editor control.

## Scope

In scope:

- Additive Payload configuration for four stable Why Travel slots.
- Manual TourProduct relationships and deterministic governed rules.
- Server-side readiness, tenant and locale projection.
- Controlled editorial copy/media/CTA inheritance and overrides.
- Migration or idempotent backfill of the initial four selections.
- Admin, component, integration, responsive and production proof.

Out of scope:

- Visitor UID, cookies, Redis preference profiles and behavioral events.
- Personalized or machine-learning ranking.
- Guided listing filters owned by US-054.
- New tour imports, availability or booking.
- Redesigning the approved Home section hierarchy.

## Risk Classification

Risk flags:

- Data model and additive Payload/PostgreSQL migration.
- Existing public Home behavior and CMS editing contract.
- Multisite and five-locale exposure.
- Public Tour Detail URL and product-truth contract.
- Cross-story dependency on US-049, US-050 and optionally US-054.
- Weak proof until admin curation and fail-closed rendering exist.

Hard gates:

- Never resolve unpublished, cross-site or display-incomplete tours.
- Never reintroduce static product title, price, media or product-detail URLs as
  a silent fallback.
- Never allow free-form product URLs to override the canonical same-site
  wrapper route.
- Do not introduce visitor identity or tracking under this story.

## Work Phases

1. Freeze slot keys, initial four tour mappings and inherit/override semantics.
2. Add the typed Page schema, server validation and additive migration.
3. Implement manual/rule resolution and the bounded Why Travel projection.
4. Update the Home renderer and Payload admin experience.
5. Backfill the approved selections with dry-run and idempotence proof.
6. Run local, PostgreSQL, browser, five-locale, tenant and responsive checks.
7. Promote through canary/production and update Harness and Plane evidence.

## Stop Conditions

Pause for human confirmation if:

- Editorial wants a slot to remain a non-tour CTA.
- Rule-based selection needs signals outside governed taxonomy and duration.
- A media override would make the card appear to represent a different tour.
- Implementation requires weakening US-049/US-050 eligibility or tenant rules.
- The work expands into visitor identity, behavioral tracking or
  personalization.
