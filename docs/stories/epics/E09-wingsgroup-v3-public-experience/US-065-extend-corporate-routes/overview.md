# US-065: Áp dụng WingsGroup v3 cho corporate và policy routes

## Status

implemented

## Lane

high-risk

## External Tracking

- Multica: `WIN-33`, child of `WIN-20`.

## Current Behavior

Core WingsGroup routes return successfully but use inconsistent legacy copy,
media, trust claims, and policy content. The production audit found ambiguous
legal identity, internal implementation language, incomplete policies, and
unverified destinations.

## Target Behavior

All approved corporate, editorial, contact, and policy routes use the v3 shell,
governed Page Composer patterns, Vietnamese and English customer-facing
language, site-scoped SEO, and explicit pending states. English must use a
natural, refined and courteous marketing tone. Legal routes are not published
as approved policy until legal gates pass.

## User Story

As a WingsGroup visitor, partner, or applicant, I want consistent and truthful
corporate information across every route so that I can understand the company,
services, trust basis, and data terms without internal jargon or unsupported
claims.

## Acceptance Criteria

- Implement and seed the nine approved routes from the product contract with the v3 shell and governed blocks.
- Remove public-facing `root site`, `site con`, `line business`, `legacy`, and equivalent internal implementation language.
- Keep legal identity, licences, proof, and partner claims pending until source and permission gates pass.
- Publish policy text only with approved legal entity, scope, effective date, version, retention, rights, and contact.
- Keep every route, locale, canonical, breadcrumb, internal link, media, and form scoped to WingsGroup.
- Do not expose English routes until complete route/chrome/metadata inventory and editorial review exist.
- Verify all internal and ecosystem destinations; unsafe destinations fall back to contact intake.
- Pass responsive, accessibility, SEO, and no-cross-tenant route checks.

## Affected Product Docs

- `docs/product/wingsgroup-v3-public-experience.md`
- `docs/product/editorial-operations.md`
- `docs/product/ai-agent-seo-and-theme.md`
- `docs/product/multisite-platform.md`

## Dependencies

- US-060 governance and legal gates.
- US-061 data foundation.
- US-062 shell.
- US-063 homepage patterns.
- US-064 form contract for contact routes.

## Non-Goals

- Drafting legal policy without legal ownership.
- Implementing child-site pages or commerce workflows.
- Publishing an incomplete locale.
