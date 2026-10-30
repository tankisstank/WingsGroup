# Exec Plan — US-093

## Mục tiêu

Dựng lại `/lich-khoi-hanh` của WingsGo theo prototype v2, dựa trên dữ liệu và quy tắc thương mại có sẵn. Hợp đồng nằm trong `design.md`, tiêu chí nghiệm thu trong `overview.md`.

## Phân loại rủi ro

- **Lane:** `high-risk`. Harness intake `#171`, story `US-093`.
- **Cờ rủi ro:** public contract, existing behavior (lead API, `getLowestPrice`, `getResolvedScheduleData` dùng chung), multisite, SEO, tính dynamic và cache, payload size.
- **Cổng cứng:**
  - Không hard-code tour, giá, số liệu, thị trường hay kênh liên hệ.
  - Không gửi lead thật lên production. Không ghi dữ liệu production.
  - Không đổi output của WingSide/WingsGroup.
  - Không đánh dấu hoàn tất khi chưa có test, build và bằng chứng trình duyệt.

## Mô hình điều phối

- **Worktree:** `E:\repo\WingsTravel-us093`, nhánh `feat/us-093-departure-schedule-v2`, tách từ master `58cbd24`.
- **Vai trò:**
  - Claude (orchestrator) giao từng phase qua herdr, review diff, chạy cổng kiểm tra và ghi `validation.md`.
  - agy (tab `us093-agy`) implement từng phase theo brief `phaseN-brief.md`, mỗi phase một commit.
  - Codex (tab `us093-codex`) tham vấn ở điểm chốt kế hoạch, review cuối Phase 1 và Phase 3, và release review.
- **Báo cáo:** sau mỗi phase, agy ghi `phaseN-report.md` theo mẫu của US-092: file đã sửa, test đã chạy kèm output thật, và những điểm còn mở.
- **Ngưỡng dừng:** agy dừng và báo khi gặp điều kiện dừng (cuối file), không tự mở rộng phạm vi.

## Các phase

### Phase 0 — Baseline và môi trường (orchestrator)

- Cài dependency trong worktree: `pnpm install --frozen-lockfile`.
- Copy (không symlink) `app/.env` và `app/payload-tourplatform.db` từ repo chính sang worktree. DB chỉ dùng local.
- Truy vấn **chỉ đọc** (`mode=ro`) trên DB local, ghi kết quả vào `validation.md`:
  - số đợt tương lai theo site;
  - các cách viết airline DISTINCT theo site và locale;
  - số đợt USD;
  - danh sách title tour thật;
  - phân bố timestamp `00:00Z`, `12:00Z`, `17:00Z`;
  - số đợt có `returnDate` và có `verifiedAt`.
- Đo baseline của `/lich-khoi-hanh` và `/en/lich-khoi-hanh` trên bản cũ: kích thước HTML, kích thước Flight payload, số link tour trong HTML. Chụp ảnh 1440 và 390.
- Chạy baseline `lint`, `test:unit`, `test:component` và ghi lại các lỗi đã có sẵn.

### Phase 1A — Query, scope, locale, DTO và thời gian

**File:** `tours/queries.ts` (`queryCollection`, `normalizeDepartureCard`, `normalizeTourProductCard`); `tours/wingsGoSchedule.ts` (mới: type DTO và `getWingsGoScheduleSnapshot`); `tours/wingsGoScheduleCopy.ts` (mới); `tours/types.ts`; `tours/utils.ts` (chỉ `getLowestPrice`).

**Việc:**
- `queryCollection` nhận thêm `populate`, `select`, `sort`, `page` và `pagination`. Caller cũ giữ nguyên hành vi.
- `normalizeDepartureCard` nhận `now` tuỳ chọn và truyền vào bước kiểm verification (R3).
- `normalizeTourProductCard` nhận `locale` và trả `editorialBadges`/`hasHot` qua `normalizeEditorialBadges`. Sửa `.map(normalizeTourProductCard)` ở `queries.ts:214` thành arrow để index không bị truyền làm locale.
- Viết `getWingsGoScheduleSnapshot({ locale, draft, now, searchParams })` theo mục "Snapshot" và "DTO cho client" trong `design.md`:
  - query published, từ đầu ngày VN, đọc theo trang đến hết;
  - kiểm product (published, cùng site) và media (cùng site, URL hợp lệ, không lọc `_status`) trên dữ liệu thô;
  - fallback locale theo D11, badge lấy từ bản đọc EN strict;
  - dựng `tours`, `rows`, `months`, `markets`, `airlines`, `stats`. Trong 1A, `marketCards` và `initialFilters` mới chỉ là chỗ trống có type;
  - không fallback về lịch quá khứ (D2).
- Sửa `getLowestPrice` để chỉ nhận số hữu hạn và > 0. Không đổi `getResolvedScheduleData` ngoài việc này.

**Test:**
- Unit: `getLowestPrice` (0, NaN, Infinity, danh sách không có giá, currency trộn) ở cả hai caller; ranh giới ngày VN khi `now=2026-10-30T03:00Z` với đợt `2026-10-29T17:00Z`; thời điểm hết hạn xác minh bằng đúng `now`; qua tháng và qua năm; snapshot rỗng; stats (đợt sớm nhất khác đợt rẻ nhất, khoảng năm, thành phố chung).
- Integration (Payload thật, DB copy của worktree):
  - hơn 200 đợt, đọc qua ít nhất hai trang, đúng thứ tự, không trùng;
  - populate lấy được badge, site và media;
  - product draft hoặc khác site bị loại; media khác site thành `null`; media hợp lệ không có `_status` vẫn được giữ; relation dạng id thô hoặc đã bị xoá không làm lỗi;
  - tour EN chưa dịch hiện nội dung VI nhưng không lọt badge VI;
  - trang chủ WingsGo với fixture rỗng, chỉ có quá khứ, và có tương lai cho output không đổi.

**Codex review hợp đồng DTO sau 1A.**

### Phase 1B — Helper dùng chung và tương thích lead

**File:** `tours/utils.ts`, `tours/wingsGoDisplay.ts`, `tours/wingsGoSchedule.ts`, `api/lead-submissions/route.ts`, `getTourInquiryPath`, `StructuredPages.tsx` (chỉ phần `DepartureStrip`).

**Việc:**
- Viết các helper thuần:
  - `canHoldSeat`;
  - `deriveScheduleAvailability` (bảng 5 bước trong `design.md`);
  - `normalizeScheduleAirline`;
  - `parseScheduleFilters` (whitelist);
  - `filterScheduleRows` (AND);
  - `countScheduleFacets` (bỏ chính facet đang đếm);
  - `sortScheduleRows`;
  - `groupScheduleRowsByTour` ("Giá từ" theo quy tắc tiền tệ);
  - `foldVietnameseText`.
- `getPriorityMarketDeparture` nhận `now` tuỳ chọn và dùng lịch VN khi có `now` (R3). Snapshot lọc trước theo `canHoldSeat` rồi điền `marketCards`. Snapshot cũng điền `initialFilters` từ `searchParams`.
- Sửa `getTourRouteTitle` cho mã thời lượng và allowlist từ viết tắt, dựa trên fixture trong `phase0-baseline.md`.
- `DepartureStrip` dùng `canHoldSeat`.
- Lead (D6): link CTA dùng ngày VN. Resolver chấp nhận ngày VN hoặc ngày UTC cũ của chính đợt và lưu ngày VN.

**Test unit:**
- Chuẩn hoá hãng bay với đủ 21 chuỗi trong `phase0-baseline.md` (kết quả mong đợi 11 hãng), cùng hãng lạ và chuỗi khớp nhiều hãng.
- `canHoldSeat`: mọi nhánh.
- `deriveScheduleAvailability`: sold-out không giá, sold-out chưa xác minh, `availabilityBadge` tuỳ chỉnh.
- Lọc AND, facet bỏ chính nó, whitelist URL (giá trị lạ, mảng, tham số lặp), sắp xếp (VND, USD, không giá, bằng nhau thì theo ngày rồi id).
- Selector thị trường không chọn đợt sold-out, và chọn được đợt hôm nay theo lịch VN.
- `getTourRouteTitle` với fixture thật; test hiện có của `getPriorityMarketDeparture` vẫn pass.

**Test lead** (lưu lead thật trên DB copy, không chỉ test URL hay helper):
- ngày VN và ngày UTC cũ cho đợt `00:00Z` và đợt `17:00Z`; cả hai trường hợp đều lưu ngày VN;
- thiếu ngày, thiếu `departureId`, ngày sai, sai `tourId`/slug, khác site, relation đã mất, đợt không tồn tại.

**Codex review hợp đồng public sau 1B.**

### Phase 2 — Hero, biểu đồ, thẻ thị trường

**File:**
- `WingsGoScheduleHero.tsx`, `WingsGoScheduleMonthChart.tsx`, `WingsGoScheduleMarketCards.tsx`;
- nhánh WingsGo trong `TourSchedulePage`;
- `wingsGoScheduleCopy.ts`;
- CSS trong scope `.wingsgo-schedule`.

**Việc:**
- **Hero:** eyebrow, H1 có khoảng năm, câu mô tả có thành phố khi mọi đợt cùng nơi đi, 4 số liệu, dòng cập nhật nếu có `verifiedAt`.
- **Biểu đồ:**
  - mỗi cột là `<button aria-pressed>` có `aria-label` gồm tháng, năm và số đợt;
  - cột có 0 đợt thì `disabled`;
  - có vạch ngăn khi giữa hai tháng có khoảng trống, ghi năm khi đổi năm, có dòng "Cao điểm";
  - trên mobile cột thấp lại và vẫn nằm trong khung.
- **Thẻ thị trường:** tối đa 3 thẻ lấy từ `snapshot.marketCards`. Ảnh là `tour.media`, nếu thiếu thì dùng ảnh fallback. Thẻ có hot/sticker.
- Biểu đồ và thẻ thị trường là **component trình bày**, nhận `counts`, `selected` và `onSelect`. Hàm cuộn dùng `window.scrollTo` (tôn trọng reduced motion) được viết sẵn ở phase này. Phase 3 nối chúng vào `WingsGoScheduleBrowser`. Ở Phase 2, trang render hero đủ với `onSelect` chưa nối, cột hiện tổng số đợt của snapshot.

**Test component:** hero với dữ liệu một năm/hai năm, một/nhiều thành phố; biểu đồ dùng được bằng bàn phím (Tab, Enter/Space, `aria-pressed`, cột 0 đợt `disabled`); thẻ có hot + sticker + promo; thẻ không có badge thì không có class hay khoảng trống thừa; thẻ không có ảnh.

### Phase 3 — Thanh lọc, URL, chế độ Theo ngày, trạng thái rỗng, metadata

**File:**
- `WingsGoScheduleBrowser.tsx`, `WingsGoScheduleFilterBar.tsx`, `WingsGoScheduleDateList.tsx`, `WingsGoScheduleRow.tsx`, `WingsGoScheduleEmpty.tsx`;
- `cmsPage.tsx` (metadata và truyền `searchParams`);
- xoá `ScheduleInteractiveDepartures.tsx` nếu không còn nơi dùng.

**Việc:**
- Thanh lọc sticky `top: 0`: tìm kiếm không dấu có debounce, hãng bay, tình trạng, sắp xếp, chế độ xem, chip thị trường kèm số đợt. Trên mobile thanh lọc gọn, chip cuộn ngang.
- Dòng kết quả: số đợt và số hành trình, chip bộ lọc bỏ được từng cái, nút xoá tất cả.
- Row dạng vé:
  - cuống ngày kèm thứ;
  - tên tour;
  - dòng thông tin gồm mã nơi đi → thị trường, hãng bay, "Về dd/mm" khi có ngày về, nhãn hot dạng chữ (Q3);
  - giá dùng `PromotionPrice`/`PromotionBadge`, kèm `urgencyLabel`;
  - nút "Xem tour" và CTA.
- Nối biểu đồ tháng và thẻ thị trường của Phase 2 vào `WingsGoScheduleBrowser`. Số trên cột và chip đổi theo các bộ lọc khác. Bấm cột lần nữa thì bỏ lọc; bấm thẻ thị trường thì đặt bộ lọc và cuộn tới danh sách.
- Hiện 8 đợt mỗi tháng. Phần còn lại chỉ gắn `hidden` sau khi enhance, theo D8. Khi `sort=price` thì không nhóm tháng.
- Trạng thái rỗng: gợi ý bỏ từng bộ lọc kèm số đợt sẽ hiện, và một lối tới chuyên viên.
- URL: đồng bộ hai chiều, xử lý `popstate`, giữ tham số tracking. Metadata dùng `noindex, follow` và canonical theo D9.

**Test component:**
- Row đủ trạng thái: mở bán, sắp hết chỗ, đã kín, chờ báo giá, có `originalPrice`, `promoLabel`, `urgencyLabel`, `ctaLabelOverride`, tour hot.
- Thu gọn và mở rộng danh sách: render đầu tiên đủ row và không có `hidden`; sau enhance mới có `hidden`; row đang ẩn không nhận focus.
- Trạng thái rỗng và nút khôi phục.
- Bộ lọc ban đầu đọc từ URL ở SSR.
- Bộ lọc kết hợp biểu đồ, thẻ thị trường và thanh lọc trong cùng một browser.

**Test unit:** metadata với `?view=tour`, `?sort=price`, giá trị sai, `utm_*`, và trang EN.

**Codex review cuối phase.**

### Phase 4 — Chế độ Theo hành trình, khối "Trước khi giữ chỗ"

**File:** `WingsGoScheduleTourList.tsx`, `WingsGoScheduleAssurance.tsx`.

**Việc:**
- **Thẻ tour:** `hot-rainbow-card`, sticker, "Giá từ" theo quy tắc tiền tệ. Hiện 6 chip ngày; mỗi chip là link tới CTA của đúng đợt. Có nút "+N ngày khác" mở vùng `hidden`.
- **Khối "Trước khi giữ chỗ":** 3 bước theo locale, hotline lấy từ cấu hình site, Zalo OA, nút "Trao đổi với chuyên viên" dẫn tới `/lien-he` theo locale. Không thêm section tối giữa trang.

**Test component:** gom đợt theo tour, chip ngày, "+N ngày khác", "Giá từ" với nhiều tiền tệ, khối hotline khi có và khi không có cấu hình.

### Phase 5 — QA và bằng chứng (orchestrator)

- Chạy trong `app/`: `pnpm run lint`, `test:unit`, `test:component`, `test:int`, `build`.
- Seed thêm dữ liệu **chỉ trên DB copy của worktree** để có đủ trường hợp: đợt sold-out, đợt không giá, đợt hết hạn xác minh, đợt `17:00Z` và tổng số đợt hơn 200.
- Dùng `agent-browser` ở VI và EN, tại 1440 và 390, kèm ảnh riêng ở 768:
  - lọc rồi tải lại trang bằng URL có tham số; xác nhận bộ lọc đã đúng ngay trong HTML SSR; kiểm tra back/forward;
  - bấm CTA và kiểm tra `/lien-he` nhận đúng `departureId`, `departureDate` (ngày VN) và `intent`;
  - gửi lead local cho cả đợt `00:00Z` và đợt `17:00Z` và kiểm tra lead được lưu với ngày VN;
  - sửa giá hoặc badge trong CMS local, sau đó xoá và unpublish một đợt; kiểm tra cả `/lich-khoi-hanh` lẫn `/en/lich-khoi-hanh` đổi theo;
  - tắt JavaScript: toàn bộ danh sách vẫn hiện;
  - kiểm tra reduced motion, focus (row ẩn không nhận focus) và thao tác bàn phím;
  - kiểm tra không cuộn ngang ở 10 độ rộng và không có lỗi console.
- So tập link tour trong HTML ban đầu với tập tour trong snapshot, ở URL không lọc và URL có lọc.
- Đo HTML, Flight payload và kích thước DTO trên **cùng** dữ liệu cho bản cũ và bản mới, ghi số row và số byte mỗi row. Thêm một mẫu hơn 200 đợt. Yêu cầu giảm byte chỉ áp cho phép so cùng inventory, vì bản mới không còn trần 200.
- Kiểm tra hồi quy: `/tour`, trang chủ, trang thị trường và chi tiết tour của WingsGo; trang lịch, trang chủ và chi tiết tour của WingSide và WingsGroup.
- Cập nhật harness story và sync Plane.
- Release review bằng Codex và phát hành theo runbook Oracle **chỉ khi người dùng yêu cầu**.

## Thứ tự và phụ thuộc

Phase 0 → 1A → Codex review DTO → 1B → Codex review hợp đồng public → 2 → 3 → Codex review → 4 → 5.

Phase 2 và Phase 3 đều phụ thuộc DTO của Phase 1A và helper của Phase 1B. Phase 4 dùng lại row và thanh lọc của Phase 3.

## Điều kiện dừng

Dừng để người dùng chốt nếu gặp một trong các trường hợp sau:

- Cần schema, migration hoặc enum mới.
- Sửa lead API làm thay đổi hợp đồng ngoài phạm vi D6.
- Dữ liệu có timestamp ngoài ba dạng đã biết (`00:00Z`, `12:00Z`, `17:00Z`). Đợt USD và số đợt vượt 1.000 **không** phải điều kiện dừng: hai trường hợp này đã có quy tắc trong `design.md`.
- Phải đổi giao diện `/tour`, trang chủ hay site khác.
- Cần thêm kênh liên hệ chưa được xác nhận.

Thay đổi bất kỳ quyết định D1–D15 nào phải có decision record mới.
