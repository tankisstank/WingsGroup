# BUG-WS-002: WingSide SEO output leaks cross-tenant URLs

## Classification

- Type: tenant-isolation and SEO regression
- Severity: P0 release blocker
- Owner story: US-053
- Audit references: WS-AUD-000, WS-AUD-001

## Observed Behavior

The 2026-07-25 audit reports WingsGo URLs in WingSide robots/sitemap output and
an incorrect or missing locale SEO contract for Vietnamese routes. This
conflicts with the production closure evidence recorded for US-048 and must be
reproduced against the current immutable release before implementation.

## Expected Behavior

WingSide robots, root sitemap, child sitemaps, canonical links and reciprocal
hreflang entries contain only valid WingSide URLs for EN/VI/IT/ES/PT.

## Fix Contract

- Scope generation by resolved tenant and published public locale inventory.
- Fail the release probe on any foreign hostname or missing intended locale.
- Prove self-canonical and reciprocal hreflang behavior for representative
  routes in every public locale.

## Closure Evidence

Local implementation evidence recorded on 2026-07-25:

- `generateMeta` now accepts a published-locale alternate inventory so hreflang
  is emitted only for routes known to exist; no `x-default` is emitted.
- WingSide page, tour detail and home-curation lookups use
  `fallbackLocale:false`; locale metadata fallback remains configuration only,
  not an implicit public render fallback.
- Canonical generation still uses the resolved tenant canonical origin from
  `siteSEO`, preserving WingSide host isolation.
- Tests:
  - `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/generateMeta.unit.spec.ts tests/unit/securityPerimeter.unit.spec.ts`
    PASS, 14 tests.
  - `node scripts/run-integration-tests.mjs tests/int/wingsSideTourScoping.int.spec.ts`
    PASS, 5 tests.
  - `pnpm run build` PASS.

No production robots/sitemap/canonical probe was run and this bug is not closed
for production release evidence.

Correction cycle 1 local evidence recorded on 2026-07-26:

- `generateMeta` no longer falls back to all public site locales when no caller
  inventory is supplied; it emits only the current public locale.
- Published-locale alternates are now resolved by exact same-tenant
  `pathname`, `fallbackLocale:false` and `_status:published` outside draft
  mode, not by terminal slug fallback.
- Negative unit tests cover same terminal slug on a different path, draft
  locale, other tenant, and no `x-default`.
- `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/generateMeta.unit.spec.ts tests/unit/pageLocaleInventory.unit.spec.ts`
  PASS.

Correction cycle 2 local evidence recorded on 2026-07-26:

- `queryPublishedPageLocalesByExactPath` no longer imports or reads
  `draftMode()`. Metadata hreflang inventory is always public/published:
  `draft:false`, `overrideAccess:false`, `fallbackLocale:false`, exact
  same-tenant `pathname`, and unconditional `_status:published`.
- Negative tests prove preview/draft mode cannot broaden alternates, draft
  locale rows are excluded, other tenants are excluded, terminal-slug matches
  under different paths are excluded, and `x-default` remains absent.
- `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/pageLocaleInventory.unit.spec.ts`
  PASS, 3 tests.

No production robots/sitemap/canonical probe was run in correction cycle 2.
