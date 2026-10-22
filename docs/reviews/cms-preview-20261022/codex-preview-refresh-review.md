## Confirmed finding

**P2 — An in-flight action can refresh an inactive or replaced preview.**

[useTourPreviewRefresh.ts:7](/E:/repo/WingsTravel/app/src/components/TourAuthoring/useTourPreviewRefresh.ts:7) captures `isLivePreviewing`, `url`, and `setURL` per render. The returned callback checks those captured values at [line 11](/E:/repo/WingsTravel/app/src/components/TourAuthoring/useTourPreviewRefresh.ts:11).

An async action retains that callback across its request, then invokes it at [TourAuthoringReadiness.tsx:319](/E:/repo/WingsTravel/app/src/components/TourAuthoring/TourAuthoringReadiness.tsx:319). Closing preview or changing its URL while the request runs does not change the document/locale generation guard. Successful completion therefore navigates using the old initializer.

**Reproduced in memory using the actual hook and React rerenders:**

- Preview disabled during save: retained callback still calls `setURL`.
- Preview changed to a different initializer: retained callback overwrites it with the original tour initializer.

Read current preview state at invocation time and invalidate pending refreshes when the preview context changes. Add deferred-success coverage for both cases.

## Other audit results

No additional confirmed P1/P2/P3 findings. The initializer guards enforce origin, credentials, endpoint, collection, document ID, and locale against their captured snapshot. The diff adds no messaging/auth trust. Server-side tenant/path/locale resolution, `no-store`, POST-only handoff, and manual fallback remain intact. Installed Payload confirms `setURL` resets readiness and updates the iframe URL.

## Verification

From `app/`, both commands exited **0**:

```powershell
pnpm exec vitest run --config ./vitest.component.config.mts --configLoader runner --cache=false tests/component/tourPreviewRefresh.component.spec.tsx tests/component/tourAuthoring.component.spec.tsx tests/component/tourAuthoringPreviewRefresh.component.spec.tsx tests/component/tourAuthoringReadiness.component.spec.tsx tests/component/tourReadinessPreviewRefresh.component.spec.tsx
```

**31 passed.**

```powershell
pnpm exec vitest run --config ./vitest.unit.config.mts --configLoader runner --cache=false tests/unit/localPreviewRoute.unit.spec.ts
```

**11 passed.**

No edits, network writes, deployment, or subagents. Live production/browser handoff and downstream cache behavior were not exercised; the confirmed stale-preview race remains unresolved.