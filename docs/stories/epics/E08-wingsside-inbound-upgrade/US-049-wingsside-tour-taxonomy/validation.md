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
  `b8250b996216d256179eb2479989bb9156d7feb4` on
  `release/wingsside-go-live-20260723`.
- The release branch is published to `origin`; this is not a production
  deployment.
- Pre-remediation local SQLite backup:
  `E:\repo\WingsTravel-releases\us049-local-remediation-20260724-214254\backup\payload-tourplatform.db`.
- Backup SHA-256 is
  `ff5cd870f9fb42cc4c051386914e2bad4104cc7a12ba422bed8a90d9b44056c1`;
  both backup and active SQLite return `ok` from `PRAGMA integrity_check`.
- Local tenant code is normalized from the legacy `wings-side` value to
  `wing-side`. The technical theme key remains `wings-side`.
- Public display identity is normalized to `WingSide`; `WingsSide` and
  `Wingside` are retained only where they are part of internal code symbols or
  historical evidence.
- The guarded hi-fi content seed updated exactly 40 page-locale targets. Its
  post-apply dry-run reports `wouldMutate=0`, `unchanged=40`, `missingPages=0`
  and `validationGaps=0`.
- Local production runtime is available at `http://127.0.0.1:3000`, through
  the existing host-injecting proxy to the release upstream on port `3012`.
- Liveness and readiness both return HTTP 200. Readiness reports database
  `up`, Redis `up`, and local-only lead delivery `disabled`.
- Post-cutover taxonomy dry-run remains `changed=0`, `unchanged=22`, with zero
  conflicts and zero missing mappings.
- Agent-browser verification confirms the structured tour route has one H1,
  consultation CTAs and one governed form; Contact has one H1, one form,
  email, phone and WhatsApp channels. Visible copy contains `WingSide` and no
  `WingsSide`/`Wingside` spelling.
- Referenced media and the hi-fi logo return HTTP 200 from the local release.
- Full-site domain-routed go-live review completed 91/91 checks with
  `pass_with_notes` and no site-level issue. The remaining notes are
  non-blocking decorative alt text and thin style-page descriptions.
- Regression proof after remediation: unit 313/313, integration 114 pass with
  4 opt-in skips, lint 0 errors, optimized build/TypeScript pass,
  PostgreSQL empty-to-head plus hi-fi CRUD pass, and taxonomy PostgreSQL CRUD
  pass.
- Production remains untouched. The local RC is ready for owner review and a
  separate explicit production decision.
