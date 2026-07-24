# WingSide BestPrice 22 Taxonomy Map

Status: `approved and applied locally`

Batch: `wingsside-bestprice-22-20260717`

## Instructions

Populate this table from the actual Payload export. Do not invent rows from the
prototype. Each destination/style assignment must be supported by itinerary,
route, supplier source or an explicit editorial decision.

| ID | Source ID | Destination keys | Travel-style keys | Evidence | Decision |
| --- | --- | --- | --- | --- | --- |
| 226 | `halong-bay-tours--discover-halong-bay-ninh-binh-2-days` | `halong`, `ninh-binh` | `culture`, `adventure` | Halong cruise; Hoa Lu and Tam Coc itinerary | Approved |
| 251 | `indochina-tours--best-of-vietnam-and-cambodia-15-days` | `hanoi`, `halong`, `hoian`, `ho-chi-minh-city`, `mekong`, `siem-reap` | `culture` | 15-day named route through Vietnam and Siem Reap | Approved |
| 326 | `mekong-delta-tours--luxury-mekong-delta-speedboat-tour-full-day` | `mekong` | `luxury`, `adventure` | Supplier route is a luxury speedboat experience | Approved |
| 328 | `mekong-delta-tours--mekong-delta-gateway-3-days` | `mekong` | `culture` | Cai Be, Sa Dec and Can Tho itinerary | Approved |
| 330 | `mekong-delta-tours--mekong-delta-with-floating-market-2-days` | `mekong` | `culture` | Ben Tre, Can Tho and Cai Rang itinerary | Approved |
| 405 | `ninh-binh-tours--ninh-binh-hoa-lu-trang-an-full-day-private-tour` | `ninh-binh` | `culture` | Hoa Lu and Trang An route | Approved |
| 407 | `ninh-binh-tours--ninh-binh-tam-coc-mua-cave-private-tour-from-hanoi` | `ninh-binh` | `adventure` | Tam Coc and Mua Cave route | Approved |
| 442 | `sapa-tours--sapa-trekking-ethnic-market-3-days` | `sapa` | `culture`, `adventure` | Village trekking and Bac Ha ethnic market | Approved |
| 486 | `vietnam-tours--a-glimpse-of-the-central-vietnam-5-days` | `hue`, `hoian` | `culture` | Hue Imperial City, Hoi An and My Son itinerary | Approved |
| 491 | `vietnam-tours--best-of-northern-vietnam-6-days` | `hanoi`, `halong`, `sapa` | `culture`, `adventure` | Hanoi, Sapa trekking, Fansipan and Halong | Approved |
| 492 | `vietnam-tours--best-of-south-vietnam-5-days` | `ho-chi-minh-city`, `mekong` | `culture` | Ho Chi Minh City, Cu Chi and Mekong | Approved |
| 495 | `vietnam-tours--central-vietnam-adventure-4-days` | `hue`, `hoian` | `adventure` | Hue zipline, Hai Van motorbike and Hoi An ecotour | Approved |
| 497 | `vietnam-tours--da-nang-hoi-an-ba-na-hills-5-days` | `hue`, `da-nang`, `hoian` | `family`, `culture` | Da Nang, Ba Na Hills, Hue and Hoi An | Approved |
| 498 | `vietnam-tours--deep-in-love-in-phu-quoc-5-days` | `ho-chi-minh-city`, `phu-quoc` | `wellness`, `romance` | Saigon dinner cruise and Phu Quoc couples retreat | Approved |
| 504 | `vietnam-tours--highlights-of-vietnam-12-days` | `hanoi`, `halong`, `hue`, `hoian`, `ho-chi-minh-city`, `mekong` | `culture` | North-to-south named itinerary | Approved |
| 506 | `vietnam-tours--hoi-an-surrounding-and-beach-break-7days` | `da-nang`, `hoian` | `culture`, `wellness` | Hoi An heritage, My Son, Ba Na Hills and beach rest | Approved |
| 517 | `vietnam-tours--northern-vietnam-highlights-for-family-6-days` | `hanoi`, `halong` | `family`, `culture` | Family supplier promise; Hanoi and Halong itinerary | Approved |
| 518 | `vietnam-tours--northern-vietnam-soft-adventure-8-days` | `hanoi`, `halong`, `ninh-binh`, `mai-chau` | `culture`, `adventure` | Cycling, villages, Ninh Binh and Halong | Approved |
| 524 | `vietnam-tours--southern-beauty-and-relaxation-8-days` | `ho-chi-minh-city`, `mekong`, `ninh-thuan` | `adventure`, `wellness` | Saigon, Ben Tre and Ninh Thuan beach relaxation | Approved |
| 526 | `vietnam-tours--vietnam-at-a-glance-7-days` | `hanoi`, `halong`, `ho-chi-minh-city`, `mekong` | `culture` | Hanoi, Halong, Saigon, Cu Chi and Mekong | Approved |
| 533 | `vietnam-tours--vietnam-luxury-wellness-retreat-escape-8-days` | `hanoi`, `mai-chau`, `da-nang`, `hoian` | `luxury`, `culture`, `wellness` | Luxury route and Hoi An wellness retreat | Approved |
| 534 | `vietnam-tours--vietnam-memorable-honeymoon-trip-8-days` | `hanoi`, `halong`, `ninh-binh`, `da-nang`, `hoian` | `culture`, `romance` | Named honeymoon itinerary across five destinations | Approved |

## Validation Rules

- Exactly 22 unique TourProduct IDs.
- Every record belongs to site `wings-side` and the locked batch.
- Destination keys are limited to the approved vocabulary.
- Travel-style keys are limited to the approved vocabulary.
- Every assignment has evidence or reviewer rationale.
- Exceptions are explicit and block discovery eligibility until resolved.

## Sign-off

| Role               | Name | Date | Result  |
| ------------------ | ---- | ---- | ------- |
| Content editor     | Project owner (chat approval) | 2026-07-24 | Approved: `us-049-v1-20260724` |
| Product/PM         | Project owner (chat approval) | 2026-07-24 | Approved: local apply authorized |
| Technical reviewer | Codex | 2026-07-24 | Pass: 22/22 map, no conflicts/exceptions |
