# Xử lý phản biện kế hoạch AC6

Ngày24/10/2026. Consultation gate của repo: `codext exec`, read-only review,
không chỉnh sản phẩm. CLI exit0; nguyên văn ở `consultation-result.txt`, yêu
cầu ở `consultation-request.md`, runtime ở `consultation-runtime.log`.

Cập nhật sau tham vấn Claude qua herdr: `claude-review/resolution.md` và
`followup-result.md`. User đã chốt mọi ảnh editor upload vào WingsGo đều
public-on-upload, không gate duyệt/publish/rights riêng hoặc schema private/
draft. Quyết định này thay phần eligibility còn mở của biên bản Codex dưới
đây; Group giữ governance, async/generation chỉ xét sau G-Async.

## Kết luận

Chọn hướng **P2 có điều kiện**: tái dùng Media/Payload/Sharp, resolver và route
site-aware; bổ sung job chỉ khi đo được nhu cầu. Đây là kết luận thiết kế để
lập kế hoạch, chưa phải chấp nhận kiến trúc/schema mới hoặc nghiệm thu release.

Mọi finding đã được xử lý trong **đặc tả** như bảng dưới. Tình trạng kiểm
chứng triển khai vẫn **chưa chạy**; không ghi finding đã fix trên production.

| Finding | Quyết định và nơi cập nhật | Bằng chứng triển khai còn cần |
| --- | --- | --- |
| P1.1 Race khi replace, job cũ và thu hồi quyền | CMS-DESIGN mục3: desired/active/attempt riêng; atomic conditional commit khớp revision và quyền, status/error job cũ không ghi đè; giữ bản cũ chỉ nếu còn được phép. AC6.6 | Hai replace đảo thứ tự, crop thay, duplicate/crash/restart, unpublish trong processing |
| P1.2 Public eligibility chưa generic | OPERATIONS mục5 và AC6.5/7: định nghĩa Go riêng; không suy từ site match; kiểm mọi đường original/derivative/API/storage, không filesystem fallback | Anonymous draft/private/cross-site, forged headers, preview-cache negative tests |
| P1.3 Giữ URL cũ khác giữ quyền public | OPERATIONS mục5: retention độc lập authorization; revocation bound, origin block, purge mọi alias/generation và in-flight refill; no-store nếu không bảo đảm thu hồi | Warm-cache revoke, purge lỗi/retry, URL cũ, browser/CDN bound thực tế |
| P1.4 No-upscale mâu thuẫn Group EXACT sáu width | CMS-DESIGN mục3 và AC6.2/5: Group cần nguồn effective≥1440, không đủ giữ draft/bản cũ còn quyền; Go width thật, loại/gộp candidate thiếu; 160/320 chỉ thumb | Decode width thật sau orientation/crop; không giả640w cho file320px; nguồn nhỏ/portrait |
| P2.5 Hạn chế mở rộng pipeline/worker | CMS-DESIGN mục2/3: reuse sizes trước; chỉ state khi cần; task có runner/queue riêng và một worker/resource cap; ba retries nghĩa bốn attempts; lead không bị đói tài nguyên | Kiểm API Payload3.84.1, runner thật, cost/sizes inventory, retry/backoff/lease |
| P2.6 Picture/preload phải khớp nguồn browser chọn | CMS-DESIGN mục4, AC6.2/3: resolver metadata, eager/fetchpriority phù hợp, preload chỉ khi selection khớp; Next16 priority không được sao chép máy móc | Network/currentSrc/byte/decoded dimensions và cold-load screenshot |
| P2.7 Video gate vòng lặp, CSS-hidden hai video, Range chưa đúng | CMS-DESIGN mục4, AC6.4: không đợi LCP cuối/load; gate DOM+poster+visible+idle; active source duy nhất; keyboard/error; range đầy đủ origin/CDN; preparedMP4 baseline | Timestamp gate/body bytes, play promise/error, variants, 200/206/416 exact bytes và seek |
| P2.8 Protocol chưa cố định, media không bảo đảm mọi metric | AC6.1/9: freeze trước code, ba lượt/metric median và range, CLS từng lượt, giữ warning, rerun cả nhóm có lý do, payload critical-set + cửa sổ5/10s; trượt do JS/server vẫn mởAC6 | Frozen protocol/build/content, đủ18lượt sạch, trace residual, không nhận fieldCWV từlab |
| P2.9 Rollout/rollback và legacy còn chung chung | OPERATIONS mục6, AC6.5/8: readiness server theo locale, originals-only/preview/legacy/unrelated edit không bị khóa đại trà; giữ generation lookup và rollback có mục tiêu | Canary/backfill/resume/disk-full, revalidation dependency, backward-compatible migration/rollback |
| P3 Editor và ngoại lệ | CMS-DESIGN mục3, AC6.2/5: phân biệt lỗi generation/rights/quality; exception có media revision/slot/reason/approver/review condition; không thêm child | CMS staging và checklist quality; đúng6child trênPlane |

## Những quyết định vẫn phải chốt khi bắt đầu triển khai

- Danh sách profile thật cần giữ/thêm sau inventory và số đo encode ARM64.
- Có cần state/migration/job không; nếu có, execution packet rủi ro cao và
  review cụ thể schema, CAS/locking, runner/lease trước code.
- ẢnhGo eligibility đã chốt bởi user public-on-upload; kiểm triển khai không
  thêm gate riêng. Giới hạn cache khi replace/xóa ảnhGo và thu hồi mediaGroup
  vẫn cần đo thực; không suy rộng chính sách ảnh sang video/tài liệu.
- Freeze budget/metric/protocol đề xuất trước code; ngoại lệ chất lượng theo
  revision/slot, không nới gate sau khi biết điểm đo.
- Năng lực transcode video nếu muốn tự động; chưa thêm dependency encoder.

Không có blocker buộc dừng việc làm rõ tài liệu. Consultation này không thay
release audit, xác minh VPS/CDN, test ứng dụng hoặc xác nhận deadline của khách.
