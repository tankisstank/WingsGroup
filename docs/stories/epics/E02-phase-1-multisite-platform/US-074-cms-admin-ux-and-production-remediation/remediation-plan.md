# US-074 — Kế hoạch đóng blocker, kiểm thử và hoàn thiện

## 1. Mục tiêu và kết luận hiện tại

Tài liệu này là kế hoạch remediation sau review candidate ngày 14/09/2026.
Mục tiêu là đưa US-074 từ trạng thái in_progress tới trạng thái đủ điều kiện
nghiệm thu, theo thứ tự:

1. Khôi phục các khả năng vận hành bị chặn: mobile admin và preview
   locale/tenant.
2. Đóng các acceptance gap có thể nhìn thấy hoặc có nguy cơ mất dữ liệu:
   site context, title fallback, locale status, labels và pagination.
3. Kiểm thử lại các use case thực tế trên môi trường có dữ liệu và account được
   chuẩn bị an toàn.
4. Chỉ sau khi có approval mới thực hiện production canary, xác minh sau deploy
   và handover.

Candidate US-074 đã được build và canary trên Production; runtime tương ứng được
verify tiếp trên release đang live. URL CMS Production được dùng trong mọi gate là:
https://wingsgroup.vn/admin. Origin cần được dùng cho allowlist/security là
https://wingsgroup.vn; /admin chỉ là đường dẫn truy cập CMS.

### Scope waiver ngày 15/09/2026

Theo yêu cầu người dùng, không chạy authenticated browser validation trên
staging thật và không chạy Safari/iOS. Hai coverage được đánh dấu
`waived/unverified`, không chuyển thành pass giả. Waiver chỉ bỏ qua hai hoạt
động kiểm thử; production owner approval, backup/restore point, canary,
after-state, rollback readiness và xác nhận domain/preview đã được ghi tại
[production-release.md](./evidence/20260915/production-release.md).

## 2. Phạm vi và nguyên tắc không thay đổi

### Trong phạm vi

- Responsive admin shell tại mobile/tablet, topbar, search, pagination và date
  presentation.
- Preview Site Review đúng tenant, public locale và signed handoff.
- Site context/switcher và phạm vi truy cập trên các route admin.
- Compact locale control, title fallback, trạng thái bản dịch và nhãn tiếng Việt.
- Pagination đầy đủ trong Site Review và Theme impact.
- Itinerary Tour, Page Wizard, lead triage và các test/UAT liên quan theo scope
  đã duyệt của US-074.
- Production preflight, release gate, canary, after-state và rollback evidence.

### Ngoài phạm vi bắt buộc

- Xóa, disable, rename, seed, reset password, rotate credential hoặc đổi role,
  site membership của account hiện hữu.
- Xóa hoặc làm sạch các tài khoản test/UAT hiện có. Finding về account được
  loại khỏi US-074 theo yêu cầu người dùng.
- Không tạo fixture account/data tạm trên Production. Local/staging
  non-Production được phép dùng ephemeral fixture cho validation; teardown phải
  xóa đúng exact ID đã tạo và không được chạm bản ghi hiện hữu.
- Đổi public locale policy; ja, ko, fr, de vẫn không tự public khi chưa có
  quyết định sản phẩm riêng.
- Đổi domain Production theo phỏng đoán. Domain WingsGo chỉ được sửa khi
  preflight read-only và owner xác nhận before/after cụ thể.
- Dùng dữ liệu lead thật để tạo bằng chứng kiểm thử.

Nguyên tắc chung: ưu tiên thay đổi nhỏ, backward-compatible, fail-closed; không
coi một test chạy được là hợp lệ nếu nó cần phá vỡ account governance hoặc làm
thay đổi dữ liệu Production ngoài approval.

## 3. Danh sách blocker và gate đóng

| ID | Mức độ | Blocker/gap | Gate để đóng |
| --- | --- | --- | --- |
| R-01 | P1 | Preview locale khác default có thể redirect sai path hoặc render sai locale | Có route/handoff proof cho WingsGo vi → en, WingSide en → it, default locale, invalid/expired/wrong binding |
| R-08 | P1 | Chưa có authenticated Production config, domain/allowlist/proxy approval, canary và rollback | **Đã đóng:** exact diff/approval, allowlist, canary, after-state và rollback readiness tại `production-release.md` |
| R-09 | P1 | Authenticated admin E2E cần fixture role/site và dữ liệu test an toàn | **Đã đóng trong phạm vi waiver:** fixture chỉ non-Production, cleanup exact ID; Production không mutate account/data |
| F-01/R-01 | P0/P1 | Mobile blank đã có local proof nhưng chưa có staging/production smoke; preview locale vẫn mở | **Đã đóng:** responsive/local Chrome smoke và Production preview matrix pass; staging/Safari waiver được ghi rõ |
| R-03 | P2 | Title fallback cố định vi, không phù hợp site có default en | Site-aware source locale + fixture WingSide en source/it missing + no cross-site leak |
| R-04 | P2 | Locale status dot thiếu accessible name và biến API error thành Chưa tạo | Có text/ARIA rõ, unknown/error riêng, retry/announcement và test lỗi |
| R-05 | P2/P3 | Page wrapper và generateSlug còn tiếng Anh trong Tour Products | Source config đã dịch; snapshot/assertion không còn nhãn lỗi |
| R-02 | P2 | Site Switcher chưa global trên edit/custom routes | Route matrix, dirty guard và API scope proof; hoặc có decision ghi rõ route không hỗ trợ |
| R-06 | P2 | Site Review giới hạn 1.000 record và bỏ qua pagination | Server pagination/giới hạn minh bạch + test trên 1.000 record |
| R-07 | P2 | Pagination spacing chưa reproduce ổn định | Probe có artifact trên dataset 0/1/10/11/trang cuối; patch nếu tái hiện, nếu không ghi no-repro |
| R-10 | P2 | Vocabulary lead triage giữa design và candidate không thống nhất | **Đã đóng:** Decision 0035 chốt 5 status; design/migration/API/UI/test và Production enum đồng bộ |

P0 mobile có thể phát hành hotfix độc lập nếu cần khôi phục vận hành khẩn cấp.
Trong lượt này R-01, R-08, R-09 và R-10 đã có evidence đóng; không diễn giải
staging/Safari waiver thành pass.

## 4. Thứ tự thực hiện bắt buộc

    P0 baseline + safety check
            ↓
    P1-A preview locale/security ──┐
    P1-B safe admin E2E fixture ────┼──→ Gate A: blocker recovery
    P0 mobile smoke ────────────────┘
            ↓
    P2 context/locale/labels/pagination
            ↓
    P2 itinerary/Wizard + lead vocabulary/triage
            ↓
    full regression + five use-case UAT
            ↓
    Production read-only gate → approval → canary → after-state → handover

Không deploy trong lúc còn đang sửa R-01 hoặc khi chỉ có anonymous preflight.
Production write đã được giới hạn ở exact domain correction sau preflight,
approval và backup; không thực hiện production DB write cho fixture/lead/content.

## 5. Phase 0 — Baseline, ownership và điều kiện an toàn

### 5.1. Việc cần làm

- Chốt candidate commit/build đang được review; ghi git SHA, Next/Payload
  version, DB engine, environment, URL CMS, timezone và feature/config flags.
- Chụp baseline read-only cho /admin login shell và redirect/bootstrap cookie,
  Pages, Posts, Tour Products, Media, Leads, Site Review và Theme Manager.
- Production release owner đọc preview origin/allowlist/reverse proxy
  configuration; không chia sẻ secret hoặc token vào evidence.
- Gán bốn vai trò, không nhất thiết là bốn người:
  - Engineering owner: sửa code và migration.
  - QA owner: kiểm thử độc lập và quyết định pass/fail theo acceptance.
  - Product/operations owner: chốt lead vocabulary, site/domain contract và UAT.
  - Production release owner: approval, canary, after-state và rollback.
- Trước khi chạy E2E, audit script prepare-db, fixture, setup/teardown và
  global setup. Nếu phát hiện thao tác account, dừng suite đó và chuyển sang
  fixture/account staging đã tồn tại hoặc test không cần authentication.

### 5.2. Điều kiện hoàn thành Phase 0

- Có baseline artifact và bảng owner/dependency.
- Có dataset test tối thiểu cho hai tenant:
  - WingsGo: default vi, public en.
  - WingSide: default en, public it.
- Có record fixture cho bản dịch đầy đủ, bản dịch thiếu và record không thuộc
  scope của user hiện tại.
- Có xác nhận bằng văn bản rằng test/release không được mutate account/dữ liệu
  hiện hữu; ephemeral lifecycle chỉ được phép trên non-Production.
- Nếu chưa có staging fixture/account an toàn và môi trường không cho phép
  ephemeral fixture, chỉ các test độc lập và safety contract được chạy;
  authenticated coverage vẫn là dependency mở của R-09, không được đánh dấu
  pass giả.

## 6. Phase 1 — Đóng blocker P0/P1

### 6.1. R-01 — Sửa preview locale khác default

Mục tiêu: request preview phải giữ đúng site, document, locale và public path,
kể cả khi locale khác default.

Cách thực hiện:

1. Giữ canonical identity/claims path ở dạng không prefix locale nếu đó là
   contract hiện hành của previewHandoff; không đổi binding path một cách
   nửa vời.
2. Tại local preview handoff, dùng helper tương đương
   prefixCanonicalPathWithLocale(path, locale, defaultLocale):
   - default locale: /posts/foo;
   - non-default public locale: /en/posts/foo hoặc /it/posts/foo theo
     locale contract của tenant;
   - CMS-only/non-public locale: từ chối, không tự mở route public.
3. Không lấy host tùy ý từ client. Host phải được resolve từ site config đã
   allowlist hoặc local alias hợp lệ.
4. Giữ TTL grant 60 giây, không đưa signed token dài hạn vào query string.
5. Khi đổi nhanh item/site/locale, hủy hoặc bỏ qua response cũ; không hiển thị
   preview của tenant trước.
6. Với lỗi 403/404/timeout, hiển thị trạng thái có thể hành động: thử lại, mở tab
   mới, hoặc thông báo item chưa public/host chưa được cấu hình.

Test bắt buộc:

- Unit:
  - WingsGo vi → vi: không prefix.
  - WingsGo vi → en: prefix đúng và grant identity vẫn khớp.
  - WingSide en → en: không prefix.
  - WingSide en → it: prefix /it đúng.
  - ja, ko, fr, de: bị từ chối theo public policy.
  - Sai site/document/path/locale, token hết hạn, token bị sửa: fail closed.
- Integration/route:
  - POST handoff trả grant đúng tenant/locale.
  - GET redirect tới host/path đúng, không lộ token.
  - Frame authorization kiểm tra origin và source.
- Browser:
  - CMS tại https://wingsgroup.vn/admin mở Site Review của WingsGo và WingSide.
  - Đổi vi → en, en → it, đổi item liên tục, refresh/retry sau timeout.
  - Thử Safari/iOS hoặc ghi rõ coverage chưa thực hiện; Chrome local không đủ
    để đóng cross-site browser coverage.

Evidence preview-matrix.md phải có request, expected host/path/locale, result
và screenshot/log đã che token. R-01 chỉ đóng khi cả default và non-default
public locale đều đạt.

### 6.2. F-01 — Xác nhận mobile fix trên release build

Candidate đã có local Chromium geometry proof; cần lặp lại trên build thực tế
được phát hành:

- 360, 390, 430, 600, 679, 680, 681, 768, 820, 1024, 1366, 1440px.
- Nav đóng/mở, portrait/landscape, back/forward, focus vào search, form dirty,
  sticky save và iframe Site Review.
- Kiểm tra cả viewport thật iPhone/Android/iPad nếu có; nếu không có, đánh dấu
  coverage gap thay vì suy ra từ Chromium desktop.
- Assert nội dung hữu dụng, không chỉ width > 0: heading, nav, breadcrumb,
  form control, save/publish control và error feedback phải visible/clickable.

Stop condition: nếu template-default wrap lại co về 0, có overlap làm mất thao
tác, hoặc admin login shell không usable ở 360px, dừng canary và rollback
artifact ứng dụng.

### 6.3. R-08 — Domain/Production preflight, không tự suy đoán

1. Release owner đọc trước các giá trị hiện tại của WingsGo: site ID, domain,
   canonical base, redirect/HTTPS, preview allowlist, reverse proxy route và
   DNS owner record.
2. So sánh với contract đã được Product/Operations owner phê duyệt. Không coi
   wingsgo.local, wingsgo.vn hay wingsgo.wingsgroup.vn là đúng chỉ dựa trên
   audit text.
3. Nếu hiện tại đã đúng: ghi no-op, giá trị đã kiểm chứng và người xác nhận.
4. Nếu sai: tạo dry-run có preimage, after-value, site ID, migration/config
   command và expected canonical/preview behavior. Chỉ apply sau approval.
5. Re-read sau apply; nếu preimage đã đổi, hủy thao tác và điều tra drift.
6. Verify HTTPS, redirect, canonical, preview host và không làm đổi domain của
   tenant khác.

Evidence domain-preflight.md phải phân biệt rõ anonymous, authenticated-read,
dry-run, applied và after-state. Anonymous /admin login shell một mình không
đóng R-08.

### 6.4. R-09 — Mở đường kiểm thử admin an toàn

US-074 hỗ trợ hai chế độ, nhưng cả hai đều fail-closed với Production:

- Phương án A — staging pre-provisioned: dùng account/fixture đã tồn tại, chỉ
  đăng nhập và thao tác trong tenant test được cấp. Teardown chỉ được xóa record
  test do test tạo ra, tuyệt đối không đụng collection Users/Roles.
- Phương án B — ephemeral non-Production: khi không có role fixture, helper dùng
  bootstrap Super Admin hiện có để tạo tạm Editor và Site Manager theo site
  scope, cùng một page nháp và một lead synthetic. Không tạo Super Admin mới;
  không sửa account/data hiện hữu.
- Cả hai phương án đều cleanup exact ID trong `afterAll`/teardown, kiểm tra
  baseline/after-state và không dùng `deleteMany`. Dữ liệu test có thể tạo/xóa;
  account và dữ liệu sẵn có phải còn nguyên.

Implementation guard hiện tại:

- `tests/helpers/adminE2EConfig.ts` chỉ đọc `US074_E2E_*` credentials/site IDs;
  suite chỉ enable khi `US074_E2E_PREPROVISIONED=true` hoặc
  `US074_E2E_FIXTURE_MODE=ephemeral` cùng đủ biến bắt buộc.
- `tests/helpers/us074EphemeralFixture.ts` giới hạn lifecycle vào
  non-Production, giữ lại bootstrap Super Admin và xóa theo danh sách ID đã
  tạo; lỗi setup cũng cố gắng cleanup đúng danh sách đó.
- Khi thiếu fixture, `tests/e2e/admin.e2e.spec.ts` skip có lý do rõ ràng trước
  `beforeAll`; không seed/cleanup account hiện hữu.
- Suite từ chối `PLAYWRIGHT_BASE_URL` trỏ tới các hostname Production đã biết,
  vì một số test có thể tạo/sửa draft fixture nội dung; local/non-Production
  target mới được phép chạy khi có fixture.
- Các helper lifecycle cũ được giữ ở dạng compatibility export nhưng fail-fast
  nếu bị gọi, không có create/delete/reset account hiện hữu.
- Config contract hiện có **6/6 unit tests**; ephemeral fixture helper đã được
  create/cleanup trên SQLite staging snapshot, role smoke xác nhận đúng scope.
  Đây là local/staging proof, không thay thế authenticated Production proof.

Guard fail-fast phải tiếp tục được duy trì nếu target là Production hoặc command
có ý định `deleteMany`/reset account hiện hữu. Không sửa account Production để
làm suite pass. Nếu staging không cho phép ephemeral fixture, chuyển sang
pre-provisioned fixture hoặc ghi blocker; không xóa dữ liệu để làm test chạy.

Gate A hoàn thành khi R-01 pass, mobile release smoke pass, safety/fixture guard
được xác nhận, authenticated admin smoke chạy bằng pre-provisioned hoặc
ephemeral fixture non-Production với cleanup pass (hoặc coverage thay thế được
QA owner ký), và R-08 có preflight owner. Khi đó có thể
tạo release candidate cho Phase 2; chưa được gọi là Production release.

## 7. Phase 2 — Đóng acceptance gap P2/P3 của admin UX

### 7.1. R-02 — Site context/switcher

- Dùng một helper route chung với adminSiteContextPattern cho list, create,
  edit và custom route: console, theme, site-review, page-wizard.
- Với route có site field: switcher đổi context/filter và reset pagination; không
  tự đổi relation site của record.
- Với collection không có site field: hiển thị Toàn hệ, không giả vờ lọc.
- Trên edit form: lấy site từ record; nếu site không thuộc user, API và UI cùng
  từ chối.
- Giữ dirty-form guard; đổi context khi form dirty phải hỏi trước, không làm mất
  nội dung.
- Loại bỏ stale request khi đổi site; reload/back/forward phải giữ context hợp lệ.

Route matrix tối thiểu: /admin, /admin/console, /admin/theme,
/admin/site-review, /admin/page-wizard và collection list/create/edit của Pages,
/Posts, Tour Products, Media và Form Submissions.

### 7.2. R-03 — Title fallback theo site/default locale

- Resolve source locale theo site trong cùng batch; không hardcode vi cho mọi
  tenant nếu contract không yêu cầu như vậy.
- Với WingSide: en là source mặc định cho fallback; bản it thiếu phải hiển thị
  [Chưa dịch] + title en + mã locale nguồn.
- Với WingsGo: giữ vi là source mặc định.
- Nếu source cũng thiếu: dùng [Chưa có tiêu đề] + ID, không giả định mất record.
- Query fallback phải giữ site scope và access scope; không để row của tenant A
  làm title fallback cho tenant B.
- Giữ batching, tránh N+1 query khi list có nhiều row.

Test: default/non-default source, missing translation, source missing, cross-site
ID, API error và cache/batch nhiều row.

### 7.3. R-04 — Locale status accessible và trung thực

- Mỗi locale phải có text hoặc accessible name riêng, gồm code và trạng thái:
  Đã xuất bản, Bản nháp, Chưa tạo, Không xác định hoặc Lỗi tải.
- Không dùng id ? uncreated : ... khi endpoint status lỗi. unknown/error phải
  khác uncreated.
- Có legend cố định hoặc tooltip có thể focus; screen reader đọc được context.
- Khi request lỗi: thông báo ngắn, nút retry và live announcement; retry không
  làm mất dirty content.
- Kiểm tra keyboard navigation, focus visible, contrast và zoom 200%.

### 7.4. R-05 — Labels và format

- Dịch Page wrapper tại source config Tour Products.
- Dịch/ghi đè đúng nhãn native generateSlug, không dùng DOM-hack sau render.
- Kiểm tra Additional Domain(s) singular/plural ở Sites.
- Locale label chỉ chứa tên hiển thị; không lặp code do Payload adapter.
- Date admin dùng dd/MM/yyyy HH:mm theo timezone hiển thị đã chốt; DB vẫn lưu
  UTC. Null/invalid date có placeholder rõ.
- Pagination phải có khoảng trắng đúng ở 0/1/10/11 record, trang đầu/cuối và
  sau filter. Không sửa khi chưa có reproduction/root cause.

### 7.5. R-06 — Site Review pagination/scalability

- Không dùng limit 1000 rồi bỏ qua hasNextPage.
- Chọn một contract:
  - pagination server với cursor/page và UI load tiếp; hoặc
  - API trả totalDocs, hasNextPage, trạng thái giới hạn và action tải tiếp.
- Chỉ lấy fields cần cho review, giữ site scope/access scope.
- Test 0, 1, 100, 1.000, 1.001 và nhiều hơn 1.001 records; xác minh không mất
  record, không duplicate và không trả 0 khi page sau lỗi.
- Nếu sản phẩm cố tình giới hạn review, phải hiển thị giới hạn và lý do; không
  coi truncation im lặng là pass.

### 7.6. Gate B

Gate B chỉ pass khi các thay đổi Phase 2 có unit/component/integration proof,
route matrix không có route ngoài ý muốn, hai tenant không rò dữ liệu, và
pagination/locale/title error state được xác minh. R-07 được đóng bằng patch
hoặc no-repro artifact; không để trạng thái mơ hồ.

## 8. Phase 3 — Hoàn thiện use case và quyết định nghiệp vụ

### 8.1. Tour itinerary và Page Wizard

- Kiểm tra native Payload collapse trước khi thêm control custom.
- Bổ sung Thu gọn tất cả/Mở rộng tất cả, row summary có Day và title.
- Khi validation fail ở row đang đóng, tự mở đúng row và focus field lỗi.
- Test tour 6N5Đ và 14 ngày: add/remove/reorder, reload, locale switch, dirty
  guard, save draft và live preview.
- Page Wizard: Tạo trang khác từ preset tạo draft độc lập; không mô tả action
  này như reset page đang có. Test double-click/concurrent tab và slug conflict.
- Không publish ngầm; xác minh mọi record tạo từ Wizard là Draft.

### 8.2. R-10 — Vocabulary lead triage (Decision 0035)

Decision 0035 đã chốt contract 5 trạng thái: `new`, `contacting`, `won`,
`no_answer`, `lost`. Production schema đã đúng contract này nên không chạy
migration đổi enum và không thêm alias `qualified`/`no_response`.

Sau khi chốt:

1. Đồng bộ triage.ts, types, migration enum, API allowlist, UI labels, filters,
   export và tests.
2. Không backfill lead cũ; giá trị `NULL` được hiển thị là `Chưa phân loại` và
   chỉ thay đổi khi Sales chủ động triage.
3. Giữ nguyên payload khách gửi, consent, delivery fields, createdAt và site.
4. Quyền ghi phải là field-level/specialized endpoint; không mở native update
   toàn Form Submission chỉ để có nút Save.
5. Role được owner phê duyệt mới assign/update trong site scope; Editor chỉ đọc
   nếu chưa có decision cho quyền Sales.
6. Assignee chỉ chọn từ user hiện có đúng site scope; không tạo/sửa account để
   làm fixture.
7. Ghi actor/time/from/to, note bounded, optimistic version và trả conflict khi
   hai operator cập nhật đồng thời.
8. Migration additive, rehearsal trên DB rỗng và DB có submissions; không drop
   dữ liệu triage khi rollback app.

Gate C lead: Decision 0035 đã ký, migration/rehearsal pass, direct API scope
pass, visitor/cross-site bị chặn, delivery fields bất biến và concurrent update
trả conflict đúng; Production enum/lead after-state đã verify.

## 9. Ma trận kiểm thử sau remediation

### 9.1. Static và automated checks

Chạy từ app/, trên đúng candidate commit:

    pnpm exec tsc --noEmit
    pnpm lint
    pnpm test:unit
    pnpm test:component
    pnpm test:int
    pnpm build
    pnpm generate:importmap
    pnpm generate:types

Khi có migration/schema:

    pnpm db:migrate:smoke
    pnpm db:upgrade:smoke
    pnpm db:restore:drill

Các smoke trên phải dùng PostgreSQL disposable/staging an toàn, không dùng
Production mặc định; script phải được kiểm tra lifecycle account trước khi chạy.
Không sửa generated files bằng tay.

### 9.2. Browser/responsive matrix

| Nhóm | Coverage bắt buộc | Pass condition |
| --- | --- | --- |
| Mobile | 360/390/430/600/679/680/681 | Shell visible, nav/search/form/save thao tác được |
| Tablet | 768/820/1024, portrait/landscape | Hamburger không đè breadcrumb; không có khoảng trắng bất thường |
| Desktop | 1366/1440/1920 | Avatar/locale không chồng; text dài có ellipsis hợp lý |
| Routes | dashboard, console, theme, site-review, wizard, list/create/edit | Không route nào mất site context hoặc dirty content |
| Input | search focus/type, locale switch, filter/reload/back | Icon không đè text; state/filter nhất quán |
| A11y | keyboard, focus, screen reader name, zoom 200%, contrast | Status/error/action đọc và thao tác được |

### 9.3. Preview/security matrix

| Case | WingsGo | WingSide | Kết quả |
| --- | --- | --- | --- |
| Default locale | vi | en | Host/path không prefix sai; render đúng locale |
| Public non-default | en | it | Path prefix đúng; signed grant đúng locale |
| CMS-only locale | ja/ko/fr/de | ja/ko/fr/de | Bị từ chối public theo policy |
| Wrong tenant/document | đổi site hoặc ID | đổi site hoặc ID | 403/deny, không rò nội dung |
| Expired/replayed grant | hết TTL/replay | hết TTL/replay | Deny, retry tạo grant mới |
| Cross-origin frame | host allowlist | host allowlist | Origin/source handshake đúng |

### 9.4. Access/data integrity matrix

- Super Admin: xem đúng all hoặc site được phép; không đọc ID tenant ngoài
  scope qua URL/API.
- Site Manager: chỉ review/edit/publish site được cấp.
- Editor: tạo/sửa draft theo scope, không tự mở quyền lead nếu chưa được duyệt.
- Visitor/anonymous: không đọc admin data hoặc triage endpoint.
- Đổi locale không overwrite bản dịch khác; missing locale có trạng thái thật.
- Lead triage chỉ thay metadata được allowlist; payload, consent, delivery và
  site không đổi.
- Theme impact không biến query lỗi/partial thành 0; summary và page count nhất
  quán khi lớn hơn 100 records.

## 10. UAT năm use case thực tế

UAT dùng staging fixture và account đã được cấp sẵn. Không gửi lead thật, không
chỉnh account để tạo actor, không lấy screenshot chứa PII.

| Use case | Người thực hiện | Dữ liệu/flow | Tiêu chí pass |
| --- | --- | --- | --- |
| WingsGo tour outbound | Editor + Tour Operator | Tạo draft 6N5Đ, 6 itinerary days, collapse/reorder, giá, preview | Không mất dữ liệu; đúng site; save/preview reachable; chưa publish |
| WingsPass landing | Content Editor | Wizard lead/campaign, sửa block, tạo trang khác, slug conflict | Draft độc lập; block đúng preset; không publish ngầm |
| WingSide localization | Editor + Site Manager | en source, tạo/sửa it, thử ja CMS-only, dirty locale switch | Status rõ; title fallback đúng; guard không mất sửa; policy public giữ nguyên |
| Sales/CSKH | Role được owner duyệt | Filter site, assign, status, note, concurrent update | Scope đúng; conflict rõ; delivery/payload bất biến |
| Mobile hiện trường | Manager | iPhone/Android/iPad hoặc device emulation mở lead, Site Review, draft fixture | Không blank; nav/focus/action usable; lỗi preview có retry |

Mỗi case cần ghi actor role, site, locale, record fixture ID, start/end result,
screenshot/trace đã che dữ liệu nhạy cảm và người approve. Một UAT pass không
thay thế access/API test.

## 11. Production release gate

### 11.1. Trước deploy

- Candidate SHA đã pass Gate A/B/C phù hợp với phần chuẩn bị release.
- Có release notes và exact changed files/migrations; tách rõ thay đổi US-074
  khỏi dirty changes của US khác.
- Có backup/restore point theo quy trình Production; kiểm tra restore drill
  hoặc bằng chứng gần nhất phù hợp.
- Release owner xác nhận wingsgroup.vn/admin và các child-domain preview đã
  được allowlist/proxy/DNS phê duyệt.
- Nếu cần sửa WingsGo domain, có before/after và approval; nếu không cần, có
  no-op evidence.
- Có monitoring/log dashboard, rollback command/artifact và người trực release.
- Không account migration/cleanup nào nằm trong release.

### 11.2. Canary và smoke

1. Deploy app artifact/config đã review theo cửa sổ được duyệt.
2. Kiểm tra /admin login shell trên https://wingsgroup.vn/admin.
3. Với session/fixture được cấp sẵn, smoke mobile admin, list/edit locale,
   Site Review WingsGo/WingSide và public preview.
4. Kiểm tra public home/detail, canonical/redirect của tenant bị ảnh hưởng và
   lead intake contract; chỉ đọc/kiểm tra endpoint an toàn, không tạo lead thật.
5. Theo dõi error rate, 403/404 preview, client exception, DB migration error
   ngay sau deploy và sau 30–60 phút.
6. Ghi after-state có timestamp, release SHA, host/path/locale và kết quả từng
   smoke. Theo dõi tiếp một chu kỳ vận hành theo policy của release owner.

### 11.3. Điều kiện rollback

Rollback ngay nếu có một trong các dấu hiệu:

- Mobile blank/không thao tác được ở breakpoint đã cam kết.
- Preview hiển thị sai tenant/locale, lộ nội dung hoặc frame authorization sai.
- Role/site scope regression hoặc endpoint triage cho phép ghi ngoài quyền.
- Migration làm mất dữ liệu, lỗi boot, tăng 5xx đáng kể hoặc admin shell không
  tải được.
- Canonical/domain/redirect của tenant sai sau config change.

Rollback ưu tiên app artifact về bản trước; revert config/domain về preimage đã
backup. Migration additive không drop cột/enum/data để rollback code. Sau
rollback phải kiểm tra lại admin shell, preview access, public routes và dữ liệu
mới; mọi DB repair tiếp theo cần forward migration được review, không restore
diện rộng một cách mù quáng.

## 12. Evidence, Harness và Plane

### Evidence phải cập nhật

Tạo thư mục theo release thực tế, ví dụ evidence/YYYYMMDD/, và cập nhật:

- baseline.md: SHA, environment, owners, account-safety check.
- preview-matrix.md: default/non-default locale, host/path, deny cases.
- domain-preflight.md: read-only, dry-run, applied/no-op, after-state.
- responsive.json: viewport geometry và route/device coverage.
- locale-matrix.md: status/error/title fallback/labels.
- lead-access.md: vocabulary, permission, conflict, immutable fields.
- migration.md: up/upgrade/restore rehearsal, schema and row counts.
- uat.md: năm use case, actor/site/locale, approval.
- release.md: exact SHA, canary, monitoring, rollback result.
- review.md: cập nhật trạng thái từng R-ID, không xóa lịch sử finding.

### Harness/Plane gate

- Mỗi child AC phải có evidence tương ứng; Harness matrix không còn e2e=0 và
  platform=0 nếu release yêu cầu các gate đó.
- Chỉ chuyển US-074 sang trạng thái hoàn tất sau khi acceptance và release owner
  ký; không đổi trạng thái chỉ vì unit/build pass.
- Sau thay đổi story/evidence/docs, chạy từ app/:

    pnpm run plane:preview
    PLANE_STORY_IDS=US-074 pnpm run plane:sync:workitems

- Xác minh missingCount=0, US-074 nằm dưới đúng Epic E02, có sáu child work
  item có tên nghiệp vụ và status/date không bị sync sai. Nếu Plane trả warning
  ngoài phạm vi (archived project, payment/API limitation), ghi lại nhưng không
  sửa ticket không liên quan.

## 13. Definition of Done cho US-074

US-074 chỉ được hoàn thiện khi tất cả điều kiện sau đúng:

- Mobile admin không blank và matrix viewport/route/device đã có evidence.
- Preview default và non-default public locale đúng tenant/path/locale; deny
  cases và expiry pass; không có token exposure.
- WingsGo domain có kết luận verified/no-op hoặc correction có approval và
  after-state; không còn .local trong Production config nếu preflight xác nhận
  đó là lỗi.
- Compact locale, title fallback site-aware, status accessibility/error state,
  labels/date/pagination pass acceptance.
- Site Switcher/context không rò scope, không mất dirty content, route matrix pass.
- Site Review không bỏ record sau giới hạn 1.000 hoặc hiển thị contract giới hạn
  minh bạch với pagination/test pass.
- Itinerary/Wizard năm use case tương ứng pass; draft không publish ngầm.
- Lead vocabulary được owner chốt; migration/API/UI/test đồng bộ; account không
  bị thay đổi; payload khách gửi và delivery fields bất biến.
- Typecheck, lint, unit, component, integration, build và các E2E/browser smoke
  an toàn đã pass; mọi skip có lý do và owner chấp thuận.
- PostgreSQL migration/upgrade/restore rehearsal pass nếu schema đã thay đổi.
- Staging UAT, Production canary, after-state và rollback readiness có evidence.
- review.md, release.md, Harness và Plane đồng bộ; US chỉ chuyển trạng thái
  hoàn tất sau approval thực tế.

## 14. Kết quả thực hiện và bước còn lại

1. Candidate đã được build từ Production release base cô lập; không đưa dirty
   public/US-073 changes vào artifact US-074.
2. Production preflight, approval, encrypted backup và exact WingsGo domain
   correction đã pass.
3. App-only canary, six-host health, authenticated Site Review cross-domain
   preview và fail-closed probes đã pass.
4. Decision 0035 chốt lead vocabulary; enum Production khớp và lead cũ không
   bị backfill.
5. Rollback resource exact-scope đã được giữ và validate; không rollback thử
   trên bản healthy để tránh downtime.
6. Handoff tiếp theo chỉ còn stakeholder xác nhận; authenticated staging và
   Safari/iOS vẫn là `waived/unverified` theo scope đã duyệt.
