# US-093 — WingsGo Lịch khởi hành v2

## Hành vi hiện tại

Trang `/lich-khoi-hanh` của WingsGo (`TourSchedulePage` trong `StructuredPages.tsx`, client `ScheduleInteractiveDepartures.tsx`) đang có các vấn đề sau:

- Hero ghi "177 đợt • giá từ Liên hệ". Có hai nguyên nhân độc lập:
  - `getLowestPrice` nhận cả 0, số âm và NaN.
  - Hero gọi `formatTourPrice` mà không truyền currency, nên giá thật cũng thành "Liên hệ".
- `getResolvedScheduleData` query `where: {}` với `limit: 200` (Payload 3.84.1 vẫn áp limit khi `pagination: false`), rồi mới lọc đợt tương lai bằng ngày UTC. Khi không còn đợt tương lai, trang quay lại hiện lịch cũ.
- Danh sách bỏ qua `originalPrice`. CTA "Giữ chỗ" chỉ dựa vào `commerceVerified ?? Boolean(availabilityStatus)` mà không xét giá và ngày.
- Bộ lọc hãng bay có nhiều cách viết trùng nhau. Không có bộ lọc thị trường theo `market`, không có chế độ xem theo hành trình, URL không lưu bộ lọc.
- Cột "Ngày về" luôn ghi "Theo lịch bay". Ba thẻ "🔥 … BÁN CHẠY" không có số liệu chứng minh.
- Link CTA gửi ngày bằng `.slice(0,10)` theo UTC. Đợt lưu dạng `…T17:00:00Z` sẽ gửi ngày sớm hơn ngày khách thấy.

## Hành vi mục tiêu

Trang `/lich-khoi-hanh` của `wings-go` được dựng lại theo prototype v2, cùng ngôn ngữ thiết kế với `/tour` (US-092):

- **Hero:** eyebrow, H1 có khoảng năm tính từ dữ liệu, một câu mô tả, 4 số liệu tính từ cùng snapshot, và biểu đồ "Số đợt theo tháng" bấm được để lọc.
- **Thẻ "Đợt nổi bật theo thị trường":** tối đa 3 thẻ ảnh, chọn bằng `getPriorityMarketDeparture`, đã loại đợt sold-out.
- **Thanh lọc dính:** tìm kiếm không dấu, thị trường (`market` thật), hãng bay đã chuẩn hoá, tình trạng, sắp xếp và chế độ xem. Mọi bộ lọc ghi lên URL và đọc lại ngay ở SSR.
- **Chế độ "Theo ngày":** row dạng vé, nhóm theo tháng, 8 đợt mỗi tháng kèm "Xem thêm". Mọi row vẫn có trong HTML ban đầu.
- **Chế độ "Theo hành trình":** gom đợt theo tour, chip ngày dẫn tới CTA của đúng đợt.
- **Giá và ưu đãi:** dùng `PromotionPrice` và `PromotionBadge`. CTA tuân theo helper `canHoldSeat` dùng chung, tính trên server.
- **Liên hệ:** CTA dẫn tới `/lien-he` với ngữ cảnh đợt; ngày khởi hành gửi theo lịch Việt Nam và lead API chấp nhận ngày đó. Kênh liên hệ chỉ gồm Zalo OA và hotline lấy từ cấu hình site.
- **Locale:** `/en` có đủ nhãn tiếng Anh, áp D11 cho tour chưa dịch.
- **SEO:** URL có bộ lọc dùng `noindex, follow`, canonical về `/lich-khoi-hanh` theo locale.

## Quyết định của stakeholder (2026-10-30)

- **Q1 — Link `/lien-he` có ngữ cảnh.** Không làm dialog trên trang.
- **Q2 — Giữ enum `market` hiện có.** Đài Loan, Hồng Kông, Singapore, Dubai… nằm trong `other`, hiển thị "Thị trường khác" / "Other destinations". Không migration.
- **Q3 — Viền cầu vồng chỉ ở thẻ tour (Theo hành trình) và thẻ thị trường.** Row theo ngày có nhãn hot dạng chữ tĩnh, không viền động.

## Acceptance Criteria

1. **AC1 — Dữ liệu đủ và đúng lịch VN.** Trang hiện mọi đợt published, đúng site, từ đầu ngày hôm nay theo `Asia/Ho_Chi_Minh`:
   - Không bị cắt khi số đợt vượt 200.
   - Không hiện lại lịch quá khứ khi không còn đợt tương lai; thay vào đó hiện trạng thái rỗng.
   - Mọi số liệu ở hero, biểu đồ, thẻ và bộ đếm lấy từ một snapshot với một giá trị `now`.
2. **AC2 — Giá và CTA đúng quy tắc thương mại.**
   - Giá trên row là giá của đúng đợt đó, có `<del>` khi `originalPrice > priceFrom`, kèm `promoLabel` và `urgencyLabel`.
   - "Giữ chỗ" chỉ hiện khi `canHoldSeat` đúng; mọi trường hợp khác là "Hỏi giá" với `intent: 'inquiry'`. `ctaLabelOverride` chỉ đổi nhãn.
   - Bấm CTA tới `/lien-he` với `departureId`, `departureDate` (ngày VN), `tourId`, `tourSlug`, `intent`. Lead gửi từ đó được lưu thành công cho cả đợt lưu dạng `00:00Z` và `17:00Z`.
3. **AC3 — Bộ lọc và URL.**
   - `market`, `month`, `airline`, `status`, `q`, `sort`, `view` kết hợp theo AND, ghi lên URL và đọc lại ở SSR. Giá trị lạ bị bỏ qua.
   - Hãng bay được chuẩn hoá chỉ khi hiển thị và lọc.
   - Biểu đồ tháng dùng được bằng bàn phím.
   - Trạng thái rỗng gợi ý bỏ từng bộ lọc, kèm số đợt sẽ hiện.
4. **AC4 — Hai chế độ xem.**
   - "Theo ngày": nhóm theo tháng, 8 đợt mỗi tháng kèm "Xem thêm". Khi sắp theo giá thì không nhóm tháng.
   - "Theo hành trình": "Giá từ" là giá thấp nhất trong các đợt hợp lệ đang hiển thị, kèm `originalPrice`/promo của chính đợt đó. Hiện 6 ngày, kèm "+N ngày khác".
   - Hot và sticker áp theo Q3.
5. **AC5 — SEO, locale và an toàn site.**
   - HTML ban đầu chứa link tới mọi tour có trong snapshot.
   - URL có bộ lọc dùng `noindex, follow` và canonical về `/lich-khoi-hanh` hoặc `/en/lich-khoi-hanh`.
   - `/en` không có nhãn giao diện tiếng Việt.
   - Không có dữ liệu, ảnh hay relation của site khác.
   - Sửa giá, đợt hoặc badge trong CMS sẽ làm mới cả `/lich-khoi-hanh` và `/en/lich-khoi-hanh`.
6. **AC6 — Chất lượng giao diện.**
   - Bám prototype ở 1440 và 390. Riêng 390 và 768 được thiết kế riêng, không chỉ thu nhỏ.
   - Không cuộn ngang tại 360, 390, 430, 600, 768, 820, 1024, 1366, 1440 và 1920.
   - Vùng chạm tối thiểu 44px, có focus ring, tôn trọng reduced motion. Chữ ở trạng thái `sold-out` đạt tương phản 4,5:1.
   - Không có lỗi console.
   - Khi so trên cùng dữ liệu, HTML và Flight payload nhỏ hơn bản cũ. Số đo trước và sau (byte tổng, số row, byte mỗi row) ghi trong `validation.md`.
7. **AC7 — Không hồi quy.** `/tour`, trang chủ, trang thị trường, chi tiết tour WingsGo và các site WingSide, WingsGroup không đổi ngoài ý muốn. Các test được brief liệt kê tiếp tục pass.

Bằng chứng cho từng tiêu chí nằm trong `validation.md`.

## Người dùng bị ảnh hưởng

- Khách WingsGo trên desktop 1440px và mobile 390px, ở cả VI và EN.
- Chuyên viên bán hàng nhận lead có ngữ cảnh đợt.
- Editor WingsGo sửa giá, đợt và badge trong CMS.

## Tài liệu liên quan

- `handoff.md` (brief gốc), `design.md`, `execplan.md`, `validation.md`
- `docs/consultations/2026-10-30-us093-departure-schedule-v2-planning.md`
- `US-092-wingsgo-tour-catalog-v2/design.md` (D3, D4, D7, D9, D11)
- `US-084-wingsgo-editorial-card-badges/overview.md`, `US-083-wingsgo-tour-discount-promotions/overview.md`, `US-077-wingsgo-ux-and-conversion/overview.md`, `US-028-schedule-browse-and-convert-ux.md`

## Ngoài phạm vi

- Không đổi giá, đợt hay dữ liệu CMS và production.
- Không thêm enum `market` hay migration schema (Q2).
- Không làm dialog lead (Q1), booking hay payment.
- Không thêm WhatsApp, Messenger hay bộ lọc theo khoảng giá.
- Không đổi font theme. Không biến header toàn site thành sticky.
- Không sửa giao diện các site khác.
