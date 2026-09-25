# US-074: Khắc phục UX quản trị CMS và go-live đa site

## Status

- Harness/repo lifecycle: `in_progress`
- Plane/customer-facing: `Chờ xác nhận` (`Partial proof`)
- Release: Production đang live tại
  `us074-admin-shell-followup-r7-20260915T143012Z`; các blocker admin-shell và
  preview/locale overlay đã được verify; chưa chuyển `Đã bàn giao`/`Hoàn tất`
- Scope waiver: theo yêu cầu ngày 15/09/2026, bỏ qua authenticated staging và
  Safari/iOS; hai coverage này được ghi là `waived/unverified`, không phải pass

## Lane

high-risk

## Kế hoạch thực hiện

[implementation-plan.md](./implementation-plan.md) chi tiết chín WP, ba đợt
A/B/C, file liên quan, phụ thuộc, ước lượng, UAT và release gates. Ước lượng
11,5–20 ngày công engineering + 5,75–6,5 ngày công QA, chưa cộng 20% dự phòng.
Candidate WP-1 đến WP-7 và lớp tương thích WP-9 đã có trong workspace; evidence đang được ghi tại
[evidence/20260915](./evidence/20260915/) và các run lịch sử. Phương án hai engineer + QA có lịch
đề xuất D1–D15; ngày delivery trên Plane hiện là metadata tự sinh, chưa phải
lịch triển khai được chốt.

Review độc lập của `applied-cms-ui-package` được hợp nhất vào US-074 theo hướng
chọn lọc: nhận design tokens, typography, responsive/accessibility guardrails;
không import raw HTML/Vanilla JS/mock backend. Chi tiết nằm tại
[applied-ui-package-review.md](./evidence/20260914/applied-ui-package-review.md).

Kết quả lượt remediation mới nhất và evidence Production được ghi tại
[remediation-run.md](./evidence/20260915/remediation-run.md). Candidate US-074
đã được build/canary; sau khi một release khác thay thế `current`, overlay đã
được ghép lại trên baseline hiện hành và r7 đang live. Chi tiết tại
[production-release.md](./evidence/20260915/production-release.md).

Quyết định bỏ qua authenticated staging và Safari/iOS được ghi tại
[scope-waiver.md](./evidence/20260915/scope-waiver.md). Waiver không thay thế
production owner approval, backup/rollback, canary, after-state hoặc các kiểm
tra cấu hình domain/preview; các gate này đã có proof Production trong
[production-release.md](./evidence/20260915/production-release.md).

## User story

Là biên tập viên, điều hành tour, site manager hoặc người xử lý lead, tôi muốn
CMS `/admin` hiển thị đúng trên desktop, tablet và mobile, giữ đúng site/locale
khi xem trước, và cung cấp các trạng thái vận hành dễ hiểu, để tôi có thể tạo,
dịch, rà soát, duyệt và xử lý nội dung mà không gặp màn hình trắng, link 404,
nhầm tenant hoặc phải dùng bảng Excel ngoài hệ thống.

## Current Behavior

Đợt audit UI/UX và các luồng sử dụng thực tế đã chỉ ra một nhóm finding liên
quan với nhau trong CMS Payload v3.84/Next.js 16:

- Ở viewport nhỏ hơn 680px, `.template-default` có thể tính cột nội dung đầu
  tiên bằng `0px`, làm dashboard và các màn hình collection co về 0 và người
  dùng chỉ thấy vùng trắng/xám.
- Site Review dựng preview path của site con trên `window.location.origin`,
  nên route của tenant khác domain hiện tại có thể trả 404 trong iframe.
- Dữ liệu Site trên môi trường production cần được chuẩn hóa để WingsGo không
  còn giá trị domain local; giá trị canonical/domain phải lấy từ quyết định DNS
  đã được duyệt, không được suy đoán trong code.
- Tour Products, Posts, Tour Departures và Media còn dùng control locale đầy đủ
  chiếm nhiều diện tích thay vì compact control đã dùng ở Pages.
- Topbar có va chạm giữa avatar và locale trên desktop, va chạm hamburger và
  breadcrumb trên tablet, đồng thời dropdown locale có thể lặp mã locale.
- Search input có icon đè lên ký tự đầu placeholder; date/time native của Payload
  đang có thứ tự ngày tháng và 12/24 giờ không phù hợp với vận hành tiếng Việt.
- Một số nhãn admin/plugin còn tiếng Anh hoặc hiển thị số lượng Additional Domain
  không nhất quán. Bản ghi chưa dịch ở locale đang chọn chỉ hiện
  `<Không có Tiêu đề>`, chưa nói rõ đây là trạng thái chưa dịch.
- Theme Manager có nguy cơ diễn giải thiếu phạm vi tác động khi summary bị giới
  hạn bởi truy vấn tối đa 100 page trong khi catalog production lớn hơn.
- Form submission lưu lead và trạng thái giao nhận kỹ thuật, nhưng chưa có trạng
  thái xử lý kinh doanh hoặc người phụ trách để đội Sales/CSKH phối hợp.
- Form tour dài, đặc biệt phần itinerary nhiều ngày, chưa có Collapse All/Expand
  All; Page Wizard chưa có affordance an toàn để tạo một trang mới theo preset đã
  dùng.
- Gói `applied-cms-ui-package` là prototype tĩnh, không thể copy/paste vào DOM
  Payload. Một số token OKLCH, font Windows-only, fallback WebView và cặp màu
  primary/accent cần được chuyển thành contract CSS có fallback thực sự.

Các finding về production domain và iframe cần được xác nhận lại bằng probe
read-only trước khi ghi dữ liệu. Finding mobile, layout, locale control, search
icon, date formatting và thiếu business lead triage đã có bằng chứng code/runtime
ở local audit. Pagination với chuỗi dính như `1-10trong số295` chưa tái hiện
ổn định trên build local hiện tại; story này đưa vào contract regression, không
khẳng định một lỗi dữ liệu cụ thể khi chưa có reproduction.

## Target Behavior

CMS có một admin shell nhất quán và có thể vận hành trên các viewport được hỗ
trợ. Nội dung luôn có chiều rộng thực tế; topbar không chồng lấn; search, phân
trang, thời gian và nhãn chính được đọc đúng bằng tiếng Việt. Site Review mở
đúng origin preview đã được allowlist và ký handoff cho từng tenant, không tạo
open redirect hay làm lộ quyền truy cập. Các màn hình nội dung dùng locale
control compact, hiển thị rõ trạng thái bản dịch và title nguồn.

Theme Manager báo đúng phạm vi ảnh hưởng của toàn bộ tập page liên quan. WingsGo
có domain production đã được duyệt và được đưa vào preview/canonical contract.
Lead có một lớp triage tối thiểu gồm trạng thái kinh doanh, người phụ trách và
ghi chú có kiểm soát, tách biệt với `deliveryStatus` kỹ thuật. Các cải thiện form
tour và Page Wizard giúp giảm thao tác lặp nhưng không phá dữ liệu đã nhập.

Lớp UI từ `applied-cms-ui-package` được hiện thực trong runtime bằng React/SCSS:
admin rail có nhóm điều hướng theo nghiệp vụ, Console có task/metric surface,
Site Review có preview checklist, Page Wizard có site/locale/template flow và
Theme Manager có các vùng live-preview/impact rõ ràng. Static HTML/Vanilla JS,
mock data và dialog không có backend không được chạy trong Payload.

## Đánh giá lại finding và disposition

| Mã | Finding | Kết luận sau đánh giá | Ưu tiên | Disposition trong US |
| --- | --- | --- | --- | --- |
| F-01 | Mobile trắng dưới 680px | Confirmed, go-live blocker | P0 | Bắt buộc sửa và có responsive proof |
| F-02 | Site Review iframe 404 với site con | Confirmed theo code path/cross-domain contract; cần production probe | P1 | Bắt buộc sửa bằng preview origin an toàn |
| F-03 | WingsGo còn domain local | Cần read-only verify production; local fixture có giá trị local | P0 nếu production xác nhận | Chuẩn hóa domain/canonical/allowlist; không xử lý account |
| F-04 | Locale control lớn che form | Confirmed từ cấu hình collection | P1 | Đồng bộ compact control theo matrix |
| F-05 | Topbar chồng lấn và locale code lặp | Confirmed bằng runtime/layout audit | P2 | Sửa desktop, tablet và label contract |
| F-06 | Search icon chồng placeholder | Confirmed bằng computed layout | P2 | Sửa CSS và regression các list |
| F-07 | Pagination/date format | Date confirmed; pagination chưa reproduce ổn định | P2 | Chuẩn hóa date; thêm regression spacing |
| F-08 | Nhãn tiếng Anh/Additional Domain | Confirmed một phần ở native/plugin UI | P2/P3 | Việt hóa surface vận hành chính, không DOM-hack Payload |
| F-09 | `<Không có Tiêu đề>` gây nhầm mất dữ liệu | Confirmed usability issue | P2 | Hiển thị `[Chưa dịch]` và title nguồn |
| F-10 | Theme impact summary có thể thiếu page | Confirmed giới hạn truy vấn hiện tại | P1/P2 | Phân trang/đếm đầy đủ hoặc ghi rõ scope |
| F-11 | Lead chỉ là kho submission tĩnh | Confirmed data-model gap | P2 | Bổ sung triage tối thiểu, không xây CRM |
| F-12 | Form tour dài, thiếu Collapse/Expand All | Native Payload Array đã có `Collapse all`/`Show all`; itinerary bật `initCollapsed` và row label có ngày/title | P2 | Đã đáp ứng ở config/runtime native; cần UAT 6/14 ngày và validation-focus proof |
| F-13 | Không có affordance tạo lại từ Wizard | Guidance ở Page edit đã có link giữ site/preset để tạo draft khác; không reset draft hiện tại | P3 | Đã đáp ứng candidate; cần UAT hai draft độc lập và slug conflict |
| F-14 | Gói applied CMS UI không cùng kiến trúc Payload và có gap font/fallback/a11y | Confirmed qua archive integrity và browser review; phù hợp làm design reference, không phù hợp raw integration | P2 | Đã ghép có chọn lọc token adapter, font stack, foreground contrast, grouped rail, Console task state, Site Review checklist và Wizard locale vào React/SCSS; static runtime vẫn loại trừ |

## Affected Users

| Vai trò | Kết quả cần đạt |
| --- | --- |
| Content Editor | Tạo/sửa/dịch nội dung, tìm kiếm và đọc trạng thái locale trên màn hình không bị che hoặc trắng |
| Tour Operator | Nhập tour nhiều ngày, rà soát site/thị trường và itinerary với ít cuộn hơn |
| Site Manager | Rà soát đúng tenant, xem preview đúng domain, kiểm tra theme impact và duyệt nội dung |
| Sales/CSKH | Xem lead theo site, cập nhật trạng thái xử lý, biết ai đang phụ trách và để lại ghi chú |
| Super Admin | Chuẩn hóa domain production, giám sát phạm vi toàn hệ và kiểm tra rollout/rollback |

## Affected Product Docs

- `docs/product/cms-admin-design-language.md`
- `docs/product/editorial-operations.md`
- `docs/product/multisite-platform.md`
- `docs/product/phase-1-launch-readiness.md`
- `docs/product/go-live-review-pipeline.md`
- `docs/audits/cms-ui-ux-audit-2026-05-29.md`

## In scope

### Go-live blockers và lỗi chức năng

- Sửa responsive admin shell tại `<= 680px`, bảo đảm `.template-default`,
  header, navigation và content có track/width dương, dùng được ở 360–600px.
- Sửa Site Review để preview theo site/host hợp lệ; tái sử dụng allowlist
  `PREVIEW_PUBLIC_ORIGINS` và signed preview handoff hiện có, không tin trực tiếp
  vào domain mutable từ CMS.
- Read-only verify và chuẩn hóa domain/canonical/preview allowlist của WingsGo
  theo domain production được chủ sở hữu DNS phê duyệt; kiểm tra cả reverse proxy
  và host aliases.
- Dùng `ContentLocaleCompactDocumentControl` cho các collection bị finding và
  giữ độc lập status của từng locale.

### Consistency và usability

- Sửa geometry topbar cho desktop/tablet/mobile; bảo đảm avatar, locale,
  hamburger và breadcrumb không overlap.
- Bỏ duplicate locale code trong label bằng cách sửa nguồn metadata/config,
  không chèn CSS hoặc mutate DOM để che lỗi Payload.
- Sửa padding/position icon search; chuẩn hóa khoảng trắng pagination khi có
  reproduction; chuẩn hóa date/time admin theo `dd/MM/yyyy HH:mm` và timezone
  `Asia/Ho_Chi_Minh`.
- Việt hóa các nhãn, helper, action và empty state thuộc luồng chính; đổi title
  fallback chưa dịch thành `[Chưa dịch] — <title locale mặc định>` với status
  không nhầm là đã publish.
- Hợp nhất có chọn lọc design language từ `applied-cms-ui-package`: token
  fallback sRGB trước OKLCH có feature gate, font fallback cho hệ điều hành không
  có Bahnschrift/Segoe UI Variable, foreground role đạt contrast và fallback cho
  admin status surfaces. Không đưa prototype HTML/Vanilla JS vào runtime.
- Làm cho Theme Manager báo đủ impact count cho toàn bộ page scope hoặc nêu rõ
  giới hạn “hero/high-impact subset”, không dùng số bị cắt như tổng tuyệt đối.
- Bổ sung site context/switcher cố định cho các surface aggregate nếu không làm
  suy yếu site-scoped access; context hiện tại phải luôn hiển thị rõ trong write
  surface.

### Luồng nghiệp vụ

- Giữ và UAT native `Collapse all`/`Show all` của Payload Array cho itinerary;
  row label phải giữ ngày/title, validation error phải mở đúng row và focus field.
- Giữ affordance `Tạo trang khác từ preset` sau Page Wizard; không reset hoặc xóa
  block của page đã tạo nếu chưa có confirmation rõ ràng.
- Bổ sung lead triage tối thiểu: `salesStatus`, `assignedTo` nullable và ghi chú
  vận hành có giới hạn; tách khỏi delivery/notification state.

## Explicit non-goals

- Không xóa, disable, reset password, rotate secret, migrate, seed, rename hoặc
  thay đổi quyền của user/account hiện hữu. Các account local/UAT/test hiện có
  phải được giữ nguyên để phục vụ kiểm thử; account không phải hạng mục xử lý
  của US này.
- Không tạo account mới trên Production để bù fixture thiếu và không dọn account
  để “làm sạch” Production. Trên local/staging non-Production, validation được
  phép tạo account tạm theo `US074_E2E_FIXTURE_MODE=ephemeral` cùng dữ liệu
  synthetic cần thiết; teardown chỉ xóa exact ID do test tạo và phải đối chiếu
  baseline/after-state. Nếu môi trường không cho phép lifecycle fixture, ghi
  blocker và dùng fixture pre-provisioned.
- Không mở public locale mới (`ja`, `ko`, `fr`, `de`) và không thay đổi policy
  locale public hiện hành trong US này.
- Không xây CRM, pipeline sales đầy đủ, email/SMS integration, payment, booking,
  lead scoring hoặc tự động phân phối lead ngoài các field triage tối thiểu.
- Không thay đổi public page design, SEO output ngoài canonical/domain cần thiết,
  hoặc rewrite toàn bộ Payload admin.
- Không tin `site.domain` mutable như một URL tùy ý, không cho phép open redirect,
  không bỏ CSP/frame security để làm iframe chạy.
- Không ghép trực tiếp `applied-cms-ui-package` vào Payload; không dùng
  `shell()`/`innerHTML`, local mock state, query `secret` dài hạn hoặc asset/font
  chưa có provenance làm production dependency.
- Không coi việc format lại pagination là đã sửa nếu không có reproduction hoặc
  test contract chứng minh whitespace đúng.

## Dependencies and decisions

| Dependency/decision | Contract |
| --- | --- |
| Production WingsGo domain | Mặc định theo repo contract là `wingsgo.vn`; nếu DNS owner phê duyệt `wingsgo.wingsgroup.vn` thì dùng giá trị đó thống nhất. Không tự chọn giữa hai domain. |
| Preview security | Dùng `getProductionPreviewOrigin`, allowlist và signed handoff; preview target phải hết hạn/không mở redirect. |
| Locale policy | Giữ 9 admin locales theo cấu hình; không suy ra rằng tất cả đều public. |
| Lead permissions | Chỉ role/site scope được phê duyệt mới được update triage fields; export PII tiếp tục theo access hiện hành. |
| Database | Nếu thêm lead fields cần migration additive, PostgreSQL rehearsal, backup và rollback; không có cleanup migration cho account/dữ liệu hiện hữu. Test fixture ephemeral trên local/staging chỉ teardown exact ID. |
| Evidence | Dùng dữ liệu synthetic/sanitized; không chụp credential, token hoặc nội dung PII của lead. |

## Acceptance Criteria

- Admin shell và list presentation pass ở 360, 390, 430, 600, 768, 820, 1024, 1366, 1440 và 1920px: `.template-default__wrap` có width lớn hơn 0, dashboard/console/collection/form không trắng hoặc co mất, không có overlap/overflow ngoài chủ ý; topbar tách được menu/breadcrumb/locale/account, search icon không che placeholder, pagination giữ whitespace khi có dữ liệu/rỗng/nhiều trang, date/time dùng 24 giờ `dd/MM/yyyy HH:mm` với `Asia/Ho_Chi_Minh`, focus ring và touch target chính dùng được.
- Design compatibility của package được chứng minh bằng archive SHA/inventory,
  browser review và unit contract: token package có sRGB fallback thực sự, chỉ
  dùng OKLCH khi `@supports` pass; font role có fallback Apple/Android; action và
  accent text không dùng foreground trắng trên nền có contrast thấp; không có
  dependency runtime vào prototype. Các lỗi riêng của mockup không được tính là
  lỗi Payload đã sửa.
- Site Review sử dụng preview target đúng site/locale/path; child site không ghép mù vào `window.location.origin`, preview origin chỉ từ allowlist/secure handoff, token hết hạn hoặc sai audience bị từ chối, iframe không open redirect/nhầm tenant và lỗi 404/403/timeout hiển thị actionable; production preflight và domain approval xác nhận WingsGo dùng đúng canonical/primary domain, preview allowlist, reverse-proxy host, HTTPS/redirect policy và có rollback exact-scope.
- Tour Products, Posts, Tour Departures và Media dùng compact locale control không che title/tabs/save; locale status `Chưa tạo`/`Bản nháp`/`Đã xuất bản` độc lập; locale code chỉ xuất hiện một lần; record thiếu dịch hiển thị `[Chưa dịch]` cùng title source/status; Additional Domain, Page wrapper, route/slug và nhãn/plugin action chính được Việt hóa từ source contract, không DOM-hack và không làm mất nhãn kỹ thuật của super-admin.
- Theme Manager tính/truy vấn đủ page scope sau pagination và phân biệt `toàn hệ → site → page`, inherited/override và high-impact subset; nếu không phải full total thì copy nói rõ scope, không coi `limit=100` là tổng; site context/switcher nếu hiển thị phải re-check bằng server-side site access, không leak site trước hoặc trở thành đường vòng authorization.
- Tour itinerary có Collapse All/Expand All không mutate dữ liệu/validation và dùng được bằng chuột, bàn phím, touch; Page Wizard có `Tạo trang khác từ preset` mà không reset/xóa draft hiện tại và không publish; Form Submission có triage fields được duyệt (`salesStatus`, `assignedTo`, note/history tối thiểu), tách khỏi `deliveryStatus`, transition/assignee/note theo role/site scope, audit actor/time và không đưa PII vào log/analytics.
- Unit/component/integration/E2E/manual proof bao phủ responsive geometry, preview security, domain config, locale/label/date/search/theme/tour/Wizard/lead, role/site isolation và PostgreSQL migration nếu có; build/lint/typecheck/browser console không có lỗi mới; rollout có read-only preflight, approval, backup/restore, canary, after-state và rollback, không có thao tác xóa/disable/reset/rotate/rename/seed/đổi quyền user/account.

## Related material

- `docs/audits/cms-ui-ux-audit-2026-05-29.md`
- `docs/product/cms-admin-design-language.md`
- `docs/product/editorial-operations.md`
- `docs/product/multisite-platform.md`
- `docs/product/phase-1-launch-readiness.md`
- `docs/product/go-live-review-pipeline.md`
- `docs/stories/epics/E02-phase-1-multisite-platform/US-013-cms-operator-console-hardening/overview.md`
- `docs/stories/epics/E02-phase-1-multisite-platform/US-018-cms-site-review.md`
- `docs/stories/epics/E05-cms-theme-management/US-059-cms-admin-design-language/overview.md`
- `docs/stories/epics/E07-tour-product-platform/US-037-dense-retail-tour-detail-ux.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`
