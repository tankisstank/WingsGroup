# BIÊN BẢN CẬP NHẬT AUDIT PRE-RELEASE CMS UI/UX

**Ngày cập nhật:** 16/10/2026 (GMT+7)  
**Đối chiếu:** `docs/codex_final_audit_cms_ui_ux_prompt.md`, `git diff` hiện tại và mã nguồn Payload thực tế.

## Kết luận mới

**NO-GO có điều kiện; chưa đủ bằng chứng để đóng gói/bàn giao.** Hai blocker đã được xử lý đúng trong diff: selector native không còn bị ẩn toàn cục, và `hero.presentation` không còn `hidden: true`. Nhưng hai blocker còn lại chưa được chứng minh hoàn tất: navigation vẫn hardcode một phần và chưa có role/site gating; unit test mới không chạy được trong môi trường hiện tại.

## Bằng chứng kiểm tra

- `pnpm exec tsc --noEmit`: **PASS, exit 0**.
- `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/disableListColumn.unit.spec.ts`: **FAIL trước khi chạy test**, `Error: spawn EPERM` tại esbuild/Vite. Vì vậy chưa thể xác nhận tuyên bố “12/12 tests passed”.
- `custom.scss` hiện chỉ ẩn các link duplicate cụ thể trong `.nav__wrap` (Pages, Tour Products, Tour Curations, Posts, Media, Site Settings, Form Submissions) và vẫn giữ native `.nav__wrap`.
- `AdminNavIntro` hiện liệt kê Console, Site Review, Form Submissions, Pages, Tour Products, Tour Curations, Posts, Media, Page Wizard, Theme và Site Settings.
- `payload.config.ts` còn đăng ký các collection khác như `sites`, `theme-presets`, `hero-presentation-presets`, `departure-variants`, `tour-departures`, `tour-campaigns`, `categories`, `users` và globals `header`, `footer`; các mục này được để native render, phù hợp với hướng giữ server-side access control.
- `hero.presentation` hiện chỉ có `disableListColumn`/`disableListFilter` trong `admin`, không có `hidden: true`; dữ liệu legacy không bị xóa bởi diff.

## Đánh giá bốn blocker

### 1. `.nav__wrap` toàn cục — đã khắc phục

Diff không còn selector `display: none` trên toàn bộ `.nav__wrap`. Native Payload vẫn có thể render các collection/global không nằm trong rail tùy biến. Đây là thay đổi đúng hướng.

Cần vẫn kiểm tra browser để bảo đảm selector duplicate không vô tình che link có query/path tương tự và không che account/logout hoặc nhóm mobile.

### 2. Navigation/access control — chưa khắc phục đầy đủ

Việc rút gọn rail là an toàn hơn so với hardcode toàn bộ hệ thống, nhưng `AdminNavIntro` vẫn render link tĩnh mà không đọc `access.read`, `admin.hidden` hoặc site scope. Đây là UX risk và có thể tạo link tới route người dùng không được phép truy cập. Server Payload vẫn là hàng rào authorization, nhưng prompt yêu cầu “link dùng chung an toàn”; điều này chưa được chứng minh.

Các rủi ro cụ thể:

- Rail có `Form Submissions`, Pages, Tour Products, Curations, Posts, Media, Site Settings nhưng không có role-aware visibility.
- Native fallback vẫn cần được xác nhận là hiển thị đúng cho Users/Sites/Forms/Redirects và các collection còn lại; không được suy luận từ CSS.
- `mobileLinks = navigationGroups[0].links` khiến mobile chỉ có nhóm Vận hành; các link Nội dung/Cấu hình không xuất hiện trên mobile.
- `AdminStandaloneShell` vẫn là shell riêng với rail cố định, không chứng minh đồng bộ collapse/drawer/logout với Payload native.

**Điều kiện đóng P1:** browser smoke ở 375/768/1440px cho editor, site-manager và super-admin; xác nhận mỗi route được phép/không được phép; xác nhận native collection/global list còn truy cập được; kiểm tra logout, focus, Escape và active state.

### 3. Legacy resave — rủi ro đã giảm nhưng chưa đóng bằng chứng

Bỏ `hidden: true` là quyết định đúng: field vẫn hiện theo access/condition và Payload giữ đường tương thích khi resave. Cờ list/filter chỉ là metadata UI, không thay đổi API hay database schema.

Tuy nhiên, chưa có fixture before/after cho Page cũ chứa `hero.presentation`, bản localized, draft/version và `wingsGoTourCatalog.featuredTours`. Hook `validateWingsGoTourCatalog` vẫn đọc legacy `featuredTours`; phải chứng minh form save không gửi group rỗng/null làm mất giá trị và hook vẫn bảo vệ site/publish/departure constraints.

**Điều kiện đóng P1:** read → mở form → save không sửa field → đọc lại JSON và versions; lặp cho SQLite và PostgreSQL rehearsal, ít nhất một record mỗi site liên quan.

### 4. Unit test utility — chưa thể xác nhận

File `app/tests/unit/disableListColumn.unit.spec.ts` có các ca kiểm tra field đơn, group, tabs/blocks và array. Đây là coverage hợp lý về mặt tĩnh, nhưng runner hiện dừng ở `spawn EPERM`, nên báo cáo không được ghi “12/12 passed”. Cần sửa quyền/process của esbuild hoặc chạy runner tương đương được duyệt và lưu log mới.

## Rủi ro còn lại

| Mức | Finding | Trạng thái |
|---|---|---|
| P1 | Navigation rail chưa role/site-aware; mobile chỉ có nhóm Vận hành | Mở |
| P1 | Chưa có browser/access matrix và legacy resave proof | Mở |
| P1 | Unit test chưa chạy được (`spawn EPERM`) | Mở |
| P2 | Recursive utility chưa có schema boot test trên Payload runtime | Mở |
| P2 | Selector duplicate có thể lệ thuộc DOM/class của Payload khi nâng phiên bản | Mở |
| P2 | Standalone/native collapse, logout và mobile drawer chưa được chứng minh đồng nhất | Mở |
| P3 | Locale label, flat icon, guidance width/chip | Đã triển khai; cần visual QA |

## Quyết định phát hành

Giữ trạng thái **NO-GO** cho đến khi:

1. Chạy thành công `disableListColumn.unit.spec.ts` và test navigation hiện hữu.
2. Có browser smoke/access matrix cho ba role và ba viewport.
3. Có read/resave proof cho legacy fields và schema boot proof trên SQLite/PostgreSQL.
4. Xác nhận native `.nav__wrap` còn hiển thị đúng mọi collection/global cấp quyền.

**Chưa kiểm chứng:** browser/HTTP smoke, PostgreSQL rehearsal, ảnh Columns selector mới và DOM Payload runtime. Các tuyên bố “đã giải quyết triệt để” chỉ được coi là một phần đúng theo diff; chưa đủ làm bằng chứng release.
