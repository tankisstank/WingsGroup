# Validation

## Required Evidence

| Layer       | Required proof                                                                 |
| ----------- | ------------------------------------------------------------------------------ |
| Schema      | Payload fields/types and forward migration reviewed                            |
| Unit        | Stable-key validation, mapping validation, deterministic plan                  |
| Integration | Same-site filtering, has-many queries, published eligibility                   |
| Migration   | Empty-to-head and existing-data PostgreSQL smoke                               |
| Data        | 22 targets resolved, zero duplicates, complete taxonomy or approved exceptions |
| Idempotence | Post-apply dry-run reports zero mutations                                      |
| Regression  | WingsGo/non-WingSide records unchanged                                        |
| Build       | TypeScript, formatter, lint on changed files, optimized build                  |

## Acceptance Queries

- Count target records by `sourceProvenance.batchId` and `site`.
- Count missing destination tags.
- Count missing travel-style tags.
- Count unknown/duplicate taxonomy keys.
- Verify all wrapper pages are same-site.
- Snapshot before/after values for every changed ID.

## Production Gate

Local completion does not authorize production apply. Production requires a
PostgreSQL backup, migration plan, content diff approval and rollback point.

## 2026-07-24 Evidence

- Generated Payload types include `destinationTags`, `travelStyles` and
  `taxonomyProvenance`.
- Targeted unit: 5/5 pass; full unit: 307/307 pass.
- Targeted integration: 2/2 pass; full integration: 114 pass, 4 opt-in
  adapter tests skipped by the standard runner.
- TypeScript `tsc --noEmit`: pass.
- Changed-file lint: 0 errors; 24 pre-existing `no-explicit-any` warnings in
  `TourProducts.ts` and `queries.ts`.
- PostgreSQL 16.14 empty-to-head migration and no-pending check: pass.
- PostgreSQL Payload create/query/update/delete proof for the has-many fields:
  pass on `@payloadcms/db-postgres`.
- Optimized Next build: pass using an isolated `.next-us049` output because the
  existing US-047 local production runtime holds `.next/standalone` open.
- Local copied-database dry-run: 22 changed, 0 unchanged, 0 missing records,
  0 missing mappings, 0 conflicts, 0 exceptions.
- Dry-run mutation check: 0 destination rows, 0 style rows and 0 taxonomy
  provenance values after planning.
- The project owner approved mapping revision `us-049-v1-20260724` and
  authorized local apply on 2026-07-24.
- A pre-apply SQLite backup and signed dry-run plan were created.
- Local apply completed with `verifiedState=after`, `resumed=false`.
- Post-apply state contains taxonomy provenance on all 22 targets, with 58
  destination relations and 35 travel-style relations.
- Post-apply dry-run reports `changed=0`, `unchanged=22`, with zero missing
  records, missing mappings, conflicts or exceptions.
- Production was not mutated; the separate production gate remains in force.

## 2026-07-24 Local Release Candidate

- Immutable application commit:
  `8ff2d5408f47cbb921ae41aaf31d78a11d8329bc` on
  `release/wingsside-go-live-20260723`.
- The release branch is published to `origin`; this is not a production
  deployment.
- Local SQLite backup:
  `E:\repo\WingsTravel-releases\us049-local-8ff2d5408f47\backup\payload-tourplatform.db`.
- Backup SHA-256:
  `944e4c430a73e1987504ab6233f735914e7b4062f7c4a7abac374373d5513031`;
  SQLite `PRAGMA integrity_check` returns `ok`.
- Local production runtime is available at `http://127.0.0.1:3000`, through
  the existing host-injecting proxy to the release upstream on port `3012`.
- Liveness and readiness both return HTTP 200. Readiness reports database
  `up`, Redis `up`, and local-only lead delivery `disabled`.
- Post-cutover taxonomy dry-run remains `changed=0`, `unchanged=22`, with zero
  conflicts and zero missing mappings.
- Agent-browser verification confirms the Home, destination, travel-style and
  tour-detail routes load from the RC. The destination and travel-style H1
  contracts remain intact.
- Full-site go-live review completed all 91 checks but is blocked on local
  fixture drift outside US-049: missing local media, stale `WingsSide`
  display content, localhost sitemap/robots targets, and pre-existing
  tour-detail H1/CTA findings. Production US-048 evidence remains the accepted
  baseline; these local findings must not be represented as a US-049 pass.
- Production remains untouched. US-049 is waiting for owner review of the
  local RC and an explicit production decision.
