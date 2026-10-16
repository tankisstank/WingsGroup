# Yêu Cầu Rà Soát Phát Hành & Phản Biện Đối Kháng (Final Pre-Release Audit Gate)
**Dự án:** WingsTravel CMS UI/UX Standardization (US-074 / Phase 1)  
**Thời điểm:** 2026-10-15  
**Mục tiêu:** Kiểm tra toàn diện toàn bộ diff code đã triển khai cho gói chuẩn hóa giao diện CMS, đảm bảo an toàn tuyệt đối trước khi đóng đợt chỉnh sửa và đưa lên Staging/Production.

---

## 1. Toàn Bộ Diff & Thay Đổi Đã Triển Khai

### A. Triệt Tiêu Schema Bleat (Thu gọn Menu Hiển Thị Cột của Pages)
- Tạo tiện ích đệ quy `app/src/utilities/disableListColumn.ts` (`disableListColumnRecursively`) áp dụng đồng bộ `admin: { disableListColumn: true, disableListFilter: true }` cho toàn bộ các trường phức tạp/lồng nhau.
- Áp dụng trên:
  1. `app/src/fields/wingsSideHiFi.ts`: Áp dụng cho toàn bộ `wingsSideHiFiTab` (giải phóng ~80 trường WingSide khỏi bộ chọn cột).
  2. `app/src/fields/wingsGroupCorporateRoute.ts`: Áp dụng cho toàn bộ `wingsGroupCorporateRouteField` (giải phóng ~20 trường chính sách, publication, phê duyệt server).
  3. `app/src/fields/wingsGoTourCatalog.ts`: Áp dụng cho `wingsGoTourCatalogField` (`enabled`, `curation`, `featuredTours`).
  4. `app/src/heros/config.ts`: Áp dụng cho `hero` và toàn bộ subfields (`type`, `richText`, `variant`, `slides`, `video`, `behaviorOverrides`, v.v.), đồng thời gán `admin: { hidden: true }` cho trường legacy fallback `presentation` (giữ nguyên schema DB, chỉ ẩn khỏi UI Payload).
  5. `app/src/collections/Pages/index.ts`: Gán `disableListColumn: true` cho `editorialGuidance` và `layout` (Blocks).
- **Kết quả:** Danh sách cột hiển thị (Columns selector) của Pages từ hơn 100 trường thu gọn về các cột nghiệp vụ cốt lõi: Title, Site, Slug, Updated At, Id. Không có trường dữ liệu nào bị xóa khỏi database.

### B. Đồng Bộ Hóa Thanh Điều Hướng (Sidebar Navigation Rail)
- **Chuẩn hóa `AdminNavIntro` (`app/src/components/AdminNavIntro/index.tsx`):**
  - Mở rộng đầy đủ 4 phân nhóm quản trị bao quát 100% các luồng nghiệp vụ của toàn bộ hệ thống:
    - **Vận hành:** Bàn điều hành (`/admin/console`), Rà soát site (`/admin/site-review`), Lead gửi về (`/admin/collections/form-submissions`), Biểu mẫu (`/admin/collections/forms`).
    - **Nội dung:** Quản lý trang (`/admin/collections/pages`), Quản lý tour (`/admin/collections/tour-products`), Bộ tour nổi bật (`/admin/collections/tour-curations`), Bài viết (`/admin/collections/posts`), Danh mục (`/admin/collections/categories`), Thư viện media (`/admin/collections/media`), Tạo trang nhanh (`/admin/page-wizard`).
    - **Cấu hình site:** Giao diện & Theme (`/admin/theme`), Cài đặt site (`/admin/collections/site-settings`), Danh sách site (`/admin/collections/sites`).
    - **Hệ thống:** Người dùng (`/admin/collections/users`), Nhập / xuất dữ liệu (`/admin/collections/imports`).
  - Toàn bộ đều có Lucide icon, định dạng nhất quán, trạng thái active ổn định, URL chính xác.
- **Giải quyết triệt để "Shell schism" (Sidebar bị phân mảnh/thay đổi khi chuyển menu):**
  - Trước đây: Các trang custom standalone (`/admin/console`, `/admin/theme`, `/admin/site-review`, `/admin/page-wizard`) dùng `AdminStandaloneShell` chỉ có `AdminNavIntro`. Khi nhảy sang trang native collection (`/admin/collections/pages`), Payload lại render thêm khối `.nav__wrap` với danh sách lặp lại không có icon bên dưới, khiến sidebar bị phình to, lặp lại link và nhảy giao diện.
  - Xử lý: Trong `custom.scss`, ẩn khối native lặp lại `.nav__wrap` trên desktop (giống như mobile đã làm). Giúp toàn bộ các trang từ standalone đến native collection đều dùng chung 1 thanh điều hướng `AdminNavIntro` phẳng, mượt mà, đồng nhất 100%.

### C. Chuẩn Hóa Thị Giác & Typography
- `app/src/utilities/locales.ts`: Chuẩn hóa nhãn locale từ tiếng Anh pha trộn `'ENGLISH (en)'` thành tiếng Việt chuẩn mực `'Tiếng Anh (en)'`.
- `app/src/components/AdminGuidance/TourProductListGuidance.tsx`: Đồng bộ nút filter thành `'⚠️ Chưa gán site'`.
- `app/src/app/(payload)/custom.scss` & `app/src/components/AdminStandaloneShell/index.scss`:
  - Chuyển toàn bộ các icon trong sidebar nav từ khung vuông bọc teal đậm `[ ⊞ ]` sang Flat Lucide Icon tối giản, thanh lịch, đồng bộ tuyệt đối với CMS palette.
  - Banner guidance `.wings-admin-guidance`: Căn dãn `width: 100%`, bo góc chuẩn `var(--wings-admin-radius-md)`.
  - Chip nút guidance: Bo tròn `var(--wings-admin-radius-pill)`, font-size 0.78rem, hover hiệu ứng mềm mại.

### D. Kiểm Tra Hồi Quy (Verification)
- `pnpm exec tsc --noEmit`: 0 lỗi type (hoàn toàn sạch sẽ).
- `pnpm vitest run --config ./vitest.unit.config.mts tests/unit/adminNavigationChrome.unit.spec.ts`: 4/4 tests passed.
- `pnpm vitest run --config ./vitest.unit.config.mts tests/unit/appliedCmsUiCompatibility.unit.spec.ts`: 4/4 tests passed.

---

## 2. Câu Hỏi Phản Biện Đối Kháng Yêu Cầu Codex Trả Lời
1. **Kiểm tra an toàn dữ liệu & Schema:**
   - Việc dùng `disableListColumn: true, disableListFilter: true` và `hidden: true` trên các group/subfields có ảnh hưởng nào tới việc đọc/ghi dữ liệu của API, seed script, hay hooks không?
2. **Kiểm tra tính toàn vẹn của Navigation:**
   - Việc ẩn `.nav__wrap` và đưa tất cả các collection chính vào `AdminNavIntro` có làm mất menu nào mà SuperAdmin cần không? Có collection nào bị "cô lập" không?
3. **Phát hiện Edge Cases & Rủi ro tiềm ẩn (P1/P2/P3):**
   - Chỉ ra bất kỳ rủi ro nào về CSS leakage, mobile responsiveness, hoặc Payload upgrade compatibility.
4. **Kết luận cuối cùng:**
   - Đánh giá diff này đã đạt tiêu chuẩn để đóng gói và bàn giao người dùng chưa?
