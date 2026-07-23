# WP2B2 Grok Task - Exact-Scope PostgreSQL Repair Runner

## Role and boundary

You are the implementation worker. The PM/leader will independently audit every
file, command and claim. Work only in:

`E:\repo\WingsTravel-us046-hifi`

Use model `botstack-grok-4.5`. You are not alone in the worktree. Do not revert,
overwrite or reformat unrelated edits. Do not merge, deploy, connect to the
production VPS, back up production, or write to production PostgreSQL.

Production deploy and data writes remain frozen.

## Accepted input

WP2B1 is accepted and must be reused:

- `app/scripts/lib/wingsSideBestPriceReleaseRepair.ts`
- `app/tests/unit/wingsSideBestPriceReleaseRepair.unit.spec.ts`

Do not weaken its 22-record scope, tenant, relation, checksum, exact rollback or
no-create/delete/relation-rewrite guards.

Study and reuse established patterns from:

- `app/scripts/cleanup-wingsside-bestprice-22.ts`
- `app/scripts/lib/wingsSideBestPriceCleanupRuntime.ts`
- `app/tests/int/wingsSideBestPriceCleanupTransactions.int.spec.ts`
- `app/scripts/import-bestprice-22.ts`
- `app/scripts/lib/bestprice22.ts`

## File ownership

You may create or edit only:

- `app/scripts/repair-wingsside-bestprice-release.ts`
- `app/scripts/lib/wingsSideBestPriceReleaseRepairRuntime.ts`
- `app/tests/int/wingsSideBestPriceReleaseRepairTransactions.int.spec.ts`
- `app/package.json` only if a narrowly named script is required

Do not edit the accepted WP2B1 planner or its unit test. If you find a planner
defect, stop and report the exact defect instead of changing it.

## Required behavior

Implement a bounded CLI with:

1. `--dry-run --plan <path>`
2. `--apply --plan <path>`
3. `--rollback --plan <path>`

The runner must:

- resolve exactly one site with code `wing-side`;
- load normalized source using the same checked-in source contract as the
  BestPrice 22 importer;
- select exactly the 22 products owned by batch
  `wingsside-bestprice-22-20260717`;
- load each exact same-tenant wrapper and referenced hero media;
- build a durable, versioned JSON plan containing the accepted WP2B1 records,
  aggregate before/after checksums, site/batch/count, generation timestamp and
  source identity;
- write the plan only for dry-run; apply and rollback must consume an existing
  plan and must not silently regenerate it;
- validate the plan and compare it with freshly loaded source and aggregates
  before any write;
- classify current state and allow only `before -> after` for apply and
  `after -> before` for rollback; equivalent desired state may be a no-op;
- refuse mixed, unknown, stale, cross-tenant, changed-provenance,
  changed-source, relation, filename, duplicate or count drift;
- update only governed product fields, wrapper `meta.description`, and hero
  `alt` represented by each record;
- never create/delete/draft records or rewrite site, wrapper, hero, gallery,
  slug, tourCode, source provenance or status;
- perform all product/page/media writes in one Payload/PostgreSQL transaction
  using `initTransaction`, `commitTransaction`, and `killTransaction`;
- pass the same transaction request to every update;
- disable and restore version creation only where needed for `tour-products`
  and `pages`, including on exceptions; do not alter media version config;
- log bounded progress and explicit summary without printing credentials or
  customer data;
- always terminate cleanly after Payload teardown so dry-run cannot hang.

The plan must remain portable between the backup/clone verification environment
and the approved maintenance runner. Do not put database credentials or machine
absolute paths into it.

## Integration tests

Add PostgreSQL/Payload integration coverage proving:

- dry-run has 22 records and zero writes;
- apply updates only the expected 22 products, 22 wrappers and the referenced
  hero media whose alt changes;
- no create/delete/relation/status/slug/tourCode/provenance change;
- a forced failure mid-run rolls back the whole transaction;
- exact rollback restores field snapshots and aggregate checksum;
- re-apply and re-rollback are safe no-ops in desired state;
- mixed/unknown/stale-plan/cross-tenant/source-drift states are refused before
  writes;
- version configuration is restored after success and failure;
- process/runtime resources close cleanly.

Use an isolated disposable PostgreSQL test database. Never target production.
Skip only when the repository's established integration-test dependency is
unavailable, and report the precise dependency; do not claim a skip as a pass.

## Worker verification and report

Run at minimum:

```powershell
cd app
pnpm exec prettier --write <owned files>
pnpm exec tsc --noEmit
pnpm exec vitest run --config ./vitest.unit.config.mts `
  tests/unit/wingsSideBestPriceReleaseRepair.unit.spec.ts
pnpm exec vitest run --config ./vitest.config.mts `
  tests/int/wingsSideBestPriceReleaseRepairTransactions.int.spec.ts
git diff --check -- <owned files>
```

Return:

- exact files changed;
- exact commands, exit codes and test counts;
- CLI examples for dry-run/apply/rollback;
- transaction and teardown explanation;
- any blocker or residual risk;
- `git status --short` for owned files.

Do not say complete unless the files exist and the reported commands were
actually run. Do not commit.
