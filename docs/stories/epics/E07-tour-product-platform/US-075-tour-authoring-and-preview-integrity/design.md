# Design — US-075

## Design Principles

1. Site scope quyết định presentation; không dùng cách đổi text theo URL hoặc
   CSS để che một field sai semantic.
2. Preview phải trung thực với persisted state. Bản published và bản draft là
   hai nguồn khác nhau, phải hiển thị khác nhau khi tồn tại cả hai.
3. Giữ nguyên schema, access control và data contract hiện có. Đây là story
   integrity/UX và preview resolution, không phải data migration.
4. Tái sử dụng secure preview perimeter của US-074; không phát minh một cơ chế
   secret hoặc redirect mới.

## Domain Model

### Site capability

| Site code | Tour surface | `tourType` presentation | Dữ liệu bắt buộc |
| --- | --- | --- | --- |
| `wings-go` | Retail structured tour | Ẩn nếu chỉ phục vụ WingSide; nếu usage chứng minh dùng chung thì label trung tính | `market`, duration, content, wrapper/route contract |
| `wing-side` | Consultative inbound tour | Hiển thị với semantic WingSide | site-scoped content, tour type, route/commerce data theo contract |

Ma trận cuối cùng phải được xác nhận từ collection, query, import và production
data read-only trước implementation. Việc condition field chỉ thay đổi admin
presentation; không được xóa `tourType` khỏi payload type hoặc database.

### Guided operator workflow

Form TourProduct nên có một dải readiness theo nhiệm vụ, đặt gần đầu form hoặc
trong một summary panel cố định:

```text
Thông tin tour → Lộ trình → Gallery → Ngày khởi hành & giá → Preview/Publish
```

Mỗi bước hiển thị `Đã đủ`, `Cần bổ sung` hoặc `Đang kiểm tra`, kèm liên kết về
tab/field xử lý. Các trường cốt lõi được hiển thị trước; builder, variant, SEO
và provenance nằm trong nhóm nâng cao có mô tả ngắn. Đây là progressive
disclosure ở lớp presentation, không phải xóa field hay tạo data model mới.

### Wrapper Page provisioning

Catalog WingsGo hiện cần một Page published có pathname `/tour/<slug>` liên kết
với TourProduct. UX có thể cung cấp một trong hai hành động rõ ràng: provision
wrapper Page draft khi Save lần đầu, hoặc nút `Tạo trang tour nháp` trong
readiness panel. Cả hai phải dùng cùng service/idempotency key theo
`site + slug + product identity`, reuse Page hợp lệ đã có và báo conflict nếu
đã tồn tại Page khác. Hành động này không được tự động Publish Page hoặc
TourProduct, không bypass quyền editor và không áp dụng mặc định cho WingSide
khi chưa có capability contract tương ứng.

Readiness phải phân biệt `Chưa có wrapper`, `Wrapper nháp đã tạo`, `Wrapper đã
publish` và `Wrapper sai site/path`. Lỗi provision cần trả về hành động sửa
được, không để editor suy ra nguyên nhân từ một 404 ngoài public site.

### Departure quick-add

`TourDepartures` vẫn là collection độc lập vì có lifecycle, freshness và quyền
riêng. Trong form TourProduct, related table chỉ làm lớp điều phối thao tác:

| Cột | Ý nghĩa nghiệp vụ |
| --- | --- |
| Ngày khởi hành | Ngày tour/flight khởi hành |
| Tuyến hoặc điểm đi | Ngữ cảnh hành trình |
| Giá và tiền tệ | Giá đang bán/được xác minh |
| Trạng thái | Nháp, đã xuất bản, cần xác minh hoặc hết hạn |
| Thao tác | Thêm nhanh, sửa chi tiết, mở record |

`Thêm ngày khởi hành` mở một form gọn cho các field tối thiểu và cho phép thêm
nhiều dòng liên tiếp; dữ liệu nâng cao vẫn mở full editor của
`TourDepartures`. Mọi create/update phải gán đúng `tourProduct`, `site` và
quyền hiện hành. Không copy departure vào TourProduct, không làm mất relation
đến product và không tạo record trùng khi user retry.

### Freshness and readiness

Trạng thái giá được suy ra từ `verifiedAt`, `expiresAt` và policy hiện có:
`Còn hiệu lực`, `Cần xác minh` hoặc `Đã hết hạn`. Khi hết hạn, Admin phải giải
thích rằng public catalog có thể chuyển giá sang `Liên hệ tư vấn`; đây là kết
quả governance, không phải giá bị xóa. Readiness có thể cảnh báo trước Publish
nhưng không được tự gia hạn, sửa giá hoặc bỏ freshness check. Cảnh báo phải
đặt cạnh departure tương ứng và dẫn tới đúng field cần xử lý.

### Business terminology and progressive disclosure

Presentation nên ưu tiên ngôn ngữ mà Tour Operator hiểu, trong khi giữ nguyên
payload key và code contract:

| Hiện tại | Đề xuất hiển thị | Cách trình bày |
| --- | --- | --- |
| `Decision Panel` | `Tóm tắt dịch vụ` | Hiển thị ở nhóm nội dung chính |
| `routeViz` / `Route visual` | `Lộ trình & điểm dừng` | Có helper mô tả ngắn |
| `travelLegs` / `stops` | `Các chặng di chuyển` / `Điểm dừng` | Nhóm itinerary |
| `slug` / `Slug tour` | `Đường dẫn tour` | Giải thích URL public, không bắt user hiểu routing |
| `bcfg` / `Builder config` | `Cấu hình hiển thị` | Nhóm nâng cao, collapsed mặc định |
| `variantStrategy` | `Cách ưu tiên nội dung biến thể` | Helper text và giá trị mặc định theo policy |
| `provenance` | `Nguồn dữ liệu` | Read-only hoặc nhóm nâng cao |

Copy VI/EN phải giữ parity 1:1. Không đổi tên field trong API chỉ để đổi nhãn
Admin; mọi label mới cần component test để tránh lộ key kỹ thuật trở lại.

### Gallery authoring experience

`gallery` hiện là relationship `hasMany` tới collection `media`. US-075 giữ
nguyên field và data contract, nhưng thay lớp presentation mặc định bằng một UX
giúp editor nhận diện asset trước khi Save:

| Trạng thái | Thông tin bắt buộc | Hành động |
| --- | --- | --- |
| Empty | “Chưa có ảnh gallery” và số lượng 0 | Mở Media picker để thêm |
| Selected | Thumbnail, tên file hoặc alt text, ID rút gọn nếu thiếu metadata | Mở/xem ảnh; xóa đúng item |
| Loading | Placeholder/skeleton và thông báo đang tải metadata | Không tạo quan hệ tạm ngoài form state |
| Missing/forbidden | Placeholder, lý do không xem được, vẫn nhận diện được relation | Xóa relation hoặc mở Media admin nếu có quyền |
| Invalid value | Thông báo dữ liệu không hợp lệ, không làm crash form | Không silently thay bằng URL/asset khác |

Component ưu tiên dùng admin field/presentation của Payload trên chính
relationship `gallery`, nhận cả relation ID và object đã populate. Metadata/URL
thumbnail chỉ được hydrate từ Media endpoint hoặc loader đã có access control;
không cho editor nhập URL tùy ý và không nhân bản upload pipeline. Hành động
remove phải cập nhật form state của relationship để Save quyết định việc persist;
không tự xóa bản ghi Media. Thứ tự quan hệ phải round-trip nguyên vẹn; reorder
chỉ được thêm nếu collection/UI hiện tại đã có contract rõ ràng.

Preview trong form là preview asset đã chọn, khác với public TourProduct Preview:
asset preview không chứng minh draft đã persisted. Hai trạng thái phải có copy và
test riêng để editor không nhầm “đã thấy thumbnail” với “đã lưu thành công”.

### Preview state

Preview cần giữ các identity sau trong suốt request chain:

```text
CMS record
  -> persisted document ID + slug + requested locale
  -> authenticated preview initializer
  -> signed handoff { siteCode, locale, path, mode }
  -> tenant public route
  -> draft-aware structured resolver
  -> TourProduct + Departure + Variant + wrapper Page
```

`mode = draft` chỉ hợp lệ khi document đã có saved draft/version và handoff còn
hiệu lực. Khi không có saved draft, UI phải nói rõ `published`; không được gắn
nhãn draft cho dữ liệu published.

## Application Flow

### Authoring flow

1. Editor mở `Tour Products` trong site context đã xác định.
2. CMS render field theo site code đã resolve từ relationship `site`.
3. Readiness panel hướng editor qua thông tin cốt lõi, itinerary, gallery và
   departure/giá; các field nâng cao được mở khi cần.
4. Editor có thể provision/reuse wrapper draft và quick-add nhiều departure từ
   related table; server vẫn lưu các record ở collection riêng.
5. Editor sửa title/content/itinerary hoặc các field được phép và bấm Save.
6. UI chờ trạng thái save/autosave hoàn tất trước khi cho Preview.
7. Preview initializer re-fetch record theo ID, locale và site scope; không dùng
   unsaved form state làm nguồn public.

### Preview flow

1. Generate preview URL từ collection + document ID + persisted slug.
2. Preview initializer đọc document với Payload draft semantics và xác nhận
   document/site/locale hợp lệ.
3. Server phát signed, short-lived handoff tới production preview origin đã
   allowlist hoặc local alias đúng môi trường.
4. Tenant handoff bật draft mode chỉ với grant hợp lệ.
5. `cmsPage`/tour queries dùng cùng draft authorization để lấy TourProduct,
   departures, variants và wrapper Page.
6. Public page hiển thị marker trạng thái chỉ trong preview context. Anonymous
   request vẫn chỉ đọc published.

### Failure states

- Save chưa hoàn tất: hiển thị yêu cầu chờ Save hoặc lưu trước khi Preview.
- Không có draft: mở published có nhãn rõ ràng, hoặc hiển thị thông báo tùy
  quyết định UX; không silently gọi đó là draft.
- Handoff hết hạn/sai site/sai locale: fail closed, có lỗi actionable trong CMS.
- Draft resolver không đọc được linked record: không fallback một phần sang
  published mà không báo; ghi rõ dependency thiếu hoặc dùng policy đã chốt.

## Interface Contract

Không đổi public API contract hoặc schema. Các điểm cần kiểm tra:

- Collection admin field condition/presentation nhận site relationship an toàn.
- Preview URL giữ `collection`, `id`, `path`, `locale` đã được encode.
- Handoff giữ `siteCode`, `locale`, `defaultLocale`, `path`, `mode`, expiry và
  document identity.
- Preview response/marker phân biệt `draft` với `published` mà không lộ token.
- Lỗi 403/404/409/503 được giữ đúng semantics và hiển thị trạng thái có thể
  xử lý trong Admin.

## Data Model and Migration Boundary

- Không thêm bảng, field database, migration hoặc version table riêng.
- Dùng `TourProducts.versions.drafts` và Payload version behavior hiện có.
- Không backfill/xóa `tourType`; dữ liệu cũ phải round-trip qua API và renderer.
- Nếu cần metadata UI, giữ trong runtime state hoặc preview response, không lưu
  ngược vào CMS.

## Authorization and Tenant Rules

- `contentCreateAccess`, `siteScopedAccess`, `preventEditorPublish` và
  `enforceTourProductPublishSite` tiếp tục là gate server-side.
- Editor được lưu draft nhưng không được publish nếu policy hiện tại cấm.
- Site Manager chỉ preview record trong site được cấp quyền.
- Handoff sai `siteCode`, path, locale, origin hoặc document phải bị từ chối.
- Không dùng `overrideAccess: true` cho public draft query trừ khi đã nằm trong
  server-issued preview boundary được kiểm thử.

## UI / Platform Impact

- Admin: Tour Products trên desktop/mobile, ít nhất tại `wingsgroup.vn/admin`,
  gồm form `gallery` với thumbnail, add/remove và failure states.
- Public preview: `wingsgo.vn/tour/<slug>` và local/staging equivalent.
- Locale: VI/EN; không mở thêm public locale.
- Production: chỉ app release/config đã được approve; không ghi CMS content trong
  bước triển khai story nếu chưa có fixture/release approval.

## Operator UX quality bar

- Mỗi input và trạng thái có label nhìn thấy, helper text ngắn và lỗi đặt gần
  field; không yêu cầu người dùng đọc raw key hoặc console log.
- Nút add/remove/Preview/Publish có vùng tương tác tối thiểu khoảng 44px, dùng
  được bằng keyboard và có focus state rõ ràng.
- Thumbnail có alt text/filename fallback, loading state và placeholder khi
  missing/forbidden; không làm layout nhảy hoặc che Save/Preview ở viewport
  390px.
- Trạng thái Save, Preview mode và readiness không chỉ dựa vào màu; phải có
  text/icon semantic để người dùng phân biệt khi tương phản hoặc prefers-color
  scheme thay đổi.
- Error copy VI/EN phải chỉ ra thao tác tiếp theo. Các trạng thái liên quan đến
  quyền hoặc security không được lộ token, URL nội bộ hay thông tin tenant khác.

## Observability

Log sanitized event cho preview initialize/handoff failure với:

- site code, collection, document ID hash, locale, mode, result, reason class;
- không ghi preview token, password, email, phone hoặc free-text tour content.

Nếu hệ thống chưa có event riêng, test có thể dùng response/status marker nhưng
không được tạo logger phức tạp chỉ cho story này.

## Alternatives Considered

1. **Xóa `tourType` khỏi TourProducts** — loại vì có code/import WingSide đang sử
   dụng và có nguy cơ data loss/schema drift.
2. **Đổi label toàn bộ thành “Loại tour”** — chỉ chấp nhận nếu audit chứng minh
   WingsGo và WingSide cùng dùng semantic; không giải quyết visibility nếu field
   thực sự site-specific.
3. **Cho Preview đọc public URL** — loại vì không chứng minh draft và làm mất
   mục đích của Payload versions.
4. **Cho browser truyền domain/slug tùy ý** — loại vì phá tenant isolation và
   preview security.
5. **Tạo một collection riêng cho WingsGo** — loại vì nhân bản model và vượt
   scope; chỉ cân nhắc trong một decision mới nếu capability không thể biểu diễn
   bằng presentation/access hiện có.
