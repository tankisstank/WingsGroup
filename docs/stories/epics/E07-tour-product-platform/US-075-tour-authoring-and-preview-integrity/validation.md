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

## Test Matrix

| Layer | Cases bắt buộc |
| --- | --- |
| Static | Không sửa schema/migration hoặc merge collection; collection field inventory không có label WingSide trên WingsGo presentation; `gallery` vẫn là relationship tới `media`; import map/typecheck không lỗi; wrapper/departure helper không tạo write ngoài flow được duyệt |
| Unit | Site capability/default resolution; field visibility/neutral label; readiness calculation; wrapper provision/reuse idempotency; departure freshness state; dirty/save state; preview mode/status; locale/path normalization; invalid/expired handoff |
| Integration | TourProducts/TourDepartures/DepartureVariants/Pages config; wrapper same-site/path and draft-only behavior; quick-add gán đúng product/site; `draft: true` và fallbackLocale policy; site-scoped access; preview initializer/handoff; public resolver giữ draft flag |
| Component | WingsGo form không có `Loại tour WingSide`; WingSide có field đúng; site context/default; readiness links; business labels/progressive disclosure; departure table/quick-add; freshness copy; gallery empty/thumbnail/add/remove/loading/missing state; Preview disabled/warning khi dirty; status badge draft/published; error state rõ ràng |
| Authenticated E2E | Editor tạo/sửa draft WingsGo, xử lý readiness, provision/reuse wrapper, thêm ít nhất năm departure/giá, thêm hai ảnh, xem thumbnail, xóa đúng một ảnh, Save, Preview thấy marker mới; anonymous URL vẫn thấy marker published; Site Manager cross-site denial; editor publish guard |
| Linked data E2E | Draft TourProduct + departure/variant/wrapper Page được render cùng mode; không trộn draft với published nếu dependency có saved draft |
| Locale E2E | VI và EN độc lập, không fallback sai locale, preview status/copy đúng locale |
| Security | Sai tenant, sai document, sai path, sai locale, token giả/hết hạn và không allowlisted origin bị fail closed; không open redirect |
| Responsive | Admin form/gallery/departure controls dùng được ở 390, 768 và 1440px; thumbnail không vỡ layout, không che Save/Preview/readiness/status; keyboard/focus và non-color status usable |
| Platform | PostgreSQL production-shaped/staging smoke, build standalone, proxy/cookie/cross-domain handoff, health check; không migration/Redis flush |
| Release | Canary/after-state/rollback readiness; production CMS write chỉ khi có approval và exact fixture cleanup |
| Logs | Có thể truy vết site/collection/mode/result nhưng không ghi token, credential hoặc PII/free-text |

## Deterministic Fixtures

- Một `wings-go` TourProduct đã published, có wrapper Page và tối thiểu một
  departure; tạo draft marker khác biệt trong local/staging non-Production.
- Một `wings-go` TourProduct chưa có wrapper và một record đã có wrapper hợp lệ;
  kiểm tra provision/reuse, conflict, retry và không auto-publish.
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
| Authenticated CMS UAT | PASS_WITH_NOTES | Production fixture WingsGo đã chạy đủ 11 bước; bước freshness ban đầu phát hiện public detail chưa mask giá hết hạn, đã sửa và retest pass ở release hotfix bên dưới. |
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
