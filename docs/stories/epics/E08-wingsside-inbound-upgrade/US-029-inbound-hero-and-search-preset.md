# US-029 Inbound hero and search preset

## Status

implemented

## Lane

normal

## Product Contract

WingsSide homepage can use a governed image-only inbound hero with image
sequence, Ken Burns effect, and search/planner widget that routes to
`/plan-your-trip`.

## Relevant Product Docs

- `docs/product/wingsside-inbound-implementation-plan.md`
- `docs/product/hero-presentation-system.md`

## Acceptance Criteria

- Hero reuses existing presentation system.
- No video hero is introduced in wave 1.
- Search/planner widget has labels and accessible controls.
- Public E2E covers `/wingsside` hero/search behavior.

## Design Notes

- Commands: hero integration/component tests, targeted public E2E.
- UI surfaces: `app/src/heros/config.ts`, hero presentations, HighImpact hero.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Resolver/normalization if touched |
| Integration | Hero registry/schema tests |
| E2E | `/wingsside` hero/search targeted spec |
| Platform | Desktop/mobile no-overflow screenshots |
| Release | Reduced-motion and rollback note |

## Harness Delta

Update matrix evidence after implementation.

## Evidence

Implementation completed on 2026-07-07:

- Added the governed `wingsside-inbound-cinematic-search` hero preset seed,
  based on the existing `cinematic-carousel` presentation. No new video hero or
  parallel hero system was introduced.
- Changed the WingsSide site hero assignment to use the cinematic search preset
  with the existing `planner` business variant.
- Seeded the WingsSide homepage with three image-only carousel slides covering
  tailor-made Vietnam, destination-led planning, and travel styles.
- Added Ken Burns animation markers for active carousel media through
  `data-ken-burns`, with reduced-motion CSS disabling the animation.
- Rendered the planner business panel inside the cinematic carousel overlay so
  the homepage keeps the full-bleed image sequence and still exposes the
  search/planner widget.
- Replaced the static planner CTA panel with an accessible planner form:
  destination select, duration select, visible labels, and GET submit to the
  site-aware `/plan-your-trip` URL with query parameters.
- Hardened the Phase 1 E2E DB preparation so stale test databases missing the
  WingsSide cinematic preset are reseeded instead of silently reused.
- Added targeted E2E coverage for `/wingsside` asserting the cinematic
  presentation marker, preset key, 3 slides, Ken Burns marker, planner form
  labels, form routing, and mobile no-horizontal-overflow.

Validation:

- `pnpm exec tsc --noEmit` passed.
- `pnpm run test:int -- tests/int/heroPresentations.int.spec.ts` passed: 4
  tests.
- `pnpm run test:component -- tests/component/heroPresentations.component.spec.tsx`
  passed: 4 tests.
- `pnpm run test:e2e -- tests/e2e/frontend.e2e.spec.ts -g "WingsSide cinematic planner hero"`
  passed: 1 test.
- Targeted eslint passed with 0 errors. It still reports existing
  `@typescript-eslint/no-explicit-any` warnings in `scripts/seed-subsites.ts`.

Follow-up on 2026-07-09 after semantic SEO review:

- `CinematicCarouselHero` now emits one semantic H1 from the first slide title
  before the carousel stage while keeping visible slide titles as H2. This
  fixes the homepage 0-H1 finding without changing the visual hierarchy or
  introducing multiple H1s across rendered slides.
- Component coverage now asserts the carousel exposes exactly one H1 for the
  first slide.
- Targeted E2E for localized WingsSide roots asserts IT/ES/PT homepage H1s are
  present at heading level 1.
- Validation: `pnpm exec tsc --noEmit` PASS; targeted eslint PASS;
  `pnpm run test:component -- tests/component/heroPresentations.component.spec.tsx`
  PASS 4/4; targeted Playwright PASS 3/3 for WingsSide hero/header/localized
  root pages.

Follow-up on 2026-07-10 after localized planner panel review:

- The WingsSide planner business panel now receives the resolved route locale
  from the public page renderer and uses governed copy for EN/VI/IT/ES/PT
  instead of hardcoded English strings.
- Localized copy covers the panel aria label, mini label, title, helper text,
  destination/duration labels, select option labels, CTA and planning cues.
- Targeted E2E now asserts IT/ES/PT root pages expose the localized planner
  panel and do not render the old English `Plan a private Vietnam journey` or
  `Choose a destination` strings inside that panel.
- Validation: `pnpm exec tsc --noEmit` PASS; targeted eslint PASS; targeted
  Playwright PASS 2/2 for `WingsSide cinematic planner hero` and
  `WingsSide localized root pages with real core content`.

Rollback:

- Set `siteHeroPresentationAssignments['wings-side'].presetKey` back to
  `travel-planner-split` or change the WingsSide site-setting hero preset in
  CMS. The carousel code remains inert unless selected by preset.
