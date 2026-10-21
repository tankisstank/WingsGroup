# Summary verdict: **BLOCKED**

The migration-before-cutover sequence is now documented in `docs/runbooks/oracle-vps-arm64-deployment.md`, so the original runbook omission is resolved. Production is still blocked: the current worktree is not an isolated, committed candidate, no candidate-bound ARM64 operations image exists, and no fresh encrypted backup plus disposable restore proof is bound to the candidate. Read-only VPS evidence from 21/10/2026 confirms the current release is `release-us083-promotion-search-market-20261020-172000`, readiness is healthy, the latest migration is `20261019_100000_site_settings_hotlines`, and the US-084 migration remains pending. The latest local production build passed; no production migration or cutover was run.

## Findings

### P1 — Blocker: Candidate-bound backup, restore, and migration gates are not complete

Production sets `PAYLOAD_DB_PUSH=false`, and the standalone server command does not apply migrations. The runbook now requires a candidate-bound ARM64 operations image, encrypted PostgreSQL backup and successful disposable restore proof, then `payload migrate` and `payload migrate:status` before switching `current`. None of those candidate-specific artifacts or operations has been produced or verified yet. Starting the candidate before applying the migration can cause queries for `editorialBadges` to fail.

**Recommendation:** Isolate and commit the reviewed candidate, build and verify its immutable ARM64 operations image, produce encrypted backup and disposable restore evidence bound to that exact candidate, then run `pnpm payload migrate` and `pnpm payload migrate:status`. Cut over only after the migration is applied and no migrations remain pending.

### P2 — High: Concurrent CMS edits can overwrite badge changes

The field preserves current labels and stores last-used labels per site, locale, and kind. That browser storage does not coordinate concurrent document edits. Two editors saving stale versions of a tour may overwrite each other’s `editorialBadges` array, depending on how the document update is submitted.

**Recommendation:** Confirm Payload’s document version or conflict behavior for concurrent edits. If the collection does not reject stale writes, treat badge edits as last-save-wins and require editors to reload before saving after another editor’s update.

### P2 — High: Rollback migration drops badge data

The `down` migration drops the badge and locale tables, along with their version tables. Applying it after badges have been authored permanently removes that data.

**Recommendation:** Treat `down` as destructive. Before any rollback that invokes it, take a database backup and export or otherwise preserve badge values. Prefer rolling back the app while leaving the additive schema in place unless the migration itself must be reversed.

### P3 — Minor: Revalidation is site-aware for Redis, broad for Next.js paths

The hook calls `clearRedisCurationCache` with the current site ID, and the helper scans only keys matching that ID. It does not use a global Redis flush. However, `revalidatePath` invalidates shared paths such as `/`, `/tour`, and `/thi-truong`, plus their locale variants. This can invalidate cached routes used by other sites on the same app deployment; that is broader invalidation, not evidence that their badge data is exposed.

**Recommendation:** Accept the shared path invalidation if cross-site cache churn is operationally acceptable. If narrower invalidation is required, use site-specific routes or cache tags and verify how tags are applied at render time.

### P3 — Minor: Unknown site context uses shared authoring storage

The storage key falls back to `default` if the site ID is unavailable. In the normal loaded-document flow, the site ID comes from the field or document. If an editor selects a badge before the site is resolved on a new document, the label could be reused by another document that is also missing its site context.

**Recommendation:** Keep site selection available before badge authoring, and verify new-document behavior when the site field has not resolved. Do not treat `default` as a tenant isolation boundary.

## Clean / Pass observations

- **Locale behavior:** `queryCollection` defaults to `fallbackLocale: false` for English and Vietnamese for other locales. The market route passes that choice explicitly for both tours and departures. The WingsGo catalog query and featured-page lookup do the same.
- **Tenant data scope:** The WingsGo catalog rejects non-WingsGo sites and filters products and wrappers by `site.id`. Market queries use `appendSiteWhere`. This supports separation of WingsGo badge data from WingSide and WingsGroup, subject to those callers continuing to use the site-scoped query paths.
- **Validation and empty badges:** The collection has `maxRows: 3`; the shared validator rejects more than three items, unsupported kinds, duplicate kinds, and empty labels. The normalizer omits empty or invalid badge entries. The database does not enforce unique badge kinds per parent, so integrity depends on Payload validation for writes.
- **Migration shape:** The migration creates new tables, enum types, foreign keys with cascading deletes, and indexes; it scopes enum existence checks to `public` with `to_regtype` and uses `IF NOT EXISTS`. This is additive, with no backfill or alteration of existing tour rows apparent in the migration.
- **Migration locking:** Creating these indexes and adding foreign keys can take locks. The new tables should be small initially, but a partially created or populated schema could make retries or rollback more disruptive. `IF NOT EXISTS` does not reconcile a preexisting table with an incorrect shape.
- **Labels and mobile layout:** The card limits sticker and promo widths and truncates their text; the promo badge also uses truncation. The authoring validator imposes no label length limit, so extremely long labels can still lose visible text. The story records mobile browser checks, but I did not independently reproduce them in this audit.
- **Revalidation timing:** The hook invalidates routes after a successful change and clears matching Redis curation keys. Redis failures are swallowed by the helper, so route invalidation remains, but cache freshness then depends on route behavior and TTLs. The catalog API returns `Cache-Control: no-store`; public rendered pages still rely on their revalidation behavior.

## Rollback and operational verification checklist

1. Back up PostgreSQL and record the current release identifier.
2. Run `payload migrate` from the new release’s operations image against production PostgreSQL 16.
3. Run `payload migrate:status`; confirm `20261021_120000_tour_editorial_badges` is applied and there are no pending migrations.
4. Only then switch `current` and recreate the standalone app container.
5. Check `/api/health/ready`, application logs, and a WingsGo tour with badges. Also check an English route where the badge has no English translation, and confirm the badge is omitted.
6. Check a WingSide or WingsGroup tour route to confirm its own scoped data is rendered. Confirm Redis invalidation only removes keys for the affected site ID.
7. If application rollback is needed, restore the previous app release while retaining the additive schema. Do not run the migration’s `down` function unless badge data has been backed up and its loss is intended.

**Audit limits:** I did not run tests, browser checks, migrations, or production commands; the validation record’s results were not independently reproduced. The release risk is the missing migration step in the Oracle deployment sequence, plus the concurrency and destructive-rollback behaviors described above.
## Release follow-up — 2026-10-21

- P2 hotline validation mismatch was fixed by rendering valid CMS accepted international numbers consistently.
- P2 authoring busy state was fixed by clearing the action state when locale/site context changes; stale response guards remain active.
- Candidate `513238bc483f4d755081d24e291ff40e9475ba6c` passed build, component, integration, targeted unit checks, encrypted backup/restore drill, ARM64 operations image validation, migration status, readiness, and production browser smoke.
