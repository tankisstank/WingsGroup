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

Production go-live is intentionally not asserted by this proof.
