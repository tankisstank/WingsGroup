# US-034 WingSide launch readiness proof

## Status

implemented

## Lane

normal

## Product Contract

WingSide inbound launch is proven by code, SEO, accessibility, performance,
content/legal and staging data gates.

## Relevant Product Docs

- `docs/product/wingsside-inbound-implementation-plan.md`
- `docs/product/go-live-review-pipeline.md`

## Acceptance Criteria

- Typecheck, lint, integration, component, relevant E2E and build pass or
  blockers are documented.
- `go-live:review` runs or blocker is documented.
- Required screenshots exist.
- Sitemap/canonical/hreflang are verified for EN/IT/ES/PT.
- Public-disabled locales are absent from nav/sitemap/hreflang.
- Content/legal checklist is complete.

## Design Notes

- Commands: full release validation ladder from implementation plan.
- UI surfaces: public WingSide pages and CMS-governed content.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | As required by touched components |
| Integration | Full integration suite |
| E2E | Targeted and/or full Playwright suite |
| Platform | Screenshots, staging migration status |
| Release | Go-live review output |

## Harness Delta

Final initiative evidence should update the Harness matrix.

## Evidence

Implemented on 2026-07-07.

- Typecheck: `pnpm exec tsc --noEmit` passed.
- Lint: `pnpm exec eslint scripts/go-live-review.mjs tests/e2e/frontend.e2e.spec.ts`
  passed.
- Integration: `pnpm run test:int -- tests/int/sitePaths.int.spec.ts tests/int/layoutPresets.int.spec.ts tests/int/siteTheme.int.spec.ts`
  passed 20/20.
- Component: `pnpm run test:component -- tests/component/motionPrimitives.component.spec.tsx tests/component/inboundComposerBlocks.component.spec.tsx`
  passed 8/8.
- Relevant E2E:
  `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_REUSE_EXISTING_SERVER=true PLAYWRIGHT_SKIP_PHASE1_SEED=true pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts -g "WingSide inbound core content pages|WingSide governed inbound composer blocks|WingSide inbound header|WingSide language switcher|CMS-only locales"`
  passed 5/5.
- Full local `pnpm run test:e2e -- ...` attempt was blocked during
  `test:e2e:prepare-db` by local SQLite `SQLITE_BUSY` while Payload pushed the
  test schema. The targeted E2E above was therefore run against the already
  seeded local server with `PLAYWRIGHT_SKIP_PHASE1_SEED=true` to avoid a second
  SQLite writer.
- Build: `pnpm run build` passed, including `postbuild` sitemap generation and
  standalone static/public copy.
- Go-live review:
  `pnpm run go-live:review -- --site wingsside --base-url http://localhost:3000 --out ..\outputs\e08-us034-go-live-review-20260707-r2`
  exited 0 with overall `pass_with_notes`. Artifacts:
  `outputs/e08-us034-go-live-review-20260707-r2/review-report.md`,
  `outputs/e08-us034-go-live-review-20260707-r2/review-results.json`, and
  desktop/mobile screenshots for WingSide routes. Notes are non-blocking:
  homepage carousel reports 0 H1 because the carousel slide title is rendered as
  H2, and several style pages have thin meta descriptions.
- Required screenshot artifacts exist in
  `outputs/e08-us034-manual-screenshots-20260707/`: `/wingsside`
  desktop/mobile, `/wingsside/en`, `/wingsside/it`, `/wingsside/es`,
  `/wingsside/pt`, hero reduced-motion, mega menu open, mobile language
  switcher open, and plan-your-trip form.
- SEO locale proof:
  `outputs/e08-us034-manual-screenshots-20260707/seo-locale-check.json`
  confirms EN/IT/ES/PT `html lang`, canonical and hreflang alternates, and
  confirms pages/posts sitemaps include EN/IT/ES/PT while excluding JA/KO/FR/DE.
- Content/legal checklist is complete in
  `docs/product/wingsside-inbound-content-map.md`; no fake testimonials,
  ratings, licence claims, copied competitor assets or copied competitor text
  are allowed.

Follow-up proof on 2026-07-08 after final review blockers:

- PostgreSQL seed proof:
  `DATABASE_URL=postgresql://.../wings_seed_proof PAYLOAD_DB_PUSH=true pnpm exec tsx scripts/seed-subsites.ts`
  passed against `postgres:16-alpine` container `wings-us031-postgres-check`
  on `127.0.0.1:15432`, ending with
  `Production-oriented subsites seeded successfully.`
- PostgreSQL-backed runtime proof:
  `localhost:3000` was started against `wings_seed_proof`; `/wingsside/it`
  rendered `data-site-preset="wings-side-editorial-inbound-v2"` and browser
  title `WingSide | Vietnam su misura`.
- Targeted E2E:
  `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_REUSE_EXISTING_SERVER=true PLAYWRIGHT_SKIP_PHASE1_SEED=true pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts -g "WingSide inbound header|WingSide localized root pages|WingSide language switcher hrefs|WingSide inbound core content pages"`
  passed 4/4.
- Code validation after the fix: `pnpm exec tsc --noEmit` passed; targeted
  eslint passed with only the pre-existing `scripts/seed-subsites.ts`
  `no-explicit-any` warnings.
- SQLite local reseed still has Harness backlog #5 because Payload/libsql can
  hit `SQLITE_BUSY` during large local bootstrap. This does not block launch
  proof because PostgreSQL is the staging/production database contract.

Additional UI/UX follow-up proof on 2026-07-08:

- Patched the three `agent-browser` findings from
  `artifacts/wingsside-ui-review/report.md`:
  - IT/ES/PT localized roots no longer mix English CTA/related labels or
    `WingSide inbound hero` placeholder text.
  - Core pages no longer expose seed-oriented labels such as `... image` or
    `Planning cue`.
  - `/wingsside/plan-your-trip` and `/wingsside/contact-us` no longer render
    Vietnamese form support copy on English routes.
- Validation:
  - `pnpm exec tsc --noEmit` PASS.
  - Targeted eslint PASS with only the existing
    `scripts/seed-subsites.ts` `no-explicit-any` warnings.
  - PostgreSQL `wings_seed_proof` reseed PASS.
  - Targeted E2E PASS 3/3:
    `WingSide inbound core content pages`, `WingSide localized root pages`
    and `WingSide inbound header`.
  - `agent-browser` screenshots stored in
    `artifacts/wingsside-ui-review-after-fix/screenshots/`.
- Additional follow-up proof on 2026-07-09:
  - Fixed the manual validation blockers for one-click locale switching,
    IT/ES/PT homepage parity and unreadable footer pills.
  - Code validation: `pnpm exec tsc --noEmit` PASS.
  - Targeted lint: `pnpm exec eslint src/Header/Nav/index.tsx 'src/app/(frontend)/globals.css' scripts/seed-subsites.ts tests/e2e/frontend.e2e.spec.ts`
    PASS with only the existing `scripts/seed-subsites.ts` `no-explicit-any`
    warnings and CSS ignored by eslint config.
  - Data validation: PostgreSQL `wings_seed_proof` reseed PASS with
    `Production-oriented subsites seeded successfully.`
  - Targeted E2E:
    `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_REUSE_EXISTING_SERVER=true PLAYWRIGHT_SKIP_PHASE1_SEED=true pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts -g "WingSide inbound header mega menu and language switcher|WingSide localized root pages with real core content|WingSide inbound core content pages"`
    PASS 3/3.
  - Runtime/browser smoke: one-click language switch from EN to IT rendered
    `/wingsside/it` with `Viaggi su misura in Vietnam`; footer button text
    computed as `rgb(5, 40, 41)` on a light background; screenshot stored in
    `artifacts/wingsside-locale-footer-after-fix/`.
- Additional accessibility proof on 2026-07-09 after audit:
  - Resolved the remaining US-032 paid-ads blockers: Escape now closes the
    mega menu from inside the panel and the panel uses disclosure/region
    semantics instead of incomplete ARIA menu semantics.
  - Locale switch preserves query string and hash on normal click navigation.
  - Validation: `pnpm exec tsc --noEmit` PASS; targeted eslint PASS; targeted
    Playwright PASS 3/3:
    `WingSide inbound header mega menu and language switcher`,
    `WingSide language switcher hrefs stable on localized nested routes` and
    `WingSide inbound core content pages`.
  - Runtime smoke confirmed `aria-expanded=false` after Escape from focused
    panel link and URL
    `/wingsside/it/search?q=hanoi#results` after switching from EN.
- Additional follow-up proof on 2026-07-09 for remaining review items:
  - Mobile mega menu exposes the full WingSide mega item set instead of only
    the first two links per group.
  - Cinematic carousel now provides a single semantic H1 from the first slide
    title while keeping visible slide titles as H2, closing the go-live H1
    note without changing visual design.
  - IT/ES/PT homepage seed copy was refactored into `localizedHomeBlockCopy`
    lookup data to remove nested locale ternaries in the localized homepage
    block assembly.
  - Validation: `pnpm exec tsc --noEmit` PASS; targeted eslint PASS with only
    existing seed `no-explicit-any` warnings; component hero presentations PASS
    4/4; PostgreSQL reseed PASS; targeted Playwright PASS 3/3 for WingSide
    cinematic hero, header/mobile mega and localized root pages.
  - Attempted Browser plugin smoke on `http://localhost:3000/wingsside/en`, but
    the browser transport was closed. Playwright E2E/runtime validations above
    are the proof for this patch.
- Additional follow-up proof on 2026-07-10 after ES homepage visual review:
  - Fixed the remaining English copy inside the WingSide hero planner panel on
    `/wingsside/es`, `/wingsside/it` and `/wingsside/pt`.
  - The page route now passes the resolved locale into `RenderHero`; the
    `HighImpactHero` planner variant selects locale-specific panel copy for all
    public ad locales.
  - Validation: `pnpm exec tsc --noEmit` PASS; targeted eslint PASS; targeted
    Playwright PASS 2/2 for `WingSide cinematic planner hero` and
    `WingSide localized root pages with real core content`.
  - Attempted Browser plugin smoke on `http://localhost:3000/wingsside/es`, but
    the browser transport was closed. Playwright Chromium validation is the
    runtime proof for this patch.
- Customer-feedback proof on 2026-07-14:
  - `pnpm run generate:types` PASS and `pnpm exec tsc --noEmit` PASS.
  - Component proof PASS 4/4, including 3-second Traveler notes advancement and
    country/date rendering.
  - PostgreSQL 16.14 empty-to-head migration smoke PASS for all ten migrations;
    no pending or divergent migration remains.
  - Full PostgreSQL production-oriented seed PASS; targeted Playwright PASS for
    governed composer blocks and mobile/desktop header behavior.
  - `agent-browser` verified mobile outside-close, mobile destination
    navigation, full-card links, eight note records, country/date rendering,
    autoplay movement from scroll position 0 to 292 after 3.5 seconds with
    normal motion, and no browser errors. Reduced-motion mode correctly keeps
    the carousel stationary.
  - Screenshots: `app/artifacts/wingsside-feedback-20260714/screenshots/`.
