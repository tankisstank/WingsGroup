# US-046 Implement WingSide consultative tour detail

## Status

in review

## Current Behavior

WingSide `/tour/:slug` resolves a published Page wrapper but previously falls
through to the generic Page renderer because structured tour detail was coupled
to the WingsGo retail capability. The 22 imported tours therefore expose only
breadcrumb/summary/footer, and importer-only operational sentences can remain
in public TourProduct fields.

## Target Behavior

WingSide receives a dedicated inbound, tailor-made structured tour detail while
WingsGo retail routes and capabilities remain unchanged. Cleanup of the 22
BestPrice records is batch- and site-scoped, reversible, and transaction-safe.
The approved Open Design hi-fi token posture, Home hierarchy and desktop-only
Specials navigation are adopted without changing CMS or auth behavior.

## Affected Users

- WingSide visitors on EN/IT/ES/PT/VI routes.
- Editors and site managers reviewing the 22 published tour products.
- Operations staff running dry-run/apply/rollback and release gates.

## Affected Product Docs

- `docs/product/wingsside-inbound-implementation-plan.md`
- `docs/product/wingsside-inbound-visual-and-motion-upgrade.md`
- `docs/stories/epics/E08-wingsside-inbound-upgrade/overview.md`

## Acceptance Criteria

- WingSide `/tour/:slug` renders hero, own-product gallery, route/overview,
  itinerary, services, related pages and consultative sticky CTA without
  enabling WingsGo schedule, market or campaign capabilities.
- Missing price or future departure renders localized contact state; no empty
  departure table, retail hold-seat copy, Offer schema or outbound content is
  exposed.
- Public Page and TourProduct reads remain same-site, published and
  wrapper-matched; public reads do not use `overrideAccess`.
- EN/IT/ES/PT/VI copy uses explicit maps with English fallback, route derivation
  and gallery mapping omit empty or cross-product content.
- Batch `wingsside-bestprice-22-20260717` cleanup targets exactly 22 published
  `wings-side` products and distinct same-site wrappers, preserves provenance,
  creates no records/versions and supports dry-run, atomic apply/resume and
  rollback with drift refusal.
- Full validation, 22-URL browser smoke, production backup/deploy/health checks
  and duplicate audit must pass before the story can be marked complete.

## Non-Goals

- Do not crawl or import tours again.
- Do not enable WingsGo retail listing capabilities on WingSide.
- Do not change schema, auth or business pricing rules.
- Do not deploy from the dirty main worktree or before every release gate passes.

## Current Evidence

Local implementation evidence through 2026-07-19:

- Commits `e2ca098`, `4ddec93`, `b91b728`, `9e6a735`, `4ba44b6` and `d9a9bee`
  cover trusted tenant resolution, hi-fi tokens/assets/Home/Specials, locale-safe
  paths, structured WingSide detail and atomic cleanup.
- Targeted tour unit/component/integration suites, TypeScript and optimized build
  passed during implementation review.
- Cleanup unit suite passed 15/15. Actual SQLite adapter proof passed 2/2 for
  JSON-scope parity and fail-closed apply. Actual isolated PostgreSQL 16 proof
  passed 2/2 for JSON parity, injected rollback, pre-commit drift rollback,
  apply and exact rollback with unchanged scoped version count.
- Local mobile browser evidence for IT at 320px and PT at 375px confirms localized
  CTA context, zero horizontal overflow, keyboard focusability, clean console and
  the 112px footer safe zone.
- The release-candidate validation ladder passed from the clean isolated worktree:
  TypeScript passed; lint completed with zero errors and 134 existing warnings;
  unit passed 150/150; component passed 24/24; integration passed 107 with 3
  intentional skips; the isolated PostgreSQL full E2E run passed 74/74 in
  1,047.9 seconds; and the production build passed in 143.5 seconds, including
  16/16 generated static pages. A fresh governed-copy core E2E check also passed
  1/1 in 197 seconds before the full run.

Pending evidence:

- Browser verification of the four named production tours and smoke of all 22 URLs.
- Production dry-run/apply, backup, deployment, health checks and duplicate audit.
