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

Before any implementation that changes a command contract or claims a workflow,
obtain a recorded human decision for: metric semantics, selected-site/locale
policy, Page Wizard locale creation, Site Review workflow scope, unsupported
lead/media/import/dependency features, and TourProduct type/pricing data.

## Phases

1. Re-audit current Payload configuration, collection access, plugin routes,
   and custom view sources against the route inventory. Confirm the exact
   status codes and query semantics used by each Console panel.
2. Confirm the open product decisions. Split any approved new data/API workflow
   into its own high-risk story rather than smuggling it into UI work.
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
- `app/src/app/(payload)/custom.scss`
- `app/src/components/AdminNavIntro/index.tsx` only when its triage links need
  adjustment
- `app/tests/e2e/admin.e2e.spec.ts`

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
