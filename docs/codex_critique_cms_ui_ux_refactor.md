# BIÊN BẢN THAM VẤN & PHẢN BIỆN ĐỐI KHÁNG KIẾN TRÚC UI/UX CMS ADMIN WINGSTRAVEL

> **Thời gian:** 15/10/2026 23:14:00 (GMT+7)  
> **Thành phần:**  
> - **Chủ trì & Đề xuất:** Antigravity Agent  
> **Phản biện độc lập:** Codex Agent (CLI `codext`, Pane `wP:pE`)  
> **Tài liệu căn cứ:**  
> - Yêu cầu tham vấn: `docs/codex_consultation_cms_ui_ux_refactor_prompt.md`  
> - Báo cáo kiểm toán: `C:/Users/VIETD/.gemini/antigravity-cli/brain/ebb520b7-1f00-4fac-bad7-e579c9be7177/cms_ui_ux_audit_report.md`  
> - Mã nguồn đối chiếu: `app/src/payload.config.ts`, `app/src/collections/Pages/index.ts`, `app/src/components/AdminNavIntro`, `app/src/components/AdminStandaloneShell`, `app/src/fields/wingsSideHiFi.ts`, `app/src/fields/wingsGroupCorporateRoute.ts`, `app/tests/unit/adminNavigationChrome.unit.spec.ts`.

---

## 1. TỔNG QUAN KẾT LUẬN TỪ CODEX AGENT

Sau khi rà soát toàn bộ các module và chạy kiểm chứng mã nguồn, Codex Agent đưa ra đánh giá phản biện đối kháng cốt lõi như sau:

> *"Kết quả đối chiếu đã cho thấy kế hoạch hiện tại đúng ở việc nhận diện 'shell schism' và schema bleed, nhưng phương án thay toàn bộ Nav đang đánh đồng điều hướng với phân quyền dữ liệu. Các cờ UI của schema có thể triển khai an toàn trước; CustomAdminNav phải qua một spike tương thích Payload và kiểm tra quyền theo server trước khi được duyệt."*

---

## 2. PHÂN TÍCH CHI TIẾT THEO TỪNG CÂU HỎI ĐỐI KHÁNG

### Câu hỏi 1: Về việc thay thế `admin.components.Nav` trong Payload CMS 3.x
- **Nhận định phản biện của Codex:**
  - **RỦI RO CAO (P1): Đánh đồng điều hướng (Navigation UI) với phân quyền dữ liệu (Access Control).**
  - Thanh Sidebar mặc định của Payload CMS không đơn thuần là một mảng liên kết tĩnh. Nó được điều khiển bởi cơ chế Access Control động từ phía server (`access.read` của từng collection/global dựa trên phiên làm việc thực tế của user).
  - Nếu vội vàng tự xây dựng một component `CustomAdminNav` tĩnh hoặc chỉ dựa vào mảng vai trò client (`editor` vs `site-manager` vs `super-admin`), chúng ta có nguy cơ:
    1. Làm lộ các route hoặc tạo ảo giác người dùng có quyền vào các collection mà server chặn (hoặc ngược lại, giấu mất các collection mà họ được cấp quyền).
    2. Phá vỡ tính năng Mobile Drawer, route transition và các hook sự kiện gốc của Payload CMS 3.x.
    3. Gặp lỗi khi hệ thống sau này bổ sung thêm Collection mới nhưng `CustomAdminNav` chưa được cập nhật mảng cứng.
- **Khuyến nghị kiến trúc của Codex:**
  - **Tách làm 2 pha:**
    - **Pha A (Khắc phục ngay - Safe UI Remediations):** Giữ nguyên cấu trúc Nav gốc của Payload, tối ưu hóa CSS để ẩn các liên kết trùng lặp ở danh sách native bên dưới khi `AdminNavIntro` đã hiển thị. Bổ sung các collection còn thiếu (`tour-curations`, `posts`, `users`) vào `AdminNavIntro`.
    - **Pha B (Spike kiểm chứng tương thích):** Tạo một Spike kỹ thuật riêng để nghiên cứu cách nạp Payload Navigation Context vào `AdminStandaloneShell`, đảm bảo mọi liên kết đều được kiểm tra quyền theo server trước khi thay thế hoàn toàn Nav.

---

### Câu hỏi 2: Về việc thêm `admin.disableListColumn: true` vào Schema `Pages`
- **Nhận định phản biện của Codex:**
  - **AN TOÀN TUYỆT ĐỐI (P3 / Zero-Risk):**
  - Thuộc tính `disableListColumn: true` và `disableListFilter: true` là các cờ client-side UI config chính thức của Payload CMS 3.x.
  - **Không ảnh hưởng:**
    - Không ảnh hưởng đến bất kỳ hook nào (`beforeChange`, `afterChange`, `syncPagePathname`, `validateWingsSideHomeCuration`, `validateWingsGroupV3Governance`).
    - Không ảnh hưởng đến các truy vấn REST API, GraphQL hay Local API từ frontend (`payload.find({ collection: 'pages' })`).
    - **Không đòi hỏi bất kỳ migration database nào** (cả PostgreSQL production lẫn SQLite local đều không đổi schema bảng).
- **Khuyến nghị của Codex:**
  - Triển khai ngay lập tức cho toàn bộ các group/tab nội dung chuyên sâu: `wingsSideHiFi`, `wingsGroupCorporateRoute`, các trường chi tiết của `hero`, và các trường UI (`editorialGuidance`, `presentationGuide`).

---

### Câu hỏi 3: Về việc xử lý các trường Legacy (`hero.presentation`, `wingsGoTourCatalog.featuredTours`)
- **Nhận định phản biện của Codex:**
  - **KHUYẾN NGHỊ: Dùng `admin: { hidden: true }` thay vì xóa trường.**
  - Việc xóa trường trực tiếp trong code schema có thể khiến Payload bỏ qua hoặc xóa dữ liệu cũ khi một biên tập viên mở một trang cũ và nhấn Save (Data Loss risk).
  - Đặt `admin: { hidden: true }` đảm bảo:
    - Biên tập viên không còn nhìn thấy các trường này trên form soạn thảo cũng như trên menu cột.
    - Dữ liệu lịch sử đã lưu của các trang cũ vẫn được bảo tồn an toàn trong database cho đến khi có migration dọn dẹp dữ liệu chính thức.

---

### Câu hỏi 4: Về gói Chuẩn hóa Thị giác & Ngữ nghĩa P1
- **Nhận định phản biện của Codex:**
  - **AN TOÀN & KHUYẾN KHÍCH TRIỂN KHAI NGAY (P3 / Safe Quality Improvement):**
  - Nâng `max-width: 100%` cho `TourProductListGuidance` và chuyển nút sang dạng pill: Sửa đúng CSS token, không ảnh hưởng logic.
  - Chuẩn hóa `ENGLISH (en)` thành `Tiếng Anh (en)` trong `utilities/locales.ts`: Chỉ thay đổi nhãn hiển thị UI, không đổi mã locale code `'en'`.
  - Bỏ khung vuông nền teal đậm `[ ⊞ ]` của icon trên sidebar để chuyển sang Flat Icon: Giảm thiểu độ nặng nề thị giác, làm sắc nét icon Lucide.
  - Bổ sung `tour-curations` vào `AdminNavIntro`: Đảm bảo tính sẵn sàng của tính năng Curation vừa hoàn thành ở US-078.

---

## 3. THỐNG NHẤT KẾ HOẠCH HÀNH ĐỘNG (CONVERGED IMPLEMENTATION ROADMAP)

Dựa trên phản biện đối kháng của Codex, Antigravity Agent và Codex Agent thống nhất kế hoạch triển khai gồm **2 giai đoạn rõ ràng**:

### GIAI ĐOẠN 1: GÓI CHUẨN HÓA GIAO DIỆN & DỌN DẸP SCHEMA (TRIỂN KHAI NGAY)
1. **Dọn dẹp Menu "Hiển thị cột" (P1 - Cao):**
   - Thêm `admin: { disableListColumn: true, disableListFilter: true }` cho:
     - Toàn bộ tab `wingsSideHiFi` trong `app/src/fields/wingsSideHiFi.ts`.
     - Group `wingsGroupRoute` trong `app/src/fields/wingsGroupCorporateRoute.ts`.
     - Các trường con của `hero` trong `app/src/heros/config.ts`.
     - Các trường UI `editorialGuidance`, `presentationGuide`.
   - Đặt `admin: { hidden: true }` cho `hero.presentation` và `wingsGoTourCatalog.featuredTours`.
2. **Khắc phục Bất nhất Thị giác & Ngữ nghĩa (P1 - Cao):**
   - Đổi `.wings-admin-guidance` sang `max-width: 100%; width: 100%;` trong `app/src/app/(payload)/custom.scss`.
   - Đồng bộ style pill và đổi nhãn nút thành `⚠️ Chưa gán site` trong `app/src/components/AdminGuidance/TourProductListGuidance.tsx`.
   - Đổi `'ENGLISH (en)'` thành `'Tiếng Anh (en)'` trong `app/src/utilities/locales.ts`.
   - Chuẩn hóa text trong `app/src/components/AdminNavIntro/index.tsx`:
     - `Cấu hình site` (con) -> `Cài đặt site`.
     - `Theme & Hero` -> `Giao diện & Theme`.
     - `Console vận hành` -> `Bàn điều hành`.
     - Bổ sung `Bộ tour nổi bật` (`tour-curations`) vào nhóm *Nội dung*.
     - Bổ sung `Bài viết` (`posts`) và `Người dùng` (`users`) vào menu để triệt tiêu điểm mù điều hướng.
   - Bỏ viền và nền vuông teal `[ ⊞ ]` của `.wings-admin-nav-intro__icon` trong `custom.scss`, chuyển sang icon phẳng thanh thoát.
3. **Giảm thiểu Xung đột Sidebar 2 tầng (P1 - Cao):**
   - Sử dụng CSS trong `custom.scss` ẩn các mục collection gốc của Payload nếu mục đó đã có mặt trong `AdminNavIntro` phía trên (tránh lặp lại `Trang`, `Tour`, `Media` 2 lần).
   - Bổ sung chân trang (User info & nút Logout) vào `AdminStandaloneShell`.

### GIAI ĐOẠN 2: SPIKE KIẾN TRÚC THỐNG NHẤT HOÀN TOÀN NAV (GIAI ĐOẠN SAU)
- Nghiên cứu nạp Payload Navigation Context chính thống cho các Custom Views, kiểm tra phân quyền động theo server trước khi thay thế hoàn toàn `admin.components.Nav`.

---
*Biên bản này được lưu trữ chính thức tại `docs/codex_critique_cms_ui_ux_refactor.md` để làm căn cứ triển khai và kiểm toán phát hành.*
