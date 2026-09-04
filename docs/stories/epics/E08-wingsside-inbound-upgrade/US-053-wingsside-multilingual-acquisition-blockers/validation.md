# US-053 Validation

## Proof Strategy

The story remains planned until each audit finding is reproduced against the
current release. Completion requires deterministic local tests plus canary and
production probes for EN/VI/IT/ES/PT. Page-level `pass_with_notes` cannot
override a foreign-host, internal-4xx or inaccessible-form release blocker.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Tenant hostname allowlist, canonical builder, locale route inventory, forbidden-marker classification and form-label helpers. |
| Integration | Metadata/hreflang reciprocity, sitemap snapshots, published-locale filtering, same-site route resolution and no-static-fallback regression. |
| Component | Plan/Contact labels, descriptions, errors, submit accessible name, validation focus and 44px touch targets. |
| E2E | Keyboard-only Plan/Contact flow and internal-link crawl at 390px/1440px for EN/VI/IT/ES/PT without real submission. |
| Platform | TypeScript, lint, build, tenant-isolation probe, production HTTP/canonical/robots/sitemap checks and DB/Redis health. |
| Content | `validate:wingsside:locales` plus multisite locale audit with zero blockers for VI/IT/ES/PT. |
| Regression | US-050 Home remains 6/6/3 real-tour discovery; US-052 Proof Archive remains CMS-backed and accessible. |

## Fixtures

- WingSide Home, Plan, Contact, destination, style, package and representative
  Tour Detail routes in all five public locales.
- A missing/unpublished route fixture proving links fail closed.
- Form validation fixtures that do not invoke SMTP or create a lead.
- Approved allowlists for proper nouns and intentionally shared source text.

## Commands

```text
pnpm run validate:wingsside:locales
pnpm run audit:multisite:locale-content
pnpm run test:unit
pnpm run test:component
pnpm run test:int
pnpm run test:e2e
pnpm run build
```

Add the internal-link crawl and production tenant probe commands when their
implementation exists.

## Acceptance Evidence

## Local Implementation Evidence - 2026-07-25

Status remains `planned`; this is local implementation proof only. No
production probe, deploy, Plane sync, production content apply, lead submission
or database migration was performed.

Commands run from `app/`:

| Command | Result |
| --- | --- |
| `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/generateMeta.unit.spec.ts tests/unit/securityPerimeter.unit.spec.ts` | PASS, 2 files / 14 tests. |
| `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/locales.unit.spec.ts` | PASS, 1 file / 4 tests. |
| `node scripts/run-integration-tests.mjs tests/int/wingsSideTourScoping.int.spec.ts` | PASS, 1 file / 5 tests. |
| `pnpm exec vitest run --config ./vitest.component.config.mts tests/component/leadForm.component.spec.tsx` | PASS after local ResizeObserver polyfill, 1 file / 4 tests. |
| `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsSideHiFiPublicCopy.unit.spec.ts` | PASS, 1 file / 6 tests before late media binding patch. |
| `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsSideHiFiPublicCopy.unit.spec.ts tests/unit/generateMeta.unit.spec.ts tests/unit/multisiteLocaleContentAudit.unit.spec.ts` | PASS after late fallback/media patch, 3 files / 12 tests. |
| `node scripts/run-integration-tests.mjs tests/int/localeContentAudit.int.spec.ts` | PASS, 1 file / 4 tests. |
| `pnpm run test:unit` | PASS, 50 files / 346 tests. |
| `pnpm run test:component` | PASS, 13 files / 48 tests. |
| `pnpm exec tsc --noEmit` | PASS. |
| `pnpm run lint` | PASS with 0 errors and 143 pre-existing warnings. |
| `pnpm run build` | PASS. First run timed out at 244s without an error; rerun with longer timeout passed. |
| `pnpm run audit:multisite:locale-content -- --output-dir ../artifacts/us-053-multisite-locale-audit` | PASS strict, blockerCount 0, rows 366, sites 6. |
| `pnpm run validate:wingsside:locales -- --output-dir ../artifacts/us-053-locales` | FAIL on local data: 105 blockers, all missing required WingSide page paths under `fallbackLocale:false`. |
| `pnpm run test:int` | FAIL twice on local SQLite schema push `SQLITE_BUSY`; 23 files passed, 6 skipped, 2 suites failed before assertions. Focused US-053 integration tests passed. |
| `pnpm run test:e2e -- --grep "does not render broken internal links across public sites"` | FAIL without useful wrapper output; follow-up SQLite run showed prepare-db failure before Playwright. |
| `pnpm run test:e2e:sqlite -- --grep "does not render broken internal links across public sites"` | FAIL before Playwright in `test:e2e:prepare-db` with SQLite `SQLITE_BUSY` during schema push. |

Artifacts:

- `artifacts/us-053-multisite-locale-audit/locale-content-audit.md`
- `artifacts/us-053-multisite-locale-audit/locale-content-audit.json`
- `artifacts/us-053-locales/wingsside-locale-validation.md`
- `artifacts/us-053-locales/wingsside-locale-validation.json`

Local code coverage added:

- Metadata alternates can be narrowed to actually published locale routes and
  never add `x-default`.
- WingSide public page and tour-detail lookups use `fallbackLocale:false`.
- Form fields have localized labels/messages for EN/VI/IT/ES/PT, deterministic
  form+field IDs, consistent `aria-invalid` and `aria-describedby`, first-error
  focus, Radix Select coverage and 44px input/select touch targets.
- Removed `/packages/family-vietnam` from WingSide typed copy, media bindings
  and rendered package-card bindings; replacement points at the existing
  `/packages/vietnam-highlights#family` route.
- Internal-link crawl now checks same-origin final URLs, tenant drift and
  WingSide locale drift, but runtime E2E execution is blocked locally by SQLite
  prepare failures.
- Multisite locale audit is strict by default and exits nonzero when missing,
  placeholder, mixed-language or needs-editorial-review blockers exist.

Pending. Do not mark proof layers complete until current production/canary is
reproduced and revalidated with tenant HTTP, canonical, robots, sitemap,
runtime form and crawl evidence.

## Correction Cycle 1 Evidence - 2026-07-26

Status remains `planned`; this cycle produced local implementation evidence
only. No deploy, Plane sync, production CMS write, production probe, DB
migration or real lead submission was performed.
Harness trace: `#230` with outcome `partial`.

Commands run from `app/`:

| Command | Result |
| --- | --- |
| `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/generateMeta.unit.spec.ts tests/unit/pageLocaleInventory.unit.spec.ts tests/unit/multisiteLocaleContentAudit.unit.spec.ts tests/unit/validateWingsSideHomeCuration.unit.spec.ts tests/unit/wingsSideHiFiPublicCopy.unit.spec.ts` | PASS, 5 files / 22 tests. |
| `pnpm exec vitest run --config ./vitest.component.config.mts tests/component/leadForm.component.spec.tsx` | PASS, 1 file / 4 tests. |
| `node scripts/run-integration-tests.mjs tests/int/wingsSideTourScoping.int.spec.ts tests/int/localeContentAudit.int.spec.ts` | PASS, 2 files / 9 tests. |
| `pnpm run audit:multisite:locale-content -- --output-dir ../artifacts/us-053-multisite-locale-audit-correction` | PASS strict, blockerCount 0, rows 366, sites 6. |
| `pnpm run validate:wingsside:locales -- --output-dir ../artifacts/us-053-locales-correction` | PASS after local SQLite backfill/hi-fi seed, expected routes 105, blockers 0, warnings 0. |
| `pnpm run test:unit` | PASS, 52 files / 356 tests. |
| `pnpm run test:component` | PASS, 13 files / 48 tests. |
| `pnpm exec tsc --noEmit` | PASS. |
| `pnpm run lint` | PASS with 0 errors and 143 existing warnings. |
| `pnpm run build` | PASS. |
| `pnpm run test:int` | FAIL in 2 suites before assertions because Payload/Drizzle SQLite schema push hit `SQLITE_BUSY`; 23 files passed, 6 skipped, 112 tests passed, 13 skipped. |
| `pnpm run test:e2e:sqlite -- --grep "does not render broken internal links across public sites"` | FAIL before Playwright assertions in `test:e2e:prepare-db`; fresh SQLite bootstrap hit `SQLITE_BUSY` creating a hi-fi index. |

Local data actions:

- Created local SQLite backup
  `artifacts/us-053-correction/payload-tourplatform-before-us053-correction-20260726-003251.db`.
- Ran guarded local backfill: `pnpm run backfill:wingsside:locales` PASS,
  21 pages, pageUpdates 48, pageSkips 57, settingsUpdates 5.
- Ran guarded local hi-fi content seed:
  `pnpm run seed:wingsside:hifi-content -- --db --site-code=wing-side --apply`
  PASS, mutated 30 page/locale rows, backup
  `app/payload-tourplatform.db.bak-hifi-2026-07-25T17-37-16-520Z`.

Correction changes covered:

- `generateMeta` no longer infers full site locales when callers lack route
  inventory; it emits only the current public locale unless an explicit
  published-locale inventory is supplied.
- Page metadata alternates now come from exact same-tenant `pathname` matches
  with `fallbackLocale:false` and `_status:published` outside draft mode.
  Negative tests cover same terminal slug under a different path, draft locale,
  other tenant and no `x-default`.
- Internal-link crawl seed now includes `/wingsside`, `/wingsside/en`,
  `/wingsside/it`, `/wingsside/es` and `/wingsside/pt`, plus up to 22
  WingSide Tour Detail wrapper routes when API inventory is available.
- Multisite locale-content classifier tests were restored for default-locale
  self comparison, identical default copy, Spanish `todo`, Style logic,
  mixed-language evidence, blocker count and strict negative behavior.
- Validator/audit mismatch was traced to `limit: 100` page queries truncating
  WingSide local DB inventory. The validator and backfill source query now use
  `limit: 1000`; missing routes are not allowlisted or weakened.
- Backfill scripts now retry transient SQLite `SQLITE_BUSY` writes and internal
  seed/backfill context bypasses unrelated home-curation tour eligibility hooks
  while normal writes still validate.

## Correction Cycle 2 Evidence - 2026-07-26

Status remains `planned`; this cycle produced local implementation evidence
only. No deploy, Plane sync, Harness status change, production CMS write,
production probe, DB migration or real lead submission was performed.

Reviewer finding closure:

- BUG-WS-002: `queryPublishedPageLocalesByExactPath` now always queries public
  published inventory, including during preview/draft mode: `draft:false`,
  `overrideAccess:false`, `fallbackLocale:false`, exact same-tenant `pathname`
  and unconditional `_status:published`. The helper no longer imports or reads
  Next `draftMode()`.
- BUG-WS-005 hook safety: the former generic `req.context.seed` bypass was
  replaced with a dedicated internal marker,
  `wingsSideLocalizationBackfill: "wingsside-localization-backfill"`, shared
  only by WingSide locale/site-settings backfill and hi-fi seed/remediation
  write paths. Ordinary seed/write contexts still run curation validation.

Commands run from `app/`:

| Command | Result |
| --- | --- |
| `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/pageLocaleInventory.unit.spec.ts tests/unit/validateWingsSideHomeCuration.unit.spec.ts` | PASS, 2 files / 11 tests. |
| `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingssideHiFiContentSeed.unit.spec.ts tests/unit/wingsSideHiFiReleaseRemediation.unit.spec.ts` | PASS, 2 files / 24 tests. |
| `pnpm exec node scripts/run-integration-tests.mjs tests/int/wingsSideTourScoping.int.spec.ts tests/int/localeContentAudit.int.spec.ts tests/int/wingssideLocaleCopy.int.spec.ts` | PASS, 3 files / 15 tests. |
| `pnpm run audit:multisite:locale-content -- --output-dir ../artifacts/us-053-multisite-locale-audit-correction-2` | PASS strict, blockerCount 0, rows 366, sites 6. |
| `pnpm run validate:wingsside:locales -- --output-dir ../artifacts/us-053-locales-correction-2` | First parallel attempt FAIL with local SQLite `SQLITE_BUSY`; serial retry PASS, expected routes 105, blockers 0, warnings 0. |
| `pnpm run test:unit` | PASS, 52 files / 364 tests. |
| `pnpm run test:component` | PASS, 13 files / 48 tests. |
| `pnpm exec tsc --noEmit` | PASS. |
| `pnpm run lint` | PASS with 0 errors and 143 existing warnings. |
| `pnpm run build` | PASS. |
| `pnpm run test:int` | FAIL in 2 suites before assertions because Payload/Drizzle SQLite schema push hit `SQLITE_BUSY`; 23 files passed, 6 skipped, 112 tests passed, 13 skipped. |

Artifacts:

- `artifacts/us-053-locales-correction-2/wingsside-locale-validation.md`
- `artifacts/us-053-locales-correction-2/wingsside-locale-validation.json`
- `artifacts/us-053-multisite-locale-audit-correction-2/locale-content-audit.md`
- `artifacts/us-053-multisite-locale-audit-correction-2/locale-content-audit.json`

Local code coverage added:

- Metadata inventory tests prove draft mode cannot broaden alternates and every
  locale query keeps the public/published contract.
- Curation hook negative tests prove ordinary writes still reject wrong-site
  tour, draft/unpublished tour, wrong taxonomy, incomplete keyed selections,
  duplicate featured selections and missing wrapper page.

Remaining proof gap: full integration still has the known local SQLite
schema-push lock in `tests/int/api.int.spec.ts` and
`tests/int/leadCapture.int.spec.ts`; no E2E retry was performed in this cycle.

## Supervisor Acceptance Review - 2026-07-26

An independent read-only Codex `gpt-5.5` session returned `SHIP` for local code
acceptance with no remaining correction finding.

Harness/story state is `in_progress`, not `implemented`:

- Unit, component, focused integration, typecheck, lint, build, strict locale
  audit and the 105-route validator are accepted locally.
- Runtime E2E and two full-integration suites remain blocked before assertions
  by local SQLite schema/bootstrap locking.
- A final serial supervisor retry of the focused broken-link E2E also stopped
  in `test:e2e:prepare-db` at `CREATE INDEX pages_pathname_idx` with
  `SQLITE_BUSY`; Playwright assertions did not run.
- Canary and production probes, production CMS apply, live lead-path validation
  and go-live acceptance have not been performed.
