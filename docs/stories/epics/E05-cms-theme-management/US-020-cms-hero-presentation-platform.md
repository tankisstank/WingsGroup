# US-020 CMS Hero Presentation Platform

## Status

implemented

## Lane

normal

## Product Contract

CMS users can assign a governed hero presentation preset to a site, inherit it
on pages, or override it per page. Developers own the render templates and
capabilities; super-admins own reusable presets built from those templates.

## Relevant Product Docs

- `docs/product/hero-presentation-system.md`
- `docs/product/cms-theme-management.md`
- `docs/product/multisite-platform.md`

## Acceptance Criteria

- Site settings expose a default hero presentation independently from theme.
- Pages can inherit the site default or select a page-level preset.
- Legacy presentation records render without a data migration dependency.
- Governed planner, image carousel, and video presentations are available.
- Motion respects reduced-motion and pauses when not visible.
- Unit, component, integration, CMS E2E, frontend E2E, and selected visual proof exist.
- CMS usage and developer extension rules are documented.

## Design Notes

- Commands: super-admin creates presets; site-manager assigns defaults; editors configure page content.
- Queries: page render resolves page, site settings, preset, and template through one resolver.
- API: Payload collections remain the public data interface.
- Tables: hero presentation presets, site defaults, page overrides, slides, and video configuration.
- Domain rules: templates are code-owned; presets are CMS-owned; arbitrary CSS or JavaScript is forbidden.
- UI surfaces: Theme Manager, Site Settings, Page Hero tab, and public frontend.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Registry, resolver precedence, behavior normalization, validation. |
| Component | Carousel controls/timers/reduced-motion, video fallback, planner slots. |
| Integration | Payload schema, preset access, seed idempotency, compatibility. |
| E2E | Theme Manager assignment, page override, desktop/mobile public behavior. |
| Platform | PostgreSQL migration and local SQLite bootstrap. |
| Release | Types, import map, typecheck, lint, tests, build, go-live review. |

## Harness Delta

Extends the hero validation matrix to cover dynamic media, inheritance, motion,
and CMS-owned presets.

## Evidence

2026-06-23 completed CMS Hero Presentation Platform:

- Site settings expose default hero presentation presets independently from theme.
- Pages can inherit the site default or override with a page-level preset.
- Legacy presentation records continue rendering without requiring a data migration first.
- Governed planner, cinematic carousel, and video background presentations are available.
- Carousel/video behavior includes reduced-motion and visibility-aware safeguards.
- CMS usage and developer extension handover docs were added.

2026-06-23 follow-up: improved CMS comprehension for hero presentation setup:

- Theme Manager now shows a visual hero preview for the selected site default preset.
- Page Hero tab now includes a `HeroPresentationGuide` preview block explaining the active structure.
- High Impact hero form now exposes clear media areas for main image, supporting visuals, slides, and video/poster configuration.
- Playwright config supports `PLAYWRIGHT_REUSE_EXISTING_SERVER=true` for validating against an already-running localhost server without stopping the user's dev session.

Validation:

- `pnpm exec tsc --noEmit` passed.
- `pnpm run test:unit` passed: 1 file / 5 tests.
- `pnpm run test:component` passed: 1 file / 4 tests.
- `pnpm run test:int` passed: 11 files / 48 tests.
- `pnpm run lint` passed with 5 pre-existing warnings.
- `pnpm run generate:types` passed.
- `pnpm run generate:importmap` passed.
- `pnpm run build` passed.
- `pnpm run test:e2e` passed: 45 tests.
- Follow-up validation: `pnpm exec tsc --noEmit` passed; `pnpm run lint` passed with the same 5 pre-existing warnings; targeted Playwright admin E2E passed 2 tests for Theme Manager preview and Page Hero media guidance.
