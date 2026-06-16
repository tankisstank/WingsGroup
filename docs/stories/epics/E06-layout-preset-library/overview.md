# E06 Layout Preset Library

## Status

implemented

## Lane

high-risk

## Product Contract

CMS editors can create public pages from a governed, code-owned layout preset
library inspired by VibeUI's public layout taxonomy. The generated page is a
Payload block snapshot that remains site-aware, localized, and theme-token
driven.

## Relevant Product Docs

- `docs/product/layout-preset-library.md`
- `docs/product/page-composer-and-landing-pattern.md`
- `docs/product/cms-theme-management.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`

## Acceptance Criteria

- Twelve code-owned page presets are available in Page Wizard.
- New block families exist for stats, testimonials, and comparison.
- Existing page blocks expose governed presentation variants.
- Existing pages render through defaults without data rewrites.
- `layoutPresetKey` records the source preset on generated pages.
- VibeUI app-shell categories are documented as out of scope for `Pages.layout`.
- Tests prove registry uniqueness and valid generated block snapshots.

