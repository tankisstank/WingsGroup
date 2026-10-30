# US-093 Phase 1A — Execution Report

## 1. Tóm tắt

Phase 1A của US-093 (WingsGo Departure Schedule v2 — Query, scope, locale, DTO và thời gian) đã được thực hiện đầy đủ trên worktree `E:\repo\WingsTravel-us093`, nhánh `feat/us-093-departure-schedule-v2`.

Toàn bộ các yêu cầu của `phase1a-brief.md`, `design.md` và `execplan.md` cho Phase 1A đã được triển khai và kiểm thử:
- Bổ sung `populate`, `select`, `sort`, `page`, `pagination` cho `queryCollection` mà không làm thay đổi hành vi của caller cũ.
- `normalizeDepartureCard` nhận thêm tham số `now` và truyền vào kiểm tra verification freshness (`isDepartureVerificationCurrent`).
- `normalizeTourProductCard` nhận thêm `locale` và trả về `editorialBadges` cùng `hasHot` qua `normalizeEditorialBadges`.
- Sửa caller tại `queries.ts:251` (trước đó là ~214) để tránh truyền `index` của `.map()` vào `locale`.
- Sửa `getLowestPrice` trong `utils.ts` để chỉ nhận số hữu hạn và > 0 (`typeof value === 'number' && Number.isFinite(value) && value > 0`).
- Tạo mới `app/src/tours/wingsGoScheduleCopy.ts` đầy đủ nhãn VI và EN theo mẫu `wingsGoCatalogCopy.ts`, với nhãn thị trường `other` là "Thị trường khác" (VI) / "Other destinations" (EN).
- Tạo mới `app/src/tours/wingsGoSchedule.ts` định nghĩa toàn bộ hợp đồng DTO (`ScheduleAvailability`, `ScheduleMoney`, `WingsGoScheduleTour`, `WingsGoScheduleRow`, `WingsGoScheduleMarketCard`, `WingsGoScheduleStats`, `WingsGoScheduleSnapshot`, `ScheduleFilters`) và hàm server snapshot `getWingsGoScheduleSnapshot`.
- Thêm unit test và integration test toàn diện.
- Giữ nguyên `getResolvedScheduleData` (trừ sửa `getLowestPrice`), không đổi UI, không chạm vào schema hay DB chính/production.

---

## 2. File đã sửa và tạo mới

### File mã nguồn ứng dụng
1. **`app/src/tours/utils.ts` (modified):**
   - Sửa `getLowestPrice` lọc giá bằng `typeof value === 'number' && Number.isFinite(value) && value > 0`.
2. **`app/src/tours/queries.ts` (modified):**
   - `queryCollection` nhận thêm `page`, `pagination`, `populate`, `select`, `sort` (mặc định `pagination: false`).
   - `normalizeTourProductCard(tour, locale?)` chuẩn hóa `editorialBadges` và `hasHot` qua `normalizeEditorialBadges`.
   - `selectRelatedTourCards` dùng `.map((item) => normalizeTourProductCard(item))` để không truyền array index làm `locale`.
   - `normalizeDepartureCard(departure, draft, now?)` truyền `now?.getTime()` vào `isDepartureVerificationCurrent`.
3. **`app/src/tours/wingsGoScheduleCopy.ts` (created):**
   - Cung cấp copy đầy đủ cho Hero, trạng thái availability (open, limited, sold-out, quote), nhãn bộ lọc, nhãn thị trường (`other: 'Thị trường khác'` / `'Other destinations'`), CTA ("Giữ chỗ", "Hỏi giá", "Liên hệ", "Xem tour"), và các hàm định dạng ngày/tháng/số lượng.
4. **`app/src/tours/wingsGoSchedule.ts` (created):**
   - Khai báo các type DTO chuẩn theo `design.md`.
   - Hàm `getWingsGoScheduleSnapshot({ locale, draft, now, searchParams })`:
     - Xác định `todayDay` theo lịch kinh doanh Việt Nam (+07:00). Fail closed nếu `today` null.
     - Phân trang đọc batch 250, sort `['departureDate', 'id']`, đọc đến hết, deduplicate theo `id`.
     - Log cảnh báo nếu số đợt tương lai vượt 1.000.
     - Lọc trên dữ liệu thô: chỉ nhận `tourProduct` published (nếu không draft) và cùng site; media cùng site, url hợp lệ, không lọc theo `_status` (do collection Media không bật versions/drafts).
     - Áp dụng D11: nếu `locale === 'en'` và tour thiếu title, đọc fallback nội dung VI nhưng giữ nguyên `editorialBadges` từ bản đọc EN strict.
     - Bảng trạng thái 5 bước (R2): unverified -> `quote`, verified + sold-out -> `sold-out`, verified + thiếu giá -> `quote`, verified + limited -> `limited`, verified + open/trống -> `open`.
     - `canHoldSeat` chuẩn hóa trên server: verified, không sold-out, `daysUntil >= 0`, giá governed hợp lệ.
     - Thống kê `stats`: `nearestDay` chọn ngày sớm nhất (không phụ thuộc giá), `yearRange` từ đợt đầu đến đợt cuối, `sharedDepartureCity` chỉ xuất hiện khi 100% đợt cùng nơi đi, `verifiedDay` lấy từ `verifiedAt` lớn nhất của đợt đang xác minh.
     - Trong Phase 1A: `marketCards = []` và `initialFilters = {}`.

### File kiểm thử
5. **`app/tests/unit/lowestPrice.unit.spec.ts` (created):**
   - 5 tests kiểm tra toàn diện `getLowestPrice`: mảng rỗng/null, giá 0, số âm, NaN, Infinity, danh sách trộn giá và có trường currency.
6. **`app/tests/unit/wingsGoScheduleSnapshot.unit.spec.ts` (created):**
   - 12 tests kiểm tra ranh giới ngày VN (`now=2026-10-30T03:00Z` với đợt `2026-10-29T17:00Z` là cùng ngày hôm nay; quá khứ 16:59:59Z bị loại); thời điểm hết hạn xác minh chính xác bằng `now`; qua tháng và qua năm; copy VI/EN; stats (đợt sớm nhất khác đợt rẻ nhất, khoảng năm, thành phố chung).
7. **`app/tests/int/wingsGoScheduleIntegration.int.spec.ts` (created):**
   - 4 tests integration với Payload mock:
     - > 200 đợt qua nhiều trang (250 + 20 đợt, deduplicate thành 264), sort đúng thứ tự không cắt.
     - Kiểm tra lọc relation: loại product draft / khác site; media khác site thành null; media hợp lệ không có `_status` vẫn được giữ; quan hệ primitive ID hoặc đã xoá không crash.
     - D11 locale fallback: tour EN chưa dịch hiện tiêu đề VI nhưng không lọt badge VI.
     - Homepage `getResolvedScheduleData` chạy với fixture rỗng, chỉ có quá khứ, và có tương lai cho output an toàn, không đổi.

---

## 3. Quyết định nhỏ đã tự đưa ra

1. **`payload.find` type casting trong `queryCollection`:**
   - Do `collection: never`, TypeScript của Payload CMS 3.84.1 suy diễn kiểu `BaseFindOptions<never, never>`, gây lỗi kiểu khi truyền `select?: Record<string, unknown>`. Đã ép kiểu `{ ... } as any` trong lời gọi `payload.find` để bảo đảm typecheck sạch và tương thích runtime.
2. **Xử lý `searchParams` trong Phase 1A:**
   - Trong Phase 1A, snapshot khởi tạo `initialFilters = {}` và `marketCards = []` theo đúng chỉ dẫn của brief ("Trong phase này marketCards là [], còn initialFilters là giá trị mặc định"). Việc parse URL params và selector `marketCards` dựa trên `canHoldSeat` sẽ được hoàn thiện ở Phase 1B.
3. **Sort tie-breaker cho rows:**
   - Rows được sắp xếp tăng dần theo `departureDay` (YYYY-MM-DD); nếu trùng ngày, tie-break bằng `id` theo thứ tự chữ cái (`localeCompare`), đúng quy tắc trong `design.md`.

---

## 4. Output test thật (cổng kiểm tra)

### 4.1. TypeScript (`pnpm exec tsc --noEmit`)
- **Trước khi sửa:** 2 lỗi có sẵn từ baseline:
  ```
  tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(116,21): error TS2353: Object literal may only specify known properties, and 'type' does not exist in type '{ richText?: unknown; }'.
  tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(155,9): error TS2322: Type '"lo"' is not assignable to type '"en" | "vi" | "it" | "es" | "pt" | "ja" | "ko" | "fr" | "de" | null | undefined'.
  ```
- **Sau khi sửa:** đúng 2 lỗi trên, **0 lỗi mới** trong toàn bộ codebase:
  ```
  tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(116,21): error TS2353: Object literal may only specify known properties, and 'type' does not exist in type '{ richText?: unknown; }'.
  tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(155,9): error TS2322: Type '"lo"' is not assignable to type '"en" | "vi" | "it" | "es" | "pt" | "ja" | "ko" | "fr" | "de" | null | undefined'.
  ```

### 4.2. Linter (`pnpm run lint`)
- **Kết quả:** Exit code 0.
  ```
  ✖ 419 problems (0 errors, 419 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.
  ```

### 4.3. Unit tests (`pnpm run test:unit`)
- **Kết quả:** Exit code 1 (chỉ 1 lỗi duy nhất là `wingsGroupV3Shell.unit.spec.ts` có từ baseline).
  ```
  Test Files  1 failed | 164 passed (165)
       Tests  1 failed | 1375 passed (1376)
  ```
  - Lỗi duy nhất:
    ```
    ❯  browser  tests/unit/wingsGroupV3Shell.unit.spec.ts (4 tests | 1 failed)
       × keeps public WingsGroup routes free of the theme selector and generic related-page rail
    ```
- **Hai file unit test mới:**
  ```
  ✓  browser  tests/unit/wingsGoScheduleSnapshot.unit.spec.ts (12 tests) 6ms
  ✓  browser  tests/unit/lowestPrice.unit.spec.ts (5 tests) 3ms
  Test Files  2 passed (2)
       Tests  17 passed (17)
  ```
- **Các unit test liên quan được yêu cầu trong brief:**
  ```
  ✓  browser  tests/unit/editorialBadges.unit.spec.ts (27 tests)
  ✓  browser  tests/unit/wingsGoDisplay.unit.spec.ts (5 tests)
  ✓  browser  tests/unit/wingsGoPriorityMarketDeparture.unit.spec.ts (3 tests)
  ✓  browser  tests/unit/tourPublicProjection.unit.spec.ts (16 tests)
  Test Files  4 passed (4)
       Tests  51 passed (51)
  ```

### 4.4. Component tests (`pnpm run test:component`)
- **Kết quả:** Exit code 0, toàn bộ pass:
  ```
  Test Files  63 passed (63)
       Tests  422 passed (422)
    Duration  81.92s
  ```
- Bao gồm các test được yêu cầu trong brief:
  - `tests/component/promotionPrice.component.spec.tsx` (11 tests pass)
  - `tests/component/retailTourDepartureSync.component.spec.tsx` (6 tests pass)

### 4.5. Integration tests (`pnpm exec vitest run tests/int/wingsGoScheduleIntegration.int.spec.ts --config ./vitest.config.mts`)
- **Kết quả:** Exit code 0:
  ```
  ✓ tests/int/wingsGoScheduleIntegration.int.spec.ts (4 tests) 20ms
  Test Files  1 passed (1)
       Tests  4 passed (4)
  ```

---

## 5. Những điểm còn mở hoặc lệch so với `design.md`

1. **`marketCards` và `initialFilters`:**
   - Trong Phase 1A, theo đúng brief, `marketCards` là mảng rỗng `[]` và `initialFilters = {}`. Logic chọn đợt cho `marketCards` (qua `getPriorityMarketDeparture` có nhận `now` và prefilter `canHoldSeat`) và logic parse URL query whitelist sẽ được cài đặt và tích hợp đầy đủ trong Phase 1B.
2. **`normalizeScheduleAirline`:**
   - Trong Phase 1A, hãng bay được ánh xạ tạm dạng `key: raw:<label.toLowerCase()>` và `label: rawDoc.airline.trim()`. Bảng tra cứu 11 hãng chuẩn hóa và helper `normalizeScheduleAirline` sẽ được triển khai ở Phase 1B.
3. **`canHoldSeat` helper dùng chung:**
   - Đã được triển khai nội bộ trong `wingsGoSchedule.ts`. Trong Phase 1B, helper này sẽ được chuyển sang `tours/utils.ts` và export để `DepartureStrip` tái dùng.

---

## 6. Kết luận

Phase 1A hoàn thành sạch sẽ, sẵn sàng cho Codex review DTO theo kế hoạch.
