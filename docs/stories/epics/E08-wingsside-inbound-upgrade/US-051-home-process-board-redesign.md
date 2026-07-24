# US-051 Redesign homepage WingSide process board

## Status

Đang rà soát

## Lane

normal

## Product Contract

Homepage WingsSide replaces the equal-weight four-step card grid in `home-pillars`
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
| Unit | Existing unit suite passed: 44 files / 311 tests. |
| Component | Full component suite passed: 11 files / 38 tests; new process-board tests cover rendering and keyboard interaction. |
| E2E | Added homepage process-board test for four tabs, keyboard navigation, CTA, overflow, and bounding-box stability. Execution blocked during fixture preparation by existing theme seed validation (`site-settings.brand.themeCode`), after one transient SQLite lock failure. |
| Platform | Build passed. Live visual QA was blocked because the available local database did not render `home-pillars`; route `/wingsside` returned 404 and root fixture rendered a different site composition. |
| Release | `pnpm run build` passed. |

## Harness Delta

- Added a normal-lane story for the bounded homepage UI change.
- Added executable component and E2E acceptance coverage.
- Recorded fixture/seed blockers rather than weakening the required proof.

## Evidence

- `pnpm exec eslint src/components/WingsSideHiFi/HomeProcessSteps.tsx src/components/WingsSideHiFi/HomeHiFiPage.tsx tests/component/homeProcessSteps.component.spec.tsx tests/e2e/frontend.e2e.spec.ts --no-warn-ignored` — pass.
- `pnpm exec tsc --noEmit --pretty false` — pass.
- `pnpm run test:component` — pass, 38/38.
- `pnpm run test:unit` — pass, 311/311.
- `pnpm run lint` — pass with 0 errors and 143 pre-existing warnings.
- `pnpm run build` — pass.
- `pnpm run test:e2e:sqlite -- tests/e2e/frontend.e2e.spec.ts -g "homepage WingSide process board"` — blocked in seed preparation; no process-board assertion executed.
