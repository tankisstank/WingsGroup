# US-055 S3 execution report — run R4

## Decision

- Local technical verdict: **ACCEPT**.
- Overall story status: **in progress / HOLD**.
- Production authority: not granted.
- Production write, deployment, canary and traffic switch: not performed.
- Final integration HEAD:
  `ef729d768e6d6f01049374f04f20491fb3ea0b76`.

R4 closes the local catalog lifecycle, exact route matrix and governed Home
Why Travel → Tour Detail gaps left by R3. It does not complete D4-C and does
not convert local technical acceptance into release approval.

## Integrated implementation

The reviewed implementation chain includes:

- `42df808`, `56d0324`, `50c7a2c` — governed lifecycle, isolation and repeated
  baseline hardening;
- `9a8b569`, `bfab5fd`, `7b9b8fe` — exact-set media audit and sealed rejected
  candidates;
- `70d8583`, `1a0b5a1` — applied-state 110-route E2E and WingSide Host-bound
  readiness; and
- `54319d0` through `ef729d7` — governed Home seed, exact four role mappings,
  rollback proof, identity-safe local validation fixtures, exact two-spec
  report binding and evidence hardening.

No worker pushed, deployed, used production credentials or wrote production
data.

## Catalog and lifecycle result

The protected catalog is bound to:

- 22 tours;
- 116 itinerary days;
- 331 stable service rows;
- 38 pricing-disclosure rows; and
- EN, VI, IT, ES and PT.

Final integration run `ce5a67620250` executes:

`plan → apply → verify-after → applied-state E2E → rollback → verify-before`

It applies 88 localized plus 22 shared records, verifies 110 after apply,
rolls back the same 88 + 22 records, and verifies 110 before state. All 18
terminal checks pass. Home baseline and final checksums are both
`5c284c9e16973b64b7ebb02fd9a57ade38ee0cb95b2d6942042b3bb99548fd42`.
Frozen-source baseline and final checksums are both
`d2373c00d761e958498db7f6f79e896201f3651e6e5eb6659736e09b956a232b`.
The applied frozen-source checksum is
`d5ac0360443534739e94f9f0de048644e3b9bc6b35e5dec1eaee2ddb9b012497`.

Durable evidence:

- `evidence/rehearsal/r4/r4-ce5a67620250.json`;
- evidence SHA-256:
  `2151bcdaa470288b333e1390b73b42c0fe98f7ab27a98f74305450f32a622706`;
- `evidence/rehearsal/r4/us055-rehearsal-ce5a67620250.journal.jsonl`; and
- journal SHA-256:
  `eb3393ed189a256cf1630e8fd1fe098ad4d58391a04d5bcf7340a4eac93ac0e5`.

The journal binds the exact 40-hex integration HEAD. Payload closes cleanly;
the exact rehearsal container and owned selective-seed media are absent.

## Browser acceptance

The applied-state gate runs exactly two committed Playwright specs:

- route matrix: 110 exact public Tour Detail URLs / 22 tours / five locales;
- Home matrix: four roles × five locales × two widths = 40 cases.

Playwright reports expected `2`, skipped `0`, unexpected `0`. The final report
SHA-256 is
`437ee7eec1c47e00fb5e9721ccc88ca0c91ffa6d2c49256db7a7ef635531c76c`.
The route spec SHA-256 is
`b70803377369de9586fe782f00e81255d6d7c0cf77978c75a39eb724a356e525`;
the integration-worktree Home spec SHA-256 is
`c45edf88bdee8ee27af8d4825f9bd08832a700fa3007d8c61b8e67eb707df8c4`.

Exact approved mappings:

| Role | Tour slug |
| --- | --- |
| `local-design` | `best-of-northern-vietnam-hanoi-ninh-binh-sapa-halong-6-days` |
| `flexible-planning` | `northern-vietnam-highlights-for-family-6-days` |
| `style-matching` | `vietnam-luxury-wellness-retreat-escape-8-days` |
| `collaborative-care` | `highlights-of-vietnam-from-north-to-south-12-days` |

Every case binds the exact locale-aware path, eligible sitemap membership,
HTTP 200 Tour Detail, correct language/canonical metadata and no horizontal
overflow.

## D4-C media result

R4 supersedes, but does not rewrite, the R3 classification:

- 586 unique source hashes / 233,893,714 source bytes;
- R3 historical: 191 positive / 395 clean;
- 395/395 formerly clean hashes re-audited;
- 29 false negatives reclassified;
- R4: 220 watermark-positive / 366 clean;
- four near-duplicate candidates reviewed and rejected;
- zero faithful mappings, zero accepted replacements and zero source
  mutations.

The media package is accepted as an exact audit and empty no-write contract.
D4-C remains functionally incomplete for all 220 positive hashes. Rights,
licensing and publication approval are not proven.

## Verification and independent review

- Integration targeted unit: 7 files / 100 tests pass.
- TypeScript: pass.
- Scoped ESLint: zero errors; six pre-existing `no-explicit-any` warnings in
  `seed-subsites.ts`.
- Next.js production build with webpack: pass.
- Whitespace diff check: pass.
- PostgreSQL lifecycle: complete.
- Route matrix: 110/110.
- Home matrix: 40/40 cases.
- Rollback, Payload close and cleanup: pass.
- Independent exact-integration lifecycle review: `ACCEPT`.
- Independent exact-integration Home/media-boundary review: `ACCEPT`.

These reviewer verdicts cover the local technical package only.

Durable reviewer artifacts:

- `evidence/rehearsal/r4/final-integration-lifecycle-review-report.json`,
  SHA-256
  `6231d4067da097631014c44b773cf0c9711375206c0d87a9c34f11e4c64779ec`;
- `evidence/rehearsal/r4/final-integration-home-review-report.json`, SHA-256
  `ae491c10984908b0023246a891e6dd4c79d26a8328e8e8c0ac674f90e8cf4c5e`.

## Harness and Plane reconciliation

Harness records US-055 as `in_progress` with unit, integration, E2E and platform
proof present. Trace `#250` records the R4 outcome as `partial`; the matrix
returns `yes` in all four proof columns.

The scoped Plane reconciliation for `US-055` completed on 2026-07-29:

- preview: one story and six child work items;
- work-item sync: seven patched, zero missing;
- project: `WSIDE` / WingSide;
- parent Epic: `E08 - Nâng cấp inbound WingSide`;
- workflow state: `Chờ xác nhận`;
- parent dates: 2026-07-26 through 2026-07-31;
- owner and assignee are present and match the WingSide project lead;
- all six child items are parented to US-055, have scheduled dates and use
  descriptive names; zero child names match `Tiêu chí chấp nhận <number>`.

The desired proof value remains `Partial` in the repo manifest. The current
Plane plan does not expose work-item types/custom properties, so the importer
explicitly skipped writing the customer-facing `Proof Status` custom property.
Harness and this canonical report remain authoritative for the R4 proof
classification.

## Remaining release gates

Overall delivery stays **HOLD** until:

1. all 220 watermark-positive assets receive faithful accepted replacements
   or independently approved clean media;
2. ownership, license and publication evidence is accepted;
3. an independent combined WP6 review returns `SHIP`;
4. protected production values and signed release artifacts are ready;
5. the owner explicitly authorizes the named production write/deploy scope,
   release SHA, backup, rollback and canary;
6. D7-A canary health, tenant, locale, enquiry, media and rollback evidence
   passes; and
7. controlled promotion is separately approved.

R4 performed none of those production actions.
