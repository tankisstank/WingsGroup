# RFC: Chuẩn hóa logic hiển thị "Giá từ" và "Giá theo đợt" trên Tour Detail (WingsGo / Retail Decision Rail)

**Tác giả:** Antigravity Engineering  
**Ngày:** 2026-10-08  
**Trạng thái:** Chờ tham vấn Reviewer Codex  
**Phạm vi áp dụng:** WingsGo Retail Tour Detail (`app/src/tours/StructuredPages.tsx`, `app/src/tours/TourDepartureSelectionContext.tsx`, `app/src/tours/queries.ts`)

---

## 1. Bối cảnh & Vấn đề hiện tại (Problem Statement)

Trên hệ thống WingsGo, tại trang chi tiết tour (ví dụ thực tế **Tour ID 133** - "ĐÓN TẾT TẠI NHẬT BẢN..."):
- **Dữ liệu cấu hình trong CMS Admin:**
  - `TourProduct.priceFrom`: `45.900.000 VND` (trường "Giá từ" trên TourProduct).
  - Tour có 4 đợt khởi hành mở bán công khai:
    - Đợt 211 (06/02/2027): `49.900.000 VND`
    - Đợt 212 (07/02/2027): `49.900.000 VND`
    - Đợt 213 (08/02/2027): `47.900.000 VND`
    - Đợt 214 (10/02/2027): `45.900.000 VND`
  - Mức giá thấp nhất trong các đợt mở bán là `45.900.000 VND` (khớp hoàn toàn với `priceFrom` của TourProduct).

- **Hiện tượng trên giao diện người dùng:**
  - Khi truy cập trang tour, tại panel đặt tour bên phải (`RetailDecisionRail`), khung giá hiển thị:
    ```
    GIÁ TỪ
    49.900.000 đ / khách
    ```
  - Dropdown "Đợt khởi hành" tự động chọn Đợt 211 (06/02/2027 - giá 49.900.000).

- **Nguyên nhân kỹ thuật:**
  1. `queries.ts` gán `nextDeparture = getNextDeparture(validPublicDepartures)` bằng cách lấy phần tử đầu tiên theo ngày khởi hành (`getFutureDepartures(departures)[0]`). Ngày gần nhất là 06/02/2027 với giá 49.900.000.
  2. `TourDepartureSelectionContext.tsx` gán `selectedDeparture = initialDeparture = nextDeparture`.
  3. `RetailDecisionRail` (`StructuredPages.tsx`):
     - Tiêu đề cố định hardcode: `{isPrivateTour ? 'Báo giá theo đoàn' : 'Giá từ'}`.
     - Số tiền hiển thị: `formatTourPrice(nextDeparture?.priceFrom, nextDeparture?.currency)`.
  4. Hệ quả: Dù nhãn ghi to là **"GIÁ TỪ"**, nhưng giá hiển thị lại là **49.900.000** (giá của ngày gần nhất), thay vì giá khởi điểm thấp nhất của tour (**45.900.000**). Khi người dùng chọn bất kỳ đợt nào khác trong dropdown, nhãn ở trên vẫn luôn là "GIÁ TỪ".

---

## 2. Đề xuất kỹ thuật & UX (Proposed Solutions)

### Tùy chọn 1: Cải tiến khởi tạo đợt mặc định (`findBestDeparture` ưu tiên Best Price)
- Trong `TourDepartureSelectionContext.tsx`:
  - Hàm `findBestDeparture(deps)` và `initialDeparture` sẽ ưu tiên đợt mở bán còn chỗ có **giá thấp nhất** (`lowest price`); nếu có nhiều đợt cùng giá thấp nhất thì chọn đợt có ngày khởi hành gần nhất.
- Khi người dùng tải trang:
  - Dropdown tự động chọn Đợt 214 (10/02/2027 - giá 45.900.000).
  - Khung giá hiển thị: "GIÁ TỪ: 45.900.000 đ / khách".
  - Ưu điểm: Đơn giản, tự động khớp nhãn và đợt khởi hành mà không làm đổi cấu trúc component.

### Tùy chọn 2: Phân tách rõ ràng giữa "Giá sàn tour" và "Giá đợt chọn" (Dynamic Label & Price Fallback)
- Khung giá không hiển thị cứng một nhãn "GIÁ TỪ" cho mọi trường hợp:
  - Nếu đợt đang xem là đợt có mức giá thấp nhất hoặc khi chưa chọn đợt cụ thể:
    - Nhãn: **GIÁ TỪ**
    - Giá: `lowestPrice` (`45.900.000 đ / khách`).
  - Nếu người dùng chọn một đợt khởi hành cụ thể có giá cao hơn (ví dụ đợt 06/02 giá 49.900.000):
    - Nhãn chuyển thành: **GIÁ ĐỢT NÀY** (hoặc **GIÁ THEO ĐỢT**): `49.900.000 đ / khách`.
    - Hiển thị thêm dòng ghi chú phụ nhỏ bên dưới: *(Giá tour khởi điểm từ 45.900.000 đ cho các đợt khác)*.

### Tùy chọn 3: Kết hợp cả 1 và 2 (Khuyến nghị toàn diện)
- Kết hợp cả hai:
  1. `initialDeparture` mặc định chọn đợt có giá tốt nhất (Best Price) còn mở bán.
  2. Dynamic Label: Nhãn tự động thích ứng:
     - Khi đợt đang chọn có `priceFrom === lowestPrice`: Nhãn là **GIÁ TỪ** (45.900.000 đ/khách).
     - Khi người dùng đổi dropdown sang đợt có giá cao hơn: Nhãn chuyển sang **GIÁ ĐỢT NÀY** (49.900.000 đ/khách), kèm chú thích nhỏ giá khởi điểm sàn của tour.

---

## 3. Câu hỏi tham vấn Reviewer Codex

1. Về mặt tiêu chuẩn travel e-commerce và UX chuyển đổi (conversion rate), Codex đánh giá Tùy chọn 1, 2 hay 3 là phù hợp và minh bạch nhất với người dùng?
2. Có bất kỳ xung đột nào giữa việc chọn đợt mặc định theo `lowest price` với các quy ước trước đây (như ADR 0030 hoặc consultative mode trên WingSide) không?
3. Cần lưu ý gì về các bài test hiện có (`retailTour*.component.spec.tsx`, `TourDepartureMatrix.tsx`) để đảm bảo không hồi quy kiểm thử?
