# Kế hoạch Thực thi: US-081 — Đa Hotline Liên hệ & Tư vấn WingsGo

## Follow-up hiện tại — 23/10/2026, intake Harness #150

- [x] Kiểm tra public WingsGo và đọc CMS production ở chế độ read-only: main cũ còn tồn tại, footer có 4 link gọi, 2 email, 2 Zalo và theme selector.
- [x] Tách candidate từ release `d6057d4`; không gộp thay đổi chưa liên quan trong workspace.
- [x] Codex sửa footer, FAB, Form, resolver/seed, updater CMS và tests. agy hiện hữu `wP:p1` sửa provider/layout/theme tests, chạy kiểm thử tích hợp độc lập.
- [x] Updater unit tests 21/21; component suite 94/94; typecheck; lint không có error; rehearsal Payload/SQLite trên bản sao riêng giữ nguyên 5 site còn lại và chạy lại không ghi dữ liệu.
- [x] Review ảnh phát hiện span kế thừa CSS pill; bỏ span thừa, footer tests chạy lại 14/14. Build và browser proof sau sửa được lưu riêng.
- [x] Browser proof cuối20/20, root audit và ảnh sau sửa; nguồn bằng chứng `wingsgo-footer-review-20261023/review.md`.
- [x] Đồng bộ Harness/Plane: preview1 story/4 children, sync patched5/missing0. API readback22:40+07 xác nhận WingsGo/E07, owner c0508g,4 child có tên cụ thể và đủ ngày; giữ lịch gốc19–22/10, không dời hạn. US-081 Partial / Chờ xác nhận.
- [x] Release review trước production: PostgreSQL row lock/shared transaction, fresh encrypted backup và restore thật, ARM64 native provisioning/package theo runbook, candidate smoke.
- [x] Cutover app và ghi CMS WingsGo theo phạm vi được duyệt; kiểm tra public VI/EN, các tenant khác và rollback image/symlink. Production release `16ff60a28ba48489d7d06de648780c522372e13f` đã healthy; UAT stakeholder còn chờ.

Không đổi schema/migration. Không sửa dữ liệu hotline phụ hay số của WingsSide. Full repository suite và quay số/lead submission thật nằm ngoài kiểm chứng cục bộ này.

## Kế hoạch lịch sử ngày 19/10/2026

## Điều phối và quyết định

- Người dùng đã duyệt triển khai ngày 19/10/2026; Codex điều phối, agy hiện hữu tại Herdr `wP:p1` phụ trách mã ứng dụng. Không tạo thêm worker.
- agy sở hữu `app/src/**` và seed liên quan; Codex sở hữu `app/tests/**`, kiểm chứng, biên bản và đồng bộ Plane. Không commit/push/deploy trong phạm vi này.
- Tham vấn kiến trúc: `docs/reviews/2026-10-19-us081-us083-consultation/consultation.md`. Lane `high-risk`; intake Harness #142.
- Giữ một Zalo OA chung; giữ `supportPhone`; mảng hotline bổ sung additive, tối đa 5 dòng. `undefined` khác `[]`/`null` để bảo toàn thao tác xóa số trong CMS.

## 1. Giai đoạn 1: Schema & Helper Layer
- [x] Thêm field `additionalHotlines` vào `app/src/collections/SiteSettings.ts`.
- [x] Tạo module `app/src/utilities/siteHotlines.ts` với hàm chuẩn hóa `resolveSiteHotlines` và `formatHotlineDisplay`.
- [x] Viết unit tests cho `siteHotlines` (bảo toàn số 0 đầu, loại trùng, fallback WingsGo mặc định 3 số: 0912 910 101, 0915 250 101, 0915 260 101).
- [x] PostgreSQL migration có backfill chỉ WingsGo khi tạo bảng lần đầu, registry và kiểm tra chạy lại không tái sinh số đã xóa.
- [x] SQLite repair/bootstrap, seed WingsGo và Payload types đồng bộ với schema mới.

## 2. Giai đoạn 2: Tích hợp Giao diện (UI Integration)
- [x] Cập nhật `app/src/Header/Nav/index.tsx`: Desktop popover hotline và mobile drawer hotline list có `<a href="tel:...">`.
- [x] Cập nhật `app/src/Footer/Component.tsx`: Render đầy đủ 3 đầu số kèm link `tel:`.
- [x] Cập nhật `app/src/components/SiteContactFab.tsx`: Render 3 hotline buttons dạng `<a href="tel:...">`.
- [x] Cập nhật `app/src/tours/RetailTourConsultationDialog.tsx`: Cung cấp danh sách các hotline để khách bấm gọi trực tiếp.
- [x] Truyền dữ liệu server qua HeaderClient, layout/FAB và cmsPage/StructuredPages/modal; CTA lịch khởi hành dùng số chính từ CMS.
- [x] Đổi link Zalo của modal sang OA chung; giữ luồng snapshot, chọn lịch và tour riêng.

## 3. Giai đoạn 3: Kiểm thử & Nghiệm thu
- [x] Chạy targeted unit tests: `siteHotlines.unit.spec.ts` đạt 11/11; full repository suite còn lỗi ngoài US-081 và được ghi trong validation.
- [x] Chạy component tests liên quan, typecheck, build.
- [x] Chạy `pnpm run db:migrate:smoke`, `pnpm run db:upgrade:smoke` và rehearsal riêng US-081 trên PostgreSQL thật: backfill, CRUD, validation, tenant isolation, xóa số và cache invalidation.
- [x] Kiểm thử responsive trên mobile viewport (`agent-browser`).
- [x] Kiểm tra desktop 1440px, mobile 320px/390px; popup Escape/click ngoài/focus; FAB, footer, menu và modal. Lưu ảnh/log mới trong `artifacts/tmp/us081-hotlines-20261019/`.
- [x] Kiểm tra click-to-call: Thẻ `<a>` có thuộc tính `href` đúng định dạng `tel:09xxxxxxxx`.
- [x] Ghi rõ native dialer trên điện thoại thật chưa được tự động kiểm tra; không dùng kết quả trình duyệt thay cho nghiệm thu thiết bị thật.
- [x] Codex release review: ghi nhận và xử lý findings P1/P2/P3 trong validation trước khi cập nhật proof.
- [x] Đồng bộ Plane work items; preview có US-081 thuộc Epic E07 với 4 child, sync cuối `patchedCount: 5`, `missingCount: 0`.

## Production completion — 24/10/2026

Release đã qua backup/restore, migration status, CMS transaction apply, cutover, readiness và browser QA. Current symlink là `release-us081-wingsgo-16ff60a`; release cũ vẫn giữ làm rollback point. Không có schema/dependency migration mới.
