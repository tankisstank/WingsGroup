# Validation — US-075

## Proof Strategy

Proof phải tách sáu câu hỏi, không gộp thành một screenshot “Preview”:

1. Admin field có đúng semantic theo site không?
2. Editor có nhận diện và quản lý đúng các ảnh gallery đã chọn không?
3. Editor có thể hoàn thành luồng cơ bản, thấy site context/readiness và tạo
   wrapper/departure liên quan mà không bị buộc hiểu raw relationship không?
4. Save đã tạo persisted draft/version chưa và freshness của departure có được
   giải thích đúng không?
5. Preview có đọc đúng draft/site/locale và linked structured data không?
6. Anonymous published route có giữ nguyên trước khi publish không?

Một test gallery chỉ pass khi thumbnail/metadata, add/remove và relation state
được kiểm chứng; một test preview chỉ pass khi marker của draft, site, locale và
mode được kiểm chứng đồng thời. Không coi thumbnail, `draftMode()` hoặc HTTP 200
đơn độc là bằng chứng draft đúng.

Wrapper lifecycle phải được kiểm tra như một state machine riêng. Readiness không
được làm mất thông tin wrapper invalid: editor phải thấy record đang liên kết,
expected path, actual path, site, status, health và candidate wrapper có thể gán.
Các trạng thái draft/public cũng phải được phân biệt ở action preview.

## Test Matrix

| Layer | Cases bắt buộc |
| --- | --- |
| Static | Không đổi schema tour hoặc merge collection; migration duy nhất là enum/type redirect `301`/`307` (legacy mặc định `307`); collection field inventory không có label WingSide trên WingsGo presentation; `gallery` vẫn là relationship tới `media`; import map/typecheck không lỗi; wrapper/departure helper không tạo write ngoài flow được duyệt |
| Unit | Site capability/default resolution; field visibility/neutral label; lowercase slug normalizer; readiness calculation; wrapper provision/reuse idempotency; redirect create/conflict/no-op; departure freshness state; dirty/save state; preview mode/status; locale/path normalization; invalid/expired handoff |
| Integration | TourProducts/TourDepartures/DepartureVariants/Pages/Redirects config; wrapper same-site/path and draft-only behavior; relink/publish transaction; published slug change creates one `301` redirect in the same transaction and revalidates after commit; quick-add gán đúng product/site; `draft: true` và fallbackLocale policy; site-scoped access; preview initializer/handoff; public resolver giữ draft flag |
| Component | WingsGo form không có `Loại tour WingSide`; WingSide có field đúng; site context/default; readiness links; business labels/progressive disclosure; departure table/quick-add; freshness copy; gallery empty/thumbnail/add/remove/loading/missing state; Preview disabled/warning khi dirty; status badge draft/published; error state rõ ràng |
| Wrapper lifecycle component | Hiển thị no-wrapper, valid-draft, valid-published, invalid-path/site, orphan và shared-wrapper; expected/actual path; candidate list; action tạo/gán/sửa/mở; phân biệt `Xem bản nháp` và `Xem trang public`; cảnh báo slug đổi |
| Authenticated E2E | Editor tạo/sửa draft WingsGo, xử lý readiness, provision/reuse wrapper, thêm ít nhất năm departure/giá, thêm hai ảnh, xem thumbnail, xóa đúng một ảnh, Save, Preview thấy marker mới; anonymous URL vẫn thấy marker published; Site Manager cross-site denial; editor publish guard |
| Linked data E2E | Draft TourProduct + departure/variant/wrapper Page được render cùng mode; không trộn draft với published nếu dependency có saved draft |
| Locale E2E | VI và EN độc lập, không fallback sai locale, preview status/copy đúng locale |
| Security | Sai tenant, sai document, sai path, sai locale, token giả/hết hạn và không allowlisted origin bị fail closed; không open redirect |
| Responsive | Admin form/gallery/departure controls dùng được ở 390, 768 và 1440px; thumbnail không vỡ layout, không che Save/Preview/readiness/status; keyboard/focus và non-color status usable |
| Platform | PostgreSQL production-shaped/staging smoke, build standalone, proxy/cookie/cross-domain handoff, health check; không migration/Redis flush |
| Release | Canary/after-state/rollback readiness; production CMS write chỉ khi có approval và exact fixture cleanup |
| Logs | Có thể truy vết site/collection/mode/result nhưng không ghi token, credential hoặc PII/free-text |

### URL lifecycle gate

- Slug input phải chuyển `SEOUL-TOUR` thành `seoul-tour` trước khi form ghi
  state; API update trực tiếp với chữ hoa cũng phải được server normalize.
- Relink và publish phải giữ cùng transaction ID cho mọi update liên quan. Khi
  đã có published snapshot và path đổi, transaction phải tạo đúng một Redirect
  record `{ from, to.url, type: '301' }`; retry không tạo bản sao.
- Nếu `from` đã có redirect tới đích khác, transaction rollback và trả lỗi
  `redirect_conflict`; không được ghi đè redirect đang tồn tại.

### Implementation checkpoint — 2026-09-29 — slug and candidate anchors

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Shared Vietnamese slug normalization | PASS | `app/src/utilities/normalizeTourSlug.ts` applies explicit `đ/Đ` mapping, Unicode NFD mark removal, lowercase, separator collapsing, and edge trimming. Client, TourProducts `beforeValidate`, and the two active tour import builders use it. |
| Slug regression coverage | PASS | `tests/unit/normalizeTourSlug.unit.spec.ts`; server hook coverage includes `Đà Nẵng / 5N4Đ` → `da-nang-5n4d`. |
| Public slug lifecycle preservation | PASS | Existing `ensurePublishedTourRedirect` transaction, `301` creation/reuse, `redirect_conflict`, publish authorization, signed preview, and editor publish guard were not changed; targeted `tourAuthoring.unit.spec.ts` and `proxy.unit.spec.ts` pass. |
| Readiness candidate CMS anchors | PASS | Peer candidate accepted after direct inspection: every numeric/string wrapper candidate has a non-mutating `/admin/collections/pages/<id>` link and retains a separate relink control. Focused component test passes 2/2; full component suite passes 34 files / 183 tests. |
| Production/staging proof | NOT RUN | No production CMS write, deployment, migration, or Redis flush was performed. Plane work-item sync was attempted after this validation update but was rate-limited and then stopped on an existing invalid date pair; production UAT remains a separate gate and is not closed by these automated checks. |

## Deterministic Fixtures

- Một `wings-go` TourProduct đã published, có wrapper Page và tối thiểu một
  departure; tạo draft marker khác biệt trong local/staging non-Production.
- Một `wings-go` TourProduct chưa có wrapper và một record đã có wrapper hợp lệ;
  kiểm tra provision/reuse, conflict, retry và không auto-publish.
- Các wrapper diagnostic cùng site gồm một wrapper đúng path, một wrapper sai
  path, một wrapper mồ côi và một wrapper được hai product tham chiếu; fixture
  phải có candidate ID/path/status để kiểm tra relink guard mà không ghi production.
- Tối thiểu năm departure mới hoặc ephemeral cho quick-add, gồm một dòng còn
  hiệu lực, một dòng cần xác minh và một dòng hết hạn; xác nhận public fallback
  theo freshness policy.
- Tối thiểu hai Media hợp lệ khác tỉ lệ/kích thước để xác nhận thumbnail, tên
  file/alt fallback, add/remove và giữ thứ tự gallery.
- Một trạng thái gallery rỗng và một relation tới media thiếu hoặc không còn
  quyền đọc để xác nhận placeholder/error state; không xóa bản ghi Media trong
  quá trình test.
- Một `wing-side` TourProduct để xác nhận field WingSide vẫn đúng.
- Một tài khoản chỉ có một site để xác nhận prefill/read-only site context và
  một tài khoản có nhiều site để xác nhận lựa chọn tường minh.
- Một draft VI và một draft EN khác marker để kiểm tra locale không bị fallback.
- Một departure và một variant linked có draft thay đổi; nếu fixture không hỗ
  trợ draft linked, phải ghi rõ giới hạn thay vì suy diễn pass.
- Tài khoản Editor và Site Manager pre-provisioned hoặc ephemeral trên
  non-Production; không tạo/xóa/đổi quyền account production.
- Snapshot before/after gồm record IDs/status/version/site/locale, không chứa
  nội dung nhạy cảm.

## Reproduction Record

Khi triển khai cần ghi tối thiểu:

```text
environment:
site:
collection:
document_id_hash:
locale:
published_marker:
saved_draft_marker:
save_completed:
preview_initializer_status:
handoff_status:
final_preview_origin:
final_preview_path:
preview_mode:
rendered_marker:
anonymous_marker:
gallery_selected_ids:
gallery_thumbnail_count:
gallery_removed_id:
gallery_order_before_after:
site_context_source:
readiness_missing_items:
wrapper_provision_status:
wrapper_page_id_hash:
wrapper_expected_path:
wrapper_actual_path:
wrapper_health:
wrapper_linked_product_count:
wrapper_candidate_ids_hash:
wrapper_relink_result:
slug_change_warning_result:
slug_input_normalized:
slug_server_normalized:
published_path_before:
published_path_after:
redirect_id:
redirect_type:
redirect_created_in_transaction:
redirect_conflict_result:
transaction_id:
departure_ids_created:
departure_quick_add_retry_result:
freshness_states:
root_cause_class:
```

## Commands

Chạy từ `app/` sau khi implementation tồn tại; thay placeholder bằng test file
thực tế:

```text
pnpm exec tsc --noEmit
pnpm exec eslint src/collections/TourProducts.ts src/collections/TourDepartures.ts src/collections/DepartureVariants.ts src/utilities/generatePreviewPath.ts src/utilities/previewHandoff.ts
pnpm run test:unit -- <US-075-unit-files>
pnpm run test:component -- <US-075-component-files>
pnpm run test:int -- <US-075-integration-files>
pnpm exec playwright test tests/e2e/admin.e2e.spec.ts --grep "tour|preview"
pnpm run build
```

Không dùng production CMS write để thay thế automated test. Nếu cần proof live,
phải chạy release checklist với approval, backup, canary, after-state và rollback
resource riêng.

## Acceptance Evidence

### Implementation checkpoint — 2026-09-17

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Scope safety | PASS | Không sửa `payload.config.ts`, collection schema hoặc migration; `gallery` vẫn là quan hệ tới `media`, departure vẫn ở collection hiện có. |
| Admin interaction | PASS | Component tests bao phủ site default/read-only, nhãn theo WingsGo/WingSide, readiness, quick-add “Lưu & thêm tiếp”/“Lưu & hoàn tất”, lỗi giữ dữ liệu nhập, freshness và dirty guard. |
| Gallery | PASS | Thumbnail, filename/alt/ID, loading/missing/forbidden state và gỡ quan hệ đã có test; thao tác gỡ không xóa Media record. |
| Preview | PASS | Component/unit/integration tests xác nhận signed handoff, `draft: true`, locale/site identity, status banner và không silent published fallback. |
| Automated quality | PASS | Component 31 file / 160 test; targeted US-075 unit 28/28; integration 39/39 file; full unit 135 file / 1.010 test; TypeScript, ESLint (0 errors) và build pass. |
| PostgreSQL-shaped check | PASS | Advisory lock probe xác nhận dùng `hashtext`; không chạy migration. |
| Authenticated CMS UAT | REOPENED_WITH_NOTES | Fixture WingsGo đã chạy đủ 11 bước và freshness đã pass sau hotfix; post-UAT retest ghi nhận provision 500 cần tái kiểm chứng, itinerary row collapsed và quick-add persistence cần proof runtime mới. |
| Browser responsive/release proof | PASS_WITH_NOTES | `agent-browser` đã kiểm tra desktop/mobile trên production cho WingsGroup, WingsGo, WingSide, tour listing và authenticated CMS UAT; native date control cần DOM setter trong harness browser, không phải lỗi sản phẩm. |

Implementation hiện dùng thao tác rõ ràng `Tạo trang tour nháp` trong readiness
panel để provision/reuse wrapper idempotent, draft-only; không âm thầm tạo Page
ở mọi lần Save. Đây là lựa chọn an toàn đã được ghi trong design contract.

### Baseline and reproducibility

- Baseline isolated integration: `f744581fd4d47352002f64cf75469b091be47695`.
- Feature source đã được đối chiếu byte-for-byte với integration checkpoint sau
  khi áp dụng vào workspace; không stage hoặc commit các thay đổi không thuộc
  US-075.
- Build production trên workspace pass. Release overlay `wingsgroup-us075-20260917T071748Z`
  đã được deploy lên production bằng image ARM64 dựa trên runtime image đang
  phục vụ; không chạy migration, không flush Redis và không ghi CMS production.
- Hai baseline failure đã được xử lý riêng: provenance hash của manifest
  WingsGo/WingSide khớp manifest nguồn; shell contract test kiểm tra
  `publicRoute` sau normalization. Các sửa này không thay đổi schema hay luồng
  authoring của US-075.

### Production technical release proof — 2026-09-17

| Check | Result | Evidence |
| --- | --- | --- |
| Release identity | PASS | Current release: `wingsgroup-us075-20260917T071748Z`; source base: `e95b99a`; source archive SHA-256: `5312995861dcdc809eeead08306ec5a96d7775be6d03df49dfbc3dd46cf91be2`. |
| Runtime image | PASS | `wingstravel-app` image `sha256:d7b8a5cfb0a3e826259ec61174ac11839e9f34b475d3db17388cd9eeefd6a5dd`, architecture `arm64`; rollback tag retained for the previous image. |
| Health and domain smoke | PASS | `/health/live` and `/health/ready` returned `200`; `wingsgroup.vn`, `wingsgo.vn`, `wingside.vn`, `wingsplus.vn`, `wingspass.wingsgroup.vn` and `wingscare.wingsgroup.vn` returned `200`. |
| Authoring API guard | PASS | Unauthenticated `/api/tour-authoring/...` returned `401`; authenticated CMS write was not attempted. |
| Stateful services | PASS | PostgreSQL and Redis container identities were unchanged; no migration and no cache flush. |
| Browser proof | PASS_WITH_NOTES | `agent-browser` confirmed VI/EN homepage render, light theme, one H1, responsive width at 390px/1440px, consultation CTA and `/tour` image loading after lazy-load scroll. Screenshots: `output/production-us075-wingsgroup.vn.png`, `output/production-us075-wingsgroup-en-1440.png`, `output/production-us075-wingsgo.vn.png`, `output/production-us075-wingside.vn.png`, `output/production-us075-wingsgo-tour-1440.png`. |
| Authenticated CMS UAT | PASS_WITH_NOTES | Đã chạy đủ 11 bước bằng session CMS đã xác thực; evidence chi tiết ở mục kế tiếp. |

### Authenticated CMS UAT — 2026-09-18

| Step | Result | Evidence |
| --- | --- | --- |
| 1. Đăng nhập và mở TourProduct | PASS | CMS production session mở đúng TourProduct fixture `[UAT US-075] Tour Demo 20260917`. |
| 2. Site scope WingsGo | PASS_WITH_NOTES | Product, wrapper và departure đều được xác nhận cùng site WingsGo (`site=2`); không tạo dữ liệu chéo site. |
| 3. Lưu bản nháp | PASS | VI draft giữ title, summary, itinerary và media state sau autosave; không publish khi chưa chủ động publish. |
| 4. Provision wrapper | PASS | Wrapper `/tour/uat-us-075-tour-demo-20260917` được tạo/reuse ở trạng thái draft; [screenshot step 4](../../../../../output/playwright/us075-uat-step-4-wrapper-draft.png). |
| 5. Quick-add năm departure | PASS | Tạo 5 dòng, kiểm tra `Lưu & thêm tiếp` không reload và `Lưu & hoàn tất` đóng form; [screenshot step 5](../../../../../output/playwright/us075-uat-step-5-departures.png). |
| 6. Gallery add/remove | PASS | Chọn 4 ảnh, thấy thumbnail/tên/mở ảnh, gỡ đúng 1 quan hệ còn 3; không DELETE Media; [before](../../../../../output/playwright/us075-uat-step-6-gallery-before-remove.png), [after](../../../../../output/playwright/us075-uat-step-6-gallery-after-remove.png). |
| 7. Saved draft Preview | PASS | Preview hiển thị marker `Tour mới — bản nháp chưa xuất bản`, nội dung draft và 5 departure; [screenshot step 7](../../../../../output/playwright/us075-uat-step-7-draft-preview.png). |
| 8. Anonymous draft isolation | PASS | Tab ẩn danh nhận 404 và không thấy title/giá draft; [screenshot step 8](../../../../../output/playwright/us075-uat-step-8-anonymous-isolation.png). |
| 9. Publish | PASS | Readiness chọn đủ 5 departure; wrapper và các departure được publish sau xác nhận; [screenshot step 9](../../../../../output/playwright/us075-uat-step-9-publish.png). |
| 10. Public route | PASS | `https://wingsgo.vn/tour/uat-us-075-tour-demo-20260917` trả 200, hiển thị đủ 5 lịch bay/giá; [screenshot step 10](../../../../../output/playwright/us075-uat-step-10-public.png). |
| 11. Expired freshness | PASS_AFTER_HOTFIX | Lần đầu retest phát hiện detail renderer truyền raw `priceFrom`; hotfix chuẩn hóa public departure price theo `isDepartureVerificationCurrent`. Sau deploy, departure hết hạn hiển thị `Liên hệ`, 4 dòng còn hiệu lực vẫn hiển thị giá; [screenshot](../../../../../output/playwright/us075-uat-step-11-expired-price-hotfix.png). |

Fixture cleanup sau proof: TourProduct `93`, wrapper `309` và departures `116–120` đã xóa đúng mục tiêu; các Media `106`, `110`, `117`, `1149` vẫn trả `200`. URL test sau cleanup trả `404`.

### Production freshness hotfix — 2026-09-18

- Root cause: `getResolvedTourDetailBySlug()` lấy departure raw, trong khi
  `normalizeDepartureCard()` chưa áp dụng verification window cho public detail.
- Fix: `app/src/tours/queries.ts` dùng helper `isDepartureVerificationCurrent`
  ở lớp chuẩn hóa dùng chung; draft preview giữ nguyên giá, public output mask
  `priceFrom` khi verification hết hạn.
- Regression: `pnpm --dir app run test:int -- tests/int/wingsSideTourScoping.int.spec.ts`
  và full integration runner đều pass (`33` files passed, `177` tests passed,
  `6` files skipped, `10` tests skipped); component `31/31` files, `160/160`
  tests; ESLint `0` errors.
- Release: `us075-expired-price-hotfix-20260917T170130Z`, ARM64 image
  `sha256:58eed2a3999a7e407996aaf2bed6fbbe2f0b995f01ab4e93310073e825449186`;
  `/api/health/live`, `/api/health/ready` và public route đều `200` trước
  cleanup. PostgreSQL/Redis container identity không đổi, không migration và
  không flush Redis; rollback tag được giữ lại.

Production disk còn khoảng `1.1 GB` trống (`98%` sử dụng). Full rebuild trên host
đã dừng an toàn vì thiếu không gian khi unpack; rollback tag được giữ nguyên và
release được triển khai bằng overlay image, không xóa image/cache cũ trong bước
release này.

### Independent post-UAT audit — 2026-09-19

| Finding | Result | Evidence / next proof |
| --- | --- | --- |
| Create flow — itinerary row | CONFIRMED UX GAP | `app/src/collections/TourProducts.ts` khai báo `itineraryDays` bắt buộc và `initCollapsed: true`. Không thấy literal `minRows` trong source; cần giữ cách mô tả là required array cho đến khi runtime validation chứng minh option khác. Acceptance: row đầu mở sẵn và Save error đưa tới đúng tab/dòng/field. |
| Provision wrapper HTTP 500 | REPORTED LIVE, ROOT CAUSE UNCONFIRMED | `app/src/tours/authoring.ts` đã truyền `createLayoutPresetData('tour-conversion')`; vì vậy không kết luận thiếu default layout. Reproduce trên staging/fixture an toàn và capture error class/code đã sanitize cho Page validation, thiếu `/tour` hub, site access và transaction. Generic 500 không đạt release gate. |
| Quick-add departure persistence | NOT CONFIRMED AS REPORTED | `TourDepartureManager` hiện POST/PATCH trực tiếp `/api/tour-departures`, sau đó gọi `load()`. Authoring endpoint chỉ nhận `provision`/`publish` là đúng boundary hiện tại. Cần network proof status 2xx + GET/reload thấy row trong cùng `site`/`tourProduct`; nếu fail thì sửa direct path hoặc runtime drift, không thêm endpoint ghi trùng. |

#### UAT closure decision

Vòng UAT ngày 2026-09-18 vẫn được giữ nguyên làm historical evidence; kết quả
post-UAT không xóa evidence cũ nhưng mở lại các gate liên quan. US-075 chưa đủ
điều kiện Done cho đến khi:

1. provision thành công/reuse idempotent hoặc trả lỗi actionable, không còn
   generic 500;
2. dòng itinerary đầu tiên có thể nhập ngay và lỗi Save điều hướng đúng;
3. quick-add được chứng minh persist bằng response + đọc lại dữ liệu, không chỉ
   bằng việc modal đóng.

Không ghi nhận yêu cầu mở rộng `/api/tour-authoring/[id]` cho departure ở thời
điểm này; đó sẽ là thay đổi kiến trúc chỉ được xem xét nếu direct collection
contract đã được tái hiện là không đáp ứng.

### Production visual smoke — 2026-09-19

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Release identity | PASS | Active release `wingsgroup-us075-visual-20260919T032700Z`; isolated production-source snapshot `8ffa9bba7f7de5d6da2aa6de7f6dbb9739dbc4c3`; archive SHA-256 `9a948e7cc5e2d62952fbbc3037975a08c5769cb942d1fc6ca1741935d83b7475`; ARM64 image `sha256:48eed8678f752511e6b67f719ca7b67d6712f450b568ac0ee4504623f16777ab`. Previous image `sha256:6075b26e847c602da29c57070573777623669b553e8e7bd65221d3ccf0361116` remains tagged for rollback. |
| Build and focused tests | PASS | Production ARM64 Next build, TypeScript, static generation; candidate-source TypeScript; focused component 6/6 and unit 13/13 tests. |
| Health and stateful services | PASS | Live/ready, `wingsgroup.vn/` and `/en` returned 200; `PAYLOAD_DB_PUSH=false`; PostgreSQL and Redis container IDs unchanged; no migration, schema edit, or Redis flush. |
| CMS create screen | PASS | `/admin/collections/tour-products/create` rendered successfully (document 200); site selector and tabs appeared. No tour was created. |
| Itinerary interaction | PASS_WITH_NOTES | Existing tour 91 rendered without overlap and its six itinerary rows were expanded. A temporary blank seventh row showed its required fields expanded; Payload autosave validation returned 400. A following authenticated GET confirmed `updatedAt=2026-09-16T09:26:40.717Z`, six rows, and last day 6; no tour change persisted. |
| Quick-add visual | PASS_VISUAL_ONLY | Departure form displayed as an opaque bordered card with actions; no departure was submitted. Persistence remains unverified on production. Wrapper provision/publish actions were not invoked. |
| Browser console | PASS | No browser errors observed. Screenshots were captured locally under `/tmp/wingsgroup-us075-*` and are not committed. |

US-075 remains in progress / `Chờ xác nhận`. Production visual checks confirm the
create page and expanded itinerary UX, but do not close the reported wrapper
provision 500 or prove a successful production departure write. The host had
`976 MB` free (`98%` used) after build; no image/cache cleanup was performed.

### Tour list detail and bulk actions — 2026-09-21

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Open individual tour | PASS_COMPONENT | `LocalizedTitleCell` renders an accessible title link to `/admin/collections/tour-products/:id`; component test verifies the route. |
| Clarify bulk action | PASS_COPY | Tour list guidance says the toolbar `Chỉnh sửa` action applies to selected rows. The core button label remains unchanged because Payload shares its `general:edit` translation with single-record relationship/folder actions. |
| Regression scope | PASS_WITH_NOTES | Other collection title cells remain plain text; focused component test 3/3 and targeted ESLint pass. Production ARM64 Next build, TypeScript and static generation pass. Serial full component run: 32/34 files and 160/164 tests passed; 4 failures are in `tourGalleryField` (2) and `wingsGroupV3Homepage` (2), outside this release diff and not changed here. |
| Production / data | DEPLOYED — VISUAL UAT PENDING | No CMS record was edited. Release is live and public/admin routes respond; a logged-in CMS user still needs to verify title-click detail navigation and toolbar bulk edit in the browser. |

### Production deployment — 2026-09-21

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Release identity | PASS | Source commit `07a2e7a59717cbc32c5fd87946298c168db8a3dd`; archive SHA-256 `9bb0f642080cf02d3f843042f112100e59d7d4438dace52b6a8eccef5a342d55`; release `/home/ubuntu/wings-travel/releases/wingsgroup-us075-tour-list-07a2e7a-20260921`; ARM64 image `sha256:f4ab5b48d30ad17b7b09fbae58834371b2daab787d10d4acf85c656216ad4396`. |
| Health and public route | PASS | `https://wingsgroup.vn/api/health/live`, `/api/health/ready`, and `/` returned 200 after promotion. |
| CMS route availability | PASS_WITH_NOTES | `/admin/login` and the tour list returned 200 when the request retained the `payload-lng=vi` cookie. A cookie-less curl repeats the same-URL 307 by design while bootstrapping this admin locale cookie; no authenticated browser session was used. |
| Stateful services and safety | PASS | PostgreSQL container `ab500698…` and Redis container `b59a6251…` remained unchanged and healthy; app-only recreate, no migration/schema change, no CMS write, no Redis flush. Previous app image `sha256:2d9e47e4…` is retained as rollback. |
| Disk cleanup | PASS | Removed only unreferenced historical image tags after verifying no container used them; 2.7 GB remained free after deploy. Current and previous rollback images were preserved. |

Production confirms deployment and route availability, not the authenticated
interaction itself. US-075 remains in progress / `Chờ xác nhận` until an operator
verifies that clicking one tour title opens its detail editor and that selecting
rows then using the toolbar `Chỉnh sửa` performs bulk editing.

### Draft preview 404 root-cause fix — 2026-09-22

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Root cause | CONFIRMED | TourProduct `111` is a WingsGo draft with `wrapper_page_id = null`. The preview handoff can be minted, but the public `/tour/<slug>` renderer requires a Page wrapper and exits before structured tour rendering, so the final URL returns 404. Missing departure/variant rows are not the cause. |
| Admin preview guard | PASS | `TourProducts.admin.preview` and `admin.livePreview.url` now return no preview URL until `wrapperPage` is linked; the field description points the operator to create/link the tour page. |
| Server preview guard | PASS | `/next/preview` returns HTTP `409` with an actionable “linked wrapper page” message for a `tour-products` draft without a wrapper, instead of issuing a handoff that will end in 404. |
| Regression checks | PASS | `tourProductPreview.unit.spec.ts` (1/1), `localPreviewRoute.unit.spec.ts` (10/10), TypeScript (`tsc --noEmit`) and targeted ESLint (0 errors; one existing `no-explicit-any` warning at `TourProducts.ts:862`). |
| Production | PENDING | No production CMS write was performed in that verification; the code was later deployed in the production checkpoint below. Product `111` still needs an idempotent wrapper provision/reuse and an authenticated preview recheck. |

This fixes the misleading preview path while preserving the existing explicit
`Tạo trang tour nháp` authoring action. US-075 remains in progress / `Chờ xác nhận`;
the production provision and browser proof are still required before closure.

### Production deployment — preview guard — 2026-09-22

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Release identity | PASS | Release `/home/ubuntu/wings-travel/releases/wingsgroup-us075-preview-guard-20260922-r2`, based on live `wingsgroup-media-upload-8e6e3c9-20260922`; overlay archive SHA-256 `5bcded9c91d18800fe4a807d25249aed04d5d68babd73338697f33a9b1026c19`. |
| Build | PASS | Production ARM64 Docker build completed with TypeScript and static generation `20/20`; image `sha256:15ae02c827dbfd2e822ebf1183afc6061564324a7d6a58988d9f338b729b0421`, release label matches `wingsgroup-us075-preview-guard-20260922-r2`. |
| Health and public domains | PASS | Local `/api/health/live` and `/api/health/ready` returned 200; `wingsgroup.vn`, `wingsgo.vn`, `wingside.vn`, `wingsplus.vn`, `wingspass.wingsgroup.vn` and `wingscare.wingsgroup.vn` returned 200. |
| Stateful services | PASS | PostgreSQL `ab500698a619…` and Redis `b59a6251dcfd…` remained running and unchanged; no migration, schema change, CMS write or Redis flush. |
| Rollback | PASS | Previous app image `sha256:c474f0c137ce74bd71a5137e7c572091084b806d966a098434c239468725c816` retained as `rollback-before-wingsgroup-us075-preview-guard-20260922-r2`; the prior production image remains separately tagged. |
| Product 111 preview proof | PENDING | Deployment changes the preview guard only. No production CMS record was edited; an authenticated operator still needs to provision/reuse the wrapper and verify the signed preview flow for product 111. |

US-075 remains in progress / `Chờ xác nhận`. Production runtime is healthy and
the misleading handoff path is guarded, but the wrapper lifecycle and
authenticated product proof remain open.

### Wrapper lifecycle UX implementation — 2026-09-23

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Invalid relation visibility | PASS_CODE | `buildAuthoringState` now returns the linked wrapper even when its site/path is wrong, plus expected path, actual path, status, site, health, linked product IDs and same-site candidates. |
| Safe actions | PASS_CODE | Added `relink` through the authenticated authoring route. Relink requires same site and exact `/tour/<slug>`, rejects shared wrappers, and runs inside the existing PostgreSQL advisory transaction. Provision can create a replacement draft when the existing relation is invalid; it never edits the old Page. |
| Preview separation | PASS_COMPONENT | Readiness exposes CMS draft, signed `/next/preview` draft and public URL separately. Publish confirmation names Product, wrapper Page/path and selected departure IDs. |
| Editor guidance | PASS_CODE | TourProduct slug/wrapper help, slug drift warning, and Page wrapper guidance explain the Product → Page → Departure relationship and tell operators where to act. |
| Regression checks | PASS | `tourAuthoring.unit.spec.ts` 13/13 and `tourAuthoring.component.spec.tsx` 5/5; TypeScript pass; targeted ESLint 0 errors (existing `no-explicit-any` warnings only). |
| Production safety | NOT_RUN | Product #112 and Pages #314/#237 were not edited. Authenticated production browser proof and deployment remain separate gates. |

Health is intentionally fail-closed: `valid` is publishable, `orphan` is an
assignable candidate, and `invalid_path`, `invalid_site` or `shared` require a
new explicit action. `draft`/`published` remains a separate status field so an
operator can distinguish lifecycle from relation health.

### URL lifecycle prerequisites — 2026-09-23

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Lowercase at form input | PASS_COMPONENT | `TourSlugField` normalizes every change event; component regression passes `6/6`. |
| Lowercase at server boundary | PASS_CODE | `TourProducts` `beforeValidate` normalizes direct REST/import writes before validation. |
| Transaction boundary | PASS_CODE | `relinkAuthoring` and `publishAuthoring` use PostgreSQL `beginTransaction`, advisory lock, commit/rollback; publish lock is stable per site/product. |
| Auto-create 301 record | PASS_UNIT | `ensurePublishedTourRedirect` creates `{from,to.url,type:'301'}` once, upgrades same-target legacy records, and rejects conflicting targets; unit suite `15/15`. |
| Exact delivery status | PASS_UNIT | Proxy looks up only `type:'301'` records and returns `NextResponse.redirect(..., 301)` before the CMS route; proxy suite `28/28`. |
| Redirect schema | PASS_CODE_PENDING_MIGRATION | `redirectsPlugin({ redirectTypes: ['301', '307'] })`, generated Payload type and migration `20260923_090000_tour_authoring_redirect_type` are present; existing records default to `307`. Production migration proof is not run in this code-only checkpoint. |
| Production/browser proof | NOT_RUN | No CMS record, redirect or production database was written; deploy + migration + authenticated slug-change proof remain release gates. |

The auto-created record is the data contract for delivery. The production
release must apply the migration before calling the publish action. A live
HTTP check must still verify the deployed proxy returns `301` for the old path
and lands on the new path; the server-component fallback is not accepted as
proof by itself.

### Production deployment — URL lifecycle prerequisites — 2026-09-24

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Release identity | PASS | Overlay archive SHA-256 `279e8959a8dc691e0a5d6b6f4799feedd0f3510e6f09da8d27413d19b1705e52`; release `/home/ubuntu/wings-travel/releases/wingsgo-us075-authoring-20260923T1720Z`; source base `efdfe67e6791868124e132a569954a9abe317956`. |
| Build and regression | PASS | Production ARM64 Docker build completed with TypeScript and static generation `20/20`; focused unit `43/43`, component `6/6`, and `git diff --check` passed. Image `sha256:d915b31598b37d41226386f44cd49d1e7816aa4f900ffbc52858f1793db31be9`, runtime container `f6b4172574d2`. |
| Database safety and migration | PASS | Pre-migration PostgreSQL dump `/home/ubuntu/wings-travel/shared/backups/wingstravel-us075-authoring-20260923T1720Z-pre-migration.dump`, 3,759,088 bytes, SHA-256 `0d024b13abd6e9aded0c04150b4750cc18fae154856c45e179a4054597126397`; migration `20260923_090000_tour_authoring_redirect_type` applied at batch 24. `redirects.type` is `NOT NULL` with default `307` and enum values `301/307`. |
| Stateful services and rollback | PASS | PostgreSQL `ab500698a619` and Redis `b59a6251dcfd` stayed unchanged and healthy. Previous app image `sha256:fde66fcdd7ccaae642da951bae83142028713e719f1fc3dc2ba3b70c304ee06f` is retained as `wingstravel-app:rollback-before-wingsgo-us075-authoring-20260923T1720Z`. |
| Health and public smoke | PASS | Local live/ready and all six public host health endpoints returned `200`; WingsGo `/`, `/lien-he`, `/lich-khoi-hanh`, existing tour route returned `200`; anonymous `/api/tour-authoring/111` returned `401`. |
| Browser smoke | PASS | `agent-browser` production snapshot confirmed WingsGo header hotline/Zalo, hot-tour section with four cards, destination cards and CTAs. Screenshot: `app/output/production-us075-authoring-20260924-home.png`. |
| Live 301 fixture | NOT RUN | Production currently has 4 redirect records, all `307`, and no `301` record. No CMS slug-change fixture was created or changed during this release; HTTP `301` delivery remains covered by the `28/28` proxy unit suite and will be verified when an approved public slug change exists. |

The release is live and the story remains `Chờ xác nhận`: production migration and
runtime rollout passed, while authenticated wrapper provision/reuse, product 111
preview proof, and the approved live slug-change fixture remain separate UAT gates.

### Production storage cleanup — 2026-09-24

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Cleanup scope | PASS | Removed Docker builder cache (`3.474 GB`), 15 unprotected historical app image tags, 2 dangling image IDs, 82 old release snapshot entries, 17 stale `incoming` entries, and the obsolete `verified-source-b967ec8` snapshot. |
| Protected runtime | PASS | Kept current release `/home/ubuntu/wings-travel/releases/wingsgo-us075-authoring-20260923T1720Z`, rollback source `/home/ubuntu/wings-travel/releases/wingsgo-ux-bc2a523-20260923`, current image, rollback image, media, PostgreSQL/Redis volumes, backups and shared artifacts. |
| Capacity | PASS | Free space increased from `2.5 GB (95%)` to `18 GB (61%)`. Remaining large shared artifacts/imports were intentionally retained for audit/restore safety. |
| Runtime after cleanup | PASS | App `f6b4172574d2`, PostgreSQL `ab500698a619`, Redis `b59a6251dcfd` unchanged; local live/ready and all six public health endpoints returned `200`. |

### Production repair — TourProduct #112 preview/public 404 — 2026-09-25

| Check | Result | Evidence |
| --- | --- | --- |
| Root cause | CONFIRMED | Product #112 had slug `HN-SEOUL-NAMI-EVERLAND-haitao` normalized to `hn-seoul-nami-everland-haitao` but still pointed at shared wrapper Page #237 (`/tour/seoul-nami-everland-5n4d-215372`) also linked to Product #20. The orphan draft Page #314 had the wrong pathname and was not linked. Production authoring code also rejected invalid wrappers instead of provisioning a replacement. |
| Safety backup | PASS | PostgreSQL dump `/home/ubuntu/wings-travel/shared/backups/us075-tour112-repair-20260925T081816Z.dump`; SHA-256 `581c00d81cead09a9ec714cf974bebc65d88f2870a5c0764feacc3631be2f12c`. |
| Application fix | PASS | Source `7ad2793ef1dc0c6ed7e59f24b0baf77ca6a19ffc`; production release `/home/ubuntu/wings-travel/releases/wingsgroup-us075-7ad2793-20260925T091000Z`. Authoring provision now creates a replacement wrapper in the PostgreSQL transaction, relink remains same-site/exact-path guarded, redirect type `301/307` is exposed, and the proxy resolves permanent tour redirects through the local app origin when HTTPS is terminated at Nginx. |
| Wrapper and publish state | PASS | Product #112 is published with wrapper Page #316 at `/tour/hn-seoul-nami-everland-haitao`; Page #316 is published and valid. Product #20 remains linked to Page #237; Page #314 was not deleted or modified. |
| Departure scope | PASS | Departure #123 (`2026-10-29`, `open`) is published. #121 and #122 remain draft/sold-out. |
| Redirect contract | PASS | Redirect #5 maps `/tour/HN-SEOUL-NAMI-EVERLAND-haitao` to `/tour/hn-seoul-nami-everland-haitao` with type `301`. |
| Authenticated preview | PASS | `GET /next/preview?collection=tour-products&id=112&locale=vi&path=/tour/hn-seoul-nami-everland-haitao` returned `200`, emitted a preview handoff, and contained no 404/Not Found marker. |
| Public route | PASS | Production HTTP: uppercase path `301` to lowercase; lowercase path `200`; existing Product #20 path `200`. `agent-browser` opened the lowercase route and verified title `HÀ NỘI – SEOUL – NAMI – EVERLAND - HÁI TÁO`, itinerary, PDF control, monthly departure tabs and the published 29/10/2026 row. |
| Runtime safety | PASS | `/api/health/live` and `/api/health/ready` returned `200`; PostgreSQL `ab500698a619` and Redis `b59a6251dcfd` container IDs were unchanged; no migration or Redis flush was run during the repair. Disk cleanup retained the current release and one rollback image; free space increased to about `9.8 GB`. |

US-075 remains `in_progress` / `Chờ xác nhận` because broader itinerary-row,
quick-add persistence and cross-role browser UAT gates are still open. This repair
closes the Product #112 wrapper, preview and public 404 path specifically.

### Operator warning and repair guidance UX — 2026-09-25

| Check | Result | Evidence |
| --- | --- | --- |
| Readiness status | PASS_CODE | TourProduct authoring now shows an explicit `Đủ điều kiện xuất bản`, `Cần xử lý` or `Đang chờ duyệt` state with a reason. |
| Guided repair steps | PASS_CODE | The panel shows four ordered steps: save tour, create a matching wrapper, add/select a departure, then preview and publish. |
| Actionable warnings | PASS_CODE | Each server issue is rendered with severity, plain-language cause, repair guidance and a direct action to edit the slug/title, create a wrapper, inspect candidates or add a departure. |
| Wrapper safety guidance | PASS_CODE | Page wrapper screens now explain that wrapper relation, pathname and publish actions belong in TourProduct; URL changes are called out as 301-producing changes. |
| Accessibility and responsive layout | PASS_CODE | Status uses `role=alert`/`role=status`, disabled Publish exposes its reason through `aria-describedby`, and action links scroll/focus the relevant field or section. |
| Verification | PASS | Targeted ESLint passed, `pnpm exec tsc --noEmit` passed, and production build/static generation completed successfully. Production deployment is a separate release gate. |

The UX change is source-ready but is not marked as a production release until the
application-only release checklist is run and the deployed admin screen is
verified in an authenticated browser session.

### Production E2R recheck — 2026-09-27

| Check | Result | Evidence |
| --- | --- | --- |
| VI public routes | PASS | `https://wingsgo.vn/`, `/lien-he`, and `/lich-khoi-hanh` returned HTTP 200. |
| EN public routes | PASS | `/en`, `/en/lien-he`, and `/en/lich-khoi-hanh` returned HTTP 200; browser rendered `2026 departures & tour prices`, destination sections, and open departures. |
| Temporary UAT fixture isolation | PASS | `/tour/uat-us-075-tour-demo-20260917` returned HTTP 404 after historical fixture cleanup. |
| Write safety | PASS | This recheck was read-only; no CMS save, publish, lead submission, or content mutation was performed. |

Artifact: `artifacts/production-e2e-20260927-us075-summary.json` (SHA-256 `5e92edd3c5b38b586c409d630add70a9771e98a7bb54ea91a7f1646ae7898504`). Historical authenticated CMS evidence remains the 11-step UAT recorded on 2026-09-18; its temporary product, wrapper, and departures were cleaned up and the route remains 404.

### Production public-media hotfix — 2026-09-28

| Check | Result | Evidence |
| --- | --- | --- |
| Root cause | CONFIRMED | `wingsgo.vn/tour` card media requests were rejected with HTTP 403 because `/api/public-media/[filename]` hard-coded WingsGroup host validation. |
| Application fix | PASS | Public media route resolves the active site by request hostname and enforces same-site media; ordinary Page media no longer depends on the retired WingsGroup governance gate. |
| Release build | PASS | Application-only release `wingsgroup-public-media-20260928T120000Z`; TypeScript, targeted ESLint and 40/40 media/proxy/catalog unit tests passed before build. |
| Production health | PASS | `/api/health/live` and `/api/health/ready` returned 200. |
| WingsGo media | PASS | Representative media changed from HTTP 403 to HTTP 200 `image/jpeg`; browser audit loaded 11/11 tour media images with zero failed images after lazy-load scroll. |
| Runtime safety | PASS | PostgreSQL container `ab500698a619...` and Redis container `b59a6251dcfd...` remained unchanged; only the app container was recreated. |

Artifact: `artifacts/wingsgo-image-audit-20260928/production-image-fix.json` (SHA-256 `0283df00a583a7cb1d852d3fbeb03f2d623cc631c0492e097468938158eebfbc`). Screenshots: `tour-list.png` shows the pre-release blank media state; `tour-list-after-loaded.png` shows the post-release loaded images.

### Newly requested CMS authoring requirements — 2026-09-29

Hai yêu cầu mới được ghi nhận vào US-075; không tạo US mới vì đều thuộc cùng
luồng TourProduct → wrapper Page → readiness:

| Requirement | Acceptance / edge cases | Current gap and proof required |
| --- | --- | --- |
| Vietnamese slug không dấu | `Hà Nội – Seoul – Nami – Everland – Hái Táo` phải thành `ha-noi-seoul-nami-everland-hai-tao`; không mất ký tự `đ/Đ`, không còn dấu, khoảng trắng/ký tự liên tiếp gộp thành một dấu `-`, trim dấu `-` ở hai đầu. UI, REST/API và import phải cho cùng kết quả. | `TourSlugField` hiện chỉ `.toLowerCase()` và server hook cũng chỉ lowercase, nên chưa đáp ứng transliteration. Bổ sung unit/component/integration proof cho form và server boundary; kiểm tra collision và redirect `301` khi slug public đổi vẫn giữ nguyên. |
| Candidate Page là link edit CMS | Với mỗi candidate (đặc biệt #314, #315, #316), ID/path phải là anchor tới `/admin/collections/pages/<id>` và mở đúng edit record; nút `Gán wrapper này` vẫn là control riêng, link không được gọi mutation. | Component test phải kiểm tra href theo ID, accessible name/link và cả trường hợp ID string; browser/UAT xác nhận mở đúng Page edit. Không dùng public path làm href edit vì candidate có thể draft, orphan hoặc sai pathname. |

**Implementation boundary:** dùng một normalizer slug dùng chung cho client,
`TourProducts.beforeValidate` và mọi import/API path; readiness chỉ bổ sung
anchor dùng route CMS hiện có. Không đổi dữ liệu production tự động trong
phạm vi ghi nhận yêu cầu; release và production UAT là gate riêng.

### Public media regression redeploy — 2026-09-29

| Check | Result | Evidence |
| --- | --- | --- |
| Root cause | CONFIRMED | Production was serving `wingsgroup-direct-cta-20260929T051258Z`, whose public-media handler still enforced the WingsGroup-only host gate; WingsGo catalog images returned 11/11 HTTP 403. |
| Release | PASS | App-only release `wingsgo-public-media-20260929T081000Z`, source archive SHA-256 `46e1cb783d547e88739a7b053d7b32988193fd1c2462bab2691d7b539c539d62`, active image `sha256:a4ba402e356e6de5286683409c66252ccc95e20d75e8c7f37d01885b14489965`. |
| Media behavior | PASS | Hostname-based site resolution serves WingsGo media; WingsGroup keeps the governed publication/validation gate. Catalog smoke is 11/11 HTTP 200; tour detail media smoke is 4/4 HTTP 200; two WingsGroup media checks are HTTP 200. |
| Runtime safety | PASS | `/api/health/live` and `/api/health/ready` are 200; PostgreSQL `ab500698a619` and Redis `b59a6251dcfd` are unchanged; no migration and no database write. Rollback image `sha256:9d94e8af5717…` is retained. |

Artifact: `artifacts/wingsgo-image-audit-20260929/production-media-redeploy.json`.

### Unicode media filename fix — 2026-09-29

| Check | Result | Evidence |
| --- | --- | --- |
| Root cause | CONFIRMED | TourProduct #117 catalog image used a filename containing Chinese characters, emoji and full-width punctuation; the ASCII-only filename validator returned HTTP 404 while older ASCII filenames returned HTTP 200. |
| Safe filename boundary | PASS | `isSafePublicMediaFilename` now accepts Unicode filenames and rejects slash, backslash, NUL, control characters, DEL, `.` and `..`; unit/proxy checkpoint is 32/32. |
| Production release | PASS | `wingsgo-media-unicode-20260929T091500Z`, source commit `66abcd129d826c202694c49b850f7f93f53ea5b7`, active image `sha256:3067681fe1b6…`. |
| Tour #117 browser proof | PASS | `/tour/h-ni-osaka-kobe-kyoto-ni-ph-s-tokyo` renders the Unicode-named hero at natural size `1080×1440`; direct media request returns HTTP 200 `image/jpeg`. |
| Regression proof | PASS | Existing ASCII tour image and PNG detail hero return HTTP 200; live/ready health remains HTTP 200; PostgreSQL/Redis containers unchanged; no migration or database write. |

Artifact: `artifacts/wingsgo-image-audit-20260929/unicode-filename-fix.json`.

### Merge with newer production release — 2026-09-29

| Check | Result | Evidence |
| --- | --- | --- |
| Newer release compatibility | PASS | `wingsgroup-lock-notice-20260929T160900Z` was preserved as the source base; only the Unicode-safe filename utility and schema-compatible public-media route were overlaid. |
| Schema conflict removal | PASS | The newer `Media` schema has no `governance` field. The final route queries only `filename` and configured image-size filename fields, preventing the previous `governance` query from causing HTTP 500 on `-640.avif` derivatives. |
| Multilingual filename proof | PASS | Tour #117 Unicode original returns HTTP 200 `image/jpeg`; its `-640.avif` derivative returns HTTP 200 `image/avif` and browser natural size `640×853`; older ASCII JPG and PNG media remain HTTP 200. |
| Runtime | PASS | Active release label is `wingsgroup-lock-notice-unicode-20260929T093600Z`; live/ready are HTTP 200; PostgreSQL `ab500698a619` and Redis `b59a6251dcfd` are unchanged; no migration or database write. |

Artifact: `artifacts/wingsgo-image-audit-20260929/lock-notice-merge.json`.

### Authenticated production UAT — 2026-09-29

| Check | Result | Direct evidence / limitation |
| --- | --- | --- |
| Live identity | PASS | Before/after the browser flow, `current` was `/home/ubuntu/wings-travel/releases/wingsgroup-no-proof-20260929T040313Z`; app `c95e341378c...` ran image `sha256:2ff0d665...`; `/api/health/live` and `/api/health/ready` both returned `200`. The live release contains the accepted normalizer and readiness-anchor sources. |
| Wrapper provision, prior generic 500 concern | PASS_FOR_FIXTURE | Authenticated CMS user opened TourProduct `111` (WingsGo) and clicked `Tạo wrapper bản nháp`. Browser network recorded `POST /api/tour-authoring/111` `200`; readiness then showed draft Wrapper `#319` at `/tour/tour-du-lch-wingsgo-vip-1789744001298` with CMS edit and draft-preview links. No generic HTTP 500 was reproduced for this fixture. This is not proof for every possible Page/site/transaction failure class. |
| Itinerary create and error handling | PARTIAL | Clicking `Thêm: Itinerary Day` created a blank second row. Its first autosave returned `PATCH /api/tour-products/111?...autosave=true...` `400` (twice); the `Lịch trình` tab then rendered `3 Lỗi` and required-field errors for the new row. Reload showed only the original day, so the invalid row did not persist. The initial added row was collapsed before validation; cross-tab error navigation was not directly exercised because the test was already on `Lịch trình`. This does not close the row-expanded-on-create/navigation gate. |
| Quick-add persistence | PASS | With one safe draft departure (`2026-12-31`, `UAT production`, `UAT`, `1,234,567 VND`, verified expiry `2026-12-31T23:59`), browser network recorded `POST /api/tour-departures` `201`, followed by scoped `GET /api/tour-departures?...tourProduct=111...site=2...` `200`. A full reload still rendered the row, its draft status, and `Xác minh còn hiệu lực`. |
| Cleanup | NOT RUN | The newly created draft wrapper `#319` and draft departure remain on the pre-existing UAT fixture TourProduct `111`. Historical cleanup instructions name different, already-deleted fixture IDs; no current documented cleanup authorizes deleting these records. |

Browser screenshots are local evidence under `/tmp/us075-uat-*` (including
`wrapper-provision.png`, `itinerary-added.png`, and
`quickadd-persisted-after-reload.png`). No source, deployment, migration,
Redis operation, or Plane-date repair occurred during this UAT.
