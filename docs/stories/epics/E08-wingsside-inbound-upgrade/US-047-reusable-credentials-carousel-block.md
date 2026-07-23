# US-047 Reusable credentials and awards carousel block

## Status

implemented and locally content-ready

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
- No production content, deployment, or VPS state is changed while the deploy
  freeze is active.

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

Catalog implementation completed locally on 2026-07-23. Production content and
deployment were not changed.

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
- `pnpm run build` PASS, including TypeScript and all 16 static pages.
- Payload Admin browser audit PASS: the Page `Add Layout` drawer exposes
  `Chứng nhận & giải thưởng`; expanded controls include full-width mode,
  section copy, accessibility label, autoplay, 3000-15000 ms interval, and
  ordered records. The temporary autosave was reverted to the published state.
- Public browser audit PASS at `/wingsside/en`: exactly one credentials
  carousel on desktop and mobile, `375px` mobile reports no horizontal overflow
  (`scrollWidth === clientWidth`), and no browser runtime errors were observed.
- Screenshots: `artifacts/us047-home-desktop.png`,
  `artifacts/us047-home-mobile.png`, and `artifacts/us047-admin-fields.png`
  remain local evidence and are not release payload files.
