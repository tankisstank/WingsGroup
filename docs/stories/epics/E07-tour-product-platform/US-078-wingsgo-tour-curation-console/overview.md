# US-078 — WingsGo Visual Tour Curation Console & Live Simulator

## Status

planned

## Lane

normal

## Product Contract

Nâng cấp khu vực cấu hình Tour Hot & Tour Nổi bật (`wingsGoTourCatalog.featuredTours`) trên trang `/tour` (ID 208) của site WingsGo từ dạng input quan hệ (relationship) text thô thành **Bàn điều phối thương mại trực quan (Visual Merchandising Console - Level 3)** trong Payload CMS 3.x.

Hệ thống phải đảm bảo:
1. **Trực quan hóa lựa chọn (Visual Curation Board):** Hiển thị danh sách tối đa 6 tour nổi bật dưới dạng thẻ card trực quan, có ảnh thumbnail đại diện, tên tour đầy đủ (không bị truncate), giá khởi điểm, ngày khởi hành gần nhất, và nhãn khuyến mại (`promoLabel`).
2. **Phân định rõ ràng phân tầng vị trí (Slot Hierarchy):**
   - **Slot #1, #2, #3 (Hero Showcase):** Đánh dấu rõ là 3 tour đại diện xuất hiện tại khối *Ưu đãi hot / Tour đang được quan tâm* ở đầu trang chủ WingsGo.
   - **Slot #4, #5, #6 (Catalog Grid Showcase):** Đánh dấu là các tour xuất hiện tiếp nối trong lưới catalog giữa trang.
3. **Kéo thả sắp xếp thứ tự mượt mà (Sortable Drag & Drop):** Tích hợp thư viện `@dnd-kit/core` và `@dnd-kit/sortable` (chuẩn React 19 / Next.js App Router) cho phép editor cầm chuột kéo thả thay đổi thứ tự ưu tiên của các tour.
4. **Mô phỏng trực tiếp thời gian thực (Live Simulator 1:1):** Cung cấp khung preview song song mô phỏng chính xác giao diện Hero Commerce Panel và Catalog Grid trên `https://wingsgo.vn`. Khi editor kéo thả thay đổi vị trí ở bảng bên trái, khung simulator bên phải cập nhật tức thì theo thời gian thực (WYSIWYG), hỗ trợ chuyển đổi linh hoạt chế độ xem Desktop / Tablet / Mobile.
5. **Cửa sổ chọn Tour thông minh (Tour Picker Modal):** Bấm `+ Thêm Tour` mở popup có thanh tìm kiếm, bộ lọc thị trường (Nhật Bản, Hàn Quốc, Trung Quốc, v.v.), chỉ hiển thị các tour thuộc site WingsGo và tự động loại trừ các tour đã chọn hoặc không đủ điều kiện.
6. **Kiểm tra hợp lệ trước khi lưu (Pre-validation Engine):** Hiển thị cảnh báo trực tiếp trên card nếu tour thiếu đợt khởi hành tương lai, chưa publish, hoặc thiếu `promoLabel` ở top 3, giúp editor phát hiện và xử lý ngay thay vì đợi server ném lỗi khi bấm lưu trang.
7. **Bảo toàn dữ liệu & Hook Backend:** Giữ nguyên schema dữ liệu mảng quan hệ `featuredTours` và các rule bảo vệ trong hook `validateWingsGoTourCatalog.ts` cùng hàm đọc `wingsGoCatalog.ts`.

## Current Behavior

- Tại `/admin/collections/pages/208` (Tab `WingsGo tour catalog`), trường `Tour nổi bật` hiện là trường `relationship` mặc định của Payload CMS.
- Dữ liệu hiển thị dưới dạng các ô chip text xám nhỏ bị cắt cụt tên (`HÀ NỘI – OSAKA – KOBE ... [x]`), không có ảnh thumbnail, không hiển thị giá, ngày bay, hay nhãn Promo label.
- Không có ranh giới trực quan để editor phân biệt đâu là top 3 tour lên Hero đầu trang và đâu là các tour còn lại nằm ở lưới giữa trang.
- Không có live preview mô phỏng xem lên web thực tế sẽ trông như thế nào; editor phải lưu rồi sang tab khác mở trang chủ để kiểm tra.
- Nếu chọn tour chưa publish hoặc không có đợt khởi hành tương lai, chỉ khi bấm "Lưu trang" mới nhận được thông báo lỗi đỏ từ hook `validateWingsGoTourCatalog`, gây ức chế và mất thời gian.

## Target Behavior

- Trường `featuredTours` trong `wingsGoTourCatalogField` được render bằng Custom Client Component `FeaturedToursCurationField.tsx`.
- Giao diện cung cấp 2 chế độ hiển thị linh hoạt: **Chia đôi màn hình (Split-Screen)** hoặc **Tab chuyển đổi (Board ↔ Simulator)**.
- Bảng Curation Board phân chia rõ 2 khu vực:
  - Khối **Hero Showcase (Top 3 Slots)** có viền gradient cam, badge vị trí #1, #2, #3, hiển thị rõ badge `Promo label` (ví dụ: `🔥 Hot`, `Giảm 2Tr`) hoặc nút nhắc nhở kèm link mở nhanh để gắn nhãn.
  - Khối **Catalog Grid Showcase (Slot #4, #5, #6)** cho các tour còn lại.
- Mỗi card tour hiển thị: Ảnh bìa, Tên đầy đủ, Giá khởi điểm, Ngày bay kế tiếp, Trạng thái đợt bay, Nút gỡ `✕` và Icon kéo thả `⠿`.
- Khung **Live Simulator**: Render chính xác layout mini-card Hero Commerce và Grid Catalog của WingsGo; có nút toggle xem Desktop / Tablet / Mobile.
- Thay đổi thứ tự bằng kéo thả cập nhật ngay lập tức vào state của Payload Form thông qua hook `useField`, đảm bảo khi nhấn **Lưu bản nháp** hoặc **Xuất bản**, dữ liệu được lưu đúng chuẩn vào PostgreSQL.

## Affected Users

- **Editor (Biên tập viên):** Dễ dàng lựa chọn, kiểm tra hình ảnh, giá và sắp xếp tour hot lên trang chủ trong vòng vài giây mà không sợ nhầm lẫn.
- **Site Manager / Marketing Lead:** Trực tiếp nhìn thấy mô phỏng hiển thị trên website trước khi bấm duyệt Publish, đảm bảo thông điệp khuyến mại và visual đồng nhất.
- **Khách hàng WingsGo:** Luôn tiếp cận được các tour hot nhất, giá chuẩn xác nhất và giao diện được chăm chút tỉ mỉ.

## Relevant Product Docs

- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`
- `docs/stories/epics/E07-tour-product-platform/US-077-wingsgo-ux-and-conversion/overview.md`
- `docs/handover/wingsgo-tour-curation-editor-guide.md`
- `publish/html/18 Huong dan editor quan tri tour hot va landing page WingsGo.html`

## Acceptance Criteria

1. **AC-1 (Visual Curation Board):** Khung `Tour nổi bật` hiển thị tối đa 6 card tour có ảnh thumbnail, tên đầy đủ, giá từ, ngày bay kế tiếp và nhãn promoLabel.
2. **AC-2 (Slot Hierarchy):** Phân chia rõ ràng Top 3 tour (Hero Showcase) và 3 tour tiếp theo (Catalog Grid Showcase).
3. **AC-3 (Drag & Drop Reordering):** Kéo thả hoán đổi thứ tự giữa các card mượt mà bằng `@dnd-kit`, cập nhật đúng thứ tự mảng vào `wingsGoTourCatalog.featuredTours`.
4. **AC-4 (Live Simulator 1:1):** Khung mô phỏng hiển thị đúng diện mạo Hero mini-cards và Catalog grid theo thời gian thực khi editor thao tác, hỗ trợ chuyển đổi Desktop/Tablet/Mobile.
5. **AC-5 (Tour Picker Modal):** Nút thêm tour mở modal tìm kiếm trực quan có bộ lọc thị trường, chỉ liệt kê tour hợp lệ thuộc site WingsGo.
6. **AC-6 (Pre-validation & Warning):** Cảnh báo trực tiếp trên card nếu tour thiếu đợt bay tương lai hoặc chưa gắn promoLabel trên Hero slot.
7. **AC-7 (Data Integrity & Backward Compatibility):** Dữ liệu lưu vào database giữ nguyên quan hệ ID mảng `pages_rels`, vượt qua toàn bộ các kiểm tra trong `validateWingsGoTourCatalog.ts` và render chuẩn xác trên trang chủ `https://wingsgo.vn`.
