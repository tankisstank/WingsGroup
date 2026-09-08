# Validation

## Proof Strategy

Prove source correctness locally, then verify production health and externally visible behavior on every host after the release switch.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Proxy locale/cache behavior; llms and metadata builders. |
| Integration | Structured data and multisite SEO contracts. |
| Build | TypeScript and production standalone build. |
| Platform | Production health, six-host HTTP/crawler checks, browser metadata inspection. |
| Performance | Confirm public HTML no longer emits `no-store`; do not claim CDN shared cache. |
| Logs/Audit | Release source/archive checksum, previous release, app/database/Redis container IDs. |

## Fixtures

- Existing published page/article content only.
- No synthetic lead submissions.

## Commands

```text
pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/proxy.unit.spec.ts tests/unit/generateMeta.unit.spec.ts tests/unit/llms.unit.spec.ts
pnpm exec vitest run tests/int/site-seo.int.spec.ts tests/int/sitePaths.int.spec.ts tests/int/structuredData.int.spec.ts
pnpm build
```

## Acceptance Evidence

- Production preflight confirmed the release root, rollback image, 14 GB free
  disk, healthy app/PostgreSQL/Redis containers, current migration state, and
  `/api/health/live` plus `/api/health/ready`. This source-only release needed
  no migration.
- Releases `4454a85c6058c6f73be579b6663021acd9eeb7a3` and
  `cc543fa218a36fffaaa28a8e76e7a84787a825c2` were built from isolated,
  checksummed archives. Final production revision is `cc543fa…`; PostgreSQL
  and Redis were not recreated.
- 35 unit, 22 integration, and 6 component tests passed before release. The
  isolated worktree also passed scoped tests, TypeScript, and production build.
- All six homepages and `llms.txt` endpoints return 200. Default-locale
  prefixes issue one 308 to the unprefixed canonical path. A WingsGroup news
  article exposes Article OpenGraph/Twitter metadata, `x-default`, Article
  JSON-LD, and TravelAgency JSON-LD.
- A 433-URL sitemap crawl found six legacy entries; all six now return 200 with
  zero redirects after the tenant-scoped redirect patch.
- Deferred by requester: Cloudflare Email Address Obfuscation still injects
  one `/cdn-cgi/l/email-protection` link. FAQPage appears only where visible
  CMS FAQ blocks exist; pages without visible Q&A emit no invented schema.
