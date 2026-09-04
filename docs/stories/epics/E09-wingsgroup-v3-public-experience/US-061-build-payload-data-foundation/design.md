# US-061 Design

## Domain Model

- `Site`: trusted WingsGroup tenant identity and locale/domain scope.
- `SiteSettings`: chrome, brand, SEO, contact, and consultation channel state.
- `Hero`: localized copy, media slides, CTAs, and governed behavior.
- `EcosystemProfile`: brand identity, service scope, stage media, proof state, and CTA state.
- `ProofRecord`: source, context/date, permission, media, and publication state.
- `LeadContext`: need, preferred channel, consent, site, locale, and source path.

## Application Flow

Unknown CMS and request data is parsed at its boundary. Public queries always
resolve trusted site context before reading settings, pages, media, or links.

## Interface Contract

CMS exposes enumerated presentation and publication states. Editors cannot
inject executable frontend code. Public rendering receives typed values and
safe fallbacks.

## Data Model

Changes must be additive. New relations and localized fields are site-scoped.
Migration plans include before/after counts, rollback, idempotence, and
PostgreSQL rehearsal. SQLite remains local-bootstrap only.

## UI / Platform Impact

Existing tenants must render unchanged when WingsGroup-specific fields are
absent. WingsGroup may use a dedicated governed presentation variant.

## Observability

Import/migration summaries report target site, planned/changed/unchanged/error
counts, plan checksum, and rollback result without logging sensitive content.

## Alternatives Considered

1. Hardcode v3 data in React. Rejected because editors and locale/site scope would be bypassed.
2. Create a separate CMS. Rejected because the approved architecture is one shared Payload platform.
