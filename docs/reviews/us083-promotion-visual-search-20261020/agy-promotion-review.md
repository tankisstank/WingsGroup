# Báo cáo Kiểm thử & Đánh giá Kỹ thuật (Promotion Visual Delta Review) — US-083

- **Thời gian thực hiện:** 2026-10-20T23:50:00+07:00
- **Workspace:** `E:\repo\WingsTravel`
- **Tệp sở hữu độc quyền:**
  1. [`app/tests/component/promotionPrice.component.spec.tsx`](file:///E:/repo/WingsTravel/app/tests/component/promotionPrice.component.spec.tsx) (10,377 bytes $\le$ 15KB)
  2. [`artifacts/tmp/us083-promotion-visual-search-20261020/agy-promotion-review.md`](file:///E:/repo/WingsTravel/artifacts/tmp/us083-promotion-visual-search-20261020/agy-promotion-review.md)
- **Cam kết tuân thủ:** Không sửa đổi source production, không commit/build/deploy, không spawn subagent, không truy cập dữ liệu production hay ngoài repo.

---

## 1. Kết quả Chạy Kiểm thử Thành phần (Component Test Execution)

- **Lệnh thực thi:**
  ```powershell
  pnpm --dir app exec vitest run --config vitest.component.config.mts tests/component/promotionPrice.component.spec.tsx
  ```
- **Mã thoát (Exit Code):** `0`
- **Kết quả:** `1 passed (1 file)`
- **Số lượng Tests:** `11 passed (11/11, 100% PASS)`
- **Thời gian chạy:** `3.07s` (thời gian chạy tests: `167ms`)
- **Số lỗi (Errors):** `0`

### Kiểm tra hồi quy các bộ test liên quan:
- `tests/component/heroPresentations.component.spec.tsx`: `7/7 passed (100% PASS)`
- `tests/component/wingsGoTourCatalog.component.spec.tsx`: `4/4 passed (100% PASS)`

---

## 2. Chi tiết 11 Ca Kiểm thử trong [`promotionPrice.component.spec.tsx`](file:///E:/repo/WingsTravel/app/tests/component/promotionPrice.component.spec.tsx)

### 2.1. Đơn vị `PromotionPrice` (Price Formatting & Bounds)
1. **`renders original price in <del> before sale price with red styling when discount is valid` (PASS):**
   - Giá gốc xuất hiện trong thẻ `<del>` (`15.000.000 ₫`) nằm **trước** giá bán trong cây DOM.
   - Giá bán có class nổi bật màu đỏ: `font-extrabold text-red-600 dark:text-red-400`.
2. **`does not render <del> or red styling when originalPrice <= price` (PASS):**
   - Khi giá gốc bằng giá bán (`12M` vs `12M`) hoặc giá gốc nhỏ hơn giá bán (`10M` vs `12M`): không xuất hiện thẻ `<del>`, không gắn class đỏ `text-red-600`.
3. **`does not render <del> when originalPrice is zero, negative, NaN, null, or undefined` (PASS):**
   - Giá trị gốc bất thường (`0`, `-5M`, `NaN`, `+Infinity`, `null`, `undefined`) đều chặn hiển thị `<del>`.
4. **`does not render <del> when sale price is zero, negative, or non-finite, falling back to contactLabel` (PASS):**
   - Khi giá bán không hợp lệ (`0`, âm, `NaN`, `null`): không hiển thị `<del>`, fallback về nhãn liên hệ (`"Liên hệ"` hoặc `"Contact us"`).

### 2.2. Đơn vị `isDisplayablePromoLabel` & `PromotionBadge`
5. **`isDisplayablePromoLabel rejects numeric-only strings and empty/non-string values` (PASS):**
   - Chặn các chuỗi chỉ chứa số và ký tự phân cách (`"12000000"`, `"12.000.000"`, `" 12,000,000 "`, `"12-000-000"`, `"12 000 000"`), chuỗi rỗng và kiểu dữ liệu không phải string.
6. **`isDisplayablePromoLabel accepts marketing text labels` (PASS):**
   - Chấp nhận các nhãn quảng bá hợp lệ: `"Mùa lá đỏ"`, `"Flash Sale 20%"`, `"Ưu đãi hè"`, `"Hot Deal - Giảm 500k"`.
7. **`PromotionBadge renders badge markup for valid text and returns null for numeric-only or empty` (PASS):**
   - Render badge với class gradient cam/hổ phách (`bg-gradient-to-r from-orange-500 to-amber-500`); trả về `null` đối với chuỗi số hoặc rỗng.

### 2.3. Tích hợp DTO trên `WingsGoTourCard` & `HighImpactHero`
8. **`renders WingsGoTourCard with promo badge, original price in <del>, and red sale price` (PASS):**
   - Kiểm thử Card dùng fixture DTO cùng departure: hiển thị badge `"Mùa lá đỏ"` trên ảnh và `<del>` giá gốc trước giá bán đỏ.
9. **`omits <del> and promo badge on WingsGoTourCard when originalPrice <= value or promoLabel is numeric-only` (PASS):**
   - Khi DTO không đủ điều kiện giảm giá hoặc nhãn là chuỗi số: thẻ `<del>` và badge đều bị ẩn.
10. **`renders HighImpactHero hot offers row with PromotionBadge on image and PromotionPrice DTO` (PASS):**
    - Kiểm thử khối Hero HighImpact (`variant="retail-departures"`): ảnh hàng hot-offer có `PromotionBadge` đè lên góc trên bên trái, thông tin giá sử dụng DTO `PromotionPrice` (có `<del>` trước giá bán).
11. **`omits <del> and badge in HighImpactHero when originalPrice is missing and promoLabel is numeric-only` (PASS):**
    - Khối hot-offer ẩn badge và `<del>` khi dữ liệu DTO không có ưu đãi hợp lệ.

---

## 3. Kết quả Kiểm toán Mã nguồn Visual Delta (Source Audit)

### 3.1. Phân tích Phát hiện Codex P2 (Detail Promo Badge & Empty Selection)
- **Vấn đề Codex nêu:** Tại `StructuredPages.tsx:1065`, trước đây khi người dùng lọc thành phố/tháng không có lịch phù hợp, `context.selectedDeparture` trở thành `null`, nhưng header vẫn fallback sang `nextDepartureProp`. Điều này khiến badge ưu đãi vẫn hiển thị trên ảnh header trong khi bảng giá ở rail chuyển sang `"Liên hệ"`.
- **Hiện trạng mã nguồn mới nhất:** Root đã chỉnh sửa trực tiếp và khắc phục triệt để tại [`StructuredPages.tsx:1065-1070`](file:///E:/repo/WingsTravel/app/src/tours/StructuredPages.tsx#L1065-L1070):
  ```tsx
  const context = useTourDepartureSelection()
  const nextDeparture = context
    ? context.isPrivateTour
      ? null
      : context.selectedDeparture
    : nextDepartureProp
  ```
  Khi `context` tồn tại, `nextDeparture` nhận giá trị từ `context.selectedDeparture` mà không fallback sang `nextDepartureProp`. Do đó, khi không có lịch khớp bộ lọc, `nextDeparture` là `null`, badge ưu đãi và giá đồng bộ chuyển về trạng thái không có ưu đãi.
- **Đánh giá:** **ĐÃ ĐƯỢC ROOT XỬ LÝ (RESOLVED)**.

### 3.2. Tính Nhất quán DTO Thương mại & Chống Fake Discount
- Trong [`wingsGoCatalog.ts:233-255`](file:///E:/repo/WingsTravel/app/src/tours/wingsGoCatalog.ts#L233-L255) và [`queries.ts:245-285`](file:///E:/repo/WingsTravel/app/src/tours/queries.ts#L245-L285), giá bán, giá gốc và nhãn promotion đều được trích xuất từ cùng một đối tượng `commercialDeparture` đã qua xác minh (`commerciallyVerified`).
- Điều kiện `canShowDiscount` kiểm tra nghiêm ngặt:
  - Khởi hành không ở trạng thái `sold-out`.
  - Giá gốc dạng số strictly lớn hơn giá bán (`originalPrice > priceFrom`).
  - Tiền tệ đồng nhất (`!originalCurrency || originalCurrency === currency`).
- Đảm bảo tuyệt đối không có hiện tượng ghép chéo giữa các đợt khởi hành khác nhau.

### 3.3. Hiển thị Mobile & Chống Tràn Ngang (Mobile Overflow Prevention)
- [`PromotionBadge.tsx:15`](file:///E:/repo/WingsTravel/app/src/tours/PromotionPrice.tsx#L15) cấu hình `max-w-full w-fit break-words [overflow-wrap:anywhere]`.
- [`PromotionPrice.tsx:36`](file:///E:/repo/WingsTravel/app/src/tours/PromotionPrice.tsx#L36) cấu hình `flex flex-wrap items-baseline gap-x-2 gap-y-1`.
- Các container tại `WingsGoTourCard` và `HighImpact` đều bọc trong `inset-x-1` / `inset-x-3` kèm flex-wrap, loại bỏ nguy cơ tràn layout trên màn hình hẹp (390px, 375px).

---

## 4. Kết luận Đánh giá (Review Verdict)

- **Số lượng phát hiện lỗi còn tồn tại:** **0 P1 / 0 P2 / 0 P3**.
- **Toàn vẹn mã nguồn:** File test độc quyền đạt 11/11 tests PASS; không có chỉnh sửa ngoài phạm vi; dirty baseline được bảo toàn.
- **Sẵn sàng:** Gói visual delta cho promotion (HighImpact, TourCard, StructuredPages, Homepage) đáp ứng đầy đủ yêu cầu nghiệp vụ và kỹ thuật để sẵn sàng cho quy trình phát hành.
