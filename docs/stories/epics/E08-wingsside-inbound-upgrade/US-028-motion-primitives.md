# US-028 Motion primitives

## Status

implemented

## Lane

normal

## Product Contract

Reusable motion primitives provide reveal, count-up, hover and Ken Burns support
with reduced-motion behavior and no new dependency by default.

## Relevant Product Docs

- `docs/product/wingsside-inbound-implementation-plan.md`

## Acceptance Criteria

- Reveal and CountUp components/utilities exist.
- Reduced-motion disables non-essential animation.
- CountUp safely falls back for non-numeric values.
- No Framer Motion or Embla dependency is added in this story.

## Design Notes

- Commands: `pnpm exec tsc --noEmit`, `pnpm run lint`, `pnpm run test:component`.
- UI surfaces: Page Composer blocks and hero presentation.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Utility behavior if extracted |
| Integration | Not required unless hooked into Payload config |
| E2E | Covered in downstream visual stories |
| Platform | Reduced-motion/manual smoke if needed |
| Release | Bundle unchanged except local code |

## Harness Delta

US-028 should be marked implemented with component/unit and platform proof.

## Evidence

- Implemented `app/src/components/RevealOnScroll/index.tsx` as a client
  IntersectionObserver reveal primitive with default threshold `0.15`, one-time
  reveal, no-layout-shift CSS class contract, and reduced-motion immediate
  in-view rendering.
- Implemented `app/src/components/CountUp/index.tsx` as an in-view
  `requestAnimationFrame` counter with `value`, `suffix`, `durationMs`, and
  `locale` support. Non-numeric values render fallback text instead of throwing.
- Implemented `app/src/hooks/useScrollDirection.ts` with scroll listener
  cleanup and requestAnimationFrame throttling.
- Added global CSS utilities in `app/src/app/(frontend)/globals.css`:
  `.motion-reveal`, `.is-in-view`, `.hover-lift`, `.hover-image-zoom`, and
  `.ken-burns`, all covered by reduced-motion rules.
- No new dependency was added; `package.json` was not changed for this story.

Validation on 2026-07-06:

- `pnpm run test:component -- tests/component/motionPrimitives.component.spec.tsx`
  passed: 1 file, 6 tests.
- `pnpm run test:component` passed: 2 files, 10 tests.
- `pnpm exec eslint src/components/RevealOnScroll/index.tsx src/components/CountUp/index.tsx src/hooks/useScrollDirection.ts tests/component/motionPrimitives.component.spec.tsx`
  passed.
- `pnpm exec tsc --noEmit` still fails on existing unrelated
  `tourDetailBuilder` test typing issues in
  `tests/e2e/tourDetailBuilder.e2e.spec.ts` and
  `tests/int/tourDetailBuilder.int.spec.ts`; US-028 introduced no remaining
  TypeScript errors.
