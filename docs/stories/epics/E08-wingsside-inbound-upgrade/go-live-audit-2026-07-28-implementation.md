# WingSide Journeys + Sapa Tour Detail — implementation report

Date: 2026-07-28  
Release decision: **HOLD production**

## Canonical input

- Canonical audit:
  `wingside-journeys-tour-detail-review-2026-07-28.md`
- Source location:
  `C:\Users\VIETD\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\12ecfacb-505b-4c08-aa0c-eb417e22917e`
- SHA-256:
  `E1E37D4C2D22FD729EA04F99C4F1A8C97E7724A5C78C1C2CC3B896B9EE9AE6AB`

This report records implementation and verification. It does not replace the
canonical audit.

## Delivery status

| Gate | Implemented | Verified | Release status |
| --- | --- | --- | --- |
| P0-01 strict filter AND semantics | Destination, style and duration are combined with strict AND; automatic broadening was removed; a real zero-result state preserves the brief. | Unit/component tests and local browser QA with `sapa + business + 1-7` returned 0 and exposed Share brief, Remove style and View all actions. | Code complete. |
| P0-02 five-locale inventory | Exact 22 listing/detail validator, approval-gated PostgreSQL writer and plan/apply/verify/rollback contract exist. | Empty-to-head PostgreSQL CRUD smoke passed. An earlier disposable rehearsal applied 88 localized entries and rolled back exactly. The safety review then found 38 unlocalized pricing-disclosure rows; plan generation now fails closed instead of deleting them. Local snapshot still renders IT as 0. | **HOLD:** approve and author four-locale pricing disclosures, regenerate the plan, apply on a production-like clone and pass exact 22/22 inventory. |
| P0-03 source copy and media | Public discovery/related projections remove full sentences containing source-brand terms and fail closed when no safe title/summary remains. Consultative page chrome is authored for EN/VI/IT/ES/PT. | Regression tests cover discovery and related cards. Browser DOM contained no BestPrice text in the tested paths. | **HOLD:** all 22 EN bodies still need governed WingSide rewrites; shouting/SEO-import phrases remain in the source snapshot. Watermark-free approved media and provenance are not available. |
| P0-04 Sapa route/data | Stable route entities, day-specific meals and conservative public-copy normalization are implemented. | Unit/component tests and local Sapa detail QA passed. | **HOLD:** Product/Content must approve Sa Pa/Lào Cai destination, route order and trekking facts. |
| P0-05 enquiry contract | Native `required` semantics match labels; Country and travel-window labels are present; textarea starts clean; structured journey context is stored separately in a private field. | Unit/component/integration tests passed. Browser QA found `full-name`, `email` and `message` required, an empty textarea and no hidden technical metadata in the form. | Code complete; production-like submission smoke remains required. |
| P0-06 CTA contrast | Gold CTA uses dark foreground instead of white. | Component tests passed; local visual evidence captured. | Code complete. |
| P1 discovery UX | Soft filter navigation, pending/live count, active summary, search, sort, first 8 plus Load more, mobile clamping, stable anchors and wider desktop form. | 390×844 and 1440×900 browser evidence captured. | Code complete. |
| P1 content and related ranking | Native five-locale consultative chrome; CMS-configured relations stay authoritative; fallback ranks destination → market/region → style → duration → stable slug. | Unit and component tests passed, including IT/ES/PT chrome. | Code complete; trekking decision facts and trust proof remain external-data gates. |
| US-055 Why Travel | Four governed slots, stable importer-source mappings, deterministic resolution, explicit overrides and fail-closed invalid configuration. | Unit/component, migration smoke and real PostgreSQL EN/VI CRUD passed. | Code complete; curation apply/audit and five-locale browser matrix remain approval-gated. |

## Data-safety correction from independent review

The independent review identified that the editorial writer discarded rows
matching peak/high season, fuel surcharge or compulsory dinner while reconciling
service-list cardinality.

The writer now rejects plan generation with the row ID and label. On the
disposable PostgreSQL rehearsal it stopped at:

```text
Editorial shared service pricing disclosure requires approved localized
disposition for a-glimpse-of-central-vietnam-5-days row
6a681dae9a9ac05e215c661a: Peak season surcharge & compulsory dinner in the
accommodation.
```

This is intentional. Production data cannot be changed until the pricing
disclosures have approved destinations and translations. The previous v3 plan
remains rollback-capable, but must not be applied.

## S3 foundation implementation

The approved `S3` execution model was used with one integration leader and no
more than three concurrent workers. Every implementation package used an
isolated worktree from an immutable base, returned a structured JSON report,
and was independently checked before integration.

Wave 1 delivered three tooling foundations:

- locale catalog v2 and production plan v4 now use stable `sourceRowID`
  mappings, approval-bound pricing dispositions, four-locale governed labels,
  and a service-row ledger reconstructed from the before/after snapshots;
- governed English editorial tooling now provides exact-22 inventory checks,
  recursive copy lint, factual/service-row guards, and checksummed in-memory
  plan/apply/verify/rollback transitions; and
- media audit tooling now inventories all governed tour media locations,
  requires an exact 22-tour manifest, preserves every observation for reused
  media IDs, and fails closed on incomplete OCR/manual-review evidence.

The first independent review found four code-level false-pass or safety gaps.
The corrective S3 wave closed them:

1. empty or partial media inventories no longer pass;
2. adverse OCR/manual-review evidence on a reused media ID cannot be hidden by
   an earlier clean observation;
3. the row ledger is recomputed from the shared-service snapshots and bound
   into the plan aggregate checksums; and
4. production apply/rollback is blocked before Payload initialization unless
   plan, release, database, encrypted backup, restore drill, operator and
   rollback-release evidence all match trusted values. The guard is checked
   again immediately before the transaction runtime.

The production importer also now requires an explicit reviewed catalog-v2
artifact and lowercase SHA-256 for every phase. It hashes the actual file
before Payload initialization, parses and freezes the same verified bytes
without re-reading the path, rejects a CLI hash that conflicts with protected
release configuration, and checks the catalog approval snapshot against the
approved plan for non-plan phases.

Wave 2 then closed the remaining repository-side trust boundaries:

- the English editorial runtime now binds the exact 22-tour plan, config,
  manifest, release, source and database target. Apply, rollback and verify
  require a phase-locked capability plus fresh Ed25519 target proofs measured
  inside the same transaction after begin and immediately before commit or
  verify close. Raw mutation entry points are not exported, commit ambiguity is
  explicit, and the direct CLI fails closed until an application-owned Payload
  adapter and protected signing policy are supplied;
- catalog-v2 authoring now produces a review-only draft from an exact ordered
  22-tour/38-row governance manifest. Source, review and all four `vi`/`it`/
  `es`/`pt` locale artifacts are single-read, SHA-256 bound and frozen.
  Reconciliation requires protected approver policy, exact row decisions and a
  checksum of the complete candidate, including title, summary, metadata,
  itinerary and service summaries; and
- media evidence production now hashes bytes from a sealed local root and
  requires a protected release-policy artifact with purpose-separated Ed25519
  signers for rights, manual review, OCR/frame extraction and the release
  envelope. The only release gate consumes an authenticated, canonical,
  deeply-frozen result registered by the producer; report-only or structurally
  forged results cannot act as release authority.

Three independent corrective review rounds exercised guard injection,
self-authored trust policy, wrong-database verification, artifact substitution,
unsigned review/OCR evidence, structural result forgery and non-JSON checksum
evasion. Final verdict: no remaining P0 or P1 code false-pass in these Wave 2
boundaries.

Production remains on `HOLD`: the repository still does not contain the
customer-reviewed 38-disclosure/four-locale content, a genuine application-owned
Payload adapter and protected target-proof key material, approved signed media
assets/review/OCR evidence, or a production-like PostgreSQL rehearsal.

## Verification

Passed on the integrated branch:

- Unit after Wave 2 integration: 67 files, 597 tests.
- Component from the preceding integrated gate: 14 files, 74 tests.
- Independent review: all three Wave 2 workstreams reached zero remaining P0/P1
  findings after corrective re-review.
- TypeScript: `pnpm exec tsc --noEmit`.
- Full ESLint: 0 errors; 149 pre-existing warnings outside the Wave 2 paths.
- Production Webpack build: passed, including 17 static pages and all dynamic
  routes.
- Migration smoke through the enquiry-context migration.
- Real PostgreSQL migration and Payload CRUD for US-055 EN and VI.
- Browser QA: strict zero result, mobile/desktop Journeys, Sapa anchors, form
  semantics, clean textarea and related-tour ranking.

Known baseline issue, reproduced before these changes:

- The full integration suite has one existing
  `multisiteInventoryContract.int.spec.ts` sitemap expectation mismatch for the
  Wings Care VI prefixed route. It is not introduced by this audit branch.

External reviewer execution:

- Claude CLI could not authenticate because its OAuth session had expired.
- Grok CLI did not produce a transcript before timeout.
- A separate read-only Codex reviewer completed the S3 review and corrective
  re-review. The first pass found four P0 code gaps; the second pass reproduced
  the attacks against the corrected branch and found no remaining P0
  false-pass. Open P1/P2 items are recorded below as next-wave boundaries.

Open technical boundaries:

- English rewrite governance still needs a canonical versioned 22-tour
  manifest/config and guarded transactional Payload runtime.
- Media tooling verifies a normalized evidence manifest; actual byte hashing,
  OCR execution, provenance validation and authenticated manual review belong
  to the evidence-producing package.
- Approver authorization and the canonical media-manifest checksum must be
  supplied by trusted release configuration independent from the artifacts
  being approved.

## Browser evidence

- [Journeys desktop](evidence/go-live-audit-2026-07-28/journeys-desktop.png)
- [Strict zero result desktop](evidence/go-live-audit-2026-07-28/journeys-zero-result-desktop.png)
- [Strict zero result mobile](evidence/go-live-audit-2026-07-28/journeys-zero-result-mobile.png)
- [Sapa detail desktop](evidence/go-live-audit-2026-07-28/sapa-detail-desktop.png)
- [Sapa detail mobile](evidence/go-live-audit-2026-07-28/sapa-detail-mobile.png)

Local QA used a disposable clone of the SQLite development database. Missing
local media binaries produced blank placeholders in parts of the Sapa capture;
therefore these captures do not satisfy the watermark/provenance gate.

## Conditions to lift HOLD

1. Product/Content approves the disposition and EN/VI/IT/ES/PT wording for all
   peak-season, fuel-surcharge and compulsory-dinner disclosures.
2. Regenerate the PostgreSQL plan; prove no service row ID is lost; run
   apply → verify → rollback → verify on a production-like full clone.
3. Apply the approved localization plan and pass exact 22 listing plus 22 detail
   routes for every public locale with fallback disabled.
4. Complete governed EN rewrites for all 22 tours; content lint must reject
   vendor terms and shouting/SEO-import phrasing.
5. Replace all vendor-watermarked media with approved assets carrying
   ownership/license/provenance; run visual/OCR QA.
6. Approve Sa Pa/Lào Cai route, destination and trekking decision facts.
7. Provide verified trust proof and run production-like enquiry submission
   smoke.
8. Apply and audit US-055 home curation, then capture the five-locale
   Home → Tour Detail matrix.
9. Obtain explicit production deployment and data-write approval.

No production deployment or production data write was performed in this run.
