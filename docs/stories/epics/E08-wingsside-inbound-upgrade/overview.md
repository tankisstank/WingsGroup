# E08 - WingSide inbound upgrade

> Current identity contract: public site name `wingside.vn`, technical tenant
> code `wing-side`, local alias `/wingsside`, theme key `wings-side`. Historical
> story wording may retain `WingSide` when describing earlier evidence; new
> implementation and launch decisions follow
> `docs/product/wingside-identity-contract.md`.

## Status

in progress

## Product docs

- `docs/product/wingsside-inbound-visual-and-motion-upgrade.md`
- `docs/product/wingsside-inbound-implementation-plan.md`

## Objective

Implement the WingSide inbound visual, motion, content, and locale upgrade in
safe slices. The initiative keeps the existing Payload-first, multisite-ready
architecture and avoids building a parallel site, CMS, or page builder.

## Workstreams

| Story   | Lane      | Status              | Workstream                                                          |
| ------- | --------- | ------------------- | ------------------------------------------------------------------- |
| US-026  | normal    | implemented         | Audit and story setup                                               |
| US-027  | normal    | implemented         | Theme foundation                                                    |
| US-028  | normal    | implemented         | Motion primitives                                                   |
| US-029  | normal    | implemented         | Inbound hero and search preset                                      |
| US-030  | normal    | implemented         | Page Composer block upgrades                                        |
| US-031  | high-risk | implemented         | Locale infrastructure expansion                                     |
| US-032  | normal    | implemented         | Header, mega menu, language switcher                                |
| US-033  | normal    | implemented         | Content and media seed                                              |
| US-034  | normal    | implemented         | Launch readiness proof                                              |
| US-045  | high-risk | implemented locally | BestPrice 22 import and publish preparation                         |
| US-046  | high-risk | implemented         | WingSide consultative tour detail and production data repair        |
| US-046A | high-risk | implemented         | WingSide 8-page hi-fi funnel remediation                            |
| US-047  | normal    | production released | Governed 24-record credentials catalog and reusable CMS block       |
| US-048  | high-risk | implemented         | Eight-page hi-fi parity remediation and DOM review contract         |
| US-049  | high-risk | production released | WingSide tour taxonomy and BestPrice 22 classification             |
| US-050  | high-risk | planned             | Real-tour Home discovery and BUG-WS-001 remediation                 |
| US-051  | normal    | production released | WingSide homepage process-board redesign                            |

## Current evidence

- US-026 registered US-026 through US-034 in Harness.
- All E08 stories are now implemented in repo docs and have Harness/Plane proof
  updates.
- US-026 captured locale, block, hero, and content source audit in
  `docs/stories/epics/E08-wingsside-inbound-upgrade/audit.md`.
- US-027 added `wings-side-editorial-inbound-v2`, seeded WingSide to use it,
  scoped CSS for the inbound editorial look, integration/E2E proof, and
  screenshots for WingSide desktop/mobile plus WingsGo no-leak.
- US-028 added reusable `RevealOnScroll`, `CountUp`, `useScrollDirection`, and
  CSS motion utilities with reduced-motion behavior and component test proof.
- US-031 completed the high-risk locale slice: central locale metadata now covers
  9 CMS locales, public locale exposure is gated to VI/EN/IT/ES/PT, Payload
  types were regenerated, hardcoded public chrome `locale === 'en'` branches
  were cleaned up into `getCopyLocale()` fallback maps, public locale E2E now
  passes, and PostgreSQL migration smoke passed on PostgreSQL 16.14.
- US-029 added the WingSide `wingsside-inbound-cinematic-search` preset,
  image-only homepage carousel slides, Ken Burns marker/CSS, planner form
  overlay, site-aware `/plan-your-trip` submit, and targeted E2E proof.
- US-030 extended governed Page Composer blocks for WingSide inbound pages:
  `Stats` now uses CountUp progressive enhancement, `Testimonial` supports an
  accessible carousel without default fake ratings, the WingSide homepage seed
  uses `InfoStrip`/`FeatureGrid`/`Stats`/`Testimonial`, and the itinerary grid
  decision is documented as `FeatureGrid` for wave-1 static marketing cards.
- US-032 added the WingSide-only inbound mega menu, mobile mega links and
  public-locale language switcher using central locale metadata; E2E covers
  desktop open/escape behavior, `aria-current`, public-disabled locale hiding,
  mobile menu rendering and WingsGo no-leak smoke. The 2026-07-08 manual-review
  follow-up added outside-click close, a visual connector between trigger and
  panel, locale-root route normalization, and header overflow protection for
  WingsGo.
- US-033 added the WingSide content/media control sheet with page map, claim
  register, asset provenance, competitor-copy guard and content/legal checklist;
  seed, copy guard and targeted E2E prove the six core EN pages and public
  EN/IT/ES/PT exposure without fake reviews/ratings/licence claims. The
  2026-07-08 manual-review follow-up deepened the six core child pages and added
  native IT/ES/PT seed content plus localized WingSide navigation/settings.
- US-034 completed the launch readiness proof: typecheck, lint, integration,
  component, build, targeted E2E, go-live review, screenshot artifacts and
  canonical/hreflang/sitemap checks all have recorded evidence. Full local
  E2E prepare-db remains documented as SQLite `SQLITE_BUSY` when a second local
  writer tries to push the test schema.
- US-046 isolates WingSide structured tour detail from WingsGo retail
  capabilities and provides the guarded, reversible repair for the 22 imported
  tours. The 2026-07-21 NO-GO remains historical audit evidence. WP5 deployed
  commit `a0761ec84a5029938ba5340effb40ebba021bcab`, applied the exact 22-tour
  repair, passed 22/22 production URL smoke, and verified the target tour with
  one form, 45 markers and three real related tours. US-046 is implemented.
- US-046A delivered the typed Payload hi-fi contract, validated route model,
  governed Plan/Contact form ownership, eight complete hub compositions and
  scoped WingSide chrome. WP5 applied and verified 40 page/locale entries,
  then production passed the 54/54 responsive matrix and eight-page browser
  audit. US-046A is implemented.
- US-047 turns the hi-fi credentials/awards carousel into a governed Payload
  Page Composer block. Editors can reuse it across pages and replace its image,
  copy, ordering, autoplay, and timing without a frontend code change; Home
  preserves its locked carousel position and legacy fallback until configured.
  Master commit `0cc90d9276c5256e572af37ba223bfa357ae4b15` is now live on
  `wingside.vn`. PostgreSQL migration and the checksummed production catalog
  plan passed with 24 Media records, five localized blocks and 120 placements.
  Public desktop/mobile QA renders exactly 21 verified awards per locale, while
  production schema/API proof confirms 24 CMS-managed rows per locale.
  Authenticated production Admin QA also passed on Page 142: the Published
  editor showed 24 rows (21 verified and three needs-review), 24 Media
  relations and the complete governed field contract in all five locales. The
  read-only audit made no content change, invoked neither Save nor Publish and
  produced no browser console errors or warnings.
- US-048 closes the audited eight-page UI defects: single-owner Plan and Contact
  forms, complete CMS-backed package/channel inventories, corrected hero media
  and responsive controls, stable card-level review markers, and desktop/mobile
  evidence. WP5 production review completed 91/91 checks with tenant canonical,
  robots, sitemap and security probes passing; the final decision is
  `pass_with_notes`. US-048 is implemented.
- US-049 and US-050 capture the post-parity product-data Change Request. US-049
  adds controlled destination/style taxonomy and a reviewed backfill for the 22
  imported tours. US-050 uses those real records for Home discovery and closes
  BUG-WS-001, where Sample Journeys currently presents static product facts.
- US-049 schema, query contract, migration, guarded backfill and 22-record
  technical map are implemented and live in production. Editorial/PM approval
  of revision `us-049-v1-20260724` was recorded before apply. Release
  `e451cb03a4ad5b961895470b854a97aa4c1381f6` verified all 22 products at the
  signed `after` state; the post-apply dry-run is idempotent at 0 changes.
- US-051 replaces the equal-weight homepage process cards with the accepted
  four-step planning board. The stakeholder-approved desktop/mobile treatment,
  click and keyboard behavior, fixed stage and overflow contracts are live in
  production in release `e451cb03a4ad5b961895470b854a97aa4c1381f6`.

## Current constraints

- `app/src/tours/sectionRegistry.ts` is not the Page Composer registry.
- Page Composer blocks are registered through `Pages.layout` and `app/src/blocks/*`.
- Hero field config lives in `app/src/heros/config.ts`.
- Locale expansion has a broad blast radius and must separate CMS-enabled,
  public-enabled, and ads-ready locales.
