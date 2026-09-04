# Overview

## Current Behavior

The shared Payload/Next.js frontend already supports site-scoped settings and
theme tokens, but child-site logo, favicon, and social-image selection is not
yet governed as one explicit contract. A global fallback can mask tenant
configuration, and legacy `wingsside` naming can be confused with the runtime
tenant code `wing-side`.

## Target Behavior

WingsGo (`wings-go`) and WingSide (`wing-side`, public `wingside.vn`) render the
approved brand-kit assets from their own `site-settings.branding` records:

- primary logo on light surfaces and reverse logo on dark surfaces;
- tenant favicon and supported apple-touch/manifest metadata;
- tenant OG image when the site metadata uses the default image;
- canonical logo links, exact alt text, `data-site-code`, and canonical URL.

The implementation remains extensible for future child sites and never uses a
single global logo or cross-tenant media query.

## Affected Users

- Public visitors on WingsGo and WingSide desktop/mobile routes.
- `super-admin` and `site-manager` operators managing site settings.
- Release/QA operators validating staging and production cutover.

## Affected Product Docs

- `docs/product/cms-theme-management.md`
- `docs/product/multisite-platform.md`
- `docs/product/wingside-identity-contract.md`
- `docs/product/wingsgroup-v3-media-manifest.md`
- `source/brand/visual-identity/site-brand-reference.json`

## Non-Goals

- Redrawing, replacing, or inventing brand assets.
- Changing business content, layout hierarchy, navigation, or CTA behavior.
- Deploying production or mutating production CMS data without backup and
  explicit cutover approval.
- Renaming the public brand `WingSide` to `Wingside`.
