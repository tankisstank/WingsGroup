# US-047 Reusable credentials and awards carousel block

## Status

implemented and released to the local production runtime

## Lane

normal

## Product Contract

The WingsSide “Credentials and awards” section is a reusable Payload Page
Composer block, not page-specific hard-coded copy. An editor can place it on a
Page, reorder its records, and replace images and content through the CMS.

## Acceptance Criteria

- `credentialsCarousel` is registered in `Pages.layout` and rendered through
  the shared `RenderBlocks` registry.
- Editors control section copy, accessibility label, full-width mode, autoplay,
  interval, and up to 36 ordered records.
- Every record supports a governed Media upload plus review status, issuer,
  recipient, recognition year, issue date, reference code, source filename,
  textual fallback mark, type, label, title, and description.
- Records marked `needs-review` remain available to editors but are not rendered
  publicly until verified.
- The WingsSide hi-fi Home route renders CMS data at the existing credentials
  slot; if no block is configured, the verified legacy fallback remains.
- Other hi-fi and standard Pages can render the same block without duplicating
  the component.
- PostgreSQL migration adds only the new block and version tables.
- Release packaging and the local production runtime can be updated without
  changing the public VPS until a separately authorized public deployment.

## Implementation

- Schema: `app/src/blocks/CredentialsCarousel/config.ts`.
- Renderer: `app/src/blocks/CredentialsCarousel/Component.tsx` and the shared
  `WingsSideCredentialsCarousel` client component.
- Placement bridge: the hi-fi composer allows the reusable block and Home swaps
  it into its locked design position.
- Data: Page `layout` remains localized; uploaded images reference the existing
  `media` collection.
- Catalog: `app/assets/wingsside-credentials/manifest.json` preserves
  traceability to all 24 source photographs and drives an idempotent local
  importer for the five WingsSide locales.
- Database: `20260722_020046_credentials_carousel_block` contains the live and
  version block tables, image relations, enums, and indexes. Migration
  `20260724_090000_credentials_catalog_metadata` adds the governed catalog
  metadata to both live and version tables.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Hi-fi layout filter retains forms and credentials blocks |
| Integration | Page registry and Media upload schema contract |
| Component | Dynamic copy, image, fallback mark, and navigation |
| Platform | Payload Admin field audit plus Home desktop/mobile render |
| Database | PostgreSQL migration smoke from a clean prior schema |

## Evidence

Catalog implementation and local production cutover completed on 2026-07-23 at
release commit `f70ee48`. The public VPS was not changed.

- Analyzed all 24 photographs in `assets/CHỨNG CHỈ` at original resolution and
  preserved the originals unchanged.
- Catalog contains 24 records from 11 issuers spanning 2001-2025: 21 are
  `verified`; three incomplete/cropped records are explicitly `needs-review`.
- Generated 24 web-ready JPEG derivatives (maximum 1600 px, quality 88) while
  retaining each original filename in read-only CMS metadata.
- Idempotent SQLite import completed for all five WingsSide locales. A repeated
  apply remained at 24 Media documents, five carousel blocks, and 120 localized
  items (105 verified and 15 needing review), with no duplicate Media or block.
- Editors can add future awards directly in the reusable Page Composer block;
  the expanded schema supports up to 36 ordered records and governed review
  before public display.

- `pnpm run generate:types` PASS; the generated `CredentialsCarouselBlock`
  contract includes section controls, Media relation, and ordered items.
- `pnpm exec tsc --noEmit` PASS and targeted ESLint PASS with zero warnings.
- Unit PASS 6/6 for the hi-fi composer allow-list, including form preservation.
- Component PASS 4/4 for CMS copy, Media rendering, textual fallback,
  navigation, long-catalog counter, and strict suppression of unverified data.
- Integration PASS 3/3 for Page registry/schema plus idempotent local SQLite
  bootstrap.
- `pnpm run db:migrate:smoke` PASS on PostgreSQL 16.14 from empty database to
  head with no pending migration.
- The local production SQLite target contains 24 Media documents, five live
  localized carousel blocks, and 120 localized items: 105 verified and 15
  needing review. The public carousel therefore exposes exactly 21 verified
  awards in each locale.
- `pnpm run build` PASS for release commit `f70ee48`, including TypeScript and
  all 16 static pages. The standalone release runs behind the local production
  proxy on port 3000; `/api/health/live` and `/en` both return HTTP 200.
- Payload Admin browser audit PASS on Page 298: the configured
  `Chứng nhận & giải thưởng` block exposes 24 editor-managed rows and the
  governed fields for review status, type, Media, issuer, recipient, year/date,
  reference code, read-only source filename, fallback mark, label, title, and
  description. Adding and removing a temporary row returned the editor to 24
  rows; its exact autosave version was deleted after a database backup while
  the published version and 120 live localized items remained unchanged.
- Public browser audit PASS at `/en` through port 3000: desktop and 375px mobile
  each render 21 slides, show `01 / 21`, suppress all `needs-review` records,
  load the active image, and report no horizontal overflow. Desktop next-slide
  navigation advanced to `02 / 21`.
- Screenshots: `artifacts/us047-home-desktop.png`,
  `artifacts/us047-home-mobile.png`, and `artifacts/us047-admin-fields.png`
  remain local evidence and are not release payload files.
