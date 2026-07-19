# US-046 Validation

## Proof Strategy

Targeted proof protects each boundary first. The story remains incomplete until
the full validation ladder, 22 production URLs and controlled production release
all pass. Local implementation proof must not be used to imply production success.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | capability separation, contact state/URL, locale fallback, route/gallery mapping, cleanup integrity/drift/no-op/null semantics |
| Integration | host/site scope, same slug cross-site, draft/access/wrapper gates, SQLite/PostgreSQL JSON parity and PostgreSQL rollback |
| Component | hero, gallery, itinerary, services, related pages, CTA, empty/technical/retail-copy suppression |
| E2E | four named tours, desktop/mobile, keyboard/console/images/CTA, all 22 URLs, WingsGo schedule/market/detail and WingsPlus no-tour regression |
| Platform | canonical/breadcrumb/metadata/schema, encrypted backup/checksum, cleanup dry-run/apply/rollback report, health/live/ready |
| Performance | priority hero, lazy gallery, no overflow at 320/375/768/1280/1440 |
| Logs/Audit | no duplicates, immutable provenance, release/symlink and screenshot evidence |

## Fixtures

- Imported batch `wingsside-bestprice-22-20260717` and its 22-product report.
- Isolated local SQLite and PostgreSQL 16 adapter fixtures.
- Local mobile tour fixture deleted after browser verification.
- Production data is not a test fixture and is only touched after backup/gates.

## Commands

```powershell
cd app
pnpm exec tsc --noEmit
pnpm run lint
pnpm run test:unit
pnpm run test:component
pnpm run test:int
pnpm run test:e2e
pnpm run build
pnpm run cleanup:tours:bestprice22 -- --dry-run --output <report>
```

## Acceptance Evidence

Completed locally through 2026-07-19:

- Targeted implementation suites, typecheck and optimized build passed before
  Phase 3 approval.
- Cleanup unit proof passed 15/15; targeted lint has zero errors with 12 existing
  importer `no-explicit-any` warnings.
- Isolated SQLite adapter proof passed 2/2. Two new-schema retries encountered the
  documented Payload/libsql `SQLITE_BUSY`; the pre-provisioned isolated DB passed.
- Isolated PostgreSQL 16 adapter proof passed 2/2 with explicit `db-postgres`
  assertion, injected rollback and pre-commit drift rollback. Teardown verified
  fixture Page/Product/Site counts `0/0/0`, removed the container/volume and cleared
  the loopback port.
- Mobile browser proof passed at IT 320px and PT 375px with localized CTA URLs,
  zero overflow, clean console and footer safe padding.
- Corrective release-candidate ladder passed from clean commit `05055019` without
  reusing production data:
  - `pnpm exec tsc --noEmit`: PASS in 10.4 seconds.
  - `pnpm run lint`: PASS in 130.2 seconds with 0 errors and 134 pre-existing warnings.
  - `pnpm run test:unit`: PASS, 28 files and 193/193 tests in 54.1 seconds.
  - `pnpm run test:component`: PASS, 7 files and 24/24 tests in 18.9 seconds.
  - `pnpm run test:int`: PASS, 21 files plus 2 skipped; 108 tests passed and 3
    intentionally skipped in 46.5 seconds.
  - `pnpm run test:e2e`: PASS, 75/75 on an isolated PostgreSQL database in
    1,366.2 seconds (Playwright 19.7 minutes). The final report SHA-256 is
    `71BD4944930F54F92DD9867B1FE016C081B3F545F4724B039966800D7169C5F9` and
    `.last-run.json` SHA-256 is
    `91D1C43004802CD49950D78EB11C8FA7D05DA8FFFFE219A8B13B2F561BC00903`.
  - `pnpm run build`: PASS in 258.2 seconds; compilation took 64 seconds,
    TypeScript took 107 seconds, 16/16 static pages generated and standalone
    assets were prepared.
- One earlier full run passed 74/75 and saw a transient development-server 500
  only on `/wingsside/plan-your-trip`; an exact fresh-database targeted rerun
  passed 1/1, and the subsequent full run passed 75/75. An earlier 15-minute
  outer timeout was invalid because the established full suite takes longer;
  neither event is treated as product proof or hidden from the evidence trail.
- The first controlled production release completed the encrypted backup,
  22-record cleanup dry-run/apply, deployment, live/ready checks, four named tour
  checks, 22/22 URL smoke and duplicate audit. The tour-detail/data gates passed.
- Production acceptance was stopped because the custom WingSide theme did not
  carry the hi-fi site marker, leaving Specials unstyled and full-width on Home.
  Corrective commits `61a64c1`, `37bd1eb` and `05055019` passed the full ladder;
  approved 768/1280/1440 screenshots show the fixed 268px widget 19-23px below
  the site header/banner with no header or active-hero overlap.
- The corrective release-candidate worktree was clean after the full suite and
  build. No E2E container remained.

Final adaptive release evidence:

- Commit `a083127` passed TypeScript in 65.7 seconds; lint in 127.4 seconds;
  unit 28 files/193 tests; component 7 files/24 tests; integration 21 files plus
  2 skipped with 108 passed/3 skipped; full isolated PostgreSQL E2E 75/75; and
  optimized build in 157.2 seconds with 16/16 static pages. Remote Docker build
  also passed and produced image digest
  `sha256:38b16e8749d714d91be83ff777129b1c5d818350bda7c5d7b3e506a69837f2c2`.
- Exact-source archive SHA-256 matches locally and remotely:
  `708fb9abc65f1677123b5710a6bb10c425ce7da963ec7cf696f44e066e595f7a`.
  Production serves `us046-adaptive-a083127-20260719T121049Z`; public live and
  ready endpoints both return 200. Cleanup was not re-applied.
- Home agent-browser proof passed at 768, 1024, 1280 and 1440 pixels; mobile 767
  hides the promo. CTA keyboard navigation reaches `/packages`; session dismiss
  survives refresh and resets in a new session; reduced motion disables hover
  transition/transform. All checked views have zero broken image, overflow and
  browser page errors.
- Public SSR smoke passed 22/22 tour URLs. The required four tours passed real
  browser QA at 1280 and 375 pixels with three exact contextual `/contact-us`
  links, contact state, canonical URL, no Offer schema, no departure table, no
  technical/retail copy, no broken image/missing alt/overflow/page error.
- WingsGo tour detail, departure schedule and `/thi-truong/han-quoc` passed with
  no WingSide leakage. WingsPlus correctly returns no tour detail for the same
  WingsGo slug. An initial `/thi-truong/korea` probe correctly returned 404 and
  was replaced with the database-backed valid market path.
- Final production database verification ran in a read-only transaction: 22
  published batch products, 22 distinct same-site published wrappers, zero
  future departure, zero duplicate product code/slug/page path/media filename,
  714 distinct referenced media and zero technical importer sentence. There are
  no related-page relations in the live 22-wrapper dataset; omission of the
  empty block is expected, while positive rendering is covered by automated
  component/E2E fixtures.
- The complete production checksum manifest is preserved with SHA-256
  `95f87379b559a3f3f9e121b7bcc45bbae6c0b24987148812d707f32520427d1a`.
  Two PowerShell-driven agent-browser loops for all 22 URLs stalled at the local
  runner layer without product or data mutation; deterministic 22/22 HTTP proof
  plus browser proof for the four named tours provides the final coverage.
