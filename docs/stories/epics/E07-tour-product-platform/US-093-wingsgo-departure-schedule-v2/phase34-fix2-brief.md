# Brief sửa vòng 2 Phase 3–4 — orchestrator (2026-10-31)

`ff6c414` đã được orchestrator chạy lại: component 58/58, unit 60/60, integration 5/5, tsc 2 lỗi baseline. Ảnh `artifacts/phase34-fix/` cho thấy ba lỗi còn lại. Sửa trong **một commit mới**.

## S1 (P1, AC2) — Nhãn "Giữ chỗ" trên đợt không giữ chỗ được

DB local có `cta_label_override` = "Giữ chỗ" (6 đợt), "Nhận tư vấn" (10), "Nhận tư vấn line bay đẹp" (1). Tất cả đợt local đều chưa xác minh, nên `canHoldSeat = false` và `intent=inquiry`, nhưng row vẫn hiện "Giữ chỗ". AC2: "Giữ chỗ" chỉ hiện khi `canHoldSeat`.

**Quy tắc mới (ghi vào `design.md`, mục Bảng trạng thái/CTA):** `ctaLabelOverride` chỉ được dùng khi `canHoldSeat === true`. Khi `canHoldSeat === false`, nhãn luôn là nhãn chuẩn theo locale ("Liên hệ báo giá" / "Request a quote"). `intent` không đổi.

- Sửa trong `buildScheduleRow` (server). Áp dụng cho row, chip ngày Theo hành trình và thẻ thị trường (đều dùng `row.ctaLabel`).
- Test: override "Giữ chỗ" + quote → nhãn chuẩn; override + sold-out → nhãn chuẩn; override + `canHoldSeat` → nhãn override. Sửa test K3 cũ nếu đang khẳng định override hiện trên row inquiry, ghi lý do trong báo cáo.

## S2 (P2) — Mã thời lượng bị viết thường khi dính dấu câu

"TOUR HÀN QUỐC 6N5Đ: BUSAN…" ra "Tour Hàn Quốc 6n5đ: Busan…". Regex thời lượng trong `toTitleCaseWord` (`wingsGoDisplay.ts`) không khớp khi từ có dấu câu đầu/cuối (`:`, `,`, `)`, `(`). Tách dấu câu đầu/cuối trước khi so khớp mã thời lượng và allowlist, rồi ghép lại nguyên dấu câu. Test: `6N5Đ:`, `(5N4D)`, `5N4Đ,` và mọi test cũ của `wingsGoDisplay` vẫn pass.

## S3 (P2) — Thanh lọc sticky quá cao trên mobile

Ở 390px thanh lọc sticky chiếm khoảng 280px (ô tìm kiếm, 3 select xuống dòng, toggle chế độ xem, chip). Handoff: "thanh lọc gọn" trên mobile.

- Ở < 640px, phần sticky tối đa khoảng **120px**: một hàng ô tìm kiếm cùng nút "Bộ lọc" (mở/đóng vùng chứa hãng bay, tình trạng, sắp xếp, có `aria-expanded`/`aria-controls`, số bộ lọc đang bật), và một hàng chip thị trường cuộn ngang. Toggle chế độ xem có thể nằm trong vùng bộ lọc hoặc ngoài phần sticky.
- Desktop giữ như hiện tại. Không cuộn ngang trang ở 360/390/430. Vùng chạm ≥ 44px.
- Ghi chiều cao phần sticky đo được ở 390 và 1440 vào báo cáo.

## Cổng, commit, báo cáo

- `pnpm run lint`, `pnpm run test:unit` (chỉ còn lỗi baseline), `pnpm run test:component`, `pnpm exec tsc --noEmit` (2 lỗi baseline), `pnpm run build`; integration `wingsGoScheduleIntegration`.
- Ảnh 390 VI (Theo ngày, mở vùng bộ lọc, Theo hành trình) và 1440 VI Theo ngày vào `artifacts/phase34-fix2/`.
- Không commit `payload-types.ts` hay `.snap` chỉ khác line-ending.
- Commit `fix(wingsgo): US-093 CTA override rule, duration casing, compact mobile filters`, kèm:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LPBpFfhDsGd5w6zaiq2fq4
```

- Ghi mục "Vòng sửa S1–S3" vào cuối `phase4-report.md`.

Khi xong in `US093_FIX2_DONE`. Nếu bị chặn, in `US093_FIX2_BLOCKED` kèm lý do.
