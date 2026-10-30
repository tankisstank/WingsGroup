# Validation — US-093

## Chiến lược bằng chứng

Story chỉ đóng khi:

- mỗi phase có bằng chứng từ code, test và trình duyệt;
- mọi finding P1/P2/P3 của Codex đã được xử lý hoặc có quyết định phạm vi rõ ràng;
- release review của Codex đã chạy.

Hiện đây là khung validation ở giai đoạn lập kế hoạch và **chưa có bằng chứng implementation**.

## Quyết định stakeholder

| Câu hỏi | Quyết định (2026-10-30) |
|---|---|
| Q1 — Form giữ chỗ | Link `/lien-he` có ngữ cảnh, không làm dialog |
| Q2 — Đài Loan, Hồng Kông, Singapore, Dubai | Gộp vào "Thị trường khác" (`other`), không migration |
| Q3 — Viền cầu vồng | Chỉ thẻ tour và thẻ thị trường. Row theo ngày có nhãn hot dạng chữ tĩnh |

Riêng Q3, Codex khuyến nghị không thêm nhãn hot vào row. Stakeholder chọn có nhãn chữ, và quyết định này được giữ. Nhãn không dựa riêng vào màu (D12).

## Cổng tham vấn Codex (AGENTS.md)

### Điểm chốt kế hoạch — 2026-10-30

- **Hình thức:** Codex `GPT-6.1-Sol high`, chạy tương tác qua herdr (tab `us093-codex`), chỉ đọc code.
- **Biên bản:** `docs/consultations/2026-10-30-us093-departure-schedule-v2-planning.md`.

| Mức | Finding | Xử lý |
|---|---|---|
| P1.1 | `limit: 200` cắt đợt; fallback hiện lại lịch quá khứ; lọc bằng `isDeparturePublishable` sẽ mất đợt chờ báo giá | D1, D2; Phase 1 |
| P1.2 | CTA không đồng nhất; dùng ngày UTC nên có thể loại nhầm đợt hôm nay | D3: `canHoldSeat` theo lịch VN; Phase 1 |
| P1.3 | `appendSiteWhere` chỉ scope bản ghi gốc; product/media lồng bên trong chưa được kiểm tra site | Mục Snapshot trong design; test integration ở Phase 1 |
| P1.4 | Lead API từ chối ngày VN khi đợt lưu dạng `17:00Z` | D6; Phase 1. Ghi chú: audit production ngày 2026-10-29 (US-092) cho thấy 323/323 đợt dạng `00:00Z`, nên đây là sửa phòng ngừa cho dữ liệu nhập sau này |
| P2.1 | `defaultPopulate` của TourProducts không có badge, site, `_status` | Populate riêng cho query lịch; Phase 1 |
| P2.2 | Trang lịch chưa áp locale D11 | Mục Snapshot; Phase 1 |
| P2.3 | `getLowestPrice` nhận 0/NaN; hero gọi formatter thiếu currency; `getNextDeparture` ưu tiên giá rẻ thay vì ngày gần | Mục "Giá và tiền tệ" và "Số liệu hero" |
| P2.4 | `getPriorityMarketDeparture` có thể chọn đợt sold-out | Thẻ thị trường loại sold-out trước khi gọi helper. Không đổi helper dùng chung; test hiện có được giữ |
| P2.5 | Metadata chỉ xử lý `/tour`; `searchParams` chưa được truyền xuống trang lịch | D9; Phase 3 |
| P2.6 | Header không sticky; `/tour` chưa có khối 3 bước | D13, D14 |
| P2.7 | Worktree chưa có DB và dependency nên chưa đo được | Phase 0 |
| P3.1 | Chuẩn hoá tên tour (từ viết tắt, mã thời lượng, separator) | Mục "Tên tour" |
| P3.2 | Ngữ nghĩa của số liệu, trạng thái, tiền tệ và thứ tự khi bằng nhau | Bảng trạng thái và mục "Giá và tiền tệ" |
| P3.3 | A11y: row ẩn, biểu đồ, tương phản | Mục SEO và Giao diện; AC6 |
| P3.4 | Prototype có 8 key thị trường; nhãn `other` hiện là "Tuyến khác" | Copy riêng của trang lịch, không đổi hằng số dùng chung |

### Vòng 2 — Review kế hoạch (2026-10-30)

**VERDICT: GO có điều kiện.** Không có P1 mới. Orchestrator đã sửa tài liệu cho cả 7 điểm trước khi giao implementation:

| Finding | Xử lý trong tài liệu |
|---|---|
| R1 (P2) DTO mâu thuẫn, thiếu ảnh và type snapshot | `design.md` mục "DTO cho client" và "Nơi giữ trạng thái bộ lọc": `row.tourId`, `WingsGoScheduleTour.media`, type snapshot đầy đủ. Biểu đồ và thẻ là component trình bày ở Phase 2, nối ở Phase 3 |
| R2 (P2) Đợt sold-out không giá thuộc hai trạng thái | Bảng 5 bước; fixture bắt buộc; governance ưu đãi; bằng nhau thì xếp theo ngày rồi id |
| R3 (P2) Helper dùng UTC và đồng hồ riêng | `now` truyền qua `normalizeDepartureCard` và `getPriorityMarketDeparture` (tham số tuỳ chọn, giữ tương thích); lọc trước theo `canHoldSeat`; test `03:00Z`/`17:00Z` và hết hạn đúng bằng `now` |
| R4 (P2) D2 đổi output dùng chung; hero cũ thiếu currency | D2 chỉ áp cho snapshot trang lịch WingsGo, `getResolvedScheduleData` giữ fallback. Sửa currency cho hero cũ để ngoài phạm vi (route lịch chỉ bật cho WingsGo) |
| R5 (P2) Media không có `_status` | Media chỉ kiểm site và URL; có test integration media hợp lệ không có `_status` |
| R6 (P3) Hai cách mô tả progressive enhancement | Render đầu tiên đủ row, chỉ gắn `hidden` sau enhance; kiểm khi tắt JS; so link theo bộ lọc |
| R7 (P3) Điều kiện dừng và chỉ số payload mâu thuẫn | USD và >1.000 không còn là điều kiện dừng; payload so trên cùng inventory, ghi byte mỗi row |
| D6 bảo mật | Chỉ chấp nhận hai alias tính từ chính đợt; fail closed; giữ chính sách draft hiện tại; ma trận test lead đầy đủ |
| Phase | Tách Phase 1 thành 1A và 1B, mỗi phần có Codex review |

### Phase 1A — Review của orchestrator (2026-10-30)

- **Commit gốc `d53074f` (agy) không được chấp nhận.** Orchestrator ghi 6 lỗi trong `phase1a-fix-brief.md`:
  - F1 (P1): integration test mock Payload;
  - F2: test thống kê không gọi code sản phẩm, chỉ tự kiểm chính nó;
  - F3: kiểm tra site, `_status` và media để lọt (fail-open);
  - F4: query fallback VI của D11 không scope theo site;
  - F5: `locale` chưa truyền tới `normalizeTourProductCard`;
  - F6: dọn dẹp.
- **Commit sửa `5a15e76`.** Orchestrator tự chạy lại và xác nhận:
  - `node scripts/run-integration-tests.mjs tests/int/wingsGoScheduleIntegration.int.spec.ts` → **5/5 pass** trên SQLite tạm, Payload thật. Mock chỉ thay `getCurrentSite`/`appendSiteWhere` để đặt site của request.
  - `vitest --config vitest.unit.config.mts` cho 6 file liên quan (snapshot, snapshot mocked, lowestPrice, priorityMarketDeparture, wingsGoDisplay, tourPublicProjection) → **48/48 pass**.
  - `tsc --noEmit` → 2 lỗi, giữ nguyên baseline.
  - Đã kiểm code: product và media fail closed theo site và `_status` (`wingsGoSchedule.ts:206`, `:578`, `:581`); query VI scope theo site (`:548`); `locale` được truyền qua mọi caller trong `queries.ts`.
  - Theo `phase1a-report.md` (agy tự báo, orchestrator chưa chạy lại): suite unit đầy đủ còn 1 lỗi baseline, component 422/422, lint exit 0.

### Phase 1A — Codex review

- **Biên bản:** `docs/consultations/2026-10-30-us093-phase1a-codex-review.md`. Chạy sau khi quota reset, trên HEAD có cả `158e663`.
- **VERDICT: GO có điều kiện.** Không có P1. Có 4 P2 và 1 P3:
  - P2.1: nhãn `other`;
  - P2.2: `verifiedDay` bỏ sót đợt verified đang `quote`;
  - P2.3: integration chưa chứng minh dedupe/trang 2;
  - P2.4: thiếu test `now` invalid và contract CTA;
  - P3.1: chuẩn hoá media URL.
- Codex chạy lead integration bằng `vitest` trực tiếp nên thiếu `PAYLOAD_SECRET`. Orchestrator chạy lại qua `run-integration-tests.mjs` và pass (xem Phase 1B).
- Tất cả finding được giao trong `phase1-fix-brief.md` (C1–C5).

### Phase 1B — Review của orchestrator (2026-10-30)

- **Commit `158e663` (agy).** Orchestrator tự chạy lại:
  - unit (helpers, snapshot, snapshot mocked, display, priorityMarketDeparture, lowestPrice) → **52/52 pass**;
  - `run-integration-tests.mjs`: `wingsGoLeadCompatibility` 6/6, `leadSubmissionRoute` 21/21, `leadCapture` 3/3, `wingsGoScheduleIntegration` 5/5;
  - `tsc --noEmit` → 2 lỗi baseline.
- **Chưa chấp nhận.** Các finding đã giao trong `phase1-fix-brief.md`:
  - B1 (P1): `route.ts` export `resolveDepartureLeadContext`; Next.js chỉ cho route export handler/config, nên `next build` sẽ hỏng. Chuyển sang module riêng.
  - B2 (P2): test lead gọi resolver rồi tự `payload.create`, chưa đi qua POST thật.
  - B3 (P3): mã hãng bay khớp không phân biệt hoa thường.
  - B4 (P3): allowlist viết tắt upper-case cả từ viết thường.
  - B5 (P3): so id bằng chuỗi.
- Đã kiểm: `/lien-he` và `lead-capture/validation.ts` chỉ yêu cầu `YYYY-MM-DD` hợp lệ, nên đổi sang ngày VN không phá prefill.

### Vòng sửa Phase 1 — commit `349e9c5` (2026-10-30)

Orchestrator tự chạy lại:

- unit liên quan → **60/60 pass**;
- `run-integration-tests.mjs`: `wingsGoLeadCompatibility` 9/9 (gồm 3 test POST thật), `leadSubmissionRoute` 21/21, `leadCapture` 3/3, `wingsGoScheduleIntegration` 5/5;
- `tsc` → 2 lỗi baseline;
- `pnpm run build` do agy chạy, exit 0 (`.next/BUILD_ID` lúc 20:01).

Kết luận: **chấp nhận Phase 1**.

### Phase 1B — Codex review

- **Biên bản:** `docs/consultations/2026-10-30-us093-phase1b-codex-review.md`.
- **VERDICT: GO có điều kiện.** Không có P1. Đã đóng C1–C5 và B1–B5. Codex tự chạy: unit 60/60, integration 38/38, component liên quan 30/30, tsc 2 lỗi baseline.
- Finding mới, giao trong `phase1b-codex-fix-brief.md` (K1–K3), làm sau Phase 2 và trước Phase 3:
  - K1 (P2): helper filter/facet/sort nằm cùng module có import server (`payload`, `next/headers`), nên client không dùng được. Tách sang module thuần.
  - K2 (P2): tìm "Nhật Bản" không ra tour `japan`, vì `searchText` chỉ có enum.
  - K3 (P3): thiếu test CTA cho verification hết hạn và cho override trên row inquiry.
- Phase 2 tiếp tục với DTO hiện tại. agy đã được nhắc chỉ dùng `import type` từ module server trong component client.

### Phase 2 và vòng sửa K1–K3 — Review của orchestrator (2026-10-30)

- **Commit `b29a8d1` (Phase 2) và `4d46710` (K1–K3).** Orchestrator tự chạy lại:
  - component `wingsGoSchedulePhase2` → **17/17 pass**;
  - unit (model boundary, snapshot, helpers, snapshot mocked, display) → **58/58 pass**;
  - `wingsGoScheduleIntegration` → 5/5;
  - tsc → 2 lỗi baseline.
  - `wingsGoScheduleModel.ts` chỉ import `./currency` và `./wingsGoCatalogCopy`, không kéo theo `payload` hay `next/headers`.
- **Ảnh** trong `artifacts/phase2/` (1440 và 390, VI và EN): hero, H1 có năm, biểu đồ có "Cao điểm".
  - Hero ghi "0 đợt mở bán" và "0 đợt có giá" vì DB local có 0 đợt đã xác minh. Đây là hành vi đúng theo bảng trạng thái.
  - Production ngày 2026-10-30: payload có cả `commerceVerified:true` lẫn `false`.
  - Phase 5 phải seed thêm đợt đã xác minh trên DB copy.
- **Chấp nhận.** Hai điểm P3 chuyển sang Phase 3:
  - cột biểu đồ quá nhạt;
  - số liệu hero hard-code font family.

### Phase 3 — Review của orchestrator (2026-10-30)

- **Commit `e018547`.** Orchestrator tự chạy lại: component phase 2 + 3 → 31/31; unit metadata + boundary → 13/13; tsc → 2 lỗi baseline.
- **Theo agy:** curl SSR `/lich-khoi-hanh` có 39 đợt, không có thẻ robots; `?market=korea` có 18 đợt và `noindex, follow`; `/en/...?airline=VJ` có `noindex, follow`. Build exit 0.
- WingsGo không còn gọi `getResolvedScheduleData` cho trang lịch.
- agy chép trùng ảnh ra `artifacts/phase3/` ở gốc repo; orchestrator đã xoá (`9813eba`).
- **Chấp nhận.** Ba điểm P3 giao sang Phase 4: năm lặp ở tiêu đề tháng; số trên chip "Tất cả"; URL chỉ dùng `replaceState`.
- Codex review Phase 2–3 đang trong hàng đợi, chờ quota reset lúc 23:59.

### Phase 4 — Review của orchestrator (2026-10-30)

- **Commit `6692f8c`.** Orchestrator tự chạy lại: component phase 2–4 → 44/44; tsc → 2 lỗi baseline.
- **Ảnh** trong `artifacts/phase4/`: Theo hành trình có viền cầu vồng trên thẻ tour hot, sticker, chip ngày, "Giá từ"; khối "Trước khi giữ chỗ" có hotline và Zalo OA lấy từ cấu hình.
- **Finding, sẽ giao cùng kết quả Codex review Phase 3:**
  - P2: chưa component nào dùng `tour.routeTitle` (`getTourRouteTitle`), nên tên dạng "TOUR HÀN QUỐC 5N4Đ: …" hiện nguyên chữ hoa (handoff mục 3.11). `WingsGoScheduleRow` còn fallback sang `row.searchText`.
  - P3: ảnh lỗi chỉ hiện chữ alt, chưa chuyển sang ảnh fallback.
- Ảnh vỡ là vấn đề dữ liệu local: `public/media` của worktree có 30 file, repo chính có 17.693 file. Phase 5 phải liên kết media trước khi chụp.

### Codex review Phase 2–3 và vòng sửa (2026-10-31)

- **Biên bản:** `docs/consultations/2026-10-30-us093-phase3-codex-review.md`. **GO có điều kiện**, không có P1.
  - 5 P2: giá USD trên thẻ thị trường; `sort=price` mất tháng/năm; tự gán "HAN"; D9 với giá trị rỗng; URL mất hash và parser popstate.
  - 5 P3: cuộn chưa trừ thanh sticky; vạch ngăn tháng trống; nhãn VI ở EN; vùng chạm 44px; gạch giá sold-out.
- Giao cùng O1 (tên tour chưa chuẩn hoá) và O2 (ảnh lỗi) trong `phase34-fix-brief.md`.
- **Commit `ff6c414`.** Orchestrator tự chạy lại: component 58/58, unit 60/60, integration 5/5, tsc 2 lỗi baseline.
  - agy thử junction tới media của repo chính. Turbopack panic ("leaves the filesystem root") nên agy đã gỡ junction.
  - Phase 5 sẽ chép riêng các file hero media cần dùng vào `app/public/media` của worktree (thư mục này bị gitignore).
- **Lỗi còn lại sau khi xem ảnh**, giao trong `phase34-fix2-brief.md`:
  - S1 (P1, AC2): CMS có `ctaLabelOverride` = "Giữ chỗ" trên đợt không giữ chỗ được, nên row hiện "Giữ chỗ" trong khi `intent=inquiry`. Quy tắc mới: override chỉ dùng khi `canHoldSeat`.
  - S2 (P2): mã thời lượng bị viết thường khi dính dấu câu ("6n5đ:").
  - S3 (P2): thanh lọc sticky cao khoảng 280px ở 390px.

### Review Phase 5 / Release

Chưa chạy.

## Baseline (Phase 0)

Chi tiết trong `phase0-baseline.md`. Tóm tắt:

- **Production `/lich-khoi-hanh`:** HTML 779.519 byte, trong đó Flight payload 381.106 byte; 44 link tour duy nhất. Toàn bộ đợt dạng `00:00Z` và VND. Có 21 cách viết hãng bay, chuẩn hoá về 11 hãng.
- **Production `/en/lich-khoi-hanh`:** HTML 690.261 byte, 44 link tour.
- **DB local:** 39 đợt WingsGo published (28 open, 11 limited), 0 đợt có `verified_at`. Không đại diện cho production.
- **Test baseline** (worktree, HEAD `58cbd24`):
  - unit: 1375/1376 pass. Lỗi duy nhất là `wingsGroupV3Shell.unit.spec.ts`, đã có từ US-092;
  - component: 422/422 pass;
  - lint: 0 lỗi.
- Khi chạy, các test sinh lại 4 file snapshot và `payload-types.ts` chỉ khác line-ending (LF/CRLF). Đã hoàn tác. agy phải kiểm `git status` trước khi commit để không đưa các thay đổi này vào commit.

## Ma trận tiêu chí → bằng chứng

| AC | Bằng chứng cần có | Trạng thái |
|---|---|---|
| AC1 | Unit test: query hơn 200 đợt, không hồi sinh lịch quá khứ, ranh giới ngày VN. Integration: populate và scope site. Số liệu snapshot khớp DB local | Chưa có |
| AC2 | Component test: row đủ trạng thái và ưu đãi. Unit test: `canHoldSeat`, lead resolver. Trình duyệt: CTA → `/lien-he` với ngày VN; lead `17:00Z` được lưu | Chưa có |
| AC3 | Unit test: filter, facet, whitelist, hãng bay. Component test: biểu đồ dùng bàn phím, trạng thái rỗng. Trình duyệt: tải lại trang và back/forward | Chưa có |
| AC4 | Component test: thu gọn/mở rộng, "Giá từ", chip ngày, hot/sticker theo Q3 | Chưa có |
| AC5 | So tập link tour trong HTML. Unit test metadata. Trình duyệt `/en`. Test hook revalidate cho cả VI và EN. Sửa CMS local và quan sát trang | Chưa có |
| AC6 | Ảnh 1440/390 (VI và EN) và 768. Kiểm cuộn ngang ở 10 độ rộng, tương phản, reduced motion, console. Payload trước và sau | Chưa có |
| AC7 | Toàn bộ suite pass. Các test brief liệt kê pass. Kiểm hồi quy `/tour`, trang chủ, trang thị trường, chi tiết tour, WingSide, WingsGroup | Chưa có |
