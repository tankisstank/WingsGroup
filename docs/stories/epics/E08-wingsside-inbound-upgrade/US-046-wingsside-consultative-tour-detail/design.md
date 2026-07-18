# US-046 Design

## Domain Model

- Page wrapper owns publish gate, breadcrumb, metadata, canonical and related pages.
- TourProduct owns verified tour detail, itinerary, media and contact/price state.
- `structuredTourDetail` is separate from the WingsGo retail capability.
- WingSide view-model output is sanitized, locale-aware and empty-block safe.

## Application Flow

1. Resolve locale, host/site and published Page wrapper.
2. Match exact `/tour/:slug` capability by site.
3. Query TourProduct through `appendSiteWhere` with collection access enforced
   (`overrideAccess: false` publicly) and explicit English fallback for WingSide only.
4. Fail closed when wrapper and TourProduct differ.
5. Render site-specific detail plus controlled Page related pages.

## Interface Contract

- Consultation target:
  `/contact-us?tour=<slug>&tourId=<id>&source=tour-detail`.
- Missing price or future date always resolves to localized contact state.
- Specials is Home-only, desktop-only and session-dismissed through
  `wingside-promo-dismissed`.

## Data Model

No schema change. Cleanup only updates:

- `factSummary.operatorNote`
- `servicesSummary.operatorNotes`
- the exact technical row in `servicesSummary.notes`

`sourceProvenance` is immutable. The cleanup plan binds product, site, batch,
published status, wrapper and provenance checksums. PostgreSQL apply/rollback
revalidates all records inside one Payload request transaction before commit.
Existing version history is preserved and no new version rows are written.

## UI / Platform Impact

- WingSide adopts the approved dark/cream/wine/gold posture and compact desktop
  Specials navigation without copying the static hi-fi artifact wholesale.
- Tour detail is responsive; hero media is priority and product gallery media is lazy.
- Sticky consultation CTA reserves a footer-safe landing zone on localized routes.
- WingsGo and sites without tours retain existing behavior.

## Observability

- Cleanup emits atomic JSON plan/result reports with aggregate/per-record checksums,
  adapter parity status, actions, version counts and resume status.
- Browser evidence records console/runtime errors, viewport geometry and screenshots.
- Harness/Plane records partial proof until full browser and production gates pass.

## Alternatives Considered

1. Adding `wings-side` to WingsGo retail capabilities was rejected because it
   leaks schedule, market and campaign surfaces.
2. Rendering only the Page wrapper was rejected because it omits product truth.
3. Best-effort per-row cleanup was rejected because partial writes are not safely reversible.
