# Báo cáo Kiểm thử & Đánh giá Thành phần Thị trường (Market Component Review) — US-083

- **Thời gian thực hiện:** 2026-10-21T00:08:00+07:00
- **Workspace:** `E:\repo\WingsTravel`
- **Tệp sở hữu độc quyền:**
  1. [`app/tests/component/marketPromotion.component.spec.tsx`](file:///E:/repo/WingsTravel/app/tests/component/marketPromotion.component.spec.tsx) (7,519 bytes $\le$ 15KB)
  2. [`artifacts/tmp/us083-promotion-visual-search-20261020/agy-market-component-review.md`](file:///E:/repo/WingsTravel/artifacts/tmp/us083-promotion-visual-search-20261020/agy-market-component-review.md)
- **Cam kết tuân thủ:** Không sửa đổi mã nguồn sản phẩm, không commit/build/deploy, không spawn subagent, không quét ngoài repo; mỗi lệnh ghi file $\le$ 15KB, không Delete+Add.

---

## 1. Kết quả Chạy Kiểm thử Thành phần (Component Test Results)

- **Lệnh thực thi:**
  ```powershell
  pnpm --dir app exec vitest run --config vitest.component.config.mts tests/component/marketPromotion.component.spec.tsx
  ```
- **Mã thoát (Exit Code):** `0`
- **Kết quả:** `1 passed (1 file)`
- **Số lượng Tests:** `9 passed (9/9, 100% PASS)`
- **Thời gian chạy:** `6.34s` (thời gian chạy tests: `119ms`)
- **Số lỗi (Errors):** `0`

### Kiểm tra Hồi quy Bộ Kiểm thử Liên quan:
- `tests/component/marketDepartureCta.component.spec.tsx`: `4/4 passed (100% PASS)`
- `tests/component/promotionPrice.component.spec.tsx`: `11/11 passed (100% PASS)`
- **Tổng cộng 24/24 tests PASS sạch trên toàn bộ luồng thương mại thị trường & hiển thị giá.**

---

## 2. Chi tiết 9 Ca Kiểm thử trong [`marketPromotion.component.spec.tsx`](file:///E:/repo/WingsTravel/app/tests/component/marketPromotion.component.spec.tsx)

1. **`renders verified future departure promotion with original del before red sale price and image badge` (PASS):**
   - Khởi tạo card tour thị trường Nhật Bản với `nextDeparture.departureDate = '2030-04-15'` (ngày tương lai động 2030+), `priceFrom = 23.500.000`, `originalPrice = 28.000.000`, `promoLabel = 'Hoa anh đào 2030'`.
   - Hiển thị đầy đủ badge `PromotionBadge` đè trên ảnh card.
   - Thẻ `<del>` chứa giá gốc (`28.000.000 ₫`) đứng **trước** giá bán nổi bật màu đỏ (`23.500.000 ₫`).
   - Khẳng định giá `tour.lowestPrice` giả lập (`8.888.888 ₫`) **hoàn toàn không bị hiển thị hay trộn lẫn** vào giá đợt đã xác minh.
   - Nhãn định danh hiển thị chuẩn `"Giá theo đợt"`.
2. **`renders English market page with "Selected departure" label and promo prices` (PASS):**
   - Đổi locale sang `en`: nhãn hiển thị `"Selected departure"`, badge và giá ưu đãi `<del>` render chính xác theo hợp đồng DTO.
3. **`suppresses promo badge when promoLabel is numeric-only but keeps valid discount` (PASS):**
   - Khi `promoLabel` là chuỗi số thuần (`"28000000"`): badge trên ảnh bị ẩn hoàn toàn, trong khi giá ưu đãi `<del> 28.000.000 ₫</del>` và giá bán đỏ vẫn hoạt động bình thường.
4. **`omits <del> and red styling when originalPrice <= priceFrom` (PASS):**
   - Khi giá gốc bằng giá bán (`23.5M` vs `23.5M`): không hiển thị `<del>`, không có class màu đỏ `text-red-600`.
5. **`falls back to contact label and hides promo badge when departure is unverified` (PASS):**
   - Khi `commerceVerified = false`: ẩn badge và `<del>`, fallback về nhãn liên hệ `"Liên hệ"`.
6. **`falls back to contact label and hides promo badge when departure is sold-out` (PASS):**
   - Khi `availabilityStatus = 'sold-out'`: ẩn badge và `<del>`, fallback về nhãn liên hệ `"Liên hệ"`.
7. **`falls back to contact label and hides promo badge when departure date is in the past` (PASS):**
   - Khi `departureDate = '2020-05-01'` (lịch trong quá khứ): hàm `getFutureDepartures` lọc ra mảng rỗng, `canPromote = false`, tự động fallback về `"Liên hệ"`.
8. **`falls back to contact label when priceFrom is zero, negative, or currency is missing` (PASS):**
   - Khi `priceFrom = 0`: `normalizeGovernedTourPrice` trả về `null`, ẩn badge và fallback về `"Liên hệ"`.
9. **`falls back to contact label in English when nextDeparture is null` (PASS):**
   - Khi tour chưa có lịch khởi hành: fallback an toàn sang `"Contact us"`, không lỗi runtime.

---

## 3. Đánh giá Kỹ thuật Bản Vá [`StructuredPages.tsx`](file:///E:/repo/WingsTravel/app/src/tours/StructuredPages.tsx) (Source Audit)

### 3.1. Cơ chế Cổng `canPromote`
Root đã cài đặt điều kiện chặt chẽ tại dòng 3609:
```tsx
const departure = tour.nextDeparture
const canPromote = Boolean(
  departure?.commerceVerified === true &&
  departure.availabilityStatus !== 'sold-out' &&
  getFutureDepartures([departure]).length > 0 &&
  normalizeGovernedTourPrice({ currency: departure.currency, value: departure.priceFrom }),
)
```
- **Xác minh tính hợp lệ:** Bắt buộc phải là đợt khởi hành tương lai (`getFutureDepartures`), đã xác minh thương mại (`commerceVerified === true`), chưa kín chỗ (`!= sold-out`), và có giá dương kèm tiền tệ hợp lệ (`normalizeGovernedTourPrice`).
- **An toàn Null/Undefined:** Sử dụng optional chaining `departure?.` giúp ngăn chặn triệt để lỗi TypeError khi `tour.nextDeparture` không tồn tại.

### 3.2. Hiển thị Giá & Tránh Trộn lẫn Dữ liệu
- Loại bỏ hoàn toàn việc dùng `formatTourPrice(tour.lowestPrice)` không có tiền tệ trước đây.
- Sử dụng trực tiếp `PromotionPrice`:
  ```tsx
  <PromotionPrice
    contactLabel={locale === 'en' ? 'Contact us' : 'Liên hệ'}
    currency={departure?.currency}
    originalPrice={departure?.originalPrice}
    price={departure?.priceFrom}
  />
  ```
- Nhãn phụ được chuẩn hóa: `locale === 'en' ? 'Selected departure' : 'Giá theo đợt'`, phản ánh chính xác ngữ nghĩa giá theo đợt khởi hành thay vì "Giá tham khảo" mơ hồ.

### 3.3. Chống Tràn Giao diện Di động
- Badge ảnh đặt trong `absolute inset-x-3 top-3 z-10 flex justify-start` kế thừa `[overflow-wrap:anywhere]` từ `PromotionBadge`.
- Khối giá sử dụng `flex flex-wrap items-end justify-between gap-3`, an toàn tuyệt đối trên màn hình hẹp (375px/390px).

---

## 4. Kết luận

- **Phát hiện lỗi tồn đọng:** **0 P1 / 0 P2 / 0 P3**. Bản vá của Root tại `StructuredPages.tsx` đạt độ chuẩn xác 100%.
- **Trạng thái kiểm thử:** Bộ kiểm thử mới [`marketPromotion.component.spec.tsx`](file:///E:/repo/WingsTravel/app/tests/component/marketPromotion.component.spec.tsx) (9 tests) chạy thành công 100% với exit code 0.
- **Sẵn sàng:** Hoàn tất nhiệm vụ, sẵn sàng cho khâu tích hợp và kiểm thử trình duyệt production tiếp theo.
