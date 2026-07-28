# US-055 S3 execution report — run r2

## Run identity

- Run ID: `wingsside-us055-s3-20260728-r2`
- Mode: `execute`
- Scale: `S3`
- Integration base: `84aa2c835b9afd6863556a424ff435e148865b13`
- Integrated HEAD: `43b96ee`
- Provider: native Codex workers and independent native Codex reviewers
- Production authority: not granted
- Final run status: **partial — production HOLD**

Three editing packages ran in isolated worktrees. The leader accepted only
immutable worker commits with validated JSON reports and independent review.
No worker pushed, merged, deployed, accessed production credentials or wrote
production data.

## Package results

### WP1 — governed content: accepted

Integrated worker chain:

- `0e63238f86cd984af63a28d491cf732a344c0664`
- `85ebb649ba3931df178216bfb538ab4c77d2b142`
- `7395328475519d3dff8372b78985b7c723e4bc3c`

Delivered:

- exact 22-tour English candidate overlay;
- exact 38 governed pricing-disclosure rows;
- EN/VI/IT/ES/PT wording for every disclosure;
- sealed governed-source-row snapshot;
- deterministic validator and ten adversarial probes; and
- editorial inventory/redline evidence.

Leader integration validation:

- English tours: `22/22`;
- pricing rows: `38/38`;
- locales per disclosure: `5/5`;
- content validator: pass;
- adversarial probes: `10/10` rejected;
- English artifact SHA-256:
  `d8e68f263b7cbf2fb7c1c95fd3cb57d16b3bafd6c265ec21c251238cefc864e4`;
- disclosure artifact SHA-256:
  `76c549ec8166124f2a4f33a9a113fda791ad812df1b14b9cff1680e683554f07`.

Independent review required two correction rounds. The final verdict was
`ACCEPT`, with `P0=0`, `P1=0` and one `P2`: raw file SHA-256 is sensitive to
Windows line-ending checkout behavior even though the four approved locale
files have zero Git diff. Catalog generation must therefore re-check the
approved raw bytes in the leader integration workspace and record the checkout
normalization contract before release.

The candidate artifacts are implemented but have not been reconciled into a
signed catalog-v2 or applied to a database.

### WP2 — D4-C media: accepted blocked package

Integrated worker chain:

- `d37e7e50582987a93677a3c81be37fd82454ada9`
- `8f2201f7f6c97a95f46a2c06a67fa72ff325ec9c`

Delivered:

- canonical inventory tooling with strict runtime schemas;
- realpath and per-component junction/symlink/reparse escape rejection;
- stable open-handle file identity and before/after checks;
- exact source manifest with all reused references preserved; and
- truthful blocker and corrective evidence.

Verified inventory:

- tours: `22`;
- references: `714`;
- media IDs: `714`;
- unique content hashes: `586`;
- missing or empty source files: `0`;
- source snapshot:
  `707a1acc8655663937c043143c24b062ee478d28d888ee029a2858da331fa446`;
- sealed inventory SHA-256:
  `7b1186411ae25f8a384c7157e6a989df4aeedca12b4e910853063524482d7e92`.

D4-C remains blocked:

- visible BestPrice Travel marks are confirmed on at least media IDs `5626`,
  `5698` and `6202`;
- RapidOCR missed the visible translucent mark on `5698`, so it cannot certify
  zero watermark findings;
- the image-generation edit attempted for `5626` changed the people, framing,
  detail and dimensions; the output was rejected and was not copied into the
  repository;
- accepted processed outputs: `0`; and
- protected rights, signed reviewer and authenticated OCR artifacts were not
  supplied.

Independent final verdict: `ACCEPT_BLOCKED_PACKAGE`, `P0=0`, `P1=0`, `P2=1`.
The P2 is that the local SQLite inventory command is not intrinsically
WAL-snapshot-safe. It must not be promoted into release evidence for a mutable
SQLite database; production rehearsal uses governed PostgreSQL.

### WP3 — D6-C runtime and Payload adapter: accepted

Integrated worker chain:

- `d9f21f6aed1886e515cfd8e47247dfaefe8ed570`
- `65e4274c779cc76c53e72200cd9a047e220ab1cd`
- `f561e8cf61e329f901e8de8c4b572f40c1d73446`

Delivered:

- named and versioned development-team approval policy;
- protected Ed25519 signer binding and audit fields;
- catalog preflight enforcement;
- application-owned Payload/PostgreSQL transaction adapter;
- same-transaction target proof and pre-commit recheck; and
- adversarial coverage for policy, signer, target, database, proof and
  dependency-injection attacks.

Independent review found three P1 issues across two correction rounds:

1. a publicly exported raw adapter/write path;
2. `PAYLOAD_DB_PUSH` verification after Payload initialization; and
3. caller-injected environment/initializer masking the real process
   environment.

All three were corrected. Final verdict: `ACCEPT`, `P0=0`, `P1=0`, `P2=1`.
The P2 is the outstanding production-like PostgreSQL/Payload rehearsal and
external protected key provisioning.

## Combined leader verification

Run after integrating all accepted commits:

| Gate | Result |
| --- | --- |
| Candidate content validator | Pass: 22 tours, 38 rows, five locales |
| Candidate adversarial validator | Pass: 10/10 substitutions rejected |
| Unit | Pass: 69 files, 614 tests |
| Component | Pass: 14 files, 74 tests |
| Focused integration | Pass: 3 files, 11 tests |
| TypeScript | Pass |
| ESLint | Pass with 0 errors and 149 pre-existing warnings |
| Webpack production build | Pass; 17 static pages and all dynamic routes |
| Git diff check | Pass |

The default Turbopack build panicked because the worktree `node_modules`
symlink resolves outside the filesystem root. The Webpack production builder
completed successfully; this is an environment/worktree limitation rather than
a compile or application error.

## Remaining gates

Production stays on HOLD until all of the following are complete:

1. D4-C produces accepted non-destructive outputs for every
   watermark-positive source asset and passes independent visual/OCR review.
2. Protected media rights/reviewer/OCR artifacts are provided.
3. The 22 English candidates and 38 five-locale disclosures are incorporated
   into a protected, signed catalog-v2 without approved-locale drift.
4. Development-team signer identities, protected catalog/media keys and target
   identity values are provisioned outside source control.
5. A production-like PostgreSQL clone and Redis are available.
6. Plan → apply → verify → rollback → verify passes with backup and restore
   evidence.
7. Exact 22 listing and 22 detail routes plus Home → Tour Detail pass for
   EN/VI/IT/ES/PT with fallback disabled.
8. An independent combined release review returns `SHIP`.
9. The project owner issues a new explicit production data-write and deployment
   approval for the named release SHA, plans, backup, rollback and canary scope.

No catalog reconciliation, production-like PostgreSQL apply, production write,
deployment, canary or traffic switch was performed in this run.
