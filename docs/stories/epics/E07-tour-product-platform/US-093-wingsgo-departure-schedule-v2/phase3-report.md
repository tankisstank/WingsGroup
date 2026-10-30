# US-093 Phase 3 — Execution Report

## 1. Tóm tắt

Phase 3 của US-093 (WingsGo Departure Schedule v2 — Trình duyệt lịch client root, thanh lọc, trạng thái URL, danh sách theo ngày, trạng thái rỗng và metadata SSR) đã được hoàn thành trên worktree `E:\repo\WingsTravel-us093`, nhánh `feat/us-093-departure-schedule-v2`.

Toàn bộ các yêu cầu của `phase3-brief.md`, `design.md` và `execplan.md` cho Phase 3 đã được thực hiện:
- **`WingsGoScheduleBrowser.tsx` (Client root component):**
  - Quản lý state bộ lọc (`ScheduleFilterState`) khởi tạo từ `initialFilters` của snapshot server.
  - Sử dụng các hàm tính toán thuần túy (`filterScheduleRows`, `countScheduleFacets`, `sortScheduleRows`) từ `wingsGoScheduleModel.ts`.
  - Kết nối biểu đồ tháng (`WingsGoScheduleMonthChart`) và thẻ thị trường (`WingsGoScheduleMarketCards`) của Phase 2: số liệu facet cập nhật linh hoạt theo các bộ lọc khác (loại trừ chính chiều đang đếm); nhấp cột tháng lần hai sẽ bỏ lọc tháng; nhấp thẻ thị trường sẽ đặt `market` và cuộn mượt tới danh sách đợt.
  - Hiển thị dòng kết quả gồm số đợt, số hành trình, các chip bộ lọc đang hoạt động (có thể xoá từng chip) và nút "Xoá tất cả bộ lọc".
- **`WingsGoScheduleFilterBar.tsx` (Sticky filter bar):**
  - Cố định ở `top: 0` (`z-30`) ngay khi cuộn tới danh sách, có viền bóng và nền blur.
  - Ô tìm kiếm không dấu với debounce 250ms (hỗ trợ nhập tiếng Việt / tiếng Anh).
  - Các ô chọn hãng hàng không, tình trạng chỗ, sắp xếp (ngày gần nhất, giá thấp nhất — đợt không giá xếp cuối).
  - Bộ chuyển chế độ xem (Theo ngày / Theo hành trình; nút "Theo hành trình" đặt `view=tour` và tạm hiển thị danh sách theo ngày chờ Phase 4).
  - Dải chip thị trường cuộn ngang độc lập trong khung container (`overflow-x-auto`), hiển thị số đợt tương ứng theo facet.
- **`WingsGoScheduleRow.tsx` (Dạng vé khởi hành):**
  - Cuống ngày hiển thị số ngày cỡ lớn và thứ rút gọn xác định (sử dụng business calendar VN/EN qua `getScheduleWeekdayAbbr`, không dùng `toLocaleDateString` tránh lệch múi giờ).
  - Đường bay và hãng bay chuẩn hoá: mã nơi đi → nhãn thị trường, hãng hàng không, ngày về ("Về dd/mm") chỉ hiện khi có ngày về thực tế.
  - **Q3 (Accessibility & Tour Hot):** Tour hot hiển thị nhãn chữ tĩnh "Tour hot" / "Hot tour" rõ ràng (không dùng hiệu ứng viền cầu vồng `hot-rainbow-card`, không phụ thuộc vào màu sắc).
  - Giá và khuyến mãi: tích hợp `PromotionPrice` (hiển thị `<del>` khi có giá gốc), `PromotionBadge` cho `promoLabel`, kèm nhãn khẩn cấp `urgencyLabel`.
  - Nhãn tình trạng chỗ chuẩn hoá theo bảng trạng thái (`open`, `almostFull`, `soldOut`, `requestPrice`). Màu chữ trạng thái hết chỗ đạt độ tương phản tối thiểu 4.5:1.
  - Nút hành động CTA: sử dụng `row.ctaHref` và `row.ctaLabel` thông qua `SiteLink` để tự động xử lý tiền tố locale (`/en`).
- **`WingsGoScheduleDateList.tsx` (Danh sách theo ngày & Hợp đồng Hydration D8):**
  - Khi `sort=date`: nhóm theo tháng (`monthKey`), hiển thị tối đa 8 đợt ban đầu của mỗi tháng.
  - Khi `sort=price`: hiển thị danh sách phẳng liên tục, đợt không có giá được đẩy xuống cuối cùng.
  - **D8 Hydration Contract:** SSR và lần render đầu tiên ở client render **toàn bộ mọi row** khớp bộ lọc mà không có thuộc tính `hidden`. Sau khi mount (`useEffect` kích hoạt `enhanced = true`), các hàng từ thứ 9 trở đi mới được gán `hidden={!expandedMonths[monthKey]}`, kèm nút "Xem thêm" / "Thu gọn" có đầy đủ `aria-expanded` và `aria-controls`. Hoàn toàn không dùng `.slice(0, 8)` ở SSR và không dùng `<noscript>`.
- **`WingsGoScheduleEmpty.tsx` (Trạng thái rỗng):**
  - Xử lý 2 tình huống:
    1. Snapshot rỗng (toàn hệ thống chưa có đợt): hiển thị thông báo riêng, không hiển thị dữ liệu quá khứ.
    2. Rỗng do bộ lọc: hiển thị các nút gỡ bỏ từng bộ lọc kèm số đợt chính xác sẽ xuất hiện nếu gỡ bộ lọc đó, cùng nút CTA dẫn tới chuyên viên tư vấn (`/lien-he` theo locale).
- **Đồng bộ trạng thái URL 2 chiều (D9):**
  - Quản lý whitelist tham số: `market, month, airline, status, q, sort, view`.
  - Đồng bộ URL client-side bằng `history.replaceState` (và `pushState` khi chọn thị trường), bắt sự kiện `popstate` khi người dùng back/forward trình duyệt.
  - Bảo tồn toàn bộ tracking params (`utm_*`, `gclid`, v.v.) và các tham số ngoài whitelist.
  - Tự động lược bỏ các tham số khi giá trị trùng với mặc định (`status=all`, `sort=date`, `view=date`).
- **Tối ưu SEO & Metadata (`cmsPage.tsx`):**
  - Chuyển `searchParams` trực tiếp vào `getWingsGoScheduleSnapshot` để SSR sinh ra markup chính xác ngay từ lần render đầu tiên.
  - Thêm thẻ `<meta name="robots" content="noindex, follow"/>` khi URL chứa bất kỳ tham số whitelist nào (kể cả giá trị không hợp lệ), loại trừ các tham số tracking `utm_*`.
  - Thẻ `canonical` luôn trỏ sạch về URL gốc: `https://wingsgo.vn/lich-khoi-hanh` (hoặc `/en/lich-khoi-hanh`).
- **Gỡ bỏ đường cũ cho WingsGo:**
  - Trang lịch WingsGo không còn gọi `getResolvedScheduleData` (loại bỏ query thừa).
  - Không còn render `DepartureStrip` và `ScheduleInteractiveDepartures` trong nhánh WingsGo của `TourSchedulePage`.
  - Khối liên hệ CTA cuối trang (Zalo OA + Hotline từ cấu hình site) được giữ nguyên vẹn.
- **Hoàn thiện 2 điểm nhỏ từ Phase 2:**
  - Cột biểu đồ tháng trong `WingsGoScheduleMonthChart.tsx` sử dụng nền trung tính đậm `bg-[var(--surface-strong,oklch(80%_0.02_235))]` rõ nét trên nền thẻ.
  - Số liệu thống kê trong `WingsGoScheduleHero.tsx` sử dụng class typography `.wingsgo-display`.

---

## 2. File đã sửa và tạo mới

### Mã nguồn ứng dụng
1. `app/src/tours/WingsGoScheduleBrowser.tsx` (tạo mới) — Client root component kết nối bộ lọc, state, URL sync, Hero, MonthChart, MarketCards, FilterBar, DateList và Empty state.
2. `app/src/tours/WingsGoScheduleFilterBar.tsx` (tạo mới) — Sticky filter bar gồm search debounced, selects, view toggle và market chips.
3. `app/src/tours/WingsGoScheduleRow.tsx` (tạo mới) — Dạng vé khởi hành với cuống ngày, thông tin chặng bay, tour hot badge, giá khuyến mại và CTA.
4. `app/src/tours/WingsGoScheduleDateList.tsx` (tạo mới) — Danh sách đợt khởi hành theo tháng hoặc giá, tuân thủ D8 hydration contract.
5. `app/src/tours/WingsGoScheduleEmpty.tsx` (tạo mới) — Component trạng thái rỗng kèm gợi ý gỡ bỏ bộ lọc và số lượng đợt hoàn trả.
6. `app/src/tours/WingsGoScheduleHero.tsx` (sửa đổi) — Cập nhật các bộ đếm số liệu sang class `.wingsgo-display`.
7. `app/src/tours/WingsGoScheduleMonthChart.tsx` (sửa đổi) — Đổi màu nền cột sang token `--surface-strong`.
8. `app/src/tours/wingsGoScheduleCopy.ts` (sửa đổi) — Bổ sung đầy đủ nhãn văn bản tiếng Việt và tiếng Anh cho Phase 3.
9. `app/src/tours/wingsGoScheduleModel.ts` (sửa đổi) — Thêm helper `getScheduleWeekdayAbbr` cho thứ rút gọn.
10. `app/src/app/(frontend)/cmsPage.tsx` (sửa đổi) — Tiếp nhận `searchParams`, cấu hình robots `noindex, follow` khi có filter params, bỏ query `getResolvedScheduleData` cho WingsGo.
11. `app/src/tours/StructuredPages.tsx` (sửa đổi) — Tích hợp `WingsGoScheduleBrowser` vào nhánh WingsGo của `TourSchedulePage`, tách riêng legacy logic.
12. `app/src/app/(frontend)/globals.css` (sửa đổi) — Bổ sung CSS cho vết khuyết cuống vé (`.wingsgo-schedule-stub`), ẩn thanh cuộn chip và màu sắc contrast cho vé hết chỗ.

### File kiểm thử
13. `app/tests/component/wingsGoSchedulePhase3.component.spec.tsx` (tạo mới) — 14 test component kiểm tra row states, D8 hydration contract, empty state relaxation, initial filters, biểu đồ và EN copy.
14. `app/tests/unit/wingsGoScheduleMetadata.unit.spec.ts` (tạo mới) — 12 test unit kiểm tra whitelist params, metadata robots `noindex, follow`, tracking params và canonical URL.

---

## 3. Quyết định kỹ thuật nhỏ

1. **Tuân thủ hợp đồng Hydration D8 (Zero Flash of Missing Rows):**
   - Không sử dụng `.slice(0, 8)` trong quá trình render trên server (SSR). Toàn bộ danh sách hàng được render ra HTML để bot SEO và người dùng không bật JavaScript có thể tiếp cận trọn vẹn.
   - Sử dụng cờ `enhanced` trong `useEffect` để chỉ áp dụng thuộc tính `hidden` và nút "Xem thêm" sau khi hydration hoàn tất trên trình duyệt người dùng.
2. **Loại bỏ Rainbow Card cho Tour Hot trong Vé Khởi Hành (Q3 Accessibility):**
   - Trong `WingsGoScheduleRow`, tour hot được thể hiện bằng nhãn chữ tĩnh rõ ràng ("Tour hot" / "Hot tour") kèm huy hiệu icon lửa nhỏ, không áp dụng class `hot-rainbow-card` nhằm tránh rối mắt trong danh sách bảng và đảm bảo người dùng suy giảm thị lực nhận biết được mà không dựa vào màu sắc.
3. **Phân tách ranh giới module (Clean Bundle Boundary):**
   - `WingsGoScheduleBrowser` và toàn bộ các sub-component client chỉ import các hàm thuần từ `wingsGoScheduleModel.ts` và `wingsGoScheduleCopy.ts`. Không có bất kỳ import runtime nào từ `wingsGoSchedule.ts`, Payload hay `next/headers`.
4. **Xử lý URL State an toàn:**
   - Dùng `history.replaceState` cho các tương tác lọc/sắp xếp thông thường để không làm phình lịch sử duyệt web của người dùng; chỉ dùng `history.pushState` khi người dùng chuyển hẳn thị trường lớn.
   - Tôn trọng và giữ nguyên tất cả các tham số marketing/tracking (`utm_*`, `gclid`, `fbclid`) trong chuỗi query string.

---

## 4. Kết quả chạy cổng kiểm tra thực tế

### 4.1 TypeScript (`tsc --noEmit`)
```powershell
pnpm --dir app exec tsc --noEmit
```
**Kết quả:** Exit code 1 với đúng 2 lỗi baseline pre-existing tại `wingsGroupCorporateRoutes.unit.spec.ts`:
- `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(116,21): error TS2353: Object literal may only specify known properties, and 'type' does not exist in type '{ richText?: unknown; }'.`
- `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(155,9): error TS2322: Type '"lo"' is not assignable to type '"en" | "vi" | "it" | "es" | "pt" | "ja" | "ko" | "fr" | "de" | null | undefined'.`
Tất cả các file của Phase 3 và hệ thống WingsGo có **0 lỗi TypeScript**.

### 4.2 ESLint
```powershell
pnpm --dir app run lint
```
**Kết quả:** Exit code 0 (0 errors, 469 warnings pre-existing trong repo).

### 4.3 Component Tests
```powershell
pnpm --dir app run test:component
```
**Kết quả:** 65/65 test files passed, 453/453 tests passed (100%):
```
 ✓ tests/component/wingsGoSchedulePhase3.component.spec.tsx (14 tests) 538ms
   - WingsGoScheduleRow: open, almost-full, sold-out, request-price, promo prices, hot tour badge (no rainbow card)
   - WingsGoScheduleDateList (D8): renders all matching rows without hidden on initial SSR/render, applies hidden after enhanced, expands on toggle
   - WingsGoScheduleEmpty: filter relaxation buttons with matching counts, contact CTA
   - WingsGoScheduleBrowser: initial filters, facet counts sync across chart and filter bar, sort by price renders flat list, EN locale has no VI text
```

### 4.4 Unit Tests
```powershell
pnpm --dir app run test:unit
```
**Kết quả:** 170 passed | 1 failed (171 test files, 1.439 tests passed). Đúng 1 lỗi pre-existing tại `wingsGroupV3Shell.unit.spec.ts`.
Bộ test `tests/unit/wingsGoScheduleMetadata.unit.spec.ts` (12 tests) passed 100%.

### 4.5 Integration Tests
```powershell
node scripts/run-integration-tests.mjs tests/int/wingsGoScheduleIntegration.int.spec.ts tests/int/wingsGoLeadCompatibility.int.spec.ts
```
**Kết quả:** 14/14 tests passed (100%):
```
 ✓ tests/int/wingsGoScheduleIntegration.int.spec.ts (5 tests)
 ✓ tests/int/wingsGoLeadCompatibility.int.spec.ts (9 tests)
```

### 4.6 Production Build (`next build`)
```powershell
pnpm --dir app run build
```
**Kết quả:** Exit code 0.
- Next.js Turbopack compiled thành công.
- TypeScript build check passed với 0 errors.
- 20 static pages generated thành công.
- Standalone bundle sẵn sàng.

---

## 5. Bằng chứng kiểm tra SSR qua `curl`

Kiểm tra trực tiếp trên dev server local (`http://wingsgo.vn:3000`):

### 5.1 URL mặc định `/lich-khoi-hanh` (VI)
```bash
curl -s -i "http://wingsgo.vn:3000/lich-khoi-hanh"
```
**Kết quả kiểm tra:**
- HTTP Status: `200 OK`
- Robots tag: Không có `noindex` (cho phép lập chỉ mục mặc định).
- Canonical: `<link rel="canonical" href="https://wingsgo.vn/lich-khoi-hanh"/>`
- Số lượng đợt khởi hành SSR: 39 đợt được render đầy đủ trong HTML.
- Liên kết tour: Chứa liên kết tới tất cả 16 tour có lịch trong snapshot.

### 5.2 URL có bộ lọc `/lich-khoi-hanh?market=korea&view=date`
```bash
curl -s -i "http://wingsgo.vn:3000/lich-khoi-hanh?market=korea&view=date"
```
**Kết quả kiểm tra:**
- HTTP Status: `200 OK`
- Robots tag: `<meta name="robots" content="noindex, follow"/>`
- Canonical: Giữ nguyên URL gốc `<link rel="canonical" href="https://wingsgo.vn/lich-khoi-hanh"/>`
- Số lượng đợt khởi hành SSR: 18 đợt (chỉ chứa các đợt thuộc thị trường Hàn Quốc).

### 5.3 URL tiếng Anh có bộ lọc `/en/lich-khoi-hanh?airline=VJ`
```bash
curl -s -i "http://wingsgo.vn:3000/en/lich-khoi-hanh?airline=VJ"
```
**Kết quả kiểm tra:**
- HTTP Status: `200 OK`
- Robots tag: `<meta name="robots" content="noindex, follow"/>`
- Canonical: Giữ nguyên URL gốc `<link rel="canonical" href="https://wingsgo.vn/en/lich-khoi-hanh"/>`
- Ngôn ngữ: `<html>` có thuộc tính `lang="en"`, nội dung hoàn toàn bằng tiếng Anh.

---

## 6. Ảnh chụp giao diện (Visual Verification)

Toàn bộ 6 ảnh chụp màn hình theo yêu cầu đã được lưu trong cả hai thư mục:
- `artifacts/phase3/`
- `docs/stories/epics/E07-tour-product-platform/US-093-wingsgo-departure-schedule-v2/artifacts/phase3/`

Danh sách ảnh gồm:
1. `schedule-desktop-1440-vi.png`: Toàn cảnh giao diện trang lịch khởi hành tiếng Việt trên Desktop (1440px).
2. `schedule-mobile-390-vi.png`: Giao diện trang lịch khởi hành tiếng Việt trên Mobile (390px) với thanh lọc gọn gàng và chip cuộn ngang.
3. `schedule-desktop-1440-en.png`: Giao diện tiếng Anh trên Desktop (1440px) với 100% copy chuẩn tiếng Anh.
4. `schedule-mobile-390-en.png`: Giao diện tiếng Anh trên Mobile (390px).
5. `schedule-filtered-desktop-1440.png`: Giao diện khi kích hoạt bộ lọc thị trường (`market=korea`).
6. `schedule-empty-desktop-1440.png`: Giao diện trạng thái không tìm thấy kết quả với các nút hoàn trả bộ lọc và CTA liên hệ tư vấn.

---

## 7. Điểm mở chuyển tiếp cho Phase 4

1. **Chế độ xem "Theo hành trình" (`view=tour`):**
   - Hiện tại nút "Theo hành trình" đã ghi nhận `view=tour` trên URL và render danh sách theo ngày. Phase 4 sẽ bổ sung component gom nhóm theo từng tour (hiển thị thẻ tour kèm các chip ngày khởi hành bên trong).
2. **Khối CTA tư vấn cuối trang:**
   - Hiện tại đang sử dụng khối CTA từ cấu hình site (Zalo OA + Hotline) trong `StructuredPages.tsx`. Phase 4 sẽ đồng bộ thiết kế mới với form đăng ký tư vấn trực tiếp nếu có yêu cầu.
