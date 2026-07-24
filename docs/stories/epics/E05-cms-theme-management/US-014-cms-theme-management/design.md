# Design

## Domain Model

Theme management remains scoped to a `site`.

Core concepts:

- `themeKey`: stable rendering key for data attributes and controlled selectors.
- `themePreset`: approved default token set.
- `themeTokens`: normalized visual values emitted as `--site-*` variables.
- `themeOverrides`: site-specific values stored in `site-settings.branding`.

Merge rule:

```text
base defaults
  -> preset defaults
  -> site-settings overrides
  -> runtime CSS variables and data attributes
```

## Application Flow

Commands:

- update site theme settings
- change theme preset
- reset site theme overrides to preset defaults

Queries:

- resolve current site settings
- resolve theme preset defaults
- get normalized site theme tokens
- list manageable sites for current admin user

## Interface Contract

Payload admin:

- `/admin/theme` custom view for Theme Manager.
- `site-settings` remains the underlying collection and source of truth.
- theme fields are also visible in `site-settings` for advanced editing.

Frontend layout:

```tsx
<body
  data-site-theme={themeKey}
  data-site-preset={themePreset}
  data-site-button-style={buttonStyle}
  data-site-layout={layoutStyle}
  style={themeStyle}
>
```

## Data Model

Extend `site-settings.branding`:

- `themeKey`
- `themePreset`
- `surfaceColor`
- `surfaceStrongColor`
- `backgroundStyle`
- `radius`
- `spacingScale`
- `fontPreset`
- `buttonStyle`
- `layoutStyle`

Validation:

- color fields accept approved CSS color formats, starting with hex
- enum fields reject unknown values
- old records without these fields resolve to defaults

No new database source of truth is required for phase 1. A future phase can
promote preset definitions into a `theme-presets` collection if non-developers
need to create entirely new presets.

## UI / Platform Impact

Theme Manager should show:

- site selector with site-scoped permissions
- preset selector
- color controls
- segmented controls for radius, spacing, font, button style, and layout style
- preview surfaces for logo/header, card, CTA, form, and hero
- save/reset controls

Public UI impact:

- shared CSS moves away from `WingsGo` and `WingSide` selectors
- components continue using `theme-section`, `theme-card`, `theme-media`, and
  `--site-*` variables
- hero business behavior moves into structured hero variant fields

## Observability

Theme updates should be visible through existing Payload record history if
versions are enabled for `site-settings` later. Until then, the implementation
should log admin-side update failures and validation failures in normal server
logs.

## Alternatives Considered

1. Store all theme presets in code only.
   - Rejected as the final feature shape because site managers need CMS control.
   - Kept for preset defaults because code-owned approved presets are safer.

2. Create a separate `theme-presets` collection immediately.
   - Deferred. It adds governance complexity before the team needs non-dev
     preset creation.

3. Allow arbitrary custom CSS in CMS.
   - Rejected. It weakens handover safety and can break accessibility,
     responsive layout, and SEO structure.
