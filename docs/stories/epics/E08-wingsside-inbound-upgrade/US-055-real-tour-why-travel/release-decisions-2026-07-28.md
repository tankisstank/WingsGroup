# US-055 release decisions — 2026-07-28

## Decision authority

- Decision date: 2026-07-28
- Decision maker: project owner through the active Codex session
- Final instruction: `Hãy chấp nhận yêu cầu của tôi với D4-C (loại bỏ watermark). D6-C`
- Status: accepted as the governing product-owner direction for the remaining
  US-055 delivery work

This record supersedes the earlier recommended decision package wherever the
project owner's selected option differs from that recommendation.

## Accepted package

| ID | Accepted option | Governing direction |
| --- | --- | --- |
| `D1-A` | Preserve all pricing disclosures | Keep every governed pricing-disclosure row and author the required localized wording instead of deleting or silently collapsing it. |
| `D2-A` | Rewrite all 22 English tours | Complete governed WingSide English rewrites across the exact 22-tour inventory before release. |
| `D3-A` | Accept current Sa Pa facts | The project owner accepts the currently documented Sa Pa/Lào Cai destination, route order and trekking facts. |
| `D4-C` | Retain source media and remove watermarks | Use the currently selected source-media set and perform watermark removal, followed by the required media inventory and visual/OCR verification. |
| `D5-A` | Release all five locales together | Release EN, VI, IT, ES and PT together; do not use an implicit EN fallback as a substitute for missing localized inventory. |
| `D6-C` | Development-team approval | The development team may approve the catalog and media release artifacts. This replaces `D6-A`; a separate Product/Content plus Release Owner approval pair is not required by the project owner. |
| `D7-A` | Canary promotion | Use production-like rehearsal, canary verification and controlled promotion rather than an immediate full-traffic switch. |

## Delivery consequences

- `D1-A` selects the disposition strategy; the exact 38-row EN/VI/IT/ES/PT
  wording still has to be authored, checksum-bound and included in catalog-v2.
- `D2-A` is an implementation requirement, not approval of an English
  candidate that has not yet been produced.
- `D3-A` closes the external Product/Content decision gate for the current
  Sa Pa/Lào Cai route and trekking facts. Later factual changes require a new
  decision.
- `D4-C` replaces the prior requirement to source a different watermark-free
  media set. Watermark removal, exact media inventory, generated output hashes,
  OCR/frame checks and visual review remain executable delivery work.
- `D6-C` changes the approval model expected by the existing fail-closed
  catalog/media tooling. The release policy and implementation must be updated
  explicitly and tested; the decision must not be implemented by bypassing or
  fabricating an existing signature check.
- `D7-A` does not itself authorize a production data write or deployment. A
  separate explicit go-live instruction remains required after the rehearsal
  and canary package is ready.

## Current release status

Production remains on **HOLD**. This decision record resolves the choice of
direction, but it does not claim that the 38 disclosure texts, 22 English
rewrites, watermark-removal outputs, catalog-v2 reconciliation, approval-policy
change, Payload adapter, PostgreSQL rehearsal, five-locale browser matrix or
canary evidence have been completed.
