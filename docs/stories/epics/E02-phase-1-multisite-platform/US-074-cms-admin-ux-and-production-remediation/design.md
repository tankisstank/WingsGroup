# Design

## Design principles

US-074 là một remediation story trên các surface đã tồn tại. Thiết kế phải ưu
tiên tính đúng, giữ quyền hiện hành và có thể rollback. Không giải quyết finding
bằng cách che lỗi bằng CSS/DOM, cho phép route tùy ý, hoặc xóa fixture để làm
cho kiểm thử “sạch” hơn.

## Applied UI package boundary

`applied-cms-ui-package` là visual reference cho Console/operator workflow, không
phải DOM contract của Payload. Chỉ các nguyên tắc sau được nhận vào US-074:

- Token màu/spacing/radius được đưa vào alias có fallback sRGB cụ thể; OKLCH chỉ
  là enhancement trong `@supports`, không được làm mất màu ở WebView cũ.
- Typography dùng Bahnschrift/Segoe UI Variable khi có, sau đó fallback
  `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, Roboto và system-safe mono.
- Action/accent background và foreground là hai role khác nhau; text thông thường
  phải đạt contrast, focus ring và control target vẫn theo contract admin.
- Prototype HTML, `shell()`/`innerHTML`, mock state, static preview asset và
  query-secret flow không được copy vào runtime. React component, Payload access,
  allowlist và signed preview handoff vẫn là source of truth.

Bằng chứng archive/visual review và quyết định compatibility nằm tại
[applied-ui-package-review.md](./evidence/20260914/applied-ui-package-review.md).

## Domain Model

### Admin context

`AdminContext` là ngữ cảnh hiển thị, gồm `siteScope`, `locale`, `role` và route
hiện tại. Context có thể là aggregate “tất cả site được phân quyền”, nhưng mọi
write và mọi query có dữ liệu tenant phải được server re-check. Site switcher chỉ
đổi context được phép, không phải authorization boundary mới.

### Preview target

`PreviewTarget` là giá trị server-resolved cho Site Review:

| Field | Rule |
| --- | --- |
| `siteCode` | Lấy từ site record đã được access kiểm tra |
| `locale` | Chỉ nhận locale trong inventory được phép của site |
| `path` | Public pathname đã normalize, không chứa host tùy ý |
| `origin` | Chỉ từ `PREVIEW_PUBLIC_ORIGINS`/production route contract |
| `handoff` | Signed, short-lived và audience-bound nếu preview cần auth |
| `expiresAt` | Bắt buộc với handoff có quyền đọc draft |

`site.domain` trong CMS là metadata cần được kiểm duyệt, không tự nó trở thành
allowlist URL hoặc nguồn cho open redirect. Local development có thể dùng
same-origin path; production child site phải qua origin đã cấu hình.

### Locale status

Mỗi content record được đánh giá riêng theo locale. `missing`, `draft` và
`published` là ba trạng thái khác nhau; fallback title chỉ là dữ liệu trình bày
cho operator, không ghi ngược vào locale thiếu.

### Theme impact summary

`ThemeImpactSummary` phải phân biệt:

- tổng số page trong scope đã được phân trang/đếm đầy đủ;
- số page đang kế thừa theme;
- số page override riêng;
- subset được dùng cho hero/high-impact nếu có;
- thời điểm và trạng thái truy vấn.

Không dùng `limit=100` như tổng nếu tổng catalog có thể lớn hơn 100.

### Lead triage

Decision 0035 ngày 15/09/2026 chốt vocabulary năm giá trị đang có trong
candidate và Production: `new`, `contacting`, `won`, `no_answer`, `lost`. Không
migrate/alias ngầm giữa `qualified`/`no_response` và `no_answer`; lead cũ chưa
được Sales phân loại tiếp tục có trạng thái `NULL`.

Lead triage là một lớp nghiệp vụ mỏng trên `form-submissions`, tách khỏi trạng
thái giao notification:

| Field | Rule |
| --- | --- |
| `salesStatus` | Enum có nhãn vận hành: `new`, `contacting`, `won`, `no_answer`, `lost`; default `new` cho submission mới; lead cũ chưa phân loại giữ `NULL` |
| `assignedTo` | Relation nullable tới user hiện có; chỉ chọn user trong site scope/quyền được duyệt |
| `salesNote` | Plain text bounded, không dùng rich HTML, có giới hạn độ dài |
| `salesUpdatedAt` | Server-managed timestamp |
| `salesUpdatedBy` | Server-managed actor/audit reference nếu hệ thống audit hiện có hỗ trợ |

`deliveryStatus`, `deliveryUpdatedAt` và `deliveryErrorCode` tiếp tục là field
kỹ thuật read-only. Không gộp `Delivered` của notification với `Đã chốt` của
Sales. Không tạo user mới, không đổi user data và không dùng user relation để
thực hiện account cleanup.

## Application Flow

### 1. Responsive admin shell

1. Đo layout hiện tại ở root `.template-default`, không chỉ ở child wrap.
2. Ở `max-width: 680px`, chuyển parent grid về một track `1fr` hoặc block layout
   tương đương; bảo đảm wrap, header, nav và main content có width dương.
3. Ở tablet, dành vùng riêng cho hamburger và breadcrumb; không dùng offset cố
   định khiến hai phần tử phụ thuộc vào độ dài text.
4. Ở desktop, nhóm locale và account trong layout flex có gap/token rõ ràng;
   account không được position đè lên locale.
5. Giữ style trong phạm vi Payload admin và tôn trọng reduced motion, focus
   visible, zoom và text dài.

### 2. Site Review preview

1. API Site Review resolve site, locale và pathname.
2. Server tạo preview descriptor bằng preview-origin utility hiện có; production
   không lấy origin từ request hiện tại nếu site con có host riêng.
3. Nếu xem draft/private content, server mint signed handoff short-lived cho
   đúng site và locale.
4. Client dùng absolute target đã được server kiểm tra. Client chỉ được nối
   path vào origin đã nhận, không nhận arbitrary `http(s)` từ user input.
5. Iframe được cấu hình cùng CSP/frame policy; lỗi preview hiển thị trạng thái
   actionable (`Preview unavailable`, site/path/expiry), không nuốt thành trang
   trắng.

### 3. Domain normalization

1. Chạy production preflight read-only để lấy site code, primary domain,
   additional domains, canonical origin, proxy/host allowlist và preview origin.
2. Đối chiếu với quyết định DNS. Theo repo contract, WingsGo mặc định là
   `wingsgo.vn`; `wingsgo.wingsgroup.vn` chỉ được dùng nếu DNS owner phê duyệt.
3. Tạo migration/config change exact-scope cho WingsGo, kèm backup, dry-run,
   before/after diff và rollback. Không đụng collection Users.
4. Kiểm tra host canonical, HTTPS, redirect, public route, Site Review và
   `PREVIEW_PUBLIC_ORIGINS` sau apply.

### 4. Locale controls and translation

1. Collection config dùng `ContentLocaleCompactDocumentControl` cho Pages,
   TourProducts, Posts, TourDepartures và Media; các collection khác chỉ đổi
   khi matrix scope được duyệt.
2. Toolbar có overflow ngang có chủ ý, không che sticky document controls hoặc
   save action; status của locale hiện tại nằm gần control.
3. Locale metadata dùng label không chứa code nếu Payload tự append code; nếu
   renderer không tự append thì formatter thêm code đúng một lần.
4. List title renderer nhận default/source title và locale status để hiển thị
   `[Chưa dịch] — <source title>`, đồng thời giữ link vào đúng record/locale.
5. Giữ phân biệt admin-interface locale với content locale; không enable public
   `ja`, `ko`, `fr`, `de` trong story này.

### 5. Topbar, search, pagination and date

- Topbar dùng layout flow/flex/grid có named regions: menu, breadcrumb, locale,
  account. Các vùng có min-width/max-width và overflow policy thay vì z-index
  để che nhau.
- Search input dành `padding-inline-start` tương ứng icon và giữ icon ở vị trí
  không chặn selection/caret. Contract được áp dụng cho mọi list có search.
- Pagination được kiểm tra từ text node/ARIA label và CSS whitespace; không
  sửa bằng chèn khoảng trắng trong một label nếu Payload sinh nội dung qua nhiều
  node.
- Admin date formatter nhận Date/ISO, timezone `Asia/Ho_Chi_Minh`, locale `vi-VN`
  và output explicit `dd/MM/yyyy HH:mm`. Các component đã có formatter riêng
  phải dùng chung helper hoặc có lý do documented.

### 6. Theme impact and site context

Theme Manager có thể dùng count endpoint hoặc pagination server-side. Client phải
biết `hasMore`/total và không coi batch đầu tiên là full summary. Khi user đổi
site/route trong lúc request, response cũ bị bỏ qua; khi dirty state tồn tại,
chuyển context phải có guard.

Site switcher, nếu triển khai trên topbar, chỉ gửi site code đã chọn tới các
query hỗ trợ scope. Server vẫn áp dụng `siteScopedAccess`; người dùng không có
site đó nhận 403/empty state đúng nghĩa, không nhận dữ liệu site trước.

### 7. Tour itinerary and Page Wizard

Itinerary row có summary day number/title và collapsed state cục bộ. `Collapse
All`/`Expand All` chỉ thay đổi UI state, không mutate content. Khi validation lỗi,
focus/scroll đưa operator tới day/field tương ứng.

Sau Page Wizard, primary action là `Mở trang vừa tạo`, secondary action là `Tạo
trang khác từ preset`. “Tạo trang khác” khởi tạo flow mới với preset/site đã chọn
nhưng không reset record hiện tại. Nếu product muốn reset block trên record thì
đó là một command destructive riêng và phải có confirmation, diff/undo hoặc
rollback rõ ràng.

### 8. Lead triage

1. Public lead route tiếp tục là đường duy nhất tạo submission; không mở create
   thủ công chỉ để hỗ trợ triage.
2. Operator mở submission hiện có, xem site/form/createdAt và cập nhật status,
   assignee hoặc note trong cùng site scope.
3. Update API validate enum, relation scope, note length và optimistic/concurrent
   update behavior; không cho client ghi `salesUpdatedAt`/actor.
4. Audit record chỉ chứa actor, submission id, site, field transition và timestamp;
   không ghi name/email/phone/free text vào log hoặc telemetry.
5. Export/PII policy hiện hành được giữ nguyên. Việc bổ sung field không mở rộng
   read/update/export cho editor nếu chưa có decision về role.

## Interface Contract

### Site Review preview descriptor

Có thể giữ endpoint hiện tại nếu response đã đủ thông tin; nếu cần đổi contract,
response nên có dạng typed tương đương:

```ts
type SiteReviewPreview = {
  siteCode: string
  locale: string
  path: string
  href: string
  mode: 'same-origin' | 'signed-handoff'
  expiresAt?: string
}
```

Contract bắt buộc reject/không render khi `href` không thuộc allowlist, locale
không hợp lệ, site không thuộc scope hoặc handoff đã hết hạn. Không cho phép
client gửi `origin` tùy ý.

### Locale and labels

Locale selector phải expose code một lần trong accessible name, ví dụ
`Tiếng Việt (vi)`, không phải `Tiếng Việt (vi) (vi)`. List fallback phải expose
status bằng text và accessible name, ví dụ `[Chưa dịch] — Khám phá Việt Nam`.

### Lead triage contract

Nếu schema được mở rộng, API/local API phải giữ backward compatibility cho
submission cũ: `salesStatus` mặc định được resolve là `new` hoặc migration backfill
exact-scope; `assignedTo` nullable; note rỗng hợp lệ. Public create không nhận
triage fields từ visitor. Update errors phải phân biệt validation, forbidden,
not-found và stale/concurrent update.

## Data Model and migrations

- Domain normalization là config/data change exact-scope trên record Site của
  WingsGo và các bảng/allowlist liên quan; không cập nhật Users.
- Lead triage nếu được duyệt cần migration additive cho field/enum/relation,
  index theo `site + salesStatus + assignedTo + createdAt` nếu query plan chứng
  minh cần thiết, và audit/retention review theo chính sách lead hiện hành.
- Migration phải chạy được trên PostgreSQL production-shaped database, không
  chỉ SQLite local. SQLite bootstrap vẫn phải pass hoặc có compatibility path.
- Không hard-delete lead, page, tour, media, site hoặc user trong migration này.
- Backup/restore artifact, dry-run row count và after-state diff là bắt buộc trước
  production write.

## UI / Platform Impact

| Surface | Impact |
| --- | --- |
| Payload admin shell | Responsive grid, topbar, search, pagination/date CSS/labels |
| Pages/Posts/Tours/Media | Compact locale toolbar and missing-translation presentation |
| Site Review | Secure tenant-aware iframe preview and error state |
| Theme Manager | Complete impact count and stale-response guard |
| Page Wizard/Tour editor | Safe create-another action and itinerary collapse controls |
| Form submissions | Bounded triage fields, scoped update UI and audit behavior |
| Production ops | WingsGo domain/canonical/preview config and canary/rollback |

Không thay đổi public locale enablement, public content layout hoặc asset token
contract ngoài phần domain/canonical đã được phê duyệt.

## Observability

- Browser E2E thu console errors, uncaught exceptions, failed iframe requests,
  layout measurements và screenshot path; evidence phải được sanitize.
- Preview server log ghi site code, locale, path hash/result/expiry, không ghi
  signed token đầy đủ.
- Domain rollout log ghi exact site, before/after non-secret config, actor,
  approval reference, health check và rollback result.
- Lead triage audit ghi field transition, actor/site/submission id và timestamp;
  PII/free text không vào log.
- Metric/alert nên phân biệt preview 404/403, site-scope 403, frontend admin
  error, migration failure và lead update validation failure.

## Alternatives Considered

1. **Chỉ đặt `width: 100%` cho `.template-default__wrap`.** Không đủ vì lỗi nằm
   ở parent grid track; chọn sửa parent track/layout trước.
2. **Ghép `site.domain` trực tiếp vào URL iframe.** Bị loại vì domain CMS có thể
   mutable/untrusted và dẫn tới open redirect hoặc host nhầm; dùng allowlist và
   signed handoff.
3. **Ẩn popup locale bằng z-index/CSS.** Bị loại; dùng compact document control
   đúng component để giữ semantics, focus và status.
4. **Sửa duplicate locale bằng DOM mutation.** Bị loại; sửa locale metadata hoặc
   localization source để server/client/accessible name cùng đúng.
5. **Xây CRM đầy đủ trong US này.** Bị loại; chỉ thêm triage tối thiểu cần cho
   workflow Sales/CSKH và tạo story riêng nếu cần automation.
6. **Xóa tài khoản test/UAT để “chuẩn hóa production”.** Bị loại theo yêu cầu
   người dùng; account là non-goal và phải được bảo toàn.
