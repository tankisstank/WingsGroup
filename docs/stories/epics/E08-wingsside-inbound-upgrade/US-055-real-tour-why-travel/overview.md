# US-055: Connect WingSide Why Travel to real tours

## Status

in progress / HOLD — production authority was granted on 2026-07-29, but the
independent R5 combined WP6 review returned `HOLD`, not `SHIP`. D4-C still has
220 watermark-positive assets and zero accepted faithful replacements;
rights/publication evidence and the exact production backup/restore/signed
plan/rollback package remain absent. D7-A therefore stopped before any
production apply, deployment, canary, traffic switch or promotion.

## Lane

high-risk

## Current Behavior

The WingSide Home `Why travel with WingSide` composition is editable as
localized Page content, but its featured item and three supporting cards still
use static media bindings and manually entered hrefs. The cards do not carry a
governed relationship to the 22 imported WingSide `TourProduct` records.

US-050 already proves that other Home discovery sections can project real,
published, same-site tours through Payload relationships. This story extends
that source-of-truth contract to the Why Travel composition without turning the
section into another generic tour grid.

## Target Behavior

The featured Why Travel item and its three supporting cards retain their
approved editorial roles while each is backed by a real eligible
`TourProduct`. Editors can configure the four slots in Payload, choose manual
selection or a governed deterministic rule, and explicitly inherit or override
allowed presentation fields. Product identity, eligibility and public Tour
Detail routing always come from `TourProduct`.

## User Story

As a WingSide editor, I want each Why Travel message to be backed by a real
journey so that visitors can move from a brand promise to truthful inventory
without requiring a frontend code change.

## Acceptance Criteria

- Payload exposes four stable Why Travel slots: local design, flexible
  planning, style matching and collaborative care.
- Every active slot resolves to a published, same-site, display-ready
  `TourProduct` with a valid same-site wrapper route.
- Editors can use manual selection or an approved destination/style/duration
  rule with deterministic ordering and an optional manual fallback.
- Editors can choose inherit or explicit override behavior for localized
  editorial copy, media and CTA label; tour identity and Tour Detail URL
  cannot be overridden by free-form product URLs.
- Missing, unpublished, cross-site or incomplete tour references fail closed
  and never fall back to static product-like facts.
- EN, VI, IT, ES and PT render the same four-slot behavior with correct
  locale-aware URLs, accessibility, responsive layout and stable markers.

## Affected Users

- WingSide visitors moving from brand promises to a representative journey.
- Editors curating localized Why Travel messages and representative tours.
- Site managers governing publication, taxonomy and tenant isolation.
- Release reviewers validating real-tour truth and responsive behavior.

## Affected Product Docs

- `docs/product/wingsside-tour-discovery-and-taxonomy.md`
- `docs/product/tour-product-platform.md`
- `docs/product/wingsside-identity-contract.md`
- `source/strategy/25 Yêu cầu taxonomy và real-tour discovery cho WingSide.md`

## Dependencies

- US-045 imported inventory remains the source baseline.
- US-049 taxonomy and US-050 real-tour projection remain the eligibility
  contract.
- US-054 may provide shared discovery query/ranking utilities, but US-055 must
  remain implementable with deterministic local rules if US-054 is not yet
  released.
- Editorial must approve the initial four slot-to-tour mappings and any
  localized overrides.

## Approved initial mapping

| Stable role | TourProduct | Source ID | Reason |
| --- | --- | --- | --- |
| `local-design` | Best of Northern Vietnam: Hanoi, Sapa & Halong · 6 days | `vietnam-tours--best-of-northern-vietnam-6-days` | A broad northern route where local food, mountain communities and the bay form one coherent journey. |
| `flexible-planning` | Northern Vietnam Highlights for Family · 6 days | `vietnam-tours--northern-vietnam-highlights-for-family-6-days` | A family-oriented pace makes the promise of practical, adaptable planning credible. |
| `style-matching` | Vietnam Luxury Wellness Retreat Escape · 8 days | `vietnam-tours--vietnam-luxury-wellness-retreat-escape-8-days` | Direct, truthful evidence for matching a traveler to a luxury-wellness style. |
| `collaborative-care` | Highlights of Vietnam from North to South · 12 days | `vietnam-tours--highlights-of-vietnam-12-days` | A multi-region journey demonstrates coordination and care across a longer trip. |

The four target locales (`vi`, `it`, `es`, `pt`) use the existing editorial
catalog, authored in the calm, specific, consultative WingSide voice; frontend
rendering must never use runtime machine translation or fall back to English.

## Non-Goals

- Anonymous visitor UID, behavioral tracking or personalization.
- Machine-learning or opaque recommendation ranking.
- Replacing the full Home discovery, destination or style sections.
- Importing more tours or changing TourProduct taxonomy.
- Real-time availability, capacity, date or guest-based pricing.
