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

Pending release execution.
