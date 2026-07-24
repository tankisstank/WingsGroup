# US-007 First Site Launch Readiness

## Status

implemented

## Lane

normal

## Product Contract

The first `WingsTravel` site must be launch-ready on the bounded phase-1 scope,
with proof covering public experience, CMS operations, and scope guardrails.

## Relevant Product Docs

- `docs/product/phase-1-scope.md`
- `docs/product/acceptance-and-kpis.md`
- `docs/product/phase-1-launch-readiness.md`

## Acceptance Criteria

- The first public site deploys with site-specific branding and SEO defaults.
- Core pages work on mobile and desktop without major layout breakage.
- Editorial updates on the core flow can be completed from the CMS.
- Phase-1 proof does not depend on CRM, payment, or AI features.

## Design Notes

- Commands: launch smoke checks, proof collection, content publish checks.
- Queries: launch-critical page and settings reads.
- API: frontend route rendering and metadata generation.
- Tables: core site, settings, pages, posts, media, users.
- Domain rules: launch proof must honor the phase-1 scope boundary.
- UI surfaces: home, about, service, contact, and admin publish flow.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Launch-critical utility coverage where applicable |
| Integration | Core content fetch and metadata checks |
| E2E | Representative public and admin flows |
| Platform | Build or local smoke checks when available |
| Release | Launch checklist and acceptance evidence |

## Harness Delta

This story gives phase-1 launch a durable home instead of leaving it distributed across strategy notes.

## Evidence

2026-05-27 implementation:

- Added `docs/product/phase-1-launch-readiness.md` with route inventory,
  launch checklist, completed technical readiness items, and pending
  customer/content/environment items.
- Updated handover site inventory with the phase-1 umbrella site and child-site
  route coverage.
- Updated deployment/server/domain/email handover notes with Payload-first
  production assumptions: Node.js, PostgreSQL for staging/production, Redis
  production support when needed, domain/DNS/SSL/email pending customer facts.
- Updated scope boundary and next steps to separate delivered phase-1 platform
  capability from out-of-scope CRM, booking/payment, advanced analytics, and
  AI/RAG features.
- Launch readiness uses sample content and structure; final customer launch
  still requires customer-approved copy and imagery.

Validation:

- `pnpm lint` passed with warnings only.
- `pnpm exec tsc --noEmit --pretty false --incremental false` passed.
- `DATABASE_URL=file:./payload-phase1-test.db pnpm run test:int` passed outside
  sandbox with 7 files and 27 tests.

2026-05-27 launch smoke update:

- Added Phase 1 Playwright smoke coverage for public site routes, localized
  child-site route, seeded campaign landing page, sitemap endpoint, and admin
  dashboard/list/create navigation.
- Changed Playwright local workers to `1` to avoid SQLite/Payload schema init
  races during local bootstrap.
- Added `tests/helpers/seedPhase1Launch.ts` to ensure launch-critical campaign
  content exists in the local smoke database without relying on network asset
  downloads.
- Cleaned the remaining lint warnings in `populateAuthors` and `InitTheme`.

Validation:

- `pnpm run test:e2e` passed outside sandbox with 10 tests.
- `$env:DATABASE_URL='file:./payload-phase1-test.db'; pnpm run test:int`
  passed outside sandbox with 7 files and 27 tests.
- `pnpm lint` passed with zero warnings.
- `pnpm exec tsc --noEmit --pretty false --incremental false` passed.
- `pnpm build` passed outside sandbox and generated sitemap output.
- Residual platform warning: Next.js 16 reports the `middleware` file convention
  is deprecated and should move to `proxy` in a later maintenance story.

2026-06-07 taxonomy update:

- Current phase-1 launch inventory is `WingsTravel`, `WingsGo`, `WingSide`,
  `WingsPlus`, `WingsCare`, and `WingsPass`.
