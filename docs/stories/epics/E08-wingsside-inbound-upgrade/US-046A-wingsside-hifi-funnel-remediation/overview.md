# US-046A WingSide hi-fi funnel remediation

## Status

implemented

## Lane

high-risk

## Product Contract

Correct the eight-page WingSide hub funnel to match the locked Open Design
hi-fi (`wingside-hifi-fix-8pages.html`) while preserving Payload-first
content administration and leaving WingsGo retail behavior unchanged.

Independent black-box review (2026-07-21) returned **NO-GO**. US-046 tour-detail
and Home/Specials work remains valuable, but **must not be tracked as
fidelity-complete** for the 8-page hub.

**Tranche A accepted (2026-07-21)** after independent leader rerun of migration,
PG CRUD, unit, and runtime chrome proofs. Full hub fidelity and page-body
rebuild remain open for Tranche B+.

**Tranche B accepted locally (2026-07-22).** The 8-page desktop/mobile
re-review closed the corrective P1 findings. The remediation story is complete
in the isolated branch; production integration and VPS acceptance remain under
US-046 and the deploy freeze.

## Relevant Product Docs

- Independent NO-GO:
  `artifacts/reviews/wingsside-hifi-independent-review.md`
- Open Design handoffs under project `9f85d0db-9ebc-409a-b580-5b401e4a10b8`
- `docs/stories/epics/E08-wingsside-inbound-upgrade/US-046-wingsside-consultative-tour-detail/hifi-8page-mapping.md`

## Acceptance Criteria

- Tracking truth: US-046 and US-046A remain corrective/in_progress until a
  post-remediation 8×2 viewport re-review closes all P1 findings and shared
  chrome/section-order alignment.
- Typed Payload `wingsSideHiFi` content contract exists for the 8 locked hub
  routes (no opaque JSON editor). Drafts, versions, live preview, and site
  scope are preserved on Pages.
- `WingsSideHiFiPageModel` resolver validates route variant, locale selection,
  mandatory section/card/form slots, and surfaces critical gaps in
  preview/tests instead of silently truncating pages.
- Idempotent seed utility supports dry-run/report for EN/VI/IT/ES/PT from
  existing Copy.ts / media / form / page content. Apply is out of tranche A.
- Shared chrome foundation scoped to `body[data-site-code='wings-side']`:
  72px desktop header, full 7-route nav + language switcher + gold Plan trip
  CTA, correct active state, compact hi-fi footer, Plus Jakarta Sans / tokens.
- Page bodies (hero fidelity, full forms, 5 package cards, closing sections)
  are remediated in later tranches; tranche A does not claim visual fidelity.

## Non-Goals

- Do not claim Plane work-item sync when the Plane API returns payment/plan
  blocks; record the blocker accurately.
- Do not apply seed mutations in tranche A.
- Do not rebuild all page bodies in tranche A.
- Do not alter WingsGo behavior or lift the deploy freeze.

## Evidence

See `validation.md` for Tranche A proof commands and results.

Final local audit: `docs/AUDIT-US046-HIFI-LOCAL-2026-07-22.md`.

## Tranche B entry (known)

When a valid `wingsSideHiFi` model is active, the public 8-page wire must
**replace/suppress** legacy PageComposer body content rather than appending a
second hi-fi inventory (duplicate destinations/styles/sample/related).
