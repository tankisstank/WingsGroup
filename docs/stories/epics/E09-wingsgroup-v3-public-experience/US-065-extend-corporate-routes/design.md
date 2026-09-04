# US-065 Design

## Domain Model

Each route is a site-scoped localized Page using governed archetypes and shared
v3 shell settings. Policy pages carry approval state, legal owner, version, and
effective date in addition to content.

## Application Flow

Trusted site/locale resolution selects the WingsGroup page. Route rendering
filters unpublished proof and unapproved legal content, generates tenant SEO,
and resolves internal/deep links through safe destination rules.

## Interface Contract

All routes provide stable headings, breadcrumbs, canonical metadata, contact
paths, and error behavior. Missing legal approval produces a controlled pending
or non-public state rather than placeholder policy claims.

## Data Model

Content migration is idempotent, localized, and limited to the named
WingsGroup records. Policy approval metadata is additive and audited.

## UI / Platform Impact

Archetypes share typography, spacing, cards, forms, and responsive behavior
without forcing identical page composition. Long-form legal content prioritizes
readability and heading structure.

## Observability

Route validation emits route, locale, HTTP status, canonical host, internal-link
result, and publication state without logging page-private drafts.

## Alternatives Considered

1. Update only the homepage. Rejected because the public experience and legal trust would remain inconsistent.
2. Hardcode route copy in frontend files. Rejected because Payload remains the content source of truth.
