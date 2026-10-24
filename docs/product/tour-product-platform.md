# WingsGroup Tour Product Platform

## Purpose

This document defines the phase-1.5 product contract for structured tour
content on top of the current Payload-first multisite platform.

The immediate goal is `copy-first`: reproduce a dense, decision-friendly travel
product experience similar to BestPrice for `WingsGo` public tour pages.

The durable goal is `model-first`: keep tour content, departures, itinerary,
and pricing in structured CMS records so the platform can later add:

- guided lead capture
- booking intent and reservation steps
- flexible itinerary variants
- richer search, filtering, and comparison
- import-assisted updates from spreadsheets and documents

This document does not add booking or payment into phase 1.

## Scope Position

This platform sits between the current page composer and future lead/booking
work:

- `Phase 1 existing`: multisite CMS, page composer, theme system, SEO baseline
- `Phase 1.5 this doc`: structured tour product model and governed tour detail
  rendering
- `Phase 2 later`: lead forms, inquiry routing, booking intent, operational
  workflow

The tour platform is required because `WingsGo` needs price-first, departure-
first public pages and because phase-1 strategy already names:

- `tourProducts`
- `tourDepartures`
- `departureVariants`
- `tourCampaigns`

as dedicated domain objects instead of generic pages.

## Product Principles

For WingSide destination/style classification and Home discovery curation, see
[`wingsside-tour-discovery-and-taxonomy.md`](wingsside-tour-discovery-and-taxonomy.md).
That contract extends `TourProduct` discovery metadata without changing the
core product truth defined here.

### Structured before flexible

The platform must store repeatable tour facts as structured fields before
falling back to free-form block composition.

Examples:

- departure city
- airline
- departure date
- seats status
- price rows
- duration
- destinations covered
- inclusions / exclusions
- day-by-day itinerary entries

### Copy-first UI, not copy-first data

The first release may intentionally mimic BestPrice-style public layout density,
but data must remain Wings-owned and CMS-governed.

### Builder for controlled composition

Editors may change approved tour sections and section order where allowed, but
must not assemble core tour pages from arbitrary generic landing-page blocks.

### Site-aware and locale-aware

All records remain scoped by `site` and support localized editorial behavior
where needed.

### Phase boundary discipline

The platform must prepare for lead and booking, but must not require live
checkout, payment, or operator workflow in this phase.

## Core Domain Objects

## `tourProducts`

The root public tour record.

Purpose:

- defines the canonical tour page
- holds stable marketing and itinerary content
- relates departures, campaign use, SEO, and supporting media

Required fields:

- `site`
- `title`
- `slug`
- `status`
- `locale` or localized content fields
- `market`
- `destinations`
- `durationDays`
- `durationNights`
- `tourCode`
- `summary`
- `highlights`
- `heroMedia`
- `gallery`
- `overview`
- `whyChooseThisTrip`
- `inclusions`
- `exclusions`
- `importantNotes`
- `faqItems`
- `mapImage` or route visual
- `relatedTours`
- `seo`

Optional but expected:

- `reviewSummary`
- `badgeLabels`
- `operatorNote`
- `mealSummary`
- `groupPolicy`
- `accommodationSummary`

## `tourDepartures`

An individual sellable departure instance or departure batch linked to one tour
product.

Purpose:

- exposes real price / departure data on the public site
- supports repeated updates without rewriting the whole tour page
- becomes the future bridge to inquiry, hold, and booking intent

Required fields:

- `site`
- `tourProduct`
- `departureCode`
- `departureDate`
- `returnDate`
- `departureCity`
- `airline`
- `availabilityStatus`
- `priceFrom`
- `currency`
- `priceRows`
- `isFeatured`

Recommended fields:

- `promoLabel`
- `promoNote`
- `seatNote`
- `bookingDeadline`
- `flightSummary`
- `salesContactHint`
- `campaigns`

## `departureVariants`

A structured way to reuse one base tour product across multiple departure
patterns.

Purpose:

- prevent duplicate tour pages when most content is shared
- support Hanoi / HCMC or airline-based variations
- allow small itinerary or pricing differences without cloning everything

Examples:

- same Korea itinerary, different departure city
- same Japan route, different airline and promo period
- same South Africa program, different flight origin

Suggested fields:

- `tourProduct`
- `variantKey`
- `departureCity`
- `airline`
- `label`
- `summaryOverride`
- `heroOverride`
- `itineraryDayOverrides`
- `priceDisplayNote`
- `activeDepartureRefs`

## `tourCampaigns`

A marketing grouping record, not the root product truth.

Purpose:

- groups products or departures into seasonal campaigns
- powers campaign pages, market pushes, and hero placements
- avoids storing primary product data only inside campaign pages

Required fields:

- `site`
- `title`
- `slug`
- `campaignCode`
- `season`
- `heroMedia`
- `summary`
- `linkedTours`
- `linkedDepartures`
- `cta`
- `seo`

## Supporting Reference Objects

The following may start lightweight but should be explicit when implementation
begins:

- `markets`
- `destinations`
- `airlines`
- `faqLibraries`
- `tourBadges`

These support consistency across many pages and future import workflows.

## Public Tour Page Contract

The first public `WingsGo` tour detail should render like a dense retail travel
page, with this minimum information architecture:

1. Breadcrumbs
2. Hero summary
3. Price / departure decision panel
4. Section anchor tabs
5. Why choose this trip
6. Trip map / route visual
7. Day-by-day itinerary
8. Inclusions / exclusions
9. Departure table
10. FAQ
11. Related tours
12. Sticky conversion CTA

## Hero Summary

Must support:

- title
- review/rating summary
- hero image or gallery/video
- price from
- primary CTA
- secondary CTA
- compact fact list

## Decision Panel

Must support:

- duration
- route / places
- meals
- group size
- operated by / service note
- deposit or hold note
- availability / next departure summary

## Itinerary Contract

The itinerary is a structured sequence, not a single long rich-text field.

Each day entry should support:

- day number
- title
- route / city
- summary
- highlights
- meals
- accommodation note
- transport note
- optional media
- optional override flag

This is required so the platform can later enable itinerary customization
without rewriting the rendering model.

## Departure Table Contract

The public site must support dense departure and price presentation.

Each price row should support:

- departure date
- return date
- departure city
- airline
- seat class or package tier when needed
- adult price
- child price when needed
- single supplement or note when needed
- promo badge
- CTA target

The table must be reusable on:

- tour detail pages
- schedule pages
- campaign pages
- market pages

## CMS Builder Contract

The tour detail page must use a governed builder, not the generic page composer
alone.

Allowed tour section types:

- `HeroSummary`
- `DecisionFacts`
- `WhyChooseThisTrip`
- `TripMap`
- `ItineraryTimeline`
- `InclusionExclusion`
- `DepartureTable`
- `ReviewsProof`
- `FAQ`
- `RelatedTours`
- `StickyBookingCTA`

Rules:

- core identity and pricing relations come from structured tour records
- editors may reorder only approved sections
- the renderer must read section visibility and order from governed fields, not
  arbitrary page blocks
- departures, reviews, route visuals, and itinerary galleries must remain
  structured so later lead/booking modules can mount without redesigning the
  page

## Implemented Foundation

The current implementation now includes:

- `tour-products`
- `tour-departures`
- `tour-campaigns`
- `departure-variants`

and a governed public rendering layer for `WingsGo`.

### Current builder-ready fields

`tour-products` now carry:

- review snapshot
- route visual
- richer itinerary day fields
- services summary
- section visibility
- section order
- compact builder config

`tour-departures` now carry:

- urgency label
- availability badge
- deposit / hold / change notes
- CTA label override
- optional relation to a departure variant

`departure-variants` now carry:

- variant identity
- summary / hero / route overrides
- itinerary day overrides
- service overrides
- linked departures

## Variant Resolution Rules

Variant resolution follows this precedence:

1. base `tourProduct`
2. active `departureVariant` override
3. departure-level commerce metadata

Bounded overrides are allowed for:

- summary
- hero media
- route visual
- service summaries
- selected itinerary day fields

Variants must not replace the core section registry or break canonical product
identity.

## Editorial Workflow

Current editor workflow:

1. Create or update the base record in `tour-products`
2. Add one or more sellable rows in `tour-departures`
3. Add a `departure-variant` only when a subset of content needs to differ
4. Preview the public route under `/wingsgo/tour/<slug>`
5. Reuse the same departure rows on market, campaign, and schedule surfaces

This is the foundation for a later admin builder UI, but the current phase
stops at governed fields and structured authoring groups.
- editors may toggle optional sections
- editors may add editorial notes only where explicitly allowed
- editors may not inject arbitrary CSS, JS, or layout classes

## Editorial Operations

Minimum editor workflows:

1. Create a new base tour product from a controlled template
2. Attach hero, highlights, and itinerary
3. Add one or more departures
4. Add or adjust variant data for departure city / airline differences
5. Preview the resulting public page
6. Update one departure batch without touching the whole tour detail
7. Reuse the product in campaign and market contexts

## Import-Assisted Workflow

The model must prepare for import from current working materials:

- Google Sheets departure schedules
- Google Docs tour programs
- poster/rate-card visuals

Expected mapping:

- Sheets -> `tourDepartures`, `priceRows`, airline/departure metadata
- Docs -> `tourProducts`, itinerary entries, inclusions, notes
- Posters -> hero/campaign/gallery/supporting visuals

## SEO and Structured Data Contract

Tour pages should be able to emit richer product/travel schema than the current
generic page baseline.

Expected future-ready schema targets:

- `BreadcrumbList`
- `FAQPage`
- `Organization`
- travel-product-specific schema such as `TouristTrip` or equivalent safe shape
- offer-like price/departure information when the data is stable enough

## Phase Boundary

Explicitly in scope now:

- structured tour content model
- dense BestPrice-style tour detail rendering
- governed tour detail builder
- campaign / market / schedule reuse from shared data

Explicitly out of scope now:

- payment
- live booking checkout
- seat inventory synchronization
- CRM pipeline
- operator workflow
- advanced automation

## Beta Hardening (phase 1.5 follow-up)

This section captures the hardening pass applied after the first dense
`WingsGo` tour build, to keep the implementation aligned with the copy-first /
model-first direction while preparing cleanly for phase 2.

### Market card is CMS-governed

`tour-products` now carry a `marketCard` group:

- `thumbnailOverride` — optional market-specific thumbnail
- `badges[]` — up to 3 governed labels rendered on the market card
- `sellingLine` — short market-facing selling line
- `priorityLabel` — optional priority/ranking label
- `featuredReason` — internal-facing reason a tour is featured

The market renderer reads `tour.marketCard.badges` first. Heuristic badge
inference from `title`, `summary`, or `price` has been removed; only a minimal
fallback to existing `badges` groups remains when no governed badges exist.
Editors control market badges entirely from the CMS.

### Future departure rule on market page

`getToursByMarketRoute` now separates departures into:

- `allDepartures`
- `futureDepartures` (departure date today or later)
- `visibleDepartures` (future when available, else all)

`lowestPrice`, `nextDeparture`, `departureCount`, and the market departure strip
prefer future departures. When a tour has no future departures, the card exposes
`hasFutureDepartures: false` and the UI shows an explicit `Đang cập nhật đợt mới`
state instead of advertising a past price or date.

### CTA context contract for phase 2

Commerce CTAs no longer link to a bare `/lien-he`. A helper
`getTourInquiryPath({ tourSlug, tourId, departureId, intent, source })` builds a
machine-readable inquiry URL, e.g.:

`/lien-he?intent=hold-seat&tour=<slug>&tourId=<id>&departureId=<id>&source=tour-detail-hero`

Recognized `intent` values: `hold-seat`, `inquiry`, `request-quote`, `contact`.
`source` identifies the surface (`tour-detail-hero`, `tour-detail-departures`,
`tour-detail-sticky`, `departure-strip`, `schedule`). No lead form is
implemented in this phase; the contract only ensures phase-2 prefill has the
context it needs.

### Accessibility pattern for cards

Full-card `absolute inset-0` overlay links that competed with an inner CTA have
been removed from the market card, departure strip, and the `PricingTable`
block (both presentations). The pattern is now:

- the title (and image where relevant) is an explicit, labeled link
- each CTA is a real link/button in normal flow
- no empty full-card link occupies the tab order

This avoids duplicate/ambiguous focus targets and gives screen readers clear
link labels.

### View model boundary

A typed boundary sits between raw Payload documents and the renderers:

- `TourCardViewModel`
- `DepartureCardViewModel`
- `TourDetailViewModel`
- `MarketPageViewModel`
- `SchedulePageViewModel`

The query layer normalizes raw data into these view models, and the market /
schedule / card surfaces consume the typed shapes. The models keep a permissive
index signature so migration off `Record<string, any>` can proceed surface by
surface without a single large rewrite.

The current hardening pass also adds an explicit departure-card whitelist in
the query layer. Public market / schedule / campaign surfaces no longer receive
raw `tour-departures` documents; they receive a normalized
`DepartureCardViewModel` shape with only UI-approved fields such as departure
date, airline, price, note, CTA label, and compact linked tour / variant
summary. CMS-only groups such as `intentConfig` must not cross this boundary.

### Public copy hygiene

Seed content for public schedule, market, tour-detail, and campaign wrapper
pages no longer leaks internal/technical language (e.g. "query trực tiếp",
"render từ tour-products", "page wrapper", "structured tour detail"). Public
copy is customer-facing; internal config notes remain only in non-rendered
fields.

During runtime validation, one internal note (`bookingNote` inside
`tour-departures.intentConfig`) was found leaking through the serialized
schedule payload even though no frontend component rendered it directly. The
fix is architectural rather than editorial: whitelist the departure view-model
sent to client surfaces, instead of passing raw Payload records through React
Server Component props.

### Validation matrix

| Check | Command / surface |
| --- | --- |
| Type safety | `cd app && pnpm exec tsc --noEmit` |
| Production build | `cd app && pnpm run build` |
| Schema sync (local) | `PAYLOAD_DB_PUSH=true` one-shot init after schema change |
| WingsGo routes 200 | `/wingsgo/tour/<slug>`, `/wingsgo/lich-khoi-hanh`, `/wingsgo/thi-truong/han-quoc`, `/wingsgo/vi/thi-truong` |
| Other sites unaffected | `/wingsside`, `/wingsplus` return 200 |
| No technical copy | grep public seed content for internal terms |
| No CMS-only leak in serialized HTML | smoke check `/wingsgo/lich-khoi-hanh`, `/wingsgo/campaign`, `/wingsgo/tour/<slug>` for `phase 2`, `structured IDs`, and similar admin-only strings |
| Market badges governed | badges render from `marketCard.badges` |

## Validation Expectations

### WingsGo contact surfaces — follow-up 2026-10-23

- Main hotline is `0948786775`, displayed as `0948 786 775`, sourced from
  site-settings through resolveSiteHotlines. The fallback and bootstrap seed
  use the new number; valid custom CMS values remain authoritative.
- Footer has one direct-call link and one preferred email (support, then sales).
  Remove repeated supplementary phone links, Zalo/advice CTAs and the public
  light/dark selector. Keep office addresses and footer navigation.
- Header and contact dialogs retain supplementary hotlines and shared Zalo OA.
  The floating contact trigger hides while the WingsGo footer is in view;
  an open dialog remains available and Escape restores an appropriate focus.
- The WingsGo contact form consumes the existing hotlines prop; no separate
  hardcoded phone. Explicit empty props remain empty.
- The CMS old-to-new update is site-scoped, planned by default and rejects
  unexpected custom values. No schema changes or global replacement across
  tenants. See US-081 and wingsgo-footer-review-20261023 for proof and rollout
  status; the prior WingsGroup release does not establish WingsGo delivery.

### Existing tour validation

- Type-safe collection schemas exist for tour product records.
- Public pages render dense decision-friendly tour detail information on desktop
  and mobile.
- Editors can update departures independently from base itinerary content.
- At least one product supports multiple departure variants without cloning the
  whole page.
- The resulting UI is visually close enough to the BestPrice benchmark to
  validate the copy-first strategy while remaining site-aware and brand-aware.
