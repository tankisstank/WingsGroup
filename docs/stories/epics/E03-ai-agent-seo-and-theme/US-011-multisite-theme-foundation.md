# US-011 Multisite Theme Foundation

## Status

implemented

## Lane

normal

## Product Contract

Phase 1 must ship with a coherent theme foundation that supports a shared brand
system plus controlled site-specific overrides, instead of one-off page styling.

## Relevant Product Docs

- `docs/product/ai-agent-seo-and-theme.md`
- `docs/product/phase-1-scope.md`
- `docs/product/acceptance-and-kpis.md`

## Acceptance Criteria

- The public experience uses a documented theme foundation for colors,
  typography, spacing, CTA styling, and shared chrome.
- Site-specific brand overrides can be applied without breaking the shared
  design system.
- Theme work preserves semantic HTML structure and reusable section patterns.
- The delivered theme rules are documented for future extension and handover.

## Design Notes

- Commands: theme token updates, site-brand override configuration.
- Queries: site settings reads for branding and theme values.
- API: frontend layout, shared components, and section styling.
- Tables: site settings and any brand-related config fields.
- Domain rules: shared foundation first, override second.
- UI surfaces: frontend layout, shared blocks, navigation, footer, CTA surfaces.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Theme token helpers where applicable |
| Integration | Site-aware branding and theme value resolution |
| E2E | Representative page render across at least two site identities |
| Platform | Mobile and desktop visual smoke check |
| Release | Theme handover note complete |

## Harness Delta

This story gives the phase-1 theme requirement a durable engineering packet.

## Evidence

- 2026-05-27: Implemented shared theme foundation in `app/src/app/(frontend)/globals.css`
  with `--site-*` brand tokens, section spacing, card/media/chrome treatments, and
  nav/link styling hooks.
- 2026-05-27: Wired site-specific `branding.brandColor` and `branding.accentColor`
  from `site-settings` into frontend CSS variables in
  `app/src/app/(frontend)/layout.tsx`; no `SiteSettings` schema changes were made.
- 2026-05-27: Updated header, footer, CTA/content/banner/form/archive/media blocks
  to use shared theme classes while preserving semantic landmarks and existing
  `CMSLink`/`SiteLink` crawlable links.
- 2026-05-27: Validation run: `pnpm run test:int` passed with 4 files and 12 tests.
- 2026-05-27: Validation notes: `pnpm run lint` is blocked by an existing ESLint 9
  circular config error; `pnpm exec tsc --noEmit` is blocked by existing seed,
  Payload alias, and test typing errors outside US-011 scope.
