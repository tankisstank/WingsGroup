# US-078 — WingsGo Visual Tour Curation Console & Live Simulator

## 1. Trạng thái (Status)

`completed` (Đã hoàn thành Level 3 Curation Console & Level 3+ Independent Collection Platform)

## 2. Phân làn (Lane)

`normal`

## 3. Hợp đồng Sản phẩm (Product Contract)

Nâng cấp khu vực cấu hình Tour Hot & Tour Nổi bật (`featuredTours`) của site WingsGo từ dạng input quan hệ (relationship) text thô gắn cứng vào trang `/tour` (ID 208) thành **Bàn điều phối thương mại trực quan (Visual Merchandising Console - Level 3)** và tiến tới **Nền tảng Quản trị Curation Độc lập (Independent Tour Curation Platform - Level 3+)** trong Payload CMS 3.x.

Hệ thống phải đảm bảo:
1. **Trực quan hóa lựa chọn (Visual Curation Board):** Hiển thị danh sách tối đa 6 tour nổi bật dưới dạng thẻ card trực quan, có ảnh thumbnail đại diện, tên tour đầy đủ (không bị truncate), giá khởi điểm, ngày khởi hành gần nhất, và nhãn khuyến mại (`promoLabel`).
2. **Phân định rõ ràng phân tầng vị trí (Slot Hierarchy):**
   - **Slot #1, #2, #3 (Hero Showcase):** Đánh dấu rõ là 3 tour đại diện xuất hiện tại khối *Ưu đãi hot / Tour đang được quan tâm* ở đầu trang chủ WingsGo.
   - **Slot #4, #5, #6 (Catalog Grid Showcase):** Đánh dấu là các tour xuất hiện tiếp nối trong lưới catalog giữa trang.
3. **Kéo thả sắp xếp thứ tự mượt mà (Sortable Drag & Drop):** Tích hợp thư viện `@dnd-kit/core` và `@dnd-kit/sortable` (chuẩn React 19 / Next.js App Router) cho phép editor cầm chuột kéo thả thay đổi thứ tự ưu tiên của các tour.
4. **Mô phỏng trực tiếp thời gian thực (Live Simulator 1:1):** Cung cấp khung preview song song mô phỏng chính xác giao diện Hero Commerce Panel và Catalog Grid trên `https://wingsgo.vn`. Khi editor kéo thả thay đổi vị trí ở bảng bên trái, khung simulator bên phải cập nhật tức thì theo thời gian thực (WYSIWYG), hỗ trợ chuyển đổi linh hoạt chế độ xem Desktop / Tablet / Mobile.
5. **Cửa sổ chọn Tour thông minh (Tour Picker Modal):** Bấm `+ Thêm Tour` mở popup có thanh tìm kiếm, bộ lọc thị trường (Nhật Bản, Hàn Quốc, Trung Quốc, Đông Nam Á, Khác), có phân trang server-side (`limit=20`), chỉ hiển thị các tour thuộc site WingsGo và tự động loại trừ các tour đã chọn hoặc không đủ điều kiện.
6. **Kiểm tra hợp lệ trước khi lưu (Pre-validation Engine):** Hiển thị cảnh báo trực tiếp trên card nếu tour thiếu đợt khởi hành tương lai (`departureDate > now()`), chưa publish, hoặc thiếu `promoLabel` ở top 3.
7. **Collection Quản trị Độc lập ở Menu chính (`TourCurations`):** Đưa tính năng curation ra khỏi Document trang `/tour`, tạo thành một Collection độc lập (`tour-curations`) nằm trực tiếp ở Sidebar Navigation của CMS, hỗ trợ đa site với `siteField`.
8. **Cơ chế Mặc định Site & Gán linh hoạt vào nhiều trang (Site Default & Multi-Page Binding):**
   - Hỗ trợ cờ `isDefault` độc quyền theo từng site: Bộ curation mặc định sẽ tự động cung cấp dữ liệu cho Trang chủ (`/`) và trang `/tour`.
   - Bổ sung trường quan hệ `wingsGoTourCatalog.curation` trên collection `Pages`, cho phép các Landing Page chiến dịch (mùa lễ, tết, khuyến mại riêng) chọn bộ curation riêng biệt.
9. **Resolver Đa tầng & Tương thích ngược (Dual-Read Fallback):** Hàm resolver `resolveWingsGoTourCuration` hỗ trợ 4 tầng ưu tiên: Curation gắn riêng trên Page -> Curation mặc định của Site -> Dữ liệu cũ trong `pages_rels` của trang `/tour` -> Fallback thuật toán ngày bay gần nhất.
10. **Đồng bộ Xóa Cache Tức thì (Cache Invalidation & Revalidation):** Khi một bộ `TourCurations` thay đổi, hook tự động xóa cache Redis và trigger Next.js ISR revalidation đồng thời cho Trang chủ, trang `/tour` và các trang đang liên kết.

---

## 4. Hành vi Hiện tại (Current Behavior)

- Tính năng Level 3 Console & Live Simulator đã hoạt động hoàn hảo nhưng đang nằm bên trong tab `Catalog WingsGo` của document trang `/tour` (ID 208) trong collection `Pages`.
- Editor muốn sửa tour hot trang chủ phải vào menu *Pages* -> tìm trang `/tour` -> chuyển tab.
- Không thể tạo nhiều bộ curation khác nhau cho các chiến dịch khác nhau (như tour Tết, tour Hè, tour Khuyến mại chớp nhoáng).
- Trang chủ phải query gián tiếp thông qua trang `/tour`.

---

## 5. Hành vi Đích (Target Behavior)

- Menu Sidebar CMS xuất hiện mục **"Bộ curation tour" (`TourCurations`)** trong nhóm Nội dung.
- Editor bấm vào menu chính là thấy ngay danh sách các bộ tour:
  - Bản ghi *"Catalog Mặc định WingsGo"* (có gắn cờ `Mặc định site`).
  - Các bộ tour theo sự kiện/mùa khác.
- Form chỉnh sửa của `TourCurations` tích hợp toàn bộ **Curation Console Level 3 & Live Simulator 1:1** đã xây dựng.
- Trên trang `/tour` và các Landing Page khác trong `Pages`: có dropdown chọn bộ curation mong muốn, hoặc để trống để tự động nhận bộ mặc định của site.
- Lưu tại bất kỳ đâu cũng kích hoạt xóa cache Redis và cập nhật tức thì ngoài website.

---

## 6. Người dùng Thụ hưởng (Affected Users)

- **Editor & Content Manager:** Quản trị tập trung, 1-click truy cập từ sidebar, không bị nhầm lẫn giữa trang chủ và trang `/tour`.
- **Marketing Lead:** Tự do tạo các bộ tour hot riêng biệt để gắn vào các landing page chiến dịch quảng cáo.
- **Khách hàng WingsGo:** Trải nghiệm danh mục tour cập nhật nhanh chóng, chuẩn xác.

---

## 7. Tiêu chí Chấp nhận (Acceptance Criteria)

1. **AC-1 (Visual Curation Board):** Khung `Tour nổi bật` hiển thị tối đa 6 card tour có ảnh thumbnail, tên đầy đủ, giá từ, ngày bay kế tiếp và nhãn promoLabel.
2. **AC-2 (Slot Hierarchy):** Phân chia rõ ràng Top 3 tour (Hero Showcase) và 3 tour tiếp theo (Catalog Grid Showcase).
3. **AC-3 (Drag & Drop Reordering):** Kéo thả hoán đổi thứ tự giữa các card mượt mà bằng `@dnd-kit`, cập nhật đúng thứ tự mảng vào state form.
4. **AC-4 (Live Simulator 1:1):** Khung mô phỏng hiển thị đúng diện mạo Hero mini-cards và Catalog grid theo thời gian thực khi editor thao tác, hỗ trợ chuyển đổi Desktop/Tablet/Mobile.
5. **AC-5 (Tour Picker Modal):** Nút thêm tour mở modal tìm kiếm trực quan có bộ lọc thị trường, phân trang server-side, chỉ liệt kê tour hợp lệ thuộc site WingsGo.
6. **AC-6 (Pre-validation & Warning):** Cảnh báo trực tiếp trên card nếu tour thiếu đợt bay tương lai hoặc chưa gắn promoLabel trên Hero slot.
7. **AC-7 (Dedicated TourCurations Collection in Menu):** Collection `tour-curations` xuất hiện trên sidebar admin thuộc nhóm Nội dung, có trường `site`, `name`, `isDefault`, `featuredTours` và `description`.
8. **AC-8 (Site Default Uniqueness):** Hook `beforeChange` đảm bảo mỗi site chỉ có tối đa một bản ghi `isDefault = true`. Khi bật cờ cho bản ghi mới, bản ghi cũ cùng site tự động tắt cờ.
9. **AC-9 (Page-Level Curation Relationship):** Trường `wingsGoTourCatalog.curation` trên collection `Pages` cho phép chọn bộ curation tùy ý, tự động lọc theo site.
10. **AC-10 (Multi-Tier Resolver & Fallback):** Frontend hỗ trợ thứ tự đọc: Curation gắn riêng trên Page -> Curation mặc định của Site -> Dữ liệu legacy `/tour` -> Fallback catalog. Không bao giờ làm gián đoạn hiển thị.
11. **AC-11 (Cache Invalidation & Revalidation):** Lưu bản ghi `TourCurations` tự động xóa cache Redis và revalidate đồng thời Trang chủ, trang `/tour` và các Page liên quan.
