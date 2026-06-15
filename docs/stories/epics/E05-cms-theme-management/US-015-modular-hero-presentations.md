# US-015 Modular Hero Presentations

## Status

implemented

## Lane

normal

## Product Contract

Payload editors can select one of four governed high-impact hero
presentations. Frontend rendering resolves the selected presentation through a
registry while preserving site theme tokens and independent business variants.

## Relevant Product Docs

- `docs/product/hero-presentation-system.md`
- `docs/product/cms-theme-management.md`
- `docs/product/page-composer-and-landing-pattern.md`
- `docs/product/multisite-platform.md`

## Acceptance Criteria

- Four built-in presentation keys are available from one registry.
- Payload CMS exposes presentation selection only for high-impact heroes.
- Layered visuals support up to three optional supporting media records.
- Legacy records without a presentation render through a stable fallback.
- Presentation components do not inspect site code, hostname, or pathname.
- Public markup exposes presentation and business variant data attributes.
- Desktop and mobile Playwright proof exists for every built-in style.
- The extension and validation rules are documented.

## Design Notes

- Commands: editor selects and saves `hero.presentation`.
- Queries: page query returns hero content and media at existing depth.
- API: no new public endpoint.
- Tables: page and page-version hero fields gain presentation and supporting media.
- Domain rules: presentation controls layout; variant controls business behavior.
- UI surfaces: Payload page editor and public high-impact hero.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Resolver accepts registered keys and returns legacy fallback. |
| Integration | Registry definitions are unique and all have render components. |
| E2E | Four fixture routes render correct markers on desktop and without overflow on mobile. |
| E2E | CMS edit view exposes all presentation options and conditional supporting media. |
| Platform | Root homepage remains centered visual after migration. |
| Release | Typecheck, lint, integration, E2E, build. |

## Harness Delta

Added a durable feature contract for future hero prompts and a repeatable
presentation test matrix.

## Evidence

- `pnpm exec tsc --noEmit`: passed.
- `pnpm run lint`: passed with five pre-existing warnings.
- `pnpm run test:int`: 33 tests passed.
- Hero presentation frontend matrix: four Playwright tests passed.
- Payload admin presentation selector: one Playwright test passed.
- Public two-level internal-link audit: passed.
- `pnpm run build`: passed.
- Runtime proof: root homepage and all four fixture presentations render from
  the Payload-backed local site.
