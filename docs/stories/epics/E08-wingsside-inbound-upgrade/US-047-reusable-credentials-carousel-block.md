# US-047 Reusable credentials and awards carousel block

## Status

implemented, merged and released to production on 2026-07-24

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

## Production release evidence - 2026-07-24

- PRs
  [#1](https://github.com/tankisstank/WingsGroup/pull/1),
  [#2](https://github.com/tankisstank/WingsGroup/pull/2), and
  [#3](https://github.com/tankisstank/WingsGroup/pull/3) were merged. Production
  runs master commit `0cc90d9276c5256e572af37ba223bfa357ae4b15`.
- The immutable application image is
  `sha256:5c1911eea0350133c78a6f15757b6fe21911e93a99d2e7c00f5f359cb77dc0ee`.
  The active release symlink resolves to
  `/home/ubuntu/wings-travel/releases/wingsside-us047-0cc90d9276c5256e572af37ba223bfa357ae4b15`.
- The encrypted pre-import PostgreSQL backup has SHA-256
  `d617f88f517b0c53eb01ff6f6da6c1c5cb823cdce4e7ebd15e438f8fd8e7c4d6`.
  Its PostgreSQL 16 restore drill passed before the catalog write.
- Production migrations are at 21 rows. The latest migration is
  `20260724_110000_wing_side_supported_locales`; the canonical tenant keeps
  default locale `en` and ordered supported locales `en`, `vi`, `it`, `es`,
  `pt`.
- The checksummed catalog plan applied exactly 24 Media records and five
  localized Home blocks. Verification reports 120 placements: 105
  `verified` and 15 `needs-review`. Re-applying the same plan produced zero
  writes.
- Production browser QA passed on `/`, `/vi`, `/it`, `/es`, and `/pt`: every
  locale renders exactly 21 public slides, one active slide and the `01 / 21`
  counter. Next/previous navigation changed `01 / 21` to `02 / 21` and back.
  Desktop and 390 px mobile screenshots were captured; browser error and
  console logs were empty.
- All 21 rendered credential image URLs returned HTTP 200 with `image/jpeg`.
  The 8 hub routes, 22 published tour routes, five locale homes and both health
  endpoints passed 37/37 HTTP probes.
- Production API/schema verification confirms that Page 142 contains one
  24-item `credentialsCarousel` block per locale with exact counts 21
  `verified` and three `needs-review`. The Admin editor route is protected and
  redirects unauthenticated requests to Payload login as expected.

### Residual review notes

- Production Admin visual QA still requires an authenticated operator session.
  No password was reset and no temporary privileged account was created for
  this audit. The previously completed authenticated local Admin proof remains
  valid for the editor field contract; production API/database proof validates
  the imported row counts.
- The public Page read API currently returns metadata for all 24 block items,
  including the three `needs-review` entries. The React renderer suppresses
  those three records from the public DOM exactly as the acceptance criterion
  requires, but API-level suppression is a separate hardening decision that
  should be tracked explicitly.
- Plane preview passed with 48 stories and 153 child tasks; US-046, US-046A,
  US-047 and US-048 resolve under Epic E08. Remote work-item sync remains
  externally blocked by Plane HTTP 403 (`Payment required` for Initiatives), so
  this repository and Harness evidence are the current tracking truth.
