# Validation

## Proof Strategy

Validation must prove both data safety and public rendering. The theme system is
not complete if only the CMS save path works; the public pages must consume the
same normalized tokens across multiple site identities.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | `getSiteThemeTokens()` resolves defaults, preset defaults, overrides, and legacy records without new fields. |
| Unit | color validators accept approved hex colors and reject malformed values. |
| Integration | `site-settings` create/update rejects invalid enum values and invalid colors. |
| Integration | site-scoped users can only update theme settings for assigned sites. |
| E2E | Theme Manager loads for super-admin and assigned site-manager. |
| E2E | Theme Manager changes a child site's preset/color/radius and public route renders matching `data-site-*` attributes and `--site-*` variables. |
| E2E | Editor cannot access theme management unless a later role decision changes that rule. |
| Platform | mobile and desktop smoke screenshots for at least `WingsTravel`, `WingsGo`, and one custom/preset-overridden child site. |
| Performance | public layout continues to resolve site settings without extra per-component theme queries. |
| Logs/Audit | validation failures and save failures are observable in server logs. |

## Fixtures

- `WingsTravel` root site with corporate/default preset.
- `WingsGo` child site with retail preset.
- `WingSide` child site with premium/editorial preset.
- one test site using `custom` preset and CMS-entered overrides.
- super-admin user.
- site-manager assigned to one child site.
- editor assigned to one child site.

## Commands

Expected commands after implementation:

```text
cd app
pnpm run generate:importmap
pnpm exec tsc --noEmit --pretty false --incremental false
pnpm run lint
pnpm run test:int
pnpm run test:e2e
pnpm run build
```

## Acceptance Evidence

Implemented evidence:

- `ThemePresets` collection provides governed, reusable preset defaults.
- `/admin/theme` provides the site-scoped Theme Manager.
- the Theme Preset create/edit form includes native color pickers and a live
  component preview.
- `getSiteThemeTokens()` merges base defaults, preset values, and per-site
  overrides into normalized `--site-*` variables and stable data attributes.
- public CSS uses preset, layout, and token selectors instead of `siteName`.
- hero business variants are stored as structured block configuration.
- integration tests cover color validation, preset fallback, overrides, and
  legacy records.
- Playwright tests cover Theme Manager access and the preset preview editor.
- the generated site-link review tool supports manual review of all seeded
  site/page routes in a single tree and iframe view.

Final verification commands:

```text
cd app
pnpm exec tsc --noEmit --pretty false --incremental false
pnpm run lint -- --quiet
pnpm run test:int
```

The full frontend Playwright suite and targeted theme preset editor flow also
passed during implementation.
