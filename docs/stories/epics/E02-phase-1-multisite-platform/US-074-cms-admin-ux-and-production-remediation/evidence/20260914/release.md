# Release gate and validation summary

## Production post-deploy verification — 2026-09-14

The subsequent application-only fix release was deployed and verified after
the candidate evidence below was recorded. It contains the production-safe
RichText email protection fix and does not include a database migration or
account operation.

- Release target: `/home/ubuntu/wings-travel/releases/wingsgroup-audit-fix-email-text-20260914T085655Z`.
- Release archive SHA-256:
  `825f58e21659152ed2344b83df349ee5e5897ba88ecfc7cb37ce8b324e8cc7bc`.
- Running app image: `sha256:1d2775ac4351dc330fa77f2bae1832a3e6defcdae6074f999e9c96fc137364b8`.
- Rollback image retained as
  `wingstravel-app:rollback-before-wingsgroup-audit-fix-email-text-20260914T085655Z`.
- `/api/health/live` and `/api/health/ready` returned HTTP 200 after cutover.
- `https://wingside.vn/` and `https://wingsgroup.vn/` returned HTTP 200.
- `wingside.vn` homepage go-live review passed on desktop and mobile with no
  page or site-level findings; see [production go-live report](../../../../../../../app/output/go-live-review/prod-email-text-wingside-home/review-report.md).
- Production `og:image` checks passed for all six public sites; the corrected
  WingSide URL is `https://wingside.vn/` (not `wingsside.vn`).
- PostgreSQL and Redis container identities were unchanged through verification.
- The local and production `RichText/index.tsx` checksums matched:
  `36fae3a8feec7b4b1981bf23ef9c7e44bbc782cc599380ea85b90670ae9977b5`.

This post-deploy proof does not close US-074: the authenticated admin E2E,
Safari/iOS, and remaining full platform acceptance gates remain open.

## Validation state of candidate

From `app/`:

- `pnpm exec tsc --noEmit` — pass.
- `pnpm test:unit` — **134 files, 992 tests passed**, including the package
  compatibility contract and Page Wizard locale route contract.
- `pnpm test:component` — **26 files, 145 tests passed**, including Console task
  state and Site Review checklist behavior.
- `pnpm test:int` — exit 0; 33 integration files passed, 173 tests passed; 6 files /
  10 tests skipped by existing suite conditions.
- `pnpm lint` — exit 0, 0 errors, 240 warnings (existing `any`, unused-variable
  and image/accessibility warnings remain).
- `pnpm build` — pass on Next.js `16.2.6`; compile, TypeScript, static generation,
  route manifest and standalone postbuild completed. This is a local candidate
  build only; it is not a Production deployment.
- `pnpm generate:types` and `pnpm generate:importmap` — pass.
- Focused applied-package/Wizard contract — 2 files, 6 tests passed; covers
  fallback-first tokens, OKLCH feature detection, cross-platform font stacks,
  WCAG 4.5:1 foreground ratios, React/SCSS landmarks, locale validation and
  draft-only creation.
- PostgreSQL migration and upgrade smoke — pass; see [migration](./migration.md).
- Browser geometry/preview manual proof — pass for measured local candidate; see
  [responsive](./responsive.json) and [preview matrix](./preview-matrix.md).
- Production CMS entrypoint preflight — anonymous `https://wingsgroup.vn/admin`
  reaches the login shell after the expected `payload-lng=vi` bootstrap redirect;
  the latest 360px and 1440px checks had equal body/client scroll widths and no
  visible alert. This confirms URL/path behavior only and does not inspect
  authenticated CMS data, the local candidate, or deployment configuration.
- Focused remediation regression — 6 files, 19 tests passed; covers WingsGo
  `vi→en`, WingSide `en→it`, CMS-only locale deny, site context, title fallback,
  accessible locale error state and Site Review pagination through 1,001 records.
- Focused admin E2E safety contract — 1 file, 5 tests passed; the no-fixture
  admin suite ran with **19 skipped** before setup. It reads only a
  pre-provisioned fixture and cannot create/delete/reset Users/Roles.
- Harness story update — pass; US-074 remains `in_progress` with unit/integration
  proof set to 1 and authenticated E2E/platform proof still 0.
- Scoped Plane workitem sync with `PLANE_STORY_IDS=US-074` — pass, `patchedCount:
  7`, `missingCount: 0`. API verification found US-074 under E02 with six
  meaningful child names, valid start/target dates, and no child matching the
  generic `Tiêu chí chấp nhận <number>` pattern. Plane is explicitly pinned to
  `Chờ xác nhận` with `Partial proof`; this is not `Đã bàn giao` or `Hoàn tất`.
- Read-only Plane API verification after sync — pass: project `Nền tảng lõi
  WingsGroup`, `story:US-074`, state `Chờ xác nhận`, six children, dates
  `2026-09-12`–`2026-09-17`, and zero invalid generic child names.

Screenshots:

- [360px](../../../../../../../app/output/playwright/us074-admin-360-final.png)
- [768px](../../../../../../../app/output/playwright/us074-admin-768-final.png)
- [1440px](../../../../../../../app/output/playwright/us074-admin-1440-final.png)
- [Production login 360px](../../../../../../../app/output/playwright/us074-production-admin-360-login.png)
- [Production login 1440px](../../../../../../../app/output/playwright/us074-production-admin-1440-login-after-wait.png)
- [Latest Production gate login 360px](../../../../../../../app/output/playwright/us074-production-admin-gate-360-login.png)
- [Latest Production gate login 1440px](../../../../../../../app/output/playwright/us074-production-admin-gate-1440-login.png)

Implementation review: [review.md](./review.md). Review kết luận candidate chưa
đủ điều kiện release/canary; chưa có deployment Production.

## Not a release sign-off yet

- Authenticated admin E2E is not accepted yet. The old preparation path became
  stuck at `test:e2e:prepare-db` and was not retried against an unknown database
  lifecycle. The suite is now guarded by a pre-provisioned fixture contract:
  without `US074_E2E_PREPROVISIONED=true` it skips before setup; safety unit
  contract is **5/5 pass** and the no-fixture suite is **19 skipped**. This proves
  no account lifecycle is attempted and Production hostnames are rejected, but
  this does not replace authenticated staging coverage.
- No Safari/iOS or real production child-domain preview proof.
- No authenticated production CMS Site record/allowlist/proxy configuration
  read or write proof; the anonymous entrypoint check is documented above.
- No production backup, canary, after-state or rollback drill.
- No Production deploy was performed in this remediation pass; the production
  browser artifacts are anonymous login-shell smoke only.
- The applied UI package is integrated selectively into React/SCSS. The static
  Vanilla DOM prototype and mock-only dialogs are intentionally excluded from
  runtime; native Payload behavior remains authoritative for CRUD, permissions,
  locale persistence and publishing.
- Lead status vocabulary remains an owner decision.
- No account action was performed or is required by US-074.

The unscoped Plane sync was stopped by an unrelated existing item whose start
date exceeded its target date after repeated API rate-limit retries. The scoped
US-074 sync completed successfully; no manual correction was made to that
unrelated date.

US-074 therefore remains `in_progress`, not `implemented`/Delivered.

Detailed remediation evidence: [remediation-run.md](./remediation-run.md).
