# US-066 Validation

## Proof Strategy

Aggregate and independently re-check all E09 acceptance evidence against the
frozen release candidate and mandatory release gates.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Full affected unit suite and release-gate result logic. |
| Integration | Payload/PostgreSQL, site/locale, forms/providers, media, SEO, and migrations. |
| E2E | All routes, viewports, navigation, ecosystem, proof, forms, links, and accessibility. |
| Platform | Build, go-live review, backup/restore, canary, health/readiness, rollback, and post-switch smoke. |
| Performance | Image/page budgets, Core Web Vitals smoke, and no layout shift regressions. |
| Logs/Audit | Request, form result, release, and monitoring evidence without PII/secrets. |

## Fixtures

- Frozen application revision and production-equivalent PostgreSQL snapshot.
- Signed migration/data plan and media manifest.
- Complete route/locale/viewport matrix.
- Approved and pending release-gate fixtures.

## Commands

```text
pnpm lint
pnpm test:int
pnpm test:e2e
pnpm build
pnpm go-live:review
```

Add exact story-specific unit/component, migration, canary, and production probe
commands to the release report before execution.

## Acceptance Evidence

Production has been confirmed live by the stakeholder. Public smoke on
2026-08-26 passed the route and sitemap inventory, locale entry routes,
homepage services/contact surface and consultation chooser. The release-gate
register has no pending mandatory gate; consultation channels, proof and deep
links are documented non-blocking fallbacks. Operational acceptance remains in
progress for encrypted PostgreSQL backup/restore evidence, an authorized real
lead-path check, and the initial 24–48 hour monitoring review.

## Deployed navigation compatibility follow-up — 2026-09-09

Release `wingsgroup-home-deepdives-4dfb50d-20260909` was atomically live on
the production VPS with application revision `4dfb50d`. The production health
endpoint and `https://wingsgroup.vn/` returned HTTP 200. Browser smoke
confirmed the unified header destinations on an article route, the home-page
deep-dive links, and legacy `/posts/<slug>` to `/tin-tuc/<slug>` HTTP 308
compatibility. The targeted 9-assertion navigation unit suite passed before
release.

This is a corrective release proof only. It does not close the existing
backup/restore, authorized real-lead, or monitoring acceptance gates.
