# US-047 Reusable credentials and awards carousel block

## Status

implemented locally

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
  interval, and one to twelve ordered records.
- Every record supports a governed Media upload plus a required textual fallback
  mark, type, label, title, and description.
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
- Database: `20260722_020046_credentials_carousel_block` contains the live and
  version block tables, image relations, enums, and indexes only.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Hi-fi layout filter retains forms and credentials blocks |
| Integration | Page registry and Media upload schema contract |
| Component | Dynamic copy, image, fallback mark, and navigation |
| Platform | Payload Admin field audit plus Home desktop/mobile render |
| Database | PostgreSQL migration smoke from a clean prior schema |

## Evidence

Implemented locally on 2026-07-22. Production remains frozen.

- `pnpm run generate:types` PASS; the generated `CredentialsCarouselBlock`
  contract includes section controls, Media relation, and ordered items.
- `pnpm exec tsc --noEmit` PASS and targeted ESLint PASS with zero warnings.
- Unit PASS 6/6 for the hi-fi composer allow-list, including form preservation.
- Component PASS 2/2 for CMS copy, Media rendering, textual fallback, and next
  navigation.
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
