# US-093 Phase 2 — Execution Report

## 1. Tóm tắt

Phase 2 của US-093 (WingsGo Departure Schedule v2 — Hero, biểu đồ tháng, thẻ thị trường nổi bật) đã được triển khai hoàn chỉnh trên worktree `E:\repo\WingsTravel-us093`, nhánh `feat/us-093-departure-schedule-v2`.

Toàn bộ các yêu cầu của `phase2-brief.md`, `design.md` và `execplan.md` cho Phase 2 đã được thực hiện:
- **`WingsGoScheduleHero.tsx` (server component):** eyebrow, H1 chứa khoảng năm linh hoạt (`stats.yearRange`: 1 năm hoặc "2026 – 2027"), mô tả chỉ hiển thị thành phố khởi hành khi toàn bộ đợt có chung nơi đi (`stats.sharedDepartureCity`), 4 bộ đếm số liệu chuẩn (`openCount`, `tourCount`, `pricedCount`, `nearestDay`), nhãn ngày xác minh `verifiedDay` hiển thị có điều kiện ("Cập nhật dd/mm/yyyy"). Tuyệt đối không hiển thị giá thấp nhất, không hard-code thành phố hay hotline.
- **`WingsGoScheduleMonthChart.tsx` (client component trình bày):** render dạng cột với `aria-pressed`, `aria-label` đầy đủ (tháng, năm, số đợt), cột 0 đợt bị `disabled`, vạch ngăn cách khi có tháng trống ở giữa, nhãn năm hiển thị tại ranh giới đổi năm, nhãn "Cao điểm" tính toán tự động dựa trên số đợt cao nhất (khi >= 2 đợt). Render thuần khiết (pure render) tuân thủ nghiêm ngặt React compiler (không reassign biến ngoài/trong vòng lặp). Layout co giãn mượt mà trên mobile, nằm gọn trong container mà không gây horizontal page scroll.
- **`WingsGoScheduleMarketCards.tsx` (client component trình bày):** hiển thị tối đa 3 thẻ thị trường ưu tiên (`snapshot.marketCards`). Tích hợp ảnh fallback chuẩn như `WingsGoTourCard`, hiệu ứng `hot-rainbow-card` kèm nhãn `sr-only`, sticker biên tập (`specialized`, `vip`) từ US-084, promo badge. Thẻ không có badge được render gọn gàng, không để lại class hay khoảng trống DOM thừa. Trên mobile hỗ trợ cuộn ngang (`overflow-x-auto snap-x`) trong khung container.
- **`wingsGoScheduleScroll.ts` (client utility):** hàm `scrollToScheduleList` sử dụng `window.scrollTo`, tự động hạ cấp về `behavior: 'auto'` khi người dùng bật `prefers-reduced-motion: reduce`. Không dùng `scrollIntoView`.
- **`wingsGoScheduleCopy.ts`:** bổ sung toàn bộ copy VI và EN cho hero, biểu đồ tháng và thẻ thị trường. Tại locale `/en`, 100% giao diện hiển thị bằng tiếng Anh, không chứa bất kỳ từ tiếng Việt nào.
- **`wingsGoDisplay.ts`:** bổ sung helper `formatDepartureCityName` hỗ trợ hiển thị tên thành phố chuẩn hóa từ mã IATA (`HAN` -> Hà Nội / Hanoi, `SGN` -> TP. Hồ Chí Minh / Ho Chi Minh City, `DAD` -> Đà Nẵng / Da Nang, `HPH` -> Hải Phòng / Hai Phong).
- **Tích hợp trang tại `cmsPage.tsx` và `StructuredPages.tsx`:** chỉ kích hoạt snapshot cho site `wings-go`. Truyền snapshot vào nhánh WingsGo của `TourSchedulePage`. Render Hero + MonthChart + MarketCards phía trên và tạm thời giữ nguyên danh sách lịch cũ bên dưới chờ Phase 3.
- **Cô lập Client Bundle:** Toàn bộ client components (`WingsGoScheduleMonthChart`, `WingsGoScheduleMarketCards`, `wingsGoScheduleScroll`, `StructuredPages`) chỉ sử dụng `import type` từ `wingsGoSchedule.ts`, đảm bảo không kéo runtime Payload/Next headers vào bundle client theo đúng chỉ đạo của orchestrator và Codex.
- **CSS scoped:** Thêm `.wingsgo-schedule` vào `globals.css` với border-radius, đồng bộ `::before` của `hot-rainbow-card`, kích thước touch target tối thiểu 44px, focus ring rõ ràng, và tôn trọng media query reduced motion.

---

## 2. File đã sửa và tạo mới

### Mã nguồn ứng dụng
1. `app/src/tours/WingsGoScheduleHero.tsx` (created) — Server component hiển thị Hero section và 4 thẻ thống kê.
2. `app/src/tours/WingsGoScheduleMonthChart.tsx` (created) — Client presentation component hiển thị biểu đồ tần suất đợt khởi hành theo tháng.
3. `app/src/tours/WingsGoScheduleMarketCards.tsx` (created) — Client presentation component hiển thị tối đa 3 thẻ thị trường nổi bật.
4. `app/src/tours/wingsGoScheduleScroll.ts` (created) — Helper cuộn mượt tôn trọng `prefers-reduced-motion`.
5. `app/src/tours/wingsGoScheduleCopy.ts` (modified) — Bổ sung nhãn VI/EN cho Hero, MonthChart, MarketCards.
6. `app/src/tours/wingsGoDisplay.ts` (modified) — Thêm hàm `formatDepartureCityName`.
7. `app/src/app/(frontend)/globals.css` (modified) — Bổ sung CSS trong scope `.wingsgo-schedule`.
8. `app/src/app/(frontend)/cmsPage.tsx` (modified) — Gọi `getWingsGoScheduleSnapshot` cho site `wings-go` và truyền vào `TourSchedulePage`.
9. `app/src/tours/StructuredPages.tsx` (modified) — `TourSchedulePage` tiếp nhận prop `snapshot?: WingsGoScheduleSnapshot | null` (`import type` only), kết nối các component mới vào layout WingsGo.

### File kiểm thử
10. `app/tests/component/wingsGoSchedulePhase2.component.spec.tsx` (created) — Bộ 17 component tests kiểm tra đầy đủ các trạng thái và hành vi.

---

## 3. Quyết định kỹ thuật nhỏ

1. **Client Component Isolation:**
   - Client components (`WingsGoScheduleMonthChart.tsx`, `WingsGoScheduleMarketCards.tsx`, `wingsGoScheduleScroll.ts`) và `StructuredPages.tsx` tuyệt đối không có runtime import từ `tours/wingsGoSchedule.ts` (chỉ dùng `import type`). Điều này ngăn ngừa Payload CMS dependencies (`payload`, `next/headers`, server-side database connections) bị rò rỉ vào client bundle.
2. **React Compiler Pure Rendering trong MonthChart:**
   - Thay vì dùng biến mutable bên ngoài `.map()` để lưu tháng trước đó (`prevM`), logic tính toán tháng trống được chuyển sang truy xuất index trực tiếp `const prevM = i > 0 ? months[i - 1] : null`. Giữ render function hoàn toàn pure và vượt qua quy tắc khắt khe của React Compiler ESLint rule (`react-compiler/react-compiler`).
3. **Thành phố khởi hành linh hoạt:**
   - Mô tả hero sử dụng helper `formatDepartureCityName` định dạng tên tiếng Việt / tiếng Anh tùy theo `locale`, chỉ render khi `stats.sharedDepartureCity` có giá trị (tất cả các đợt cùng xuất phát từ 1 thành phố).
4. **Bảo tồn Hotline display:**
   - Trong `StructuredPages.tsx`, hotline WingsGo được giữ nguyên cấu trúc chuẩn `formatHotlineDisplay(item.normalized)` và link `item.href`.

---

## 4. Kết quả chạy cổng kiểm tra thực tế

### 4.1 TypeScript (`tsc --noEmit`)
```
pnpm --dir app exec tsc --noEmit
```
**Kết quả:** Exit code 1 với đúng 2 lỗi baseline pre-existing tại `wingsGroupCorporateRoutes.unit.spec.ts`:
- `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(116,21): error TS2353: Object literal may only specify known properties, and 'type' does not exist in type '{ richText?: unknown; }'.`
- `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(155,9): error TS2322: Type '"lo"' is not assignable to type '"en" | "vi" | "it" | "es" | "pt" | "ja" | "ko" | "fr" | "de" | null | undefined'.`
Tất cả các file của Phase 2 và codebase WingsGo có **0 lỗi TypeScript**.

### 4.2 ESLint
```
pnpm --dir app exec eslint src/tours/WingsGoScheduleHero.tsx src/tours/WingsGoScheduleMonthChart.tsx src/tours/WingsGoScheduleMarketCards.tsx src/tours/wingsGoScheduleScroll.ts src/tours/wingsGoScheduleCopy.ts tests/component/wingsGoSchedulePhase2.component.spec.tsx
```
**Kết quả:** Exit code 0, không có bất kỳ warning hay error nào.

### 4.3 Component Tests
```
pnpm --dir app run test:component tests/component/wingsGoSchedulePhase2.component.spec.tsx
```
**Kết quả:** 17/17 tests passed (100%):
```
 ✓ tests/component/wingsGoSchedulePhase2.component.spec.tsx (17 tests) 527ms
   - WingsGoScheduleHero: single year, two-year range, single departure city, multi cities, verifiedDay present/absent, English locale has no Vietnamese
   - WingsGoScheduleMonthChart: accessible buttons with aria-pressed, keyboard activation, disabled column on 0 count, month gap separator, year transition label, peak month indicator
   - WingsGoScheduleMarketCards: hot tour badge and styling, editorial stickers (specialized/vip), promo badge, clean no-badge rendering, image fallback, max 3 cards limit, onSelect click callback
```

Toàn bộ test suite component tổng thể (`pnpm --dir app run test:component`) vượt qua toàn bộ 64 test files và 439 tests.

### 4.4 Unit Tests
```
pnpm --dir app run test:unit
```
**Kết quả:** 168 passed (1.427 tests passed), đúng 1 lỗi baseline pre-existing tại `wingsGroupV3Shell.unit.spec.ts` (kỳ vọng string `!isWingsGroup ? <ThemeSelector` từ commit trước đó). Tất cả các suite unit test cho schedule snapshot (`wingsGoScheduleSnapshot.unit.spec.ts`, `wingsGoScheduleSnapshotMocked.unit.spec.ts`) đều passed 100%.

### 4.5 Production Build (`next build`)
```
pnpm --dir app run build
```
**Kết quả:** Exit code 0.
- Next.js Turbopack compiled in 23.8s.
- TypeScript validation hoàn thành trong 28.9s với 0 errors.
- 20 static pages generated thành công.
- Standalone bundle đã được đóng gói thành công qua `prepare-standalone.mjs`.

---

## 5. Ảnh chụp giao diện (Visual Verification)

Visual verification được thực hiện trực tiếp trên dev server local với Playwright (Edge channel) tại các viewports và locales theo yêu cầu:
- Thư mục lưu trữ: `docs/stories/epics/E07-tour-product-platform/US-093-wingsgo-departure-schedule-v2/artifacts/phase2/`
- Danh sách ảnh:
  1. `schedule-hero-desktop-1440-vi.png` (1440x900, URL: `http://localhost:3000/wingsgo/lich-khoi-hanh`)
  2. `schedule-hero-mobile-390-vi.png` (390x844, URL: `http://localhost:3000/wingsgo/lich-khoi-hanh`)
  3. `schedule-hero-desktop-1440-en.png` (1440x900, URL: `http://localhost:3000/wingsgo/en/lich-khoi-hanh`)
  4. `schedule-hero-mobile-390-en.png` (390x844, URL: `http://localhost:3000/wingsgo/en/lich-khoi-hanh`)

---

## 6. Điểm còn mở (Open Points) bàn giao cho Phase 3

1. **Bộ lọc tương tác:**
   - Trong Phase 2, `onSelect` của `MonthChart` và `MarketCards` đã được thiết kế sẵn sàng nhận callback, nhưng chưa gắn với URL query parameters và bảng lịch khởi hành chi tiết bên dưới. Phase 3 sẽ kết nối `onSelect(month)` và `onSelect(market)` để lọc danh sách kết hợp cuộn tự động qua `scrollToScheduleList`.
2. **Thay thế bảng lịch cũ:**
   - Bảng lịch khởi hành cũ tạm thời được giữ ở phía dưới để không làm gãy trải nghiệm người dùng hiện tại; Phase 3 sẽ thay thế bằng bảng lịch v2 hoàn chỉnh (desktop table + mobile card list).
