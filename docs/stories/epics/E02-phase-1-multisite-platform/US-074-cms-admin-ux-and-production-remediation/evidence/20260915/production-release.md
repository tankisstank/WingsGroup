# US-074 — Production release evidence, 2026-09-15

## Approval and scope

- Người yêu cầu đã chấp thuận thực hiện production domain/preview, backup,
  canary, rollback readiness và lead vocabulary trong lượt 15/09/2026.
- Production CMS: `https://wingsgroup.vn/admin`; target host là
  `168.110.212.116`, Compose project `wingstravel`.
- Không xử lý account theo scope đã chốt. Không tạo fixture, không seed, không
  xóa hoặc sửa lead/content hiện hữu để tạo proof.

## Preflight and exact domain change

- Preflight ban đầu: current release
  `wingsgroup-logo-header-fix-20260915`; app live/ready 200; PostgreSQL và
  Redis healthy.
- `PREVIEW_PUBLIC_ORIGINS` đã có allowlist đúng cho sáu host:
  `wingsgroup.vn`, `wingsgo.vn`, `wingside.vn`,
  `wingspass.wingsgroup.vn`, `wingsplus.vn`, `wingscare.wingsgroup.vn`.
  Không cần sửa environment hoặc reverse-proxy route.
- Exact-scope PostgreSQL update: site `id=2`, `code=wings-go`,
  `wingsgo.local → wingsgo.vn`; preimage match, `UPDATE 1`, after-state active.
  Không có câu lệnh update/delete nào khác trên user, lead hoặc content.

## Backup

- Pre-deploy encrypted age backup:
  `/home/ubuntu/wings-travel/shared/backups/wingstravel-us074-20260915T083216Z.dump.age`
  — SHA-256 `b2d91831e054a47a307f04419e85a9cca95d14bf07573d6b61085a4740bc41be`.
- Post-domain encrypted age backup:
  `/home/ubuntu/wings-travel/shared/backups/wingstravel-us074-postdomain-20260915T085648Z.dump.age`
  — 3,799,981 bytes, SHA-256
  `23918674a306cf31fd4f10a81a6a324b0c4e2950422e1cc7aa3b8a215ba4e504`.
- Mỗi backup có manifest `.json`, mode 600; plain dump tạm đã được dọn đúng
  phạm vi. Không restore vào Production và không cần restore diện rộng.

## Build and canary

- Release artifact cô lập từ Production release, chỉ overlay các file US-074
  còn khác trong workspace dirty: `AdminNavIntro/index.tsx` và
  `payload-types.ts`.
- Release:
  `us074-production-20260915T084456Z`; image label cùng release; build target
  `runner` pass TypeScript, compile, 20/20 static pages và standalone copy.
- Atomic symlink switch và app-only recreate đã chạy với
  `--no-deps --no-build --pull never --force-recreate`.
- Canary: localhost live/ready 200, sáu public host `/api/health/live` 200;
  PostgreSQL/Redis container ID giữ nguyên.
- Preview security: anonymous Site Review 401, anonymous preview 403, invalid
  collection 404. Authenticated Site Review 200; `wing-side` dùng
  `https://wingside.vn`, initializer 200, handoff POST 303, child preview 200.

## Concurrent release handling and final after-state

Sau canary, một release khác
`wingsgo-tour-media-hotfix-f02afc3-r2-20260915T085153Z` đã được triển khai trên
cùng host và chuyển `current`. Không ghi đè release đó. Kiểm tra source của
release đang live khớp các runtime hash US-074 cho `AdminNavIntro`, mobile
`custom.scss`, Site Review route và lead plugin; final image/container health và
preview matrix đều pass trên release này.

Sau đó, theo finding Production về admin shell, release hiện hành được clone
thành `us074-admin-shell-followup-20260915T102900Z` trước khi overlay đúng các
file UI. Release follow-up này đóng ba blocker: site selector bị side pane che,
custom view thiếu side pane và active menu marker màu cam đè chữ. Chi tiết
geometry/browser proof nằm tại
[admin-shell follow-up](./admin-shell-followup.md). Release trước không bị ghi
đè và app-only recreate giữ nguyên PostgreSQL/Redis.

Historical follow-up release/container (superseded by the r7 redeploy below):

- `current`:
  `/home/ubuntu/wings-travel/releases/us074-admin-shell-followup-20260915T102900Z`;
- app image:
  `sha256:4c6e7bb11231f239075fd7f58859ce167b412f1e8af52bd4e178b51e2a0f6300`;
- app container: `cb52be5366de517224f98129239c46371710cb5c5736430958efeea763c41fd1`;
- PostgreSQL container giữ `ab500698a619...`; Redis giữ `b59a6251dcfd...`;
- local live/ready 200, sáu host public 200; authenticated admin-shell browser
  smoke pass ở desktop/tablet/mobile. Preview contract không thay đổi trong
  follow-up và tiếp tục dùng bằng chứng preview của release trước.
- `pnpm run go-live:review` không khởi chạy được vì host agent thiếu
  Playwright Chromium executable; không cài browser mới. Manual `agent-browser`
  Chromium production smoke đã pass ở admin login-shell 390×844 và public
  WingsGroup desktop/mobile, không có page error.

Production DB after-state: 9 users, 152 pages, 79 tour products, 16 posts,
1.061 media, 7 form submissions, 6 sites. Lead metadata vẫn là
`0 sales_status_set / 0 assigned_set / 0 notes_set`; migration
`20260914_090000_cms_admin_lead_triage` đã applied ở batch 21.

## Latest final after-state — r7

The current Production state is now the final isolated overlay on the active
US-075 baseline:

- `current`:
  `/home/ubuntu/wings-travel/releases/us074-admin-shell-followup-r7-20260915T143012Z`;
- app image:
  `sha256:71415baee7e95bc11cdb884f370b18af525ddf0bad31ba7781112f1f18ddb6dc`;
- app container: `3e12d73819be`;
- health: local `live=200`, `ready=200`;
- public health: `wingsgroup.vn`, `wingsgo.vn`, `wingside.vn`,
  `wingspass.wingsgroup.vn`, `wingsplus.vn` and `wingscare.wingsgroup.vn`
  all returned HTTP 200;
- PostgreSQL and Redis container IDs remained unchanged;
- rollback tag:
  `wingstravel-app:rollback-before-us074-admin-shell-followup-r7-20260915T143012Z`
  points to the previous active r6 image
  `sha256:7509c3f710ff471cb1f871d0a20d627409ea5c41d3a7bdbf5ef8c78f2ab49275`.

The release build passed compile, TypeScript, 19/19 static pages and
standalone copy. Browser proof verified the native site switcher, custom-view
rail, tablet/mobile geometry, compact locale controls and Site Review preview
handshake for WingSide (`Preview hoạt động` checked). No account, content,
lead, media, site or database record was changed by the r7 overlay.

## Lead vocabulary

Decision 0035 chốt 5 giá trị: `new`/Mới tiếp nhận,
`contacting`/Đang gọi tư vấn, `won`/Đã chốt, `no_answer`/Không nghe máy,
`lost`/Không phù hợp. Production enum khớp chính xác; không rename, alias hoặc
backfill bảy lead cũ.

## Rollback readiness

- Before-release symlink vẫn tồn tại:
  `/home/ubuntu/wings-travel/releases/wingsgroup-en-trust-hotfix-be53864-20260915T094130Z`.
- Before-follow-up image được giữ bằng tag
  `wingstravel-app:rollback-before-us074-admin-shell-followup-20260915T102900Z`,
  digest
  `sha256:378e8382d1812fc6d7595edba6f690d7b3439a1473ddf6e0badb944088b4c4e7`.
- Before-release image được giữ bằng tag
  `wingstravel-app:rollback-us074-20260915T084456Z`, digest
  `sha256:8aeaf185789bfd9bfed80756d99725eeb7e2505d336de9cf395e02d93ace65d0`.
- Compose config của cả release cũ và release US-074 validate pass; rollback
  exact-scope là restore symlink + retag old app image + recreate riêng `app`
  với `--no-deps`. Không rollback thử trên bản healthy để tránh downtime; không
  restart PostgreSQL/Redis và không drop lead triage columns.

- Latest r7 rollback is exact-scope app-only using the r7 rollback tag above;
  the r6 release remains available at
  `/home/ubuntu/wings-travel/releases/us074-admin-shell-followup-r6-20260915T142600Z`.

## Waived coverage and status

- Authenticated staging thật và Safari/iOS: `waived/unverified` theo yêu cầu,
  không tính là pass.
- Với các gate đã được yêu cầu thực hiện, Production approval, domain correction,
  backup, canary, after-state, rollback readiness và lead vocabulary đã có proof.
  US-074 giữ lifecycle `in_progress` / Plane `Chờ xác nhận` cho tới stakeholder
  handover; proof note không được diễn giải hai coverage waiver thành pass.
