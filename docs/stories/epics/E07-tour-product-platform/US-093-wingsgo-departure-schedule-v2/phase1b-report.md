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

---

## 6. Vòng sửa C1–C5, B1–B5 (Codex 1A & Orchestrator 1B Review)

### 6.1. Chi tiết các nội dung đã xử lý

1. **C1 (P2) — Nhãn `other`:**
   - Trong `wingsGoSchedule.ts`, cập nhật mapping markets để dùng `value === 'other' ? copy.marketOther : (WINGSGO_MARKET_LABELS[value]?.[resolvedLocale] || copy.marketOther)`.
   - Kết quả: `other` ra "Thị trường khác" (VI) và "Other destinations" (EN). Giữ nguyên `WINGSGO_MARKET_LABELS` dùng chung cho `/tour`.
   - Bổ sung assertion cho cả VI và EN trong `wingsGoScheduleSnapshotMocked.unit.spec.ts`.
2. **C2 (P2) — `verifiedDay`:**
   - Trong vòng lặp tạo schedule rows của `getWingsGoScheduleSnapshot`, tính `isDepartureVerificationCurrent(doc, now.getTime())` độc lập, cập nhật `maxVerifiedAt` cho mọi đợt verified hiện hành, bao gồm cả đợt `quote` thiếu giá và đợt `sold-out`.
   - Bổ sung test fixture trong `wingsGoScheduleSnapshotMocked.unit.spec.ts` cho cả 2 trường hợp.
3. **C3 (P2) — Integration pagination:**
   - Trong `tests/int/wingsGoScheduleIntegration.int.spec.ts`: assert đúng 260 fixture rows (`expect(snapshot.rows).toHaveLength(260)`), tập ID unique khớp đúng 260 ID tạo ra (`expect(rowIds).toEqual(createdDepartureIds)`), đúng thứ tự ngày và ID số.
   - Spy `payload.find` ghi nhận danh sách `page` được gọi và chứng minh đã đọc qua trang 2 (`expect(queriedPages).toContain(1); expect(queriedPages).toContain(2)`).
4. **C4 (P2) — Test fail-closed và contract row:**
   - Khi `now` không hợp lệ (e.g. `new Date('invalid')`) hoặc không có site (`getCurrentSite() === null`), trả về snapshot rỗng (`createEmptyScheduleSnapshot`), hoàn toàn không query dữ liệu (`payload.find` không được gọi).
   - `buildScheduleRow` với đợt `17:00Z`: sinh `departureDay` là ngày VN (`2027-05-20`), `ctaHref` chứa `departureDate=2027-05-20`; `intent=hold-seat` khi `canHoldSeat = true`, `intent=inquiry` khi quote/sold-out; `ctaLabelOverride` chỉ đổi nhãn hiển thị, không đổi intent.
5. **C5 (P3) — Media URL:**
   - `extractTourMedia`: trim URL, chuẩn hóa qua `normalizePublicMediaURL`. Chỉ chấp nhận đường dẫn nội bộ bắt đầu bằng `/` hoặc URL tuyệt đối `https://` hợp lệ. Chuỗi chỉ có khoảng trắng hoặc URL malformed trả về `null`.
   - Bổ sung test trong `wingsGoScheduleSnapshot.unit.spec.ts` cho các trường hợp: whitespace, malformed URL, path `/media/...`, path `/api/media/file/...`, HTTPS URL.
6. **B1 (P1) — Route file export không hợp lệ:**
   - Chuyển `resolveDepartureLeadContext` sang module riêng `app/src/lead-capture/departureLeadContext.ts`.
   - `app/src/app/(payload)/api/lead-submissions/route.ts` import hàm này ở đầu file, loại bỏ mọi export ngoài HTTP handlers để tuân thủ quy chuẩn Next.js route segments.
   - Đã kiểm chứng qua lệnh `pnpm run build` (Next.js 16 production build) hoàn thành thành công 100%.
7. **B2 (P2) — Lead kiểm thử qua route POST thật:**
   - Bổ sung describe block kiểm thử route handler `POST` thật trong `tests/int/wingsGoLeadCompatibility.int.spec.ts` chạy trên Payload SQLite database thật:
     - Đợt `17:00Z` gửi ngày VN (`2027-05-20`) -> trả về 202, collection `form-submissions` lưu đúng `enquiryContext.departureDate = '2027-05-20'`.
     - Đợt `17:00Z` gửi ngày UTC cũ (`2027-05-19`) -> trả về 202, vẫn lưu `enquiryContext.departureDate = '2027-05-20'`.
     - Gửi ngày không khớp cả hai (`2027-05-25`) -> trả về 400 (`Invalid submission.`).
8. **B3 (P3) — Mã hãng bay hoa thường:**
   - Trong `KNOWN_AIRLINES` (`wingsGoDisplay.ts`), loại bỏ cờ `i` khỏi `codePattern` (chỉ khớp IATA code viết hoa), giữ nguyên cờ `i` ở `namePattern`.
   - Bổ sung test trong `wingsGoScheduleHelpers.unit.spec.ts`: đủ 21 chuỗi baseline vẫn ra 11 hãng; chuỗi chứa từ thường "we travel", "ca transport" trả về `raw:`.
9. **B4 (P3) — Allowlist từ viết tắt:**
   - Trong `toTitleCaseWord` (`wingsGoDisplay.ts`), chỉ giữ in hoa toàn bộ khi từ trong nguồn đã viết hoa và nằm trong `ACRONYM_ALLOWLIST`.
   - Bổ sung test trong `wingsGoScheduleHelpers.unit.spec.ts`: "Ca" giữ "Ca", "Vu" giữ "Vu", "VNA" giữ "VNA", "CA" giữ "CA", "VU" giữ "VU".
10. **B5 (P3) — So sánh ID theo số nguyên:**
    - Tạo helper `compareScheduleIds`: so sánh số khi cả 2 ID là số nguyên (`Number.isInteger`), ngược lại so sánh chuỗi bằng `localeCompare`.
    - Sử dụng trong `sortScheduleRows`, `groupScheduleRowsByTour` (bổ sung tie-break id sau ngày) và sort snapshot.
    - Bổ sung test trong `wingsGoScheduleHelpers.unit.spec.ts`: các đợt cùng ngày có ID 9 và 10 được xếp đúng thứ tự (9 trước 10).

---

### 6.2. Kết quả kiểm tra cổng (verbatim command summaries)

- **TypeScript (`pnpm exec tsc --noEmit`):**
  ```
  tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(116,21): error TS2353: Object literal may only specify known properties, and 'type' does not exist in type '{ richText?: unknown; }'.
  tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(155,9): error TS2322: Type '"lo"' is not assignable to type '"vi" | "en" | "it" | "es" | "pt" | "ja" | "ko" | "fr" | "de" | null | undefined'.
  ```
  -> **Chỉ có đúng 2 lỗi baseline định sẵn, 0 lỗi mới.**

- **Linter (`pnpm run lint`):**
  ```
  ✖ 469 problems (0 errors, 469 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.
  ```
  -> **Exit code 0, 0 error.**

- **Unit tests (`pnpm run test:unit`):**
  ```
  Test Files  1 failed | 168 passed (169)
       Tests  1 failed | 1427 passed (1428)
    Duration  81.22s
  ```
  -> **Chỉ có đúng 1 failure baseline (`tests/unit/wingsGroupV3Shell.unit.spec.ts`).**
  - `wingsGoScheduleHelpers.unit.spec.ts`: **23/23 passed**.
  - `wingsGoScheduleSnapshot.unit.spec.ts`: **17/17 passed**.
  - `wingsGoScheduleSnapshotMocked.unit.spec.ts`: **7/7 passed**.
  - `wingsGoDisplay.unit.spec.ts`: **5/5 passed**.

- **Component tests (`pnpm run test:component`):**
  ```
  Test Files  63 passed (63)
       Tests  422 passed (422)
    Duration  27.02s
  ```
  -> **63 test files passed, 422 tests passed 100%.**

- **Integration tests (Payload SQLite DB thật):**
  - `node scripts/run-integration-tests.mjs tests/int/wingsGoLeadCompatibility.int.spec.ts`:
    ```
    Test Files  1 passed (1)
         Tests  9 passed (9)
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

- **Production Build (`pnpm run build` - minh chứng B1):**
  ```
  ✓ Compiled successfully in 37.4s
    Running TypeScript ...
    Finished TypeScript in 64s ...
    Collecting page data using 19 workers ...
    Generating static pages using 19 workers (20/20) in 1138ms
    Finalizing page optimization ...
  Route (app)
  ...
  > website@1.0.0 postbuild E:\repo\WingsTravel-us093\app
  > node scripts/prepare-standalone.mjs
  ```
  -> **Build thành công hoàn toàn, exit code 0.**

