# US-050 Proof Summary

Accepted locally on 2026-07-25.

The WingSide Home Page (ID 298, site ID 3) now owns exact ordered curation for
six destination slots, six travel-style slots and three featured journeys.
Runtime hydration performs bounded, same-site published queries for
TourProducts, wrapper Pages and Media before projecting truthful card fields.

The public renderer consumes only a ready projection. It exposes real title,
summary, duration, hero, price posture and canonical wrapper URL. Invalid or
missing curation fails closed, closing BUG-WS-001. Destination and style CTAs
route to site-aware hubs with an explicit query filter; each hub hydrates the
governed Home curation and renders only matching published, same-site
TourProducts with canonical detail links.

Primary proof:

- data audit: zero findings, exact approved IDs, projection state `ready` for
  EN/VI/IT/ES/PT with explicit English field fallback where translation is not
  authored;
- PostgreSQL: empty-to-head migration and Payload CRUD pass;
- SQLite: hermetic isolated fixture, forced six-table repair, and Pages SQL
  query pass;
- automated: 327 unit and 43 component tests pass;
- production build: pass;
- focused PostgreSQL E2E: Home planner/carousel, Specials responsive layout and
  route smoke pass;
- browser: desktop/mobile visuals, canonical tour CTA, filtered Hanoi and
  Romance hubs, zero runtime page errors.

## Production release

Production go-live completed on 2026-07-25:

- release SHA: `d35825129aae198aad6f2377feafb5960c37df03`;
- runtime image:
  `sha256:84a7e0cbee2ee64c8f71ba7f12dc9463b9aad7d0dff88d7508d2d9be83017a93`;
- PostgreSQL migration
  `20260725_090000_wings_side_home_tour_curation` ran as batch 12;
- encrypted pre-write backup checksum:
  `2f57164e030a6125ae5324ae898582e0db5dbd25c4f2385bf652074dd8c51a9a`;
- guarded apply returned `action=update`, zero findings and exact 6/6/3 ready
  projections for EN/VI/IT/ES/PT;
- independent post-apply audit returned `action=unchanged`,
  `matchesApprovedSelections=true`;
- canary and switched runtime passed live, database, Redis and Home probes;
  readiness remains intentionally `degraded` only because lead delivery is
  disabled, matching the preceding release;
- public browser QA passed Home, Hanoi destination filter, Romance style
  filter, canonical detail links and zero page errors.

Production captures are stored in `evidence/production-home-desktop.png`,
`evidence/production-home-mobile.png` and
`evidence/production-destination-cards.png`.
