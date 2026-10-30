# US-093 Phase 4 — Execution Report

## 1. Tóm tắt

Phase 4 của US-093 (WingsGo Departure Schedule v2 — Chế độ xem theo hành trình `view=tour`, khối "Trước khi giữ chỗ" `WingsGoScheduleAssurance`, và hoàn thiện các sửa nhỏ của Phase 3) đã được triển khai hoàn chỉnh trên worktree `E:\repo\WingsTravel-us093`, nhánh `feat/us-093-departure-schedule-v2`.

Toàn bộ các yêu cầu của `phase4-brief.md`, `design.md` và `execplan.md` cho Phase 4 đã được thực hiện:
- **`WingsGoScheduleTourList.tsx` (Chế độ xem theo hành trình `view=tour`):**
  - Gom các đợt khởi hành theo từng tour bằng hàm thuần `groupScheduleRowsByTour` chạy trên danh sách các row đã lọc.
  - Sắp xếp các nhóm tour theo tham số `sort`:
    - `sort=price`: tour có giá VND xếp trước (tăng dần), sau đó đến tour USD (tăng dần), cuối cùng là tour không có giá; tie-break bằng ngày khởi hành sớm nhất.
    - `sort=date`: sắp xếp theo ngày khởi hành sớm nhất của từng nhóm tour.
  - Thẻ tour:
    - Ảnh tour (`tour.media`), tích hợp fallback placeholder chuẩn như `WingsGoTourCard`.
    - Tour hot hiển thị viền `hot-rainbow-card border-transparent` và nhãn ẩn trợ năng `<span className="sr-only">` (tuân thủ nghiêm ngặt Q3: chỉ áp dụng ở cấp độ thẻ tour, không áp dụng trên hàng vé).
    - Huy hiệu sticker biên tập (`specialized`, `vip`) theo chuẩn US-084. Thẻ không có badge không có class thừa.
    - Nhãn thị trường, thời lượng tour và tiêu đề tour là link tới trang tour (`SiteLink`).
  - "Giá từ" (`priceFrom`):
    - Tính toán theo quy tắc tiền tệ chặt chẽ (chỉ xét các đợt `canHoldSeat` đang hiển thị; ưu tiên VND, nếu không có VND mới xét USD).
    - Hiển thị giá gốc (`<del>`), nhãn khuyến mại `PromotionBadge` và nhãn khẩn cấp `urgencyLabel` của **chính đợt rẻ nhất được chọn** (`chosenRow`).
    - Nếu tour không có đợt nào có thể giữ chỗ (`canHoldSeat === false` hoặc không có giá), hiển thị nhãn "Liên hệ báo giá" / "Contact for quote".
  - Chip ngày khởi hành (`.dates`):
    - Hiển thị 6 chip ngày đầu tiên; mỗi chip là một link (`SiteLink`) trỏ thẳng tới `row.ctaHref` của đúng đợt đó với nhãn `aria-label` đầy đủ ngày và tình trạng chỗ.
    - **Hợp đồng Hydration D8:** SSR và lần render đầu tiên hiển thị toàn bộ mọi chip ngày mà không có thuộc tính `hidden`. Sau khi mount (`enhanced = true`), các chip từ thứ 7 trở đi mới được gán `hidden={!isExpanded}`.
    - Nút "+N ngày khác" chỉ render sau khi enhance (`enhanced && hasMore`), có đầy đủ `aria-expanded` và `aria-controls`, cho phép mở rộng / thu gọn danh sách ngày mượt mà.
  - Chân thẻ tour hiển thị tổng số đợt, danh sách hãng hàng không và nút link "Xem tour →".
- **`WingsGoScheduleAssurance.tsx` (Khối "Trước khi giữ chỗ", D14):**
  - Trình bày 3 bước quy trình theo locale chuẩn xác (copy tĩnh từ `wingsGoScheduleCopy.ts`):
    - 01: Chọn đợt khởi hành.
    - 02: Gửi yêu cầu (kèm tên tour và ngày đi).
    - 03: Xác nhận rồi mới đặt cọc (kiểm tra số chỗ, giá, điều kiện visa).
  - Hotline động lấy từ cấu hình site (prop `hotlines` của `TourSchedulePage`), định dạng chuẩn qua `formatHotlineDisplay`; tuyệt đối không hard-code số điện thoại.
  - Link Zalo OA tự động hiển thị khi có cấu hình site (`zaloCTA`).
  - Nút "Trao đổi với chuyên viên" (`SiteLink`) dẫn tới `/lien-he` theo locale.
  - Tích hợp thay thế hoàn toàn khối CTA tạm của Phase 3 trong `StructuredPages.tsx`, đảm bảo không có 2 khối trùng nhau và không có section nền tối giữa trang.
- **Sửa nhỏ Phase 3:**
  - **Fix 3.1:** Tiêu đề tháng trong `WingsGoScheduleDateList.tsx` không còn lặp năm (chỉ hiển thị một lần duy nhất "Tháng 11/2026" / "November 2026", đã bỏ thẻ `<small>` thừa kế bên).
  - **Fix 3.2:** Chip "Tất cả" trong thanh lọc `WingsGoScheduleFilterBar.tsx` đếm đúng tổng số đợt khi **bỏ** bộ lọc `market` (tuân thủ chuẩn facet counting, không còn hiển thị số row đang bị lọc).
  - **Fix 3.3:** Quản lý trạng thái URL chuẩn mực:
    - Thao tác lọc rời rạc (chọn thị trường, tháng, hãng bay, tình trạng chỗ, sắp xếp, chế độ xem, xoá bộ lọc) sử dụng `pushState` để các nút Back/Forward của trình duyệt quay lại trạng thái trước.
    - Thao tác gõ tìm kiếm (sau debounce 250ms) sử dụng `replaceState` để không làm ô nhiễm lịch sử duyệt.
    - `syncToURL` được gọi hoàn toàn bên ngoài updater của `setFilters`, đảm bảo render function luôn pure và an toàn với React concurrent mode.
    - Sự kiện `popstate` khôi phục chính xác trạng thái bộ lọc từ URL khi người dùng điều hướng lịch sử.

---

## 2. File đã sửa và tạo mới

### Mã nguồn ứng dụng
1. `app/src/tours/WingsGoScheduleTourList.tsx` (tạo mới) — Client presentation component hiển thị danh sách đợt khởi hành gom nhóm theo tour (`view=tour`).
2. `app/src/tours/WingsGoScheduleAssurance.tsx` (tạo mới) — Presentation component hiển thị khối "Trước khi giữ chỗ" (D14) gồm 3 bước, hotline động và Zalo OA.
3. `app/src/tours/WingsGoScheduleBrowser.tsx` (sửa đổi) — Kết nối `WingsGoScheduleTourList` khi `view === 'tour'`, truyền `totalMarketCount` cho chip Tất cả, và chuẩn hóa `syncToURL` với `pushState` / `replaceState` bên ngoài updater.
4. `app/src/tours/WingsGoScheduleDateList.tsx` (sửa đổi) — Sửa lỗi lặp năm trong tiêu đề nhóm tháng.
5. `app/src/tours/wingsGoScheduleCopy.ts` (sửa đổi) — Bổ sung các bản dịch tiếng Việt và tiếng Anh chuẩn mực cho Phase 4 (khối assurance, chip ngày, và nhãn tour list).
6. `app/src/tours/StructuredPages.tsx` (sửa đổi) — Thay thế khối CTA cuối trang tạm bằng `WingsGoScheduleAssurance`.

### File kiểm thử
7. `app/tests/component/wingsGoSchedulePhase4.component.spec.tsx` (tạo mới) — 13 tests component kiểm thử toàn diện các tính năng của Phase 4 và 3 điểm sửa lỗi của Phase 3.

---

## 3. Quyết định kỹ thuật nhỏ

1. **Chuẩn hóa URL History Mode:**
   - Phân biệt rõ hai chế độ cập nhật URL:
     - `mode = 'replace'`: dành riêng cho việc cập nhật ô tìm kiếm text (`q`) sau debounce, tránh tạo quá nhiều lịch sử trình duyệt khi người dùng gõ từ khóa.
     - `mode = 'push'`: dành cho các hành động chọn facet rời rạc (click market, month, airline, status, sort, view, reset).
   - Tách rời lời gọi `window.history.pushState / replaceState` ra khỏi updater callback của `setFilters`, tuân thủ nguyên tắc pure state setter của React.
2. **Quy tắc tính "Giá từ" trong Chế độ Tour:**
   - Chỉ xem xét các đợt có `canHoldSeat === true` và có giá hợp lệ.
   - Ưu tiên chọn đợt VND rẻ nhất; nếu không có đợt VND mới tìm đợt USD rẻ nhất.
   - Đợt được chọn (`chosenRow`) cung cấp chính xác `originalPrice`, `promoLabel` và `urgencyLabel` tương ứng, không pha trộn dữ liệu giữa các đợt khác nhau của tour.
3. **Phản hồi trạng thái rỗng trong Chế độ Tour:**
   - Khi bộ lọc không khớp đợt nào, `WingsGoScheduleBrowser` kích hoạt `WingsGoScheduleEmpty` thống nhất, giúp người dùng nhận được các gợi ý gỡ bỏ bộ lọc và nút liên hệ tư vấn nhanh chóng.
4. **Cô lập Artifacts Story:**
   - Toàn bộ 8 ảnh chụp màn hình kiểm thử giao diện của Phase 4 được lưu tập trung trong thư mục story `docs/stories/epics/E07-tour-product-platform/US-093-wingsgo-departure-schedule-v2/artifacts/phase4/`, không lưu trùng ở thư mục `artifacts/` gốc repository.

---

## 4. Kết quả chạy cổng kiểm tra thực tế

### 4.1 TypeScript (`tsc --noEmit`)
```powershell
pnpm --dir app exec tsc --noEmit
```
**Kết quả:** Exit code 1 với đúng 2 lỗi baseline pre-existing tại `wingsGroupCorporateRoutes.unit.spec.ts`:
- `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(116,21): error TS2353: Object literal may only specify known properties, and 'type' does not exist in type '{ richText?: unknown; }'.`
- `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts(155,9): error TS2322: Type '"lo"' is not assignable to type '"vi" | "en" | "it" | "es" | "pt" | "ja" | "ko" | "fr" | "de" | null | undefined'.`
Tất cả các file của Phase 4 và module WingsGo có **0 lỗi TypeScript**.

### 4.2 ESLint
```powershell
pnpm --dir app exec eslint src/tours/WingsGoScheduleTourList.tsx src/tours/WingsGoScheduleAssurance.tsx src/tours/WingsGoScheduleBrowser.tsx src/tours/WingsGoScheduleDateList.tsx src/tours/wingsGoScheduleCopy.ts
```
**Kết quả:** Exit code 0 (0 errors, 1 warning chuẩn `@next/next/no-img-element`).

### 4.3 Component Tests
```powershell
pnpm --dir app run test:component
```
**Kết quả:** 66/66 test files passed, 466/466 tests passed (100%):
```
 ✓ tests/component/wingsGoSchedulePhase4.component.spec.tsx (13 tests) 379ms
   - WingsGoScheduleTourList:
     • groups multiple departure rows by tour and links each date chip to row.ctaHref
     • implements D8 hydration contract: first 6 chips visible, remaining chips hidden after enhance, expanded on toggle
     • calculates priceFrom with USD-only tour by selecting lowest USD row where canHoldSeat is true
     • prioritizes lowest VND price over USD price when both are present
     • displays Liên hệ báo giá when tour has no rows with canHoldSeat true
     • preserves promo and original price of the exact chosen row
     • renders hot-rainbow-card on tour card with sr-only label, and editorial stickers
   - WingsGoScheduleAssurance:
     • renders 3 numbered steps, contact CTA to /lien-he, hotline and Zalo
     • handles absence of hotlines and Zalo gracefully without crashing
     • renders 100% English without any Vietnamese words when locale is en
   - Phase 3 Small Fixes:
     • Fix 3.1: Month title does not duplicate year (shows Tháng 11/2026 once, no trailing year)
     • Fix 3.2: Chip Tất cả counts total when dropping market filter
     • Fix 3.3: popstate restores filter state in browser
```

### 4.4 Unit Tests
```powershell
pnpm --dir app run test:unit
```
**Kết quả:** 170 passed | 1 failed (171 test files, 1.445 tests passed). Chỉ còn đúng 1 lỗi baseline pre-existing tại `wingsGroupV3Shell.unit.spec.ts`.

### 4.5 Integration Tests
```powershell
pwsh -Command "Set-Location app; node scripts/run-integration-tests.mjs tests/int/wingsGoScheduleIntegration.int.spec.ts"
```
**Kết quả:** 5/5 tests passed (100%):
```
 ✓ tests/int/wingsGoScheduleIntegration.int.spec.ts (5 tests) 41629ms
     ✓ reads > 200 departures across at least two pages, without truncation, sorted and deduplicated
     ✓ populates editorialBadges, site, and _status (defeating defaultPopulate omission); verifies media handling and draft/foreign exclusion
     ✓ WingsGo homepage getResolvedScheduleData gives stable output across empty, past-only, and future inventory
```

### 4.6 Production Build (`next build`)
```powershell
pnpm --dir app run build
```
**Kết quả:** Exit code 0.
- Turbopack compilation thành công trong 37.9s.
- TypeScript build check passed trong 53s với 0 errors.
- 20 static pages generated thành công trong 2.3s.
- Standalone bundle được đóng gói hoàn tất.

---

## 5. Bằng chứng kiểm tra SSR qua `curl` cho `?view=tour`

Kiểm tra trực tiếp trên dev server local (`http://wingsgo.vn:3000`):

### 5.1 Tiếng Việt: `/lich-khoi-hanh?view=tour`
```bash
curl.exe -s -i -H "Host: wingsgo.vn" "http://127.0.0.1:3000/lich-khoi-hanh?view=tour"
```
**Kết quả xác minh:**
- HTTP Status: `200 OK`
- Robots tag: `<meta name="robots" content="noindex, follow"/>` (tham số `view` nằm trong whitelist nên được áp dụng noindex chính xác).
- Canonical URL: `<link rel="canonical" href="https://wingsgo.vn/lich-khoi-hanh"/>` (canonical luôn sạch).
- Khối Assurance SSR: `<section class="wingsgo-schedule-assurance..." id="assurance">` có mặt trọn vẹn trong HTML.
- Thẻ tour SSR: Có đầy đủ 17 thẻ tour (`wingsgo-schedule-tour-card`).
- Liên kết tour SSR: Chứa đầy đủ 34 liên kết trỏ tới toàn bộ 17 tour khớp bộ lọc (`/tour/...`).

### 5.2 Tiếng Anh: `/en/lich-khoi-hanh?view=tour`
```bash
curl.exe -s -i -H "Host: wingsgo.vn" "http://127.0.0.1:3000/en/lich-khoi-hanh?view=tour"
```
**Kết quả xác minh:**
- HTTP Status: `200 OK`
- Robots tag: `<meta name="robots" content="noindex, follow"/>`
- Canonical URL: `<link rel="canonical" href="https://wingsgo.vn/en/lich-khoi-hanh"/>`
- Ngôn ngữ: `lang="en"`, 100% nhãn và nội dung bằng tiếng Anh.
- Thẻ tour SSR: Có đầy đủ 17 thẻ tour.
- Liên kết tour SSR: Chứa đầy đủ 34 liên kết trỏ tới 17 tour có tiền tố `/en/tour/...`.

---

## 6. Ảnh chụp màn hình (Visual Verification)

Toàn bộ 8 ảnh chụp màn hình theo yêu cầu đã được lưu trong thư mục story `docs/stories/epics/E07-tour-product-platform/US-093-wingsgo-departure-schedule-v2/artifacts/phase4/`:
1. `schedule-tour-view-desktop-1440-vi.png` — Chế độ xem theo hành trình tiếng Việt trên Desktop (1440px).
2. `schedule-tour-view-mobile-390-vi.png` — Chế độ xem theo hành trình tiếng Việt trên Mobile (390px).
3. `schedule-tour-view-desktop-1440-en.png` — Chế độ xem theo hành trình tiếng Anh trên Desktop (1440px).
4. `schedule-tour-view-mobile-390-en.png` — Chế độ xem theo hành trình tiếng Anh trên Mobile (390px).
5. `schedule-assurance-desktop-1440-vi.png` — Khối "Trước khi giữ chỗ" tiếng Việt trên Desktop (1440px).
6. `schedule-assurance-mobile-390-vi.png` — Khối "Trước khi giữ chỗ" tiếng Việt trên Mobile (390px).
7. `schedule-assurance-desktop-1440-en.png` — Khối "Trước khi giữ chỗ" tiếng Anh trên Desktop (1440px).
8. `schedule-assurance-mobile-390-en.png` — Khối "Trước khi giữ chỗ" tiếng Anh trên Mobile (390px).
