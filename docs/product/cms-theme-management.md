# CMS Theme Management

## Purpose

This feature turns the current multisite theme foundation into a CMS-managed
theme system. Site managers should be able to choose an approved theme preset
and adjust controlled visual tokens for their assigned site without editing
frontend code.

The feature extends the existing `Payload-first` model. `site-settings` remains
the source of truth for per-site branding and public theme overrides.

## Implementation status

The CMS-managed theme feature is implemented.

Delivered surfaces:

- `/admin/theme`: operator-friendly Theme Manager for selecting a site, applying
  a preset, editing controlled tokens, and previewing the result.
- `/admin/collections/theme-presets`: preset collection for super-admin
  governance.
- `/admin/collections/theme-presets/create`: preset editor with live preview
  and native color pickers alongside validated hex inputs.
- `site-settings.branding`: per-site preset assignment and controlled
  overrides.

The public frontend resolves theme values in this order:

```text
base defaults
  -> selected theme preset
  -> site-settings overrides
  -> --site-* CSS variables and data attributes
```

Implemented validation and proof:

- hex validation for all managed colors
- enum-backed fields for radius, spacing, font, button, background, and layout
- integration tests for token resolution and validation
- Playwright coverage for the Theme Manager and Theme Preset preview/color
  picker experience

## Current gap

The current implementation already supports site-level brand and accent colors:

- `app/src/collections/SiteSettings.ts` exposes `branding.brandColor` and
  `branding.accentColor`.
- `app/src/utilities/siteTheme.ts` converts those fields into `--site-brand`
  and `--site-accent`.
- `app/src/app/(frontend)/layout.tsx` writes those CSS variables onto `<body>`.
- `app/src/app/(frontend)/globals.css` consumes `--site-*` variables across
  shared components and blocks.

The gap is that deeper theme behavior is still partly code-owned:

- `data-site-theme` uses `siteName`, which is display content rather than a
  stable theme key.
- `WingsGo` and `WingsSide` have CSS selectors with hardcoded site names.
- surface, radius, spacing, shadow, typography, button, and layout treatments
  are not editable from the CMS.
- the `HighImpactHero` mixes site business behavior with theme behavior by
  branching on `/wingsgo` and `/wingsside`.

## Research notes

The feature should follow these patterns:

- Payload custom admin views are the right mechanism for a dedicated
  `/admin/theme` management surface while still writing to collections.
- Payload field-level validation should guard color strings and enum-like token
  values before they affect public rendering.
- Payload localization is already enabled, but theme tokens should not be
  localized by default. Theme text such as preview labels can be localized;
  visual tokens should stay stable per site.
- Design token practice favors named token groups with platform-specific export.
  In this repo, the first export target is CSS variables under `--site-*`.
- Theme presets should be controlled and versioned. Editors can override
  approved tokens, but arbitrary page-level CSS remains out of scope.

External references reviewed:

- Payload admin customization docs:
  `https://payloadcms.com/docs/admin/custom-components`
- Payload field validation docs:
  `https://payloadcms.com/docs/fields/overview`
- Payload localization docs:
  `https://payloadcms.com/docs/configuration/localization`
- Design Tokens Community Group format:
  `https://design-tokens.github.io/community-group/format/`
- Style Dictionary token export model:
  `https://styledictionary.com/`
- shadcn/ui theme token convention:
  `https://ui.shadcn.com/docs/theming`
- Community example of Payload theme-management plugin direction:
  `https://github.com/Lionel-Dutrieux/payloadcms-theme-manager`

## Feature contract

The CMS theme feature must make these behaviors true:

- Every site has a stable `branding.themeKey` or `branding.themePreset` that is
  safe to use for rendering and CSS selectors.
- Theme defaults come from approved presets.
- Per-site overrides are stored in `site-settings`.
- Public rendering uses normalized `--site-*` tokens, not site-name-specific
  styling.
- CMS users can adjust theme values through a dedicated Theme Manager view and
  the underlying site settings fields.
- Invalid theme values cannot be saved.
- Hero business behavior is represented as block data or a controlled hero
  preset, not path-specific frontend branching.

## Data model

Extend `site-settings.branding` with a `theme` group while keeping the existing
brand fields for backward compatibility.

Recommended shape:

```ts
branding: {
  logoText?: string
  logoImage?: Media
  brandColor?: string
  accentColor?: string

  themeKey: 'wings-group' | 'wings-go' | 'wings-side' | 'wings-plus' | 'wings-care' | 'wings-pass' | 'custom'
  themePreset: 'corporate' | 'retail' | 'premium' | 'utility' | 'care' | 'custom'

  surfaceColor?: string
  surfaceStrongColor?: string
  backgroundStyle?: 'plain' | 'soft-gradient' | 'editorial' | 'utility'
  radius?: 'sm' | 'md' | 'lg' | 'xl'
  spacingScale?: 'compact' | 'standard' | 'airy'
  fontPreset?: 'system' | 'modern' | 'retail' | 'editorial' | 'premium'
  buttonStyle?: 'solid' | 'soft' | 'outline' | 'pill'
  layoutStyle?: 'corporate' | 'retail' | 'editorial' | 'utility'
}
```

Rules:

- `themeKey` is the stable rendering key. It must not be derived from
  `siteName`.
- `themePreset` selects the approved default token set.
- `brandColor`, `accentColor`, `surfaceColor`, and `surfaceStrongColor` must
  accept only supported CSS color input. Phase 1 should start with hex colors.
- enum fields must default to the selected preset when unset.
- visual tokens are not localized.
- `themeKey` must be unique enough for selectors and analytics, but it does not
  need a separate database uniqueness constraint while each site has one
  `site-settings` record.

## Token merge

Theme resolution should be deterministic:

```text
base theme defaults
  -> selected theme preset defaults
  -> site-settings branding overrides
  -> normalized CSS variable map
```

`getSiteThemeTokens()` should emit at least:

| Token | Source | CSS variable |
| --- | --- | --- |
| Brand color | `branding.brandColor` or preset | `--site-brand` |
| Accent color | `branding.accentColor` or preset | `--site-accent` |
| Surface color | `branding.surfaceColor` or preset | `--site-surface` |
| Strong surface color | `branding.surfaceStrongColor` or preset | `--site-surface-strong` |
| Radius | `branding.radius` mapped to size | `--site-radius` |
| Section spacing | `branding.spacingScale` mapped to size | `--section-space`, `--section-space-sm` |
| Shadow | preset-derived | `--site-shadow` |
| Border | preset-derived or color-mix | `--site-border` |
| Font preset | `branding.fontPreset` | `--site-font-heading`, `--site-font-body` |
| Button style | `branding.buttonStyle` | `data-site-button-style` or token variables |
| Layout style | `branding.layoutStyle` | `data-site-layout` |

The frontend layout should render:

```tsx
<body
  data-site-theme={siteTheme.themeKey}
  data-site-preset={siteTheme.themePreset}
  data-site-button-style={siteTheme.buttonStyle}
  data-site-layout={siteTheme.layoutStyle}
  style={siteTheme.style}
>
```

## Admin experience

Add a dedicated Payload admin view:

```text
/admin/theme
```

The Theme Manager should:

- let a super-admin choose any site and a site-manager choose only assigned
  sites
- show current preset, active overrides, and preview tokens
- allow changing preset, colors, radius, spacing, font, button style, and layout
  style
- show a preview panel for header, card, CTA, form, and hero surfaces
- link to the full `site-settings` edit view for advanced fields
- protect editor users unless a later role decision grants theme permissions

The underlying write target remains `site-settings`. The custom view is an
operator-friendly surface, not a separate source of truth.

### Theme preset editor

The preset create/edit screen is intended for non-technical operators:

- each color field includes a visual color picker and a hex input
- the preview updates while the form values change
- preview examples cover a hero, primary/secondary CTA, cards, typography,
  surface colors, spacing, and radius
- field labels and descriptions explain visible effects instead of exposing
  token implementation details
- the stable preset key remains available but is marked as a system field that
  should only change for a deliberate technical reason

Theme Presets define approved reusable defaults. Theme Manager applies those
presets to sites and stores site-specific overrides in `site-settings`.

## CSS migration rule

CSS should move from site-name selectors to token/preset selectors.

Allowed:

```css
body[data-site-preset='retail'] .site-hero { ... }
body[data-site-layout='utility'] .site-card { ... }
.theme-card { border-radius: var(--site-radius); }
```

Avoid:

```css
body[data-site-theme='WingsGo'] .site-hero { ... }
body[data-site-theme='WingsSide'] .theme-card { ... }
```

Site-specific visual identity should be expressed by preset and token values.
True business-specific behavior should move to structured content fields.

## Hero behavior

Move hero-specific business behavior out of path checks.

Recommended model:

- add `hero.variant`: `standard`, `retail-departures`, `planner`, `utility`
- add optional hero data groups only when the variant requires them
- seed WingsGo with `retail-departures`
- seed WingsSide with `planner`
- keep visual style controlled by theme preset and tokens

This keeps theme concerns separate from business behavior.

## Validation

The implementation must prove:

- invalid hex colors cannot be saved
- unknown `themeKey`, `themePreset`, `fontPreset`, `buttonStyle`, or
  `layoutStyle` cannot be saved
- default theme tokens remain stable when old `site-settings` records do not
  yet have new fields
- WingsGo and WingsSide continue to render correctly after selectors move from
  site names to presets
- a new custom site can get a distinct look by CMS settings only
- the Theme Manager respects site-scoped access

## Non-goals

- free-form custom CSS editing in CMS
- per-page arbitrary theme overrides
- third-party theme marketplace
- replacing the current block system
- changing the Payload-first architecture
- moving theme data to Redis or another non-source-of-truth store

## Rollout plan

1. Add schema fields with safe defaults.
2. Add `getSiteThemeTokens()` preset merge and tests.
3. Update layout to output stable data attributes and full CSS variables.
4. Refactor CSS to preset/token selectors.
5. Move hero path-specific behavior into hero variant config.
6. Add the Theme Manager custom admin view.
7. Add E2E coverage for changing theme settings and rendering public output.
8. Update handover docs for site managers.

All eight rollout steps are implemented in the current local application.
