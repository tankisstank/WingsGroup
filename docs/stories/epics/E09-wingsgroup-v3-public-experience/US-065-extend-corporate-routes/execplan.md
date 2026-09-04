# US-065 Exec Plan

## Goal

Migrate the complete WingsGroup corporate route inventory to the v3 governed
experience without cross-tenant or legal-content regressions.

## Scope

In scope:

- About, capability, trust/legal, news, contact, privacy, terms, and payment/principles routes.
- Vietnamese copy normalization, media, internal links, and SEO.
- Safe pending states and idempotent route/content migration.

Out of scope:

- Child-site redesigns.
- Unapproved legal or proof publication.

## Risk Classification

Risk flags:

- Audit/security.
- Public contracts.
- Cross-platform.
- Existing behavior.
- Multi-domain.

Hard gates:

- Legal/privacy publication.

## Work Phases

1. Freeze the current route/content/SEO inventory.
2. Approve route-specific content and legal states.
3. Implement reusable archetypes and idempotent seed/migration.
4. Verify route, locale, link, metadata, and form ownership.
5. Run responsive/accessibility/content QA across all routes.
6. Record proof and update Harness.

## Stop Conditions

Pause before publishing a legal route without explicit approval, enabling an
incomplete locale, or redirecting to an unverified tenant destination.
