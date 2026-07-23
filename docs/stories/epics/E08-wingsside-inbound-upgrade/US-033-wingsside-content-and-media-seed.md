# US-033 WingsSide content and media seed

## Status

implemented

## Lane

normal

## Product Contract

WingsSide has EN/IT/ES/PT launch content and media seed data with provenance,
without copying competitor text, assets, testimonials, ratings or unsupported
claims.

## Relevant Product Docs

- `docs/product/wingsside-inbound-implementation-plan.md`
- `docs/product/wingsside-inbound-content-map.md`

## Acceptance Criteria

- `docs/product/wingsside-inbound-content-map.md` exists.
- Content map includes page map, claim register, asset provenance and competitor
  copy guard.
- Six core pages have EN content.
- IT/ES/PT content has QA status before public/ads launch.
- No fake testimonials, fake ratings, fake licence claims or copied assets.

## Design Notes

- Commands: seed script, copy guard `rg`, go-live review when available.
- UI surfaces: Pages, Media, Hero presets, Page Composer blocks.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Not required unless seed helpers added |
| Integration | Seed/import script checks |
| E2E | Core pages render desktop/mobile |
| Platform | Go-live review artifacts |
| Release | Content/provenance checklist signed off |

## Harness Delta

Update matrix evidence after implementation.

## Evidence

Implemented on 2026-07-07.

- Created `docs/product/wingsside-inbound-content-map.md` with the required page
  map, claim register, asset provenance, competitor copy guard and
  content/legal checklist.
- Confirmed six core WingsSide pages have EN launch content:
  `/wingsside`, `/wingsside/destinations`, `/wingsside/styles`,
  `/wingsside/packages`, `/wingsside/plan-your-trip`, `/wingsside/contact-us`.
- Documented IT/ES/PT as public technical routes with English fallback and
  explicit native QA gate before paid ads; JA/KO/FR/DE remain CMS-only.
- Seed proof: `pnpm exec tsx scripts/seed-subsites.ts` completed successfully
  against local SQLite.
- E2E proof:
  `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_REUSE_EXISTING_SERVER=true PLAYWRIGHT_SKIP_PHASE1_SEED=true pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts -g "WingsSide inbound core content pages|WingsSide governed inbound composer blocks|WingsSide inbound header|WingsSide language switcher|CMS-only locales"`
  passed 5/5.
- Copy guard: `rg -n "Anvui|Easia|Autour|Tripadvisor|licensed DMC|best travel agency|number one|award-winning|4\.9 stars|1,200\+" app/scripts/seed-subsites.ts app/src docs/product/wingsside-inbound-content-map.md`
  found no public seed/app competitor-copy hits; the only hit is the
  content-map rule that disallows Tripadvisor/review claims without source.
- No fake testimonial/rating proof: E2E asserts WingsSide homepage has zero
  `.layout-testimonial__rating` elements; content-map claim register disallows
  unsupported reviews, ratings, licence and award claims.

Follow-up implementation on 2026-07-08 after manual review:

- Added denser seed content to the six core WingsSide pages so child pages no
  longer feel like placeholder grids. Hubs now reuse WingsSide media and add
  explanatory content/media/info sections before conversion CTAs.
- Added native IT/ES/PT localized seed data for the six core WingsSide pages
  and localized WingsSide site settings/navigation for those public ad locales.
- Selective local seed proof:
  `SEED_ONLY_SITE=wings-side pnpm exec tsx scripts/seed-subsites.ts` PASS after
  stopping the local Next dev server and running a SQLite checkpoint.
- HTTP smoke after reseed: `/wingsside/it`, `/wingsside/destinations` and
  `/wingsgo` returned 200.
- 2026-07-08 targeted E2E:
  `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_REUSE_EXISTING_SERVER=true PLAYWRIGHT_SKIP_PHASE1_SEED=true pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts -g "WingsSide inbound header|WingsSide localized root pages|WingsSide inbound core content pages"`
  PASS 3/3.
- Follow-up fix on 2026-07-08 after final external review:
  - IT/ES/PT WingsSide `site-settings.seo` seed now includes native
    `defaultDescription`, `defaultTitle` and `titleSuffix` instead of inheriting
    the English `Inbound Vietnam` suffix.
  - Selective seed now always seeds/refreshes theme presets first, preventing
    `SEED_ONLY_SITE=wings-side` from creating WingsSide settings with a null
    `branding.themePreset` relation and falling back to `premium`.
  - Seed runtime now disables version writes and Payload local transactions for
    seed operations to reduce SQLite writer contention during large local
    bootstrap.
- 2026-07-08 code validation for this follow-up:
  `pnpm exec tsc --noEmit` PASS; targeted eslint PASS with the existing
  `scripts/seed-subsites.ts` `no-explicit-any` warnings only.
- 2026-07-08 local data validation blocker:
  SQLite/libsql still returns `SQLITE_BUSY` during large WingsSide/full DB seed
  attempts, including on a newly recreated `payload-tourplatform.db` while
  `PAYLOAD_DB_PUSH=true` was creating version block tables. This blocks a clean
  local reseed proof. The code path should be revalidated against PostgreSQL or
  after the local SQLite lock issue is cleared.
- 2026-07-08 blocker resolution:
  - Seed helpers now explicitly create all base localized records with
    `locale: 'vi'`, preventing Payload `req.locale` mutation from causing later
    site records to be created under the previous localized update locale.
  - PostgreSQL proof DB `wings_seed_proof` was reset and fully seeded with
    `DATABASE_URL=postgresql://.../wings_seed_proof PAYLOAD_DB_PUSH=true pnpm exec tsx scripts/seed-subsites.ts`.
    Result: PASS, `Production-oriented subsites seeded successfully.`
  - Verified `/wingsside/it` against the PostgreSQL-backed dev server:
    `data-site-preset="wings-side-editorial-inbound-v2"` and browser title
    `WingsSide | Vietnam su misura`.
  - Final targeted E2E against PostgreSQL-backed `localhost:3000` PASS 4/4 for
    WingsSide header, localized root pages, language switcher hrefs and core
    content pages.
  - Local SQLite remains a bootstrap-only friction item tracked in Harness
    backlog #5; it is no longer blocking E08 proof because PostgreSQL is the
    required production/staging proof path.
- 2026-07-08 UI/UX content cleanup after `agent-browser` review:
  - Replaced visible seed/proof labels in WingsSide media and core pages:
    `WingsSide inbound hero`, `Vietnam destination cover`,
    `Vietnam travel styles image`, `Vietnam sample itineraries image` and
    `Planning cue` are no longer emitted in seed/runtime UI.
  - Core page copy was tightened from implementation-facing labels to
    customer-facing editorial copy such as `Start with a shortlist`,
    `Key Vietnam destinations`, `Choose your travel style` and
    `Sample itinerary structures`.
  - Localized IT/ES/PT root-page hero links and CTA links now use native labels
    instead of English fallback labels.
  - FeatureGrid links for WingsSide English seed pages now use `Explore`
    instead of the Vietnamese helper default `Xem thêm`.
  - PostgreSQL proof DB `wings_seed_proof` was reseeded successfully with the
    updated content, ending with `Production-oriented subsites seeded
    successfully.`
  - `agent-browser` runtime smoke confirmed `/wingsside/destinations` has no
    seed-label regex hits and `/wingsside/plan-your-trip` renders the English
    form support heading instead of the Vietnamese heading.
- 2026-07-09 follow-up after manual validation:
  - IT/ES/PT WingsSide homepage seed now uses the same full inbound homepage
    structure as EN/VI instead of the earlier abbreviated localized template:
    inherited cinematic hero carousel, trust strip, why-WingsSide bento grid,
    stats, destination hub, travel styles, sample itineraries, planning-note
    carousel and final CTA.
  - The localized homepage content reuses WingsSide media IDs and native
    IT/ES/PT copy for paid-traffic entry pages, while keeping planning notes
    explicitly framed as sample planning notes rather than real testimonials.
  - PostgreSQL proof DB `wings_seed_proof` was reseeded successfully with
    `DATABASE_URL=postgresql://.../wings_seed_proof PAYLOAD_DB_PUSH=true pnpm exec tsx scripts/seed-subsites.ts`,
    ending with `Production-oriented subsites seeded successfully.`
  - Browser smoke confirmed one-click `/wingsside/en` -> `/wingsside/it`,
    visible Italian H1, and footer link computed style
    `color: rgb(5, 40, 41)` on a light button background. Screenshot:
    `artifacts/wingsside-locale-footer-after-fix/wingsside-it-home-after-fix.png`.
- 2026-07-09 seed maintainability follow-up:
  - Refactored the IT/ES/PT WingsSide homepage seed away from repeated nested
    locale ternaries by introducing `localizedHomeBlockCopy` lookup data for
    trust-strip items, why-WingsSide cards, stats, travel styles, sample
    packages and planning-note carousel entries.
  - The refactor keeps the reviewed native copy and page structure intact while
    making future paid-locale expansion a data-table change rather than a
    repeated branch edit across each block.
  - PostgreSQL proof DB `wings_seed_proof` reseed PASS with
    `DATABASE_URL=postgresql://.../wings_seed_proof PAYLOAD_DB_PUSH=true pnpm exec tsx scripts/seed-subsites.ts`,
    ending with `Production-oriented subsites seeded successfully.`
  - Validation: `pnpm exec tsc --noEmit` PASS; targeted eslint PASS with only
    existing `scripts/seed-subsites.ts` `no-explicit-any` warnings; targeted
    Playwright PASS 3/3 for WingsSide hero/header/localized root pages.
- 2026-07-14 customer-feedback follow-up:
  - Replaced the implementation-facing inbound planning strip with four
    production content cards linking to trip planning, destinations, about and
    guide content; localized homepage backfill uses the same linked structure.
  - Rewrote trust/stat copy to describe published planning content rather than
    internal proof, launch-ad or placeholder language.
  - FeatureGrid cards are now whole-card links for destinations, travel styles,
    sample itineraries and the new planning entry cards. Related-page cards in
    `Continue exploring` are also whole-card links.
  - Expanded Traveler notes from three to eight editorial planning scenarios in
    EN/VI/IT/ES/PT. Each note has country and date metadata, remains explicitly
    labelled as a sample planning note, and has no synthetic rating.
  - Added additive PostgreSQL migration
    `20260714_120000_testimonial_note_metadata`; empty-to-head PostgreSQL 16.14
    migration smoke PASS with no pending migration.
  - Full PostgreSQL WingsSide/all-site reseed PASS. Type generation and
    TypeScript PASS; component test PASS 4/4; targeted composer Playwright PASS
    1/1; targeted eslint has 0 errors and the six existing seed warnings only.
