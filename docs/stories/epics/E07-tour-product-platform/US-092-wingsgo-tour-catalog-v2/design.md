# Design — US-092

## Ràng buộc

- `WingsGoCatalogCard` là DTO duy nhất cho Hero, ô thị trường, dải "Sắp cất cánh", catalog và Live Simulator. Helper mới chỉ tổng hợp hoặc trình bày DTO này.
- Thay đổi giao diện chỉ áp dụng khi `site.code === 'wings-go'`. Mọi query giữ điều kiện `site`, truyền đúng locale VI/EN, và không làm thay đổi giao diện WingSide/WingsGroup.
- Giữ resolver curation bốn tầng: Page `/tour` → curation mặc định của site → legacy `featuredTours` → fallback thuật toán. Slot #1–#3 dành cho Hero, slot #4–#6 cho section "Tour nổi bật".
- Giá hiển thị qua `PromotionPrice`: chỉ hiện `<del>` khi `originalPrice > price`; `promoLabel` hợp lệ đặt ở góc phải; không tự sinh chip giảm giá. Tour giá liên hệ không tham gia bộ lọc ngân sách, và empty state phải giải thích điều này.
- Badge `hot` dùng `hot-rainbow-card` kèm nhãn sr-only; `specialized`/`vip` là sticker góc trên trái. Radius và pseudo-element phải đồng bộ; card wide không được nhân đôi viền rainbow. Giữ focus ring, vùng chạm 44px và reduced motion.
- Màu và font lấy từ token theme WingsGo; không đổi font.

## Ánh xạ thiết kế → module hiện có → thay đổi

| Phần thiết kế | Module hiện có | Thay đổi |
|---|---|---|
| Header / CTA chuyên viên | Header WingsGo, `RetailTourConsultationDialog`, `SiteContactFab` | Dùng lại luồng hiện có. Zalo OA và hotline lấy từ cấu hình site (US-081), không hard-code. Không thêm WhatsApp/Messenger. |
| Hero | `cmsPage.tsx`, `wingsGoCatalog.ts`, `HighImpact`, `PromotionPrice`, `hot-rainbow-card` | Tạo `WingsGoCommerceHero` trong `heros/`, chọn theo `site.code === 'wings-go'` và route. **Không** thêm key vào `heroPresentationDefinitions`, select `hero.presentation` hay `HeroPresentationPresets.baseTemplate`, nên không có migration enum. Nhận slot #1–#3 từ snapshot catalog; ô tìm nhanh ghi URL params để catalog đọc lại. |
| Sắp cất cánh | `nextDeparture`, `formatTourDate`, sort `next-departure` | Helper server dùng cùng snapshot. "Giá từ" theo US-091. Badge "Khởi hành sau N ngày" lấy từ `daysUntilDeparture` trong DTO. |
| Ô thị trường | `market`, `marketLabels`, `WingsGoTourCard` | Helper server nhóm theo market từ cùng snapshot, đếm số tour và lấy giá thấp nhất hợp lệ. Ảnh chọn deterministic (xem phần dưới). Market trên URL được kiểm tra theo whitelist. Bấm ô sẽ set `?market=`, giữ các filter khác và gọi `window.scrollTo`. |
| Filter chips | `WingsGoTourCatalogClient`, `parseWingsGoCatalogFilters` | Giữ đồng bộ URL, `AbortController` và generation guard. Thêm `departureMonth` và `season`. Chip xóa được từng cái, có nút khôi phục khi kết quả rỗng. |
| Card wide / grid | `WingsGoTourCard`, `CatalogGrid`, `initial.featured` | Thêm `layout="wide"` và dòng thông tin ngày/hãng bay. Áp quy tắc hai section ở phần "Hợp đồng dữ liệu và bộ lọc". Link thẳng tới trang detail, không có quick-view. |
| Cam kết 3 bước | `siteHotlines`, consultation dialog | Copy tĩnh theo locale dùng hotline hiện có; không tạo CMS block mới. |
| Console CMS | `TourCurations`, `FeaturedToursCurationField`, `LiveSimulatorPreview` | Mô tả slot và simulator theo Hero #1, ô phụ #2–#3, grid #4–#6. Simulator dùng chung pure mapper với public renderer. Không đổi schema. |

## Hợp đồng dữ liệu và bộ lọc

### Một snapshot cho mỗi request

Hero, "Tour nổi bật", "Tất cả tour", ô thị trường và "Sắp cất cánh" đều được cắt từ **một** lần gọi `queryWingsGoTourCatalog` với **một** giá trị `now`. Trang `/tour` không gọi thêm `getWingsGoFeaturedTours`. API tải thêm dùng cùng hàm, cùng locale và cùng quy tắc loại trùng. Client loại trùng theo `id` khi nối các trang.

### Quy tắc hai section

| Trạng thái | Hero | Tour nổi bật | Tất cả tour |
|---|---|---|---|
| Không có filter | Slot #1–#3 | Slot #4–#6 | Inventory còn lại, loại mọi tour đã nằm ở Hero hoặc Tour nổi bật (giữ hành vi hiện tại) |
| Có ít nhất một filter (`market`, `durationMin/Max`, `priceMin/Max`, `departureMonth`, `season`) | Chỉ giữ tiêu đề và ô tìm nhanh; ẩn các thẻ tour slot #1–#3 | Ẩn | Mọi tour khớp filter, không loại tour featured |

Khi có filter thì không có card nào bị trùng giữa các section đang hiển thị. Riêng filter `market` sẽ thay đổi hành vi hiện tại: trước đây "Tất cả tour" loại các tour featured, nay không loại nữa. Thay đổi này được ghi nhận có chủ ý.

### Cửa sổ khởi hành

- Một departure **khớp** khi: published, cùng tour, cùng site, ngày khởi hành nằm trong tương lai, và rơi vào cửa sổ đang lọc.
- Cửa sổ là giao (AND) của `departureMonth` và `season`. Nếu không có hai filter này, cửa sổ gồm mọi departure tương lai.
- Tour không có departure khớp sẽ bị loại khỏi kết quả.
- Trên card:
  - `nextDeparture` là departure khớp gần nhất.
  - Giá là giá thấp nhất trong các departure khớp và có giá hợp lệ: không sold-out, verification còn hiệu lực, `priceFrom > 0`. Nếu không có, card hiện giá liên hệ.
- Bộ lọc ngân sách so trên đúng mức giá của cửa sổ đó.
- Khi không có `departureMonth` và `season`, kết quả trùng với hợp đồng US-091.

### Tham số

- `departureMonth` nhận `YYYY-MM`, trong khoảng từ tháng hiện tại đến 24 tháng sau. Giá trị sai định dạng hoặc ngoài khoảng bị bỏ qua.
- `season` nhận `spring` (tháng 3–5), `summer` (6–8), `autumn` (9–11), `winter` (12, 1, 2). Mùa đông đi qua năm mới được xử lý đúng. Giá trị lạ bị bỏ qua.
- Bốn mùa được tính theo tháng của ngày khởi hành, không theo khí hậu của điểm đến. Nhãn UI ghi rõ "theo tháng khởi hành".
- URL có filter dùng `robots: noindex, follow` và canonical về `/tour` (hoặc `/en/tour`).

### Lịch nghiệp vụ

- Helper `toBusinessCalendarDay(date)` quy đổi mọi ngày sang ngày lịch `Asia/Ho_Chi_Minh`. Cách quy đổi này đúng cho cả ba dạng dữ liệu đã biết:
  - `…T00:00:00Z` → cùng ngày
  - `…T12:00:00Z` → cùng ngày
  - `…T17:00:00Z` của ngày hôm trước → ngày kế tiếp
- `departureMonth`, `season` và `daysUntilDeparture` đều dùng helper này.
- `daysUntilDeparture` là số ngày lịch giữa ngày hiện tại và ngày khởi hành theo giờ Việt Nam. Server tính và đưa vào DTO; client chỉ hiển thị. Giá trị 0 hiển thị "Khởi hành hôm nay".
- `/tour` (`force-dynamic`) và API catalog (`no-store`) phải giữ nguyên tính dynamic, vì eligibility và badge đều phụ thuộc vào `now`.
- **Trang detail** (`groupDeparturesByMonth` trong `tours/utils.ts`, đang chia tháng theo UTC) dùng chung cho mọi site. Quy tắc:
  - Phase 0 chạy truy vấn chỉ đọc, đếm theo site số departure có ngày VN khác ngày UTC.
  - Nếu kết quả bằng 0: chuyển `groupDeparturesByMonth` sang helper mới. Thay đổi này không làm khác output, có snapshot test cho WingSide chứng minh.
  - Nếu kết quả lớn hơn 0: đây là thay đổi hành vi trên nhiều site. Giữ trang detail nguyên trạng, ghi decision record và tách story sửa riêng. `/tour` vẫn dùng helper giờ VN, và test đối chiếu `/tour` với trang detail chỉ chạy trên dữ liệu dạng 00:00Z.

### Ảnh ô thị trường

- Seed là `hash(site.id, market, ngày lịch VN)`. Ảnh ổn định trong ngày giữa SSR và tải thêm, và đổi mỗi ngày.
- Tập ảnh để chọn là các tour đủ điều kiện của market, lấy từ toàn bộ snapshot trước khi lọc hay phân trang, và chỉ dùng ảnh đã qua kiểm tra site của `firstMedia`.
- Nếu có thể thì tránh trùng ảnh với Hero slot #1. Nếu không có ảnh nào hợp lệ, dùng ảnh tĩnh của market.
- Không dùng `Math.random` khi render.
- Khi inventory chạm trần `WINGSGO_CATALOG_MAX_INVENTORY` (200), ghi log cảnh báo.

### Locale

Locale được truyền từ page và API xuống query, DTO và client. Mọi nhãn mới của v2 và các nhãn sẵn có đều nằm trong một bảng copy VI/EN, gồm nhãn giá liên hệ trong `buildCard` và các chuỗi lỗi/tải thêm của client. DTO giữ field `price.label` để tương thích ngược, nhưng nội dung đổi theo locale.

## Quyết định

- **D1 — Đã chốt:** Hero là component dùng lại được `WingsGoCommerceHero` trong `heros/`, chọn theo site và route. Không thêm key vào hero registry hay enum của CMS, không migration. Nếu sau này editor cần tự chọn kiểu hero này trong CMS thì tách thành story high-risk riêng có migration.
- **D2 — Đã chốt:** Ảnh market chọn deterministic từ các tour cùng market theo seed site + market + ngày VN. Không thêm schema media.
- **D3 — Đã chốt:** `daysUntilDeparture` được tính trên server theo `Asia/Ho_Chi_Minh` và đưa vào DTO; trang giữ dynamic/no-store; client không tính lại.
- **D4 — Đã chốt:** Chỉ dùng Zalo OA và hotline từ cấu hình site hiện có; không thêm WhatsApp/Messenger cho tới khi có link chính thức.
- **D5 — Đã chốt:** Thêm `departureMonth` và `season` bốn mùa ở server, kết hợp AND theo cửa sổ khởi hành. Card và bộ lọc ngân sách dùng departure và giá trong cửa sổ đó.
- **D6 — Đã chốt:** Giữ hai section. Khi có filter thì ẩn "Tour nổi bật" và các thẻ tour của Hero (Hero chỉ giữ tiêu đề và ô tìm nhanh), còn "Tất cả tour" chứa mọi tour khớp. Bổ sung ngày 2026-10-29 khi review Phase 1: nếu Hero vẫn hiện slot #1–#3 thì sẽ trùng card với "Tất cả tour", vi phạm AC2.
- **D7 — Đã chốt:** Bỏ quick-view, link thẳng tới trang detail (có tiền tố `/en` khi ở locale EN).
- **D8 — Đã chốt:** Giữ font WingsGo hiện tại.
- **D9 — Đã chốt:** URL có filter dùng `noindex, follow` và canonical về `/tour` theo locale.
- **D10 — Đã chốt (2026-10-29, orchestrator, trước Phase 4):** "Sắp cất cánh" là lối tắt điều hướng, không phải danh sách kết quả. Dải lấy tối đa 6 tour sắp khởi hành sớm nhất từ snapshot không lọc, **loại các tour đang ở Hero và "Tour nổi bật"** (slot #1–#6), và **ẩn khi có filter**. Tour trong dải vẫn có thể xuất hiện ở "Tất cả tour"; đây là trùng lặp có chủ ý. Quy tắc "không trùng card" của AC2 áp dụng cho ba section kết quả: Hero, "Tour nổi bật" và "Tất cả tour". Ô thị trường là số liệu tổng hợp, không phải card tour.
- **D11 — Đã chốt (2026-10-30, người dùng, trước deploy production):** Truy vấn chỉ đọc trên production cho thấy 0/49 tour WingsGo có title EN; với quy tắc EN strict ban đầu, `/en/tour` đang hiện 13 card sẽ thành trống. Người dùng chọn fallback: ở EN, tour chưa có title EN hiển thị nội dung tour tiếng Việt, còn giao diện (nhãn, nút, chip, copy) vẫn tiếng Anh. Badge US-084 vẫn lấy từ lần đọc EN strict nên không lọt nhãn tiếng Việt. Homepage EN, vốn đang trống vì cùng nguyên nhân, cũng có lại tour. AC1 hiểu là "không có nhãn giao diện tiếng Việt"; nội dung tour chưa dịch là dữ liệu.

## Phương án đã cân nhắc

1. Section riêng trong `tours/`: ít khả năng dùng lại và gắn chặt Hero vào `/tour`. Loại theo D1.
2. Đăng ký Hero vào hero registry của CMS: cần migration enum ở ba bảng. Loại khỏi phạm vi v2.
3. Cấu hình media riêng cho market: tăng schema và việc vận hành CMS. Loại theo D2.
4. Tính số ngày còn lại trên client: luôn mới nhưng SSR không ổn định và có thể lệch khi hydrate. Loại theo D3.
5. Giữ section featured khi có filter: card bị trùng hoặc biến mất. Loại theo D6.
6. Gộp thành một grid: phá hợp đồng slot #4–#6. Loại theo D6.
