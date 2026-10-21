# US-083 — Hiển thị Discount & Promotion Hấp dẫn trên Card Tour WingsGo

## 1. Trạng thái (Status)

`implemented` — CMS sửa ưu đãi từng departure, shared badge/giá gốc gạch ngang/giá bán đỏ và market pricing đã production `release-us083-promotion-search-market-20261020-172000` lúc 21/10/2026 00:25 +07; bao gồm commit tìm kiếm CMS `58633ae`. Desktop/mobile12/12 đạt. Chi tiết tại `validation.md` và `docs/reviews/us083-promotion-visual-search-20261020.md`.

## 2. Phân làn (Lane)

`high_risk` — giá thương mại, giảm giá ảo và cache stale.

## 3. Hợp đồng Sản phẩm (Product Contract)

Nâng cấp khả năng hiển thị thương mại của các card tour trên site WingsGo, cho phép làm nổi bật các tour có chương trình khuyến mãi, giảm giá (discount) và ưu đãi đặc biệt (promotions) nhằm tăng tính hấp dẫn và kích thích tỷ lệ chuyển đổi.

Hệ thống phải đảm bảo:
1. **Hiển thị Giá Gốc Gạch Ngang (`<del>`):**
   - Khi tour có đợt khởi hành thỏa mãn `originalPrice > priceFrom > 0` và cùng đơn vị tiền tệ (`VND`), card tour hiển thị:
     - Giá bán thực tế (nổi bật, cỡ chữ lớn, màu thương hiệu).
     - Giá gốc gạch ngang: `<del className="line-through text-muted-foreground">{formatTourPrice(originalPrice)}</del>`.
     - Chỉ dùng `promoLabel` đã có dữ liệu hợp lệ; không tự tạo phần trăm hoặc nội dung marketing.
2. **Badge Ưu đãi Nổi bật (Visual Promotion Badge):**
   - Hiển thị badge từ `promoLabel` của cùng departure thương mại đã xác minh; curation hiện có chỉ chọn tour. Không thêm field hoặc override `promoLabel` vào TourCurations trong story này.
   - Thiết kế bắt mắt, bo tròn, hiệu ứng gradient hoặc màu nổi bật nhưng không che lấp tiêu đề hay hình ảnh tour.
3. **Phủ sóng Đồng bộ trên 3 Bề mặt Card Tour:**
   - **Khối Homepage Departure Spotlight (`WingsGoHomepageSections.tsx`):** Khối 3 tour Hàn/Nhật/Trung đầu trang (theo ảnh 3 người dùng cung cấp).
   - **Thẻ Card Catalog Chuẩn (`WingsGoTourCard.tsx`):** Thẻ tour hiển thị trong danh mục tour `/tour`.
   - **Thẻ Card Thị trường & Điểm đến (`StructuredPages.tsx`):** Danh sách tour hiển thị tại các trang thị trường `/tour/han-quoc`, `/tour/nhat-ban`...
4. **Bảo đảm Toàn vẹn Dữ liệu Thương mại (`commerceVerified`):**
   - Tuyệt đối không ghép giá gốc và giá bán từ hai departure khác nhau.
   - Không hiển thị mức giảm giá ảo khi tour đang ở trạng thái `sold-out` (hết chỗ) hoặc `priceFrom = 0` (giá liên hệ).
5. **Đồng bộ Xóa Cache ISR & Revalidation:**
   - Hook cập nhật đợt khởi hành và tour curation phải tự động trigger revalidation cho Homepage (`/`) và Catalog (`/tour`) để đảm bảo giá và nhãn ưu đãi ngoài website luôn đồng bộ thời gian thực với CMS.

## 4. Hành vi Hiện tại (Current Behavior)

> **Phạm vi:** Badge biên tập như `hot`, `specialized` và `vip` được tách sang US-084. `promoLabel` trong story này chỉ đại diện cho ưu đãi thương mại đã xác minh từ departure.

- Thẻ tour trang chủ (Departure spotlight) chỉ hiển thị một giá duy nhất (`Giá tour: xx.xxx.xxx đ`) và nhãn "Mở bán", không có giá gốc gạch ngang và không có nhãn ưu đãi.
- Việc hiển thị discount/promotion chưa đồng bộ giữa trang chủ và trang catalog.

## 5. Hành vi Đích (Target Behavior)

- Các tour có ưu đãi hiển thị song song giá gốc gạch ngang, giá khuyến mãi và nhãn ưu đãi bắt mắt (`🔥 promoLabel`).
- Khách hàng lập tức nhận diện được các deal tốt, kích thích bấm xem tour hoặc giữ chỗ ngay.

## 6. Tiêu chí Chấp nhận (Acceptance Criteria)

- **AC1:** Thẻ tour trang chủ (Homepage departure spotlight) hiển thị giá gốc gạch ngang `<del>` khi `originalPrice > priceFrom`.
- **AC2:** Badge ưu đãi `promoLabel` hiển thị nổi bật trên card khi có dữ liệu khuyến mãi.
- **AC3:** Thẻ card catalog (`WingsGoTourCard`) và trang thị trường hiển thị đồng bộ cấu trúc giá ưu đãi.
- **AC4:** Hook revalidation tự động xóa cache trang chủ khi giá hoặc khuyến mãi của departure thay đổi.

