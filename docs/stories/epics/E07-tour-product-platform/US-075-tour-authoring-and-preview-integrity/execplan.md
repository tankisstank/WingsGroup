# Exec Plan — US-075

## Goal

Đưa luồng tạo/sửa tour trong CMS về trạng thái dễ hiểu và kiểm soát được cho
Tour Operator: WingsGo không thấy field chỉ thuộc WingSide, site context được
hiển thị đúng, wrapper Page có provision/reuse draft có kiểm soát, departure có
quick-add từ TourProduct, gallery có thể nhận diện bằng ảnh, còn Preview phản
ánh đúng bản đã lưu gần nhất mà vẫn bảo toàn published isolation và preview
security.

## Implementation Checkpoint — 2026-09-17

- Phase 0/1: baseline và contract đã được đối chiếu trong isolated integration
  worktree; không phát hiện yêu cầu schema/migration.
- Phase 2: đã tích hợp vertical slice cho site context, readiness/wrapper draft,
  departure quick-add, freshness, gallery relation UI và saved-draft preview.
- Phase 3: unit/component/integration/typecheck/lint/build đã chạy; automated UI
  tests bao phủ fill, save, retry, add-next, dirty guard, readiness confirmation,
  thumbnail và remove relation.
- Phase 4: technical production release, canary/after-state, browser smoke,
  rollback readiness và một vòng authenticated CMS UAT đã pass với fixture;
  post-UAT retest ngày 2026-09-19 mở lại gate provision/quick-add.
- Phase 5: release evidence đã được ghi; Harness/Plane handover vẫn giữ story
  `in_progress` cho đến khi các post-UAT gate được tái kiểm chứng. Không coi
  việc modal hiển thị là bằng chứng dữ liệu đã persist.

## URL lifecycle prerequisites — 2026-09-23

Hai điều kiện này là release gate của cùng luồng authoring, không mở US mới:

1. **Lowercase tại form:** custom slug field hạ chữ thường ngay trong
   `onChange`; collection `beforeValidate` lặp lại normalize để API/import không
   thể lưu slug hoa. `generateSlug` vẫn giữ hành vi hiện có.
2. **Transaction + redirect:** `relinkAuthoring` và `publishAuthoring` phải
   dùng PostgreSQL transaction/advisory lock. Khi publish một tour đã có bản
   public và `Product.slug` đổi, cùng transaction tạo hoặc kiểm tra redirect
   duy nhất `from = /tour/<slug-cu>`, `to = /tour/<slug-moi>`, `type = 301`.
   Redirect conflict không được ghi đè đích khác; cache redirect chỉ revalidate
   sau commit.

Migration `20260923_090000_tour_authoring_redirect_type` chỉ thêm enum/type
`301`/`307` cho collection Redirects: record cũ nhận `307` để giữ behavior,
record URL tour mới nhận `301`. Không chạy migration hoặc CMS write production
trong proof code-only.

## Preview 404 checkpoint — 2026-09-22

- Đã xác nhận lỗi preview của TourProduct `111` thuộc US-075: bản nháp WingsGo
  chưa có `wrapperPage` (`wrapper_page_id = null`), nên handoff thành công nhưng
  public renderer không có Page tại `/tour/<slug>` và trả 404. Không có departure
  hoặc variant không phải nguyên nhân.
- Đã thêm guard ở Payload Preview/live preview để không phát URL khi thiếu wrapper
  và guard ở `/next/preview` trả `409` với hướng xử lý rõ ràng. Không tự động ghi
  production data hoặc bypass flow `Tạo trang tour nháp`.
- Regression đã pass: 11 unit tests mục tiêu, TypeScript và ESLint mục tiêu (0
  errors). Cần deploy release, provision/reuse wrapper cho record thực tế và chạy
  authenticated browser proof trước khi chuyển US-075 sang hoàn tất.

### Production deployment checkpoint — 2026-09-22

- Đã promote release `/home/ubuntu/wings-travel/releases/wingsgroup-us075-preview-guard-20260922-r2` với overlay archive SHA-256 `5bcded9c91d18800fe4a807d25249aed04d5d68babd73338697f33a9b1026c19`.
- ARM64 image `sha256:15ae02c827dbfd2e822ebf1183afc6061564324a7d6a58988d9f338b729b0421` build pass; live/ready và sáu public domains trả 200. PostgreSQL/Redis giữ nguyên container; không migration, CMS write hoặc Redis flush.
- Rollback image `sha256:c474f0c137ce74bd71a5137e7c572091084b806d966a098434c239468725c816` đã được tag. Còn lại: provision/reuse wrapper và authenticated preview proof cho product 111; US-075 giữ `Chờ xác nhận`.

## Post-UAT delta — 2026-09-19

1. **Itinerary create UX (P1):** xác nhận `itineraryDays` bắt buộc nhưng dòng
   mới đang collapsed. Sửa tối thiểu ở presentation/interaction để dòng đầu
   mở sẵn và validation error chuyển tới đúng tab/dòng; không đổi collection
   schema hay nới điều kiện server.
2. **Wrapper provision (P0/P1):** tái hiện lỗi 500 trên staging hoặc fixture
   an toàn, thu thập error class/code đã sanitize và kiểm tra lần lượt tour hub,
   Page validation, site access, transaction/rollback. `tour-conversion` preset
   đã tồn tại trong code path; không thêm layout mặc định khi chưa có bằng chứng.
3. **Departure quick-add (P1 verification):** kiểm tra POST/PATCH trực tiếp
   `/api/tour-departures`, response status, bản ghi sau reload và site/product
   scope. Chỉ sửa direct collection path nếu có lỗi runtime; không tạo action
   thứ ba trong `/api/tour-authoring/[id]` để tránh hai đường ghi.
4. Cập nhật component/integration/authenticated UAT evidence cho ba điểm trên,
   sau đó mới đánh giá lại AC-1, AC-3, AC-4 và AC-6.

## Wrapper lifecycle UX polish — 2026-09-23

Phạm vi này được gán vào US-075, không tạo US hoặc child task mới. Mục tiêu là
để editor hiểu được quan hệ `TourProduct → wrapper Page → TourDeparture` và có
thể xử lý wrapper sai mà không phải suy ra từ raw ID, 404 hoặc lỗi HTTP 500.

### P0 — Readiness và trạng thái liên kết

1. Readiness phải trả cả wrapper hiện tại dù wrapper sai path/site; không biến
   wrapper invalid thành `null` rồi hiển thị “Chưa có trang tour”.
2. Hiển thị site, Product slug, URL dự kiến, wrapper ID/path/status/site và
   health (`valid`, `draft`, `invalid path/site`, `orphan`, `shared`).
3. Hiển thị candidate cùng site/path, số product đang tham chiếu và action phù
   hợp: tạo draft, mở, gán wrapper có sẵn hoặc sửa liên kết.
4. Tách `Xem bản nháp` khỏi `Xem trang public`; draft chưa publish phải giải
   thích rõ vì sao anonymous URL chưa dùng được.
5. Khi editor là `Editor`, nút publish bị khóa phải nêu vai trò hiện tại và
   người có quyền publish.

### P1 — Tạo/sửa/relink an toàn

1. Đổi tên action thành ngôn ngữ nghiệp vụ: `Tạo wrapper bản nháp`, `Gán
   wrapper có sẵn`, `Sửa liên kết wrapper`, `Mở wrapper`.
2. Khi slug thay đổi, hiển thị pathname trước/sau và yêu cầu chọn đồng bộ,
   wrapper khác hoặc tạo wrapper mới; không tự đổi pathname published.
3. Relink chỉ chấp nhận wrapper cùng site và pathname đúng `/tour/<slug>`, chạy
   qua Payload transaction, không sửa SQL và không tự nhận page mồ côi.
4. Không provision page mới khi đã có candidate cùng site/path nếu editor chưa
   xác nhận; retry không được tạo duplicate.
5. Modal publish phải liệt kê rõ Product, Page và các departure sẽ được publish.

### Proof bắt buộc trước khi đóng phạm vi

- Fixture không có wrapper, wrapper hợp lệ, wrapper sai path, wrapper mồ côi và
  wrapper dùng chung; mỗi trạng thái hiển thị đúng health/action.
- Product #112/#314/#237 được dùng làm read-only production diagnostic, không
  tự ý sửa dữ liệu production trong implementation proof.
- Browser proof xác nhận editor thấy expected/actual path, mở đúng record,
  preview draft có auth và public route vẫn fail-closed trước publish.
- Unit/integration proof bao phủ relink guard, same-site/path check, slug warning,
  stale revision và duplicate/retry safety.

### Wrapper lifecycle UX implementation checkpoint — 2026-09-23

- Đã triển khai readiness state mở rộng trong `app/src/tours/authoring.ts`:
  wrapper invalid không còn bị biến thành “chưa có”, API trả expected/actual
  path, site, status, health, linked product IDs và candidate wrapper.
- Đã thêm action `relink` có kiểm tra cùng site + đúng pathname, conflict khi
  wrapper dùng chung và PostgreSQL transaction/advisory lock. Provision từ
  UI có thể tạo wrapper draft thay thế khi relation cũ sai mà không sửa Page cũ.
- Admin readiness hiển thị link CMS, signed draft preview và public URL tách
  biệt; confirmation publish nêu Product, Page và departure IDs. Slug drift,
  wrapper guidance và Page wrapper guidance được hiển thị ngay trong form.
- Regression pass: targeted unit `13/13`, component `5/5`, TypeScript pass,
  targeted ESLint `0 errors` (còn warning `no-explicit-any` đã có trong source).
- Chưa ghi production CMS và chưa deploy trong checkpoint này; browser proof
  authenticated cho Product #112 vẫn là gate tiếp theo.

## Scope

### In scope

- Field inventory và site-capability matrix cho `TourProducts`.
- Admin presentation/label/condition của field site-specific.
- Site context/default theo quyền tài khoản và readiness checklist cho các
  dependency của tour; wrapper Page WingsGo được provision/reuse dưới dạng draft
  theo thao tác idempotent, không auto-publish.
- Related departure table và quick-add/edit cho nhiều ngày khởi hành/giá, vẫn
  lưu ở `TourDepartures`, giữ site scope và freshness governance.
- Gallery relationship authoring với thumbnail/metadata, add/remove và lỗi
  missing/forbidden rõ ràng.
- Business terminology và progressive disclosure cho nhóm field nâng cao, giữ
  payload key/data contract và parity VI/EN.
- Save-state và draft-preview handoff/resolver cho TourProduct.
- Preview status/dirty-state feedback.
- Regression tests, authenticated CMS UAT, release/canary proof và rollback
  readiness.

### Out of scope

- Schema/data cleanup ngoài migration type redirect `301`/`307` bắt buộc cho URL
  lifecycle.
- Media schema, upload storage, asset provenance hoặc Media library redesign.
- Generic Payload admin redesign đã thuộc US-059/US-074.
- Full all-in-one tour wizard; story chỉ làm readiness, related table và quick
  actions đủ cho luồng cơ bản.
- Merge `TourDepartures` vào `TourProduct`, auto-publish Page/Product, bypass
  permission hoặc bỏ freshness/expiry governance.
- Import pipeline, booking, CRM, payment, lead routing.
- CMS production content edits ngoài fixture/release được phê duyệt.

## Risk Classification

Risk flags:

- Authorization: preview draft và site-scoped admin data.
- Existing behavior: thay đổi luồng đã có trong US-023/024/036/074.
- Public contract: preview route và structured tour resolver.
- Cross-platform: admin desktop/mobile và cross-domain preview.
- Weak proof: hiện tượng published fallback chưa có reproduction matrix độc lập.
- Multi-domain: WingsGo/WingSide dùng chung CMS và preview origin.

Hard gates:

- Không được tạo migration ngoài redirect types `301`/`307` đã chốt, hoặc xóa/đổi dữ
  liệu hiện hữu để làm test pass.
- Không được nới `overrideAccess`, bỏ signed handoff hoặc cho open redirect.
- Không production write nếu chưa có owner approval, backup, exact-scope plan và
  rollback.
- Không đóng story chỉ bằng unit test; phải có authenticated CMS proof cho saved
  draft và anonymous proof cho published isolation.
- Provision wrapper/quick-add phải idempotent, cùng site và giữ publish guard;
  retry không được tạo duplicate hoặc làm lộ record tenant khác.
- Freshness/readiness chỉ đọc và diễn giải policy hiện có; không tự gia hạn
  `expiresAt`, đổi giá hoặc biến trạng thái expired thành published price.

## Work Phases

### Phase 0 — Intake, baseline và reproduction

1. Ghi baseline commit/runtime/database environment; không sửa code/CMS.
2. Xác nhận site context của record mẫu: `wings-go` và `wing-side`.
3. Chạy một task-based baseline với persona Tour Operator: tạo tour, nhập
   itinerary/gallery, thêm năm ngày departure/giá, Save và tìm cách Preview;
   ghi số lần rời form, lỗi và điểm không rõ.
4. Tái hiện với một record có bản published và một thay đổi draft duy nhất,
   khác biệt rõ bằng marker tạm trong non-Production hoặc record được owner chỉ
   định.
5. Ghi lại: save response, version/status, preview URL, redirect/handoff status,
   final host/path/locale, nội dung hiển thị và public anonymous output.
6. Phân loại kết quả thành: unsaved, stale draft, wrong locale, wrong site,
   failed handoff, resolver published fallback hoặc runtime drift.
7. Reproduce wrapper/departure: TourProduct chưa có wrapper, wrapper hợp lệ đã
   có, wrapper sai site/path, và năm departure cần tạo; ghi nhận readiness,
   duplicate/retry và trạng thái freshness của từng dòng.
8. Reproduce gallery với 0, 1 và nhiều media; ghi nhận relation đang là ID hay
   object, thumbnail/metadata hiện có, thao tác add/remove và hành vi sau Save.

### Phase 1 — Contract và field matrix

1. Audit `tourType` usage trong collection, query, import và renderer.
2. Chốt bảng site capability cho WingsGo/WingSide; xác định field nào chỉ là
   presentation issue, field nào thực sự shared.
3. Chốt UX dirty state: chờ save, disable preview hoặc confirm-and-save; không
   cho hành vi mơ hồ.
4. Chốt preview state copy/marker cho VI/EN và lỗi không có draft.
5. Chốt gallery contract: thumbnail source, metadata fallback, Media picker,
   remove semantics, missing/forbidden state và quy tắc giữ thứ tự quan hệ.
6. Chốt wrapper provisioning: WingsGo-only, reuse theo site/path/product,
   idempotency, draft-only, permission, conflict và repair state.
7. Chốt departure quick-add: field tối thiểu, thêm nhiều dòng, validation,
   retry/idempotency, link tới full editor và cách hiển thị current/needs
   verification/expired.
8. Chốt site default/context, readiness checklist, business label và nhóm
   progressive disclosure cho các tab/field nâng cao; copy phải parity VI/EN.
9. Nếu phát hiện cần đổi schema hoặc data migration ngoài redirect types
   `301`/`307`,
   dừng Phase 2 và tạo decision/US riêng; không tự mở rộng scope.

### Phase 2 — Minimal implementation

1. Thêm helper/condition nhỏ hoặc custom admin presentation để site code quyết
   định visibility/label/site context; không fork TourProducts collection.
2. Thêm readiness summary và wrapper provision/reuse action cho WingsGo theo
   contract đã chốt; bảo đảm idempotency, same-site, draft-only, conflict/error
   state và không auto-publish.
3. Điều chỉnh preview trigger để chỉ dùng record đã persisted và đợi Save thành
   công.
4. Bảo đảm initializer/handoff giữ đúng collection, document, site, locale và
   mode draft.
5. Bảo đảm `cmsPage` và tour queries truyền draft authorization xuyên suốt cho
   Product/Departure/Variant/wrapper.
6. Thêm related departure table và quick-add/edit tối thiểu cho nhiều dòng;
   persist qua `TourDepartures`, gán đúng site/product, validate freshness và
   không tạo duplicate khi retry.
7. Thêm gallery field/presentation tối thiểu: thumbnail, metadata fallback,
   add/remove, loading/missing state; cập nhật form relationship chứ không xóa
   Media record.
8. Thêm trạng thái Preview, freshness và readiness rõ ràng; thêm label/helper
   nghiệp vụ và progressive disclosure cho field nâng cao mà không đổi payload.
9. Giữ nguyên editor publish guard và public published behavior.
10. Normalize slug ngay tại input và server hook; trong publish transaction tạo
    redirect `301` cho URL public cũ khi slug đổi.

### Phase 3 — Automated validation

1. Unit test site capability/field presentation và preview state decision.
2. Unit/integration test site default, readiness calculation, wrapper provision/
   reuse idempotency, conflict và permission boundary.
3. Integration test collection config, related departure quick-add, preview
   route/handoff và draft query.
4. Component test save/dirty/preview status, readiness copy, business labels,
   progressive disclosure và freshness status trên form admin.
5. Authenticated E2E tạo draft TourProduct WingsGo, sửa marker, preview và xác
   nhận public route chưa đổi.
6. Authenticated E2E xác nhận wrapper được provision/reuse không duplicate,
   thêm năm departure từ related table, WingSide vẫn có control đúng, editor
   không publish
   ngoài policy, cross-site record bị chặn.
7. Component/E2E gallery với empty, selected, add, remove, missing/forbidden,
   Save và giữ thứ tự quan hệ; không xóa Media record.
8. Locale E2E VI/EN, freshness current/needs-verification/expired và linked
   departure/variant draft regression.

### Phase 4 — Staging/release candidate

1. Build app từ commit đã review; không chạy seed/migration.
2. Dùng fixture ephemeral trên local/staging non-Production hoặc fixture được
   cấp sẵn; cleanup exact ID do test tạo.
3. Chạy smoke `/admin`, Tour Products/readiness/gallery/departures, preview
   draft/published, WingsGo/WingSide, VI/EN và anonymous public route.
4. Kiểm tra PostgreSQL/Redis identity unchanged; không flush cache toàn hệ.
5. Kiểm tra labels nghiệp vụ, helper/error copy và thao tác keyboard/mobile ở
   viewport 390px; xác nhận expired price hiển thị đúng policy.
6. Nếu cần production verification, lập preflight read-only, backup/rollback,
   canary và owner approval trước khi tạo/sửa dữ liệu test.

### Phase 5 — Handover và tracking

1. Ghi evidence sanitized: reproduction, root cause, code diff, gallery visual
   proof, test output, screenshots/URL, published isolation và release hash.
2. Cập nhật product/editorial docs nếu workflow thay đổi.
3. Cập nhật Harness proof/status và đồng bộ Plane; giữ story `in_progress` khi
   authenticated draft proof còn thiếu.
4. Production release proof và vòng UAT fixture trước đó đã hoàn tất, nhưng
   release gate hiện tại vẫn chờ post-UAT retest: provision không còn 500,
   itinerary create usable và quick-add có persist proof.

## Dependencies

- `US-023`: structured product/departure contract.
- `US-024`: governed tour detail resolver/renderer.
- `US-035`: variant resolution.
- `US-036`: Payload admin authoring groups.
- `US-039`: editorial workflow/import mapping.
- `US-074`: secure preview origin/handoff và admin shell.
- `US-059`: compact locale/admin controls nếu regression xuất hiện trong form.

## Files/Surfaces To Inspect

- `app/src/collections/TourProducts.ts`
- `app/src/collections/TourDepartures.ts`
- `app/src/collections/DepartureVariants.ts`
- `app/src/collections/Pages/hooks/validateWingsGoTourCatalog.ts`
- `app/src/fields/site.ts`
- `app/src/access/siteScope.ts`
- `app/src/utilities/generatePreviewPath.ts`
- `app/src/app/(frontend)/next/preview/route.ts`
- `app/src/app/(frontend)/next/preview/handoff/route.ts`
- `app/src/utilities/previewHandoff.ts`
- `app/src/app/(frontend)/cmsPage.tsx`
- `app/src/tours/queries.ts`
- `app/src/components/TourAuthoring/TourSlugField.tsx`
- `app/src/migrations/20260923_090000_tour_authoring_redirect_type.ts`
- `app/src/utilities/repairLocalSQLiteSchema.ts`
- `app/src/components/PayloadRedirects/index.tsx`
- `app/src/proxy.ts`
- `app/src/tours/StructuredPages.tsx`
- `app/tests/unit/*preview*`
- `app/tests/int/tourDetailBuilder.int.spec.ts`
- `app/tests/e2e/admin.e2e.spec.ts`

## Stop Conditions

Pause and ask for a new decision if:

- `tourType` được chứng minh là business data bắt buộc cho cả hai site và việc
  hide/rename làm thay đổi public contract.
- Draft preview cần schema/version API mới hoặc migration.
- Production record mẫu không thể kiểm tra an toàn mà không ghi/xóa dữ liệu.
- Preview hiện đúng ở local nhưng sai do deployment/proxy/cookie policy; khi đó
  tách infra hotfix khỏi code authoring nếu cần.
- Có yêu cầu mở quyền editor hoặc cho preview public anonymous.
- Wrapper provision không thể bảo đảm idempotent/same-site/draft-only bằng API
  hiện có; tách thành decision về Page lifecycle thay vì âm thầm tạo Page.
- Provision trả generic HTTP 500 mà không phân loại được lỗi Page validation,
  tour hub, quyền site hoặc transaction sau một lần tái hiện có log sanitize;
  khi đó dừng release và tách incident/runtime fix khỏi UX itinerary.
- Create flow vẫn bắt người dùng tự mở dòng itinerary để thấy required fields,
  hoặc Save error không điều hướng được tới field lỗi trong một vòng kiểm thử
  authenticated.
- Quick-add departure yêu cầu transaction/schema mới hoặc không thể tránh
  duplicate khi retry; tách thành story về departure authoring.
- Người dùng yêu cầu full wizard hoặc tự động Publish; đó là scope/product
  decision mới, không mở rộng bằng cách bypass các guard hiện tại.

## Exit Criteria

- Sáu acceptance criteria trong overview đều có evidence; AC-4 và AC-6 bao phủ
  gallery authoring/visual proof.
- Không có regression public published, locale, site scope hoặc editor publish
  guard.
- `pnpm run test:unit`, `pnpm run test:component`, targeted integration/E2E,
  TypeScript và ESLint pass theo phạm vi thay đổi.
- Staging/release candidate proof và production technical rollout có evidence;
  authenticated CMS UAT ban đầu đã pass nhưng post-UAT closure gate vẫn là
  điều kiện riêng trước khi đóng story.
- Task-based UAT chứng minh operator có thể hoàn thành luồng core, thấy
  readiness/freshness rõ ràng, provision/reuse wrapper và thêm nhiều departure
  mà không cần hiểu raw relationship hoặc technical field key; create flow phải
  hiển thị ngay itinerary fields và failure phải chỉ đúng nơi sửa.
