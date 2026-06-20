# WingsGroup Product Context

This file connects the generic Harness structure to the actual `WingsGroup`
workspace.

## Primary Product Sources

The current product and architecture context lives first in:

- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/16 Phạm vi chức năng release giai đoạn 1 WingsTravel.md`
- `source/strategy/13 Roadmap Payload cho WingsTravel.md`

## Current Product Direction

`WingsGroup` is being built as:

- a `Payload-first` multisite content platform
- one codebase serving multiple sites such as:
  - `WingsGroup`
  - `WingsGo`
  - `WingsSide`
  - `WingsPlus`
  - `WingsCare`
  - `WingsPass`
- a phase-1 scope focused on:
  - multi-domain / multi-site
  - localization
  - site-specific branding and SEO
  - content management
  - role-based access

## Current Infrastructure Direction

- `Local development`: `SQLite`
- `Staging`: `PostgreSQL`
- `Production`: `PostgreSQL + Redis`

## Current App Location

The active app implementation is in:

- `app/`

Important implementation references:

- `app/src/payload.config.ts`
- `app/src/collections/`
- `app/src/utilities/siteContext.ts`
- `app/src/utilities/getSiteSettings.ts`
- `app/scripts/seed-subsites.ts`

## Note

Harness docs in `docs/` should be treated as an operational layer for agents.
They do not replace the business and strategy documents in `source/strategy/`.
