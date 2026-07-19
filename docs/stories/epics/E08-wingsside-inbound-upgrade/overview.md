# E08 - WingsSide inbound upgrade

## Status

in progress

## Product docs

- `docs/product/wingsside-inbound-visual-and-motion-upgrade.md`
- `docs/product/wingsside-inbound-implementation-plan.md`

## Objective

Implement the WingsSide inbound visual, motion, content, and locale upgrade in
safe slices. The initiative keeps the existing Payload-first, multisite-ready
architecture and avoids building a parallel site, CMS, or page builder.

## Workstreams

| Story | Lane | Status | Workstream |
| --- | --- | --- | --- |
| US-026 | normal | implemented | Audit and story setup |
| US-027 | normal | implemented | Theme foundation |
| US-028 | normal | implemented | Motion primitives |
| US-029 | normal | implemented | Inbound hero and search preset |
| US-030 | normal | implemented | Page Composer block upgrades |
| US-031 | high-risk | implemented | Locale infrastructure expansion |
| US-032 | normal | implemented | Header, mega menu, language switcher |
| US-033 | normal | implemented | Content and media seed |
| US-034 | normal | implemented | Launch readiness proof |
| US-045 | high-risk | implemented locally | BestPrice 22 import and publish preparation |
| US-046 | high-risk | implemented | WingSide consultative tour detail and hi-fi adoption |

## Current evidence

- US-026 registered US-026 through US-034 in Harness.
- All E08 stories are now implemented in repo docs and have Harness/Plane proof
  updates.
- US-026 captured locale, block, hero, and content source audit in
  `docs/stories/epics/E08-wingsside-inbound-upgrade/audit.md`.
- US-027 added `wings-side-editorial-inbound-v2`, seeded WingsSide to use it,
  scoped CSS for the inbound editorial look, integration/E2E proof, and
  screenshots for WingsSide desktop/mobile plus WingsGo no-leak.
- US-028 added reusable `RevealOnScroll`, `CountUp`, `useScrollDirection`, and
  CSS motion utilities with reduced-motion behavior and component test proof.
- US-031 completed the high-risk locale slice: central locale metadata now covers
  9 CMS locales, public locale exposure is gated to VI/EN/IT/ES/PT, Payload
  types were regenerated, hardcoded public chrome `locale === 'en'` branches
  were cleaned up into `getCopyLocale()` fallback maps, public locale E2E now
  passes, and PostgreSQL migration smoke passed on PostgreSQL 16.14.
- US-029 added the WingsSide `wingsside-inbound-cinematic-search` preset,
  image-only homepage carousel slides, Ken Burns marker/CSS, planner form
  overlay, site-aware `/plan-your-trip` submit, and targeted E2E proof.
- US-030 extended governed Page Composer blocks for WingsSide inbound pages:
  `Stats` now uses CountUp progressive enhancement, `Testimonial` supports an
  accessible carousel without default fake ratings, the WingsSide homepage seed
  uses `InfoStrip`/`FeatureGrid`/`Stats`/`Testimonial`, and the itinerary grid
  decision is documented as `FeatureGrid` for wave-1 static marketing cards.
- US-032 added the WingsSide-only inbound mega menu, mobile mega links and
  public-locale language switcher using central locale metadata; E2E covers
  desktop open/escape behavior, `aria-current`, public-disabled locale hiding,
  mobile menu rendering and WingsGo no-leak smoke. The 2026-07-08 manual-review
  follow-up added outside-click close, a visual connector between trigger and
  panel, locale-root route normalization, and header overflow protection for
  WingsGo.
- US-033 added the WingsSide content/media control sheet with page map, claim
  register, asset provenance, competitor-copy guard and content/legal checklist;
  seed, copy guard and targeted E2E prove the six core EN pages and public
  EN/IT/ES/PT exposure without fake reviews/ratings/licence claims. The
  2026-07-08 manual-review follow-up deepened the six core child pages and added
  native IT/ES/PT seed content plus localized WingsSide navigation/settings.
- US-034 completed the launch readiness proof: typecheck, lint, integration,
  component, build, targeted E2E, go-live review, screenshot artifacts and
  canonical/hreflang/sitemap checks all have recorded evidence. Full local
  E2E prepare-db remains documented as SQLite `SQLITE_BUSY` when a second local
  writer tries to push the test schema.
- US-046 isolates WingSide structured tour detail from WingsGo retail
  capabilities, adopts the approved hi-fi Home/Specials posture, and adds an
  atomic batch-scoped cleanup for the 22 imported tours. Adaptive commit
  `a083127` passed the full ladder (193 unit, 24 component, 108 integration,
  75 isolated PostgreSQL E2E and build), is live in production, and passed Home
  responsive/interaction QA, 22/22 public tour smoke, four named desktop/mobile
  browser checks, WingsGo/WingsPlus regression and a zero-duplicate read-only
  database audit.

## Current constraints

- `app/src/tours/sectionRegistry.ts` is not the Page Composer registry.
- Page Composer blocks are registered through `Pages.layout` and `app/src/blocks/*`.
- Hero field config lives in `app/src/heros/config.ts`.
- Locale expansion has a broad blast radius and must separate CMS-enabled,
  public-enabled, and ads-ready locales.
