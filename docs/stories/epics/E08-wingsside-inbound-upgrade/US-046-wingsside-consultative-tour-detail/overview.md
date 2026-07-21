# US-046 Implement WingSide consultative tour detail

## Status

in_progress

## Corrective note (2026-07-21)

**Not fidelity-complete for the 8-page hi-fi funnel.** Independent black-box
review returned **NO-GO**
(`artifacts/reviews/wingsside-hifi-independent-review.md`).
Tour-detail consultative surface, batch cleanup, and Home/Specials tokens remain
valuable evidence, but shared chrome, inquiry funnel, truncated secondary
templates, and hero composition still fail acceptance. Remediation continues
under **US-046A** (and remaining US-046 corrective work). Do not mark Full /
implemented for hub fidelity until a post-remediation 8×2 re-review passes.

## Local corrective result (2026-07-22)

The post-remediation local review now returns **LOCAL GO / PRODUCTION HOLD** for
the eight official hub routes plus Tour Detail. See
`docs/AUDIT-US046-HIFI-LOCAL-2026-07-22.md`. Deployment remains frozen, so the
story stays `in_progress` until the approved branch is integrated and the VPS
is re-audited against the same matrix.

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
- The corrective release-candidate validation ladder passed from clean commit
  `05055019`: TypeScript passed in 10.4 seconds; lint passed in 130.2 seconds
  with zero errors and 134 existing warnings; unit passed 193/193; component
  passed 24/24; integration passed 108 with 3 intentional skips; full isolated
  PostgreSQL E2E passed 75/75 in 1,366.2 seconds; and the production build passed
  in 258.2 seconds with 16/16 generated static pages and standalone assets.
- The first controlled production release created an encrypted PostgreSQL backup,
  verified and applied the exact 22-record cleanup, deployed structured detail,
  passed health checks, passed the 22/22 live tour smoke and found no duplicate
  records. Production acceptance was stopped when adversarial Home review found
  the Specials widget unstyled and full-width under the WingSide custom theme.
- Corrective commits `61a64c1`, `37bd1eb` and `05055019` scope the hi-fi system by
  real site identity, seed that identity in browser fixtures and keep the 268px
  Specials widget clear of header/hero controls. Approved 768/1280/1440 evidence
  records a 19-23px clearance below the site header/banner; desktop and mobile
  visual baselines are stable.
- The final E2E report is preserved outside the worktree with SHA-256
  `71BD4944930F54F92DD9867B1FE016C081B3F545F4724B039966800D7169C5F9`.

- Adaptive corrective commit `a083127` then passed the complete clean ladder:
  TypeScript, lint, 193/193 unit, 24/24 component, 108 passed/3 skipped
  integration, 75/75 isolated PostgreSQL E2E, optimized build and remote Docker
  build. The exact `app` archive SHA-256 is
  `708fb9abc65f1677123b5710a6bb10c425ce7da963ec7cf696f44e066e595f7a`.
- Production now serves release
  `us046-adaptive-a083127-20260719T121049Z`; public live/ready are 200. Home
  browser QA passed at 768/1024/1280/1440, the widget is absent below 768,
  keyboard routing, session dismissal and reduced motion pass, and no broken
  image, overflow or page error was found.
- All 22 tour URLs passed the deterministic public SSR smoke. The four required
  tours additionally passed desktop/mobile browser QA with valid canonical,
  exact consultative CTA, no Offer/departure table/forbidden copy, product-owned
  gallery and no image/alt/console/overflow failures. WingsGo detail, schedule
  and valid market plus WingsPlus no-tour regressions passed.
- Final read-only production audit confirms 22 published products, 22 distinct
  same-site wrappers, 714 distinct referenced media, zero future departures,
  zero duplicate code/slug/page-path/media filename and zero public technical
  sentence. The 22 wrappers currently have no `Page.relatedPages` relations, so
  the live renderer correctly omits that empty section; positive related-page
  rendering remains covered by component and full E2E proof.
- Evidence and screenshots are preserved outside the worktree under
  `WingsTravel-evidence/us046-production-20260719/us046-adaptive-a083127-20260719T121049Z`;
  its checksum manifest SHA-256 is
  `95f87379b559a3f3f9e121b7bcc45bbae6c0b24987148812d707f32520427d1a`.
