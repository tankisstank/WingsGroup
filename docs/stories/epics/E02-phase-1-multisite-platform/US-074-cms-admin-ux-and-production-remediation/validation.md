# Validation

## Bổ sung theo kế hoạch thực hiện

Áp dụng thêm matrix UAT và gate A/B/C trong
[implementation-plan.md](./implementation-plan.md). Test hình học phải chứng
minh nội dung/control dùng được, không chỉ `width > 0`; thêm biên 679/680/681px.
Preview cross-origin cần test handshake/timeout, không giả định parent đọc được
HTTP status hoặc DOM iframe. Lead cần test field immutability, optimistic
concurrency và dữ liệu lịch sử. Trước khi chạy scripts E2E phải kiểm tra seed/
teardown để bảo toàn account hiện có theo Decision 0034.

Review độc lập `applied-cms-ui-package` là một input của validation, không phải
runtime source. Cần kiểm tra archive SHA/inventory, token fallback-first, font
fallback trên nền tảng không có font Windows, contrast của action/accent text và
fallback của status surface. Prototype mobile/axe result chỉ là evidence đánh
giá package; không được dùng để thay thế proof của Payload `/admin`.

## Proof Strategy

US-074 chỉ được coi là đạt khi vừa sửa đúng finding vừa giữ nguyên các boundary
multisite, locale, role và dữ liệu. Proof phải phân biệt:

1. lỗi đã reproduce và đã sửa;
2. behavior không reproduce trên build hiện tại nhưng đã có regression contract;
3. production config cần owner/DNS approval trước khi write;
4. account/dữ liệu hiện hữu được giữ nguyên; chỉ fixture ephemeral do test tạo
   trên non-Production mới được cleanup theo exact ID.

### Scope waiver

Theo yêu cầu ngày 15/09/2026, authenticated staging và Safari/iOS không được
thực hiện trong lượt này. Đây là `waived/unverified` coverage, không phải bằng
chứng pass. Chrome standalone production-like, unit/component/integration,
typecheck, lint và build vẫn được giữ làm bằng chứng kỹ thuật thay thế trong
phạm vi local/disposable.

P0 mobile và các P1 preview/locale đã pass trước canary. P2/P3 UX và lead triage
đã có proof trong candidate/Production release; hai coverage staging thật và
Safari/iOS được waiver có ghi rõ, không silently bỏ qua.

## Reproduction baseline

Baseline từ audit cần được giữ để đối chiếu, nhưng không được dùng thay cho
post-implementation proof:

| Evidence | Ý nghĩa |
| --- | --- |
| `output/playwright/reassessment-admin-360.png` | Baseline màn hình trắng ở mobile |
| `output/playwright/reassessment-admin-768.png` | Baseline layout tablet |
| `output/playwright/reassessment-admin-1440.png` | Baseline topbar desktop |
| `output/playwright/reassessment-posts-1440.png` | Baseline search/date/list |
| `docs/audits/cms-ui-ux-audit-2026-05-29.md` | Audit lịch sử và các remediation đã có của US-013 |

Các đường dẫn artifact có thể là untracked audit output; khi implementation
hoàn tất phải ghi artifact release mới, viewport, role, theme và dataset.

## Test Plan

| Layer | Cases bắt buộc |
| --- | --- |
| Static | TypeScript, lint, import map nếu có thay đổi component admin; package archive integrity; không sửa generated Payload files thủ công |
| Unit | Grid/layout contract; preview-origin allowlist và handoff expiry; locale label không lặp code; fallback title/status; date formatter; pagination whitespace; theme impact pagination; lead enum/note validation |
| Component | Locale toolbar matrix cho Pages, TourProducts, Posts, TourDepartures, Media; topbar regions; search input icon/padding; Console task checkbox/status; Site Review checklist; itinerary collapse state; Page Wizard locale/create-another state; lead triage controls và error states |
| Integration | Site-scoped preview/API access; cross-tenant rejection; role permissions cho lead triage; PostgreSQL migration apply/status/rollback nếu schema thay đổi; domain config exact-scope diff |
| E2E admin | `/admin`, `/admin/console`, Pages, Posts, Tour Products, Tour Departures, Media, Form Submissions, `/admin/site-review`, `/admin/theme`, `/admin/page-wizard` và một form edit thật; dùng ephemeral fixture trên non-Production local; authenticated staging được waiver |
| E2E responsive | 360, 390, 430, 600, 768, 820, 1024, 1366, 1440 và 1920px; kiểm tra width dương, overflow, bounding-box overlap, touch target và focus |
| E2E locale | `vi`, `en`, `it`, `es`, `pt`, `ja`, `ko`, `fr`, `de` trong admin; bản ghi missing/draft/published; không enable public locale ngoài policy hiện hành |
| E2E preview | WingsGroup và từng child site; path/locale khác nhau; same-origin, cross-domain, expired/invalid handoff, 404/403/timeout và tenant isolation |
| E2E lead | Synthetic submissions trên ít nhất hai site; status transition, assign/unassign, note bound, stale update, forbidden cross-site và export policy; không gửi real lead |
| Accessibility | Keyboard-only, Escape/focus return nếu có popup, accessible name locale chỉ một code, focus ring, zoom 200%, target tối thiểu 44px, status/error announcement, contrast action/accent và package fallback |
| Platform | PostgreSQL 16 production-shaped rehearsal, build standalone, CSP/frame policy, host/HTTPS/canonical/redirect smoke và rollback rehearsal |
| Performance | Không thêm request lặp khi đổi locale/site; impact summary không tải vô hạn; preview response có timeout/loading/error rõ ràng; list search/pagination giữ response time baseline |
| Logs/Audit | Preview/domain/lead changes ghi actor/site/result cần thiết, không ghi token, password, email/phone/free-text PII vào log hoặc screenshot |

## Acceptance matrix

| AC group | Pass condition | Required evidence |
| --- | --- | --- |
| Mobile shell | Nội dung admin visible và không overlap ở mọi viewport | JSON bounding-box report, screenshots 360/768/1440, browser console log |
| Site Review | Đúng preview origin, secure handoff, không 404 cross-domain | API response sample đã redact, HTTP status matrix, iframe screenshot, security test |
| WingsGo domain | Before/after exact diff được approve và host smoke pass | Read-only preflight, approval reference, migration/run log, rollback result |
| Locale | Compact control, status độc lập, no duplicate code, no missing-title ambiguity | Collection matrix, accessible snapshot, screenshots, unit/E2E results |
| Topbar/search/date | Geometry, icon padding, whitespace và `dd/MM/yyyy HH:mm` đúng | Computed-style/box report, locale text assertions, screenshots |
| Theme impact | Full total hoặc subset copy trung thực; không cắt silent ở 100 | API pagination/count fixture >100, UI copy assertion, stale-response test |
| Tour/Wizard | Collapse/Expand và create-another không làm mất dữ liệu | Component/E2E interaction trace, draft before/after diff |
| Lead triage | Status/assignee/note scoped, audit-safe, deliveryStatus không bị lẫn | Migration/schema proof, role matrix, synthetic lead E2E, sanitized audit log |
| Release safety | Build/test/canary/rollback pass, không có action trên account/dữ liệu hiện hữu; ephemeral fixture đã cleanup | CI output, production checklist, fixture after-state và existing-account no-change declaration |
| Applied UI package | Token/font/fallback contract pass; grouped rail, Console task state, Site Review checklist, Wizard locale và Theme landmarks được port vào React/SCSS; không có raw prototype runtime dependency | Archive SHA/inventory, browser review, unit/component contract, no-copy boundary |
| Account/data safety | Không đụng account/dữ liệu hiện hữu; ephemeral fixture chỉ tạo user/data synthetic trên non-Production, cleanup exact ID sau test | Config unit contract, fixture create/cleanup output, baseline/after-state counts, source review setup/teardown |

## Fixtures

- Các user/account và dữ liệu hiện có trong `seedPhase1Launch` hoặc fixture
  PostgreSQL production-shaped phải được giữ nguyên; admin E2E đọc qua biến
  `US074_E2E_*`, không xóa, disable, đổi password, đổi role hay đổi site
  relation của bản ghi hiện hữu trong setup/teardown.
- Trên local hoặc staging non-Production, có thể bật
  `US074_E2E_FIXTURE_MODE=ephemeral`. Helper được phép tạo tạm Editor, Site
  Manager, một page nháp và một lead synthetic; Super Admin dùng lại bootstrap
  credential đã cấu hình, không tạo thêm Super Admin.
- Ephemeral fixture phải được cleanup trong `afterAll`/teardown bằng đúng các
  ID đã tạo (không `deleteMany`), và target Production bị từ chối trước setup.
  Sau cleanup phải đối chiếu lại count/marker để chứng minh account và dữ liệu
  baseline không đổi.
- Sáu site: WingsGroup, WingsGo, WingSide, WingsPass, WingsCare và WingsPlus;
  fixture domain phải phân biệt local, staging và production-approved.
- Một content record có đủ các trạng thái `vi` published, `en` draft và `ja`
  missing; fixture không được suy ra rằng locale admin là public locale.
- Dataset theme có hơn 100 page/impact rows để phát hiện lỗi cắt limit; dùng
  synthetic IDs và không cần import dữ liệu production.
- Synthetic form submissions không chứa tên, email, số điện thoại thật; có ít
  nhất hai site, nhiều status, assigned/unassigned và một concurrent update.
- Preview fixture cho current host, `wingsgo.vn`, `wingside.vn` và các host đã
  được allowlist; có handoff hợp lệ, hết hạn, sai audience và sai site.
- Nếu fixture pre-provisioned bị thiếu, validation có thể dùng ephemeral fixture
  trên non-Production hoặc skip phần authenticated và ghi blocker. Không tạo
  account/dữ liệu tạm trên Production; không xóa account/dữ liệu hiện hữu để bù.
  Safety contract và exact cleanup vẫn phải pass.

## Commands

Chạy từ `app/` sau khi implementation tồn tại; không đánh dấu pass khi command
chỉ chạy một phần hoặc chạy nhầm database:

```text
pnpm exec tsc --noEmit
pnpm lint
pnpm test:unit
pnpm test:component
pnpm test:int
pnpm build
pnpm test:e2e -- tests/e2e/admin.e2e.spec.ts
```

Focused checks nên bổ sung theo file thực tế của implementation, tương đương:

```text
pnpm exec vitest run --config ./vitest.unit.config.mts <US-074-unit-files>
pnpm exec vitest run --config ./vitest.component.config.mts <US-074-component-files>
```

Manual browser proof dùng `agent-browser` theo quy ước repo. Mỗi lần capture
phải ghi URL, viewport, role fixture, site/locale context, theme và artifact
path; không dùng browser session production để submit/save dữ liệu thật.

Production-shaped data/config check phải theo thứ tự: read-only preflight, owner
approval, backup/rollback readiness, canary, apply exact scope, after-state
read-only verify, public/admin smoke. Nếu chỉ được read-only, dừng ở preflight
và ghi gate; không giả vờ hoàn thành domain normalization.

## Failure and rollback gates

- Bất kỳ viewport nào còn width nội dung bằng 0, màn hình trắng, overlap làm mất
  CTA, hoặc horizontal overflow không chủ ý là fail P0/P1.
- Preview origin không nằm trong allowlist, handoff hết hạn vẫn mở, iframe trỏ
  nhầm tenant hoặc có 404 cross-domain chưa giải thích là fail security/P1.
- Domain production chưa có DNS owner approval hoặc before/after diff không exact
  là stop; không sửa `site.domain` theo phỏng đoán.
- Migration lead/domain lỗi hoặc rollback không về đúng before-state là stop;
  không test lại bằng cách xóa dữ liệu hiện hữu. Ephemeral fixture chỉ được xóa
  đúng ID tạm đã ghi nhận trong teardown.
- Không được dùng fixture ephemeral để che lỗi trên Production; target bị chặn
  fail-closed. Nếu staging không cho phép tạo fixture tạm, giữ nguyên dữ liệu và
  ghi blocker để dùng fixture pre-provisioned hoặc owner approval.

## Acceptance Evidence

Trạng thái hiện tại: **Production canary verified** (15/09/2026); Harness
`in_progress`, Plane **Chờ xác nhận / Partial proof**. Authenticated staging và
Safari/iOS đã được waiver theo yêu cầu và vẫn là `unverified`; US chờ
stakeholder handover, chưa chuyển `Đã bàn giao` hoặc `Hoàn tất`.
WP-1 đến WP-7 và WP-9 đã có code/proof local/disposable; WP-8 đã chạy phần static,
unit, component, integration, migration rehearsal và browser manual theo phạm vi
có thể thực hiện mà không ghi production. Lần chạy lại mới nhất đạt unit
**134 files/994 tests**, component **27 files/149 tests**, admin E2E **19/19** trên
Chrome production-like standalone, integration không báo failure, lint **0
error/240 warnings**, type-check pass và build pass. Evidence chi tiết:

Admin shell/preview follow-up đang live trong release
`us074-admin-shell-followup-r7-20260915T143012Z`: site selector không còn bị
rail che, `/admin/theme` và các custom view có shared rail, active menu không
còn marker màu cam đè chữ/nhảy vị trí, Site Review xác nhận preview tenant và
Tour/Posts/Tour Departures/Media dùng compact locale control. Browser proof
Production ở 1440/900/390px và release/rollback details nằm trong
[admin-shell-followup.md](./evidence/20260915/admin-shell-followup.md).

- [remediation run hiện tại](./evidence/20260915/remediation-run.md) — fixture
  ephemeral non-Production, exact cleanup và full admin E2E.
- [Production release](./evidence/20260915/production-release.md) — approval,
  domain correction, encrypted backup, canary, final after-state, preview smoke
  và rollback readiness.

- [baseline](./evidence/20260914/baseline.md) — SHA, runtime, scope và giới hạn
  fixture/account.
- [responsive](./evidence/20260914/responsive.json) — geometry matrix, nav state,
  theme và screenshot sanitized.
- [preview matrix](./evidence/20260914/preview-matrix.md) — Site Review,
  handshake và security result local.
- [domain preflight](./evidence/20260914/domain-preflight.md) — public host/
  canonical probe; CMS/proxy config gate còn mở.
- [locale matrix](./evidence/20260914/locale-matrix.md) — compact control,
  title fallback và label/date/search proof.
- [lead access](./evidence/20260914/lead-access.md) — role/site scope,
  immutable delivery fields và vocabulary gate.
- [migration](./evidence/20260914/migration.md) — PostgreSQL empty-to-head và
  existing-submission upgrade rehearsal.
- [UAT](./evidence/20260914/uat.md) và [release](./evidence/20260914/release.md)
  — use-case coverage, command result và known limitations.
- [remediation run](./evidence/20260914/remediation-run.md) — kết quả chạy lại
  R-01…R-06, browser login-shell smoke và các gate còn mở.
- [applied UI package review](./evidence/20260914/applied-ui-package-review.md) —
  compatibility decision, archive integrity, visual/accessibility review và
  phần hardening đã đưa vào candidate.

Các gate Production domain/preview, backup, canary, after-state, rollback
readiness và lead vocabulary đã pass theo evidence release. Authenticated
staging và Safari/iOS không được thực hiện theo waiver, không được diễn giải là
đã kiểm thử; đây là lý do lifecycle vẫn chờ stakeholder handover. Không có
user/account nào bị xóa, disable, reset, rotate, rename, seed hoặc đổi quyền.

Khi hoàn tất, evidence phải gồm:

- test command output đầy đủ và version/runtime/database;
- responsive bounding-box report và sanitized screenshots;
- Site Review host/locale/status matrix và preview security result;
- WingsGo domain approval, exact diff, canary, after-state và rollback;
- locale/label/date/search/theme/tour/wizard interaction traces;
- PostgreSQL migration/restore proof nếu thêm lead fields;
- role/site access matrix và synthetic lead triage proof;
- explicit declaration: không có user/account hiện hữu nào bị xóa, disable,
  reset, rotate, rename, seed hoặc thay đổi quyền trong quá trình US-074; các
  user/data ephemeral (nếu dùng trên non-Production) đã được cleanup đúng exact
  ID.

## Production re-check — 2026-09-25

- Authenticated read-only review used the saved production `site-manager` profile.
  Dashboard, Console, Theme, Site Review and Page Wizard rendered. The Site
  Review API returned 200 and its tree populated after network idle; preview
  handoff was not re-triggered in this read-only pass. Pages list and page `181`
  edit view loaded without saving or publishing.
- Tour Products, Posts, Tour Departures and Media rendered the nine-locale
  control at 900px. At 1440px with the admin rail open, the site selector sat
  inside the header; at 390px, Console and Page Wizard remained within the
  viewport. The Pages table uses a contained horizontal scroller (812px table
  inside a 390px viewport); document width remained 390px. No browser page
  errors were reported on the checked routes.
- All six production `/api/health/ready` endpoints returned HTTP 200. The r7
  release's authenticated WingSide preview handshake remains supported by the
  2026-09-15 evidence; it was not repeated during this read-only check.
- Production Editor-role UAT was not performed; the available authenticated
  profile was site-manager. Authenticated staging and Safari/iOS remain the
  previously accepted `waived/unverified` coverage. The broad component suite
  currently reports 174/176 tests, with failures in tour authoring and WingSide
  header tests; focused admin Console/navigation checks pass separately.

US-074 stays Harness `in_progress` and Plane `Chờ xác nhận / Partial proof`:
production routes and release health are verified, but the waived coverage and
stakeholder handover remain open.

## Finding reconciliation — 2026-09-25

- Read-only Production inspection of Tour Product `91` found six itinerary rows
  and two enabled native Payload Array actions. Before the copy adjustment,
  their Vietnamese labels were `Ẩn toàn bộ` and `Hiển thị toàn bộ`; the manual
  report searched for Collapse/Expand wording and therefore recorded a false
  absence. The Payload Array field already dispatches its native all-row
  collapse state. The Vietnamese labels are now explicit: `Thu gọn tất cả` and
  `Mở rộng tất cả`. This agent's Production recheck was read-only; the separate
  Page Wizard draft submitted during the user's manual test is recorded below.
- The reported Theme Manager `limit=100` concern is not a current truncation
  defect: `fetchAllPages` follows Payload `hasNextPage`/`nextPage`, and
  `themeManager.unit.spec.ts` verifies all 101 rows are included and a later
  page failure remains an error. A production catalog of 69 pages is below one
  batch but does not demonstrate the cap.
- The manual report only exercised the Production Site Manager. Editor and
  Super Admin Production-role UAT remain unverified; existing local E2E and
  component coverage is not a substitute for those live-role checks.
- The project owner confirmed that the manual Page Wizard test submitted a
  Production draft. Its record ID is pending; this agent did not edit or delete
  that record. Reconcile it by exact ID before claiming the Production test was
  read-only or attempting cleanup.

Focused local proof: `themeManager.unit.spec.ts` passed (3/3) and
`adminOperatorConsole.component.spec.tsx` passed (9/9). The revised Vietnamese
Array labels still require post-deployment UI verification; this change alone
does not close US-074 or change its lifecycle state.

Read-only Plane API verification after scoped sync (2026-09-25): US-074 is in
project `Nền tảng lõi WingsGroup`, parented to `E02 - Nền tảng multisite giai
đoạn 1`, state `Chờ xác nhận`, dates `2026-09-12`–`2026-09-25`. All six child
items are parented to US-074, retain meaningful names and dates, and are in
`Chờ xác nhận`; none use the generic `Tiêu chí chấp nhận <number>` name.
