# FINAL PRE-RELEASE AUDIT — CMS UI/UX STANDARDIZATION

**Ngày audit:** 16/10/2026 (GMT+7)  
**Phạm vi:** `git diff` hiện tại của gói CMS UI/UX, đối chiếu `docs/codex_final_audit_cms_ui_ux_prompt.md`, `payload.config.ts`, Pages schema, navigation và các kiểm thử liên quan.

## Kết luận phát hành

**Kết quả: NO-GO để đóng gói/bàn giao.** Diff có các thay đổi UI cục bộ hợp lý và `tsc --noEmit` đã qua, nhưng còn blocker P1 ở điều hướng và thiếu bằng chứng kiểm thử runtime. Không được đưa lên Staging/Production cho đến khi khôi phục khả năng truy cập mọi collection được cấp phép, kiểm tra mobile/native shell và chạy được test suite.

## Bằng chứng đã kiểm tra

- `git status --short` cho thấy 10 file mã nguồn đã sửa, utility mới `app/src/utilities/disableListColumn.ts`, test navigation sửa, cùng các tài liệu chưa được commit và một file DOCX không thuộc diff UI/UX.
- `git diff --stat`: 117 dòng thêm, 49 dòng xóa trong 11 file mã nguồn/test.
- `pnpm exec tsc --noEmit`: **PASS (exit 0)**.
- `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/adminNavigationChrome.unit.spec.ts tests/unit/appliedCmsUiCompatibility.unit.spec.ts`: **FAIL trước khi chạy test**, `Error: spawn EPERM` từ esbuild/Vite. Vì vậy chưa có bằng chứng mới cho tuyên bố 4/4 và 4/4 tests passed.
- `payload.config.ts` hiện đăng ký các collection gồm `sites`, `theme-presets`, `hero-presentation-presets`, `site-settings`, `pages`, `posts`, `tour-products`, `departure-variants`, `tour-departures`, `tour-campaigns`, `tour-curations`, `media`, `categories`, `users`; globals gồm `header`, `footer`. Nav mới chỉ liệt kê một tập con.

## Câu hỏi 1 — An toàn dữ liệu và schema

### P2 — Các cờ `disableListColumn`/`disableListFilter` không sửa dữ liệu, nhưng phạm vi áp dụng đang rộng hơn yêu cầu

Các cờ `admin` là metadata giao diện của Payload. Chúng không thay đổi REST/GraphQL/Local API, không thay đổi hook `beforeChange`/`afterChange`, và về nguyên tắc không tạo migration SQL. `syncPagePathname`, `validateWingsSideHomeCuration`, `validateWingsGoTourCatalog`, `validateWingsGroupV3Governance` và các revalidation hook vẫn được gọi khi document được ghi.

Tuy nhiên, `disableListFilter: true` còn loại bỏ khả năng lọc các field đó trong list UI. Đây là thay đổi vận hành, không phải “zero-risk”: operator có thể mất một filter hữu ích hoặc không biết vì sao filter biến mất. Cần xác nhận chỉ các field nội dung sâu mới bị chặn, còn các metadata như `title`, `site`, `pathname`, `_status`, `updatedAt`, `id` vẫn dùng được.

`disableListColumnRecursively` là helper mới và chưa có test riêng. Nó clone field, group, `tabs` và `blocks`, rồi ghi đè `admin`. Cần kiểm tra với toàn bộ union type của Payload: field có `admin` là function, `tabs`/`blocks` có shape khác, và các custom component có metadata riêng. Không nên coi việc compile được là chứng minh Payload runtime chấp nhận mọi shape.

Việc đánh dấu `layout` block và `editorialGuidance` chỉ tác động list/filter UI. Không có bằng chứng rằng “hơn 100 xuống đúng 5 cột” đã được đo trong Payload thật; phải mở `/admin/collections/pages`, chụp danh sách Columns/Filters và kiểm tra các cột mặc định.

### Kiểm tra bắt buộc trước release

1. Boot Payload với SQLite sạch và PostgreSQL rehearsal, không bật migration ngoài dự kiến; xác nhận schema diff rỗng.
2. Tạo, sửa, publish/draft và đọc lại một Page có `wingsSideHiFi`, `wingsGroupRoute`, `hero`, `wingsGoTourCatalog`; so sánh JSON trước/sau.
3. Gọi REST/Local API `payload.find({ collection: 'pages' })` với `depth`, `locale`, `draft` như frontend đang dùng.
4. Mở Columns và Filters bằng editor/site-manager/super-admin; chứng minh chỉ metadata cần thiết bị lộ.

## Câu hỏi 2 — Tính toàn vẹn Navigation

### P1 — Ẩn `.nav__wrap` toàn cục có thể cô lập collection và global

Diff thêm:

```scss
body.wings-admin-shell .nav .nav__wrap {
  display: none !important;
}
```

Đây là selector CSS toàn cục, không phải cơ chế thay thế Nav của Payload. Nó che toàn bộ native collection list trong mọi native admin view. `AdminNavIntro` không liệt kê `theme-presets`, `hero-presentation-presets`, `departure-variants`, `tour-departures`, `tour-campaigns`; cũng không có link cho globals `header`/`footer`. Nếu các collection/global này được phép theo role, SuperAdmin hoặc operator mất lối vào UI. Direct URL không khắc phục được discoverability và không chứng minh menu an toàn.

Các link mới cũng là hardcode. Prompt nói “bao quát 100%” nhưng không có kiểm tra `config.collections`, `admin.hidden`, `access.read`, `access.update` hay role/site scope. Link `/admin/collections/forms` và `/admin/collections/imports` phải được xác nhận tồn tại từ plugin/config; nếu không sẽ tạo 404 trong sidebar. UI role-gating chưa được triển khai; editor có thể thấy link mà server từ chối, còn site-manager có thể thấy collection ngoài scope. Link visibility chỉ là UX, không thay thế authorization, nhưng UX sai vẫn là blocker.

`AdminStandaloneShell` vẫn là shell riêng với grid cố định 258px, không dùng native Payload drawer/toggler, không có user/logout footer. Vì thế diff chưa thật sự “unify 100%”: native view bị CSS ẩn nav phụ, standalone view vẫn có hành vi khác. Mobile rule chỉ hiển thị `navigationGroups[0].links`, tức mobile chỉ thấy nhóm Vận hành; các collection nội dung/cấu hình mới không truy cập được từ mobile.

### Khuyến nghị sửa

- Tạm thời **gỡ CSS ẩn `.nav__wrap`** hoặc thay bằng ẩn có allow-list sau khi chứng minh tất cả route cần thiết đã được render và được access-check.
- Hoặc triển khai CustomNav thật sự dựa trên Payload admin context, không hardcode quyền; phải có fallback native cho collection mới.
- Tạo ma trận route × role (`editor`, `site-manager`, `super-admin`) × site scope và kiểm tra HTTP/HTML thực tế.
- Bổ sung globals và mọi collection được phép, hoặc ghi rõ chủ ý ẩn cùng đường vào thay thế.
- Kiểm tra mobile drawer, focus, Escape, `aria-expanded`, logout và active state trên 375/768/1440px.

## Câu hỏi 3 — Edge cases và tương thích Payload

### P1 — Legacy `hero.presentation` chưa được xử lý đầy đủ theo acceptance

Diff đặt `admin.hidden: true` cho `hero.presentation`, giữ access read cho super-admin. Điều này không xóa dữ liệu database, nhưng không tự chứng minh dữ liệu được giữ nguyên khi resave. Payload có thể gửi partial group hoặc giá trị `null` tùy form state; việc ẩn field cũng làm editor không thể nhìn thấy/cứu dữ liệu legacy. Resolver và test hiện có vẫn dựa vào fallback legacy, nên phải kiểm tra read-resave-publish với record cũ và record localized.

Prompt mô tả ẩn cả `wingsGoTourCatalog.featuredTours`, nhưng diff hiện tại chỉ thêm cờ list/filter cho `wingsGoTourCatalog`; không thấy `hidden: true` trên `featuredTours`. Đây là mismatch giữa yêu cầu và triển khai. Hơn nữa `validateWingsGoTourCatalog` vẫn đọc `featuredTours`, kiểm tra tối đa 6 tour, site, wrapper page, publish state và departure tương lai. Không được xóa/ẩn logic dữ liệu trước khi có migration/compatibility plan.

### P2 — Utility đệ quy có nguy cơ tương thích khi Payload nâng phiên bản

Helper tự xử lý `fields`, `tabs`, `blocks` bằng cast thủ công. Payload thêm field type mới hoặc thay đổi shape có thể khiến nested fields không được đánh dấu, hoặc metadata admin bị ghi đè. Cần unit test cấu trúc output và một schema boot test trên phiên bản Payload đang lock. Không dùng CSS/UI snapshot để suy ra database safety.

### P2 — CSS leakage và accessibility

Giảm icon từ 28px xuống 20px và bỏ nền/viền có thể làm giảm target thị giác/khả năng nhận biết active state. Cần kiểm tra contrast, focus-visible, keyboard navigation và hit-area tối thiểu trên desktop/mobile. `width: 100%` cho guidance có thể gây overflow trong container có padding/toolbar; phải kiểm tra 375px và RTL/fallback locale dù locale hiện tại đều LTR.

## Câu hỏi 4 — Xếp hạng rủi ro và điều kiện phát hành

| Mức | Finding | Tác động | Điều kiện đóng |
|---|---|---|---|
| **P1** | Ẩn toàn bộ `.nav__wrap` | Mất menu collection/global, cô lập operator, khó phát hiện | Gỡ/allow-list hoặc chứng minh đầy đủ route + access matrix bằng browser smoke |
| **P1** | Hardcode links không role/site gating | UI hiển thị sai quyền; route mới/collection mới bị bỏ sót | Derive từ Payload config/access hoặc có fallback native; kiểm tra 3 role × site |
| **P1** | Test suite chưa chạy được (`spawn EPERM`) | Không có bằng chứng regression | Sửa môi trường runner/esbuild và chạy lại đúng lệnh; lưu log mới |
| **P1** | Legacy resave chưa được chứng minh | Có thể mất/ghi đè fallback khi save Page cũ | Fixture before/after cho localized draft/published và cả `featuredTours` |
| **P2** | `disableListFilter` quá rộng | Mất khả năng lọc vận hành | Xác nhận UX với role thực; chỉ chặn field sâu |
| **P2** | Recursive helper chưa có test/contract | Payload upgrade có thể làm schema admin sai | Unit + boot test cho group/array/tabs/blocks |
| **P2** | Standalone/native/mobile vẫn khác shell | Vẫn còn morphing và dead-end trên mobile | Browser smoke 375/768/1440, toggle/logout/focus |
| **P3** | Locale label, chip text, flat icon, spacing | Rủi ro thấp, chủ yếu thị giác | Visual QA và accessibility check |

## Quyết định và thứ tự xử lý

1. **Không release diff hiện tại.**
2. Gỡ hoặc thu hẹp selector `.nav__wrap`; khôi phục fallback native cho mục chưa được CustomNav bao phủ.
3. Xác minh collection/global route thực tế từ `payload.config.ts` và plugin; bổ sung/loại link có bằng chứng, không đoán.
4. Thêm role/site access matrix và browser smoke test; kiểm tra mobile vì `mobileLinks` hiện chỉ là nhóm Vận hành.
5. Viết test cho `disableListColumnRecursively`, chạy schema boot trên SQLite/PostgreSQL rehearsal, và kiểm tra read/resave legacy.
6. Chỉ sau khi test runner chạy được và mọi P1 đóng mới đánh giá lại P2/P3 rồi chuyển trạng thái bàn giao.

**Phần chưa kiểm chứng:** chưa chạy browser/HTTP smoke trên instance Payload đang chạy, chưa chạy PostgreSQL rehearsal, chưa đo Columns selector bằng ảnh mới, và chưa kiểm tra DOM thật của `.nav__wrap` để biết nó có bao gồm account/logout hay không. Các điểm này là rủi ro phát hành, không được coi là đã đạt.
