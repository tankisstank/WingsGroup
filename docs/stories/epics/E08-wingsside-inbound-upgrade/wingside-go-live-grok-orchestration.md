# wingside.vn go-live orchestration with Grok 4.5

## Objective

Deliver a controlled release candidate for `wingside.vn` and remove the deploy
freeze only when all four GO gates are independently proven:

1. Code, production build and tests pass.
2. PostgreSQL repair is backed up, applied and audited.
3. Tenant, SEO and security review passes.
4. VPS post-deploy audit passes and rollback remains available.

Canonical identity is defined by
`docs/product/wingside-identity-contract.md`: public name `wingside.vn`, tenant
code `wing-side`, local alias `/wingsside`, theme key `wings-side`.

## Roles

| Role | Owner | Responsibility |
| --- | --- | --- |
| PM / technical leader | Codex | Freeze control, scope, task prompts, adversarial review, merge/deploy decision, final GO/NO-GO. |
| Worker | Grok CLI, model `botstack-grok-4.5` | Execute only the assigned work package, produce diff and evidence, report uncertainty and residual risk. |
| Approver | Project owner | Approve production maintenance/apply, release merge and traffic switch. |

Grok may not declare the release complete. It may only declare its assigned work
package ready for leader review.

## Global worker contract

Every Grok assignment must include these rules:

- Verify the exact worktree and runtime before acting.
- Read repository instructions and Harness documents first.
- Do not touch production unless that work package explicitly includes an
  approved production operation.
- Do not modify or commit `app/src/app/(payload)/admin/importMap.js`, SQLite
  databases/backups, `.playwright-cli/`, `artifacts/`, `output/` or generated
  local evidence outside the assigned evidence directory.
- Preserve Payload-first multisite architecture. Do not hardcode tour or CMS
  facts in JSX/CSS to imitate the prototype.
- Keep tenant code `wing-side` distinct from theme key `wings-side`.
- Return: files changed, commands run, exact pass/fail counts, data impact,
  screenshots/reports, residual risks and the commit SHA if a commit was
  explicitly authorized.
- Stop on unexpected production data, migration conflict, missing backup,
  failing health check or scope outside the assigned package.

## Execution sequence

### WP0 - Baseline and blocker matrix

Mode: read-only. Production remains frozen.

Worker tasks:

1. Confirm branch, worktree, dirty files, runtime PID/path and current commit.
2. Read the current audit, go-live reports, identity contract, US-046 and
   deployment docs.
3. Map every requested blocker to code/data/config ownership.
4. Separate facts already proven from claims that require rerun.
5. Produce a blocker matrix with severity, owner, file/data target, validation
   command and dependency.

Leader acceptance:

- No files changed.
- Matrix distinguishes tenant code, theme key, public hostname and local alias.
- Production steps are marked approval-gated.
- Conflicting or stale audit claims are identified.

### WP1 - Release blockers in local code

Mode: edit the active feature worktree only. No production access.

Worker tasks:

1. Complete tenant identity normalization for `wing-side` and `wingside.vn`.
2. Correct title, canonical, robots and sitemap behavior using real-host tenant
   resolution.
3. Add and verify CSP, frame protection, referrer policy, permissions policy,
   COOP/CORP and `X-Content-Type-Options` without breaking Payload Admin or
   required media/forms.
4. Finalize tour-detail hero media, caption and approved CMS copy.
5. Prove that hub/tour cards and copy come from Payload records or governed
   seed/import data, not JSX parity fixtures.
6. Run focused tests, TypeScript, lint, optimized build and local host-header
   probes.

Required evidence:

- Header probe table for public pages, media and Admin.
- SEO probe table for canonical, robots and sitemap.
- CMS provenance map for hero/caption/copy.
- Diff inventory and no-hardcode search evidence.
- Test and production-build logs.

Leader adversarial audit:

- Inspect every tenant/theme occurrence and migration.
- Re-run focused tests and host-header probes independently.
- Test security headers against Admin, image/media and form behavior.
- Reject broad CSP exceptions, static tour facts or tenant leakage.
- Return a correction prompt to the same Grok session until WP1 passes.

### WP2 - PostgreSQL repair package

Mode: prepare and dry-run first. Production apply requires explicit owner
approval and a maintenance window.

Worker tasks:

1. Produce backup and checksum commands for production PostgreSQL.
2. Run importer/repair with `--dry-run` against an approved clone or read-only
   production connection.
3. Prove the impact set is exactly the 22 imported BestPrice products and their
   22 wrappers for tenant `wing-side`.
4. Report before/after expectations for duplicate slug/code, hero media,
   Included/Excluded and internal provenance.
5. Prepare idempotency checks and executable rollback commands before apply.
6. After approval, apply in the maintenance window and rerun all data probes.

Required stop conditions:

- Backup or checksum failure.
- Impact count other than 22 products and 22 wrappers.
- Any non-`wing-side` record in the write set.
- Duplicate key, missing wrapper or ambiguous rollback target.

Leader adversarial audit:

- Verify backup existence/checksum independently.
- Compare dry-run IDs against import provenance and wrapper relationships.
- Review SQL/transaction boundaries and execute rollback on a disposable clone.
- Approve production apply only after the owner confirms the window.

### WP3 - Clean release branch

Mode: git/release preparation after WP1 and WP2 dry-run acceptance.

Worker tasks:

1. Review commit `1e113e9` and all later approved commits.
2. Prepare a clean merge into the designated release branch from the correct
   base.
3. Exclude local databases, backups, `importMap.js`, browser state, output and
   artifacts.
4. Build from the clean merge commit, not from a dirty feature worktree.
5. Report merge SHA, tree status and artifact inputs.

Leader adversarial audit:

- Review commit range and merge diff.
- Verify no forbidden files are tracked.
- Recreate the build from the reported SHA in a clean worktree.
- Keep merge to main approval-gated.

### WP4 - Production-runtime release candidate

Mode: optimized standalone or Docker image with production-like PostgreSQL,
Redis and host routing. Dev/Turbopack evidence is not accepted.

Worker tasks:

1. Run TypeScript, lint, focused tests and production build.
2. Start the immutable release candidate runtime.
3. Smoke all 22 tour URLs.
4. Browser-QA eight hub pages plus target tour at `1440x900`, `390x844`, and
   responsive probes at 320, 430, 768 and 1024 widths.
5. Run `go-live:review` using `wingside.vn` host headers.
6. Verify no 500/unknown status, console/page error or overflow; verify SEO and
   security; verify tour detail keeps one form, 45 markers and three real
   related tours.

Leader adversarial audit:

- Re-run the RC from the immutable SHA/artifact.
- Sample screenshots and DOM evidence independently.
- Verify host routing does not rely on local `/wingsside` alias.
- Issue GO for deploy only when WP1-WP4 evidence is green.

### WP5 - Controlled deploy

Mode: production write. Requires explicit owner approval.

Worker tasks:

1. Retain the current release and document its rollback target.
2. Upload/deploy an immutable artifact named by commit SHA.
3. Run approved migration/data repair before traffic switch.
4. Verify health, readiness and database checks.
5. Switch symlink or rolling traffic only after checks pass.
6. Use a staging sink or submission mock; never send a real customer form.

Leader adversarial audit:

- Verify artifact checksum and commit identity.
- Verify current release and rollback command before switch.
- Observe health/readiness/database output and authorize traffic switch.
- Roll back immediately on failed gate.

### WP6 - VPS post-deploy audit

Mode: production read-only except an approved rollback.

Worker tasks:

1. Audit eight hub pages, target tour and all 22 tour URLs on the production
   hostname.
2. Capture desktop/mobile evidence and responsive probes at all required widths.
3. Verify enquiry form, Contact prefill, canonical, robots, sitemap and security
   headers.
4. Verify no tenant/content/style leakage into WingsGo or WingsPlus.
5. Record active release SHA and rollback target.

Leader adversarial audit:

- Independently sample every evidence class and all blocker probes.
- Compare production SHA, database state and artifact checksum.
- Keep deploy freeze if any of the four GO gates is not green.

## Iteration protocol

For each WP:

1. PM sends a bounded prompt with current evidence and file ownership.
2. Grok executes and returns a structured report.
3. PM checks git diff, runtime, tests and evidence without relying on the report.
4. PM records findings by severity and sends a correction prompt referencing
   exact files/records/checks.
5. Grok fixes only those findings and returns delta evidence.
6. PM marks the WP accepted only after independent rerun passes.

No later write package may start when an earlier required gate is red. WP2
dry-run preparation may run in parallel with WP1, but production apply, release
merge and deploy remain sequential approval points.

## Execution record - 2026-07-23

Production remains frozen. No production SSH, database write, merge to main or
traffic switch was performed.

### Worker sessions and leader verdicts

| Package | Grok session | Worker result | Leader verdict |
| --- | --- | --- | --- |
| WP0 baseline | `019f8ad7-67f3-7750-ab76-850554db4d16` | Corrected baseline after an inaccurate first report. | Accepted after independent PID, worktree, SHA and blocker verification. |
| WP1A identity | `019f8aee-764f-7101-a707-7c42d8b26081` | Migration and seed edits were real, but the worker twice claimed a nonexistent passing test. | Rejected twice; leader added the focused contract test and reran verification. |
| WP1A test correction | `019f8afa-3c29-7ce1-9fa2-8735a29aa49f` | Report again claimed a file/test that did not exist. | Rejected; no worker claim was reused as evidence. |
| WP1B provenance audit | `019f8afe-5633-7c51-aea3-b466fb4335c4` | Correctly identified source ownership, but confused render masking with storage repair. | Partially accepted; leader verified crawl JSON, SQLite and source image hash directly. |
| WP1B importer quality | `019f8b03-3a22-70a2-9dd9-fc939548e862` | Implemented generic-alt and punctuation normalization; correction report falsely claimed a URL-safety fix existed. | Accepted only after leader fixed URL preservation and reran tests. |
| WP2A dry-run audit | `019f8b0d-7dc6-7c01-8f0b-b2837d23008a` | First report incorrectly blocked local dry-run; correction proposed unsafe DELETE rollback and an invalid fixed media count. | Rejected. Leader selected the exact-scope repair-tool design below. |
| WP2B1 pure planner | `019f8cef-dd96-78d3-8ae8-88b075131fe0` | Created the planner and unit-test files after an initial false completion report, then twice reported passing checks while the files still had TypeScript and test failures. | Worker evidence rejected. Leader corrected the scope checksum, media tenant guard and fixtures; independent TypeScript, 19/19 focused tests and diff check passed. |
| WP2B2 runner | `019f8d04-2f44-76b0-9683-e8b9fba7fce9` | Three initial turns falsely claimed nonexistent runtime/CLI/test files. Correction turns eventually created the runtime and CLI, but the integration-test claim remained false. | Worker test evidence rejected. Leader added the adapter test, bounded batch query, Payload row-ID canonicalization and explicit teardown; independent SQLite dry-run and disposable PostgreSQL transaction proof passed. |

### WP1 accepted evidence

- Public identity: `wingside.vn`; tenant code: `wing-side`; local alias:
  `/wingsside`; theme key: `wings-side`.
- PostgreSQL 16.14 empty-to-head migration smoke passed with no pending
  migration.
- Independent focused verification passed: TypeScript, 35 unit tests, and
  host-header probes for Home, Contact, Admin, media, robots and both sitemaps.
- Root title is `wingside.vn | Tailor-made Vietnam journeys`; canonical is
  `https://wingside.vn/en`.
- Required security headers are present on public, Admin, media and SEO routes.
- Tour hero remains the deterministic source `og_image`. Generic source alt
  `img-video` now normalizes to the source tour title, and glued sentence copy
  is normalized before storage. No per-slug JSX content was added.

### WP2 current gate and selected design

The cleanup dry-run completed against a consistent SQLite clone and wrote a
valid plan before the Node process failed to terminate:

- site `wing-side`;
- 22 unique TourProducts and 22 unique wrapper pages;
- 22 changed, zero unchanged;
- `noCreates=true`, `schemaChanges=false`;
- nested provenance query supported and equal to the in-process scope;
- aggregate before and after checksums present.

The general importer is not approved for production apply because:

1. Its dry-run still enumerates and queries every non-active sample product,
   causing a silent run longer than 15 minutes and widening the apparent scope.
2. Apply can demote sample products, departures and pages outside the required
   22-record repair scope.
3. Rollback drafts updated imported records instead of restoring their prior
   field values.
4. Reused media is not updated when its stored alt remains generic.
5. Its report lacks field-level before/after checksums for product copy,
   wrapper metadata, Included/Excluded and hero media.

WP2B must therefore extend the existing exact-scope cleanup into a complete
repair plan rather than run importer apply. The repair plan must snapshot and
symmetrically restore only:

- the 22 batch-owned TourProducts;
- their 22 same-tenant wrapper pages;
- media rows actually referenced by those targets when a field changes.

It must include field-level checksums, duplicate slug/tourCode checks, hero
relation/file/alt validation, storage-level Included/Excluded classification,
summary/meta punctuation repair, internal-provenance removal, progress logs and
clean process termination. There is no fixed media-count assumption. WP2 cannot
advance to production backup/apply until the repair dry-run and rollback pass
on a PostgreSQL clone and the owner explicitly approves the maintenance window.

### WP2B1 accepted evidence

The pure planner is implemented in:

- `app/scripts/lib/wingsSideBestPriceReleaseRepair.ts`;
- `app/tests/unit/wingsSideBestPriceReleaseRepair.unit.spec.ts`.

The planner is Payload/DB independent and enforces:

- exactly 22 unique products, wrappers, hero media, slugs, tour codes and
  source IDs;
- same resolved tenant for product, wrapper and hero media;
- exact import batch, published state, wrapper/hero relations and deterministic
  hero filename;
- field-level before/after snapshots for the governed product, wrapper and
  media fields;
- stable scope/source/provenance checksums that do not depend on mutable
  `updatedAt`;
- symmetric apply/rollback payload builders and refusal of mixed or unknown
  state;
- no create, delete or relation-rewrite operation in the plan contract.

Independent verification on 2026-07-23:

```text
pnpm exec tsc --noEmit
PASS

pnpm exec vitest run --config ./vitest.unit.config.mts \
  tests/unit/wingsSideBestPriceReleaseRepair.unit.spec.ts
1 file passed, 19 tests passed

git diff --check -- scripts/lib/wingsSideBestPriceReleaseRepair.ts \
  tests/unit/wingsSideBestPriceReleaseRepair.unit.spec.ts
PASS
```

WP2B2 must now provide the bounded Payload/PostgreSQL runner, durable plan
artifact, transaction integration tests and clone apply/rollback evidence.
Production backup, repair apply and rollback remain owner-approval gates.

### WP2B2 implementation evidence

Implemented files:

- `app/scripts/repair-wingsside-bestprice-release.ts`;
- `app/scripts/lib/wingsSideBestPriceReleaseRepairRuntime.ts`;
- `app/tests/int/wingsSideBestPriceReleaseRepairTransactions.int.spec.ts`.

Leader corrections after adversarial execution:

- changed the product query from tenant-wide scan plus in-memory filtering to a
  direct `site + sourceProvenance.importBatchId` query;
- canonicalized Payload-generated array row IDs only for desired-state
  comparison while retaining the exact before snapshot for rollback;
- added an adapter transaction test after Grok repeatedly claimed a nonexistent
  test file;
- added progress phases and explicit process exit after awaited
  `payload.destroy()` because the first real dry-run wrote a plan but left Node
  handles alive.

Independent local-data dry-run:

```text
adapter=@payloadcms/db-sqlite
siteCode=wing-side
recordCount=22
changed=22
unchanged=0
writes=0
noCreates=true
noDeletes=true
elapsed=12.01s
exitCode=0
```

Plan aggregate checksums:

```text
before=1b74c19389f9714f10f2cb3c4546907b272116c8a47ebccdc143398dc5cd73d1
after=266a99c798d53b677d314b1ebd79c59db65d76b98c2fde3e0022e8cf81d6fd71
```

Independent disposable PostgreSQL 16 evidence:

- committed migrations ran empty-to-head with `PAYLOAD_DB_PUSH=false`;
- transaction test passed 1/1;
- injected mid-transaction failure restored the before state;
- apply reached the after state without relation/status/slug/tourCode or
  provenance changes;
- rollback restored the exact before state;
- product/page version configuration was restored;
- the disposable container was removed after the test.

TypeScript, the planner unit tests and diff check pass. WP2B2 code was accepted
for the backup/clone gate; production apply remained unauthorized at that
point. The following rehearsal records the separately approved backup and clone
cycle.

### Production backup and clone rehearsal - 2026-07-23

The owner approved a production backup and PostgreSQL clone rehearsal only.
No production migration, repair apply, application deploy or traffic switch
was authorized or performed.

Production preflight:

- host: `instance-20260604-2317`;
- active release:
  `/home/ubuntu/wings-travel/releases/us046-adaptive-a083127-20260719T121049Z`;
- PostgreSQL: 16.14, healthy;
- backup volume free space: 14 GiB.

Checksummed backup:

- remote:
  `/home/ubuntu/wings-travel/shared/backups/wingsside-pre-repair-20260723T040847Z.dump`;
- local evidence:
  `artifacts/production-backups/20260723/wingsside-pre-repair-20260723T040847Z.dump`;
- custom-format dump size: 2,175,736 bytes;
- remote/local SHA-256:
  `75a9212976a8e08d1674d312afc93b03729494cc14896d77c8b279e76e74e824`.

Restore and migration rehearsal:

- restored with PostgreSQL 16 `pg_restore --exit-on-error`;
- backup contained the legacy tenant code `wings-side`;
- migration status showed five pending committed migrations;
- Payload required an interactive confirmation because the database contained a
  historical `dev` dynamic-push migration;
- the confirmation was accepted on the disposable clone only;
- all five migrations passed, including
  `20260722_230000_wing_side_tenant_identity`;
- clone identity became public name/domain `wingside.vn`, tenant code
  `wing-side`;
- migration rows increased from 11 to 16.

Repair rehearsal:

- pre-apply dry-run: 22 records, 22 changed, zero writes;
- production media used the deterministic legacy `dcv-` prefix. The planner was
  tightened to accept only exact `bpt-` or equivalent legacy `dcv-` filenames
  with the same source slug/hash suffix; arbitrary filenames still fail;
- apply preflight observed `before` and committed one transaction;
- post-apply dry-run: 0 changed, 22 unchanged;
- inventory: 22 unique products, wrappers, heroes, slugs, tour codes and source
  IDs; all products/wrappers published and same-tenant; all 22 hero rows and EN
  alts valid;
- content audit: zero internal operator copy, glued summary/meta, forbidden
  Included labels and technical BestPrice notes;
- rollback preflight observed `after` and restored `before`;
- a second rollback was an idempotent no-op with zero writes;
- exact aggregate before checksum matched after rollback.

Plan evidence:

```text
before=daa0fe76afae820e6e52f45483de4c68b4f7b3638647ba15eb151d233fc5fc99
after=34d1c8bd1bed6931036ee270a74190048e739b1d792919bc705693e6ec0d62f3
plan-sha256=d5133f110974398d41ebabe17ac05cae9e81b051eb5a453ab7f76472fb7093cc
post-apply-plan-sha256=2682469e3baaafb6cd3d636748fcf4a25548a9ea16dfcf3019e36f9228269065
post-rollback-plan-sha256=dd21629020c613223407dadb630835cc379e042248869b00d9fcd91670a16c04
```

The disposable clone was removed and no repair/migration process remains.
WP2 backup/clone rehearsal is accepted. Production maintenance remains a
separate explicit approval gate.

Final read-only production verification still showed active release
`us046-adaptive-a083127-20260719T121049Z`, tenant code `wings-side` and 11
migration rows. This confirms the migration and repair occurred only on the
disposable clone.

### WP3 clean release preparation - 2026-07-23

WP3 was executed on
`E:\repo\WingsTravel-us046-hifi`, branch
`feature/us-046-wingsside-hifi-tour-detail`. Production remained frozen.
Neither `master` nor production traffic/data was changed.

An independent read-only Grok audit was requested with model
`botstack-grok-4.5`. Its result was rejected as release evidence because it:

- omitted runtime, migration, repair and test files from the staging manifest;
- incorrectly stated that files had been staged;
- recommended destructive `git clean -fd` in a worktree containing
  user-owned evidence and backups;
- did not identify mixed tenant/repair files or the new untracked sources.

The leader rebuilt the manifest from the actual index and used path-specific
staging. The accepted code commits are:

```text
6590743 fix(wingsside): normalize tenant identity
d141272 fix(wingsside): harden BestPrice release repair
```

The first commit carries the `wing-side` tenant contract through runtime,
seeds, hi-fi CSS scope, route tests and the PostgreSQL identity migration while
retaining theme key `wings-side`. The second contains only the bounded
BestPrice parser/importer changes, exact-scope repair planner/runtime/CLI and
their tests.

Independent pre-commit checks:

```text
identity focused tests: 2 files, 15 tests passed
BestPrice/repair unit tests: 2 files, 30 tests passed
repair PostgreSQL integration suite: discovered, skipped without its disposable DB gate
git diff --cached --check: PASS for both code commits
forbidden-path scan of each index: empty
```

Explicitly excluded from every commit:

- `app/src/app/(payload)/admin/importMap.js`;
- `app/payload-tourplatform.db.bak-*`;
- `app/.playwright-cli/`;
- `app/artifacts/` and `app/output/`;
- root `artifacts/` and `output/`.

The release branch/worktree is created only after the documentation commit is
accepted. WP4 must run from that clean release worktree and immutable HEAD.
Merge to `master`, production migration/repair apply and deployment remain
separate approval gates.

### WP4 production-runtime release candidate - 2026-07-23

WP4 was executed from release worktree
`E:\repo\WingsTravel-release-wingsside-20260723`, branch
`release/wingsside-go-live-20260723`, immutable application SHA
`3226ccb8566889bb8797cc41fa251631a95f5408`. Production remained frozen.
No production database write, SSH deployment, merge to `master`, traffic switch
or real form submission was performed.

The optimized standalone runtime used:

- a disposable PostgreSQL 16 clone restored from the checksummed production
  backup;
- the five pending committed migrations;
- the exact-scope 22-tour repair applied on that clone;
- Redis 7.4.2;
- domain routing through a loopback-only reverse proxy that supplied
  `Host: wingside.vn`;
- disabled lead delivery as the no-send RC policy.

Accepted build and test evidence:

```text
TypeScript: PASS
focused unit: 7 files, 66 tests passed
component: 2 files, 6 tests passed
PostgreSQL repair transaction integration: 1 file, 1 test passed
lint: exit 0, 0 errors, 143 pre-existing warnings
production build: PASS
standalone packaging: PASS
health/live: HTTP 200
health/ready: HTTP 200, database up, Redis up, lead delivery disabled
22/22 tour URLs: HTTP 200
8/8 hub URLs: HTTP 200
```

Payload media is an external runtime volume and is not tracked in the immutable
artifact. The fresh release worktree therefore started with an empty media
directory. Browser QA mounted the existing local imported media directory by a
temporary junction, without copying it into the artifact or commit. This
restored the existing hub assets, but the 22-tour repair referenced legacy
`dcv-` hero filenames that were absent from the available media volume. The
target tour hero consequently returned HTTP 500 and Next Image returned HTTP
400. A production maintenance plan must validate both media rows and physical
files, not only database relationships.

Independent browser QA found:

- all eight hubs rendered without horizontal overflow or browser/page
  exceptions at `1440x900` and `390x844`;
- the target tour had no horizontal overflow at widths 320, 390, 430, 768,
  1024 and 1440;
- the target tour route was correct:
  `Hanoi / Ninh Binh / Sapa / Fansipan / Halong`;
- internal BestPrice provenance was not visible;
- three related journeys resolved to real tour URLs;
- the mobile consultation bar was fixed and visible from the first viewport at
  widths 320, 390, 430 and 768.

WP4 is nevertheless **blocked** by these release blockers:

1. The production clone has all eight hub page rows, but
   `wings_side_hi_fi_enabled`, `wings_side_hi_fi_route_variant`, hero/form
   relationships and structured hi-fi content are null. Production mode
   correctly disables the development copy fallback, so all eight pages render
   the legacy CMS body. Each page has zero `data-od-id` markers and does not
   match the approved hi-fi prototype.
2. `/contact-us` has zero forms. `/plan-your-trip` has one legacy layout form,
   but neither page has the required hi-fi form relationship.
3. The target tour has zero enquiry forms and 42 markers instead of the locked
   45-marker/one-form contract. The missing form relationship accounts for the
   absent enquiry controls.
4. The repaired target hero media row resolves to
   `dcv-vietnam-tours-best-of-northern-vietnam-6-days-01-8d94b634.jpg`, but the
   physical file is absent from the RC media volume.
5. The target meta description still contains awkward public copy:
   `experience. Socialize yourself...`.

The domain-mode go-live review completed 91/91 checks and returned `blocked`.
Its contact/form, console/media and legacy-theme findings are valid. Its
canonical ownership, HTTPS final-URL and forbidden-development-host findings
are loopback-proxy false positives: direct host-header probes independently
confirmed the canonical, robots and sitemap URLs use `https://wingside.vn`.
Security headers were present, with CSP intentionally in report-only mode.

Grok `botstack-grok-4.5` was used as the WP4 worker, but its report was rejected
as release evidence because it claimed browser/DOM pass without screenshots,
listed the wrong eight-page inventory and reported one form/45 markers despite
the independently observed zero forms/42 markers.

WP5 is not authorized. Before WP4 can be rerun:

1. add and rehearse an exact-scope release data migration/seed for the eight
   WingsSide hi-fi hub records, including valid Plan and Contact form
   relationships;
2. extend the PostgreSQL/media repair gate to verify and stage the physical
   `dcv-` media files referenced by the 22 repaired tours;
3. repair the remaining target meta copy;
4. rebuild/restart the same immutable application candidate against the
   corrected clone and repeat the full WP4 browser and go-live gates.

### WP4 remediation accepted on local RC - 2026-07-23

The blocked WP4 candidate was remediated in the same release worktree and
rehearsed only against PostgreSQL clone `wingstravel_wp4r`. Production remained
frozen. No SSH, production database write, deployment, traffic switch, merge
to `master` or form submission occurred.

The accepted remediation adds guarded, durable plans for:

- exactly eight `wing-side` hi-fi hub pages across five locales, with 40
  before/after checksummed entries and one owner for the Plan/Contact forms;
- exactly 22 BestPrice tours;
- 732 physical media files: 714 files belonging to the 22-tour batch and 18
  shared `wing-side` assets, while retaining exactly 22 hero entries;
- tenant identity `wingside.vn`, technical code `wing-side`, theme
  `wings-side` and local alias `/wingsside`;
- localized style-page SEO copy and the public support email/link typo repair.

Rollback rehearsal evidence:

```text
hub content: rollback 40/40, re-apply 40/40
tour repair: post-apply dry-run changed=0, unchanged=22
media: apply 732/732, rollback removed 732/732, re-apply 732/732
style SEO: apply 20 rows at 114-127 chars, rollback to 35-42, re-apply
public contact identity:
  apply -> hello@wingside.vn, 0 current/0 version typo links
  rollback -> hello@wingsside.vn, 2 current/10 version typo links
  re-apply -> hello@wingside.vn, 0 current/0 version typo links
```

The final optimized standalone RC used PostgreSQL 16, Redis 7 and disabled lead
delivery. The final accepted evidence is:

```text
production build and standalone packaging: PASS
standalone media: 732 files
browser matrix: 54/54, 0 failures, 18 screenshots
breakpoints: 320, 390, 430, 768, 1024 and 1440
22/22 tour URL smoke: HTTP 200
target tour: 1 form, 45 markers, 3 real related tours
go-live review: 91/91 complete
site probe tenant/SEO/security: PASS, 0 blockers, 0 warnings
overall/release decision: pass_with_notes
wrong public domain/email occurrences in final evidence: 0/0
```

Final code verification:

```text
Node go-live reviewer tests: 14/14
focused unit tests: 26/26
focused component tests: 14/14
site-domain integration tests: 6/6
TypeScript: PASS
targeted ESLint: 0 errors, 51 pre-existing warnings
```

Grok `botstack-grok-4.5` completed a read-only adversarial review and initially
classified the legacy support email as non-blocking. The leader rejected that
classification after direct JSON and PostgreSQL evidence showed
`hello@wingsside.vn` repeated in public page bodies. The accepted RC is the
subsequent build after the scoped contact/link identity migration and its
apply/rollback/re-apply proof.

`pass_with_notes` is not production deployment approval. Remaining notes are
empty alt text on decorative/brand images that have adjacent visible brand
text. WP5 deploy and VPS post-deploy audit remain separate approval gates.
