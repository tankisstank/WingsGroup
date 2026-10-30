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

### Review Phase 1A / 1B / 3 / Release

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
