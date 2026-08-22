# E09 - Trải nghiệm public WingsGroup v3

## Trạng thái

Accepted engineering; chờ xác nhận các cổng công bố và môi trường trước khi
production launch. E09 không phải là xác nhận go-live.

## Tài liệu sản phẩm

- `docs/product/wingsgroup-v3-fidelity-contract.json`
- `docs/product/wingsgroup-v3-media-manifest.json`
- `docs/product/wingsgroup-v3-release-gates.json`
- `docs/product/go-live-review-pipeline.md`
- `docs/product/multisite-platform.md`
- `docs/product/editorial-operations.md`

## Mục tiêu

Đưa trải nghiệm public WingsGroup v3, các route doanh nghiệp, contact intake,
media/proof governance và readiness evidence về một nguồn story có thể kiểm
toán. Các package engineering đã được review độc lập; tài liệu này giữ nguyên
ranh giới giữa bằng chứng kỹ thuật đã chấp nhận và quyền công bố production
chưa được cấp.

## Phạm vi story

| Story | Phạm vi | Tình trạng hiện tại |
| --- | --- | --- |
| US-061 | Contract nền tảng v3, media và fidelity | Accepted engineering; chờ cổng công bố |
| US-062 | Fidelity homepage và UX tư vấn responsive | Accepted engineering; chờ cổng công bố |
| US-063 | Publication, brand, proof và editorial gates | Accepted engineering; chờ quyền publication |
| US-064 | Consent lead-intake và consultation fallback | Accepted engineering; chờ privacy/endpoint approval |
| US-065 | Corporate routes, legal/locale và publication governance | Accepted engineering; English/legal còn fail-closed |
| US-066 | PostgreSQL, cross-tenant và go-live readiness | Accepted engineering; rehearsal/môi trường còn mở |

## Sổ bằng chứng đã chấp nhận

Các SHA dưới đây là `reviewed_head_sha` hoặc `reviewed_sha` trong report có sẵn;
không phải proof mới được tạo bởi story reconciliation này.

| Package | Report | SHA | Kết luận |
| --- | --- | --- | --- |
| E09-00-11 | `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-00-11-rereview-2.json` | `547ab08a6b0bea30664ece2d5537d7a86833d1b1` | Accepted: runtime fidelity, 13 media governed, transaction/rollback và tenant guard |
| E09-20 | `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-20-rereview-2.json` | `72a28cf6441f5b6269fe68d5e08e1c42beb0b20a` | Accepted: media boundary, responsive homepage, pending proof và preview contact |
| E09-30-31 | `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-30-31-rereview-3.json` | `ca7ccbae8ec2f5e5186e4a9ce81b4d8f134c7ea6` | Accepted: signed preview grant, consent intake và forged-context denial |
| E09-40-41 | `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-40-41-rereview-1.json` | `d7215b54c8c62fa56eaee139fab190e8dd65cb0c` | Accepted: proxy/media bypass closure và cross-tenant isolation |
| E09-50-51 | `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-50-51-rereview-1.json` | `ebb4175b2b104f1b564232f7051282bc3881f574` | Accepted engineering correction; production launch blocked |

## Cổng còn mở

Chỉ các cổng sau được ghi nhận là pending theo release-gates contract và các
review cuối:

- legal/privacy/consent approval, gồm chính sách và quyền nhận lead production;
- proof publication rights và provenance cho trust/proof records;
- brand token/logo được brand owner duyệt;
- editorial media publication và bản copy tiếng Anh được editorial/content
  owner duyệt;
- consultation endpoint owner, SLA và tracking; các kênh Zalo, WhatsApp,
  Messenger vẫn không có URL production được duyệt;
- ecosystem destination validation cho năm điểm đến và owner tương ứng;
- environment gates: disposable PostgreSQL rehearsal và Harness database.

Khi các cổng chưa đóng, hệ thống phải giữ English/policy routes và external
deep-links ở trạng thái fail-closed, giữ media/proof pending, và không nhận lead
production. Không có report nào trong sổ trên là production launch approval.

## Mapping thời gian

Evidence đầu tiên của E09 là package E09-00-11 ngày `2026-08-14`; review cuối
E09-50-51 được ghi nhận ngày `2026-08-22`. Đây là khoảng thời gian duy nhất
được dùng cho mapping Epic; không suy đoán ngày bàn giao production.
