# Exec Plan

## Goal

Deliver a governed five-brand WingsGroup logo family, make the parent header
logo legible on every supported surface, and top-anchor the five homepage
section headers without regressing multisite or responsive behavior.

## Scope

In scope:

- visual and pixel audit of the current parent header and section headers;
- a five-brand logo manifest for WingsGo, WingSide, WingsPass, WingsPlus and
  WingsCare;
- primary, reverse and compact/mark exports with provenance and checksums;
- surface-aware Logo rendering and tenant-safe fallback behavior;
- shared desktop top alignment for the five named homepage headers;
- unit/component/static checks and browser screenshots at required breakpoints.

Out of scope:

- production CMS asset import, database migration, deployment or traffic cutover;
- changing route, locale, section order, copy or consultation behavior;
- opening unapproved external brand links or claims;
- silently replacing approved brand masters without brand-owner confirmation.

## Risk Classification

Risk flags:

- Public contract;
- Existing behavior;
- Cross-platform desktop/mobile presentation;
- Multi-domain/tenant asset resolution;
- Content/media provenance and weak prior visual proof.

Hard gates:

- Preserve site-scoped and locale-scoped asset resolution.
- Do not publish an asset without checksum/provenance and brand-owner review.
- Do not weaken the `doNotCrop`/`doNotUpscale` rules without an explicit
  contract decision.
- No production write or deploy without a separate release approval.

## Work Phases

1. Freeze the production screenshot, DOM measurements and current RC source.
2. Confirm the five ecosystem brand identities, surfaces and artwork owners.
3. Define the manifest/checksum/clear-space contract and review the asset
   deliverables before wiring them into the app.
4. Implement surface-aware logo resolution and the shared top-aligned
   section-header rule with desktop/compact safeguards.
5. Add unit/component regressions for asset selection, tenant isolation and
   header alignment; run type, lint and build checks.
6. Run agent-browser or committed E2E at 390/768/1024/1440px, capture
   screenshots and inspect console/overflow/accessibility evidence.
7. Complete independent review, update Harness proof and sync Plane only after
   the story evidence is complete.

## Stop Conditions

Pause for human confirmation if:

- “five logos” is interpreted differently from the five named ecosystem
  identities;
- supplied artwork conflicts with the existing brand-kit contract;
- a new Payload media field, migration or production asset write is required;
- a section-header fix changes the approved desktop composition materially;
- validation would need to ignore missing assets, tenant boundaries or mobile
  overflow.
