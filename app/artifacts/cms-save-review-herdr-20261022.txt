**Approve with limitations — commit `b63181c`.** No confirmed P1/P2/P3 findings in the scoped change.

- Both emitters supply the owning TourProduct document, preserving title/site fields and canonical ID.
- Installed Payload Relationship Input confirms the original missing-`doc.id` crash. Executed consumer checks passed for labels and ID/collection matching.
- Installed LivePreview Window checks passed for iframe/popup refresh.
- Departure stale-context guards include product, site and locale; readiness guards cover ID/locale and document identity.

**Verification:** `pnpm exec vitest run --config ./vitest.component.config.mts --configLoader runner --no-cache tests/component/tourAuthoringPreviewRefresh.component.spec.tsx tests/component/tourReadinessPreviewRefresh.component.spec.tsx` → **15/15 passed, exit 0**. In-memory installed-consumer checks → **PASS**.

Not checked: production browser flow, server authorization, or same-ID site reassignment during readiness requests; readiness’s context key excludes site.
No files edited, deployment performed, or subagents used.