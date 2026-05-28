# US-006 Site-Scoped Editorial Access

## Status

implemented

## Lane

normal

## Product Contract

Admin access must stay scoped by role and site so editors and managers can only
view or change content assigned to them.

## Relevant Product Docs

- `docs/product/phase-1-scope.md`
- `docs/product/editorial-operations.md`
- `docs/product/acceptance-and-kpis.md`

## Acceptance Criteria

- `super-admin` can manage all sites.
- `site-manager` is limited to assigned sites.
- `editor` is limited to assigned sites and editorial scope.
- Sensitive fields remain restricted to higher-privilege roles.

## Design Notes

- Commands: assign site scope, assign role, publish content within scope.
- Queries: content filtered by site assignment.
- API: Payload access control and admin filters.
- Tables: users plus site-scoped content collections.
- Domain rules: site scope applies consistently across collections.
- UI surfaces: Payload admin lists, editors, and restricted fields.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Access predicates by role and site |
| Integration | CMS read/write operations reject out-of-scope access |
| E2E | Login as each role and verify visible data scope |
| Platform | Seed users for local verification |
| Release | No cross-site data leakage on main admin flows |

## Harness Delta

This story converts role/site governance from strategy text into a testable work packet.

## Evidence

2026-05-27 implementation:

- Confirmed `super-admin`, `site-manager`, and `editor` roles are represented
  in the Users collection.
- Confirmed role and site assignment fields remain super-admin-only.
- Added `siteManagerScopedAccess` to require manager-level role plus assigned
  site scope.
- Restricted `site-settings` create/update/delete to `super-admin` or
  `site-manager` within assigned sites; editors can still work in editorial
  collections such as pages, posts, media, and categories.
- Added access tests for role predicates, site-scoped read filters,
  manager-scoped site settings, write enforcement, and user visibility rules.

Validation:

- `cd app; $env:DATABASE_URL='file:./payload-us010-test.db'; pnpm run test:int`
  passed with 6 files and 24 tests.
- Filtered `tsc --noEmit` output for US-006 touched files returned no matching
  errors.
- `pnpm lint` remains blocked before project linting by the existing ESLint 9
  circular config error.

2026-05-27 proof completion:

- Added Playwright-authenticated REST smoke coverage for `site-manager` and
  `editor` role behavior.
- `site-manager` assigned to WingsGo can read WingsGo site settings and cannot
  see WingsCare site settings through the authenticated API.
- `editor` assigned to WingsGo receives `403` when attempting to create
  `site-settings`.

Validation:

- `pnpm run test:e2e` passed outside sandbox with 14 tests.
- `pnpm lint` passed with zero warnings.
- `pnpm exec tsc --noEmit --pretty false --incremental false` passed.
