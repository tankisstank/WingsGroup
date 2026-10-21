# Kế hoạch Thực thi: US-082 — Bản địa hóa Hoàn chỉnh WingsGroup English

## 1. Giai đoạn 1: Sửa Archive Block
- [ ] Cập nhật `app/src/blocks/ArchiveBlock/Component.tsx`: Lấy `currentLocale` và truyền vào `payload.find({ locale: currentLocale, ... })`.
- [ ] Kiểm tra điều kiện `_status: 'published'` và `site: site.id` trên `where`.
- [ ] Kiểm tra trường hợp `populateBy === 'selection'` để đảm bảo `selectedDocs` cũng nhận đúng locale.

## 2. Giai đoạn 2: Sửa Lead Capture Component & Route Handler
- [ ] Cập nhật `app/src/blocks/Form/Component.tsx`: Truyền `?locale=${resolvedLocale}` khi gọi `GET /api/lead-submissions` và gửi `locale` trong body khi `POST`.
- [ ] Thêm effect cleanup & reset consent khi `resolvedLocale` thay đổi.
- [ ] Cập nhật `app/src/app/(payload)/api/lead-submissions/route.ts`:
  - Trong `GET`: Đọc query parameter `locale` (nếu hợp lệ) kết hợp fallback `getCurrentLocale()`.
  - Trong `POST`: Ghi nhận `governance.locale` từ request payload được kiểm duyệt.

## 3. Giai đoạn 3: Kiểm thử & Nghiệm thu
- [ ] Chạy unit test lead governance: `pnpm run test:unit -- tests/unit/wingsGroupLeadGovernance.unit.spec.ts`.
- [ ] Kiểm thử visual với `agent-browser` tại `https://wingsgroup.vn/en` (hoặc localhost): Xác nhận card bài viết và checkbox consent đều hiển thị tiếng Anh 100%.
- [ ] Đồng bộ Plane work items.
