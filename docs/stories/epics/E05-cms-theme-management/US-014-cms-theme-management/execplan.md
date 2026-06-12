# Exec Plan

## Goal

Deliver CMS-managed multisite theme configuration while preserving the existing
Payload-first architecture and shared frontend theme foundation.

## Scope

In scope:

- extend `SiteSettings` theme fields
- add theme presets and deterministic token merge
- emit full `--site-*` CSS variables and stable data attributes
- replace site-name CSS selectors with preset/token selectors
- add a dedicated Payload Theme Manager view
- move hero path-specific behavior into structured hero variant/config fields
- add validation and tests

Out of scope:

- arbitrary CSS editor
- external theme marketplace
- theme data in Redis
- production migrations beyond safe additive fields

## Risk Classification

Risk flags:

- Data model
- Public contracts
- Existing behavior
- Authorization
- Weak proof if visual checks are skipped

Hard gates:

- authorization and site scoping in the Theme Manager
- additive schema defaults must not break existing records
- public site rendering must remain stable across all phase-1 sites

## Work Phases

1. Confirm field naming and preset vocabulary.
2. Add additive `SiteSettings` fields and validators.
3. Implement preset definitions and `getSiteThemeTokens()` merge logic.
4. Update layout body attributes and meta theme color behavior.
5. Refactor CSS selectors from site names to presets/tokens.
6. Refactor high-impact hero behavior into structured hero variants.
7. Build `/admin/theme` custom admin view.
8. Update seed data for all six phase-1 site identities.
9. Add unit, integration, E2E, and visual smoke proof.
10. Update handover notes.

## Stop Conditions

Pause for human confirmation if:

- the team wants business users to create brand-new presets, not just choose
  approved presets and overrides
- theme changes require destructive migrations
- access rules for `editor` users are expected to include theme editing
- final visual direction asks for per-page arbitrary styling
