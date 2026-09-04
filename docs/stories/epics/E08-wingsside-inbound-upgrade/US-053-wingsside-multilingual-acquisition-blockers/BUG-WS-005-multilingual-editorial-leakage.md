# BUG-WS-005: WingSide translated locales expose source-language copy

## Classification

- Type: localized content-integrity defect
- Severity: P0 for acquisition routes
- Owner story: US-053
- Audit reference: WS-AUD-003

## Observed Behavior

The audit records English UI and conversion copy on Vietnamese routes. Existing
locale infrastructure and audit tooling cover `vi`, `it`, `es` and `pt`, but
the external audit sampled only VI/EN and therefore does not prove the other
translated locales are clean.

## Expected Behavior

VI/IT/ES/PT public routes contain no source-language sentence or CTA outside an
approved proper-noun/term allowlist. Copy identical to the EN default is a
finding unless its field is explicitly approved as shared.

## Fix Contract

- Expand route and field inventory across Home, hubs, forms and representative
  Tour Detail pages for VI/IT/ES/PT.
- Produce a reviewable, idempotent editorial plan before changing production
  Payload content.
- Run locale validation and rendered-page marker scans with zero blockers.
- Preserve EN as the source-language baseline.

## Closure Evidence

Local implementation evidence recorded on 2026-07-25:

- Form copy is now a typed five-locale public dictionary and VI copy no longer
  uses mixed English operational terms such as `Team` or `sales/content
  manager`.
- `validate:wingsside:locales` now queries Payload with `fallbackLocale:false`
  so missing localized page content cannot pass by borrowing EN.
- `audit:multisite:locale-content` is strict by default; missing, placeholder,
  mixed-language and needs-editorial-review rows set a nonzero exit code.
  `--allow-findings` or `--strict=false` remains available for inventory-only
  exploratory runs.
- Local strict multisite audit passed with blockerCount 0:
  `artifacts/us-053-multisite-locale-audit/locale-content-audit.md`.
- Local strict WingSide required-route validation failed because the local DB
  has 105 missing required path findings under `fallbackLocale:false`:
  `artifacts/us-053-locales/wingsside-locale-validation.md`.
- Tests:
  - `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsSideHiFiPublicCopy.unit.spec.ts tests/unit/multisiteLocaleContentAudit.unit.spec.ts`
    PASS, 8 tests.
  - `node scripts/run-integration-tests.mjs tests/int/localeContentAudit.int.spec.ts`
    PASS, 4 tests.
  - `pnpm run audit:multisite:locale-content -- --output-dir ../artifacts/us-053-multisite-locale-audit`
    PASS strict, blockerCount 0.

No production CMS write/apply was performed. Any production content remediation
still requires a signed dry-run/apply/rollback plan and explicit owner approval.

Correction cycle 1 local evidence recorded on 2026-07-26:

- Restored classifier unit tests for default-locale self comparison, identical
  default copy, Spanish `todo`, Style logic, mixed-language evidence, blocker
  count and strict negative behavior.
- Reconciled strict multisite audit PASS vs WingSide validator FAIL: validator
  and backfill source queries used `limit: 100`, which truncated the local
  WingSide page inventory. Both now use `limit: 1000`; missing findings are
  not allowlisted.
- Ran guarded local backfill and hi-fi content seed against local SQLite only,
  with backups recorded in artifacts/app. No production CMS apply was run.
- `pnpm run validate:wingsside:locales -- --output-dir ../artifacts/us-053-locales-correction`
  PASS, expected routes 105, blockers 0, warnings 0.
- `pnpm run audit:multisite:locale-content -- --output-dir ../artifacts/us-053-multisite-locale-audit-correction`
  PASS strict, blockerCount 0, rows 366.

Correction cycle 2 local evidence recorded on 2026-07-26:

- The curation bypass is no longer tied to generic `req.context.seed`. It now
  requires the dedicated internal marker
  `wingsSideLocalizationBackfill: "wingsside-localization-backfill"`, shared by
  WingSide localization/site-settings backfill and hi-fi seed/remediation write
  paths only.
- Ordinary seed/write contexts still validate WingSide Home curation. Negative
  tests prove rejection for wrong-site tour, draft/unpublished tour, wrong
  taxonomy, incomplete keyed selections, duplicate featured selections and
  missing wrapper page.
- `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/validateWingsSideHomeCuration.unit.spec.ts`
  PASS, 8 tests.
- `pnpm run audit:multisite:locale-content -- --output-dir ../artifacts/us-053-multisite-locale-audit-correction-2`
  PASS strict, blockerCount 0, rows 366.
- `pnpm run validate:wingsside:locales -- --output-dir ../artifacts/us-053-locales-correction-2`
  PASS on serial retry, expected routes 105, blockers 0, warnings 0.

No production CMS write/apply was performed in correction cycle 2.
