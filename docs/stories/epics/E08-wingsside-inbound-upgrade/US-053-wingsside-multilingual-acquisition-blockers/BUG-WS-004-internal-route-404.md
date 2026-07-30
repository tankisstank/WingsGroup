# BUG-WS-004: WingSide publishes an internal package route that returns 404

## Classification

- Type: routing and content-integrity defect
- Severity: P0 release blocker
- Owner story: US-053
- Audit reference: WS-AUD-011

## Observed Behavior

The Vietnamese package hub links to `/vi/packages/family-vietnam`, while the
reported production route returns HTTP 404.

## Expected Behavior

Every rendered internal href resolves within the active WingSide locale. A
missing or unpublished route is removed or replaced by a controlled empty state
before publication.

## Fix Contract

- Reproduce the reported route against the current release.
- Publish the intended page only with approved content, otherwise remove the
  card/link.
- Add build-time inventory and production crawl proof for EN/VI/IT/ES/PT with
  zero internal 4xx.

## Closure Evidence

Local implementation evidence recorded on 2026-07-25:

- `/packages/family-vietnam` was removed from WingSide typed locale copy,
  section OD binding and media card bindings for all five public locales.
- The family card now points at existing route
  `/packages/vietnam-highlights#family`; no `/packages/family-vietnam` page
  was created.
- Internal-link crawler coverage was hardened to fail on same-origin final URL
  drift, tenant alias drift and WingSide locale drift after redirects.
- Tests:
  - `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsSideHiFiPublicCopy.unit.spec.ts`
    PASS, 6 tests before late media binding patch.
  - `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsSideHiFiPublicCopy.unit.spec.ts tests/unit/generateMeta.unit.spec.ts tests/unit/multisiteLocaleContentAudit.unit.spec.ts`
    PASS after late media/fallback patch, 12 tests.

Runtime E2E crawl could not be completed locally: both PostgreSQL-wrapper and
SQLite E2E attempts failed during database prepare/schema push before Playwright
assertions. Production route reproduction remains pending.

Correction cycle 1 local evidence recorded on 2026-07-26:

- Crawler seed now includes all public WingSide locale home routes:
  `/wingsside`, `/wingsside/en`, `/wingsside/it`, `/wingsside/es`,
  `/wingsside/pt`.
- Crawler attempts to add up to 22 WingSide Tour Detail wrapper routes from
  `/api/tour-products` inventory when available, with all five locale variants.
- Same-origin final URL, tenant drift and WingSide locale drift checks remain in
  the crawler.
- Static/unit coverage for removed `/packages/family-vietnam` route remains
  green. Runtime E2E is still blocked before Playwright assertions by Payload
  SQLite schema-push `SQLITE_BUSY` on a fresh e2e DB.
