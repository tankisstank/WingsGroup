# US-074 — Admin shell follow-up evidence, 2026-09-15

## Findings closed

Production reproduced three UI regressions against `https://wingsgroup.vn/admin`:

- the native site selector was a static row outside Payload's header and was
  covered when the side pane opened;
- custom admin views, including `/admin/theme`, bypassed Payload's default
  template and therefore had no shared side pane;
- the active navigation link used an orange pseudo-marker/inset shadow and a
  layout-affecting transition, which obscured text and made the menu jump.

The applied UI package was treated as a visual contract. Its 258px desktop rail,
grouped navigation, surface-only active state and 64px mobile triage rail were
ported into React/SCSS. The static prototype was not loaded at runtime.

## Implementation

- `AdminSiteSwitcher` now portals into Payload's `.app-header__actions`; the
  previous standalone 28px body row is gone.
- `AdminStandaloneShell` wraps Console, Theme, Site Review and Page Wizard so
  custom views have the same grouped rail and responsive workspace.
- Active links have no orange `::before`, inset marker, or transform; their
  position and height remain stable and the active state is a surface color.
- `AdminNavIntro` tolerates a null pathname from custom-view/test navigation
  mocks (`usePathname() || ''`).
- The existing mobile grid override remains in force and is exercised again by
  the Production smoke check.

## Build and test proof

Local checks on the patched source:

| Check | Result |
| --- | --- |
| TypeScript | Pass (`pnpm exec tsc --noEmit`) |
| Targeted ESLint | Pass, 0 errors |
| US-074 unit contract | Pass, 3 files / 11 tests |
| Console component contract | Pass, 1 file / 9 tests |
| Full component regression | Pass, 27 files / 150 tests |
| Next build | Pass, direct `next build` exit 0; compile, TypeScript, 20/20 static pages |
| Runtime hash transfer | Pass; 10 runtime files matched local and release hashes |

Full unit regression was also rerun: 133/134 files and 996/997 tests passed. The
single failure is the existing WingsGo brand-manifest checksum contract
(`tests/unit/siteBranding.unit.spec.ts`), outside the admin-shell files and
unchanged by this release; it was not masked or modified.

## Production deployment

The active release at deployment time was cloned first, so a concurrent later
release was not overwritten. Only the UI runtime files were overlaid.

- Base release:
  `wingsgroup-en-trust-hotfix-be53864-20260915T094130Z`
- Active release:
  `us074-admin-shell-followup-20260915T102900Z`
- Image:
  `sha256:4c6e7bb11231f239075fd7f58859ce167b412f1e8af52bd4e178b51e2a0f6300`
- Container:
  `cb52be5366de517224f98129239c46371710cb5c5736430958efeea763c41fd1`
- Previous app image retained for rollback:
  `sha256:378e8382d1812fc6d7595edba6f690d7b3439a1473ddf6e0badb944088b4c4e7`
  as `wingstravel-app:rollback-before-us074-admin-shell-followup-20260915T102900Z`.
- Deployment action: atomic `current` symlink switch and app-only
  `--no-deps --no-build --pull never --force-recreate`; PostgreSQL and Redis
  container IDs remained unchanged.
- `/api/health/live` and `/api/health/ready`: HTTP 200.
- All six public site hosts returned HTTP 200 on `/api/health/live`.

No account, content, lead, media, site, migration, or Redis data was changed by
this UI-only release.

## Latest production redeploy on the US-075 baseline

The first follow-up was later superseded by the US-075 release on the same
host. To prevent that release from dropping the US-074 overlay, the current
Production baseline was cloned and the missing runtime dependencies were added
in isolated, immutable follow-up releases. The final active release is:

- Release: `us074-admin-shell-followup-r7-20260915T143012Z`;
- `current`:
  `/home/ubuntu/wings-travel/releases/us074-admin-shell-followup-r7-20260915T143012Z`;
- image:
  `sha256:71415baee7e95bc11cdb884f370b18af525ddf0bad31ba7781112f1f18ddb6dc`;
- app container: `3e12d73819be`;
- rollback tag:
  `wingstravel-app:rollback-before-us074-admin-shell-followup-r7-20260915T143012Z`,
  image `sha256:7509c3f710ff471cb1f871d0a20d627409ea5c41d3a7bdbf5ef8c78f2ab49275`.

The final Docker build passed compile, TypeScript, 19/19 static pages and
standalone copy. It includes the Payload import-map registration, the
Site Review API and cross-domain preview handoff chain, the preview-ready
listener, and compact locale controls for Tour Products, Posts, Tour
Departures and Media. PostgreSQL
`ab500698a619dea4c99d03602bc2268dce64b1c59d1aee2368ccb7dad71d8944` and Redis
`b59a6251dcfd200a9dc9f2358c1b9df87145449bbec04163e800669e3f7aee6c` were not
recreated.

Post-deploy browser proof on `https://wingsgroup.vn/admin` confirmed the
Site Review API returns tenant preview origins (including
`https://wingside.vn`), and the selected WingSide preview completed the
`Preview hoạt động` handshake without an alert. The r7 smoke matrix also
confirmed the native site switcher, standalone Theme rail, compact tour locale
controls, active-menu geometry, tablet no-overlap and mobile non-zero layout.
All six public host health endpoints returned HTTP 200.

## Browser proof (Production, authenticated Chrome)

| Route / viewport | Result |
| --- | --- |
| `/admin`, 1440×1000, rail open | Site selector is inside `.app-header__actions`; header starts at y=0 and the selector remains visible while the 258px rail is open. |
| `/admin/collections/pages`, 1440×1000, rail open | Active `Quản lý trang`: `::before=none`, `box-shadow=none`, `transform=none`, stable 229×42px link box. |
| `/admin/theme`, 1440×1000 | Standalone shell/rail/workspace present at 1440/258/1182px; active `Theme & Hero`. |
| `/admin/console`, `/admin/site-review`, `/admin/page-wizard` | Each has the shared shell, 258px rail and active route state; no alert rendered. |
| `/admin/collections/pages`, 900×1000, rail open | Rail 224px, breadcrumb starts at x=288, hamburger ends at x=210; no overlap and document width remains 900px. |
| `/admin`, 390×844 | Template/wrap width 390px, body scroll width 390px and heading visible; no blank admin viewport. |
| `/admin/theme`, 390×844 | Mobile triage rail is 390×64px sticky; workspace is 390px wide and content is visible. |

Artifacts:

- `output/playwright/us074-admin-desktop-open-fixed.png`
- `output/playwright/us074-pages-desktop-open-fixed.png`
- `output/playwright/us074-theme-desktop-fixed.png`
- `output/playwright/us074-theme-mobile-fixed.png`

## Status

The three reported Production admin-shell blockers are closed in the active r7
release. US-074 remains `in_progress` in Harness and `Chờ xác nhận` in Plane:
authenticated staging and Safari/iOS remain the previously approved
`waived/unverified` coverage, and stakeholder handover is still required before
marking the whole US `Hoàn tất`.
