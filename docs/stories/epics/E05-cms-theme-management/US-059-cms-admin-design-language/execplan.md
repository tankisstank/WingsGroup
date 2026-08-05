# Execution plan

## Goal

Deliver the production-ready operator-console and admin-shell improvement that
the existing Payload contracts can support, together with a durable design
language for future CMS admin work. Preserve schemas, APIs, access controls,
generated files, and native Payload route ownership.

## Risk and hard gates

Risk flags are authorization, public contracts, existing behaviour,
cross-platform interaction, multi-domain scope, and weak proof. The work stays
in the high-risk lane.

Recorded decisions: both operator summaries use aggregate, read-only scope over
all site/locale records visible to the current session; drafts and lead metrics
use the named collection queries in `design.md`; Page Wizard retains default
`vi`; and Site Review stays read-only. Stop for unsupported lead/media/import/
dependency features and TourProduct type/pricing data.

## Phases

1. Re-audit current Payload configuration, collection access, plugin routes,
   and custom view sources against the route inventory. Confirm the exact
   status codes and query semantics used by each Console panel.
2. Apply the recorded scope and metric decisions. Split any proposed new data/API
   workflow into its own high-risk story rather than smuggling it into UI work.
3. Implement typed request results and per-panel retry behaviour in
   `AdminOperatorConsole`; keep real `fetchJSON`/`Promise.all` data loading and
   remove zero-on-error fallbacks. Correct the Search link to its real route.
4. Build the Console hierarchy: timestamp, context-aware header, task queue,
   context/warning rail, truthful metric row, role-aware workspace links, and
   real Page Wizard/Review/Lead CTAs.
5. Apply the design-language contract in the Console stylesheet,
   `AdminNavIntro` where needed, and scoped `custom.scss`. Retain native
   Payload navigation and both theme bootstrap keys. Never edit generated
   layout or import-map files by hand.
6. Add only supported task-specific confirmations and accessibility behaviour.
   Use native controls and links; keep Page Wizard and Site Review limited to
   current contractual capabilities unless their gate was approved.
7. Add or revise E2E coverage for role presentation, data states, routing,
   keyboard/dialog interaction, both theme bootstrap paths, and all required
   viewports. Use only sanitized test fixtures and no real lead content.
8. If a component import path changes, run
   `pnpm payload generate:importmap` from `app/`; do not hand-edit the output.
9. Run the mandatory validation ladder, capture evidence, update Harness and
   Plane, and request review for any remaining decision-gated behaviour.

## File boundaries

Expected implementation targets:

- `app/src/components/AdminOperatorConsole/index.tsx`
- `app/src/components/AdminOperatorConsole/index.scss`
- `app/src/components/AdminDashboard/WingsGroupMetrics.tsx` to remove duplicate
  zero-on-error metrics and use the same truthful labels
- `app/src/components/AdminDashboard/WingsGroupMetricsClient.tsx` for isolated
  hydrated request state and retry over existing authenticated REST routes
- `app/src/components/AdminDashboard/index.scss`
- `app/src/components/AdminMetrics/contract.ts`
- `app/src/components/BeforeDashboard/index.tsx` for truthful dashboard copy
- `app/src/app/(payload)/custom.scss`
- `app/src/components/AdminNavIntro/index.tsx` only when its triage links need
  adjustment
- `app/tests/e2e/admin.e2e.spec.ts`
- `app/tests/component/adminOperatorConsole.component.spec.tsx`
- `app/tests/component/wingsGroupMetrics.component.spec.tsx`
- `app/scripts/prepare-phase1-e2e-db.mjs`
- `app/scripts/seed-phase1-e2e-smoke.ts`
- `app/tests/unit/phase1E2EProcessLifecycle.unit.spec.ts`
- `docs/stories/epics/E05-cms-theme-management/US-059-cms-admin-design-language/cms-operator-console-prototype.html`
- `docs/stories/epics/E05-cms-theme-management/US-059-cms-admin-design-language/prototype-implementation-guide.md`

Do not modify `app/src/app/(payload)/layout.tsx` or
`app/src/app/(payload)/admin/importMap.js` directly. Do not add a collection or
migration under this story without a separately approved scope change.

## Stop conditions

Stop and return for a product decision when any metric cannot be defined from
an existing query, when a site or locale cannot be unambiguously scoped, when a
prototype control needs absent backend state, when an access audit identifies a
real security defect, or when satisfying the UI requires a schema/API/access
change. Record the evidence and create a follow-on high-risk story for the
approved change.
