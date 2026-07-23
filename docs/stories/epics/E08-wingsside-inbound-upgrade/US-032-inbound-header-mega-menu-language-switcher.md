# US-032 Inbound header, mega menu, language switcher

## Status

implemented

## Lane

normal

## Product Contract

WingsSide has an inbound navigation experience with mega menu, primary CTA and
language switcher that respects public locale gating and does not regress other
sites.

## Relevant Product Docs

- `docs/product/wingsside-inbound-implementation-plan.md`

## Acceptance Criteria

- Mega menu works on desktop and mobile.
- Keyboard navigation can open, traverse and close the menu.
- Language switcher marks current locale with `aria-current`.
- Public-disabled locales do not appear.
- Non-WingsSide headers still pass smoke.

## Design Notes

- Commands: `tsc`, lint, targeted E2E.
- UI surfaces: Header components, site settings/header nav data, site links.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Locale/link helpers if added |
| Integration | Header data mapping if schema changes |
| E2E | Mandatory header/nav/language switcher targeted spec |
| Platform | Desktop/mobile screenshots |
| Release | Other site header smoke |

## Harness Delta

Update matrix evidence after implementation.

## Evidence

Implemented 2026-07-07.

- Added WingsSide-only desktop mega menu under `Plan Vietnam` / `Lên kế hoạch
  Việt Nam`, with destination, travel style and sample itinerary groups.
- Added mobile mega links inside the existing mobile primary navigation.
- Added language switcher using central `publicLocaleMetadata`, so only
  public-enabled locales render: `vi`, `en`, `it`, `es`, `pt`.
- Language switcher marks the current locale with `aria-current="page"` and
  preserves the current site/path when switching locale.
- Non-WingsSide headers do not render the WingsSide mega menu.

Validation:

- `pnpm exec tsc --noEmit` PASS.
- Targeted eslint for Header and E2E files PASS.
- Direct Playwright E2E against `http://localhost:3000` with PostgreSQL data
  PASS 1/1 for desktop mega menu open/escape, language switcher public locale
  gating, mobile menu rendering and WingsGo no-leak smoke.
- Follow-up fix on 2026-07-07: language switcher href generation now uses the
  public pathname passed from `proxy`/server headers and renders links directly
  instead of passing already site-aware locale paths back through `SiteLink`.
- Targeted validation after the follow-up fix:
  `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_REUSE_EXISTING_SERVER=true pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts -g "WingsSide inbound header|WingsSide language switcher"`
  PASS 2/2. Coverage includes `/wingsside/en/search` hrefs for EN/VI/IT and
  asserts no hydration mismatch console error.
- Supporting validation after the follow-up fix: `pnpm exec tsc --noEmit` PASS;
  targeted eslint for touched Header/proxy/site context/E2E files PASS;
  `pnpm run test:int -- tests/int/sitePaths.int.spec.ts` PASS 5/5.
- Follow-up fix on 2026-07-08 after manual review:
  - Mega menu now closes on outside click/focus as well as trigger toggle and
    Escape.
  - Mega menu open state now has a visual connector/anchored treatment between
    `Plan Vietnam` and the panel.
  - Language-root routes such as `/wingsside/it`, `/wingsside/es` and
    `/wingsside/pt` are normalized to content root instead of being treated as
    page slugs.
  - Desktop nav/language switcher CSS now wraps/constrains width to avoid the
    WingsGo header overflow observed during manual validation.
- 2026-07-08 validation:
  `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_REUSE_EXISTING_SERVER=true PLAYWRIGHT_SKIP_PHASE1_SEED=true pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts -g "WingsSide inbound header|WingsSide localized root pages|WingsSide inbound core content pages"`
  PASS 3/3. Targeted `pnpm exec tsc --noEmit` PASS. Targeted eslint PASS with
  existing `scripts/seed-subsites.ts` `no-explicit-any` warnings only.
- Follow-up fix on 2026-07-08 after final external review:
  - WingsSide header primary CTA now resolves by actual public locale, so
    IT/ES/PT render native labels instead of hardcoded English:
    `Pianifica il viaggio`, `Planifica tu viaje`, `Planear a viagem`.
  - WingsSide mega-menu trigger and menu item copy now have native IT/ES/PT
    variants instead of using EN fallback for paid-traffic locales.
  - Desktop language switcher links expose `data-locale-code` and collapse to
    compact locale codes at <=1440px; WingsSide header hides lower-priority
    primary links after the first four at this breakpoint so 1280px laptop
    layouts remain one row.
  - E2E coverage now asserts focus-out close, outside click close, Escape close,
    IT/ES/PT CTA + mega trigger labels, WingsSide one-row nav at 1280px, and
    WingsGo one-row/no-leak at 1440px.
- 2026-07-08 code validation for this follow-up:
  `pnpm exec tsc --noEmit` PASS; targeted eslint PASS with the existing
  `scripts/seed-subsites.ts` `no-explicit-any` warnings only.
- 2026-07-08 data validation blocker:
  after fixing selective seed to load theme preset IDs, local SQLite repeatedly
  hit `SQLITE_BUSY` during Payload/libsql schema or block-array writes, even
  after stopping `next dev`, checkpointing SQLite, disabling seed-time version
  writes and disabling Payload local transactions for seed operations. A DB
  backup was made at
  `artifacts/tmp/payload-tourplatform.db.pre-wingsside-fix-20260708-223720.bak`
  and restored. Because the local DB became partial during failed seed attempts,
  the final visual E2E rerun is blocked until SQLite is rebuilt or the same
  seed is run against PostgreSQL.
- 2026-07-08 blocker resolution:
  - Root cause for PostgreSQL seed failure was `req.locale` mutation during
    locale update steps. Seed helpers now explicitly create base media,
    categories, forms, pages, posts, tour products, departures, variants and
    campaigns with `locale: 'vi'`, so later localized updates cannot cause the
    next site to be created under the previous locale.
  - PostgreSQL proof DB `wings_seed_proof` on
    `wings-us031-postgres-check` (`127.0.0.1:15432`) was reset and fully seeded
    with `DATABASE_URL=postgresql://.../wings_seed_proof PAYLOAD_DB_PUSH=true pnpm exec tsx scripts/seed-subsites.ts`.
    Result: PASS, `Production-oriented subsites seeded successfully.`
  - Server was started against the PostgreSQL proof DB and verified
    `/wingsside/it` rendered
    `data-site-preset="wings-side-editorial-inbound-v2"` and title
    `WingsSide | Vietnam su misura`.
  - Final targeted E2E:
    `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_REUSE_EXISTING_SERVER=true PLAYWRIGHT_SKIP_PHASE1_SEED=true pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts -g "WingsSide inbound header|WingsSide localized root pages|WingsSide language switcher hrefs|WingsSide inbound core content pages"`
    PASS 4/4.
  - Header responsive rule tightened at <=1440px: WingsSide keeps the first
    three primary links visible, then relies on mega/mobile/footer for the
    lower-priority links. This keeps 1280px laptop layout one-row for longer
    IT/ES/PT CTA strings.

Known validation note:

- As with US-030, local proof used PostgreSQL-backed `localhost:3000` because
  the standard SQLite E2E bootstrap is currently blocked by `SQLITE_BUSY`.
- 2026-07-08 UI/UX follow-up after `agent-browser` review:
  - `RelatedPages` now uses actual public locale copy for IT/ES/PT instead of
    EN/VI-only fallback, so paid-locale pages render `Percorsi correlati`,
    `Rutas relacionadas` and `Percursos relacionados`.
  - `FormBlock` now resolves actual public locale copy where available and
    falls back to EN when the path has no locale, preventing WingsSide English
    routes from rendering Vietnamese form support copy.
  - Targeted E2E after patch:
    `PLAYWRIGHT_BASE_URL=http://localhost:3000 PLAYWRIGHT_REUSE_EXISTING_SERVER=true PLAYWRIGHT_SKIP_PHASE1_SEED=true pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts -g "WingsSide inbound core content pages|WingsSide localized root pages|WingsSide inbound header"`
    PASS 3/3.
  - `agent-browser` runtime smoke after patch confirmed `/wingsside/it` no
    longer contains English `Plan your trip`, `Destinations`, `Related pages`
    or `WingsSide inbound hero` text.
- 2026-07-09 follow-up after manual validation:
  - Language switcher links now use document navigation (`<a href=...>`)
    instead of client-side `next/link`, so switching `/wingsside/en` to
    `/wingsside/it` performs a fresh server-rendered locale load on the first
    click instead of only changing the URL.
  - Targeted E2E now clicks `Italiano` once from `/wingsside/en`, waits for
    `/wingsside/it`, and asserts the Italian H1
    `Viaggi su misura in Vietnam` is visible.
  - Validation: `pnpm exec tsc --noEmit` PASS; targeted eslint PASS with only
    existing seed warnings; targeted Playwright PASS 3/3 for WingsSide header,
    localized root pages and core content pages.
- 2026-07-09 accessibility follow-up after audit:
  - Mega menu panel no longer uses ARIA `role="menu"` / `role="menuitem"`;
    it now exposes a labelled `role="region"` with regular links, matching the
    implemented disclosure/link behavior without implying arrow-key menu
    semantics.
  - Escape is handled at document level while the mega menu is open, so it
    closes even when focus is inside a panel link.
  - Locale switch now preserves client `search` and `hash` on normal clicks,
    e.g. `/wingsside/en/search?q=hanoi#results` switches to
    `/wingsside/it/search?q=hanoi#results`.
  - Validation: `pnpm exec tsc --noEmit` PASS; targeted eslint PASS; targeted
    Playwright PASS 3/3 for WingsSide header/language switcher/core pages.
  - Runtime smoke confirmed Escape from focused `Vietnam highlights` link set
    `aria-expanded=false` and preserved `?q=hanoi#results` on EN -> IT locale
    switch.
- 2026-07-09 mobile navigation follow-up:
  - WingsSide mobile mega menu no longer truncates each group to the first two
    links. The mobile drawer now exposes the full destination, travel style and
    sample itinerary item set, so links such as `Central heritage` and
    `Adventure` are discoverable on mobile.
  - Targeted E2E now asserts those deeper mobile mega links are visible after
    opening the mobile navigation at 390px.
  - Validation: `pnpm exec tsc --noEmit` PASS; targeted eslint PASS; targeted
    Playwright PASS 3/3 for WingsSide cinematic hero, header/mobile mega and
    localized root pages.
- 2026-07-14 customer-feedback follow-up:
  - The mobile drawer closes on pointer/focus outside, Escape, route change and
    every mobile link selection. Mobile link navigation uses a full document
    transition so closing the drawer cannot cancel the requested destination.
  - The drawer is viewport-bounded and scrollable when the full mega-link set
    exceeds the available mobile height.
  - PostgreSQL-backed targeted Playwright proof PASS 1/1 for the WingsSide
    header, including outside-click close and link-click navigation/close.
  - `agent-browser` at 390x844 confirmed outside click returns the trigger to
    `aria-expanded=false` and selecting `All destinations` reaches
    `/wingsside/en/destinations` with the drawer closed.

## Follow-up Bug

Recorded 2026-07-07 as Harness backlog #4.

Status: resolved in code on 2026-07-07; keep the note below as root-cause
history.

Observed during local `next dev` resource investigation:

- React reported a hydration mismatch in the WingsSide header language switcher.
- Server-rendered hrefs looked like `/wingsside/en/vi` and `/wingsside/en/en`.
- Client-rendered hrefs looked like `/wingsside/vi/search` and
  `/wingsside/en/search`.
- The mismatch appears tied to `usePathname()` under local multisite rewrites
  plus double site/locale prefixing through `SiteLink`.

Likely affected files:

- `app/src/Header/Nav/index.tsx`
- `app/src/components/SiteLink.tsx`
- `app/src/utilities/sitePaths.ts`

Expected follow-up:

- Make language switcher href generation deterministic between SSR and client.
- Avoid re-prefixing already site-aware locale switcher paths.
- Add targeted E2E coverage for `/wingsside/en/search` locale-switch links and
  assert no hydration mismatch is emitted.
