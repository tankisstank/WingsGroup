# US-030 Inbound Page Composer blocks

## Status

implemented

## Lane

normal

## Product Contract

WingsSide inbound pages can be assembled from governed Page Composer blocks,
reusing and extending existing blocks before creating new schemas.

## Relevant Product Docs

- `docs/product/wingsside-inbound-implementation-plan.md`
- `docs/product/layout-preset-library.md`

## Acceptance Criteria

- Value props use or extend `InfoStrip`/`FeatureGrid`.
- Stats count-up extends `Stats`.
- Testimonials carousel extends `Testimonial`.
- Itinerary grid decision is documented before adding a new block.
- No implementation uses `tours/sectionRegistry.ts` for Page Composer.

## Design Notes

- Commands: `pnpm run generate:types`, `pnpm exec tsc --noEmit`, lint,
  integration/component tests.
- UI surfaces: `app/src/blocks/*`, `Pages.layout`, layout presets.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Block helpers if added |
| Integration | Block registry/schema tests |
| E2E | Seed/render page using inbound blocks |
| Platform | Desktop/mobile screenshots |
| Release | Existing pages still render |

## Harness Delta

Update matrix evidence after implementation.

## Evidence

Implemented 2026-07-07.

- Value props: reused governed `InfoStrip` and `FeatureGrid`; WingsSide homepage
  seed now renders `InfoStrip`, `FeatureGrid` `bento`, and `FeatureGrid`
  `alternating` blocks for inbound trust/value props, destination/style cards
  and sample itinerary cards.
- Stats: extended existing `Stats` renderer with `CountUp` progressive
  enhancement. Initial HTML keeps the real static value, then animates when the
  metric enters the viewport. Numeric strings with suffixes such as `5+`,
  `24h`, and `2,500+` are handled safely.
- Testimonials: extended existing `Testimonial` renderer for accessible
  carousel/snap presentation via the already registered `carousel`
  presentation. Removed default `5` rating from the rating field so CMS content
  does not create fake five-star reviews.
- Itinerary grid decision: no new `ItineraryGrid` block in wave 1. WingsSide
  sample itineraries are static marketing cards, so they are implemented with
  `FeatureGrid` `alternating`; a separate structured itinerary/product model can
  be considered later if real operational itinerary data is required.
- Layout preset: added governed `wingsside-inbound-homepage` preset using only
  Page Composer blocks registered through `Pages.layout`.
- Guardrail: no Page Composer implementation uses `app/src/tours/sectionRegistry.ts`.

Validation:

- `pnpm run generate:types` PASS.
- `pnpm exec tsc --noEmit` PASS.
- `pnpm run test:int -- tests/int/layoutPresets.int.spec.ts` PASS 11/11.
- `pnpm run test:component -- tests/component/inboundComposerBlocks.component.spec.tsx`
  PASS 2/2.
- `pnpm run test:component -- tests/component/motionPrimitives.component.spec.tsx`
  PASS 6/6 after CountUp idle behavior changed to static initial values.
- Targeted eslint PASS 0 errors for changed renderer/preset/test files; the
  broader targeted seed lint still has the existing 6 `no-explicit-any`
  warnings in `scripts/seed-subsites.ts`.
- PostgreSQL seed PASS against
  `postgresql://smoke:smoke@127.0.0.1:15432/wings_migrate_smoke`.
- Direct Playwright E2E against `http://localhost:3000` with PostgreSQL data
  PASS 3/3 for WingsSide cinematic hero, governed inbound composer blocks, and
  governed hero presentation inheritance.

Known validation note:

- The standard SQLite `pnpm run test:e2e` bootstrap hit `SQLITE_BUSY` while
  creating indexes in `payload-phase1-test.db`. The UI proof was therefore run
  directly against the PostgreSQL-backed local server on port 3000.
