# Exec Plan

## Goal

Make WingsGo and WingSide child-site branding deterministic, tenant-scoped,
brand-kit compliant, and ready for repeatable extension to future sites.

## Scope

In scope:

- map approved logo, favicon, and OG exports into Payload branding fields;
- render light/dark logos, canonical links, alt text, favicon, and metadata;
- enforce runtime tenant mapping and site-scoped media/settings queries;
- add automated and browser proof for required routes and viewports;
- document checksums, changed files, and staging evidence.

Out of scope:

- production deployment or production CMS mutation without approval;
- business/layout/CTA redesign;
- new booking, content, or CRM behavior;
- replacing the Payload fields with a second source of truth.

## Risk Classification

Risk flags:

- Authorization/tenant scope
- Data model/media ownership
- Public metadata and rendering contract
- Existing behavior
- Cross-platform browser QA
- Multi-domain and weak-proof risk

Hard gates:

- no cross-tenant media leakage;
- no production import without backup and explicit cutover approval;
- all required validation layers pass or are explicitly marked pending.

## Work Phases

1. Inspect manifests, reference JSON, existing resolver/layout, and route aliases.
2. Run brand import dry-run on baseline/staging and capture provenance/checksums.
3. Implement tenant-scoped resolver and metadata wiring using existing fields.
4. Add/adjust unit, integration, and browser assertions for both tenants.
5. Run typecheck, lint, Prettier, build, related tests, and 1440/390 smoke QA.
6. Record evidence and request human approval for any production cutover.
7. Update Harness/Plane tracking after story evidence is available.

## Stop Conditions

Pause for human confirmation if:

- a migration or production write is required;
- an asset is missing, has unclear rights/provenance, or conflicts with the
  reference contract;
- canonical domain or alias behavior is ambiguous;
- any validation requirement must be weakened.
