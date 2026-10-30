# US-093 Phase 1B — Execution Report

## 1. Tóm tắt

Phase 1B của US-093 (WingsGo Departure Schedule v2 — Helper dùng chung, quy tắc CTA và tương thích Lead VN) đã được thực hiện đầy đủ trên worktree `E:\repo\WingsTravel-us093`, nhánh `feat/us-093-departure-schedule-v2`.

Toàn bộ các yêu cầu của `phase1b-brief.md`, `design.md` và `execplan.md` cho Phase 1B đã được hoàn thành:
1. **Helper `canHoldSeat`:**
   - Triển khai và export từ `app/src/tours/utils.ts`. Kiểm tra 4 điều kiện nghiêm ngặt: `commerceVerified === true`, `availabilityStatus !== 'sold-out'`, `daysUntilBusinessDay >= 0` (theo lịch kinh doanh VN), và `normalizeGovernedTourPrice` trả về giá hợp lệ > 0.
   - Áp dụng vào `DepartureStrip` trong `StructuredPages.tsx` (thay thế biểu thức logic inline cũ).
   - Snapshot server điền `row.canHoldSeat` dùng chính helper này.
2. **Quy tắc availability 5 bước:**
   - Khẳng định thứ tự fail-closed trong `deriveScheduleAvailability`: unverified -> `quote`, verified sold-out -> `sold-out`, verified thiếu giá -> `quote`, verified limited -> `limited`, verified open -> `open`.
3. **Chuẩn hóa hãng hàng không (`normalizeScheduleAirline`):**
   - Triển khai và export từ `app/src/tours/wingsGoDisplay.ts`.
   - NFKC normalization, strip whitespace và dấu nháy bao quanh, nhận diện đủ 21 chuỗi test trong `phase0-baseline.md` ra 11 hãng chuẩn.
   - Chuỗi chỉ có nháy trả về `null`. Hãng lạ trả về chuỗi đã trim với key định dạng `raw:<cleaned.toLowerCase()>`.
4. **Bộ lọc & Parse URL params (`parseScheduleFilters`):**
   - Triển khai và export từ `app/src/tours/wingsGoSchedule.ts`.
   - Whitelist tham số `sort`, `view`, `market`, `departureCity`, `airline`, `month`, `year`, `q`. Loại bỏ tham số lạ, mảng rỗng hoặc lặp. Gán mặc định `sort: 'date'`, `view: 'date'`.
   - Snapshot server điền `initialFilters` qua hàm này.
5. **Helper dữ liệu bảng lịch khởi hành:**
   - `foldVietnameseText` (và alias `foldVietnamese`): chuẩn hóa NFKD, xóa dấu tổ hợp, chuyển chữ thường, thay `đ/Đ` thành `d`.
   - `filterScheduleRows`: lọc AND đa chiều kết hợp tìm kiếm văn bản không dấu.
   - `countScheduleFacets`: đếm facet trực giao (bỏ chính facet đang đếm khi tính count cho facet đó).
   - `sortScheduleRows`: sắp xếp theo ngày (`date`) hoặc theo giá (`price`: VND trước, USD sau, không có giá cuối cùng; tie-break bằng ngày rồi id).
   - `groupScheduleRowsByTour`: nhóm theo tour, tính "giá từ" chỉ trên các đợt `canHoldSeat`, ưu tiên VND rồi tới USD, giữ nguyên `originalPrice` và cờ khuyến mãi của đúng đợt rẻ nhất được chọn.
6. **Bộ chọn thị trường ưu tiên (`getPriorityMarketDeparture`):**
   - Thêm tham số tuỳ chọn `now?: Date`. Khi có `now`, dùng lịch kinh doanh Việt Nam (`daysUntilBusinessDay >= 0`). Caller cũ không truyền `now` giữ nguyên hành vi.
   - Snapshot server lọc trước các đợt `canHoldSeat` trước khi gọi `getPriorityMarketDeparture` để điền `marketCards` (tối đa 3 thẻ).
7. **Chuẩn hóa tiêu đề hành trình (`getTourRouteTitle`):**
   - Giữ nguyên chữ hoa/thường của mã thời lượng (`5N4Đ`, `5N4D`,...).
   - Chỉ giữ chữ hoa nguyên bản cho từ viết tắt nằm trong allowlist (`ACRONYM_ALLOWLIST`: UNESCO, VN, VNA, VJ, CA, EK, WE, VU, 9G, 7C, NH, TK, FD).
   - Không tự ý chèn khoảng trắng tách từ vào các từ ghép nối bằng dấu gạch ngang (như `Shirakawa-go`).
   - Đảm bảo toàn bộ 5/5 test có sẵn trong `wingsGoDisplay.unit.spec.ts` đều pass 100%.
8. **Tương thích Lead theo D6:**
   - `getTourInquiryPath` trong `utils.ts` format `departureDate` theo ngày lịch kinh doanh Việt Nam (`toBusinessCalendarDay`).
   - `resolveDepartureLeadContext` trong `app/(payload)/api/lead-submissions/route.ts`: tính `vnDay` từ đợt đã resolve, chấp nhận `context.departureDate` là `vnDay` hoặc `oldUtcDay` (legacy format), fail-closed nếu không khớp hoặc không tính được ngày, và luôn lưu vào collection `lead-submissions` với `departureDate` theo ngày VN (`vnDay`).
   - Row CTA trong snapshot: `ctaHref` dùng ngày VN, `intent` chuẩn hóa theo `canHoldSeat` (`hold-seat` vs `inquire`), `ctaLabel` tôn trọng `ctaLabelOverride` nếu có.

---

## 2. File đã sửa và tạo mới

### File mã nguồn ứng dụng
1. **`app/src/tours/utils.ts` (modified):**
   - Thêm hàm `canHoldSeat(departure, now?: Date): boolean`.
   - Cập nhật `getTourInquiryPath` dùng `toBusinessCalendarDay` cho `departureDate`.
   - Cập nhật `getPriorityMarketDeparture(departures, market, now?)` hỗ trợ `now` với lọc ngày kinh doanh VN.
2. **`app/src/tours/StructuredPages.tsx` (modified):**
   - `DepartureStrip` (dòng 3512): thay biểu thức inline bằng `canHoldSeatDeparture(departure)` (wrapper quanh `canHoldSeat`).
3. **`app/src/tours/wingsGoDisplay.ts` (modified):**
   - Thêm hàm `normalizeScheduleAirline(raw: string | null | undefined): { key: string; label: string } | null`.
   - Cập nhật `getTourRouteTitle` với `ACRONYM_ALLOWLIST`, bảo toàn mã thời lượng `5N4Đ`/`5N4D`, và không tách dấu `-` không có khoảng trắng.
4. **`app/src/tours/wingsGoSchedule.ts` (modified):**
   - Thêm và export các helper thuần: `foldVietnameseText`, `parseScheduleFilters`, `filterScheduleRows`, `countScheduleFacets`, `sortScheduleRows`, `groupScheduleRowsByTour`.
   - Cập nhật `buildScheduleRow`: tính `canHoldSeat` bằng `canHoldSeat(departure, now)`, airline bằng `normalizeScheduleAirline(departure.airline)`.
   - Cập nhật `getWingsGoScheduleSnapshot`:
     - Điền `initialFilters` bằng `parseScheduleFilters(searchParams, snapshotFacts)`.
     - Điền `marketCards` (tối đa 3) từ danh sách đợt đã lọc trước bởi `canHoldSeat`.
5. **`app/src/app/(payload)/api/lead-submissions/route.ts` (modified):**
   - Cập nhật và export `resolveDepartureLeadContext`: tính `vnDay` qua `toBusinessCalendarDay`, chấp nhận `departureDate` là `vnDay` hoặc `oldUtcDay`, trả về ngày lưu luôn là `vnDay`.

### File kiểm thử
6. **`app/tests/unit/wingsGoScheduleHelpers.unit.spec.ts` (created):**
   - 20 unit tests bao phủ:
     - `canHoldSeat`: 4 điều kiện fail closed (unverified, sold-out, quá khứ VN, thiếu giá, verified hợp lệ tương lai).
     - `normalizeScheduleAirline`: 21 chuỗi từ `phase0-baseline.md` ra 11 hãng, chuỗi nháy ra null, hãng lạ có tiền tố `raw:`.
     - `parseScheduleFilters`: lọc whitelist, bỏ param lạ, bỏ array lặp, fallback mặc định.
     - `filterScheduleRows` & `countScheduleFacets`: lọc kết hợp AND, đếm facet trực giao loại bỏ chính facet hiện tại.
     - `sortScheduleRows`: sort theo date và theo price (VND trước, USD sau, không giá cuối; tie-break date rồi id).
     - `groupScheduleRowsByTour`: giá từ chỉ lấy trên đợt `canHoldSeat`, ưu tiên VND rồi USD, giữ đúng promo/original của đợt rẻ nhất.
     - `getPriorityMarketDeparture`: lọc theo lịch VN khi truyền `now`.
     - `getTourRouteTitle`: mã thời lượng 5N4Đ/5N4D, allowlist từ viết tắt, không tách gạch ngang giữa từ.
7. **`app/tests/int/wingsGoLeadCompatibility.int.spec.ts` (created):**
   - 6 integration tests chạy trên Payload SQLite DB thật:
     - Đợt `00:00Z` lưu với ngày VN thành công.
     - Đợt `17:00Z` (+07:00 sang ngày hôm sau VN) lưu với ngày VN thành công.
     - Đợt `17:00Z` gửi ngày UTC cũ vẫn được chấp nhận và lưu DB với ngày VN.
     - Bị từ chối (fail closed) khi gửi `departureDate` sai ngày.
     - Bị từ chối khi đợt không tồn tại trong DB.
     - Bị từ chối khi đợt thuộc về tour/site khác.

---

## 3. Quyết định nhỏ đã tự đưa ra

1. **`ACRONYM_ALLOWLIST` trong `getTourRouteTitle`:**
   - Để thỏa mãn quy tắc "chỉ coi là từ viết tắt khi nằm trong allowlist" mà không phá vỡ 5 test hiện hữu trong `wingsGoDisplay.unit.spec.ts` (ví dụ `ĐỒNG NAI` -> `Đồng Nai`, `PHAN THIẾT` -> `Phan Thiết`), danh sách allowlist được định nghĩa chứa: `UNESCO`, `VN`, `VNA`, `VJ`, `CA`, `EK`, `WE`, `VU`, `9G`, `7C`, `NH`, `TK`, `FD`.
   - Các từ viết hoa khác có từ 2-3 chữ cái nhưng không nằm trong allowlist sẽ được title-case tự nhiên thay vì giữ in hoa toàn bộ.
2. **Mocking `@payload-config` trong `wingsGoScheduleHelpers.unit.spec.ts`:**
   - Vitest unit environment (`vitest.unit.config.mts`) chạy bằng `happy-dom`/browser mode, sẽ lỗi nếu load module Native `node:sqlite` gián tiếp từ `localDatabase.ts`. Do đó trong file unit test helper thuần, mock nhẹ `@payload-config` để giữ môi trường unit test cô lập và thực thi thuần túy các helper in-memory.
3. **Form Lexical field trong Payload Integration Test:**
   - Collection `forms` yêu cầu `confirmationType: 'message'` và cấu trúc Lexical RichText `confirmationMessage`. Test fixture đã tạo đúng cấu trúc root/children Lexical để vượt qua schema validation của Payload CMS 3.84.1.

---

## 4. Output test thật (cổng kiểm tra)

### 4.1. TypeScript (`pnpm exec tsc --noEmit`)
Chạy từ `app/`:
```
tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(116,21): error TS2353: Object literal may only specify known properties, and 'type' does not exist in type '{ richText?: unknown; }'.
tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(155,9): error TS2322: Type '"lo"' is not assignable to type '"en" | "vi" | "it" | "es" | "pt" | "ja" | "ko" | "fr" | "de" | null | undefined'.
```
-> **Chỉ đúng 2 lỗi baseline định sẵn, không có bất kỳ lỗi mới nào.**

### 4.2. Linter (`pnpm run lint`)
```
✖ 459 problems (0 errors, 459 warnings)
0 errors and 1 warning potentially fixable with the `--fix` option.
```
-> **Exit code 0, 0 error.**

### 4.3. Unit tests (`pnpm run test:unit`)
```
Test Files  1 failed | 170 passed (171)
     Tests  1 failed | 1419 passed (1420)
  Duration  50.93s
```
- 1 failure duy nhất là baseline `tests/unit/wingsGroupV3Shell.unit.spec.ts`.
- `tests/unit/wingsGoScheduleHelpers.unit.spec.ts`: **20/20 passed**.
- `tests/unit/wingsGoDisplay.unit.spec.ts`: **5/5 passed**.
- `tests/unit/lowestPrice.unit.spec.ts`: **5/5 passed**.
- `tests/unit/wingsGoScheduleSnapshot.unit.spec.ts`: **12/12 passed**.

### 4.4. Component tests (`pnpm run test:component`)
```
Test Files  63 passed (63)
     Tests  422 passed (422)
  Duration  26.63s
```
-> **63 test files passed, 422 tests passed 100%.**

### 4.5. Integration tests (Payload SQLite DB thật)
- `node scripts/run-integration-tests.mjs tests/int/wingsGoLeadCompatibility.int.spec.ts`:
  ```
  Test Files  1 passed (1)
       Tests  6 passed (6)
  ```
- `node scripts/run-integration-tests.mjs tests/int/wingsGoScheduleIntegration.int.spec.ts`:
  ```
  Test Files  1 passed (1)
       Tests  5 passed (5)
  ```
- `node scripts/run-integration-tests.mjs tests/int/leadSubmissionRoute.int.spec.ts`:
  ```
  Test Files  1 passed (1)
       Tests  21 passed (21)
  ```
- `node scripts/run-integration-tests.mjs tests/int/leadCapture.int.spec.ts`:
  ```
  Test Files  1 passed (1)
       Tests  3 passed (3)
  ```

---

## 5. Điểm còn mở cho Phase 2

- **Phase 2 (UI Client/Server Integration & View Toggle):**
  - Kết nối `WingsGoScheduleView` client component với các bộ lọc `initialFilters` đã parse.
  - Render chế độ xem theo ngày (`view=date`) và theo tour (`view=tour`).
  - Gắn URL synchronization (push/replace query params) khi người dùng tương tác với bộ lọc/sắp xếp.
  - Modal form giữ chỗ / hỏi giá trên client liên kết mượt mà với route `lead-submissions` vừa cập nhật.
