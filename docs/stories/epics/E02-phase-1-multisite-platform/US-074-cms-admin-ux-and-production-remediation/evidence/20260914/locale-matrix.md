# Locale, label, search và date evidence

## Locale controls

The compact document control is registered for Pages (existing) and the
candidate collection matrix:

- Tour Products
- Posts
- Tour Departures
- Media
- Departure Variants
- Categories
- Tour Campaigns
- Site Settings

The configured admin locales are `vi`, `en`, `it`, `es`, `pt`, `ja`, `ko`, `fr`,
`de`. The admin dropdown snapshot exposed each code once:

`Tiếng Việt (vi)`, `Tiếng Anh (en)`, `Tiếng Ý (it)`, `Tiếng Tây Ban Nha (es)`,
`Tiếng Bồ Đào Nha (pt)`, `Tiếng Nhật (ja)`, `Tiếng Hàn (ko)`, `Tiếng Pháp (fr)`,
`Tiếng Đức (de)`.

The compact control now has a hydration-safe locale fallback; the transient
`undefined` code observed during initial client hydration no longer appears.
Missing source titles use `[Chưa dịch] — <title nguồn>` through a read-only
localized title lookup. No fallback is written into the missing locale and no
public locale policy was changed.

Automated proof:

- `compactDocumentControls.unit.spec.ts`: pass;
- `localizedAdminTitle.unit.spec.ts`: pass;
- focused locale/date/title run: included in 10 files / 35 tests passed;
- full unit suite: 134 files / 992 tests passed.

## Other UI surfaces

- `Additional Domains`, `Page wrapper` and `generateSlug` operational labels are
  localized at source configuration level.
- Admin date formatting uses `vi-VN`, `Asia/Ho_Chi_Minh`, 24-hour
  `dd/MM/yyyy HH:mm`; UTC `2026-09-08T18:30:00Z` renders as
  `09/09/2026 01:30`.
- Pages search input reserves 40px for the icon; manual computed layout showed
  the icon before the placeholder `Tìm với Tiêu đề`, with no overlap.
- Pagination was not forcibly rewritten because the reported missing spaces
  did not reproduce reliably. The Payload UI 3.84.1 source-contract probe covers
  0/1/10/11 records and the first/last pages at
  [pagination-no-repro.json](./pagination-no-repro.json); authenticated browser
  verification on real datasets and owner confirmation remain open.
