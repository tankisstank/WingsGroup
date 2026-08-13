## Multica history writer

The historical writer at `app/scripts/multica-history-writer.mjs` is disabled
by default: without `--apply`, it only validates and reports a source plan.
It permanently allows only the one-time sandbox
`fbd0e39f-4459-4ae2-a997-2133145fced1`; a production workspace ID is rejected.

Before writing, provide an approved JSON plan at
`artifacts/multica-history/approved-plan.json`, or pass `--plan <path>`. The
writer requires exactly 7 projects, 8 Epics, 57 stories and 189 criteria. Each
item needs a unique `externalId`; created issues persist it as
`history_external_id` metadata. All created issues are `backlog`, unassigned,
and contain no mention syntax.

The writer stores an atomic, plan-bound resume journal in
`artifacts/multica-history/journal.json`, searches the target by external ID
before each write, and retries rate-limit responses with exponential backoff.
It refuses a mismatched workspace or source-plan journal.

```powershell
# Validate only; this makes no Multica writes.
pnpm run multica:history:dry-run -- --plan ..\artifacts\multica-history\approved-plan.json

# The second deliberate control is required for a sandbox write.
$env:MULTICA_HISTORY_APPLY = '1'
pnpm run multica:history:apply -- --plan ..\artifacts\multica-history\approved-plan.json
Remove-Item Env:MULTICA_HISTORY_APPLY
```

Do not create a production override. Missing historical source data is a
fail-closed condition, not a reason to generate replacement records.
