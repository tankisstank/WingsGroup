# US-074 — Evidence thực hiện remediation

Ngày thực hiện: 14/09/2026 (Asia/Ho_Chi_Minh).

Đây là evidence của implementation candidate sau lượt sửa R-01 đến R-06 và lượt
port có chọn lọc UI package (WP-9). Candidate được kiểm tra trong workspace hiện
tại. Harness giữ `in_progress`; Plane/customer-facing là `Chờ xác nhận` với
Partial proof. Candidate chưa được đóng thành release SHA sạch và chưa deploy
Production.

## Phạm vi code đã thực hiện

| Finding | Kết quả candidate | Bằng chứng chính |
| --- | --- | --- |
| R-01 Preview locale | Handoff giữ claims path canonical không prefix; redirect thêm prefix cho public locale khác default; host vẫn lấy từ allowlist. | `localPreviewRoute`, `previewHandoffRoute`, `previewHandoff` unit tests; WingsGo `vi→en` và WingSide `en→it` |
| R-02 Site context | Dùng helper route chung cho collection list/create/edit và console, theme, site-review, page-wizard; giữ dirty-form guard và filter site. | `adminSiteContext.unit.spec.ts`, component source review |
| R-03 Title fallback | Fallback source locale được resolve theo default locale của site trong batch; WingSide có thể dùng `en` làm nguồn cho bản `it` thiếu. | `localizationTitlesRoute.unit.spec.ts`, access/site-scope review |
| R-04 Locale status | Có text/ARIA cho từng locale; `loading`, `unknown`, `uncreated` và `error` được phân biệt; lỗi có retry. | `compactDocumentControls.unit.spec.ts`, source assertion và CSS review |
| R-05 Nhãn | Việt hóa `Trang wrapper`, nhãn `generateSlug` và `Domain bổ sung` ở source config; không dùng DOM hack. | collection source assertions |
| R-06 Site Review pagination | `loadCollection` đọc tiếp các page Payload cho tới `hasNextPage`, có guard page tiến triển và giới hạn an toàn. | `siteReviewPagination.unit.spec.ts`, fixture 1.001 record không duplicate |

WP-6 check: Payload v3.84 native Array renderer đã có `Collapse all`/`Show all`
(`toggleCollapseAll`), còn `TourProducts.itineraryDays` đặt `initCollapsed: true`
và dùng `TourItineraryRowLabel` để giữ ngày/title. Page edit guidance đã có
`Tạo trang khác từ preset này`, truyền site/preset sang Wizard mà không reset
draft hiện tại. Phần authenticated UAT (6/14 ngày, reorder/validation focus và
slug conflict) vẫn cần staging fixture; không cần custom DOM control.

Không patch R-07 bằng CSS đoán nguyên nhân. Probe source-contract theo đúng
Payload UI 3.84.1 đã kiểm tra dataset 0/1/10/11/trang cuối và xác nhận khoảng
trắng quanh `general:of` được phát ra từ native PageControls; custom.scss không
override whitespace. Artifact ở [pagination-no-repro.json](./pagination-no-repro.json).
Authenticated browser probe trên dataset thật và owner confirmation vẫn mở.
R-10 cũng chưa được đổi ngầm; candidate vẫn giữ vocabulary 5 trạng thái và chờ
Product/Operations owner phê duyệt.

## Automated verification

Kết quả chạy lại sau khi hợp nhất WP-9 được ghi dưới đây; không dùng các dòng pass
này để ký release Production khi các gate authenticated/canary còn mở.

Các lệnh chạy từ `app/`:

- `pnpm exec vitest run --config ./vitest.unit.config.mts` với 6 file remediation:
  **6 files, 19 tests passed**.
- `pnpm test:unit`: **134 files, 992 tests passed**; gồm contract cho UI package
  và route Page Wizard locale.
- `pnpm test:component`: **26 files, 145 tests passed**; gồm Console task state,
  Site Review checklist và các trạng thái UI liên quan.
- `pnpm test:int`: **exit 0**; full integration inventory ghi nhận **33 files,
  173 tests passed**, 6 file/10 test được skip bởi điều kiện có sẵn của suite.
- `pnpm exec tsc --noEmit`: **pass**.
- `pnpm lint`: **exit 0, 0 errors, 240 warnings**; warning là debt hiện hữu,
  chủ yếu `any`, unused variable và image/accessibility lint.
- `pnpm build`: **pass** trên Next.js `16.2.6`; compile, typecheck, static
  generation, route manifest và postbuild standalone hoàn tất.
- `pnpm generate:types`: **pass**; `pnpm generate:importmap`: **pass**, không có
  import mới cần ghi.
- PostgreSQL migration/upgrade rehearsal của lead triage vẫn giữ evidence tại
  [migration.md](./migration.md); lượt R-01…R-06 không thêm migration mới.

## Applied UI package — kết quả port

Đã port có chọn lọc vào runtime React/SCSS của Payload, gồm design tokens
fallback-first, font stack đa nền tảng, action contrast, rail điều hướng nhóm
`Vận hành/Nội dung/Cấu hình site/Hệ thống`, trạng thái task của Console, checklist
Site Review, chọn site/locale/template của Page Wizard và data landmarks của
Theme Manager. Native Payload collections vẫn giữ trách nhiệm về CRUD, quyền,
locale và publish.

Không đưa static prototype Vanilla DOM vào runtime: không copy `shell()`/
`innerHTML`, không chạy mock data, không ghép các dialog User Invite/Data Import/
Site Identity thiếu backend; các luồng đó cần component/API nghiệp vụ riêng nếu
được đưa vào scope sau. Đây là quyết định tương thích kiến trúc, không phải tuyên
bố mọi màn hình mockup đã trở thành chức năng hoàn chỉnh.

> Bộ admin E2E đã được bổ sung guard an toàn: chỉ đọc credentials/site IDs từ
> fixture pre-provisioned khi `US074_E2E_PREPROVISIONED=true`; thiếu cấu hình thì
> skip trước `beforeAll`. Safety contract **5/5 unit tests pass** và chạy suite
> không fixture cho kết quả **19 skipped**. Không tạo, xóa, đổi tên, reset,
> disable, đổi role, đổi password hoặc đổi site membership của account test/UAT.
> Đây chưa phải authenticated E2E pass; cần fixture staging đã cấp sẵn và QA
> sign-off.

Focused safety contract: **1 file, 5 tests passed**. The no-fixture admin E2E
command completed with **19 skipped** and did not enter account setup/teardown.

## Browser evidence

- Candidate local đã có responsive geometry/read-only proof ở 360, 390, 430, 600,
  679, 680, 681, 768, 820, 1024, 1366, 1440 và 1920px tại
  [responsive.json](./responsive.json). Các ảnh candidate chính: [360px](../../../../../../../app/output/playwright/us074-admin-360-final.png),
  [768px](../../../../../../../app/output/playwright/us074-admin-768-final.png) và
  [1440px](../../../../../../../app/output/playwright/us074-admin-1440-final.png).
- Production `https://wingsgroup.vn/admin` đã được mở bằng `agent-browser` ở
  360px và 1440px. Cả hai viewport đều hiển thị login shell `Đăng nhập CMS`,
  `bodyClientWidth === bodyScrollWidth`, không có client error trong lần kiểm tra.
  Đây chỉ là anonymous entrypoint proof; không phải authenticated CMS/UAT proof.
  Ảnh: [production 360px](../../../../../../../app/output/playwright/us074-production-admin-360-login.png),
  [production 1440px](../../../../../../../app/output/playwright/us074-production-admin-1440-login-after-wait.png).
- Local preview matrix đã chứng minh signed handoff/tenant alias và retry;
  cross-domain child host thật, Safari/iOS và draft preview Production vẫn mở.

### WP-9 anonymous smoke snapshot

Lần kiểm tra bổ sung chỉ mở màn hình chưa đăng nhập tại
`https://wingsgroup.vn/admin` bằng `agent-browser`: viewport 360×800 và
1440×900 đều hiển thị `Đăng nhập CMS`; `bodyClientWidth === bodyScrollWidth`
với lần lượt 360 và 1440, không có alert client-visible. Đây là kiểm tra
entrypoint hiện tại của Production, không phải bằng chứng candidate WP-9 đã
được deploy hay bằng chứng cho các route authenticated.

- [Production 360px snapshot](../../../../../../../artifacts/cms-admin-review-20260914-package-360.png)
- [Production 1440px snapshot](../../../../../../../artifacts/cms-admin-review-20260914-package-1440.png)

## Account, dữ liệu và release safety

- Không có thao tác account nào được thực hiện hoặc cần thiết cho remediation.
- Không submit lead thật, không publish nội dung Production, không ghi Site/domain
  Production và không chạy migration trên Production.
- Chưa có Production deploy, canary, after-state, backup/restore hoặc rollback
  drill. Không được diễn giải browser login shell là bằng chứng deploy thành công.

## Gates còn mở

| Gate | Trạng thái |
| --- | --- |
| R-07 pagination spacing | Partial — source-contract no-repro artifact đã có; authenticated dataset probe và owner confirmation còn mở |
| R-08 Production domain/allowlist/proxy | Open — cần release owner authenticated read-only, approval và after-state |
| R-09 admin E2E | Partial — safety guard đã pass; cần staging fixture/account cấp sẵn và authenticated coverage |
| R-10 lead vocabulary | Open — cần Product/Operations owner chốt 5 hay 6 trạng thái |
| UAT năm use case | Partial — local/unit/integration proof có, staging role/device flow chưa ký |
| Production release | Not started — chưa đủ Gate A/B/C và chưa có canary approval |

Kết luận: remediation candidate đã tiến bộ và có regression proof cho R-01…R-06,
nhưng US-074 vẫn ở `in_progress`; chưa đủ điều kiện chuyển Delivered/Implemented.
