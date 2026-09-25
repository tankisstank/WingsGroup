# US-075 — Đơn giản hóa tạo tour và preview bản nháp

## Status

in_progress

## Lane

high-risk

## Product Contract

CMS Admin phải giúp người vận hành tạo và chỉnh sửa `TourProduct` đúng theo
site đang chọn, quản lý gallery bằng hình ảnh trực quan, đồng thời cho xem đúng
bản đã lưu gần nhất trước khi publish. Luồng cơ bản phải đủ rõ để một Tour
Operator có thể đi từ thông tin tour, lịch trình, gallery, ngày khởi hành/giá
đến Save draft, Preview và Publish mà không phải hiểu kiến trúc nội bộ hoặc tự
đi tìm các record liên quan. WingsGo không được hiển thị thuật ngữ hoặc control
chỉ thuộc WingSide. Nút Preview phải phân biệt rõ draft đã lưu với bản published
và không được âm thầm render bản published khi draft đã tồn tại.

## Current Behavior

Đang có hai finding cần xử lý cùng một luồng:

1. Tại `/admin/collections/tour-products/`, record có `site = WingsGo` vẫn
   nhìn thấy field `tourType` với nhãn `Loại tour WingSide`. Collection dùng
   chung cho nhiều tenant nhưng field presentation chưa phân biệt capability của
   site. Đây là lỗi UX/semantic; chưa có căn cứ để xóa field hoặc đổi dữ liệu
   hiện hữu.
2. Sau khi editor lưu thay đổi trong CMS, Preview được báo cáo là hiển thị
   nội dung published thay vì bản saved draft. Source hiện đã có ý định hỗ trợ
   draft (`versions.drafts`, `draft: true` trong preview initializer và
   `isAuthorizedDraftMode()` ở public resolver), vì vậy nguyên nhân cụ thể phải
   được tái hiện và phân biệt giữa: chưa lưu, autosave chưa hoàn tất, draft sai
   locale, handoff/cookie không hợp lệ, public resolver mất draft flag, hoặc
   runtime production chưa chạy cùng source.
3. Trường `gallery` của `TourProduct` hiện là relationship `hasMany` tới
   `media` nhưng chưa có presentation/admin field riêng để xem ảnh đã chọn.
   UI mặc định có thể chỉ hiển thị tên hoặc giá trị quan hệ, khiến editor khó
   nhận diện ảnh nào đang nằm trong gallery và khó thêm/xóa đúng ảnh. Cần xác
   nhận thêm các biến thể ID/object, media bị thiếu/quyền đọc bị từ chối và
   hành vi khi record đang là draft.
4. Để một tour xuất hiện đúng trên web, người vận hành hiện phải hiểu và tự
   liên kết `wrapperPage` trong Pages. Đây là dependency hợp lệ của catalog
   hiện tại nhưng chưa có hướng dẫn, trạng thái sẵn sàng hoặc thao tác tạo/khôi
   phục có ngữ cảnh trong màn hình TourProduct, nên dễ dẫn đến tour đã Publish
   nhưng URL `/tour/<slug>` vẫn 404.
5. `TourDeparture` là collection riêng và `expiresAt` là governance có chủ ý,
   nhưng màn hình TourProduct chưa đưa hai dependency này vào luồng thao tác
   chính. Editor có thể phải rời form để tạo nhiều ngày bay và không biết giá
   đã hết hạn sẽ chuyển sang trạng thái liên hệ trên public site.
6. Field `site` hiện được bảo vệ bằng server-side site scope và có fallback khi
   user chỉ được cấp một site, nhưng form chưa làm rõ site context/default.
   Một số nhãn còn mang ngôn ngữ kỹ thuật như `Route visual`, `Builder config`,
   `variantStrategy` và `Slug tour`; cấu trúc nhiều tab cũng chưa cho biết
   trường nào là tối thiểu để tour sẵn sàng Preview/Publish.

7. Production review ngày 2026-09-23 cho thấy wrapper lifecycle vẫn khó hiểu
   với editor: trạng thái wrapper sai path bị trả về như chưa có wrapper, panel
   chỉ hiển thị một dòng path/status, action `Tạo trang tour` không phân biệt
   trường hợp chưa có wrapper với wrapper mồ côi hoặc wrapper đang dùng chung,
   và thay đổi slug có thể làm lệch `Product.slug` với `Page.pathname` mà không
   có cảnh báo trực quan. Product #112 là ví dụ: đang trỏ tới Page #237 sai
   pathname, trong khi Page #314 là wrapper draft cùng site nhưng đang mồ côi.
   Đây là gap của authoring UX và data-integrity feedback, không mở thành US
   mới.
8. URL tour phải được ổn định ngay tại điểm nhập: slug editor nhập phải được
   chuẩn hóa lowercase ở client và server. Relink/publish chéo phải chạy trong
   cùng PostgreSQL transaction; nếu tour đã public đổi URL, transaction phải
   tạo hoặc xác nhận một redirect `301` từ path cũ sang path mới.

## Independent post-UAT review — 2026-09-19

Đợt đối soát mới bổ sung ba finding. Các finding này không được gộp thành một
nguyên nhân chung; mỗi finding có mức độ bằng chứng và hướng xử lý riêng:

| Finding | Phân loại độc lập | Quyết định trong US-075 |
| --- | --- | --- |
| Dòng itinerary mới bị thu gọn, người dùng không thấy ngay các field bắt buộc | Đã xác nhận từ source: `itineraryDays` là array bắt buộc và admin config đang dùng `initCollapsed: true`. Source không có literal `minRows`, nên không gọi đó là một option đã được cấu hình nếu chưa có runtime trace. | P1 UX. Khi thêm ngày đầu tiên phải mở rộng dòng; khi Save lỗi phải đưa người dùng tới tab/dòng/field lỗi. Giữ server validation hiện có, không nới schema chỉ để Save draft đi qua. |
| Nút “Tạo trang tour” trả HTTP 500 khi `wrapperPage` rỗng | Đã ghi nhận từ live retest; nguyên nhân gốc chưa được chứng minh. Luồng provision hiện đã truyền `createLayoutPresetData('tour-conversion')`, vì vậy giả thuyết “thiếu default layout” không được chấp nhận như root cause. | P0/P1 release gate. Tái hiện ở staging với log lỗi đã sanitize, phân biệt lỗi Page validation, tour hub, site access và transaction; trả mã/lời giải thích actionable thay vì generic 500. |
| Quick-add được cho là không ghi được departure vì không đi qua authoring endpoint | Không khớp source hiện tại: `TourDepartureManager` POST/PATCH trực tiếp `/api/tour-departures`, sau đó reload bảng. Đây là boundary đã định trong US-075, không phải thiếu action của `/api/tour-authoring/[id]`. | Không thêm endpoint ghi trùng. Xác minh bằng network response + reload/API read trên production hoặc staging; nếu fail thì sửa direct collection path, access hoặc runtime drift. |

Kết luận: US-075 vẫn `in_progress`. AC-1 chưa đóng do provision 500; AC-3
chưa đóng lại cho đến khi quick-add được chứng minh persist trong runtime đang
phục vụ; AC-4/AC-6 bổ sung gate UX itinerary và regression validation. Kết quả
UAT 11 bước ngày 2026-09-18 vẫn là bằng chứng lịch sử của fixture đã chạy,
nhưng không đủ để bác bỏ một regression mới trên production.

### Operator outcome

Với một tour mới, đường đi mặc định cần là: chọn site đã được xác định → nhập
thông tin cốt lõi → nhập lộ trình → chọn gallery → thêm ngày khởi hành/giá →
Save draft → Preview bản đã lưu → kiểm tra readiness → Publish theo quyền. Các
thao tác nâng cao vẫn có thể nằm trong tab riêng, nhưng không được buộc người
vận hành phải tự suy ra quan hệ giữa `TourProduct`, `TourDeparture` và wrapper
`Page`.

### Mapping đề xuất mở rộng vào US-075

| Đề xuất | Ranh giới triển khai | AC chính |
| --- | --- | --- |
| Wrapper Page tự provision/reuse | Code/Admin UX trên lifecycle hiện có; chỉ tạo draft, không auto-publish | AC-1, AC-6 |
| Bảng departure và quick-add nhiều ngày | Code/Admin UX; ghi vào `TourDepartures`, không merge collection | AC-3, AC-6 |
| Hiển thị freshness của giá | Code/Admin UX; suy ra từ `verifiedAt`/`expiresAt`, không đổi policy | AC-4, AC-6 |
| Default/site context | Code/Admin presentation theo site scope; một site thì prefill, nhiều site thì chọn rõ | AC-1 |
| Việt hóa nhãn và progressive disclosure | Code/Admin presentation; giữ payload key, VI/EN parity | AC-4, AC-6 |
| Readiness checklist | Code/Admin UX; chỉ báo thiếu dependency và dẫn tới nơi xử lý | AC-1, AC-4, AC-6 |
| Wrapper lifecycle polish | Hiển thị expected/actual path, health, orphan/shared state và action tạo/gán/sửa wrapper rõ ràng; không che wrapper sai thành “chưa có” | AC-1, AC-4, AC-6 |
| Gallery thumbnail/add/remove | Code/Admin field presentation trên relationship Media hiện có | AC-4, AC-6 |
| Save draft → Preview đúng bản lưu | Code/runtime preview handoff và resolver; giữ anonymous published isolation | AC-2, AC-3, AC-5, AC-6 |
| Slug và URL lifecycle | Field slug lowercase ngay khi nhập, server-side normalize; relink/publish có transaction và auto-create redirect `301` khi URL public đổi | AC-1, AC-2, AC-6 |

Các đề xuất trên là một scope có liên kết, nhưng implementation phải đi theo
vertical slice và có thể tách decision riêng nếu phát hiện giới hạn schema,
quyền hoặc lifecycle. Không coi việc ghi vào US-075 là chấp thuận thay đổi
production hay chấp thuận tự động tạo/publish dữ liệu.

Các US nền tảng đã tồn tại nhưng chưa đóng finding này một cách tập trung:

| US | Phần đã có | Boundary với US-075 |
| --- | --- | --- |
| US-023 | Model `TourProduct`, `TourDeparture`, reuse campaign và proof create/preview ở mức nền tảng | Không xử lý site-aware field presentation hoặc regression preview hiện tại |
| US-024 | Governed tour detail builder và renderer | Không xây lại drag/drop builder; chỉ bảo đảm renderer nhận đúng draft data |
| US-035 | Departure Variant và bounded overrides | Chỉ kiểm tra draft liên kết khi cần; không thay đổi model variant |
| US-036 | Nhóm field authoring trong Payload Admin | Là dependency trực tiếp; E2E hiện được đánh dấu N/A cho collection-config story |
| US-039 | Editorial workflow và import mapping | Dùng làm tài liệu vận hành, không thay thế proof thao tác CMS |
| US-043/044/045 | Import catalog Doicanhviet/WingSide | Không mở rộng import trong US này |
| US-059 | Ngôn ngữ và navigation của CMS Admin | Chỉ reuse admin shell/locale control; không lặp lại redesign shell |
| US-074 | Secure tenant preview, site review và admin remediation tổng quát | Không coi proof preview tenant tổng quát là proof TourProduct draft integrity |

Gallery UX là phần bổ sung trực tiếp của US-075, không mở thành story media
riêng: US này chỉ cải thiện việc chọn và quản lý các quan hệ `Media` đã có trong
`TourProduct`; media library, upload policy và asset governance vẫn thuộc
collection `Media`/các quy trình nền tảng hiện có.

## Target Behavior

- Khi chọn `WingsGo` trong `Tour Products`, không còn nhãn `Loại tour WingSide`
  hoặc control chỉ dành cho WingSide. Khi chọn `WingSide`, capability tương ứng
  vẫn được hiển thị. Các field dùng chung phải giữ tên trung tính.
- Khi editor tạo TourProduct WingsGo, form hiển thị site context rõ ràng và
  prefill site nếu tài khoản chỉ có một site được cấp quyền; tài khoản nhiều
  site vẫn phải chọn tường minh. Hệ thống có thể provision hoặc đưa ra một
  thao tác tạo wrapper Page draft ngay trong luồng TourProduct, idempotent và
  cùng site, đồng thời reuse wrapper hợp lệ đã có. Không được tự động Publish
  Page/TourProduct hoặc tạo duplicate mà không báo.
- Màn hình TourProduct có khu vực liên quan cho `TourDepartures`: editor có thể
  thêm nhanh nhiều ngày khởi hành/giá, xem trạng thái của từng dòng và mở
  chỉnh sửa chi tiết khi cần. Dữ liệu vẫn được lưu ở collection hiện tại,
  tuân thủ site scope và quyền hiện hành.
- Khi tạo hoặc sửa `TourProduct`, editor nhìn thấy thumbnail của từng media
  đang được chọn trong `gallery`, cùng định danh đủ để phân biệt (tên file/alt
  text hoặc media ID). Editor có thể mở/xem ảnh, thêm ảnh từ Media picker và
  xóa đúng ảnh đã chọn; trạng thái rỗng, đang tải, ảnh lỗi hoặc media không còn
  quyền truy cập phải được thông báo rõ ràng.
- Việc preview gallery trong Admin chỉ là preview asset đã chọn, không biến
  thành upload widget mới và không cho phép nhập URL media tùy ý. Thứ tự các
  quan hệ hiện có phải được giữ khi Save/Preview; nếu product contract chưa
  hỗ trợ reorder thì không tự thêm một semantics reorder ngoài phạm vi.
- Việc ẩn/đổi presentation không xóa, migrate, backfill hoặc làm mất giá trị
  `tourType` đã có; API, import và public renderer tiếp tục nhận dữ liệu hợp lệ
  theo contract hiện tại.
- Sau khi thao tác Save hoàn tất, Preview mặc định đọc đúng phiên bản persisted
  mới nhất của `TourProduct` theo đúng `site`, `locale`, các departure/variant
  liên quan và wrapper page. Thay đổi draft phải xuất hiện; public anonymous URL
  vẫn giữ bản published.
- Nếu editor bấm Preview khi còn thay đổi chưa lưu, UI phải cảnh báo hoặc chặn
  rõ ràng. Nếu không có draft đã lưu, trạng thái Preview phải nói rõ đang xem
  published; không được tạo cảm giác đó là draft.
- Giá và ngày bay có trạng thái dễ hiểu được suy ra từ `verifiedAt`/`expiresAt`:
  còn hiệu lực, cần xác minh hoặc đã hết hạn. Khi hết hạn, CMS phải nêu rõ giá
  public sẽ chuyển sang “Liên hệ tư vấn”, không coi đây là lỗi mất dữ liệu và
  không loại bỏ freshness governance.
- Các nhãn hiển thị ưu tiên ngôn ngữ nghiệp vụ (`Tóm tắt dịch vụ`, `Lộ trình &
  điểm dừng`, `Đường dẫn tour`, `Cấu hình hiển thị`, `Cách ưu tiên nội dung
  biến thể`); nhóm nâng cao được thu gọn/progressive disclosure và có trợ giúp
  ngắn, trong khi tên field/data contract nội bộ vẫn được giữ nguyên.
- Readiness checklist cho biết còn thiếu wrapper Page, nội dung cốt lõi,
  gallery, departure/giá hoặc freshness nào trước Preview/Publish; từng lỗi
  phải trỏ tới nơi xử lý, không chỉ hiển thị một lỗi đỏ chung.
- Readiness hiển thị rõ `URL dự kiến`, wrapper đang liên kết (ID, path, site,
  status), trạng thái kiểm tra (`valid`, `draft`, `invalid path/site`, `orphan`,
  `shared`) và các wrapper cùng site có thể gán. Editor không được thấy
  “Chưa có trang tour” khi thực tế đang có một wrapper sai liên kết.
- Action wrapper được phân biệt theo trạng thái: `Tạo wrapper bản nháp`,
  `Gán wrapper có sẵn`, `Sửa liên kết wrapper`, `Mở wrapper`, `Xem bản nháp` và
  `Xem trang public`. Provision không được tạo page mới khi đã có candidate cùng
  site/path mà chưa có xác nhận của editor.
- Khi slug thay đổi, UI hiển thị URL Product và pathname wrapper trước/sau,
  cảnh báo rủi ro đổi URL public và yêu cầu chọn đồng bộ, gán wrapper khác hoặc
  tạo wrapper mới; không tự đổi pathname published một cách âm thầm.
- Slug được hạ chữ thường ngay trong input và được normalize lại ở server. Khi
  publish một slug mới cho tour đã public, hệ thống tạo redirect `301` duy nhất
  từ URL public cũ tới URL mới trong cùng transaction với relink/publish; nếu
  path cũ đã trỏ sang đích khác thì publish bị chặn để operator xử lý conflict.
- Ở màn hình tạo mới, khi thêm ngày itinerary đầu tiên, dòng mới được mở rộng
  sẵn để người vận hành thấy `dayNumber`, tiêu đề và tóm tắt; nếu Save bị chặn,
  form chuyển tới tab/dòng/field lỗi với hướng dẫn thao tác tiếp theo.
- Provision wrapper thành công phải tạo/reuse Page draft bằng preset hiện có;
  lỗi validation, thiếu `/tour` hub, site access hoặc transaction phải được
  phân loại và hiển thị actionable, không bị che bởi HTTP 500 chung.
- Quick-add phải được kiểm chứng là ghi thật vào `TourDepartures` qua endpoint
  trực tiếp hiện hữu, giữ đúng `tourProduct`/`site`, và thấy lại được sau reload;
  không tạo thêm một đường ghi qua authoring route nếu không có lỗi đã tái hiện.
- Preview vẫn dùng site-scoped authorization, signed handoff, allowlisted
  production origin và fail-closed behavior hiện có. Không dùng URL/domain từ
  browser để mở redirect tùy ý và không nới quyền để làm preview chạy.

## Affected Users

- Content Editor: nhập và chỉnh sửa tour theo đúng site/locale.
- Tour Operator: cập nhật lịch, giá, itinerary và variant mà không xem nhầm bản
  cũ.
- Site Manager: rà soát draft trước khi yêu cầu publish.
- Super Admin/Release Operator: kiểm tra cross-tenant, preview và rollback.

## Affected Product Docs

- `docs/product/tour-product-platform.md`
- `docs/product/tour-editorial-operations.md`
- `docs/product/tour-detail-builder-foundation.md`
- `docs/product/multisite-platform.md`
- `docs/stories/epics/E07-tour-product-platform/US-023-tour-product-model.md`
- `docs/stories/epics/E02-phase-1-multisite-platform/US-074-cms-admin-ux-and-production-remediation/`
- `app/src/collections/TourProducts.ts`
- `app/src/collections/TourDepartures.ts`
- `app/src/collections/Pages/hooks/validateWingsGoTourCatalog.ts`
- `app/src/fields/site.ts`
- `app/src/access/siteScope.ts`

## In Scope

- Tái hiện độc lập lỗi field `tourType` trên WingsGo và lập site-capability
  matrix cho các field TourProduct bị nghi là site-specific.
- Sửa presentation/condition của admin field ở mức code, giữ nguyên schema và
  dữ liệu; đổi label sang trung tính nếu audit xác nhận field dùng chung.
- Thiết kế site context/default và readiness checklist cho luồng tạo tour; với
  WingsGo, hỗ trợ provision hoặc quick action tạo/reuse wrapper Page draft theo
  cùng site, có idempotency, quyền hạn và trạng thái lỗi rõ ràng.
- Bổ sung khu vực liên quan/quick-add cho `TourDeparture` để nhập nhiều ngày
  khởi hành và giá từ TourProduct mà không gộp hai collection hoặc bỏ site
  scope.
- Tái hiện và cải thiện authoring UX của `gallery`: preview thumbnail/metadata,
  add/remove rõ ràng, trạng thái media lỗi hoặc bị thiếu, đồng thời giữ nguyên
  relationship order và access control hiện có.
- Làm rõ freshness của departure/giá, tác động của `expiresAt` lên public output,
  nhãn nghiệp vụ và progressive disclosure cho các field nâng cao.
- Sửa và kiểm thử pipeline Save → Preview → draft handoff → structured tour
  resolver để bản saved draft được giữ nguyên site/locale/mode.
- Hiển thị trạng thái nguồn của Preview (`draft đã lưu` hoặc `published`) và
  xử lý rõ dirty/unsaved state.
- Regression cho TourProduct, TourDeparture, DepartureVariant, wrapper Page,
  locale VI/EN, site WingsGo/WingSide và quyền editor/site-manager.
- Staging/canary/production proof sau khi có phê duyệt release, với backup và
  rollback theo quy trình hiện hành nếu runtime hoặc config production bị tác
  động.

## Explicit Non-Goals

- Không sửa `payload.config.ts`, không đổi collection schema tour và không đổi
  tên/xóa field dữ liệu. Migration duy nhất trong phạm vi này là thêm type
  redirect `301`/`307` cho collection Redirects để giữ tương thích redirect cũ;
  chỉ URL tour đổi sau publish mới tự tạo `301`, không backfill tour hoặc sửa
  dữ liệu CMS production.
- Không xóa hoặc sửa hàng loạt TourProduct, departure, variant, Page, account hay
  dữ liệu CMS production.
- Không thay đổi schema collection `Media`, upload storage, asset provenance,
  quyền đọc media hoặc chạy backfill chỉ để bổ sung thumbnail cho gallery.
- Không tự động Publish wrapper Page/TourProduct, bypass quyền Publish hoặc tạo
  duplicate Page/departure khi provision/quick-add.
- Không chuyển `TourDepartures` thành array trong `TourProduct`, không merge hai
  collection và không xây full wizard tất cả trong một màn hình ở phase đầu;
  story chỉ thêm checklist, related table và quick actions có kiểm soát.
- Không bỏ `verifiedAt`/`expiresAt`, ép giá hết hạn thành giá hiện hành hoặc làm
  mất trạng thái “Liên hệ tư vấn” đã được governance quy định.
- Không xây booking engine, CRM, lead routing hoặc payment.
- Không thay thế `US-074` về secure preview origin/site review và không giảm các
  guard authorization để đạt pass UI.
- Không ép mọi site dùng cùng một label nếu semantic thật sự khác nhau; mọi
  quyết định field dùng chung hay site-specific phải dựa trên usage/code audit.

## Acceptance Criteria

- Site-capability matrix được chốt cho `TourProducts`; WingsGo không còn hiển thị
  `Loại tour WingSide`, WingSide vẫn giữ đúng control cần thiết, field dùng
  chung có label trung tính mà không làm thay đổi dữ liệu đã lưu, và site
  context/default đúng theo quyền tài khoản. Với WingsGo, wrapper Page draft
  được provision hoặc có quick action tạo/reuse idempotent trong cùng site; readiness
  hiển thị expected/actual path, wrapper ID/status/health, candidate orphan/shared
  và action sửa tương ứng; không auto-publish, không tạo duplicate và không trả
  wrapper sai liên kết thành trạng thái “chưa có”.
- Sau khi Save thành công, Preview của `TourProduct` hiển thị đúng bản draft đã
  lưu mới nhất theo site và locale; thay đổi draft không bị rơi về bản
  published.
- Preview đồng bộ cùng mode draft với các dữ liệu structured liên quan
  (`TourDepartures`, `DepartureVariants`, wrapper Page) và public anonymous route
  không bị ảnh hưởng trước khi publish. Từ TourProduct, editor có thể quick-add
  hoặc chỉnh sửa tối thiểu nhiều departure mà vẫn lưu vào collection hiện tại,
  đúng site và đúng quyền.
- UI phân biệt rõ `draft đã lưu`, `published` và `chưa lưu`; thao tác Preview khi
  dirty không được silently mở một bản cũ. Trong cùng luồng authoring, gallery
  phải hiển thị thumbnail/metadata của ảnh đã chọn và hỗ trợ add/remove rõ ràng;
  freshness của mỗi departure/giá và tác động public khi hết hạn phải được giải
  thích, còn nhãn kỹ thuật phải được thay bằng copy nghiệp vụ hoặc nằm trong
  nhóm nâng cao có progressive disclosure. Wrapper action và preview action phải
  nói rõ đang mở draft hay public, không dùng một nút `Preview` mơ hồ.
- Signed preview handoff, tenant/site authorization, locale binding, allowlisted
  origin, expiry và fail-closed behavior vẫn pass; không có open redirect hoặc
  cross-tenant data leak.
- Slug input/server normalization, PostgreSQL transaction boundary của relink /
  publish và redirect `301` cũ → mới có unit/integration proof; redirect cũ
  không bị duplicate hoặc ghi đè đích khác.
- Unit/integration/component/E2E và staging/release smoke chứng minh luồng tạo,
  sửa, thêm nhanh departure, readiness, preview, publish boundary và rollback an
  toàn; không có schema change ngoài migration type redirect `301`/`307`, và không có
  CMS production write ngoài release được phê duyệt. Quality proof bao phủ
  gallery ở trạng thái rỗng,
  một/nhiều ảnh, add, remove, media lỗi/thiếu và Save → Preview; freshness
  current/needs-verification/expired; wrapper provision/reuse, relink wrapper,
  path mismatch, orphan/shared candidate, slug-change warning và retry không tạo
  duplicate; VI/EN, desktop/mobile và quyền media vẫn đúng, không làm lộ
  URL/token hoặc dữ liệu cross-tenant.

## Design Notes

- `site` là nguồn xác định capability; không suy luận từ nhãn hiển thị hoặc URL
  browser. Có thể dùng Payload admin condition/custom field presentation tối
  thiểu, nhưng không nhân bản collection.
- Giữ `tourType` trong data contract nếu code/import hiện tại còn dùng; chỉ kiểm
  soát visibility/label trong Admin. Nếu audit chứng minh WingsGo cũng cần
  classification, dùng tên trung tính và test cả hai site.
- Preview phải lấy persisted document bằng ID/slug đã được CMS lưu, sau đó phát
  signed handoff với `siteCode`, `locale`, `path` và `mode`. Public resolver phải
  truyền cùng draft authorization tới query TourProduct/departure/variant/Page.
- Không coi `draftMode()` đơn độc là quyền đọc draft; tiếp tục dùng handoff đã
  ký và origin/site checks của nền tảng.
- Trạng thái preview có thể là UI metadata hoặc response marker; không thêm
  trường CMS chỉ để hiển thị trạng thái.
- Wrapper provisioning chỉ áp dụng cho capability WingsGo đã được chốt; ưu tiên
  reuse wrapper cùng site/path, nếu chưa có thì tạo draft theo một thao tác
  idempotent. Phải giữ quyền của editor và không publish thay họ.
- Departure quick-add là một lớp UI trên collection `TourDepartures`: form
  liên quan có thể thêm nhiều dòng và mở full editor cho dữ liệu nâng cao, nhưng
  không sao chép record vào `TourProduct`.
- Freshness/readiness là trạng thái suy ra từ field hiện có. Cảnh báo phải giúp
  sửa đúng nơi và phân biệt “giá hết hạn theo policy” với “giá bị mất”.
- Progressive disclosure chỉ thay đổi cách trình bày: field nâng cao như builder,
  variant và SEO được nhóm theo nhiệm vụ, có label nghiệp vụ; payload key và
  data contract không đổi.
- `TourProduct` là nguồn dữ liệu tour; wrapper Page là route shell; departure là
  đơn vị lịch/giá có thể publish. Mọi màn hình tạo/sửa phải hiển thị quan hệ này
  bằng ngôn ngữ nghiệp vụ và cung cấp liên kết mở đúng record.
- Wrapper health được tính từ cùng site, pathname chính xác `/tour/<slug>`,
  trạng thái publication và số product đang tham chiếu. Repair/relink chỉ được
  thực hiện qua Payload transaction với kiểm tra same-site/path; không sửa SQL
  trực tiếp và không tự nhận page mồ côi.
- URL migration chỉ phát sinh khi một bản public thật sự đổi slug. Redirect
  được tạo qua Payload trong transaction, có unique `from`, và được revalidate
  sau commit; không tạo redirect cho draft chưa public hoặc khi path không đổi.
- Delivery đọc Redirects ở proxy trước khi render CMS và trả đúng HTTP `301`
  cho record `type = '301'`; fallback server component không được dùng làm
  bằng chứng status.

## Harness Delta

- Tạo story high-risk `US-075` dưới Epic E07/WingsGo.
- Plane mapping trỏ về `E07 - Nền tảng sản phẩm tour WingsGo`, workstream Tours.
- Ghi rõ dependency với US-023/024/035/036/039 và boundary với US-074.
- Mở rộng US-075 thành story “authoring + preview integrity”: wrapper Page
  provisioning có kiểm soát, related departure quick-add, site default/context,
  freshness/readiness và terminology/progressive disclosure. Không tạo child
  task mới để tránh phá mapping sáu acceptance criteria hiện có; các mở rộng
  được gắn vào AC-1, AC-3, AC-4 và AC-6.
- Đợt post-UAT ngày 2026-09-19 tiếp tục gắn vào AC-1/AC-3/AC-4/AC-6; không
  tạo child task mới và không mở rộng `/api/tour-authoring` để trùng với
  `/api/tour-departures` hiện có.
- Scope polish wrapper ngày 2026-09-23 được gắn vào AC-1/AC-4/AC-6 của US-075;
  không tạo US hoặc child task mới. Production case #112/#314/#237 là fixture
  chẩn đoán dữ liệu/UX, không được tự ý sửa trong lúc triển khai UI.
- Khi triển khai, proof phải tách được code regression, authenticated CMS UAT,
  public published isolation và production release proof.

## Evidence

Implementation đã được tích hợp và đã có release production trước đó; bằng chứng
tự động hiện có:

- Admin authoring có site context/default, nhãn trung tính theo capability,
  readiness cho wrapper, related departure quick-add/edit/delete, freshness và
  gallery thumbnail/remove-relation.
- Preview handoff/resolver giữ collection, site, locale và draft mode; có banner
  phân biệt bản nháp đã lưu với bản published và không fallback âm thầm.
- Component: 31 file / 160 test pass; TypeScript và production build pass.
- Integration: `pnpm run test:int` pass toàn bộ 39 file; PostgreSQL advisory-lock
  smoke dùng `hashtext` pass.
- Full unit: 135 file / 1.010 test pass sau khi đồng bộ lại provenance manifest
  brand và source-contract expectation đã bị stale; hai sửa này nằm ngoài
  phạm vi nghiệp vụ TourProduct của US-075.

Authenticated CMS UAT 11 bước và release proof đã có, nhưng post-UAT audit đã
mở lại gate provision/itinerary/quick-add nên story vẫn `in_progress`. Migration
schema duy nhất của phạm vi này là type redirect `301`/`307`; không có CMS production
write ngoài fixture/release được phê duyệt.

### Tour list detail and bulk actions — 2026-09-21

The localized TourProduct title cell replaced Payload's standard title link
with plain text, so selecting a row and pressing `Chỉnh sửa` opened the bulk-edit
drawer instead of the individual tour editor. The title cell now links directly
to that tour's admin detail route, with an accessible name. Collection-level
guidance distinguishes clicking one tour title from using the toolbar action on
selected rows. Keep Payload's shared `general:edit` translation unchanged; a
global rename would also mislabel relationship and folder edit actions.

### Draft preview 404 root-cause fix — 2026-09-22

Product `111` was confirmed as a WingsGo draft with `wrapper_page_id = null`. The
preview handoff itself succeeded, but the public `/tour/<slug>` renderer requires
the linked Page wrapper, so the final URL returned 404; missing departure or
variant rows were not the cause. Payload Preview/live preview now stays disabled
until `wrapperPage` exists, and `/next/preview` returns an actionable HTTP `409`
when a tour draft has no wrapper. Targeted regression checks pass (11 unit tests,
TypeScript and ESLint with 0 errors). Production provision/reuse and authenticated
browser proof remain pending, so US-075 stays `Chờ xác nhận`.

Production release `wingsgroup-us075-preview-guard-20260922-r2` is now live. The
ARM64 image `sha256:15ae02c827dbfd2e822ebf1183afc6061564324a7d6a58988d9f338b729b0421`
passed build/static generation; local health, all six public domains, and the
PostgreSQL/Redis unchanged check passed. The previous app image is retained for
rollback. Authenticated wrapper provision and product 111 preview proof are
still pending, so the story remains `Chờ xác nhận`.
