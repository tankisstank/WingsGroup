# US-012 CMS Management Console

## Status

implemented

## Lane

normal

## Product Contract

The Payload admin must expose the phase-1 CMS capabilities as role-aware
management workflows instead of a generic template dashboard. Editors and site
managers should land on a practical console that surfaces assigned sites,
routine content tasks, publishing status, media, SEO, forms, and safe next
actions without adding CRM or operations scope.

## Relevant Product Docs

- `docs/product/editorial-operations.md`
- `docs/product/phase-1-scope.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`

## Acceptance Criteria

- The default template dashboard and login copy are replaced with WingsTravel
  admin guidance.
- Super admins, site managers, and editors see role-appropriate dashboard
  shortcuts and status cards.
- Site-scoped users see assigned site context and links to relevant pages,
  posts, media, forms, settings, and preview routes.
- Existing phase-1 capabilities remain exposed through Payload collections,
  globals, plugins, and custom admin components without bypassing access rules.
- Public plugin additions are limited to content governance, import/export, or
  editorial quality features that fit the Payload-first phase-1 boundary.
- No booking, payment, CRM pipeline, automation workflow, or advanced analytics
  dashboard is added under this story.

## Design Notes

- Commands: keep content writes in existing Payload collections and plugins.
- Queries: dashboard widgets can use server-side Payload `count` and `find`
  calls scoped by the authenticated user.
- API: no new public API contract is required for the first slice.
- Tables: no required data-model change for the first slice.
- Domain rules: all dashboard links and counts must respect role and site
  access through existing Payload access control.
- UI surfaces: Payload dashboard, login/help copy, collection grouping, handover
  docs, and E2E admin smoke coverage.

## Current State

- The app already has the important CMS primitives:
  - `sites`
  - `site-settings`
  - `pages`
  - `posts`
  - `media`
  - `categories`
  - `users`
  - Payload form builder collections
  - SEO, search, redirects, nested docs, drafts, schedule publish, and live
    preview configuration
- Role and site scoping are already implemented through access helpers.
- The admin entry experience is still generic:
  - `BeforeDashboard` is Payload website-template copy.
  - `BeforeLogin` is generic dashboard copy.
  - There is no WingsTravel-specific management console.
  - The handover guides still describe the flows as placeholders instead of
    actual operating instructions.

## Gap Analysis

The missing work is not primarily a missing CMS engine. The missing work is
editorial productization:

- Editors need a role-aware landing area that tells them what they can manage.
- Site managers need fast routes to site settings, pages, posts, media, forms,
  and public previews for assigned sites.
- Super admins need governance shortcuts for sites, users, and platform-wide
  checks.
- The sidebar needs clearer grouping so users do not have to understand the
  underlying Payload template structure.
- Content quality tools should be added only where they serve phase-1
  publishing quality.

## Direction Options

### Option A: Payload-Native Management Console

Use existing Payload admin custom components and widgets. Keep the current data
model and access rules.

Recommended first slice:

- Replace `BeforeDashboard` with `WingsTravelAdminConsole`.
- Add role-aware quick action sections:
  - Site platform: Sites, Site settings
  - Content: Pages, Posts, Categories
  - Assets: Media
  - Lead capture baseline: Forms and form submissions from Payload form builder
  - Governance: Users, redirects, search, SEO checks
- Add server-rendered dashboard widgets:
  - assigned sites
  - pages/posts count by accessible site
  - drafts and scheduled content
  - recent updates
  - form submissions summary
- Update role handover docs to match the real admin flows.

Pros:

- Lowest architecture risk.
- Reuses current Payload-first implementation.
- Preserves site-scoped access.
- Can be delivered in a small vertical slice.
- Gives the customer a visible CMS upgrade quickly.

Cons:

- Does not create a fully bespoke admin application.
- Advanced dashboard personalization is still marked experimental by Payload.

### Option B: Add Selected Official Plugins

Keep Option A, then add official plugins only where they solve a concrete
admin capability.

Candidate:

- `@payloadcms/plugin-import-export` for CSV/JSON content import and export.

Conditions before adopting:

- Define which collections are exportable.
- Restrict user and site governance exports to `super-admin`.
- Decide whether imports are allowed in phase 1 or export-only is safer.
- Configure job runner behavior so imports/exports do not remain pending.

Pros:

- Official Payload plugin.
- Useful for handover, content backup, bulk review, and migration.

Cons:

- Adds job queue operational requirements.
- Imports can create data-quality or wrong-site mistakes if not restricted.
- Not needed for the first visible admin UX improvement.

### Option C: Adopt Multi-Tenant Plugin Or Public Admin Theme

Use official multi-tenant plugin or a public theme/editor plugin to replace
part of the custom site-scoping/admin experience.

Recommendation: defer.

Reasons:

- The repo already has a `sites` model and custom site-scoped access.
- Multi-tenant plugin adds a `tenant` model/field pattern that overlaps with
  existing `site`.
- Adoption would be a migration, not just a UI enhancement.
- Public admin theme plugins are not the normal Payload path; Payload expects
  project-specific admin customization.

This option becomes reasonable only if the project decides to standardize on
Payload's official tenant semantics before production data hardens.

## Plugin And Theme Evaluation

| Candidate | Type | Fit | Recommendation |
| --- | --- | --- | --- |
| Payload custom dashboard widgets | Core Payload | High | Use for role-aware console metrics. |
| Payload custom views/components | Core Payload | High | Use for dashboard/login/admin UX. |
| `@payloadcms/plugin-import-export` | Official plugin | Medium | Add later if bulk export/import is confirmed. |
| `@payloadcms/plugin-multi-tenant` | Official plugin | Medium but disruptive | Defer unless replacing custom `site` scoping. |
| `@payload-bites/activity-log` | Community plugin | Medium | Evaluate after audit/history requirement is confirmed. |
| `@payload-bites/broken-link-checker` | Community plugin | Medium | Good phase-2 editorial quality candidate. |
| `@payload-bites/content-freeze` | Community plugin | Low-medium | Useful around launch windows, not core phase-1 UX. |
| Admin alert plugins | Community plugin | Low-medium | Useful if the team needs operational notices in CMS. |
| Better visual/block editor plugins | Community/early plugin | Promising but risky | Defer until page composer pain is proven. |
| Public admin theme replacement | Theme/community | Low | Avoid; customize Payload admin instead. |

## Proposed Final Direction

Choose Option A now, keep Option B as a scoped follow-up, and defer Option C.

The final direction should be:

- Build a WingsTravel CMS management console inside Payload.
- Keep data writes in existing collections and plugins.
- Use Payload dashboard widgets only for read-only summaries and shortcuts.
- Keep admin changes role-aware and site-scoped.
- Avoid changing `sites` to `tenants` during this CMS UX story.
- Do not add CRM, booking, payment, automation, or advanced analytics.

## Implementation Shape

### Files Likely To Change

- `app/src/components/BeforeDashboard/index.tsx`
- `app/src/components/BeforeDashboard/index.scss`
- `app/src/components/BeforeLogin/index.tsx`
- `app/src/payload.config.ts`
- collection `admin.group` metadata in:
  - `app/src/collections/Sites.ts`
  - `app/src/collections/SiteSettings.ts`
  - `app/src/collections/Pages/index.ts`
  - `app/src/collections/Posts/index.ts`
  - `app/src/collections/Media.ts`
  - `app/src/collections/Categories.ts`
  - `app/src/collections/Users/index.ts`
- role-specific handover guides under `docs/handover/`
- admin E2E tests under `app/tests/e2e/admin.e2e.spec.ts`

### First Vertical Slice

1. Replace generic dashboard copy with WingsTravel console cards and quick
   links.
2. Add collection grouping so admin navigation reads like the business domain.
3. Show role-specific guidance using the current authenticated user.
4. Add E2E assertions for the dashboard title and core quick links.
5. Update handover docs with exact workflows.

### Second Vertical Slice

1. Add real dashboard widgets using Payload 3.84.1 `admin.dashboard.widgets`.
2. Fetch counts and recent content through server-side Payload calls.
3. Verify counts are scoped for `site-manager` and `editor`.
4. Add integration tests for query scoping.

### Optional Third Vertical Slice

1. Add import/export for selected collections.
2. Restrict export/import access by role.
3. Configure jobs runner behavior.
4. Document operational use and rollback limits.

## Open Decisions For Human Confirmation

Decisions confirmed on 2026-05-28:

1. The first dashboard must include real metrics immediately, not only static
   shortcuts and guidance.
2. `editor` must not publish directly. Publishing is limited to
   `site-manager` and `super-admin`.
3. Form submissions and lead capture baseline must be surfaced on the console.
4. Import/export is included in this phase.

## Recommended Implementation Slices

1. Replace `BeforeDashboard` with a WingsTravel management console component:
   assigned sites, quick actions, publish checklist, recent content, and support
   links.
2. Add Payload dashboard widgets when the current Payload version supports the
   modular dashboard API reliably: site content counts, drafts needing review,
   recent updates, and form submission summary.
3. Improve admin information architecture: group collections by Site Platform,
   Content, Assets, Forms, SEO, and Governance where Payload config supports it.
4. Add optional official `@payloadcms/plugin-import-export` only after choosing
   export/import scope, job runner behavior, and access restrictions.
5. Evaluate community plugins only after a specific editorial pain is confirmed:
   activity log, broken link checker, content freeze, admin alerts, or better
   block editor.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Role/site helper coverage for dashboard data shaping if extracted. |
| Integration | Payload local API verifies dashboard queries are site-scoped. |
| E2E | Admin login lands on the WingsTravel console and role users see only allowed links. |
| Platform | `pnpm run lint`, `pnpm run test:int`, and `pnpm run test:e2e` pass. |
| Release | Handover guides describe the updated CMS management console. |

## Harness Delta

This story records the implemented CMS management console scope and proof so
future CMS work can proceed without expanding phase-1 into CRM or operations
workflow.

## Evidence

Implementation and validation completed on 2026-05-28 and refined on
2026-05-29:

- Added a Payload-native WingsTravel CMS dashboard widget with live counts,
  assigned sites, recent pages/posts/leads, review tasks, and role-aware quick
  actions.
- Localized the admin entry experience and dashboard guidance to Vietnamese.
- Added WingsTravel admin branding, nav context, collection grouping, and a
  more polished operational console style without replacing Payload admin.
- Scoped form submissions and form records by site so lead data appears in the
  console without becoming a CRM workflow.
- Restricted publishing so editors can save drafts while site managers and
  super admins control publish.
- Added official import/export support in this phase, restricted to manager and
  admin data-management workflows.
- Updated handover docs and admin E2E coverage for the management console.
- Validation evidence: `pnpm exec tsc --noEmit`, `pnpm run lint`,
  `pnpm run test:int`, `pnpm run test:e2e`, and `pnpm run build` passed during
  the 2026-05-28 implementation. The 2026-05-29 visual/localization refinement
  reran typecheck, lint, import-map generation, build, and browser smoke.
