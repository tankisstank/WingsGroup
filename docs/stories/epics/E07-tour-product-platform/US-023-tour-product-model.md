# US-023 Tour Product Model

## Status

implemented

## Lane

high-risk

## Product Contract

`WingsGo` tour pages must move from generic page composition to a structured
tour product model that can represent base tour content, departures, departure
variants, and campaign reuse without cloning tour pages.

The immediate business goal is to support BestPrice-style public tour detail
pages with dense pricing, itinerary, and decision information.

The durable engineering goal is to make later lead capture, booking intent,
import-assisted updates, and flexible itinerary handling possible without
rebuilding the content model.

## Relevant Product Docs

- `docs/product/tour-product-platform.md`
- `docs/product/layout-preset-library.md`
- `docs/product/page-composer-and-landing-pattern.md`
- `docs/product/phase-1-launch-readiness.md`
- `source/strategy/21 Kế hoạch triển khai production theo site WingsTravel.md`

## Acceptance Criteria

- New structured collections are defined for `tourProducts`, `tourDepartures`,
  and a departure-variant mechanism suitable for shared itinerary content with
  limited overrides.
- The model supports `WingsGo` use cases for price-first tour pages, campaign
  reuse, and schedule-table rendering.
- Editors can update departures and price rows without rewriting the whole tour
  detail page.
- The model supports at least one same-tour multi-origin or multi-airline case
  without duplicating the entire product record.
- Import-assisted mapping from existing Google Sheets and Google Docs inputs is
  documented.
- The design explicitly avoids storing schedule, price, and itinerary truth
  only inside generic `Pages.layout`.

## Design Notes

- Collections:
  - `tourProducts`
  - `tourDepartures`
  - `tourCampaigns`
  - optional lightweight references: `markets`, `destinations`, `airlines`
- Domain rules:
  - `tourProducts` own canonical itinerary and tour identity.
  - `tourDepartures` own sellable departure facts and price rows.
  - departure variants may override a bounded subset of content, not the whole
    product contract.
  - campaign pages consume shared product data and do not become the source of
    truth for pricing.
- UI surfaces:
  - `WingsGo` tour detail
  - `WingsGo` market page
  - `WingsGo` campaign page
  - `WingsGo` schedule / pricing page
- Imports:
  - Google Sheets departure schedules
  - Google Docs itinerary programs
  - poster/rate-card assets

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Schema helpers and type-level domain mapping tests for core product/departure objects. |
| Integration | Payload collection config loads, types generate, and seed/import mapping passes targeted tests. |
| E2E | Editor can create a base tour, attach departures, preview a tour detail page, and update one departure without breaking the page. |
| Platform | At least one seeded tour supports multiple departure variants and renders a dense price/departure panel. |
| Release | A PM-facing sample tour proves BestPrice-style information density from structured data rather than page-only blocks. |

## Harness Delta

Creates a durable implementation packet for the tour-product layer already
described in strategy materials but not yet represented in story tracking.

## Evidence

- New collections and fields implemented in app code:
  - `tour-products`
  - `tour-departures`
  - `tour-campaigns`
  - `departure-variants`
- Query layer now resolves base tour + variant + departure commerce data.
- Seed helper creates richer structured tour data with route, review, services,
  itinerary gallery fallback, and variant links.
- Validation:
  - `pnpm run generate:types`
  - `pnpm exec tsc --noEmit`
  - `pnpm run build`

## Beta Hardening Delta

- `tour-products` gained a `marketCard` group (`thumbnailOverride`, `badges[]`,
  `sellingLine`, `priorityLabel`, `featuredReason`) so market-card badges are
  CMS-governed rather than heuristic.
- Market query now applies a future-departure rule for `lowestPrice`,
  `nextDeparture`, and `departureCount`, exposing `hasFutureDepartures` for an
  explicit "updating new departures" UI state.
- A typed view-model layer (`TourCardViewModel`, `DepartureCardViewModel`,
  `TourDetailViewModel`, `MarketPageViewModel`, `SchedulePageViewModel`)
  normalizes raw Payload records before rendering.
- Follow-up runtime audit found one CMS-only field leaking through serialized
  schedule payloads: `tour-departures.intentConfig.bookingNote`. The fix adds a
  departure-card whitelist in the query layer so public schedule / market /
  campaign surfaces receive only UI-approved fields and compact linked tour /
  variant summaries.
- Public-facing campaign copy was normalized from internal `Campaign tour`
  wording toward customer-facing `Tour theo mua` / seasonal-tour wording while
  keeping the stable `/campaign` route and `tour-campaigns` data model.
- See `docs/product/tour-product-platform.md` → "Beta Hardening" for the full
  contract and validation matrix.
