# US-027 WingSide inbound theme foundation

## Status

implemented

## Lane

normal

## Product Contract

WingSide can render with an inbound editorial theme preset using governed theme
tokens, without leaking visual changes to other sites.

## Relevant Product Docs

- `docs/product/wingsside-inbound-implementation-plan.md`
- `docs/product/cms-theme-management.md`

## Acceptance Criteria

- Theme preset `wings-side-editorial-inbound-v2` exists.
- Theme tokens match the inbound palette.
- Font imports are unchanged; WingSide continues using existing
  `Playfair_Display` + `Inter` mapping until the Fraunces decision is closed.
- `/wingsside` desktop/mobile render with the theme.
- WingsGo smoke proves the theme change does not leak to another site.

## Design Notes

- Added `wingsSideInboundThemePresetKey =
  'wings-side-editorial-inbound-v2'`.
- WingSide site theme assignment now uses the inbound v2 preset.
- `seed-subsites.ts` now reuses `ensureThemePresetSeeds` so custom presets and
  core presets are seeded through one path.
- CSS is scoped to
  `body[data-site-preset='wings-side-editorial-inbound-v2']` to keep rollback
  safe and avoid visual leakage.
- CTA gold uses dark text for contrast on Mustard Gold.
- Mobile header hides the logo wordmark below `30rem` for the inbound preset to
  avoid crowding with the primary action/search/menu.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Theme token resolver if touched |
| Integration | `pnpm run test:int` |
| E2E | Public route smoke for `/wingsside` and one non-WingSide site |
| Platform | Desktop/mobile screenshots |
| Release | Contrast and rollback note |

## Harness Delta

Update matrix evidence after implementation.

## Evidence

- Targeted integration: `pnpm run test:int -- tests/int/siteTheme.int.spec.ts`
  passed, 1 file / 4 tests.
- Targeted lint on changed TS/TSX files passed:
  `pnpm exec eslint src/utilities/themeSeed.ts tests/helpers/seedPhase1Launch.ts tests/int/siteTheme.int.spec.ts tests/e2e/frontend.e2e.spec.ts`.
- Targeted E2E passed:
  `pnpm exec playwright test --config=playwright.config.ts tests/e2e/frontend.e2e.spec.ts -g "renders site-specific theme tokens for child sites"`.
- Screenshot evidence:
  `wingsside-us027-desktop.png`, `wingsside-us027-mobile.png`,
  `wingsgo-us027-no-leak.png`.
- Contrast proof:
  CTA `#1A1A1A` on `#C9A75C` = 7.60:1; body `#1A1A1A` on `#F8F5EE` =
  15.98:1; muted `#6B6259` on `#F8F5EE` = 5.48:1.
- Full `pnpm exec tsc --noEmit` was run but is blocked by unrelated existing
  `tourDetailBuilder` test type errors.
- Full `pnpm run lint` was run but is blocked by unrelated existing
  `scripts/plane-import.mjs` lint error; changed files have no lint errors.
- Full `pnpm run test:int` was run but is blocked by unrelated
  `tests/int/api.int.spec.ts` / `node:sqlite` Vite bundling issue. Other
  integration files reported 50 tests passed before that suite failure.
- Rollback: switch WingSide site setting back to `wings-side-editorial` or
  `premium`; the v2 CSS is inert unless the body preset is selected.
