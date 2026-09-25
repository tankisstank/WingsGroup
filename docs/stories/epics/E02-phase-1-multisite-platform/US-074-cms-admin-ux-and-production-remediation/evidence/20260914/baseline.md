# US-074 — Baseline và phạm vi evidence

Ngày evidence: 14/09/2026 (Asia/Ho_Chi_Minh).

## Candidate được kiểm thử

- Base source SHA được dùng để đối chiếu: `43822c525054b8acf0317f34db86bac1384d5dd2`.
- Workspace còn nhiều thay đổi song song (trong đó có US-073); evidence này
  chỉ mô tả candidate US-074 và không coi toàn bộ dirty worktree là một release
  artifact đã được tách branch.
- Next.js `16.2.6`, Payload `3.84.1`, React `19.2.6`, Node `v24.19.0`, pnpm
  `10.28.1`, Vitest `4.1.6`.
- Browser smoke chạy trên Chromium local với SQLite fixture hiện có. PostgreSQL
  rehearsal chạy riêng trên PostgreSQL `16.14` disposable.
- CMS production entrypoint được xác nhận trong trao đổi vận hành là
  `https://wingsgroup.vn/admin`; public origin tương ứng là
  `https://wingsgroup.vn`.
- Anonymous preflight tại entrypoint trả về login shell sau khi client giữ
  cookie bootstrap `payload-lng=vi`; đây là xác nhận path/redirect behavior,
  không phải xác nhận quyền truy cập dữ liệu CMS production.

## Phạm vi và bảo toàn dữ liệu

- Không có production CMS credential trong môi trường chạy; không đọc/ghi
  production database.
- Public host/canonical chỉ được probe read-only. CMS Site record, preview
  allowlist và reverse-proxy config production chưa có nguồn quan sát để xác
  nhận.
- Không xóa, disable, reset password, rotate secret, rename, seed, đổi role,
  đổi site relation hoặc tạo account. Các account local/UAT/test được giữ
  nguyên theo Decision 0034.
- Không submit lead thật, không publish content thật và không thay đổi domain.

## Baseline finding disposition

| Nhóm | Trạng thái trên candidate |
| --- | --- |
| Mobile shell dưới 680px | Đã sửa và có geometry/screenshot proof local |
| Topbar, search, date, locale control | Đã sửa; có browser/unit proof |
| Site Review tenant preview | Đã sửa; local handshake/tenant path pass; production cross-domain còn open |
| WingsGo domain | Public host/canonical pass; CMS/proxy exact config chưa xác nhận |
| Theme impact/site context | Đã sửa và có unit/browser proof |
| Itinerary/Wizard | Đã bổ sung affordance; interaction production-shaped E2E còn open |
| Lead triage | Đã có additive candidate/API/access proof; vocabulary nghiệp vụ còn phải chốt |

## Browser caveat

`agent-browser` không hoàn tất handshake trong runtime local nên phần manual
browser được chạy bằng Playwright CLI Chromium read-only. Đây là fallback cho
local proof, không thay thế Safari/iOS hoặc production cross-domain verification.
