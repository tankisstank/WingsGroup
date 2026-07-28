# US-055 S3 execution report — run r3

## Run identity

- Run ID: `wingsside-us055-s3-20260728-r3`
- Mode: `resume`
- Scale: `S3`
- Integration base: `e9b19a2aa32573077e2a3994eed172d7b2b14e0f`
- Integrated HEAD before this report: `d3c76f0`
- Provider: native Codex workers and independent native Codex reviewers
- Production authority: not granted
- Final run status: **partial — production HOLD**

Three isolated work packages covered catalog reconciliation, D4-C media
disposition and disposable PostgreSQL rehearsal. Every package was reviewed
independently. The first catalog and rehearsal reviews returned `REJECT`; their
corrective commits were integrated only after re-review.

No worker pushed, merged, deployed, accessed production credentials or wrote
production data.

## Package results

### Catalog-v2 — accepted after corrective review

Integrated chain:

- `792e9ce` — governed catalog-v2 from the frozen source snapshot
- `cfecbb1` — validate the loaded overlay before rehearsal

Delivered and verified:

- exact `22` tours, `116` itinerary days and `331` stable service rows;
- exact `38` governed pricing dispositions with EN/VI/IT/ES/PT labels;
- source SQLite SHA-256
  `04b3c78cb8e38cfe476196a8faccdb95a3a55fef00042636fa596fc0703e1411`
  unchanged before and after read-only export;
- incomplete integration SQLite rejected without output;
- frozen source, candidate overlay, review, policy, signature and catalog-v2
  artifacts;
- Ed25519 rehearsal keys kept in memory only; committed signatures and policy
  are explicitly rehearsal-only.

The first independent review found a P1 integrity bypass: a VI disclosure label
could be changed while retaining the embedded candidate checksum, and the
rehearsal would still sign the substituted label. The corrective implementation
now requires a protected raw artifact SHA-256, recomputes the canonical
candidate checksum and validates the full schema, inventory, source row,
source label, bucket, locale and uniqueness bindings before consumption.

Corrective review verdict: `ACCEPT`.

- integrity attacks rejected: `10/10`;
- rejected attacks created output files: `0`;
- valid flow: `22 / 116 / 331 / 38 / 5`;
- unit: `70` files, `621` tests;
- TypeScript, focused ESLint, diff and private-key scans: pass.

The protected overlay checksum must still be supplied from trusted external
custody. The replay ledger remains caller-owned and rehearsal-only.

### D4-C media — accepted blocked package

Integrated commit:

- `98ec082` — seal deterministic D4-C visual dispositions

Delivered and independently verified:

- unique source hashes reviewed: `586/586`;
- contact sheets: `24/24`;
- visible watermark-positive: `191`;
- visually clean: `395`;
- uncertain: `0`;
- exact blocker entries: `191/191`;
- accepted processed outputs: `0`;
- rejected image-generation candidates: `3`;
- source mutation: `0`.

The three edit attempts for media IDs `5626`, `5698` and `6202` changed
protected people, scene detail and dimensions from `800x450` to `1672x941`.
They were rejected and retained only as adverse evidence.

Independent verdict: `ACCEPT_BLOCKED_PACKAGE`. The evidence is safe to
integrate, but it is explicitly **not** completion of D4-C. All 191 positive
assets still need faithful non-destructive replacements or edits, protected
rights evidence and signed independent visual review.

### Disposable PostgreSQL rehearsal — accepted blocked package

Integrated chain:

- `e5fc19f` — initial disposable PostgreSQL rehearsal
- `d3c76f0` — harden readiness, environment and full-content proofs

The first independent review rejected the package because PostgreSQL's
temporary initialization server could satisfy the readiness probe, the sealed
inventory compared only slugs, child processes inherited production-capable
environment variables, and a supplied catalog contract could be mistaken for
an executed lifecycle.

The corrective implementation now provides:

- final-server TCP readiness;
- immutable PostgreSQL image digest binding;
- child-environment allowlisting and explicit production-capability blanking;
- full frozen `22 / 116 / 331` identity and content checksums;
- the same full-content verification after restore;
- bounded cleanup attempts; and
- catalog lifecycle status that remains `pending` unless the phases actually
  execute.

One corrected full-content run passed. A later run failed honestly during
`pg_restore` with a Docker overlay2 I/O panic. At that point:

- drive `C:` had `0` bytes free;
- Docker Desktop/WSL could not write logs or recover normally;
- three consecutive corrected green runs were not available; and
- cleanup of exact container
  `wingsside-us055-rehearsal-962a748e11d2` could not be re-confirmed.

Independent verdict: `ACCEPT_BLOCKED_PACKAGE`. Static validation passed with
`8/8` focused tests, TypeScript, ESLint and diff checks. Operational acceptance
remains blocked until host space is recovered, Docker is healthy, exact cleanup
is confirmed and three consecutive green rehearsals complete.

## Combined leader verification

All commands used task-scoped `TEMP` and `TMP` on drive `E:` after the host
drive-space failure.

| Gate | Result |
| --- | --- |
| Focused integrated unit | Pass: 3 files, 23 tests |
| Full unit | Pass: 71 files, 631 tests |
| Component | Pass: 14 files, 74 tests |
| TypeScript | Pass |
| ESLint | Pass with 0 errors and 149 baseline warnings |
| Webpack production build | Pass |
| Full integration runner | Partial: all earlier files passed; one unchanged baseline Wings Care sitemap assertion failed |
| Five-locale browser gate | Reached application gate with Webpack and a disposable SQLite copy; failed at 22/110 tour URLs |

The integration failure expects the Vietnamese Wings Care route
`/claim-support`, while current unchanged behavior emits
`/vi/claim-support`. Neither the failing test nor `app/src` changed between
the r3 base and integrated HEAD.

The committed E2E server first failed under Turbopack because the worktree
`node_modules` symlink points outside the filesystem root. Running the same
gate through Webpack and a disposable copy of the checksum-bound source SQLite
database successfully reached the application without writing the source
database. It returned only the existing 22 EN tour URLs instead of the required
110 EN/VI/IT/ES/PT URLs. This is the expected fail-closed result while
catalog-v2 has not been applied to runtime data.

## Remaining release gates

US-055 and production remain on HOLD until:

1. host drive space is recovered and Docker/WSL health is restored;
2. the stuck rehearsal container is proved absent;
3. protected catalog checksum, signer and target values are provisioned
   outside source control;
4. catalog `plan → apply → verify → rollback → verify` completes on disposable
   PostgreSQL for three consecutive runs with backup/restore evidence;
5. the applied data exposes exactly `110` tour sitemap URLs and passes
   reciprocal EN/VI/IT/ES/PT detail-route metadata;
6. all `191` watermark-positive assets receive faithful accepted outputs or
   approved replacement media with rights evidence;
7. signed independent media review closes the D4-C gate;
8. an independent combined review returns `SHIP`; and
9. the project owner grants a new explicit production data-write and deployment
   approval for the named release artifacts.

No production write, deployment, canary or traffic switch was performed.
