# Design

## Domain Model

`site-settings.branding` is the source of truth. Asset references are resolved
only for the current site scope. Runtime identity is `wings-go` or `wing-side`;
`wingsgo` and `/wingsside` are import/path aliases only and must pass through an
explicit mapping.

Normative mapping:

| Site code | Logo primary | Logo reverse | Favicon | OG image | Alt text |
| --- | --- | --- | --- | --- | --- |
| `wings-go` | `exports/wingsgo/wingsgo-logo-primary.png` | `wingsgo-logo-reverse.png` | `wingsgo-favicon.png` | `wingsgo-og-image.png` | `WingsGo logo` |
| `wing-side` | `exports/wingsside/wingsside-logo-primary.png` | `wingsside-logo-reverse.png` | `wingsside-favicon.png` | `wingsside-og-image.png` | `WingSide logo` |

## Application Flow

1. Resolve request hostname/path to canonical site code.
2. Query the current site's `site-settings` and branding media at bounded depth.
3. Validate media ownership/site scope before rendering.
4. Select primary/reverse logo by surface; emit canonical metadata and cache
   keys containing the site code.
5. Fall back only to an approved same-site asset; fail closed rather than leak
   another tenant's media.

## Interface Contract

- Existing Payload fields remain the write target:
  `branding.logoImage`, `faviconImage`, `logoText`, `brandColor`,
  `accentColor`, `themeKey`.
- Logo links resolve to the tenant homepage canonical URL.
- HTML includes `rel="icon"`; include `apple-touch-icon` and manifest links when
  supported by the current framework.
- No global `app/public/favicon.ico` may override a tenant favicon.

## Data Model

No destructive schema change. If media records are created/imported, retain
source path, SHA-256 checksum, provenance, rights metadata, and owning site.
Import is dry-run first on baseline/staging; production requires backup and
approval.

## UI / Platform Impact

Validate header and footer at 1440px and 390px, including light/dark surfaces.
Logo aspect ratio must remain intrinsic (WingsGo 420x280; WingSide 448x280),
with no crop, distortion, layout shift, pill treatment, or horizontal overflow.

## Observability

Browser evidence records site code, canonical URL, resolved asset URLs, 404s,
console errors, and cache-busting/version behavior without exposing secrets.

## Alternatives Considered

1. A global static logo/favicon: rejected because it causes cross-tenant leakage.
2. Runtime aliases used directly: rejected because `wingsgo`/`wings-side` are
   not the canonical runtime identities.
3. Placeholder or redrawn artwork: rejected; approved brand-kit exports are
   mandatory.
