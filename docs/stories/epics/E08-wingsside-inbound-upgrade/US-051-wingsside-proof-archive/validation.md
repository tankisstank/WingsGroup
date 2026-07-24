# Validation

## Proof Strategy

Proof must show that the public archive is CMS-backed, suppresses unsupported or
unverified rows, has accessible non-autoplay interactions, and preserves exact
fixed frame heights at required breakpoints.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Pure mapper: 24 CMS rows -> 21 public records; unsupported/unverified/missing-image suppression; neutral missing-field text; generated image alt. CSS contract: desktop/mobile fixed heights, exact rows, contained images, obsolete selectors removed. |
| Component | Filters with `aria-pressed`; stable active ID; previous/next wrapping; arrow keyboard behavior and guards; dialog open/Close/backdrop/focus return; accessible names; no timer/autoplay. |
| Integration | Payload block remains registered; Media relationship exists; authoring choices restricted to `cert`/`award`; deprecated autoplay fields hidden. |
| E2E | Focused WingsSide home Proof Archive at 360, 390, 430, 600, 768, 820, 1024, 1366, 1440, 1920. Activate all 21 records and verify exact height before/after image settle, no horizontal overflow, `object-fit: contain`. |
| Platform | Windows PowerShell commands only; no port 3000. |
| Performance | No autoplay interval or timer; images use existing CMS Media pipeline. |
| Logs/Audit | No runtime log contract change. |

## Fixtures

- CMS credentials manifest: 24 photographed WingsSide records with 21 verified
  public records.
- Component fixture records for appointment/award filtering and suppression
  paths.
- Required breakpoints: `360, 390, 430, 600, 768, 820, 1024, 1366, 1440, 1920`.

## Commands

```text
scripts\harness.cmd query matrix
pnpm exec tsc --noEmit
pnpm run lint
pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsSideProofArchiveViewModel.unit.spec.ts tests/unit/wingsSideProofArchiveCss.unit.spec.ts tests/unit/wingsSideHiFiPublicCopy.unit.spec.ts tests/unit/wingsSideCredentials.unit.spec.ts
pnpm exec vitest run --config ./vitest.component.config.mts tests/component/credentialsCarousel.component.spec.tsx
pnpm run test:int -- tests/int/credentialsCarousel.int.spec.ts
pnpm exec playwright test tests/e2e/wingsside-proof-archive.e2e.spec.ts --config ./playwright.config.ts --project=chromium
```

## Acceptance Evidence

- Harness intake `#104`, story `US-051`, and trace `#225` were recorded in the
  durable release Harness database. The story remains `in_progress` because
  real rendered CMS browser QA is still open.
- `pnpm exec tsc --noEmit` PASS.
- `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsSideProofArchiveViewModel.unit.spec.ts tests/unit/wingsSideProofArchiveCss.unit.spec.ts tests/unit/wingsSideHiFiPublicCopy.unit.spec.ts tests/unit/wingsSideCredentials.unit.spec.ts` PASS: 4 files, 14 tests.
- `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsSideProofArchiveCss.unit.spec.ts` PASS after border-box correction: 1 file, 3 tests.
- `pnpm exec vitest run --config ./vitest.component.config.mts tests/component/credentialsCarousel.component.spec.tsx` PASS: 1 file, 7 tests.
- `pnpm run test:int -- tests/int/credentialsCarousel.int.spec.ts` PASS: 1 file, 2 tests.
- `pnpm run lint` PASS with existing warnings, 0 errors.
- `pnpm run build` PASS using Next.js 16.2.6.
- `pnpm exec eslint src/components/WingsSideHiFi/CredentialsCarousel.tsx tests/component/credentialsCarousel.component.spec.tsx` PASS after Escape-close handler update.
- `PLAYWRIGHT_DISABLE_WEB_SERVER=true pnpm exec playwright test tests/e2e/wingsside-proof-archive.e2e.spec.ts --config ./playwright.config.ts --project=chromium` PASS: 1 focused CSS/interaction proof fixture, no app server started.
- Root adversarial audit found and fixed two integration/accessibility issues:
  locale props are now passed only to the credentials block, and
  `aria-live="polite"` is scoped to the active copy pane instead of the whole
  interactive proof stage.
- Archived local CMS data was inspected read-only before QA: five localized
  credentials blocks contain 120 rows total (24 per locale), including the 21
  verified public records expected by the mapper.
- A temporary standalone build on port 3102 could read the local Payload
  database/API, but the WingsSide tenant page route returned HTTP 404. This is
  an environment/routing blocker; screenshots below are therefore explicitly
  controlled fixture evidence, not production or rendered-CMS screenshots.
- `pnpm run plane:preview` PASS and mapped US-051 to WingsSide / E08 with no
  acceptance-criteria child task names. `pnpm run plane:sync:workitems` was
  blocked by Plane HTTP 403 because Initiatives requires a paid plan.

Evidence artifacts:

- `evidence/us051-bounding-box-results.json`
- `evidence/us051-desktop-1440.png`
- `evidence/us051-mobile-390.png`
- `evidence/us051-dialog-390.png`

Bounding-box summary across all 21 records per breakpoint:

| Breakpoint | Expected | Immediate | After image settle | Max horizontal overflow | Object fit |
| --- | ---: | ---: | ---: | ---: | --- |
| 360 | 990 | 990 | 990 | 0 | contain |
| 390 | 990 | 990 | 990 | 0 | contain |
| 430 | 990 | 990 | 990 | 0 | contain |
| 600 | 990 | 990 | 990 | 0 | contain |
| 768 | 570 | 570 | 570 | 0 | contain |
| 820 | 570 | 570 | 570 | 0 | contain |
| 1024 | 570 | 570 | 570 | 0 | contain |
| 1366 | 570 | 570 | 570 | 0 | contain |
| 1440 | 570 | 570 | 570 | 0 | contain |
| 1920 | 570 | 570 | 570 | 0 | contain |

Note: the focused E2E uses the committed Proof Archive CSS selectors in a
controlled 21-record fixture so it can run without touching port 3000. CMS
mapping and renderer behavior are covered by the unit/component/integration
tests above. Real browser QA against the rendered CMS route remains required
before release approval.
