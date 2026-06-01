# CMS UI/UX Audit - 2026-05-29

## Scope

Audit bằng Playwright trên local CMS:

- Dashboard: `/admin`
- Pages list: `/admin/collections/pages`
- Page edit: `/admin/collections/pages/12`
- Leads: `/admin/collections/form-submissions`
- Import create: `/admin/collections/imports/create`
- Viewports: `1440x900`, `1024x768`, `390x844`

Góc nhìn: người dùng vận hành nội dung, ít kinh nghiệm kỹ thuật.

## Findings

### P0 - Không có blocker runtime hiện tại

- Dashboard, Pages list, Page edit và public frontend đều load được.
- Page edit `/admin/collections/pages/12` không còn lỗi chunk/static.
- Console không còn error sau khi standalone server chạy đúng thư mục và static assets được copy đủ.

### P1 - Điều hướng vẫn mang nhiều thuật ngữ kỹ thuật

Sidebar còn nhiều nhãn tiếng Anh hoặc nhãn Payload-native:

- `Collections`
- `Globals`
- `Redirects`
- `Search Results`
- `Site Platform`
- `Content`
- `Assets`
- `Governance`
- `Lead Capture`
- `Data Management`
- `Form Submissions`
- `Imports`
- `Exports`

Với editor/site manager không kỹ thuật, các nhãn này chưa nói rõ việc cần làm.

Đề xuất:

- Đưa nhóm nghiệp vụ lên trước: `Nội dung`, `Lead`, `Media`, `Cấu hình site`.
- Đổi label sang tiếng Việt:
  - `Pages` -> `Trang`
  - `Posts` -> `Bài viết`
  - `Media` -> `Thư viện ảnh`
  - `Form Submissions` -> `Lead gửi về`
  - `Imports` -> `Nhập dữ liệu`
  - `Exports` -> `Xuất dữ liệu`
  - `Users` -> `Người dùng`
- Ẩn hoặc hạ nhóm kỹ thuật như `Redirects`, `Search Results`, `Globals` khỏi editor nếu không cần dùng hằng ngày.

### P1 - Dashboard dài và chưa đủ định hướng hành động

Dashboard có số liệu thật, nhưng trên desktop nội dung kéo dài hơn 2 màn hình. Người dùng mới phải đọc nhiều trước khi biết nên làm gì tiếp.

Đề xuất:

- Đưa 3 hành động chính lên đầu:
  - `Tạo trang`
  - `Xem lead mới`
  - `Duyệt bản nháp`
- Thêm khu `Việc cần làm hôm nay` chỉ hiển thị các item có số lượng > 0.
- Gom các metric ít quan trọng vào nhóm thu gọn.
- Đổi các metric sang tiếng Việt hoàn toàn và thống nhất số ít/số nhiều.

### P1 - Màn hình Lead rỗng gây hiểu nhầm

`/admin/collections/form-submissions` hiển thị:

- `No Results.`
- `Either none exist or none match the filters you've specified above.`
- `Create new Form Submission`

Với người dùng vận hành, lead không nên được tạo thủ công trong CMS. Empty state này dễ làm họ nghĩ hệ thống chưa hoạt động hoặc cần bấm tạo lead.

Đề xuất:

- Đổi empty state thành tiếng Việt: `Chưa có lead gửi về`.
- Thêm mô tả: `Lead sẽ tự xuất hiện khi khách gửi form trên website.`
- Ẩn hoặc hạn chế nút `Create new Form Submission` nếu không có nhu cầu nhập lead thủ công.
- Thêm cột dễ đọc hơn: `Ngày gửi`, `Form`, `Site`, `Email/Số điện thoại` nếu có.

### P1 - Import/Export có rủi ro cao nhưng thiếu hướng dẫn

Màn hình import hiện có:

- `[Untitled]`
- `Start Import`
- `Or Drag and drop a file`
- `Upload a file to see preview`

Không có cảnh báo về phạm vi dữ liệu, định dạng file, rollback, hay ảnh hưởng đến site.

Đề xuất:

- Thêm banner cảnh báo trước import: import có thể tạo/sửa dữ liệu.
- Ghi rõ collection được phép import.
- Thêm link tải file mẫu.
- Đổi copy sang tiếng Việt.
- Chỉ cho `site-manager` import nội dung thuộc site được giao; thao tác toàn hệ nên dành cho `super-admin`.

### P2 - Page edit còn quá nhiều thuật ngữ kỹ thuật

Màn hình edit page còn các mục khó hiểu:

- `Slug`
- `Parent Page`
- `Related Pages`
- `Versions`
- `API`
- `Live Preview`
- `Published At`
- `Revert to published`

Các mục này đúng về kỹ thuật, nhưng cần ngôn ngữ vận hành.

Đề xuất:

- Đổi field label/help text sang tiếng Việt:
  - `Slug` -> `Đường dẫn`
  - `Parent Page` -> `Trang cha`
  - `Related Pages` -> `Trang liên quan`
  - `Published At` -> `Ngày xuất bản`
  - `Live Preview` -> `Xem thử trực tiếp`
- Ẩn tab `API` khỏi editor/site-manager nếu không cần.
- Thêm helper cạnh nút publish: `Editor không thể publish; hãy lưu nháp để site manager duyệt.`

### P2 - Ngôn ngữ giao diện chưa nhất quán

Locale đã là `Tiếng Việt`, nhưng nhiều phần admin vẫn tiếng Anh do đến từ Payload/plugin.

Đề xuất:

- Ưu tiên Việt hóa các nhãn xuất hiện trong luồng chính:
  - sidebar
  - list headers
  - empty states
  - action buttons
  - dashboard cards
- Các phần kỹ thuật sâu có thể để tiếng Anh ở phase sau.

### P2 - Responsive mobile không phải blocker nhưng chưa tối ưu

Ở viewport `390x844`, dashboard vẫn dùng được nhưng:

- sidebar mở chiếm toàn màn hình và dài.
- nội dung dashboard rất dài.
- thao tác edit page trên mobile/tablet nhỏ không phù hợp.

Đề xuất:

- Xem mobile là chế độ kiểm tra nhanh, không phải chế độ biên tập chính.
- Ưu tiên tối ưu laptop/tablet ngang từ `1024px` trở lên.
- Trên mobile, dashboard nên chỉ hiển thị số liệu và quick actions, không hiển thị toàn bộ cards.

## Recommended Next Work

1. Thêm wizard tạo trang nhanh để editor dựng trang theo từng bước thay vì bắt đầu từ form trống. - Đã implement trong US-012.
2. Việt hóa và sắp xếp lại sidebar theo nghiệp vụ. - Đã implement trong US-013 ở mức collection labels/groups và role-aware visibility.
3. Tạo empty state riêng cho lead, import/export. - Đã implement guidance banner cho lead và data exchange trong US-013.
4. Thêm guidance/risk banner cho import/export. - Đã implement trong US-013.
5. Việt hóa label/help text quan trọng trong Page edit. - Đã implement trong US-013.
6. Ẩn các bề mặt kỹ thuật (`API`, một số collection hệ thống) khỏi role không cần dùng. - Đã implement theo role ở nav/collection visibility trong US-013.
7. Tạo script start local production đúng chuẩn: build, copy static/public vào standalone, start với DB writable. - Đã implement `scripts/start-local-production.ps1`.

## Implementation Status - 2026-05-29

Đã implement toàn bộ backlog audit ở mức phase hiện tại:

- `/admin/console` custom operator console cho người vận hành.
- Role-aware navigation và visibility: editor ít bề mặt kỹ thuật hơn, site-manager có import/export, super-admin có Advanced.
- Lead guidance tiếng Việt trên `Lead gửi về`.
- Import/export guidance, cảnh báo rủi ro và sample files.
- Page edit guidance về luồng draft/publish.
- Local production start script cho standalone mode.

Mở rộng bổ sung ngày 2026-06-01:

- Quick Page Wizard được mở rộng thành bộ template nâng cao cho các use-case
  nội dung của hệ sinh thái WingsTravel (home/about/service/tour/destination/
  insurance/lead/contact/campaign).

Validation:

- `pnpm exec tsc --noEmit` passed.
- `pnpm run lint` passed.
- `pnpm run generate:importmap` passed.
- `npm run build` passed outside sandbox after Windows EPERM on `.next`.
- `pnpm run test:int` passed 8 files / 30 tests.
- `pnpm run test:e2e` passed 18 tests.
- Playwright manual audit opened `/admin/console`, lead list, import list; no browser console errors.

## Added Scope: Quick Page Wizard

Yêu cầu bổ sung sau audit: người dùng cần một luồng tạo page nhanh theo từng bước.

MVP nên có:

- Bước 1: chọn site và loại trang.
- Bước 2: nhập tiêu đề, đường dẫn, mô tả ngắn.
- Bước 3: kiểm tra lại và tạo trang nháp.
- Sau khi tạo, chuyển người dùng sang màn edit Payload đầy đủ.

Nguyên tắc UX:

- Wizard chỉ tạo draft, không publish.
- Không thay thế form edit đầy đủ.
- Dùng ngôn ngữ nghiệp vụ, tránh thuật ngữ kỹ thuật.
- Template ban đầu gồm: trang nội dung, landing page chiến dịch, trang dịch vụ, trang liên hệ.

## Playwright Artifacts

Screenshots đã chụp trong Playwright session:

- `cms-audit-dashboard.png`
- `cms-audit-pages-list.png`
- `cms-audit-page-edit.png`
- `cms-audit-leads-empty.png`
- `cms-audit-import-create.png`
- `cms-audit-mobile-dashboard.png`
