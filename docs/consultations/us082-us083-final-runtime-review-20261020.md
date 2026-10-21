## Verdict: HOLD pending final verification

No new P1/P2 product defect confirmed in the reviewed delta. One remaining P3 test-evidence gap needs correction. **Production GO is not established.**

### P3 — Alias attack test does not establish successful row writes

**Location:** [wingsGroupV3PreviewSeed.unit.spec.ts:298](E:/repo/WingsTravel/app/tests/unit/wingsGroupV3PreviewSeed.unit.spec.ts:298), assertions at line 304.

The test sends `CREATE TABLE …; INSERT …` through one Hrana `execute`, then checks HTTP 200. The current implementation executes only the first statement; SQL errors also return HTTP 200 with an error inside the response body.

**Concrete failure scenario:** The mutation step fails or never inserts its probe row, yet the test passes its mutation assertion and unchanged external sentinels.

**Independent reproduction:** Calling the actual memory store with the test’s SQL returned `type: "ok"`, but a subsequent count was **0**. A deliberately invalid SQL request returned **HTTP 200 / result type `"error"`**.

**Smallest fix:** Execute CREATE and INSERT separately, assert each protocol result succeeds, then SELECT and assert the exact `"memory-only"` value. Keep the existing external DB/media/WAL/SHM assertions. This assertion weakness predates the Windows adaptation; the hardlinks and junctions still preserve meaningful redirection semantics.

### Reviewed fixes

- **Form locale race:** [Component.tsx:542](E:/repo/WingsTravel/app/src/blocks/Form/Component.tsx:542) resets consent/error/config. Success checks `signal.aborted` after JSON parsing; catch checks it before writing state. Independent execution of the current effect passed both late-success and late-TypeError scenarios. The component tests also assert the EN privacy href. I did not rerun their DOM suite.
- **SQLite loader:** [localPreviewStore.ts:310](E:/repo/WingsTravel/app/src/utilities/localPreviewStore.ts:310) uses immutable source attachment and copies into memory. Independent checks covered quoted identifiers, BLOB/int64 values, generated columns, views, indexes, triggers, child-before-parent foreign keys, deleted autoincrement high-water marks, and rollback/detachment after virtual-table rejection.
- **Actual disk attachment:** Running the actual loader against the existing `clone-capability-probe.sqlite` left source bytes unchanged, created no WAL/SHM, and left only an in-memory `main` attached. SQLite documents immutable attachments as read-only; the closed/checkpointed-image requirement remains necessary. ([sqlite.org](https://www.sqlite.org/uri.html))
- **Virtual tables:** Explicitly rejected rather than silently partially copied. I found no virtual-table definition in the inspected Payload migrations/schema repair source. This is a loader limitation, not a demonstrated Payload regression.
- **Startup cleanup:** [localPreviewStore.ts:459](E:/repo/WingsTravel/app/src/utilities/localPreviewStore.ts:459) closes the database when loading fails.

### Runtime and browser evidence limits

The [native hook proof](E:/repo/WingsTravel/docs/reviews/us082-us083-20261020/live-payload-hook-proof.json:1) records PATCH/DELETE success, tenant2 eviction, tenant9 preservation, updated public pricing/promo, and disappearance after deletion. Current source invokes eviction from departure change/delete hooks. **These are synthetic Redis keys**; no public curation-cache writer was found. Raw SQL→HTTP proofs do not independently establish CMS hook execution. I inspected the artifacts but did not replay those mutations.

The [lead persistence proof](E:/repo/WingsTravel/docs/reviews/us082-us083-20261020/lead-post-persistence.json:1) records HTTP 202 and an EN PostgreSQL lead with consent version. The separate browser proof records **two submissions using one marker**; it supports persistence, without establishing idempotency. Browser acceptance and fixture rollback remain supplied evidence, not independently repeated observations here.

The previously identified environment-prefix wildcard at [hooks.ts:165](E:/repo/WingsTravel/app/src/collections/TourCurations/hooks.ts:165) remains conditional: environments sharing one Redis DB and site IDs can match each other. Tenant2/tenant9 isolation does not test environment isolation. US-081’s dirty migration files are not evidence of an undeployed migration.

### Checks performed

PowerShell/Node checks exited **0**:

- Current-source form-effect assertions — `2026-10-20T11:39:00Z`.
- Loader SQL/schema and rollback assertions — `11:38:23Z`.
- Actual immutable disk-loader check — `11:39:15Z`.
- Actual Hrana mutation/assertion-gap reproduction — `11:39:53Z`.

No repository files, fixtures, git state, or production were changed; no agents were spawned.

Not checked: final committed suites/build/package, independent browser replay, or live PostgreSQL/Redis replay. Release remains pending those gates and the P3 assertion fix.