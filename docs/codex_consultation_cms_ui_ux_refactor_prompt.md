# YÊU CẦU THAM VẤN & PHẢN BIỆN ĐỐI KHÁNG KIẾN TRÚC UI/UX CMS ADMIN WINGSTRAVEL

> **Đối tượng tham vấn:** Codex Agent (Independent Architectural & QA Reviewer)  
> **Dự án:** WingsTravel Multisite Platform (`app/`, Payload CMS 3.x, Next.js App Router)  
> **Mục tiêu:** Phản biện đối kháng chuyên sâu (Adversarial Critique & Architectural Review) về các phát hiện kiểm toán UI/UX CMS Admin và kế hoạch chuẩn hóa toàn diện giao diện trước khi triển khai.

---

## 1. BỐI CẢNH & TỔNG QUAN PHÁT HIỆN KIỂM TOÁN

Qua quá trình rà soát mã nguồn thực tế và kiểm tra ảnh chụp giao diện từ người dùng trên môi trường vận hành, hệ thống CMS Admin của WingsTravel bộc lộ **3 vấn đề kiến trúc & thị giác nghiêm trọng**:

---

### VẤN ĐỀ 1: SỰ PHÂN MẢNH KIẾN TRÚC SIDEBAR (SIDEBAR MORPHING & SHELL SCHISM)
- **Hiện tượng:** Khi người dùng chuyển qua lại giữa các menu trong CMS Admin, thanh Sidebar điều hướng bị thay đổi cấu trúc, giao diện và danh sách mục một cách giật cục.
- **Nguyên nhân gốc rễ:** Hệ thống đang tồn tại 2 cơ chế dựng layout song song:
  1. **Khung tùy biến (`AdminStandaloneShell`):** Dùng cho 4 view custom (`/admin/console`, `/admin/theme`, `/admin/site-review`, `/admin/page-wizard`). Sidebar ở đây là một thẻ `<aside>` riêng biệt bọc duy nhất `AdminNavIntro` (chỉ có 10 link cố định). Hoàn toàn không có Logo chính thức, không có nút Hamburger thu gọn sidebar, không có danh sách các Collection gốc của Payload, và **hoàn toàn không có nút Đăng xuất / User Profile** ở chân sidebar!
  2. **Khung gốc Payload (`Payload Default Layout`):** Dùng cho `/admin`, `/admin/collections/*`, `/admin/globals/*`. Payload cắm `AdminNavIntro` vào hook `beforeNav`, rồi tiếp tục render danh sách Collection mặc định của Payload ngay bên dưới.
- **Hệ quả tiêu cực:**
  - **Nhân đôi menu ở trang Native:** Ở trên có `Quản lý trang`, `Quản lý tour`, `Thư viện media` (từ `AdminNavIntro`); ở dưới lại lặp lại `Trang`, `Tour`, `Media` (từ Payload).
  - **Mất dấu và cụt đường điều hướng ở trang Custom:** Khi ở Console hay Theme, các collection quan trọng như `tour-curations` (Bộ tour nổi bật), `posts` (Bài viết), `users` (Người dùng), `categories` (Danh mục) biến mất hoàn toàn, người dùng bị mắc kẹt không thể điều hướng trực tiếp sang đó.
  - **Lệch pha trạng thái thu gọn:** Trang native cho phép bấm Hamburger thu gọn về thanh icon ~60px, nhưng vừa bấm vào Console hay Theme thì sidebar bị bung to giật cục về 258px cố định.
  - **Nhân đôi trạng thái active:** Khi vào Tour Products, cả `Quản lý tour` ở trên và `Tour` ở dưới đều cùng sáng đèn nhưng với 2 phong cách đồ họa khác nhau (1 bên nền phẳng, 1 bên vạch viền cam).

---

### VẤN ĐỀ 2: Ô NHIỄM MENU "HIỂN THỊ CỘT" TRANG DANH SÁCH (>100 CHIP RÁC THỊ GIÁC / SCHEMA BLEED)
- **Hiện tượng:** Khi người dùng mở menu "Hiển thị cột" (Columns) trên trang danh sách Trang (`/admin/collections/pages`), hệ thống mở ra một danh sách chứa **hơn 100 chip lựa chọn**, gây choáng ngợp và tê liệt khả năng cấu hình cột.
- **Nguyên nhân gốc rễ:** Collection `Pages` đang đóng vai trò là "chiếc túi đa năng" gánh toàn bộ schema của cả 3 site:
  - Tab `wingsSideHiFi`: Chứa toàn bộ nội dung cố định của 8 trang hub inbound đặc thù (`Home`, `Plan your trip`, `Destinations`, `Styles`, `Packages`, `Travel guide`, `About us`, `Contact us`) với hàng chục trường con (Eyebrow, Title, Kicker, Lede, Badge, Cards...).
  - Nhóm `wingsGroupRoute`: Chứa các trường phê duyệt pháp lý của WingsGroup (`Policy approval > Legal owner`, `Legal entity`, `Scope`, `Effective date`, `Version`...).
  - Nhóm `hero`: Chứa các trường video, slide, override chuyển động...
  - Các component UI hướng dẫn: `Editorial Guidance`, `Presentation Guide`.
  Payload CMS 3.x tự động duyệt đệ quy qua toàn bộ schema và flatten tất cả các trường con ra menu "Hiển thị cột" do các trường này chưa được cấu hình chặn.
- **Bản chất dữ liệu:** Đa phần (>90%) là dữ liệu đang dùng cho public website ngoài frontend, nhưng là "rác thị giác" 100% đối với bảng danh mục quản trị cấp cao. Ngoài ra có khoảng 10% là trường legacy cũ (`hero.presentation`, `wingsGoTourCatalog.featuredTours`).

---

### VẤN ĐỀ 3: CÁC ĐIỂM BẤT NHẤT THỊ GIÁC & NGỮ NGHĨA P1 (VISUAL & SEMANTIC DRIFT)
- Thẻ hướng dẫn `TourProductListGuidance` bị ép cụt `max-width: 520px` tại `custom.scss:1512`, chiếm <40% chiều ngang, lệch trục viền trái so với `ContentLocaleControl` và bảng dữ liệu.
- Chip nút lọc của Guidance bo góc tự do, chưa đồng bộ token chuẩn `--wings-admin-radius-pill` như hàng ngôn ngữ. Nhãn nút cuối ghi câu lệnh dài dòng `Lọc nhanh: site chưa gán`.
- File `locales.ts` để nhãn tiếng Anh là `ENGLISH (en)` (VIẾT HOA TOÀN BỘ bằng tiếng Anh), trong khi tất cả các ngôn ngữ khác đều là tiếng Việt viết hoa chữ cái đầu (`Tiếng Việt (vi)`, `Tiếng Ý (it)`...).
- Menu `AdminNavIntro`: Trùng lặp từ vựng nhóm và con (`CẤU HÌNH SITE` > `Cấu hình site`); lai tạp tiếng Anh (`Theme & Hero`, `Console vận hành`); lai tạp động từ trong nhóm danh từ (`Tạo trang nhanh` nằm trong `Nội dung`); mọi icon bị đóng hộp vuông teal đậm `[ ⊞ ]` dày đặc làm sidebar thô cứng; thiếu lối tắt vào `tour-curations`.

---

## 2. ĐỀ XUẤT GIẢI PHÁP & PHƯƠNG HƯỚNG TRIỂN KHAI

### Giải pháp Kiến trúc Sidebar (Phương án 1):
- Xây dựng một component điều hướng thống nhất `CustomAdminNav` thay thế hoàn toàn `admin.components.Nav` mặc định của Payload trong `payload.config.ts`.
- Nhúng component `CustomAdminNav` này vào cả `AdminStandaloneShell` (dùng chung cho cả Custom Views lẫn Native Views).
- Cấu trúc `CustomAdminNav`:
  - Header: Logo WingsGroup chuẩn + nút Hamburger thu gọn/mở rộng sidebar (đồng bộ và lưu trạng thái vào cookie/localStorage).
  - Body: Hệ thống nhóm danh mục phân tầng chuẩn:
    - *Vận hành:* Bàn điều hành (`/admin/console`), Rà soát site (`/admin/site-review`), Lead gửi về (`form-submissions`).
    - *Nội dung:* Quản lý trang (`pages`), Quản lý tour (`tour-products`), Bộ tour nổi bật (`tour-curations`), Thư viện media (`media`), Bài viết (`posts`), Danh mục (`categories`), Trình tạo trang (`page-wizard`).
    - *Cấu hình site:* Giao diện & Theme (`/admin/theme`), Cài đặt site (`site-settings`), Cấu hình Header (`header`), Footer (`footer`).
    - *Hệ thống:* Nhập / xuất dữ liệu (`imports`), Quản trị người dùng (`users`), Điều hướng URL (`redirects`).
  - Phân quyền (Role-gating): Chỉ hiển thị các mục tương ứng với quyền hạn của user đang đăng nhập (`editor` vs `site-manager` vs `super-admin`).
  - Footer: User info (Avatar/Tên/Email) và nút Đăng xuất (Logout) an toàn.
  - Loại bỏ hoàn toàn sự nhân đôi menu 2 tầng và triệt tiêu khác biệt layout khi chuyển view.

### Giải pháp Dọn dẹp Menu Cột:
- Thêm thuộc tính `admin: { disableListColumn: true, disableListFilter: true }` vào:
  - Tab `wingsSideHiFi`
  - Group `wingsGroupCorporateRoute`
  - Các trường con chi tiết của `hero`
  - Các component UI (`editorialGuidance`, `presentationGuide`)
- Đặt `admin: { hidden: true }` cho các trường legacy thừa: `hero.presentation`, `wingsGoTourCatalog.featuredTours`.
- Bảng danh mục Trang sẽ chỉ giữ lại đúng 7-8 cột metadata cấp cao: *Tiêu đề*, *Site*, *Đường dẫn*, *Trang cha*, *Ngày cập nhật*, *Trạng thái*, *ID*.

### Giải pháp Chuẩn hóa Thị giác & Ngữ nghĩa:
- Nâng `max-width: 100%` cho `TourProductListGuidance`, dùng chung style pill cho nút lọc và đổi nhãn thành `⚠️ Chưa gán site`.
- Đổi `'ENGLISH (en)'` thành `'Tiếng Anh (en)'` trong `utilities/locales.ts`.
- Bỏ khung vuông nền teal của icon trên sidebar, chuyển sang phong cách Flat Icon thanh thoát; làm rõ active state bằng viền trái màu cam thương hiệu.

---

## 3. CÂU HỎI PHẢN BIỆN ĐỐI KHÁNG YÊU CẦU CODEX ĐÁNH GIÁ (ADVERSARIAL CRITIQUE)

Đề nghị Codex Agent đóng vai trò phản biện độc lập, mổ xẻ khắt khe kế hoạch trên và trả lời chi tiết các câu hỏi trọng tâm sau:

1. **Về việc thay thế `admin.components.Nav` trong Payload CMS 3.x:**
   - Việc thay thế hoàn toàn Nav mặc định của Payload bằng `CustomAdminNav` có tiềm ẩn rủi ro phá vỡ (breaking changes) các tính năng gốc của Payload không (ví dụ: route transition, mobile drawer, access control check khi có collection mới được thêm vào hệ thống)?
   - Làm thế nào để `CustomAdminNav` tự động nhận biết danh sách Collection được cấp phép (permitted collections) từ Payload Access Control mà không phải hardcode danh sách quyền tĩnh trong component?
   - Cần cơ chế gì để xử lý trạng thái thu gọn (collapsed/expanded) giữa client và server để tránh giật giao diện (layout shift / flash of unstyled content)?

2. **Về việc thêm `admin.disableListColumn: true` vào Schema `Pages`:**
   - Việc thêm `disableListColumn` và `disableListFilter` có ảnh hưởng nào đến:
     a) Các hook hiện tại của `Pages` (`beforeChange`, `afterChange`, `syncPagePathname`, `validateWingsSideHomeCuration`)?
     b) Truy vấn REST API hoặc Local API từ frontend Next.js (`payload.find({ collection: 'pages' })`)?
     c) Có đòi hỏi phải chạy migration database (PostgreSQL/SQLite) hay không?

3. **Về các trường Legacy và Tương thích ngược:**
   - Trường `hero.presentation` và `wingsGoTourCatalog.featuredTours` nếu chỉ ẩn bằng `admin: { hidden: true }` thì các bản ghi cũ trong database có bị ảnh hưởng khi resave form không?

4. **Đánh giá Rủi ro & Khuyến nghị Bổ sung:**
   - Kế hoạch trên có điểm mù (blind spot) hoặc rủi ro tiềm ẩn nào về hiệu năng, SEO, hay độ ổn định của hệ thống đa site không?
   - Hãy xếp hạng các hạng mục theo độ rủi ro (P1: Rủi ro cao, P2: Rủi ro trung bình, P3: An toàn) và đưa ra các khuyến nghị bảo vệ an toàn hệ thống trước khi bắt tay vào code.

---
*Vui lòng phản hồi chi tiết, thẳng thắn, mang tính phản biện xây dựng và đưa ra khuyến nghị kỹ thuật cụ thể.*
