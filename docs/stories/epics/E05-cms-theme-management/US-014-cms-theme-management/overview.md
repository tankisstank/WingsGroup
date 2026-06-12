# Overview

## Current Behavior

The app has a working multisite theme foundation. Site settings expose
`branding.brandColor` and `branding.accentColor`, and the frontend turns those
values into `--site-brand` and `--site-accent`.

Deeper theme behavior still requires code edits. CSS contains site-name-specific
selectors for `WingsGo` and `WingsSide`, and the high-impact hero branches on
pathnames for business-specific content.

## Target Behavior

The CMS provides a dedicated Theme Manager for each site. Authorized users can
choose an approved theme preset and tune controlled theme tokens such as colors,
surface, radius, spacing, font preset, button style, and layout style.

Public rendering uses stable theme keys, preset names, and `--site-*` CSS
tokens. It does not depend on mutable `siteName` values.

## Affected Users

- `super-admin`
- `site-manager`
- future handover/admin operators responsible for child-site branding

## Affected Product Docs

- `docs/product/cms-theme-management.md`
- `docs/product/ai-agent-seo-and-theme.md`
- `docs/product/phase-1-scope.md`
- `docs/product/acceptance-and-kpis.md`

## Non-Goals

- arbitrary custom CSS editing from the CMS
- third-party theme marketplace
- per-page ad hoc visual overrides
- replacing the existing block/page-builder model
- changing the source-of-truth hierarchy from `source/` and `docs/product/`
