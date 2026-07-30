# US-057 production group-commerce audit — 2026-07-31

## Outcome

The read-only production audit found a safe candidate set, but it did not
authorize or perform a production write.

- Exact production scope: 22 published WingSide BestPrice TourProducts from
  import batch `wingsside-bestprice-22-20260717`.
- All 22 currently have `priceFrom=null`, contact-mode CTA, and no matching
  TourDeparture.
- The 39 TourDeparture records currently visible through the shared API belong
  to other tour products/sites. They must not be reused for WingSide.
- The source `Type` field classifies seven tours as pure group and eight as pure
  private.
- Four tours are hybrid (`Private tour, Flexible group tour`) and cannot be
  represented truthfully by the current single-value `group|private` enum.
- Three stored source URLs now redirect to a generic category and remain
  unresolved.
- Three tours have current fixed-departure evidence, but one of those is hybrid.
  The only pure-group commerce candidates are production IDs 63 and 69.

The machine-readable candidate is
`evidence/production-group-commerce-candidate-2026-07-31.json`.

## Classification

| Production ID | Slug | Decision | Production posture |
| --- | --- | --- | --- |
| 62 | `a-glimpse-of-central-vietnam-5-days` | Group | Schedule on request |
| 63 | `best-of-northern-vietnam-hanoi-ninh-binh-sapa-halong-6-days` | Group | Candidate for View departures |
| 64 | `best-of-south-vietnam-saigon-cu-chi-tunnel-mekong-delta-5-days` | Hybrid; unsupported by enum | Product decision required |
| 65 | `best-of-vietnam-and-cambodia-15-days` | Hybrid; unsupported by enum | Departure candidate blocked |
| 66 | `central-vietnam-adventure-4-days` | Unclassified; source now resolves to a generic page | No inventory |
| 67 | `central-vietnam-da-nang-hoi-an-ba-na-hills-5-days` | Group | Schedule on request |
| 68 | `discover-halong-bay-ninh-binh-package-2-days` | Group | Schedule on request |
| 69 | `highlights-of-vietnam-from-north-to-south-12-days` | Group | Candidate for View departures |
| 70 | `hoi-an-surrounding-and-beach-break-7-days` | Private | Tailor-made quote |
| 71 | `luxury-mekong-delta-speedboat-tour-full-day` | Group | Schedule on request |
| 72 | `mekong-delta-gateway-3-days` | Private | Tailor-made quote |
| 73 | `mekong-delta-with-floating-market-2-days` | Private | Tailor-made quote |
| 74 | `ninh-binh-tam-coc-mua-cave-private-tour-from-hanoi` | Private | Tailor-made quote |
| 75 | `ninh-binh-hoa-lu-trang-an-full-day-private-tour-from-hanoi` | Private | Tailor-made quote |
| 76 | `northern-vietnam-highlights-for-family-6-days` | Unclassified; source now resolves to a generic page | No inventory |
| 77 | `northern-vietnam-soft-adventure-8-days` | Unclassified; source now resolves to a generic page | No inventory |
| 78 | `romantic-getaway-in-phu-quoc-5-days-of-love-paradise` | Private; source identity drift | Confirm provenance before apply |
| 79 | `sapa-trekking-ethnic-market-3-days` | Group | Schedule on request |
| 80 | `southern-beauty-beach-relaxation-8-days` | Private | Tailor-made quote |
| 81 | `vietnam-luxury-wellness-retreat-escape-8-days` | Private | Tailor-made quote |
| 82 | `vietnam-memorable-honeymoon-trip-8-days` | Hybrid; unsupported by enum | Product decision required |
| 83 | `vietnam-at-a-glance-7-days` | Hybrid; unsupported by enum | Product decision required |

## Source-backed departure candidate

The source was checked at `2026-07-30T17:42:54Z` and the candidate expires
after 24 hours. A production plan must regenerate this data; it must not apply
the expired evidence file.

| Production ID | Future departure dates | Source price | Source status |
| --- | --- | --- | --- |
| 63 | 2026-12-23, 2026-12-25, 2026-12-27, 2026-12-30 | USD 741 per person | Guarantee depart |
| 65 | 2026-08-01, 05, 08, 12, 15, 19, 22, 26, 29 | USD 1,699 per person | Guarantee depart; blocked by hybrid model |
| 69 | 2026-08-01, 05, 08, 12, 15, 19, 22, 26, 29 | USD 1,120 per person | Guarantee depart |

Duplicate source rows for the same product/date were collapsed. Return dates,
seat counts, urgency, discounts, and booking capability were not inferred.
The existing contact CTA remains unchanged, so US-057 would expose
`View departures`, not `Book`.

## Production gate

The BestPrice pages are a current public supplier source, not a first-party
WingSide inventory system. Their content is sufficient to create a
classification candidate, but the repository does not record a supplier
contract, resale permission, allocation, or owned availability feed. Publishing
those prices as WingSide commerce without that confirmation could make an
unfulfillable availability claim.

Production apply therefore remains blocked until all of the following are true:

1. Product/operations records authorization to publish and fulfil the three
   source-backed products.
2. Product decides how hybrid group/private tours are represented. Until then,
   ID 65 must not enter group commerce.
3. The immutable US-057 release and additive migrations are deployed.
4. A fresh plan re-reads both production PostgreSQL and the source, verifies the
   exact 22-tour scope, and pins record/source checksums.
5. An encrypted PostgreSQL backup and restore drill pass.
6. ID 63 or 69 is applied as a canary; public Journeys/detail/contact
   behaviour and rollback are verified before promotion.

No production database, deployment, CMS record, or public traffic was changed
by this audit.
