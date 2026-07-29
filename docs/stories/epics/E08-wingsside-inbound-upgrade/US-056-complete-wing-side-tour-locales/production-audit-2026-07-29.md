# US-056 Production locale audit — 2026-07-29

## Incident

WingSide Journeys routes return 22 tours in all five public locales after the
discovery availability hotfix, but translated routes contain English product
copy and incomplete Tour Detail content.

Representative routes:

- `https://wingside.vn/vi/journeys`
- `https://wingside.vn/es/journeys`
- `https://wingside.vn/it/journeys`
- `https://wingside.vn/pt/journeys`
- `https://wingside.vn/{locale}/tour/central-vietnam-adventure-4-days?source=journeys`

## Confirmed Findings

1. Production has 22 published WingSide TourProducts and 22 taxonomy-ready
   records in every locale query.
2. Strict `fallbackLocale: false` reads return complete EN editorial fields but
   empty VI, ES, IT and PT TourProduct editorial values.
3. The target locale arrays retain their structural rows, but localized
   itinerary and inclusion text values are empty.
4. Localized wrapper Pages remain translated, including title, meta title,
   description and breadcrumb label.
5. The approved four-locale editorial catalog remains present in the repo and
   its focused tests pass `9/9`.
6. Journeys currently uses English presentation fallback for title and summary,
   which explains why cards are visible but mixed-language.
7. Listing-level static copy has independent quality defects: missing
   diacritics in VI/PT and incorrect singular forms in ES/IT/PT.

## Root-Cause Status

The data-loss mechanism is not yet proven. Tour `updatedAt` values correlate
with the 2026-07-29 production maintenance window, and the incident appeared
after an English-locale taxonomy repair. US-056 must reproduce or isolate the
localized array/write behavior before applying the restoration plan.

The repair must not attribute the incident to US-055 content quality: the
accepted source catalog is complete and locally validated. US-055 remains
closed; US-056 owns production data restoration, UI locale corrections and
regression prevention.

