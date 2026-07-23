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
| Regression  | WingsGo/non-WingsSide records unchanged                                        |
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
