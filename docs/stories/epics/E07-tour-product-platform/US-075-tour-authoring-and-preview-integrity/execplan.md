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
- Phase 4: technical production release, canary/after-state, browser smoke và
  rollback readiness đã pass; authenticated CMS UAT vẫn pending.
- Phase 5: release evidence đã được ghi; Harness/Plane handover đang được cập
  nhật. Không đánh dấu story hoàn tất khi authenticated CMS UAT còn thiếu.

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

- Schema/migration/data cleanup.
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

- Không được tạo migration hoặc xóa/đổi dữ liệu hiện hữu để làm test pass.
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
9. Nếu phát hiện cần đổi schema hoặc data migration, dừng Phase 2 và tạo
   decision/US riêng; không tự mở rộng scope.

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
4. Production release proof đã hoàn tất với release
   `wingsgroup-us075-20260917T071748Z`; bước còn lại là chạy UAT CMS có xác thực
   bằng fixture được owner phê duyệt.

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
  authenticated CMS UAT vẫn là gate riêng trước khi đóng story.
- Task-based UAT chứng minh operator có thể hoàn thành luồng core, thấy
  readiness/freshness rõ ràng, provision/reuse wrapper và thêm nhiều departure
  mà không cần hiểu raw relationship hoặc technical field key.
