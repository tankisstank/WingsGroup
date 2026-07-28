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

## Verification

Passed on the integrated branch:

- Unit: 60 files, 428 tests.
- Component: 14 files, 74 tests.
- Focused post-review safety suite: 3 files, 34 tests.
- TypeScript: `pnpm exec tsc --noEmit`.
- ESLint on all touched audit paths.
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
- A separate read-only Codex reviewer completed the review and found the two
  release-blocking gaps described above. Both code paths were corrected:
  source-brand projection is guarded, and pricing-disclosure loss is fail-closed.

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
