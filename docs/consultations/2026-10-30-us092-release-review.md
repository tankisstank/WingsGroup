# Codex Release Review — US-092 (trước deploy production)

- Ngày: 2026-10-29 23:29 (kết thúc), model `gpt-6.1-sol`, chạy tương tác qua herdr.
- Phạm vi: `git diff 8980e23..f72e692 -- app`, Phase 0–4. Production đang chạy source tương đương `8980e23` (orchestrator đã đối chiếu `app/src` của release `wingsgo-price-20261029`: giống hệt, trừ `payload-types.ts` sinh tự động).
- Codex tự viết biên bản vào working tree rồi xóa để giữ tree sạch; đây là bản tóm tắt trung thực các finding, kèm xử lý của orchestrator.
- **VERDICT của Codex: NO-GO**, lý do duy nhất ở P1 là full lint đỏ.

## Findings và xử lý

| Mức | Finding (Codex) | Xử lý của orchestrator | Trạng thái |
|---|---|---|---|
| P1 | `pnpm run lint` exit 1 do `app/artifacts/tmp/us083-preview-refresh-20261021/readiness.js:214` (hook gọi có điều kiện), ngoài release diff | `artifacts/**` (script bằng chứng một lần, không đóng gói) bị loại khỏi lint trong `eslint.config.mjs`; `pnpm run lint` exit 0 (0 error, 399 warning) | Đã sửa (`4d66dc3`) |
| P2 | Ba lần đọc pages/products/departures không chung snapshot DB | Rủi ro còn lại đã chấp nhận từ cổng 1–3 | Chấp nhận |
| P2 | Trần 200 bản ghi, chạm trần chỉ warning | Có từ baseline. Production (đọc chỉ đọc 2026-10-30): 184 departure tương lai đã publish, 49 product, 50 wrapper. Dưới trần nhưng đã 92%; cần theo dõi log `[wingsgo-catalog] ... reached maximum cap` và xử lý trước khi vượt | Chấp nhận, theo dõi |
| P2 | Cursor không ký HMAC | Đã chấp nhận ở cổng 3 (dữ liệu công khai, no-store) | Chấp nhận |
| P2 | Chưa có bằng chứng trình duyệt Phase 5/6 | Smoke và kiểm tra trình duyệt ngay sau cutover, rollback image bất biến sẵn sàng | Làm sau cutover |
| P2 | Chi phí đọc 200×3 docs depth 2 mỗi request | Có từ baseline (US-091 dùng cùng truy vấn). Đo thời gian phản hồi `/tour` trước và sau cutover | Theo dõi sau cutover |
| P2 | EN thiếu title làm card biến mất | Kiểm tra production: 0/49 tour có title EN; `/en/tour` live đang hiện 13 card. Người dùng chọn fallback nội dung VI (D11); badge vẫn EN strict. Có test | Đã sửa (commit D11) |
| P3 | Sort theo title ở EN dùng collation `vi` | Không ảnh hưởng dữ liệu; để sau | Hoãn |
| P3 | Bảng bằng chứng trong `validation.md` còn "Chưa có" | Cập nhật sau release | Làm sau release |

## Bằng chứng orchestrator chạy lại sau xử lý

- `pnpm run build`: exit 0 (sẽ build lại trên commit release cuối).
- `pnpm run lint`: exit 0.
- `pnpm run test:unit`: 1370/1371, lỗi duy nhất `wingsGroupV3Shell.unit.spec.ts` có từ baseline.
- `pnpm run test:component`: 418/418.
- `tests/int/editorialBadgesIntegration.int.spec.ts`: 5/5.
- `pnpm exec tsc --noEmit`: chỉ 2 lỗi có từ trước trong `wingsGroupCorporateRoutes.unit.spec.ts`.
