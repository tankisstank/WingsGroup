# US-053: Close WingSide multilingual acquisition blockers

## Status

in_progress

## Lane

high-risk

## Current Behavior

The 2026-07-25 production audit reports cross-tenant URLs in WingSide robots and
sitemaps, incomplete locale canonical coverage, inaccessible conversion-form
controls, mixed-language public copy, and an internal package route returning
404. Existing production evidence also shows that US-050 real-tour discovery
and US-052 Proof Archive are complete and must not be reimplemented.

## Target Behavior

WingSide can pass a public-acquisition release probe across desktop and mobile
for `en`, `vi`, `it`, `es`, and `pt`. Tenant SEO output contains only WingSide
URLs, conversion forms are keyboard and screen-reader operable, public copy is
valid for its locale, and the same-locale internal route inventory has no 4xx.

## User Story

As an international WingSide traveler, I want every public locale to preserve
the same trustworthy discovery and conversion contract so that I can navigate,
understand and submit my trip request without tenant leakage, dead ends or
language/accessibility barriers.

## Acceptance Criteria

- BUG-WS-002: Isolate WingSide robots, sitemap and locale SEO output.
- BUG-WS-003: Restore accessible forms in all five public locales.
- BUG-WS-004: Eliminate internal 4xx routes in all five public locales.
- BUG-WS-005: Remove mixed-language copy in VI, IT, ES and PT.
- Preserve US-050 real-tour discovery and US-052 Proof Archive.
- Pass production release probes at desktop and mobile breakpoints.

## Affected Users

- Organic and direct visitors on WingSide public routes.
- Keyboard and screen-reader users completing Plan or Contact forms.
- Editors responsible for EN/VI/IT/ES/PT content.
- Release reviewers responsible for tenant isolation and SEO correctness.

## Affected Product Docs

- `docs/product/wingside-identity-contract.md`
- `docs/product/wingside-inbound-implementation-plan.md`
- `source/strategy/25 Yêu cầu taxonomy và real-tour discovery cho WingSide.md`
- `docs/stories/epics/E08-wingsside-inbound-upgrade/audit-2026-07-25-triage.md`

## Dependencies

- Production route and sitemap inventory can be queried without destructive
  operations.
- Editorial owner confirms translated copy before production apply.
- Product ownership confirmed the public locale scope as EN/VI/IT/ES/PT.

## Non-Goals

- Replacing Payload, the multisite router or the locale registry.
- Re-importing the 22 BestPrice tours.
- Rebuilding Home discovery or the Proof Archive.
- Sending real leads during automated validation.
- Implementing the P1/P2 ideas tracked in CR-WS-002.
