# Exec Plan

## Kế hoạch triển khai chi tiết

Xem [implementation-plan.md](./implementation-plan.md) cho breakdown task,
file liên quan, phụ thuộc, ước lượng, release gates, UAT và lịch đề xuất.
Kế hoạch chi tiết chia công việc thành ba đợt A/B/C, gồm chín WP và sáu
nhóm AC của US-074. Harness hiện giữ trạng thái `in_progress`; Plane hiển thị
`Chờ xác nhận` (Partial proof). Candidate code và
rehearsal đã có, nhưng hoàn tất tài liệu không
đồng nghĩa đã sửa lỗi hoặc đã phát hành.

Follow-up Production release
`us074-admin-shell-followup-r7-20260915T143012Z` đã đóng các blocker về site
selector/side pane, shared rail cho custom views, active menu marker, preview
handoff tenant và compact locale controls; US vẫn chờ stakeholder handover do
các coverage đã waiver.

Ngày bắt đầu được biểu diễn bằng D1 (ngày làm việc đầu tiên khi triển khai).
Các ngày đang hiển thị trong Plane là metadata do importer cũ sinh từ ngày tạo
story và số child; không phải cam kết hoàn thành toàn bộ US trong sáu ngày.

## Goal

Đưa CMS `/admin` về trạng thái có thể vận hành an toàn trên đa viewport và đa
site: không còn mobile blank, preview tenant không 404/nhầm host, locale và
nhãn không che form, domain WingsGo đúng production contract, impact summary
trung thực, và các workflow tour/lead có đủ affordance cho vận hành hàng ngày.

Story này là remediation có kiểm soát cho audit; không phải một đợt redesign
toàn bộ admin và không phải đợt dọn tài khoản production.

## Scope

In scope:

- P0/P1: mobile shell, secure Site Review preview, WingsGo domain/canonical
  normalization và compact locale controls.
- P2/P3: topbar, search, pagination/date, labels, missing-translation fallback,
  theme impact completeness, site context/switcher, itinerary collapse và
  Page Wizard create-another.
- Bounded lead triage: trạng thái kinh doanh, assignee nullable, note/history
  tối thiểu, scoped access và audit-safe behavior.
- Applied UI package compatibility: nhận selective tokens, cross-platform font
  fallback, contrast/fallback hardening và giữ boundary React/Payload; không copy
  raw HTML/Vanilla JS/mock backend vào runtime. Candidate đã port grouped rail,
  Console task state, Site Review checklist, Page Wizard locale flow và Theme
  Manager landmarks. Evidence nằm trong thư mục `evidence/20260914/`.
- Unit/component/integration/E2E/manual proof, PostgreSQL rehearsal nếu có
  migration, production read-only preflight, canary và rollback runbook.
- Documentation và Harness/Plane trace cho từng acceptance criterion.

Out of scope:

- Xóa, disable, reset password, rotate secret, rename, seed, đổi role, đổi site
  relation hoặc bất kỳ xử lý nào khác với user/account hiện hữu local, UAT, test
  hay production. Các account/dữ liệu hiện có là fixture cần bảo toàn.
- Không tạo fixture hoặc dữ liệu tạm trên Production. Local/staging
  non-Production được phép tạo ephemeral account/data phục vụ validation khi
  bật rõ `US074_E2E_FIXTURE_MODE=ephemeral`; teardown phải xóa exact ID đã tạo,
  không được dùng để thay thế hoặc làm sạch fixture hiện hữu.
- Mở public `ja`, `ko`, `fr`, `de`; thay đổi locale public policy hoặc dịch toàn
  bộ catalog.
- CRM pipeline, lead scoring, email/SMS/Slack/ERP/booking/payment integration,
  automatic lead routing hoặc export PII mới.
- Public-site redesign, rewrite Payload admin, thay đổi public content ngoài
  domain/canonical contract đã được duyệt.

## Risk Classification

Risk flags:

- Authorization: preview, tenant scope, site switcher và lead triage access.
- Data model: lead fields/relation và domain config nếu cần migration.
- Audit/security: signed iframe handoff, open redirect, CSP, PII/logging.
- Cross-platform: desktop/tablet/mobile admin shell và browser rendering.
- Existing behavior: Payload-native controls, locale, preview, theme và list
  flows đã có test/user sử dụng.
- Weak proof: hiện có E2E responsive chưa assert positive content width/overlap;
  production domain/iframe cần probe độc lập.
- Multi-domain: sáu site và các preview/canonical host khác nhau.

Hard gates:

- Không được suy yếu site/role authorization để làm UI chạy.
- Không production write nếu chưa có read-only preflight, domain owner approval,
  backup/rollback và exact-scope diff.
- Không có account mutation nào trong migration, seed, teardown hoặc rollout.
- P0 mobile và preview security phải pass trước khi tuyên bố go-live ready.

## Work packages

| Package | Nội dung | Priority | Dependency |
| --- | --- | --- | --- |
| WP-1 | Responsive shell, topbar, search và date/list presentation | P0/P2 | Baseline browser geometry |
| WP-2 | Secure Site Review preview target/handoff và iframe error state | P1 | Preview origin utility, CSP/frame policy |
| WP-3 | WingsGo production domain/canonical/allowlist normalization | P0 khi preflight xác nhận | DNS approval, backup, proxy owner |
| WP-4 | Compact locale controls, locale status/title fallback và translation source | P1/P2 | Locale inventory/policy |
| WP-5 | Theme impact full count và site context/switcher | P1/P2 | Site scope contract, pagination/count endpoint |
| WP-6 | Tour itinerary Collapse/Expand và Page Wizard create-another | P2/P3 | Existing Tour/Page Wizard UI |
| WP-7 | Lead triage schema/access/UI/audit | P2 | Product decision về role update và PostgreSQL migration |
| WP-8 | Full validation, canary, handover và Plane sync | Release gate | WP-1..WP-7 |
| WP-9 | Applied UI package compatibility và accessibility hardening | P2 | WP-1, WP-4 |

## Work Phases

### Phase 0 — Intake and baseline

1. Gắn US-074 vào E02/Core/CMS và ghi risk lane high-risk.
2. Chụp baseline từ audit artifacts, code path và local runtime; đánh dấu finding
   nào confirmed, conditional hoặc chưa reproduce.
3. Chạy production read-only preflight cho WingsGo domain/host/preview nếu có
   quyền quan sát; không ghi dữ liệu.
4. Kiểm tra fixture account/data hiện có để xác nhận chúng được giữ nguyên trong
   test plan. Nếu cần authenticated coverage trên local/staging, tạo ephemeral
   Editor/Site Manager và dữ liệu synthetic theo helper, rồi cleanup exact ID;
   không tạo Super Admin mới và không mutate bản ghi hiện hữu.

### Phase 1 — Contract and design decisions

1. Chốt domain production WingsGo với DNS owner: `wingsgo.vn` theo repo contract
   hoặc giá trị khác nếu có approval bằng văn bản.
2. Chốt role nào được update lead triage; giữ export PII và site scope hiện tại
   nếu chưa có decision mở rộng.
3. Chốt preview contract: same-origin path cho local, allowlisted origin và
   signed handoff cho production/private preview.
4. Chốt admin date/time contract và locale label source; không enable public locale.
5. Chốt theme impact semantics: full page total hay high-impact subset; copy phải
   khớp dữ liệu thực tế.

### Phase 2 — Implement WP-1 to WP-4

1. Sửa parent grid/flow của Payload admin để track không thể về 0px.
2. Tách vùng topbar theo responsive layout và sửa search icon/pagination/date.
3. Đổi collection locale controls sang compact theo matrix; thêm missing-title
   fallback và label source localization. Page Wizard dùng locale theo site và
   gửi locale qua server validation.
4. Bổ sung component/unit assertions trước khi chạy browser suite.

### Phase 3 — Implement WP-2, WP-5 and WP-6

1. Kết nối Site Review với secure preview utility/handoff; thêm loading,
   unavailable, expired và wrong-tenant state cùng checklist scope/preview/
   content/SEO trong phiên.
2. Sửa Theme Manager query/summary để không silent truncate; thêm site-context
   guard và stale response handling.
3. Thêm Collapse/Expand All không mutate content và action create-another không
   reset page hiện tại.

### Phase 4 — Implement WP-3 and WP-7 with gates

1. Rehearse exact WingsGo domain change trên disposable PostgreSQL/staging-shaped
   data; lưu before/after diff.
2. Chỉ sau approval mới apply domain/canonical/preview allowlist theo exact scope;
   verify HTTP/HTTPS, redirect, public route và Site Review.
3. Nếu lead triage được duyệt, tạo additive migration, backfill/default bounded,
   scoped access và audit record; không mở public create thủ công.
4. Chạy rollback rehearsal cho domain và lead schema trước canary.

### Phase 5 — Validation and release

1. Chạy typecheck, lint, unit, component, integration, build và admin E2E.
2. Dùng `agent-browser` kiểm tra đủ viewport, role, theme, site, locale và
   keyboard/touch; lưu screenshot/report đã sanitize.
3. Chạy cross-domain preview matrix và tenant isolation; không submit lead thật.
4. Chạy canary theo một site trước, sau đó mở rộng theo approval; monitor error,
   404/403, iframe, admin blank và lead update failures.

### Phase 6 — Handover and tracking

1. Cập nhật validation evidence, known limitations và rollback steps trong story.
2. Ghi Harness trace và cập nhật trạng thái story theo proof thực tế.
3. Chạy `pnpm run plane:preview` rồi sync work item/child criteria; kiểm tra parent
   dưới đúng Epic E02, dates và child titles có nghĩa.
4. Chỉ chuyển sang implemented/Delivered khi P0/P1, security, migration/domain,
   role isolation và evidence bắt buộc đều pass.

## Stop Conditions

Pause for human confirmation if:

- DNS owner chưa quyết định domain chính thức của WingsGo hoặc domain muốn dùng
  khác `wingsgo.vn` trong repo contract.
- Product owner chưa duyệt role được phép sửa `salesStatus`, `assignedTo` hoặc
  note; không tự mở quyền update cho editor.
- Preview security cần thay đổi CSP, proxy, token audience hoặc public route
  contract ngoài scope hiện tại.
- Có yêu cầu xóa/disable/đổi password/rotate/seed/rename account hiện hữu,
  lifecycle fixture trên Production, hoặc có ý định dùng account khác để che
  fixture thiếu; đây là scope bị cấm của US-074.
- Migration không chạy được trên PostgreSQL production-shaped database, backup
  không restore được, hoặc rollback không trả về before-state.
- Một UX fix cần thay đổi public locale policy, public routing hoặc schema contract
  không được ghi trong story.
- P0 mobile vẫn blank, preview cross-tenant, open redirect, PII log leak hoặc
  authorization regression xuất hiện trong validation.

## Rollback strategy

- CSS/layout: revert release artifact hoặc feature flag admin style; giữ nguyên
  content và database.
- Preview: tắt Site Review target mới, quay về same-origin safe state/explicit
  unavailable; không mở arbitrary origin.
- Domain: khôi phục exact before-state từ backup/config diff, xác nhận canonical,
  HTTPS và proxy trước khi mở lại traffic.
- Lead triage: disable update UI/API theo capability, giữ submission và
  `deliveryStatus`; rollback migration chỉ khi PostgreSQL rehearsal đã chứng minh
  an toàn và không mất dữ liệu.
- Site switcher/itinerary/Wizard: tắt capability hoặc revert component, không
  reset/xóa nội dung đã lưu.
- Account: không có rollback/migration account hiện hữu; ephemeral fixture chỉ
  được cleanup exact ID trên non-Production sau validation.
