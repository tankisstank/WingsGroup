# US-061 Nền tảng contract, media và fidelity WingsGroup v3

## Trạng thái

Accepted engineering; Chờ xác nhận quyền công bố production.

## Lane

high-risk

## Product Contract

WingsGroup v3 có một fidelity contract thực thi được cho runtime public, một
media manifest có provenance/checksum, và các luật fail-closed cho proof,
consultation, legal identity và publication. Contract kỹ thuật không tự cấp
quyền xuất bản.

## Relevant Product Docs

- `docs/product/wingsgroup-v3-fidelity-contract.json`
- `docs/product/wingsgroup-v3-media-manifest.json`
- `docs/product/wingsgroup-v3-release-gates.json`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`

## Acceptance Criteria

- Contract runtime chốt thứ tự `hero → ecosystem → trust → proof → editorial → contact` và lưu service-router chỉ như nguồn lưu trữ đã bị loại khỏi runtime.
- Header, hero secondary CTA và consultation FAB cùng đi qua specialist-consultation dialog; không mở external URL khi channel chưa được duyệt.
- Manifest quản lý đúng 13 asset với checksum, kích thước runtime, focal metadata, bilingual alt, provenance và trạng thái `pending-production`.
- Proof archive, trust claims, media và ecosystem links giữ trạng thái pending/fallback cho tới khi đủ source, context/date, rights và owner approval.
- Import local có transaction/rollback, cleanup chỉ theo file do run sở hữu, tenant guard và idempotence; không dùng SQLite local như proof PostgreSQL hoặc production.
- Viewport matrix và reduced-motion behavior của contract được ghi lại làm bằng chứng kỹ thuật, không được diễn giải thành human publication approval.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | E09-00-11 final re-review: 2 files, 18 tests passed. |
| Integration | E09-00-11 final re-review: foundation integration 7 tests passed. |
| Platform | Archived handoff runtime khớp sáu section và ba dialog triggers; 13 media record governed và pending. |
| Release | `node scripts/wingsgroup-v3-release-gates.mjs --json` validates the governed register; editorial-media remains approved while production import, responsive-derivative verification and runtime publication remain separate fail-closed gates. |

## Evidence

- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-00-11-rereview-2.json` — reviewed SHA `547ab08a6b0bea30664ece2d5537d7a86833d1b1`, recommendation `accept`.
- `docs/product/wingsgroup-v3-fidelity-contract.json`
- `docs/product/wingsgroup-v3-media-manifest.json`
- `docs/product/wingsgroup-v3-release-gates.json`

## Pending Gates

Production publication approval for editorial media/proof, consultation
owner/SLA/tracking và ecosystem destinations; source privacy/consent contract đã
được stakeholder duyệt ngày `2026-08-24`, nhưng runtime policy/consent proof vẫn
là release work riêng. WP-REL-14 replaces the prior placeholder interpretation
with six concrete Payload-managed sizes (640/960/1440 in WebP/AVIF), flat
filenames compatible with `/file/:filename`, a forward-only PostgreSQL
migration, physical-file and ledger SHA checks, and a separate operation-bound
second-confirmation `production-publish` phase. No production import, runtime
publication or cutover approval has been performed. Disposable PostgreSQL
rehearsal and Harness DB remain environment gates.
