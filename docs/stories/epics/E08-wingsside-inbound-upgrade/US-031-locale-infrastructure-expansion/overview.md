# US-031 Overview

## Current Behavior

WingsTravel currently has a Payload-first multisite app with only `vi` and `en`
configured as first-class locales in Payload, site path parsing, generated
types, sitemap loops, and several UI copy fallbacks. Public chrome and helper
copy often use binary `locale === 'en' ? ... : ...`, which makes new European
locales fall back to Vietnamese unless guarded.

## Target Behavior

The app supports 9 CMS-enabled locales:

- `vi`
- `en`
- `it`
- `es`
- `pt`
- `ja`
- `ko`
- `fr`
- `de`

Only `vi`, `en`, `it`, `es`, and `pt` are public-enabled for wave 1. `ja`,
`ko`, `fr`, and `de` remain CMS-enabled but hidden from public nav, sitemap,
hreflang, and ads surfaces until content QA enables them.

## Affected Users

- Public WingsSide visitors from EN/IT/ES/PT routes.
- Editors managing localized CMS content.
- Site managers reviewing public locale exposure.
- Dev/ops applying Payload/PostgreSQL migrations.

## Affected Product Docs

- `docs/product/wingsside-inbound-implementation-plan.md`
- `docs/product/wingsside-inbound-visual-and-motion-upgrade.md`
- `docs/stories/epics/E08-wingsside-inbound-upgrade/audit.md`

## Non-Goals

- Do not publish JA/KO/FR/DE to public launch surfaces in this story.
- Do not seed final translated content; US-033 owns content/media seed.
- Do not build a second routing or CMS layer.
- Do not weaken the PostgreSQL migration gate.
