# Kết quả làm rõ AC6 và giải pháp CMS

Ngày24/10/2026; intake159, US-086/E03. Phạm vi là thiết kế/đặc tả và tracking.

## Đã thay đổi

- `AC6.md`: checklist AC6.1–10, sáu cấu hình baseline, protocol/rerun/warning,
  budget đề xuất, byte/dimensions, video, CMS upload/replace/publish, concurrency,
  quyền/cache/revoke, backfill và bằng chứng khi nghiệm thu.
- `CMS-DESIGN.md`: P1/P2/P3/P4 và hướng P2 mở rộng Media/Payload/Sharp đang có;
  tận dụng sizes/renderer/site-aware route, jobs chỉ khi có nhu cầu đo được.
- `OPERATIONS.md`: cache/authorization và generation, thu hồi, canary/backfill,
  disk forecast, rollback có mục tiêu; bảng module và suite cần kiểm khi code.
- Story US-086 và ACTION-PLAN liên kết source; sáu AC/child vẫn giữ nguyên.
- Manifest và Harness evidence cập nhật kế hoạch; planned, proof bốn lớp0.
- `app/scripts/plane-import.mjs`: chỉ thêm mapping mô tả AC6 để người dùng
  Plane thấy checklist/giải pháp; không thay logic importer hoặc code website.
- Verify Plane bổ sung assert mô tả CMS/AC6 đã lên task con.

## Tham vấn kiến trúc độc lập

Theo Consultation Gate của AGENTS.md, chạy read-only:

```powershell
Get-Content -Raw source/strategy/us086-ac6-media-20261024/consultation-request.md | codext exec --dangerously-bypass-approvals-and-sandbox --ephemeral --color never -
```

Exit0, kết luận P2 có điều kiện. Bốn nhóm P1, năm nhóm P2 và nhóm P3 được ghi
nguyên văn trong consultation-result; quyết định xử lý **trong đặc tả** ở
`review-resolution.md`. Chưa coi là fix thực tế hoặc release review đã đạt.

## Kiểm chứng và đồng bộ

| Lệnh / kiểm tra | Kết quả |
| --- | --- |
| Inline Python asserts | Exit0:đủ AC6.1–10,6 tiêu đề child<80 ký tự, source/review tồn tại, E03/planned/pending đúng |
| `harness.ps1 story update --id US-086 ...` | Exit0; evidence mới, giữ target đề xuất06/11 và proof0 |
| `pnpm run plane:preview`, filter US-086 | Exit0;storyCount1,childTaskCount6 |
| `pnpm run plane:sync:workitems`, filter US-086 | Exit0;patchedCount7,missingCount0 |
| `node seo-audit-20261024/verify-plane.mjs` sau sync xong | Exit0;AC6 chi tiết CMS đã đồng bộ, state/owner/dates/parent đúng |

Readback mới `2026-10-24T15:46:54.149Z` (22:46:54 UTC+7):

- US parent E03, projectCore, sáu child đúng parent, owner c0508g duy nhất.
- `cmsMediaContractSynced=true`, `performanceChildUpdated=true`,
  `performanceEvidenceSynced=true`.
- `missingDates=0`, `genericChildNames=0`, `missingCount=0`.
- Tất cả `Đã lên kế hoạch`; parent start_date24/10/2026,target_date06/11/2026.
- Lần readback khi sync vẫn đang chạy thấy mô tả cũ nên assertCMS false;
  đã chờ sync exit0 rồi đọc lại; kết quả mới pass, không nới assertion.
- Plane plan không hỗ trợ Initiatives; Project/Epic/US/child đồng bộ thành
  công. Project archive được bỏ qua theo hành vi hiện có.

Các log preview/sync/readback trong thư mục này. Không tạo thêm US/child,
không tự đổi lịch đề xuất hoặc trạng thái thành triển khai/hoàn tất.

## Chưa thực hiện / rủi ro

Chưa code sản phẩm, sửa schema/CMS data hoặc deploy/push; không chạy lại
Lighthouse/app suite vì đây là công việc làm rõ kế hoạch trên baseline đã có.
Chưa test hành vi live quyền/CDN/origin range hoặc transcode công suất VPS.

Budget/metric là mục tiêu đề xuất cần freeze trước code. Sửa media có thể
chưa đủ đạt LCP nếu JS/server còn chậm. Các field/state/jobs mới nếu cần phải
có execution packet rủi ro cao và migration/release review riêng. Giới hạn
thu hồi cache và quyền public của Go phải được chứng minh trước release.
