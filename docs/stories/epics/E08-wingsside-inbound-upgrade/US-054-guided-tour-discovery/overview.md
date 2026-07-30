# US-054: Launch WingSide guided tour discovery MVP

## Status

implemented — production release re-confirmation pending

## Lane

high-risk

## Current Behavior

WingSide supports destination, style and package hubs backed by governed real
tour discovery, but visitors must traverse those hubs independently. There is
no unified listing that preserves filter state or converts a zero-result search
into a consultation request.

## Target Behavior

WingSide exposes `/journeys`, a site-aware Guided Tour Discovery listing backed
only by published, same-site TourProduct records. Visitors can filter by one
destination, one style and one duration bucket, share or revisit the URL, open
Tour Detail, or continue to Plan/Contact with their discovery context.

## User Story

As a WingSide traveler, I want to narrow real journeys by destination, style and
duration so that I can evaluate a suitable tour or ask a planner to adapt my
criteria without starting again.

## Acceptance Criteria

- Render a listing from published same-site TourProduct records only.
- Filter by destination, style and duration with shareable URL state.
- Localize labels and equivalent behavior for EN, VI, IT, ES and PT.
- Give zero-result users a deterministic relax-or-consult recovery path.
- Preserve discovery context when opening Tour Detail, Plan or Contact.
- Enforce SEO, tenant, accessibility and responsive release gates.

## Affected Users

- WingSide visitors who know some trip preferences but not a specific tour.
- Travelers who need planner help when inventory does not exactly match.
- Editors governing tour taxonomy, publication and translated labels.
- Release reviewers responsible for tenant, SEO and accessibility contracts.

## Affected Product Docs

- `docs/product/tour-product-platform.md`
- `docs/product/wingside-identity-contract.md`
- `source/strategy/25 Yêu cầu taxonomy và real-tour discovery cho WingSide.md`
- `docs/product/wingsside-tour-discovery-and-taxonomy.md`

## Dependencies

- US-049 taxonomy and US-050 real-tour projection remain the source contract.
- TourProduct wrapper/detail routes remain valid and same-site.
- US-053 release gates remain regression gates.

## Non-Goals

- Date or live availability filtering.
- Guest-count pricing, capacity or budget filtering.
- Save, compare, login, personalization or complex ranking.
- Re-importing or duplicating the 22 BestPrice tours.
