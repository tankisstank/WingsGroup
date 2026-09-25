# PostgreSQL migration and upgrade rehearsal

Migration candidate: `20260914_090000_cms_admin_lead_triage.ts`.

## Schema behavior

The migration is additive and PostgreSQL-specific. It adds nullable sales status,
assignment, note, audit transition/actor/time fields and a version default of
zero to `form_submissions`, with scoped indexes and nullable user foreign keys.
It does not alter customer-authored submission payload or delivery state. The
down migration is intentionally a no-op: app rollback must not silently discard
operational triage history; any schema rollback needs a separately rehearsed
forward-safe procedure.

Current candidate enum values are `new`, `contacting`, `won`, `no_answer`, `lost`.
The six-value design proposal is recorded as an open vocabulary gate in
`lead-access.md`; no data alias/backfill was run.

## Results

- `pnpm db:migrate:smoke`: pass on disposable PostgreSQL `16.14`; all migrations
  applied and migration status reported no pending migration.
- `pnpm db:upgrade:smoke`: pass; a synthetic pre-head form/submission survived
  upgrade, triage fields remained nullable/default version zero, and the four
  tour tables remained present.
- No production migration, restore, account mutation or real lead mutation was
  run.
- `pnpm db:restore:drill` was not run in this candidate and remains a release
  gate before any production schema change.
