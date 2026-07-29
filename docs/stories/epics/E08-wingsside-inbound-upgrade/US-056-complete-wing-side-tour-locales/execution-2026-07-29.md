# US-056 execution report — 2026-07-29

## Completed in S3 orchestration

- WP1 audit: strict production reads confirmed that all 22 WingSide `TourProduct` records have empty localized text for `vi`, `es`, `it`, and `pt`; wrapper Pages remain localized.
- WP4 implementation: curation wrapper lookup now uses the requested locale with `fallbackLocale: false`.
- WP2/WP3 implementation: editorial restore plans now require exactly 22 tours for each target locale, four locale entries per slug, and non-empty identity/checksum fields.
- Focused verification: 4 test files, 16 tests passed; `git diff --check` passed.

Integrated commits:

- `dabd7a2` — disable locale fallback for curation wrappers.
- `ccd8699` — harden editorial plan inventory guard.

## Approved English baseline and editorial reconciliation

- The customer approved the current 22 English production tours as the new source baseline.
- Production had stored exclusions after the real inclusions in the `includes` array and left `excludes` empty. The approved baseline keeps every English sentence unchanged while restoring the semantic split using the previously approved locale catalog cardinality.
- Normalized source totals: **22 tours, 129 inclusions, 202 exclusions**.
- VI, IT, ES and PT were independently reconciled in a calm, specific and consultative travel voice. Each locale now has the same 22-tour inventory, 129 inclusions and 202 exclusions, with no machine-like word-for-word fallback.
- Source manifest and all four locale files pass the strict catalog validator with **0 findings**.

Integrated content commits:

- `4a62778` — reconcile Italian commercial inclusions and exclusions.
- `7004cac` — reconcile Vietnamese commercial inclusions and exclusions.
- `37ddd90` — reconcile Spanish commercial inclusions and exclusions.
- `787aefa` — reconcile Portuguese commercial inclusions and exclusions.
- `e67901b` — approve the normalized English production baseline.

## PostgreSQL migration correction

Fresh rehearsal exposed a migration drift unrelated to tour copy:
`whyTourSlots` existed in the Payload schema and SQLite bootstrap, but the
PostgreSQL migration omitted its four tables. The additive correction creates:

- 4 base/version/localized tables;
- 10 governed enum types;
- 10 foreign keys;
- 2 locale-parent unique indexes and the required lookup indexes.

An empty PostgreSQL 16 database migrated from zero to head successfully.
Schema assertions returned `tables=4`, `enums=10`, `foreign_keys=10` and
`unique_indexes=2`. The rehearsal seed then created **22 tours, 22 wrapper
Pages and 5 locales** successfully.

## Rehearsal and canary evidence

- Focused suite: **4 files, 19 tests passed**.
- Full signed plan: **88 entries / 22 tours / 4 target locales**.
- Canary plan for `central-vietnam-adventure-4-days`: **4 updated, 84 unchanged**.
- Canary strict readback: **88/88 checksums verified after apply**.
- Full apply after canary: **84 updated, 4 unchanged**.
- Full strict readback: **88/88 checksums verified**.
- Idempotent full re-apply: **0 updated, 88 unchanged**.
- Transactional rollback: **88 restored**, with before-state verification performed inside the rollback transaction.

The canary plan retains all 88 signed entries; 84 non-target entries become
checksum-verified no-ops. This preserves the exact inventory, source,
transaction and readback guards while limiting the write to one tour across
VI, IT, ES and PT.

## Remaining release gates

1. Create and verify the production PostgreSQL backup/restore artifact.
2. Obtain explicit approval for production database mutation and deployment.
3. Apply the missing migration, then execute the signed one-tour canary and strict production readback.
4. Apply and verify the remaining 84 tour-locale pairs.
5. Run strict API audit and browser QA for 22 Journeys cards and 110 detail routes in `en/vi/es/it/pt`.

No production database, credentials, or deployment were modified by this execution.
