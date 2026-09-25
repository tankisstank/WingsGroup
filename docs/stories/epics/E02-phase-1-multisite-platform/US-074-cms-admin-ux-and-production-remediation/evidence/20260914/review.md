# US-074 — Review implementation candidate và remediation pass

**Ngày review:** 14/09/2026
**Kết luận:** **Chưa đủ điều kiện release/canary; chưa deploy Production.**

Review này đối chiếu source candidate hiện tại với `overview.md`,
`implementation-plan.md`, `design.md`, `validation.md` và evidence local. Phạm
vi Production chỉ gồm HTTP preflight công khai tới
`https://wingsgroup.vn/admin`; chưa có authenticated read/write, canary, backup
hay rollback Production.

## Những phần đã có bằng chứng đạt ở candidate

- Responsive shell local Chromium đạt geometry ở 360, 390, 430, 600, 679, 680,
  681, 768, 820, 1024, 1366, 1440 và 1920px; không còn width `0px` trong
  dataset đo được.
- Preview default/non-default locale local đã đi qua signed handoff,
  allowlist và tenant binding. Regression mới bao phủ WingsGo `vi→en`, WingSide
  `en→it`, default locale và CMS-only locale bị từ chối. Token không được đưa
  vào query string dài hạn hoặc evidence.
- Site context matcher đã phủ dashboard, custom route và collection list/create/
  edit; dirty-form guard và filter contract được giữ nguyên.
- Compact locale control đã được đăng ký cho các collection trong matrix; label
  locale không lặp code, title fallback theo default locale của site và status
  loading/error có unit proof.
- Site Review pagination đã có test trên 1.001 record, không duplicate và không
  bị cắt im lặng sau page đầu.
- Lead triage giữ allowlist field, site/role scope, optimistic version và không
  cập nhật `deliveryStatus`.
- Native Payload Array đã cung cấp `Collapse all`/`Show all` cho itinerary;
  `initCollapsed` và row label ngày/title đã có. Page edit guidance đã cung cấp
  `Tạo trang khác từ preset này`; authenticated interaction proof còn mở.
- Typecheck, unit, component, integration, lint, build và PostgreSQL migration
  rehearsal đều đã pass theo `release.md`.

Các kết quả trên là bằng chứng của implementation candidate, không phải xác
nhận mọi route admin trên staging hoặc Production.

## Findings của review

### Current disposition after remediation (authoritative)

| ID | Trạng thái hiện tại | Evidence/gate |
| --- | --- | --- |
| R-01 | Candidate fixed; release proof open | Unit regression phủ WingsGo `vi→en`, WingSide `en→it`, default và CMS-only locale deny. Còn authenticated child-domain preview, expiry/replay và frame handshake. |
| R-02 | Candidate fixed; browser proof open | Helper phủ custom route và collection list/create/edit; route matrix và API/site scope trên staging còn mở. |
| R-03 | Candidate fixed; fixture proof open | Fallback theo `site.defaultLocale`, có WingSide `en` source + Italian missing; cần cross-site/multi-row fixture proof. |
| R-04 | Candidate fixed; accessibility browser proof open | Có text/ARIA, `loading`/`unknown`/`uncreated`/`error` riêng và retry; cần keyboard, contrast, zoom 200% và screen-reader proof. |
| R-05 | Candidate fixed | Source đã dịch `Trang wrapper`, `generateSlug` và `Domain bổ sung`; cần snapshot browser cuối trên Tour Products/Sites. |
| R-06 | Candidate fixed; large-catalog route proof open | `loadCollection` phân trang theo `hasNextPage`; unit fixture 1.001 record đủ, không duplicate; cần route/integration fixture lớn. |
| R-07 | No-repro probe completed; owner confirmation open | Payload UI 3.84.1 source-contract probe đã kiểm tra 0/1/10/11/trang cuối và ghi [pagination-no-repro.json](./pagination-no-repro.json); các node khoảng trắng quanh `general:of` hiện hữu, custom.scss không override whitespace. Còn cần authenticated browser probe trên dataset thật và owner xác nhận. |
| R-08 | Release gate open | Anonymous `/admin` chỉ chứng minh login shell; thiếu authenticated Production Site/allowlist/proxy read, approval, canary, after-state và rollback. |
| R-09 | Safety guard pass; authenticated validation open | Admin E2E đã bỏ lifecycle Users/Roles, chặn Production target, đọc fixture qua `US074_E2E_*` và skip trước setup khi thiếu `US074_E2E_PREPROVISIONED=true`; safety contract 5/5 pass, suite không fixture 19 skipped. Còn cần fixture staging/QA sign-off cho authenticated coverage. |
| R-10 | Product decision open | Candidate giữ 5 status; Product/Operations owner chưa chốt 5 hay 6 status. |

Bảng dưới đây là snapshot lịch sử trước lượt remediation; bảng authoritative ở
trên được dùng để đọc trạng thái hiện tại và không xóa lịch sử finding.

### Historical baseline findings

| ID | Mức độ | Trạng thái | Bằng chứng và tác động | Hành động/gate cần xử lý |
| --- | --- | --- | --- | --- |
| R-01 | P1 | **Open / blocking** | Preview locale không mặc định đang ký `locale` khác `defaultLocale` nhưng `handoff.path` không có prefix locale. `app/src/app/(frontend)/next/preview/route.ts:136-148,243-255` tạo path `/posts/foo`; `app/src/app/(frontend)/next/preview/handoff/route.ts:35-41` redirect đúng path đó; trong khi `app/src/utilities/previewHandoff.ts:292-302` yêu cầu path identity phải khớp locale claim. Ví dụ WingSide default `en`, preview `it`: redirect tới `/posts/foo` làm identity là locale mặc định/không có prefix, grant `it` bị từ chối hoặc render sai locale. `it` hiện là public locale hợp lệ. | Prefix target bằng `handoff.locale` khi khác `handoff.defaultLocale` (giữ claims path là path không prefix để binding nhất quán), sau đó thêm route/handoff test cho WingsGo `vi→en` và WingSide `en→it`. Không mở `ja/ko/fr/de` vì public policy hiện tại vẫn tắt. |
| R-02 | P2 | **Open** | Site Switcher chưa thực sự global. `app/src/components/AdminSiteSwitcher/index.tsx:31-42` chỉ nhận dashboard và collection list exact path; nó bị disable trên `/admin/theme`, `/admin/site-review`, `/admin/page-wizard` và các collection edit route. Trong khi `adminSiteContextPattern` đã nhận các custom route tại `app/src/utilities/adminSiteContext.ts:4-5`. | Hoặc mở rộng route matching và giữ dirty-form guard, hoặc ghi rõ đây là chủ ý và chứng minh custom surface nào có selector riêng. Bổ sung component/browser proof cho list, edit và custom routes. |
| R-03 | P2 | **Open** | Title fallback đang cố định source locale `vi`: `app/src/utilities/localizedAdminTitle.ts:1`, API query tại `app/src/app/(payload)/api/localization-titles/route.ts:36,54`, cell gọi fallback tại `app/src/components/AdminCells/LocalizedTitleCell.tsx:112`. Với WingSide default `en`, bản `it` thiếu dịch nhưng bản `en` có title sẽ có thể hiện “Chưa có tiêu đề” thay vì title nguồn. | Resolve default/source locale theo site trong cùng batch (và giữ site access), hoặc cập nhật design contract nếu chủ đích luôn lấy `vi`. Thêm fixture WingSide `en` source + `it` missing. |
| R-04 | P2 | **Open / accessibility** | Compact control chỉ render các `<i>` chấm màu có `title` tại `app/src/components/ContentLocaleControl/index.tsx:225-231`; không có text/accessible name riêng cho từng locale. Khi request status lỗi, biểu thức `statuses[code] || (id ? 'uncreated' : 'unknown')` còn biến lỗi tải dữ liệu thành trạng thái “Chưa tạo”. | Hiển thị legend/text hoặc `aria-label` từng locale, phân biệt `unknown/error` với `uncreated`, có announcement/retry khi endpoint không khả dụng. |
| R-05 | P2/P3 | **Open** | Tour Products vẫn còn `label: 'Page wrapper'` tại `app/src/collections/TourProducts.ts:214-216`. Phần `slugField` tại `:945-961` chỉ đổi label slug, chưa override nhãn native `generateSlug`; finding dịch thuật chưa được đóng hết. | Sửa từ collection/config source, không DOM-hack; thêm assertion riêng cho Tour Products, gồm `Page wrapper` và `generateSlug`. |
| R-06 | P2 | **Open / scalability** | Site Review đọc pages/posts với `limit: 1000` tại `app/src/app/(payload)/api/site-review/route.ts:112-128` nhưng không xử lý `hasNextPage`. Khi catalog vượt 1.000 record, dữ liệu sau page đầu bị bỏ im lặng. Dataset hiện tại 152 pages/16 posts chưa chạm giới hạn này. | Phân trang server hoặc trả trạng thái đầy đủ/giới hạn rõ ràng; thêm fixture vượt 1.000 record hoặc count contract trước khi đóng. |
| R-07 | P2 | **Evidence gap** | Pagination spacing (`1-10trong số295`) chưa reproduce ổn định trên build hiện tại và chưa có patch nguyên nhân. `locale-matrix.md` chỉ ghi đây là regression contract, không phải finding đã pass. | Chạy lại trên build/staging với dataset 0/1/10/11 và trang cuối; nếu reproduce thì sửa Payload adapter/CSS đúng nguyên nhân, nếu không thì ghi kết quả probe có artifact. |
| R-08 | P1 | **Release gate open** | `domain-preflight.md` chỉ chứng minh anonymous `https://wingsgroup.vn/admin` qua bootstrap cookie `payload-lng=vi` tới login shell. Chưa có quyền đọc authenticated Site record, `PREVIEW_PUBLIC_ORIGINS`, reverse proxy, DNS owner approval, exact diff, canary, after-state hoặc rollback. | Chỉ owner/release operator Production mới xác nhận và apply WingsGo domain/preview config theo quy trình read-only → approval → backup → canary → verify → rollback rehearsal. Không suy đoán domain từ audit. |
| R-09 | P1 | **Validation gate open** | Admin E2E chưa được sign-off vì `test:e2e:prepare-db` bị treo; suite hiện hữu có setup/teardown đụng user/account, không tương thích với constraint giữ nguyên account của US-074. | Dùng fixture/staging đã chuẩn bị và không mutate account, hoặc tách test contract không cần account lifecycle. Không cleanup/tạo account để làm test chạy. |
| R-10 | P2 | **Product decision open** | Lead triage candidate dùng 5 status (`new`, `contacting`, `won`, `no_answer`, `lost`) tại `app/src/lead-capture/triage.ts`, trong khi design proposal có 6 status gồm `qualified`, `no_response`. | Product owner chốt một vocabulary rồi đồng bộ migration, API, UI và test; không alias/migrate ngầm trước khi chốt. |

## Quyết định release

Candidate **không được đánh dấu Delivered/Implemented và không được coi là đã
deploy Production**. R-01 đến R-06 đã có implementation candidate và regression
proof local, nhưng authenticated child-domain preview, Production config, safe
admin E2E, staging UAT và R-10 vẫn mở. R-07 đã có no-repro artifact nhưng vẫn
cần authenticated browser probe và owner confirmation trước khi đóng hoàn toàn.

Kế hoạch xử lý blocker, kiểm thử và hoàn thiện US được duy trì tại
[remediation-plan.md](../../remediation-plan.md).

Các finding về account được loại khỏi review theo yêu cầu. Trong lượt này không
có user/account nào bị xóa, disable, reset, rotate, rename, seed, đổi role,
đổi password hoặc đổi site membership.

## Verification run

Focused remediation checks từ `app/`:

```text
pnpm exec vitest run --config ./vitest.unit.config.mts \
  tests/unit/localPreviewRoute.unit.spec.ts \
  tests/unit/previewHandoffRoute.unit.spec.ts \
  tests/unit/adminSiteContext.unit.spec.ts \
  tests/unit/compactDocumentControls.unit.spec.ts \
  tests/unit/localizationTitlesRoute.unit.spec.ts \
  tests/unit/siteReviewPagination.unit.spec.ts
```

Result: **6 files, 19 tests passed**; full unit suite: **134 files, 992 tests
passed**. Integration rerun kết thúc **exit 0** (33 files/173 tests theo suite
inventory; 6 files/10 tests skipped theo điều kiện có sẵn), component suite
**26 files/145 tests passed**, typecheck/build pass và lint **0 errors/240
warnings**. Regression này đã bao phủ non-default locale handoff của cả WingsGo
và WingSide ở local; nó vẫn không thay thế authenticated staging/Production
cross-domain proof.

Evidence run chi tiết nằm tại
[remediation-run.md](./remediation-run.md).
