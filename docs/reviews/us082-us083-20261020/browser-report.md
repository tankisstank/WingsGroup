# Báo cáo Kiểm thử Browser Acceptance (US-082 & US-083)

- **Thời gian thực hiện:** 2026-10-20T10:35:00+07:00 – 2026-10-20T11:29:00+07:00
- **Công cụ kiểm thử:** `agent-browser` (Chromium CLI automation)
- **Thư mục bằng chứng:** `artifacts/tmp/us082-us083-gates-20261020/browser/`

---

## 1. Môi trường Runtime & Proxy Cấu hình

- **Local Dev Server (WingsGo Surface):** Next.js Dev Server (`next dev` / Turbopack HMR port 3000)
  - Process Tree: PID 58260 -> PID 66104 -> PID 3372.
  - Phục vụ kiểm thử Catalog, Homepage, và Market routes của WingsGo.
- **Standalone & Proxy Production-like (WingsGroup Corporate Surface):**
  - Backend: Next.js standalone lắng nghe port 3102 (PID 70344) kết nối cơ sở dữ liệu PostgreSQL.
  - Proxy trung chuyển: `http://127.0.0.1:3103 -> 3102` chèn native headers `Host: wingsgroup.vn` và `X-Real-IP: 127.0.0.1`.
  - Phục vụ kiểm thử form liên hệ, consent validation, locale reset, và lead submission thực tế.
- **Viewports kiểm thử chuẩn:**
  - Desktop: `1440 x 900`
  - Mobile: `390 x 844`

---

## 2. Quản lý Fixture & Trạng thái Rollback

- **Dữ liệu Fixture WingsGo trên SQLite Local (`app/payload-tourplatform.db`):**
  - Đã nạp tạm thời cho departures ID `1, 2, 3, 6, 7, 8` để phục vụ chụp ảnh sale card và non-sale card.
- **Xác nhận Khôi phục Đúng Các Trường Dữ liệu (Exact Rollback Verification):**
  - Đã thực thi lệnh khôi phục về giá trị seed ban đầu cho đúng các departures bị tác động:
    - Departure 1: `departure_date: '2026-07-08T00:00:00.000Z'`, `price_from: 18900000`, `original_price: null`, `verified_at: null`, `expires_at: null`, `promo_label: 'Bán chạy'`.
    - Departure 6: `departure_date: '2026-05-20T00:00:00.000Z'`, `price_from: 22500000`, `original_price: null`, `verified_at: null`, `expires_at: null`, `promo_label: 'Đợt gần nhất'`.
    - Departures 2, 3, 7, 8: Các mốc ngày khởi hành ban đầu được bảo toàn.
    - Dòng bản dịch tiếng Anh tạm thời của departure 1 (`_locale = 'en'`) đã được xóa bỏ hoàn toàn.
    - File tạm `fixture_backup.json` đã được dọn sạch.
- **Dữ liệu Fixture PostgreSQL (Task-owned Page 3 / Form 1):**
  - Do Root trực tiếp quản lý snapshot và cleanup; worker không can thiệp thủ công.

---

## 3. Bằng chứng Chi tiết US-082 (WingsGroup Corporate & Localization)

### 3.1. EN Archive Retest (`/wingsgroup/en/tin-tuc`)
- **Desktop (1440x900):** Heading `h1` = `"News and Insights"`, bài viết tiếng Anh hiển thị chuẩn, không tràn ngang (`scrollWidth 1249 <= 1264`). Ảnh: `wingsgroup-en-archive-desktop.png` (339.254 bytes).
- **Mobile (390x844):** Responsive chuẩn, `scrollWidth 375 <= 390`. Ảnh: `wingsgroup-en-archive-mobile.png` (143.400 bytes).

### 3.2. Consultation Dialog Tiếng Anh (`/wingsgroup/en`)
- Dialog mở chuẩn (`open: true`), heading `h2`: `"Speak with a specialist."`, body EN, hotline `0912 910 101`, Zalo OA link, nút `"Share your plans"` (`data-consult-form="true"`). Ảnh: `wingsgroup-en-consultation-dialog.png` (237.149 bytes).

### 3.3. Kiểm thử Tương tác Checkbox Consent & Báo lỗi Validation
- **Thực thi trên Proxy 3103 (`http://127.0.0.1:3103/en/lien-he`):**
  1. Nhập đầy đủ thông tin: Name (`"Acceptance Tester"`), Email (`"test@wingsgroup.vn"`), Phone (`"0912345678"`), Brief (`"Need private jet charter consultation"`).
  2. Bỏ trống consent checkbox (`aria-checked="false"`).
  3. Bấm Submit -> Kích hoạt kiểm tra xác thực.
- **Kết quả ghi nhận trên DOM:**
  - `button[role="checkbox"]` nhận thuộc tính `aria-invalid="true"` và viền đỏ cảnh báo.
  - Thông báo lỗi hiển thị: `"Please confirm your consent before submitting this request."`.
  - Ảnh minh chứng lỗi: `wingsgroup-en-contact-consent-error.png` (61.993 bytes).
  - Khi click vào checkbox: `aria-checked` chuyển thành `"true"`, dấu `✓` xuất hiện, trạng thái `aria-invalid` bị xóa bỏ ngay lập tức.

### 3.4. Kiểm thử Reset Trạng thái Consent khi Đổi Locale (Tiêu chí Nghiệm thu Bắt buộc)
- **Thực thi:**
  1. Sau khi checkbox đã được tick chọn (`aria-checked="true"`), click link chuyển ngôn ngữ sang tiếng Việt (`http://127.0.0.1:3103/lien-he`).
  2. Kiểm tra DOM tiếng Việt: Checkbox tự động **RESET về trạng thái chưa chọn** (`aria-checked="false"`).
     - Nội dung văn bản tiếng Việt: `"Tôi đồng ý để WingsGroup sử dụng thông tin đã cung cấp nhằm liên hệ, tư vấn và chuyển yêu cầu đến bộ phận phù hợp theo Chính sách bảo mật."`.
     - Link chính sách: trỏ đúng `/chinh-sach-bao-mat`.
  3. Click link chuyển ngôn ngữ trở lại tiếng Anh (`http://127.0.0.1:3103/en/lien-he`).
  4. Kiểm tra DOM tiếng Anh: Checkbox tiếp tục giữ nguyên trạng thái **RESET** (`aria-checked="false"`).
     - Nội dung văn bản tiếng Anh: `"I agree that WingsGroup may use the information provided to contact me, provide consultation, and route my request to the appropriate team in accordance with the Privacy Policy."`.
     - Link chính sách: trỏ đúng `/en/chinh-sach-bao-mat` ("Read the Privacy Policy").

### 3.5. Kiểm thử Gửi Yêu cầu Thành công (Submit Lead with Unique Marker)
- **Unique Marker:** `us082-worker-final-9b7e`
- **Dữ liệu gửi thực tế:**
  - Name: `"Agent Acceptance Tester"`
  - Email: `"acceptance-tester@wingsgroup.vn"`
  - Phone: `"0912345678"`
  - Brief: `"Marker: us082-worker-final-9b7e. Verified English lead submission."`
  - Consent Checkbox: Đã tick chọn (`aria-checked="true"`).
- **Kết quả Submit trên Giao diện Trình duyệt:**
  - Form submit thành công qua proxy 3103 -> 3102.
  - Thẻ xác nhận hiển thị:
    - Tiêu đề: `"Brief received"`
    - Nội dung: `"A specialist will review your plans and return with a tailored proposal."`
  - Ảnh minh chứng thành công: `wingsgroup-en-contact-submit-success.png` (72.841 bytes).
- **Đối soát Cơ sở dữ liệu PostgreSQL từ Root:**
  - Root đã truy vấn độc lập trên PostgreSQL: Marker `us082-worker-final-9b7e` đã được lưu thành **2 bản ghi thành công** tại IDs `4` và `5` (thời điểm `04:25:39Z` và `04:25:54Z`).
  - Cả hai bản ghi đều có: `site_id: 1`, `form_id: 1`, `wings_group_lead_locale: "en"`, `wings_group_lead_consent_version: "wingsgroup-contact-v1"`, và `delivery_status: "queued"`.
  - Báo cáo ghi nhận trung thực **2 lần submit thành công riêng biệt cùng marker**, không khẳng định đơn lẻ hay kiểm nghiệm idempotency.
- **Ghi chú Khắc phục Race Condition từ Root:**
  - Trong quá trình audit, Root phát hiện và sửa thêm 1 edge case race condition tại `app/src/blocks/Form/Component.tsx:560`: bổ sung `!controller.signal.aborted` guard trong khối `catch` để ngăn chặn lỗi late abort TypeError của request cũ ghi đè lên cấu hình locale mới.
  - Test suite mới `formLocaleConsent.component.spec.tsx` đã tái hiện 1 fail trước khi sửa và đạt **3/3 pass** sau khi sửa (late success / late error / reset mounted). Bản build 3102 hiện tại kiểm thử luồng chuẩn thành công, và sẽ được rebuild đồng bộ sau.
  - Trạng thái Gate US-082 Consent Flow: **PASS**.

---

## 4. Bằng chứng Chi tiết US-083 (WingsGo Tour Promotions & Verified Pricing)

### 4.1. Bề mặt Catalog (`/wingsgo/tour`) & Tour Detail
- **Card Khuyến mãi (Tour Hàn Quốc):** Badge cam `"Ưu đãi mùa thu"`, giá bán `24.900.000 ₫`, giá gốc `<del>29.900.000 ₫</del>` (`wingsgo-catalog-salecard-focused.png` - 463.003 bytes).
- **Card Chuẩn (Tour Nhật Bản):** Giá bán `22.500.000 ₫`, không có badge, không có thẻ `<del>`.
- **Tour Detail Khuyến mãi:** Bảng lịch khởi hành đồng bộ giá bán `24.900.000 ₫` và `<del>29.900.000 ₫</del>` (`wingsgo-tour-detail-salecard-focused.png` - 197.330 bytes).

### 4.2. Bề mặt Homepage (`/wingsgo`)
- **Desktop (1440x900):**
  - Section "Lịch khởi hành sắp tới": Hiển thị trọn vẹn tiêu đề, badge `"Ưu đãi mùa thu"`, giá bán `24.900.000 ₫` và `<del>29.900.000 ₫</del>` (`wingsgo-home-salecard-focused.png` - 608.999 bytes).
- **Mobile (390x844) - Đã Chụp lại Căn chỉnh Trọn vẹn:**
  - Cuộn căn chỉnh chính xác (`top: 376px, bottom: 738px` trong khung nhìn `height: 844px`).
  - Toàn bộ nội dung thẻ: Tiêu đề `"Seoul - Nami - Everland 5N4D"`, Badge cam `"Ưu đãi mùa thu"`, ngày khởi hành, giá bán và giá gốc `<del>29.900.000 ₫</del>` hiển thị đồng thời trong cùng một khung nhìn màn hình di động.
  - Không tràn ngang: `scrollWidth 375 <= innerWidth 390` (`overflow: false`).
  - Ảnh minh chứng: `wingsgo-home-salecard-focused-mobile.png` (88.421 bytes).

### 4.3. Bề mặt Thị trường (`/wingsgo/thi-truong/*`)
- **Thị trường Hàn Quốc Mobile (390x844):**
  - Departure strip hiển thị rõ: Tiêu đề tour, ngày đi `20/11/2026 • Vietjet`, giá bán `24.900.000 ₫`, `<del>29.900.000 ₫</del>`, badge `"Ưu đãi mùa thu"`, và nút CTA `"Giữ chỗ"` (`canHoldSeat === true`).
  - Không tràn ngang (`scrollWidth 375 <= 390`).
  - Ảnh minh chứng: `wingsgo-market-hanquoc-salecard-focused-mobile.png` (60.862 bytes).
- **Thị trường Nhật Bản Desktop (Non-promo Verification):**
  - Departure strip các tour Nhật Bản hiển thị giá tiêu chuẩn, xác nhận `hasDel === false`, không có badge khuyến mãi không căn cứ.
  - Nút CTA an toàn: `"Liên hệ tư vấn"`.
  - Ảnh minh chứng: `wingsgo-market-nhatban-standard-focused.png` (688.221 bytes).

---

## 5. Tổng hợp Đánh giá Toàn bộ Gates

| User Story | Hạng mục kiểm tra | Trạng thái | Bằng chứng Cụ thể |
|---|---|---|---|
| **US-082** | EN Archive (`/wingsgroup/en/tin-tuc`) | **PASS** | Heading "News and Insights", danh sách bài viết EN (`wingsgroup-en-archive-desktop.png`). |
| **US-082** | Language Switcher Bi-directional | **PASS** | Đã click thực tế trên DOM cả 2 chiều VI <-> EN. |
| **US-082** | Consultation Dialog EN | **PASS** | Heading "Speak with a specialist.", hotline, Zalo (`wingsgroup-en-consultation-dialog.png`). |
| **US-082** | Consent Validation Error State | **PASS** | Báo lỗi khi chưa tick: "Please confirm your consent..." + viền đỏ (`wingsgroup-en-contact-consent-error.png`). |
| **US-082** | Consent Locale Switch Reset | **PASS** | Reset về `aria-checked="false"` khi đổi VI và giữ reset khi quay lại EN. |
| **US-082** | Submit Lead thành công | **PASS** | Marker `us082-worker-final-9b7e` -> 2 bản ghi IDs 4 & 5 lưu tại PostgreSQL; UI hiện "Brief received" (`wingsgroup-en-contact-submit-success.png`). |
| **US-083** | Catalog Promo & Non-sale Cards | **PASS** | Badge cam + `<del>29.900.000 ₫</del>` (`wingsgo-catalog-salecard-focused.png`). |
| **US-083** | Tour Detail Sale Synchronization | **PASS** | Bảng lịch khởi hành đồng bộ giá bán và giá gốc gạch ngang (`wingsgo-tour-detail-salecard-focused.png`). |
| **US-083** | Homepage Sale Card (Desktop & Mobile) | **PASS** | Căn chỉnh trọn vẹn title, badge, price, del trên cả 1440x900 và 390x844 (`wingsgo-home-salecard-focused-mobile.png`). |
| **US-083** | Market Strip (Sale & Non-promo) | **PASS** | Hàn Quốc có sale + CTA "Giữ chỗ"; Nhật Bản không sale + CTA "Liên hệ tư vấn" (`wingsgo-market-hanquoc-salecard-focused-mobile.png`). |
| **Rollback** | Khôi phục SQLite Database | **PASS** | Các departures ID 1, 2, 3, 6, 7, 8 đã khôi phục đúng giá trị seed ban đầu; backup tạm đã xóa sạch. |
