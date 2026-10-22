# Narrow follow-up review — 2026-10-22

## Final finding disposition

Prior finding: P2 — An in-flight action can refresh an inactive or replaced preview.
Disposition: RESOLVED for the reported retained-callback race.

No additional release-blocking P1/P2/P3 findings in the reviewed hook, focused test, and related caller/initializer diff. This is a narrow review disposition, not a deployment approval or a whole-application audit.

## Evidence and reasoning

- useTourPreviewRefresh.ts updates current.current with documentID, locale, and the preview context on every render. A retained callback reads current.current.preview when invoked, rather than the preview object captured before an async request.
- The captured documentID and locale are compared with current.current before navigation. A callback retained for a different tour or locale returns without calling setURL.
- tourPreviewRefresh.component.spec.tsx returns a fresh context object on each render via ({ ...preview }). Each of the four regression cases retains result.current, changes state/props, calls React Testing Library rerender, and invokes the retained savedCallback inside act. These are actual React rerender executions, not a standalone simulation of the hook logic or mutation of its original context object.
- Disabled preview: the retained callback sees the new disabled state and does not navigate.
- Different initializer: the new pages initializer fails the current URL collection guard; the retained callback does not overwrite it with the old tour URL.
- Different tour / locale: only the corresponding hook prop changes; the original initializer still matches the old captured identity. These cases therefore exercise the new identity guard rather than incidentally passing because the URL changed.
- The existing success case still produces distinct refresh values and preserves document ID, locale, and path. Origin, endpoint, credentials, collection, ID, and locale checks remain in place.
- Narrow caller diff: index.tsx and TourAuthoringReadiness.tsx call the hook after successful authoring updates. Readiness retains its request-generation guard and document-ID check. The hook adds invocation-time protection for callbacks retained across preview/context rerenders.
- Narrow initializer diff: submission is deferred from window load to setTimeout(..., 0). The test executes the generated HTML in JSDOM, verifies load queues exactly one task, and invokes that task to confirm submission of the intended form. POST handoff, no-store response, and manual submit fallback remain intact.

## Fresh verification

Executed from E:/repo/WingsTravel/app on 2026-10-22; times below are the local Vitest output.

1. Start 18:15:09; exit 0; 5 files, 35 tests passed:

```powershell
pnpm exec vitest run --config ./vitest.component.config.mts --configLoader runner --cache=false tests/component/tourPreviewRefresh.component.spec.tsx tests/component/tourAuthoring.component.spec.tsx tests/component/tourAuthoringPreviewRefresh.component.spec.tsx tests/component/tourAuthoringReadiness.component.spec.tsx tests/component/tourReadinessPreviewRefresh.component.spec.tsx
```

2. Start 18:15:24; exit 0; 1 file, 13 tests passed. Verbose output explicitly confirmed all four retained-callback scenarios (disabled, different initializer, different tour, different locale):

```powershell
pnpm exec vitest run --config ./vitest.component.config.mts --configLoader runner --cache=false tests/component/tourPreviewRefresh.component.spec.tsx --reporter=verbose
```

3. Start 18:15:24; exit 0; 1 file, 11 tests passed:

```powershell
pnpm exec vitest run --config ./vitest.unit.config.mts --configLoader runner --cache=false tests/unit/localPreviewRoute.unit.spec.ts
```

## Scope and limits

Reviewed the prior audit, actual hook and focused test, current caller context, related caller/initializer diffs and tests, and test runner configurations. No broad source exploration or deployment archives were read. No application code/test edits, deployment, network writes, or subagents; only this requested disposition artifact was added.

Not checked: live browser/production cross-domain handoff, downstream cache behavior, full build/E2E suite, or unrelated changes. Retained-callback tests invoke the saved function after rerender directly; they do not model a deferred network promise end to end. Different initializer coverage uses an unrelated collection, not every possible same-tour URL change. No unresolved release blocker was found within this scope.
