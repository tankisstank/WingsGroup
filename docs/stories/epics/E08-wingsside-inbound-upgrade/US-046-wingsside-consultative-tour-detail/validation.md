# US-046 Validation

> **2026-07-21 corrective status:** Independent 8-page hi-fi review is **NO-GO**.
> Tour-detail and Home/Specials evidence below remains historical. Hub fidelity
> is **not** accepted. See US-046A and
> `artifacts/reviews/wingsside-hifi-independent-review.md`.

> **2026-07-22 update:** the corrective worktree passed the post-remediation
> local audit for 8 hubs plus Tour Detail. Production remains frozen and is not
> covered by this verdict. Full evidence and retained findings are in
> `docs/AUDIT-US046-HIFI-LOCAL-2026-07-22.md`.

## Corrective worktree proof - 2026-07-22

- Commits: `3f6a535`, `2a5b064`, `5ee0073`, `f1b0770`.
- Browser: desktop 1440 and mobile 390; one H1 and zero horizontal overflow on
  every corrective B2 route and Tour Detail; Contact real form and Guide filter
  behavior verified.
- TypeScript passed; unit 251/251; component 29/29; integration 109 passed with
  3 intentional skips.
- PostgreSQL 16 empty-to-head migration plus Payload EN/VI CRUD passed.
- Optimized Next.js build passed with 16/16 static pages.
- Tracked-source lint passed with 0 errors and 143 existing warnings. Full lint
  also scans untracked debug artifacts and stops on
  `app/artifacts/tmp/check-sqlite.cjs`; no artifact was deleted or committed.
- No production deployment or mutation was performed.


## Proof Strategy

Targeted proof protects each boundary first. The story remains incomplete until
the full validation ladder, 22 production URLs and controlled production release
all pass. Local implementation proof must not be used to imply production success.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | capability separation, contact state/URL, locale fallback, route/gallery mapping, cleanup integrity/drift/no-op/null semantics |
| Integration | host/site scope, same slug cross-site, draft/access/wrapper gates, SQLite/PostgreSQL JSON parity and PostgreSQL rollback |
| Component | hero, gallery, itinerary, services, related pages, CTA, empty/technical/retail-copy suppression |
| E2E | four named tours, desktop/mobile, keyboard/console/images/CTA, all 22 URLs, WingsGo schedule/market/detail and WingsPlus no-tour regression |
| Platform | canonical/breadcrumb/metadata/schema, encrypted backup/checksum, cleanup dry-run/apply/rollback report, health/live/ready |
| Performance | priority hero, lazy gallery, no overflow at 320/375/768/1280/1440 |
| Logs/Audit | no duplicates, immutable provenance, release/symlink and screenshot evidence |

## Fixtures

- Imported batch `wingsside-bestprice-22-20260717` and its 22-product report.
- Isolated local SQLite and PostgreSQL 16 adapter fixtures.
- Local mobile tour fixture deleted after browser verification.
- Production data is not a test fixture and is only touched after backup/gates.

### Local BestPrice 22 re-apply (worktree, 2026-07-20)

- Sources: manifest `WingsTravel/output/doc/tour-source-match-20260717.csv` (22 full
  bestprice rows) + crawler `E:\repo\tour-crawlers\bestprice_tours.json` + images under
  `storage/images/bestprice/`.
- Command: `pnpm run import:tours:bestprice22 -- --apply --admin-email local-admin@wingsgroup.test …`
- Result: **22/22** products+pages updated; publishEligible 22; mediaReused 714;
  demoted sample records 1125 (506 sample products).
- Artifacts: `artifacts/imports/bestprice-22/import-result.json`,
  `LOCAL-TEST-README.md` (slug list + re-run commands).
- Live smoke: first 5 `/wingsside/tour/<slug>` → 200 + title in HTML.
- Media gap: DB reused 714 `bpt-*` rows without files in `public/media` (API 500).
  Fixed via `scripts/repair-bestprice-media-files.ts` → 714 files restored; media API 200.
  Importer now recreates media when on-disk file is missing.

## Commands

```powershell
cd app
pnpm exec tsc --noEmit
pnpm run lint
pnpm run test:unit
pnpm run test:component
pnpm run test:int
pnpm run test:e2e
pnpm run build
pnpm run cleanup:tours:bestprice22 -- --dry-run --output <report>
```

## Hi-fi 8-page product bridge (local, pending root review)

Completed locally on 2026-07-19 in worktree `WingsTravel-us046-hifi` branch
`feature/us-046-wingsside-hifi-tour-detail`:

- Mapping: `hifi-8page-mapping.md` (hi-fi page IDs → live routes → files).
- Token bridge aligned to locked hi-fi HTML: cool paper `#F3F6F9`, brand blue
  `#005090`, wing accent `#104030`, book-gold CTA `#B87A14` + white label,
  wine urgency, shell max / nav-h / tighter section cadence.
- Global shell: compact full-bleed header, pill nav, circular language chips,
  solid book-gold primary CTAs (not gold-wash), Plus Jakarta display weight.
- Home: cinematic carousel remapped to hi-fi **editorial split**
  (`hero-presentation--carousel-hifi-split`: copy left + media card right +
  planner band below). Component + CSS in `presentations/index.tsx` / `globals.css`.
- Route CSS for Packages, Destinations, Styles, Plan, Guide, About, Contact.
- Specials widget: Home-only, desktop ≥768, compact 268px, bottom-right,
  stripe identity, session dismiss key, reduced-motion safe.
- Auto compare vs `wingside-hifi-fix-8pages.html` (1440×900): structural posture
  **15/15 Home**, **10/10** remaining pages; mobile Specials hidden.
  Artifacts: `artifacts/tmp/hifi-compare/`.
- Targeted proof: siteTheme int 6/6; hero component 5/5 (incl. hifi-split case);
  specials component; e2e expectations updated for brand `#005090` / accent `#104030`.
- **No production deploy** until root agent adversarial review and explicit approve.

## Bar B follow-up (8-page composition + nav IA + media)

Local implementation after independent Codex FAIL on composition:

- Nav IA locked to hi-fi 7 links: Home / Destinations / Styles / Packages / Guide /
  About / Contact; CTA `Plan trip`; mega menu + search removed for WingSide.
- **Single composition owner (hướng A):** hub routes suppress CMS layout except
  `formBlock`/`form` via `wingsSideHiFiComposer` + `[...slug]/page.tsx`
  (`data-hifi-composer=true`).
- Home credentials/awards carousel: honest placeholders only.
- Section inventory with **licensed media thumbs** from `/wingsside-hifi/*`
  (Open Design assets copied to `public/` + `assets/`).
- Card bindings: dest×6, styles×6, packages×3 (`wingsSideHiFiMedia.ts`).
- Dual CTA fallback on Home hi-fi split (Explore destinations when CMS has one link).
- Planner denser 2-col CSS for hifi business panel.

## Home hi-fi fidelity (Codex P1 backlog, 2026-07-20)

Local worktree implementation after Codex independent FAIL (~66% structure):

- **WP1** Traveler notes (`home-notes`) + trust strip (`home-sla`) under Why.
- **WP2** Sample journey cards with badge, duration·region micro, From $… / person,
  indicative note (EN: $2,190 / $1,480 / $1,620).
- **WP3** Why assets `sapa/family/culture/luxury` + card actions; dest/styles
  kickers, region tags, Match → affordances.
- **WP4** Credentials full-bleed band + progress strip (honest placeholders).
- **WP5** Hero primary CTA `href="#home-planner"`; denser panel `id="home-planner"`;
  close band dual Plan + Contact.
- **WP6** Logo fallback `/wingsside-hifi/logo.png` when CMS logo empty; WingSide-only
  footer shortcuts `data-testid="wingsside-hifi-footer"`.
- **WP7** Unit copy coverage for notes/trust/journeys; e2e Home inventory checks extended.
- **No production deploy** without root approve.
- If product later requires primary hero CTA always `/plan-your-trip` (not hash scroll),
  document as intentional ADR deviation in this file.

## Codex re-audit (2026-07-20, gpt-5.6-sol medium, read-only)

### Round 1 — FAIL

Artifact: `app/artifacts/tmp/hifi-p1-capture/codex-reaudit-home-p1.md`

| Field | Result |
| --- | --- |
| Verdict | **FAIL** (confidence 90%) |
| Structure | ~82% (was ~66%) |
| Closed P1 | Why media/actions; Hero CTA → `#home-planner` |
| Open P1 | notes/trust/journeys CSS not served; planner 2-col mobile; creds radius; footer double IA |

### User-reported visual bug (screenshot, same root cause)

Trust strip without layout CSS: Reply SLA/Proof plain text; planner portrait full-bleed instead of ~52px circle.

### Round 2 residual fix + re-audit — PASS-WITH-ISSUES

Artifact: `app/artifacts/tmp/hifi-p1-capture/codex-reaudit-home-p1-r2.md`

| Field | Result |
| --- | --- |
| Verdict | **PASS-WITH-ISSUES** (confidence 94%) |
| Structure | ~96% |
| P0 / residual P1 | none |
| User avatar bug | **CLOSED** (52×52 circle after lazy load) |
| P2 residual | blank captures (regenerated after audit); Specials overlap planner; h1 semantics; close CTA `/plan-your-trip` vs hash; `100vw` gutter; duplicated CSS ownership |

Fixes applied before r2:
- `hifi-sections.css` co-located import (bypass Turbopack globals truncation)
- Avatar hard-cap 52px + grids `!important`
- Creds full-bleed cascade win; planner stack `@900px !important`
- WingSide footer suppresses CMS nav double IA
- Dev restart + `.next` clear
- Unit: composer 6, assets 5, nav 3 pass. Live smoke: Home/Packages/Dest/Styles
  composer+inventory+media=True; Contact inventory without grid media.

### P2 polish (post r2)

- Specials self-hides while `#home-planner` ≥28% visible (IntersectionObserver); z-index 28.
- Hi-fi hero visible title is real `h1` (no dual sr-only h1).
- Close-band primary CTA → `#home-planner` (secondary Contact unchanged).
- Creds full-bleed scrollbar-safe: no element `100vw` width; `::before` band (live overflow=0).
- Layout CSS ownership: trust/notes/journey/avatar/footer-links in `hifi-sections.css` only.
- Proof: component hero 5/5; live titleTag=H1, closeHref=#home-planner, specialsWhilePlanner=false,
  specialsAfterScrollAway=true, overflow=0.
- Targeted e2e (Postgres isolated, 2026-07-20): Specials chip + governed inventory **2/2 passed**
  after e2e helper `revealSpecialsPastPlanner` (Specials intentionally hidden while planner intersects).
- Unit hi-fi: copy/composer/nav **13/13**; component hero+specials **9/9**.
- Live smoke P1/P2: notes/sla/composer true; trust 3-col; avatar 52; journey 3-col/img 168;
  H1; hero+close `#home-planner`; creds radius 0; overflow 0; footer true; mobile planner 1-col.
- **No production deploy** until root approve.

## Bar B completion pass (i18n + Payload media sync) — 2026-07-20

Local-only completion of remaining non-prod items on branch
`feature/us-046-wingsside-hifi-tour-detail` (worktree `WingsTravel-us046-hifi`):

### WP6 — Inventory i18n (en/vi/it/es/pt)

- Full section copy in `app/src/components/WingsSideHiFi/copy.ts` for all five
  public ad locales (home, plan, destinations, styles, packages, guide, about,
  contact, credentials carousel, dual-CTA `exploreDestinations`).
- `SectionInventory` / `CredentialsCarousel` consume `getWingsSideHiFiCopy(locale)`.
- Dual-CTA fallback no longer hardcodes EN: `CinematicCarouselHero` uses
  `resolvedLocale` → localized `home.exploreDestinations` (wired from
  `HighImpactHero`).
- Unit: `wingsSideHiFiCopy.unit.spec.ts` **3/3** (incl. dual-CTA labels).
- Live smoke locale path `/wingsside/{vi,it,es,pt}`: inventory markers present
  (e.g. VI: `Lên kế hoạch`, `Khám phá điểm đến`, `Chứng nhận`, `Bốn bước`;
  IT: `Pianifica`, `Esplora le destinazioni`).

### Payload media sync (hướng A apply)

- Dry-run then apply: `pnpm run sync:wingsside:hifi-assets -- --apply --report
  output/us046/wingsside-hifi-assets.json`
- Result: **15 media created**, pages `/` and `/packages` **updated**
  (`hero.media` / slides / meta → `heroHalong` media id `6798` on local SQLite).
- Report path: `app/output/us046/wingsside-hifi-assets.json` (rollback via
  script `--rollback-report` if needed).
- Live EN Home/Packages HTML includes synced hi-fi hero filenames under
  `/media/wingsside-hifi-*` plus inventory thumbs `/wingsside-hifi/*`.

### Targeted verification (this pass)

| Layer | Result |
| --- | --- |
| Unit (composer, nav, assets, copy, header) | **22/22** pass |
| Component (`heroPresentations`) | **5/5** pass |
| Int (`siteTheme`) | **6/6** pass |
| Live HTTP smoke (composer/inv/media) | Home, Packages, Destinations, Plan **200** + markers |
| Live i18n smoke | `/wingsside/vi|it|es|pt` **200** + localized inventory strings |
| Full e2e ladder (isolated PostgreSQL) | **75/75** pass — see below |
| Production deploy | **Not done** — requires root approve |

### Full e2e ladder — 2026-07-20 (Bar B worktree)

- Command: `pnpm run test:e2e` (`E2E_DATABASE_ENGINE=postgres`, disposable Docker
  `postgres:16-alpine`, port **3100** webServer).
- Result: **75/75 passed** in **13.8 minutes**.
- `.last-run.json` status `passed`, SHA-256
  `91D1C43004802CD49950D78EB11C8FA7D05DA8FFFFE219A8B13B2F561BC00903`.
- Playwright report SHA-256
  `888FCBFDC75056941D1673511CD435653F03FE5F9CC5EAF82210AE862CD13566`.
- Log: `artifacts/tmp/e2e-ladder/full-e2e-final2.log`.
- E2E expectations aligned to Bar B: hi-fi inventory (no CMS bento), nav without
  Search primacy, dual-CTA / locale copy, hub-safe card hrefs (sapa/wellness/
  business → parent hubs), planner visible on mobile hifi-split, Specials
  clearance, updated wingsside-planner desktop/mobile visual snapshots.
- Product fixes for ladder: carousel major controls **44px** hit target; mobile
  hifi planner band no longer `display:none` on slide 0.

### Residual (out of this agent scope / explicit gates)

1. Root adversarial review + explicit production deploy approve.
2. Optional: bind CMS heroes for additional hub locales if Payload locale
   variants lag default-locale media IDs (EN Home already shows synced hero).
3. Optional: resolve React hydration className noise on hifi-split (SSR vs client
   class order) — e2e still green; polish only.
4. Plane remote sync still blocked (403 Initiatives plan).

## Acceptance Evidence

Completed locally through 2026-07-19:

- Targeted implementation suites, typecheck and optimized build passed before
  Phase 3 approval.
- Cleanup unit proof passed 15/15; targeted lint has zero errors with 12 existing
  importer `no-explicit-any` warnings.
- Isolated SQLite adapter proof passed 2/2. Two new-schema retries encountered the
  documented Payload/libsql `SQLITE_BUSY`; the pre-provisioned isolated DB passed.
- Isolated PostgreSQL 16 adapter proof passed 2/2 with explicit `db-postgres`
  assertion, injected rollback and pre-commit drift rollback. Teardown verified
  fixture Page/Product/Site counts `0/0/0`, removed the container/volume and cleared
  the loopback port.
- Mobile browser proof passed at IT 320px and PT 375px with localized CTA URLs,
  zero overflow, clean console and footer safe padding.
- Corrective release-candidate ladder passed from clean commit `05055019` without
  reusing production data:
  - `pnpm exec tsc --noEmit`: PASS in 10.4 seconds.
  - `pnpm run lint`: PASS in 130.2 seconds with 0 errors and 134 pre-existing warnings.
  - `pnpm run test:unit`: PASS, 28 files and 193/193 tests in 54.1 seconds.
  - `pnpm run test:component`: PASS, 7 files and 24/24 tests in 18.9 seconds.
  - `pnpm run test:int`: PASS, 21 files plus 2 skipped; 108 tests passed and 3
    intentionally skipped in 46.5 seconds.
  - `pnpm run test:e2e`: PASS, 75/75 on an isolated PostgreSQL database in
    1,366.2 seconds (Playwright 19.7 minutes). The final report SHA-256 is
    `71BD4944930F54F92DD9867B1FE016C081B3F545F4724B039966800D7169C5F9` and
    `.last-run.json` SHA-256 is
    `91D1C43004802CD49950D78EB11C8FA7D05DA8FFFFE219A8B13B2F561BC00903`.
  - `pnpm run build`: PASS in 258.2 seconds; compilation took 64 seconds,
    TypeScript took 107 seconds, 16/16 static pages generated and standalone
    assets were prepared.
- One earlier full run passed 74/75 and saw a transient development-server 500
  only on `/wingsside/plan-your-trip`; an exact fresh-database targeted rerun
  passed 1/1, and the subsequent full run passed 75/75. An earlier 15-minute
  outer timeout was invalid because the established full suite takes longer;
  neither event is treated as product proof or hidden from the evidence trail.
- The first controlled production release completed the encrypted backup,
  22-record cleanup dry-run/apply, deployment, live/ready checks, four named tour
  checks, 22/22 URL smoke and duplicate audit. The tour-detail/data gates passed.
- Production acceptance was stopped because the custom WingSide theme did not
  carry the hi-fi site marker, leaving Specials unstyled and full-width on Home.
  Corrective commits `61a64c1`, `37bd1eb` and `05055019` passed the full ladder;
  approved 768/1280/1440 screenshots show the fixed 268px widget 19-23px below
  the site header/banner with no header or active-hero overlap.
- The corrective release-candidate worktree was clean after the full suite and
  build. No E2E container remained.

Final adaptive release evidence:

- Commit `a083127` passed TypeScript in 65.7 seconds; lint in 127.4 seconds;
  unit 28 files/193 tests; component 7 files/24 tests; integration 21 files plus
  2 skipped with 108 passed/3 skipped; full isolated PostgreSQL E2E 75/75; and
  optimized build in 157.2 seconds with 16/16 static pages. Remote Docker build
  also passed and produced image digest
  `sha256:38b16e8749d714d91be83ff777129b1c5d818350bda7c5d7b3e506a69837f2c2`.
- Exact-source archive SHA-256 matches locally and remotely:
  `708fb9abc65f1677123b5710a6bb10c425ce7da963ec7cf696f44e066e595f7a`.
  Production serves `us046-adaptive-a083127-20260719T121049Z`; public live and
  ready endpoints both return 200. Cleanup was not re-applied.
- Home agent-browser proof passed at 768, 1024, 1280 and 1440 pixels; mobile 767
  hides the promo. CTA keyboard navigation reaches `/packages`; session dismiss
  survives refresh and resets in a new session; reduced motion disables hover
  transition/transform. All checked views have zero broken image, overflow and
  browser page errors.
- Public SSR smoke passed 22/22 tour URLs. The required four tours passed real
  browser QA at 1280 and 375 pixels with three exact contextual `/contact-us`
  links, contact state, canonical URL, no Offer schema, no departure table, no
  technical/retail copy, no broken image/missing alt/overflow/page error.
- WingsGo tour detail, departure schedule and `/thi-truong/han-quoc` passed with
  no WingSide leakage. WingsPlus correctly returns no tour detail for the same
  WingsGo slug. An initial `/thi-truong/korea` probe correctly returned 404 and
  was replaced with the database-backed valid market path.
- Final production database verification ran in a read-only transaction: 22
  published batch products, 22 distinct same-site published wrappers, zero
  future departure, zero duplicate product code/slug/page path/media filename,
  714 distinct referenced media and zero technical importer sentence. There are
  no related-page relations in the live 22-wrapper dataset; omission of the
  empty block is expected, while positive rendering is covered by automated
  component/E2E fixtures.
- The complete production checksum manifest is preserved with SHA-256
  `95f87379b559a3f3f9e121b7bcc45bbae6c0b24987148812d707f32520427d1a`.
  Two PowerShell-driven agent-browser loops for all 22 URLs stalled at the local
  runner layer without product or data mutation; deterministic 22/22 HTTP proof
  plus browser proof for the four named tours provides the final coverage.
