# US-074 remediation run — 2026-09-15

## Scope and safety

- Candidate được kiểm tra trên build standalone local với bản copy của
  `app/payload-brand-staging.db`; không deploy và không ghi Production.
- Admin E2E dùng `US074_E2E_FIXTURE_MODE=ephemeral` trên non-Production. Fixture
  tạo tạm một Editor, một Site Manager, một page draft hero, và một synthetic
  lead; bootstrap Super Admin được dùng lại, không tạo Super Admin mới.
- Teardown xóa đúng các ID đã tạo, không dùng `deleteMany`. Existing account và
  existing data không bị xóa, đổi mật khẩu, đổi role, đổi site hoặc sửa nội
  dung.
- Baseline và after-state của DB copy giống nhau: users 1, pages 85, posts 16,
  tour products 6, media 34, form submissions 0, sites 6, forms 6, theme
  presets 9 và hero presentation presets 8; không còn marker `us074-ephemeral`.

## Changes verified

- Mobile admin shell giữ content width dương, không horizontal overflow; responsive
  triage navigation và touch/focus contract chạy qua các viewport 360–1920px.
- Label navigation được chuẩn hóa thành `Rà soát site`; assertion dùng text
  case-insensitive để không phụ thuộc `text-transform: uppercase` của theme.
- Hero fixture dùng preset `gradient-mesh` hiện hữu và bắt đầu ở `override`, sau
  đó chuyển sang `inherit`, chứng minh đúng nguồn áp dụng và không làm mất dữ
  liệu.
- Hook revalidation bỏ qua autosave draft trong admin create render; route tạo
  page/tour không còn gọi `revalidatePath` trong lúc render.
- Site Review preview tiếp tục fail-closed khi chưa cấu hình destination:
  standalone local trả `503 Preview destination is not configured for this site`;
  dev preview có destination allowlist trả `200` và handshake hoàn tất.

## Production read-only preflight

- Target xác nhận: `instance-20260604-2317` (`168.110.212.116`), Compose project
  `wingstravel`, release path `/home/ubuntu/wings-travel/current`.
- Release đang chạy là `wingsgroup-logo-header-fix-20260915`; đây không phải
  release US-074. App `/api/health/live` và `/api/health/ready` đều trả `200`.
- PostgreSQL và Redis đang healthy; không restart container, không ghi DB và
  không thay đổi domain/configuration trong preflight này.
- Workspace còn thay đổi chưa commit ngoài US-074; vì vậy artifact Production
  được tạo cô lập từ release đang chạy và chỉ overlay file runtime US-074 cần
  thiết, không lấy toàn bộ dirty worktree.

## Validation result

| Check | Result |
| --- | --- |
| TypeScript | Pass |
| Lint | Pass, 0 error / 240 warnings |
| Unit | Pass, 134 files / 994 tests |
| Component | Pass, 27 files / 149 tests |
| Integration | Completed without reported failure |
| Next standalone build | Pass: compile, TypeScript, 20/20 static pages, standalone copy |
| Admin E2E | Pass, 19/19 tests, 1 worker, Chrome 151 |
| Exact fixture cleanup | Pass; DB copy returned to baseline counts |
| Real staging `100.90.228.19:8088` | Unreachable; authenticated staging proof remains open |

## Scope waiver

Theo yêu cầu ngày 15/09/2026, authenticated staging và Safari/iOS validation
được bỏ qua trong lượt này. Hai hạng mục là `waived/unverified`, không phải
pass. Chrome standalone production-like và các kiểm thử local/disposable ở trên
là bằng chứng thay thế trong phạm vi đã thực hiện.

## Production gate result

Các gate Production đã đóng trong lượt này: owner approval theo yêu cầu deploy,
exact domain after-state, preview allowlist/tenant handoff, encrypted backup,
app-only canary, post-canary health/public/preview smoke và rollback readiness.
Chi tiết cùng checksum nằm tại
[production-release.md](./production-release.md).

### Follow-up Production admin shell

Sau khi nhận phản hồi trực tiếp trên `wingsgroup.vn/admin`, đã bổ sung một
release UI-only để sửa site selector bị che khi mở side pane, khôi phục rail cho
`/admin/theme` và các custom view, đồng thời bỏ active marker màu cam gây đè chữ/
nhảy menu. Local targeted unit **11/11**, Console component **9/9**,
TypeScript/lint pass và `next build` exit 0. Production browser proof đã kiểm
tra 1440px, 900px và 390px; health live/ready cùng sáu public host đều HTTP 200.
Không restart PostgreSQL/Redis và không thay đổi account hoặc dữ liệu.

Chi tiết release, image digest, rollback tag, computed geometry và artifact
screenshots: [admin-shell-followup.md](./admin-shell-followup.md).

### Latest Production redeploy — r7

After the first UI-only overlay was superseded by US-075, the active baseline
was cloned and US-074 was redeployed as
`us074-admin-shell-followup-r7-20260915T143012Z`. The final image is
`sha256:71415baee7e95bc11cdb884f370b18af525ddf0bad31ba7781112f1f18ddb6dc`;
local live/ready and all six public health endpoints returned HTTP 200.
Post-deploy Chrome proof verified the Site Review tenant API, successful
WingSide cross-domain preview handshake, compact locale controls, shared
Theme/Console/Site Review/Page Wizard rail, desktop active-menu geometry,
900px no-overlap and 390px non-zero layout. The previous r6 image is retained
under the exact rollback tag documented in
[production-release.md](./production-release.md). PostgreSQL, Redis, accounts
and existing data were left unchanged.

Staging thật và Safari/iOS được miễn theo [scope waiver](./scope-waiver.md),
nhưng vẫn giữ `waived/unverified` trong handover. Không tạo fixture hoặc sửa
dữ liệu tạm trên Production.

## Tracking verification

- Harness: `US-074 = in_progress`, unit/integration/E2E/platform pass; lifecycle
  chưa đóng vì staging/Safari coverage waiver và stakeholder handover.
- Plane sync scoped US-074: `patchedCount: 7`, `missingCount: 0`.
- Plane API xác nhận parent US-074 nằm trong Epic E02 của project Nền tảng lõi
  WingsGroup, có 6 child task; parent và child đều có `start_date`/
  `target_date`, state hiện tại là `Chờ xác nhận`; không có child tên dạng
  `Tiêu chí chấp nhận <number>`.
