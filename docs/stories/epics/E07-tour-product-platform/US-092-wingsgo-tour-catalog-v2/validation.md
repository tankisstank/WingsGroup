# Validation — US-092

## Chiến lược bằng chứng

Story chỉ đóng khi mỗi phase có bằng chứng từ code, test và trình duyệt, kèm release review của Codex. Đây là khung validation ở giai đoạn lập kế hoạch; chưa có bằng chứng implementation.

## Tham vấn kiến trúc

### Review kiến trúc độc lập (Claude) — 2026-10-29

Đây là bản review kế hoạch do Claude thực hiện, **không thay thế** cổng tham vấn Codex trong AGENTS.md. Toàn bộ finding đã được đưa vào `design.md` và `execplan.md`.

| Mức | Finding | Xử lý |
|---|---|---|
| P1 | Locale bị rò: section, API và DTO/client mặc định `vi` | Phase 0; mục "Locale" trong design |
| P1 | Thêm key vào hero registry kéo theo migration enum | D1: dùng `WingsGoCommerceHero`, không đụng registry |
| P1 | Các section lấy dữ liệu từ nhiều snapshot khác nhau, gây trùng hoặc lệch card | Mục "Một snapshot cho mỗi request" |
| P1 | Quy tắc featured khi có filter mâu thuẫn với yêu cầu không trùng | D6 và bảng quy tắc hai section |
| P1 | Lệch tháng do timezone; trang detail dùng chung cho mọi site | Mục "Lịch nghiệp vụ" và quy tắc trang detail ở Phase 0 |
| P1 | Chưa có quy tắc giá và ngày khi lọc theo `season` | Mục "Cửa sổ khởi hành" |
| P2 | Badge N ngày và rủi ro dữ liệu cũ | D3: tính trên server, trang giữ dynamic/no-store, có test canh giữ |
| P2 | Chọn ảnh market | D2: seed deterministic, có fallback, log khi chạm trần 200 |
| P2 | CTA liên hệ | D4: lấy từ cấu hình site |
| P2 | SEO cho URL có filter | D9: `noindex, follow` và canonical |
| P2 | Live Simulator lệch với public renderer | Phase 5: dùng chung mapper |
| P3 | Tier 1 của curation chấp nhận curation thiếu `site`; market trên URL chưa có whitelist | Phase 1 |
| P3 | Tiền tố `/en` cho link detail; viền rainbow trên card wide | D7; mục Ràng buộc |
| P3 | Workspace có nhiều thay đổi không liên quan | Phase 0: làm trên worktree/branch riêng |

### Cổng tham vấn Codex (AGENTS.md)

- Trước Phase 1: **Chưa chạy.** Cần chạy và lưu biên bản vào `docs/consultations/`.
- Trước staging/production: **Chưa chạy.**

## Kiểm tra chi tiết theo tiêu chí chấp nhận

Nguồn của 6 tiêu chí chấp nhận là mục `Acceptance Criteria` trong `overview.md`, được đồng bộ sang Plane. Các kiểm tra dưới đây là phần chi tiết:

- AC1 → mục 1
- AC2 → mục 2, 3, 4
- AC3 → mục 5, 6, 11
- AC4 → mục 7, 8
- AC5 → mục 9, 10
- AC6 → mục 12, 13

1. `/en/tour` và API tải thêm ở ngữ cảnh EN không có nhãn tiếng Việt nào, kể cả nhãn giá liên hệ và các chuỗi của client.
2. Hero, Tour nổi bật, Tất cả tour, ô thị trường và Sắp cất cánh lấy từ một snapshot với cùng `now`. Không có card trùng giữa các section đang hiển thị, cả khi có và không có filter, kể cả sau khi tải thêm.
3. Khi không có filter: Hero hiện slot #1–#3, Tour nổi bật hiện slot #4–#6, Tất cả tour loại các tour đó. Khi có filter: Tour nổi bật ẩn, và Tất cả tour chứa mọi tour khớp.
4. Resolver giữ đúng thứ tự Page → mặc định của site → legacy → fallback, chỉ trong phạm vi site. Curation có ít hơn 3 tour vẫn render đúng.
5. `departureMonth` và bốn mùa dùng helper lịch VN, kết hợp AND, mùa đông đúng khi qua năm mới, giá trị không hợp lệ bị bỏ qua.
6. Khi có cửa sổ khởi hành, card dùng departure gần nhất và giá thấp nhất trong cửa sổ, và bộ lọc ngân sách dùng cùng mức giá đó. Khi không có cửa sổ, kết quả trùng US-091.
7. Badge "Khởi hành sau N ngày" lấy từ DTO và đúng ở ranh giới 16:59Z/17:00Z. `/tour` vẫn dynamic và API vẫn `no-store`.
8. Ô thị trường đếm đúng số tour, hiện đúng giá thấp nhất, ảnh ổn định trong ngày và có fallback khi market không có ảnh.
9. Quy tắc giá và promotion của US-083 và badge của US-084 vẫn đúng trên card thường và card wide.
10. Homepage WingsGo giữ nguyên output. WingSide và WingsGroup không đổi gì: API catalog trả rỗng, trang detail không đổi, trừ khi có decision record theo Phase 0.
11. URL có filter có `noindex, follow` và canonical về `/tour` theo locale.
12. Live Simulator dùng chung mapper với public renderer.
13. Bằng chứng trên trình duyệt đạt ở 1440px và 390px, VI và EN: reduced motion, khôi phục khi kết quả rỗng, đổi thứ tự curation thì Hero và grid cập nhật.

## Kế hoạch test

| Tầng | Trường hợp |
|---|---|
| Unit | Locale VI/EN; `toBusinessCalendarDay` với dạng 00:00Z, 12:00Z, 17:00Z và ranh giới 16:59Z/17:00Z; slot #1–#6 và trường hợp ít hơn 3 tour; quy tắc hai section; cửa sổ khởi hành, giá cửa sổ, ngân sách; parser tháng và mùa; tổng hợp market, ảnh deterministic, fallback, trần 200; promotion không tự sinh giảm giá. |
| Integration | Resolver bốn tầng cho `/tour`; một snapshot, không trùng card qua API tải thêm; cô lập site và locale ở API; test canh giữ dynamic/no-store; `/tour` và trang detail cùng tháng; snapshot WingSide không đổi. |
| Component | Hero và card wide với hot, sticker, promo; không có badge thì không có class thừa; chips, khôi phục khi rỗng, giá liên hệ, link detail có `/en`; homepage không hồi quy; Simulator khớp public renderer. |
| E2E | `agent-browser` 1440/390, VI/EN; đổi thứ tự curation trong CMS; từng filter, tháng, bốn mùa; race giữa ô tìm nhanh và chip; reduced motion; bàn phím và focus. |
| Platform | lint, unit, component, integration, build; runbook Oracle ARM64; release review bằng Codex. |

## Fixtures

- Tour WingsGo đủ slot #1–#6, nhiều market, có giá hợp lệ và không hợp lệ, `originalPrice`, `promoLabel`, badge hot/specialized/vip; một curation có ít hơn 3 tour.
- Departure ở ranh giới nửa đêm giờ VN, cả tương lai và quá khứ, trải trên nhiều tháng và qua năm mới; departure không giá để thử trạng thái liên hệ; đủ ba dạng 00:00Z, 12:00Z và 17:00Z ngày trước.
- Inventory chạm trần 200; một market không có ảnh hợp lệ.
- Nhãn VI/EN; hotline và Zalo cấu hình theo site.
- Dữ liệu WingSide/WingsGroup để chứng minh không rò giữa các site.

## Lệnh kiểm tra

```text
cd E:\repo\WingsTravel\app
pnpm run lint
pnpm run test:unit
pnpm run test:component
pnpm run test:int
pnpm run build
```

## Bằng chứng nghiệm thu

| Mục | Kết quả |
|---|---|
| Truy vấn Phase 0: số departure có ngày VN khác ngày UTC, theo site | Chưa có |
| Biên bản tham vấn Codex trước Phase 1 | Chưa có |
| Exit code của các lệnh kiểm tra | Chưa có |
| Ảnh chụp và log trình duyệt | Chưa có |
| Bằng chứng dynamic/no-store | Chưa có |
| Release review bằng Codex | Chưa có |
