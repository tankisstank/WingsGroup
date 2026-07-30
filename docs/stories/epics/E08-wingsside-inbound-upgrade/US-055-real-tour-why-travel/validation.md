# US-055 Validation

## Proof Strategy

Prove that each stable Why Travel role resolves to one real, published,
same-site, display-ready TourProduct in EN, VI, IT, ES and PT; allowed
editorial overrides remain explicit; and invalid configurations fail closed
without static product-like fallback.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Slot parsing, exact-key validation, manual/rule resolution, deterministic ordering, override merge and canonical URL projection. |
| Integration | Same-site/published/readiness filters, locale projection, duplicate handling, cross-site rejection, migration and idempotent backfill. |
| Component | Featured plus three supporting cards, real media/CTA output, override behavior, invalid state, markers and accessible labels. |
| E2E | Home Why Travel -> Tour Detail for four roles at 390px and 1440px in EN/VI/IT/ES/PT. |
| Platform | TypeScript, lint, build, PostgreSQL migration, DB/Redis health, tenant isolation and production HTTP checks. |
| Regression | US-050 Home 6/6/3, US-051 process board, US-052 proof archive and US-054 discovery behavior remain intact. |

## Fixtures

- Four approved published WingSide tours covering the initial role mappings.
- Manual and rule-based configurations with deterministic candidate order.
- Unpublished, cross-site and incomplete TourProducts proving fail-closed
  behavior.
- EN, VI, IT, ES and PT Page and TourProduct content.
- Explicit copy/media/CTA override cases and inherited-default cases.

## Commands

```text
pnpm run test:unit
pnpm run test:component
pnpm run test:int
pnpm run test:e2e
pnpm run validate:wingsside:locales
pnpm run build
```

Targeted component coverage and a real PostgreSQL migration/CRUD smoke now
exist. R4 closes the local five-locale Home → Tour Detail browser gate. The
production canary and media-remediation gates remain open.

## Acceptance Evidence

Implementation evidence:

- Payload schema exposes the four fixed roles, manual selection, governed rule
  selection, fallback, and localized presentation overrides.
- The approved mapping is stored by importer source ID so numeric local IDs are
  not treated as a production contract.
- The editorial catalog contains authored `vi`, `it`, `es`, and `pt` records
  for all 22 governed tours. An independent editorial redline removed
  customer-visible source-analysis language and corrected selected Italian,
  Spanish and Portuguese calques. On 2026-07-28, the project owner approved the
  complete checksum-bound four-locale content and the `pt-PT` audience profile.
  The exact hashes, approval scope and remaining release gates are recorded in
  `locale-editorial-review-2026-07-28.md`.
- The governed four-slot projection fails closed for invalid, unpublished,
  cross-site or non-display-ready candidates.
- `pnpm exec tsc --noEmit` passes.
- Full unit suite after Wave 2 integration: 67 files and 597 tests pass.
- Full component suite: 14 files and 74 tests pass.
- Empty-to-head PostgreSQL migration plus real Payload CRUD passed for EN and
  VI after correcting the localized version-column migration contract.
- Independent Wave 2 review reproduced guard injection, wrong-target
  verification, source/locale substitution, self-authorized approvals,
  unsigned media review/OCR evidence, structural release-result forgery and
  checksum-evasion attacks. Final re-review found no remaining P0/P1 code
  false-pass in the EN runtime, locale authoring or media evidence boundaries.
- Production editorial apply/rollback now requires the reviewed catalog-v2
  artifact and checksum plus plan, release, backup, restore-drill, database,
  operator and rollback-release evidence before Payload initialization.
- Catalog authoring now binds the exact 22-tour/38-row governance inventory and
  the complete bytes/content of all four locale artifacts to a protected review
  artifact and full-candidate checksum.
- The EN runtime requires signed transaction-bound target proofs and remains
  fail-closed until the application supplies a genuine Payload adapter and
  protected key material.
- The media release gate now requires a purpose-separated Ed25519 policy and an
  authenticated canonical result built from actual local asset/source/release
  bytes.

Release remains intentionally held until:

- the `D1-A` exact 38-row EN/VI/IT/ES/PT pricing-disclosure wording is
  authored and incorporated without losing or silently collapsing any governed
  service row;
- the `D2-A` governed English rewrites are complete for the exact 22-tour
  inventory;
- the approved four-locale artifact bytes are incorporated into the protected
  catalog-v2 review and reconciliation flow without checksum drift;
- the catalog and media approval policy is explicitly updated and tested for
  the project-owner-selected `D6-C` development-team approval model rather than
  bypassing the existing fail-closed signature contract;
- the genuine application-owned Payload adapter, protected target-proof key
  material and production-like rehearsal are completed for the governed
  22-tour English runtime;
- the `D4-C` source-media watermark-removal outputs, exact inventory, hashes,
  OCR/frame evidence and visual review are available;
- the approved PostgreSQL localization and Home curation plans are applied and
  audited;
- exact 22/22 inventory and Home → Tour Detail behavior pass for EN, VI, IT, ES
  and PT; and
- the `D7-A` canary package passes and production deployment/data-write
  approval is explicit.

The project owner accepted the current Sa Pa/Lào Cai route, destination and
trekking facts under `D3-A`; that external content decision is no longer a
release blocker. The complete accepted package is recorded in
`release-decisions-2026-07-28.md`.

## S3 execution update — run r2

The implementation and independent corrective review results are recorded in
`s3-execution-2026-07-28-r2.md`.

Completed and independently accepted:

- `D1-A`: exact 38-row five-locale pricing-disclosure candidate artifact;
- `D2-A`: exact 22-tour governed English candidate artifact;
- `D6-C`: named/versioned development-team approval policy and guarded
  application-owned Payload/PostgreSQL adapter;
- combined unit `69/614`, component `14/74`, focused integration `3/11`,
  TypeScript, lint with zero errors and Webpack production build.

Accepted as truthful blocker evidence, not as completed D4-C:

- exact 22-tour media inventory with 714 references, 714 media IDs, 586 unique
  hashes and zero missing source files;
- hardened junction/symlink/path and runtime-schema validation; and
- zero accepted watermark-removal outputs after the first image edit changed
  subject/framing and RapidOCR produced a known false negative.

At the end of run r2, production remained held because candidate content had
not yet been reconciled into catalog-v2 or applied to a database; D4-C media
outputs, protected signing material, PostgreSQL rehearsal, five-locale browser
evidence and explicit production approval were still missing. Run r3 below
supersedes the catalog-artifact and rehearsal-code portions of that status,
while the protected production lifecycle and release gates remain open.

## S3 execution update — run r3

The corrective execution and independent review record is
`s3-execution-2026-07-28-r3.md`.

Completed and independently accepted:

- protected catalog-v2 reconciliation for the exact `22 / 116 / 331 / 38 / 5`
  inventory;
- fail-closed validation that rejects `10/10` overlay-integrity attacks without
  producing outputs;
- deterministic D4-C disposition evidence for `586/586` source hashes; and
- hardened disposable PostgreSQL rehearsal code with final-server readiness,
  sanitized child environment and full-content backup/restore checks.

Combined integration validation passes `71/631` unit, `14/74` component,
TypeScript, lint with zero errors and the Webpack production build.

Operational release remains held:

- D4-C has `191` watermark-positive assets and `0` accepted edits;
- the five-locale E2E gate reaches the application but finds only `22/110`
  expected tour URLs because catalog-v2 is not applied to runtime data;
- `C:` has no free space and Docker/WSL cannot complete the required three
  consecutive PostgreSQL rehearsals or confirm cleanup of the last exact
  rehearsal container; and
- protected external release values and explicit production write/deploy
  authority remain absent.

## S3 execution update — run r4

The canonical record is `s3-execution-2026-07-29-r4.md`.

R4 preserves the exact governed inventory of 22 tours, 116 itinerary days, 331
service rows, 38 pricing-disclosure rows and five locales. The final
integration-bound disposable PostgreSQL lifecycle executes:

`plan → apply → verify-after → applied-state E2E → rollback → verify-before`

Final run `ce5a67620250` is bound to integration HEAD
`ef729d768e6d6f01049374f04f20491fb3ea0b76` and passes all 18 terminal checks.
It applies 88 localized rows and 22 shared rows, verifies 110/110 after apply,
runs exactly two Playwright specs, rolls back 88 + 22 rows and verifies 110/110
before state. The browser proof covers:

- 110 exact Tour Detail URLs for 22 tours across EN/VI/IT/ES/PT;
- four exact approved Why Travel role-to-slug mappings;
- 40 Home cases across five locales and 390px/1440px;
- correct locale path, HTTP 200 Tour Detail, `html[lang]`, canonical metadata
  and no horizontal overflow; and
- Playwright expected `2`, skipped `0`, unexpected `0`.

Durable terminal evidence is
`evidence/rehearsal/r4/r4-ce5a67620250.json` with SHA-256
`2151bcdaa470288b333e1390b73b42c0fe98f7ab27a98f74305450f32a622706`.
Its journal is
`evidence/rehearsal/r4/us055-rehearsal-ce5a67620250.journal.jsonl` with SHA-256
`eb3393ed189a256cf1630e8fd1fe098ad4d58391a04d5bcf7340a4eac93ac0e5`.
Home baseline and final checksums both equal
`5c284c9e16973b64b7ebb02fd9a57ade38ee0cb95b2d6942042b3bb99548fd42`;
the container and owned seed media are absent after cleanup.

The integration review returns local technical `ACCEPT`. This does not
authorize release. The superseding R4 media audit classifies 220
watermark-positive and 366 clean hashes, including 29 reclassified false
negatives; all four near-duplicate candidates were rejected and zero faithful
replacements were accepted. D4-C, rights/publication evidence, combined
`SHIP`, production approval and D7-A remain blocked. Overall status stays
in progress / HOLD.

## S3 production-gate update — run r5

The project owner granted production authority on 2026-07-29. The independent
combined WP6 review then reproduced the required adverse release attacks using
12 focused files / 145 tests, all passing, and verified the immutable R4
lifecycle evidence.

The release verdict is `HOLD` because three P0 gates remain:

- D4-C has 220 watermark-positive hashes and zero accepted replacements;
- protected ownership/license/publication evidence is absent; and
- the exact production-target backup, restore drill, signed apply/rollback
  package and protected target proof are absent.

An independent media review also passes 3 files / 31 tests and confirms 221
positive references across 21/22 tours, including five hero references. The
current candidate mapping is explicitly no-write. Excluding the positive
assets would break the accepted exact media contract and requires a new plan
and rehearsal.

Production preflight found the current live release at
`fadd22c68de26d0c1fdd281d77bac58b25f12625`; the candidate
`ef729d768e6d6f01049374f04f20491fb3ea0b76` is not published to `origin`, and
the required US-055 protected production bindings are not configured. D7-A
therefore stopped before every mutation. No production data, code, canary or
traffic change occurred.

## S3 production continuation — run r6

On 2026-07-29, the project owner accepted the current US-055 media set and
instructed the release to continue. The R5 media audit counts remain the
canonical asset-state evidence, but D4-C is no longer a mandatory
replacement/removal blocker for this release.

The remaining release blockers are production-safety and execution gates:
immutable release source, exact production backup, restore drill, signed
catalog/plan binding, rollback release binding, canary validation and live
post-release QA.

## S3 production continuation — run r7

After schema migration, production catalog planning was attempted against the
approved `catalog-v2.json` and failed because the current production English
source inventory no longer matches the approved source snapshot. The current
production source has `0/38` governed pricing-disclosure rows and `0/22` source
checksums matching the approved catalog. The approved source snapshot still
matches the catalog for `22/22` tours.

Validation consequence: D7-A cannot continue to data apply or canary promotion
until the exact 22-tour English source baseline is restored or a new catalog is
generated and approved under a revised D1 policy. The selected resolution is to
restore the approved source snapshot first, then rerun catalog plan/apply/verify.

## S3 production ship — run r8

On 2026-07-29, D7-A completed production promotion for release
`f39707afe28723dcfe10e78225222b7469e08a9d`.

Production data gates completed:

- schema migrations applied for `home_why_tour_slots`,
  `form_submissions.enquiry_context_*` and US-055 migration records;
- the 22-tour English source inventory was restored and verified at
  `22/22` approved source checksums;
- locale editorial apply/verify completed for 88 locale entries plus 22 shared
  service updates, with verify `checked=110,state=after`;
- English editorial overlay r13 applied text-governed EN fields for 22 tours,
  output `{"state":"after","unchanged":0,"updated":22}`;
- English editorial r13 verification returned `{"checked":22,"state":"after"}`.

Protected production evidence:

- release path: `/home/ubuntu/wings-travel/releases/wingsside-us055-f39707a`;
- rollback release: `/home/ubuntu/wings-travel/releases/wingsside-us054-fadd22c`;
- English source snapshot after locale apply:
  `/home/ubuntu/wings-travel/shared/artifacts/wingsside-us055/current-english-source-after-locale-apply-full.json`,
  SHA-256 `679055b0d4c4cc867168a78c4203afc2af110d78f4e29bfcfe149d60aa7a346e`;
- English r13 artifacts:
  config `d4ca171a7c738e8f7e0c5fa898955fbdf3fdecbbe0e62e90ff0363efb7e5aee3`,
  manifest `f0f6ff31f9ce7cf85c760c1104a41b7640935a1518ecbd3eaa3b673f2d4a1aa3`,
  plan `ddf85412a0eb55c978d180af22e765c702715906f95ed59a3314f51f40e5a2e6`;
- r13 backup alias:
  `/home/ubuntu/wings-travel/shared/backups/wingsside-us055-preenglishapply-r13-20260729T040211Z.dump.age`,
  backup SHA-256 `e06cc802c23b413ac8a1ca56ef8a49cdf0f4e06498c7fce593527789bfe66241`,
  manifest SHA-256 `4f5de9aa81594e3cc2548e3caef3219e18c957f3d8365a769e3b6dfc30e8b47d`,
  restore evidence SHA-256
  `8c8ff56b874d9bd05d30c13efa46955763fedfae822e4f342c5eafc742640514`.

Canary and production smoke passed on:

- `/`
- `/journeys`
- `/tour/a-glimpse-of-central-vietnam-5-days`
- `/vi/tour/a-glimpse-of-central-vietnam-5-days`
- `/it/tour/a-glimpse-of-central-vietnam-5-days`
- `/es/tour/a-glimpse-of-central-vietnam-5-days`
- `/pt/tour/a-glimpse-of-central-vietnam-5-days`

Production now has `current` pointing to
`/home/ubuntu/wings-travel/releases/wingsside-us055-f39707a`; the live app
container runs runner image
`sha256:c1024955a02cf48d26695e3ed44742c64dddc0686963290ad83ab491d39a5aa7`.
US-055 is production-shipped with the media acceptance decision recorded in R6.
