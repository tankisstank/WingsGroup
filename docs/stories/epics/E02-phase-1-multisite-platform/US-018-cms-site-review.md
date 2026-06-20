# US-018 CMS Site Review

## Status

implemented

## Lane

normal

## Product Contract

CMS users can open a site review console that lists only the sites and editorial documents visible to their current Payload account, preview a selected public URL in an iframe, and jump to the Payload edit screen for that page or post.

## Relevant Product Docs

- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `docs/HARNESS.md`

## Acceptance Criteria

- The CMS has a `/admin/site-review` custom view linked from the admin nav and operator console.
- The view groups visible pages and posts by site and previews the selected URL in an iframe.
- Each page/post item has an Edit action that opens the native Payload edit route for that document.
- Site and document visibility is enforced by existing Payload access control with `overrideAccess: false`.

## Design Notes

- API: `GET /api/site-review` authenticates the current user, creates a local Payload request, and reads `sites`, `pages`, and `posts` with access control enabled.
- UI surface: `app/src/components/SiteReview` mirrors the static review tool but uses live CMS data.
- Domain rules: editors may edit assigned-site content but cannot publish because the existing `preventEditorPublish` hook remains the enforcement point.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | TypeScript compile. |
| Integration | Payload API route uses existing collection access rules. |
| E2E | Admin user can open `/admin/site-review`, select a document, preview it, and click Edit. |
| Platform | Existing Next/Payload build succeeds. |
| Release | Not run for this story. |

## Harness Delta

No harness workflow change.

## Evidence

2026-06-16 implemented CMS site review:

- Added `/admin/site-review` custom Payload admin view.
- Added authenticated `GET /api/site-review` using existing Payload collection access with `overrideAccess: false`.
- Linked the view from the admin nav and operator console.
- Validation: `pnpm run generate:importmap` passed; `pnpm exec tsc --noEmit` passed; `pnpm run lint` passed with pre-existing warnings; `pnpm run test:int` passed 11 files / 46 tests; `pnpm run build` passed; HTTP smoke confirmed `/admin/site-review` returns 200 and unauthenticated `/api/site-review` returns 401.
- Playwright smoke: logged in as local admin, opened `/admin/site-review`, found 102 review items, verified iframe visibility, verified Edit href `/admin/collections/pages/606`, captured `output/playwright/site-review-smoke.png`, and saw no browser console errors.
