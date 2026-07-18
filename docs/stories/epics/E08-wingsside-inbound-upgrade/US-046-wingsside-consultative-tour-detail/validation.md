# US-046 Validation

## Proof Strategy

Targeted proof protects each boundary first. The story remains incomplete until
the full validation ladder, 22 production URLs and controlled production release
all pass. Local implementation proof must not be used to imply production success.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | capability separation, contact state/URL, locale fallback, route/gallery mapping, cleanup integrity/drift/no-op/null semantics |
| Integration | host/site scope, same slug cross-site, draft/access/wrapper gates, SQLite/PostgreSQL JSON parity and PostgreSQL rollback |
| Component | hero, gallery, itinerary, services, related pages, CTA, empty/technical/retail-copy suppression |
| E2E | four named tours, desktop/mobile, keyboard/console/images/CTA, all 22 URLs, WingsGo schedule/market/detail and WingsPlus no-tour regression |
| Platform | canonical/breadcrumb/metadata/schema, encrypted backup/checksum, cleanup dry-run/apply/rollback report, health/live/ready |
| Performance | priority hero, lazy gallery, no overflow at 320/375/768/1280/1440 |
| Logs/Audit | no duplicates, immutable provenance, release/symlink and screenshot evidence |

## Fixtures

- Imported batch `wingsside-bestprice-22-20260717` and its 22-product report.
- Isolated local SQLite and PostgreSQL 16 adapter fixtures.
- Local mobile tour fixture deleted after browser verification.
- Production data is not a test fixture and is only touched after backup/gates.

## Commands

```powershell
cd app
pnpm exec tsc --noEmit
pnpm run lint
pnpm run test:unit
pnpm run test:component
pnpm run test:int
pnpm run test:e2e
pnpm run build
pnpm run cleanup:tours:bestprice22 -- --dry-run --output <report>
```

## Acceptance Evidence

Completed locally on 2026-07-18:

- Targeted implementation suites, typecheck and optimized build passed before
  Phase 3 approval.
- Cleanup unit proof passed 15/15; targeted lint has zero errors with 12 existing
  importer `no-explicit-any` warnings.
- Isolated SQLite adapter proof passed 2/2. Two new-schema retries encountered the
  documented Payload/libsql `SQLITE_BUSY`; the pre-provisioned isolated DB passed.
- Isolated PostgreSQL 16 adapter proof passed 2/2 with explicit `db-postgres`
  assertion, injected rollback and pre-commit drift rollback. Teardown verified
  fixture Page/Product/Site counts `0/0/0`, removed the container/volume and cleared
  the loopback port.
- Mobile browser proof passed at IT 320px and PT 375px with localized CTA URLs,
  zero overflow, clean console and footer safe padding.

Pending:

- Full commands above as one release candidate.
- The four named live tours and all 22-URL browser smoke.
- Production backup, cleanup dry-run/apply, deploy, health, smoke and duplicate audit.

