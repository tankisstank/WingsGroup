# US-074 — Scope waiver, 2026-09-15

## Quyết định

Theo yêu cầu của người dùng ngày 15/09/2026, US-074 không thực hiện:

- authenticated browser validation trên staging thật;
- kiểm thử Safari/iOS.

Hai hạng mục này được ghi nhận là **waived/unverified**, không phải là kết quả
pass. Risk còn lại là hành vi cross-domain trên môi trường staging thật và
WebKit chưa được xác nhận bằng runtime tương ứng.

## Phạm vi vẫn được giữ nguyên

- Không tạo, xóa, sửa, reset mật khẩu, đổi role hoặc đổi site membership của
  account hiện hữu.
- Fixture user/page/lead chỉ được phép tạo tạm trên non-Production và phải
  cleanup exact ID sau test.
- Không ghi dữ liệu, đổi domain, preview allowlist hoặc cấu hình reverse proxy
  trên Production trong quyết định waiver này.
- Không dùng waiver để tuyên bố Production đã deploy hoặc US-074 đã hoàn tất.

## Bằng chứng thay thế hiện có

- Unit: 134 files / 994 tests pass.
- Component: 27 files / 149 tests pass.
- Admin E2E: 19/19 pass trên Chrome standalone production-like với ephemeral
  fixture non-Production; after-state của DB copy trở về baseline.
- TypeScript, lint và standalone build pass; lint có 0 error / 240 warnings.

Tại thời điểm lập waiver, US-074 tiếp tục ở `in_progress` / `Chờ xác nhận` /
`Partial proof` vì các gate Production chưa chạy. Sau đó production approval,
backup, canary, after-state, rollback readiness và lead vocabulary đã được ghi
nhận tại [production-release.md](./production-release.md); waiver này vẫn chỉ
áp dụng cho hai coverage nêu trên.
