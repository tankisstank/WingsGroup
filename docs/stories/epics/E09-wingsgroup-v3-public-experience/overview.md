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
| US-061 | Contract nền tảng v3, media và fidelity | Accepted engineering; 13 editorial assets đã có quyền sử dụng WingsGroup, còn kiểm soát import/runtime |
| US-062 | Fidelity homepage và UX tư vấn responsive | Accepted engineering; chờ cổng công bố |
| US-063 | Publication, brand, proof và editorial gates | Accepted engineering; brand/media/English evidence đã được duyệt, proof vẫn fail-closed |
| US-064 | Consent lead-intake và consultation fallback | Accepted engineering; privacy contract đã được duyệt, runtime delivery/endpoint còn chờ |
| US-065 | Corporate routes, legal/locale và publication governance | Accepted engineering; English đã được duyệt, legal/privacy vẫn fail-closed |
| US-066 | PostgreSQL, cross-tenant và go-live readiness | Accepted engineering; rehearsal/môi trường còn mở |
| US-071 | WingsGroup UX, Copy-edit, Layout & Social Proof | Implemented & verified; tinh chỉnh nội dung, giao diện, testimonials và bố cục responsive |

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
| WP-BRAND-01 | `/home/docker-admin/.codex-orchestrator/runs/wings-e09-brand-kit-20260823/reports/WP-BRAND-01.json` | `0c45339b55d6aa7e0138aa0fbe1ddfc8a4c08085` | Accepted brand kit implementation; approved logo/token evidence and CMS/static fallback precedence |
| Editorial media authorization | `docs/product/wingsgroup-v3-media-manifest.json` | `0c4a5a2c0a73e006ab4fa38f16189574e0b845dc` | Exactly 13 assets; WingsGroup production editorial-use rights approved, not legal proof; governed import/derivative checks remain required before runtime publication |
| EN-EDITORIAL-03 | `/home/docker-admin/.codex-orchestrator/runs/wings-e09-en-editorial-audit-20260824/reports/EN-EDITORIAL-03-final.json` | `95e887ec6da2f74a1a7403f0d8e4e62de95cc85d` | Independent Terra acceptance: no P0/P1/P2 public-English findings; native editorial sign-off recommended |

## Cổng còn mở

Trạng thái hiện tại theo release-gates contract và các review cuối:

- `privacy-consent` source-contract gate đã được stakeholder duyệt ngày
  `2026-08-24`, với policy routes `/chinh-sach-bao-mat` và
  `/en/chinh-sach-bao-mat`, retention 24 tháng, data-subject contact
  `info@doicanhviet.com` và inter-branch routing được phép;
- Runtime policy routes, consent persistence, migration/seed và production smoke
  proof vẫn là release work riêng; lead delivery chỉ dùng Payload/CMS database
  và release configuration yêu cầu `LEAD_DELIVERY_REQUIRED=false`;
- `proof-publication` là cổng optional/non-blocking, vẫn fail-closed cho tới khi
  từng proof record có đủ source, context/date, rights và provenance;
- consultation channels vẫn optional/fail-closed pending URL production, owner,
  SLA và tracking; các kênh Zalo, WhatsApp, Messenger chưa được mở external URL;
- ecosystem deep-links vẫn optional/fail-closed pending destination validation và
  owner tương ứng;
- environment gates vẫn mở: disposable PostgreSQL rehearsal và Harness database.

Brand logo/tokens, quyền site-scope và production editorial-use của 13 asset trong
media manifest, cùng locale completeness và native English editorial review đã có
bằng chứng approved; các mục này không còn là publication gate pending. Quyền sử
dụng asset không phải là xác nhận import/runtime production hoặc legal proof.

Khi các cổng chưa đóng, hệ thống phải giữ policy routes, proof records và external
deep-links ở trạng thái fail-closed, và không nhận lead production. Privacy contract
đã được duyệt không thay thế runtime route, consent persistence, migration/seed,
delivery hoặc production smoke proof. English locale và brand/media evidence đã
được duyệt không thay đổi các kiểm soát runtime còn lại.
Không có report nào trong sổ trên là production launch approval.

## Mapping thời gian

Evidence đầu tiên của E09 là package E09-00-11 ngày `2026-08-14`; review cuối
E09-50-51 được ghi nhận ngày `2026-08-22`. Đây là khoảng thời gian duy nhất
được dùng cho mapping Epic; không suy đoán ngày bàn giao production.
