# Đánh Giá Độc Lập Phát Hành Production: US-085 Footer & Contact Simplification

**Mã tài liệu:** `AGY-RELEASE-REVIEW-US085-FOOTER`  
**Dự án:** WingsTravel — Workspace `WingsTravel`  
**Story:** US-085 Follow-up (WingsGroup Footer & Contact Simplification)  
**Candidate Worktree:** `deploy/oracle/us085-footer-20261023`  
**Base commit (Live):** `6a0dac0` (feat: consolidate header contact and update primary hotline)  
**Candidate commit:** `d6057d41c2b3897b27cbd656356f83873d652870`  
**Người đánh giá độc lập:** agy (Antigravity)  
**Thời điểm đánh giá:** 2026-10-23T21:16:00+07:00  
**Trạng thái khuyến nghị:** **APPROVED FOR PRODUCTION CUTOVER (Khuyến nghị phát hành)**

---

## 1. Tổng Quan & Phạm Vi Candidate (6 Files Diff)

Đánh giá được thực hiện độc lập trên candidate worktree `deploy/oracle/us085-footer-20261023`, đối chiếu trực tiếp diff giữa commit live `6a0dac0` và candidate commit `d6057d41c2b3897b27cbd656356f83873d652870`.

### Danh mục 6 files thay đổi:
1. `app/src/Footer/Component.tsx`: Tối giản liên hệ footer V3 (1 hotline, 1 email ưu tiên supportEmail, bỏ Zalo OA và CTA 24/7).
2. `app/src/app/(frontend)/wingsgroup-v3.css`: Scoped style cho phone link footer V3 (`min-height: 44px`).
3. `app/src/blocks/WingsGroupContact/Component.tsx`: Tối giản direct contact cạnh form (1 hotline chính, bỏ email hardcode và Zalo).
4. `app/src/components/WingsGroupV3/WingsGroupV3.module.css`: Touch target 44px và focus-visible cho link gọi cạnh form.
5. `app/tests/component/footerHotlines.component.spec.tsx`: 11 component tests bao phủ toàn diện footer V3 và regression các tenant.
6. `app/tests/component/wingsGroupHeaderOptionA.component.spec.tsx`: Bổ sung tests cho contact block cạnh form (VI/EN, custom CMS main, empty array).

---

## 2. Kết Quả Kiểm Thử Độc Lập (Component Test Gate)

Lệnh thực thi trong candidate worktree:
```powershell
pnpm --prefix deploy/oracle/us085-footer-20261023/app run test:component -- \
  tests/component/wingsGroupHeaderOptionA.component.spec.tsx \
  tests/component/headerHotlines.component.spec.tsx \
  tests/component/siteContactFab.component.spec.tsx \
  tests/component/wingsSideHiFiChrome.component.spec.tsx \
  tests/component/wingsGroupV3Homepage.component.spec.tsx \
  tests/component/footerHotlines.component.spec.tsx
```

- **Exit Code:** `0`
- **Số test file đã chạy:** `6 / 6 passed`
- **Tổng số test cases:** `59 / 59 passed` (0 failed, 0 skipped)
- **Chi tiết từng file:**
  - `siteContactFab.component.spec.tsx`: 3 passed (287ms)
  - `footerHotlines.component.spec.tsx`: 11 passed (95ms)
  - `headerHotlines.component.spec.tsx`: 2 passed (227ms)
  - `wingsSideHiFiChrome.component.spec.tsx`: 5 passed (371ms)
  - `wingsGroupHeaderOptionA.component.spec.tsx`: 12 passed (421ms)
  - `wingsGroupV3Homepage.component.spec.tsx`: 26 passed (820ms)
- **File nhật ký kiểm thử:** Đã lưu đầy đủ tại `footer-contact-review-20261023/production-release/component.log`.

---

## 3. Đánh Giá Chi Tiết Theo Các Trục Kỹ Thuật

### 3.1. Cô Lập Đa Site (Tenant Isolation)
- **WingsGroup V3 Surface (`isWingsGroupV3Surface`):**
  - Footer hiển thị đúng 1 hotline đầu tiên từ CMS (`footerHotlines = hotlines.slice(0, 1)`).
  - Footer hiển thị đúng 1 email (`settings?.supportEmail || salesEmail`), triệt tiêu việc hiển thị 2 email trùng lặp.
  - Loại bỏ link Zalo OA và nút CTA tư vấn 24/7 (`data-wingsgroup-consultation-trigger="true"`).
- **WingsGroup Non-V3:**
  - Giữ nguyên logic hiển thị tất cả các hotline từ CMS (`hotlines.map(...)`), cả 2 email nếu khác nhau, và link Zalo OA.
- **WingSide (`isWingSide`):**
  - Chạy hoàn toàn trên nhánh riêng `ws-hifi-footer`, giữ nguyên cấu trúc cột Explore / Travel / Help và liên hệ riêng của WingSide. Không có bất kỳ thay đổi nào tác động đến WingSide.
- **WingsGo (`isWingsGo`):**
  - Giữ nguyên cấu trúc footer riêng: 3 hotline WingsGo, Zalo OA, thông tin trụ sở/văn phòng du lịch và khẩu hiệu tìm hành trình.
- **CSS Isolation:**
  - CSS trong `wingsgroup-v3.css` được scope bằng `body[data-site-code='wings-group'][data-wingsgroup-v3='true']`.
  - CSS trong `WingsGroupV3.module.css` được cô lập qua cơ chế hash class của CSS Modules.

### 3.2. An Toàn CMS-Empty & Invalid Input
- **CMS Hotline Rỗng / Đã xóa:**
  - Khi `supportPhone` rỗng hoặc null, `resolveSiteHotlines` trả về mảng rỗng `[]`.
  - `footerHotlines` là `[]`. Nhánh fallback raw phone được bảo vệ nghiêm ngặt bằng điều kiện `!isWingsGroupV3Surface && settings?.supportPhone`, do đó trên V3 tuyệt đối không rơi vào nhánh fallback để render số rỗng hay số rác.
  - Nếu cả hotline và email đều không có dữ liệu, `hasFooterContacts = false`, thẻ `<div className="site-footer__contacts">` hoàn toàn không được render.
  - Khối contact cạnh form (`WingsGroupContactSection`): khi `hotlines = []`, `primaryHotline` là undefined và `wingsGroupV3 && primaryHotline` là falsy, khối direct contact sẽ ẩn sạch sẽ, không tiêm số hardcode ngoài CMS.
- **CMS Hotline Không Hợp Lệ (Invalid Phone):**
  - Khi CMS chứa chuỗi không phải số điện thoại hợp lệ (ví dụ `invalid-phone-abc`), `resolveSiteHotlines` loại bỏ chuỗi này.
  - Footer V3 không render liên kết `tel:` nào, chỉ hiển thị email hợp lệ. Đã được chứng minh bằng test case cụ thể trong suite.

### 3.3. An Toàn Email (Email Safety)
- **Quy tắc ưu tiên (Priority Fallback):**
  - Ưu tiên `supportEmail`. Nếu `supportEmail` rỗng, tự động lấy `salesEmail`.
  - Nếu cả hai email cùng tồn tại, chỉ hiển thị 1 email đại diện duy nhất (`supportEmail`), loại bỏ triệt để tình trạng hai email cùng xuất hiện gây rối mắt.
- **Bảo vệ chống thu thập rác (Anti-Scraping):**
  - Email được bọc bởi `<ProtectedEmailLink email={footerEmail} />`, giữ nguyên cơ chế bảo mật và chống spam bot.
- **Loại bỏ Email Hardcoded:**
  - Khối `WingsGroupContactSection` đã loại bỏ hoàn toàn 2 thẻ email tĩnh `info@wingsgroup.vn` và `sales@wingsgroup.vn`, tránh tình trạng lệch dữ liệu so với cấu hình quản trị trong CMS.

### 3.4. Tính Nhất Quán Kênh Phụ Header (Header Subchannels & Navigation)
- **Phân tách trách nhiệm rõ ràng:**
  - Header Split Call Button (Option A) là nơi tập trung các kênh liên hệ tức thời: Hotline chính, Hotline tư vấn tour (`0915250101`), Hotline hỗ trợ dịch vụ (`0915260101`), Chat Zalo OA và Điều hướng Form tư vấn.
  - Footer và Contact Section đóng vai trò tinh giản, định hướng người dùng vào form tư vấn chính hoặc gọi nhanh 1 số hotline chính thức.
- **Bảo toàn thông tin pháp lý:**
  - Địa chỉ Trụ sở chính và Văn phòng du lịch vẫn hiển thị đầy đủ, chính xác theo locale VI/EN.
  - Link "Chính sách bảo mật khách hàng" (`/chinh-sach-bao-mat`) và các liên kết `navItems` (gồm "Liên hệ") tiếp tục hiển thị chuẩn xác.
- **Touch Targets:**
  - Cả `.wingsgroup-footer__phone` và link gọi trong `.contactDirect a` đều được định nghĩa `min-height: 44px; display: inline-flex; align-items: center;`, đáp ứng chuẩn WCAG 2.1 AA về vùng bấm trên thiết bị cảm ứng.

### 3.5. An Toàn Schema & Cache (Schema & Cache Safety)
- **Zero Schema Change:** Candidate không thay đổi bất kỳ collection, schema hay migration script nào. Không cần chạy `payload migrate`.
- **Zero Database Migration:** Hoàn toàn không có thao tác DDL hoặc DML bắt buộc trên cơ sở dữ liệu production.
- **Cache Invalidation:**
  - Các component sửa đổi (`Footer`, `WingsGroupContactSection`) là các Server Component hoặc client wrapper nhận props từ SSR layout.
  - Khi restart container production trong quá trình cutover (`docker compose up -d --force-recreate app`), in-memory cache được làm mới hoàn toàn.
  - File CSS và JS bundles được sinh với content-hash mới, đảm bảo trình duyệt client không bị cache stylesheet cũ.

---

## 4. Kế Hoạch Rollback & Khuyến Nghị Vận Hành

- **Khả năng Rollback Tức Thời (< 30s):**
  - Vì release này thuần túy là code giao diện và CSS, không có migration database:
  - Nếu có bất kỳ vấn đề phát sinh, chỉ cần trỏ lại symlink `current` về commit live `6a0dac0` và chạy:
    ```bash
    docker compose -f docker-compose.production.yml -p wingstravel --env-file /home/ubuntu/wings-travel/shared/.env up -d --no-deps --no-build --pull never --force-recreate app
    ```
- **Khuyến nghị Cutover:**
  1. Tiến hành đóng gói release sạch từ worktree candidate `us085-footer-20261023`.
  2. Thực hiện cutover container trên VPS Oracle Cloud ARM64.
  3. Kiểm tra health check: `curl -s http://127.0.0.1:3000/api/health/ready`.
  4. Xác nhận giao diện footer trên `wingsgroup.vn` (1 hotline, 1 email, không Zalo/CTA) và `wingsgo.vn` (giữ nguyên layout cũ).

---

## 5. Kết Luận Độc Lập

Candidate commit `d6057d4` trong worktree `deploy/oracle/us085-footer-20261023` giải quyết triệt để phản hồi của người dùng về việc tinh giản liên hệ cuối trang, đạt chất lượng code tối ưu, bảo toàn 100% tính cô lập giữa các site và vượt qua toàn bộ 59 component tests.

**Đánh giá:** Đạt chuẩn kỹ thuật để Root tiến hành release lên môi trường Production.
