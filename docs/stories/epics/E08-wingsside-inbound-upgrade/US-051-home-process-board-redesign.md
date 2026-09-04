# US-051 Redesign homepage WingSide process board

## Status

Đã xác nhận đầy đủ

## Lane

normal

## Product Contract

Homepage WingSide replaces the equal-weight four-step card grid in `home-pillars`
with a planning desk that explains the flow from brief to match, draft, and lock.
The section keeps the current header copy and CMS/local step data binding, provides
an actionable CTA to `#home-planner`, and does not change the `/plan-your-trip`
cards treatment.

## Relevant Product Docs

- `docs/HARNESS.md`
- `docs/FEATURE_INTAKE.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- Prototype and audit hand-off supplied with the request.

## Acceptance Criteria

- Homepage renders four data-driven process tabs under `data-od-id="home-pillars"`.
- The board shows the brief essentials, local planning desk SLA, and `Brief / Match / Draft / Lock` workflow.
- Tabs support click/touch, ArrowLeft/ArrowRight, Home, End, roving tab focus, and visible focus rings.
- Inactive panels are layered with fixed stage height; switching steps does not change board or stage height.
- The CTA points to the real homepage planner anchor `#home-planner`.
- Planner media dimensions are declared before load and reduced motion disables transitions.
- No horizontal overflow is introduced at the required desktop/mobile widths.
- `/plan-your-trip` continues to render the existing `Steps` cards treatment.

## Design Notes

- Active renderer: `app/src/components/WingsSideHiFi/HomeHiFiPage.tsx`.
- New treatment: `HomeProcessSteps` with scoped `home-process-steps.css`.
- `home.pillars` remains the CMS override; `copy.plan.steps` remains the fallback/local source.
- No global design tokens or unrelated sections are changed.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Full unit suite passed: 46 files / 322 tests. |
| Component | Full component suite passed: 11 files / 38 tests; new process-board tests cover rendering and keyboard interaction. |
| E2E | Homepage process-board test passed against the reviewed local runtime at desktop 1440px and mobile 390px. It verifies four scoped tabs, keyboard navigation, CTA, overflow, and fixed board/stage heights. |
| Platform | TypeScript, lint with zero errors, production build, local runtime QA, and stakeholder visual review passed. |
| Release | `pnpm run build` passed. |

## Harness Delta

- Added a normal-lane story for the bounded homepage UI change.
- Added executable component and E2E acceptance coverage.
- Scoped the E2E tab locator to the process board so the independent hero-carousel tabs do not create a false count.
- Recorded the stakeholder visual acceptance and complete local release proof.

## Evidence

- `pnpm exec eslint src/components/WingsSideHiFi/HomeProcessSteps.tsx src/components/WingsSideHiFi/HomeHiFiPage.tsx tests/component/homeProcessSteps.component.spec.tsx tests/e2e/frontend.e2e.spec.ts --no-warn-ignored` — pass.
- `pnpm exec tsc --noEmit --pretty false` — pass.
- `pnpm run test:component` — pass, 38/38.
- `pnpm run test:unit` — pass, 322/322.
- `pnpm run test:int` — pass, 114 tests with 10 opt-in skips.
- `pnpm run lint` — pass with 0 errors and 144 pre-existing warnings.
- `pnpm run build` — pass.
- Direct Playwright execution against the reviewed local runtime — pass, 1/1 at 1440px and 390px.
- Stakeholder visual review — accepted on 2026-07-24.
- Production release `e451cb03a4ad5b961895470b854a97aa4c1381f6` — live on
  `wingside.vn` on 2026-07-24.
- Production `agent-browser` QA — four scoped tabs rendered; click and keyboard
  navigation changed the active panel; mobile 390px had no horizontal overflow;
  the process board and docked specials treatment rendered correctly.
- Production health and tenant isolation smoke — `wingside.vn`, `wingsgo.vn`
  and `wingsplus.vn` returned HTTP 200; app live, PostgreSQL and Redis checks passed.
