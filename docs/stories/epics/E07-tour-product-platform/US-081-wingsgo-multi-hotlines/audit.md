# US-081 — Codex architecture and implementation review

Ngày: 19/10/2026. Codex là orchestrator/reviewer độc lập; agy tại Herdr `wP:p1` thực hiện mã ứng dụng. Phạm vi chỉ US-081. Tham vấn kiến trúc ban đầu: `docs/reviews/2026-10-19-us081-us083-consultation/consultation.md`.

## Hợp đồng được duyệt

Giữ `supportPhone`, bổ sung `additionalHotlines` không localized, tối đa 5 dòng. Truyền danh sách qua prop hiện hữu, không thêm API/context. WingsGo có ba số mặc định; tenant khác không nhận fallback WingsGo. Người dùng chốt một Zalo OA chung.

## Findings và xử lý

| ID | Mức | Finding | Xử lý và bằng chứng |
| --- | --- | --- | --- |
| A01 | P2 | `null` bị coi như thiếu cấu hình, khiến số CMS đã xóa xuất hiện lại. | Chỉ `undefined` kích hoạt fallback phụ; unit test đầu thất bại, lần sau 11/11 qua. `hotlines-unit-first.log`, `hotlines-unit-second.log`. |
| A02 | P2 | Chuẩn hóa chỉ chấp nhận số Việt Nam làm mất số quốc tế của tenant khác. | Thêm nhánh quốc tế hợp lệ ngoài WingsGo; unit test số `+33` qua. Không đổi `supportPhone` trong DB. |
| A03 | P2 | Backfill theo `NOT EXISTS` của từng parent chèn lại hai số sau khi CMS xóa hết và migration chạy lại. | Chỉ backfill khi bảng mới được tạo. Rehearsal PostgreSQL thật tái hiện `2 !== 0`, sau sửa qua. SQLite repair cũng qua thao tác xóa/chạy lại. |
| A04 | P2 | Field CMS mới chỉ kiểm tra required, cho lưu chuỗi `javascript:0915250101`. | Thêm validation bằng helper an toàn. Rehearsal Payload thực hiện CRUD và xác nhận từ chối protocol, giới hạn 5 dòng; log cuối exit 0. |
| A05 | P3 | ID backfill cố định có thể trùng nếu dữ liệu legacy có nhiều SiteSettings WingsGo. | Đã giải quyết: ID gồm `parentId`; PostgreSQL và SQLite rehearsal qua với nhiều tenant/settings. |
| A06 | P3 | Link cũ ghi Zalo OA nhưng trỏ tới số cá nhân. | Đã giải quyết: dùng shared OA `https://zalo.me/4142059657526524531`; component và browser smoke xác nhận. |

Không có P1 được phát hiện trong schema/helper/migration/UI đã kiểm chứng. Đây chưa phải kết luận đóng Story hay duyệt deployment; còn chờ xác nhận stakeholder.

## Bằng chứng tại thời điểm Stage 1

Các log nằm trong `artifacts/tmp/us081-hotlines-20261019/`.

- `pnpm run test:unit`: 140 file qua, 9 file lỗi; 1070 test qua, 2 assertion lỗi (7 file lỗi khi nạp module). Lỗi ngoài phần hotline gồm redirect compatibility, brand locale gate, CSS import và `node:sqlite` trong Vitest. Không coi gate toàn repo đã qua, không sửa mở rộng sang US-082/083.
- `pnpm run db:migrate:smoke`: exit 0 trên PostgreSQL 16.15, không còn migration pending; đã chạy lại sau thay đổi cuối.
- `pnpm run db:upgrade:smoke`: exit 0; giữ site sentinel và form submission cũ, đủ 4 bảng tour.
- `pnpm exec tsx tests/helpers/us081SQLiteRehearsal.ts`: exit 0; backfill WingsGo, giữ số chính và tenant khác, không phục hồi số phụ đã xóa, và empty local bootstrap không crash.
- `pnpm exec tsx tests/helpers/us081PostgresRehearsal.ts`: exit 0 với DB disposable được bảo vệ bằng tên/host/port và biến xác nhận. Qua legacy upgrade, tenant isolation, idempotence, CRUD, validation và invalidation cache cùng process.
- `pnpm exec tsc --noEmit`: exit 0; `pnpm run build`: exit 0.
- Browser smoke: desktop 1440px, mobile 320px, FAB/modal đủ 3 số, shared Zalo OA, Escape đóng overlay; không có browser error sau lượt kiểm tra cuối.
- Production release review: backup PostgreSQL custom format trước migration, release ARM64 đóng gói không chứa `public/media`, build image thành công, health `ready`, live display smoke WingsGo/WingSide đạt, rollback release cũ đã xác định.
- Follow-up WingsGroup: backup mới trước upsert, transaction idempotent cho `wings-group` (`site_settings.id=14`), cache Redis đã invalidate, RSC/live smoke desktop 1280px và mobile 375px đạt; các tenant khác vẫn không có hotline phụ.

## Ranh giới kiểm chứng

- Cache hiện có dùng memory theo process và Redis theo cấu hình. Hook invalidation cùng process đã được chạy thật; request ở process khác được đảm bảo theo TTL hiện có, không cam kết tab đã mở tự cập nhật.
- Không thay database hay cấu hình staging/production. Không chạy down migration, không deploy/push.
- Chưa kiểm tra bộ quay số trên điện thoại vật lý; trình duyệt tự động chỉ xác nhận các liên kết `tel:` và tương tác web.
- Phạm vi nghiệm thu là hiển thị responsive; không kiểm tra bộ quay số trên điện thoại vật lý. Full unit suite còn lỗi ngoài US-081 như đã nêu trong `validation.md`.
- Deployment đã hoàn tất trên release `release-us081-20261019-064820`; chưa đánh dấu Story hoàn tất vì còn chờ stakeholder UAT.
