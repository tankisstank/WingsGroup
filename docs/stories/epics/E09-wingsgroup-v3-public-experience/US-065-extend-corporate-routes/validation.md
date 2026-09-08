# US-065 Validation

## Proof Strategy

Prove complete route coverage, approved/pending legal states, Vietnamese copy
quality, tenant-isolated SEO and links, responsive accessibility, and
idempotent content migration.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Route archetype, policy publication state, link resolution, and copy guard. |
| Integration | Payload page/locale/site queries, migration idempotence, metadata, and form ownership. |
| E2E | Nine routes, breadcrumbs, internal links, pending states, contact path, and accessibility. |
| Platform | Build, route HTTP matrix, canonical/robots/sitemap, desktop/mobile captures, no-cross-tenant checks. |
| Performance | Image/route payload and long-page rendering budgets. |
| Logs/Audit | Route and publication checks retain non-sensitive results. |

## Fixtures

- Vietnamese content for all nine routes.
- Approved and pending policy states.
- Safe and unsafe ecosystem destinations.
- WingsGroup, WingsGo, and WingSide route samples.

## Commands

```text
pnpm lint
pnpm test:int
pnpm test:e2e
pnpm build
pnpm go-live:review
```

Use `agent-browser` for interactive route and responsive review.

## Acceptance Evidence

Implemented. Production smoke on 2026-08-26 confirmed the corporate, contact,
policy, ecosystem and news routes in Vietnamese and English, together with
`pages-sitemap.xml` and `posts-sitemap.xml`. Pending proof and deep-link states
remain fail-closed rather than becoming public claims or unverified links.

## Editorial URL compatibility follow-up — 2026-09-09

Commit `4f7c368` resolves the public editorial route mismatch at both layers:
WingsGroup archive cards now generate canonical `/tin-tuc/<slug>` URLs, and a
host-scoped permanent compatibility redirect maps legacy
`/posts/<slug>` requests to `/tin-tuc/<slug>`. The rule applies only to
`wingsgroup.vn` and `www.wingsgroup.vn`; other tenant routes retain their
existing behavior.

Targeted redirect/card/shell unit checks passed (9 assertions). Production
verification returned HTTP 308 with the expected `/tin-tuc/<slug>` location
for a legacy article URL; the canonical public article and `/tin-tuc` continued
to return HTTP 200.
