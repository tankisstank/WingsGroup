# US-079 — WingSide Visual Tour Curation Console & Live Inbound Simulator

## 1. Trạng thái (Status)

`planned` (Kế hoạch triển khai giai đoạn sau cho WingSide)

## 2. Phân làn (Lane)

`normal`

## 3. Hợp đồng Sản phẩm (Product Contract)

Nâng cấp khu vực biên tập danh mục hành trình Inbound đặc sắc (`wingsSideHiFi.home.featuredJourneySelections`) trên trang chủ WingSide (`wingside.vn`) từ dạng mảng quan hệ (relationship array) văn bản thô sơ thành **Bàn điều phối thương mại trực quan (Visual Merchandising Console - Level 3)** trong Payload CMS 3.x, kế thừa và tối ưu hóa từ kiến trúc WingsGo (`US-078`).

Hệ thống phải đảm bảo các năng lực cốt lõi:
1. **Trực quan hóa lựa chọn (Visual Inbound Curation Board):** Hiển thị danh sách tối đa 6 tour/hành trình nổi bật dưới dạng thẻ card trực quan, có ảnh thumbnail đại diện (Hero photo), tên tour bản địa hóa theo ngôn ngữ lựa chọn (mặc định tiếng Anh `en`), thời lượng (ví dụ: `8 Days / 7 Nights`), giá từ chuẩn quốc tế (USD / VND), và nhãn phong cách (`travelStyle`).
2. **Phân cấp vị trí hiển thị (Slot Hierarchy):**
   - **Slot #1, #2 (Primary Featured Journeys):** Đánh dấu 2 hành trình Inbound chủ đạo xuất hiện tại vị trí tiêu điểm trên trang chủ WingSide.
   - **Slot #3, #4, #5, #6 (Secondary Showcase):** Đánh dấu các hành trình tiếp nối trong bộ sưu tập Inbound Discovery.
3. **Kéo thả sắp xếp thứ tự mượt mà (Sortable Drag & Drop):** Tích hợp thư viện chuẩn React 19 `@dnd-kit/core` và `@dnd-kit/sortable`, cho phép editor kéo thả hoán đổi thứ tự các hành trình, kèm theo nút di chuyển nhanh `▲`/`▼` và nút gỡ `✕`.
4. **Mô phỏng trực tiếp thời gian thực (Live Inbound Simulator 1:1):** Cung cấp khung preview song song mô phỏng chính xác giao diện Featured Journeys trên `https://wingside.vn`. Cập nhật tức thì (WYSIWYG) khi editor điều chỉnh thứ tự, hỗ trợ chuyển đổi linh hoạt:
   - Viewport: **Desktop (1200px)**, **Tablet (768px)**, **Mobile (390px)**.
   - Ngôn ngữ mô phỏng: **English (`en`)**, **Tiếng Việt (`vi`)**, v.v.
5. **Cửa sổ chọn Tour thông minh (Inbound Tour Picker Modal):** Popup tìm kiếm với phân trang server-side (`limit=20`), có bộ lọc theo **Điểm đến Việt Nam** (`destinationTag`: Miền Bắc, Miền Trung, Miền Nam, Vịnh Hạ Long, Sapa, Hội An, Phú Quốc...) và **Phong cách du lịch** (`travelStyle`: Di sản Văn hóa, Nghỉ dưỡng biển, Khám phá thiên nhiên). Chỉ hiển thị tour hợp lệ thuộc site WingSide và vô hiệu hóa tour đã chọn.
6. **Kiểm định trước khi lưu (Pre-validation Engine):** Cảnh báo ngay trên card nếu tour thiếu bản dịch tiếng Anh, thiếu lịch khởi hành tương lai, hoặc chưa đủ thông tin giá USD, giúp editor hoàn thiện dữ liệu trước khi lưu trang.
7. **Bảo toàn dữ liệu & Hook Backend:** Giữ nguyên schema dữ liệu `wingsSideHiFi.home.featuredJourneySelections` và vượt qua toàn bộ quy tắc kiểm tra trong `validateWingsSideHomeCuration.ts`.

---

## 4. Hành vi Hiện tại (Current Behavior)

- Tại trang cấu hình WingSide Home trong CMS, trường `featuredJourneySelections` đang là các hàng `array` chứa `relationship` mặc định của Payload.
- Editor chỉ thấy một ô input text nhỏ hoặc selectbox đơn giản với tiêu đề tour bị cắt ngắn, không thấy ảnh đại diện, không biết tour đó có bản dịch tiếng Anh hoàn chỉnh hay chưa, không hiển thị giá USD hoặc thời lượng.
- Không thể kéo thả đổi thứ tự nhanh giữa các hành trình; việc sắp xếp lại đòi hỏi phải xóa đi chọn lại từng tour rất mất công.
- Không có khung Live Simulator để biết giao diện trên `wingside.vn` trông sẽ ra sao với các card vừa chọn.

---

## 5. Hành vi Đích (Target Behavior)

- Trường `featuredJourneySelections` được render bởi Client Component chuyên dụng `WingSideFeaturedJourneysCurationField.tsx`.
- Giao diện dạng chia đôi màn hình (Split-Screen):
  - Cột trái: Curation Board với tối đa 6 slots, hiển thị card trực quan, hỗ trợ kéo thả `@dnd-kit`.
  - Cột phải: Live Inbound Simulator 1:1 với chuyển đổi Viewport (Desktop/Tablet/Mobile) và Language Switcher.
- Picker Modal hỗ trợ tìm kiếm phân trang server-side với đầy đủ các bộ lọc chuyên biệt cho thị trường Inbound Việt Nam.
- Tự động đồng bộ vào state Payload form (`useField`), đảm bảo lưu trữ an toàn vào database PostgreSQL mà không gây bất kỳ breaking changes nào.

---

## 6. Người dùng Thụ hưởng (Affected Users)

- **Inbound Content Editor:** Dễ dàng điều phối và kiểm tra chất lượng các hành trình du lịch Việt Nam giới thiệu cho khách quốc tế.
- **Inbound Product Manager:** Kiểm soát tính nhất quán về mặt hình ảnh, giá cả (USD) và thông điệp tiếp thị trên trang chủ trước khi xuất bản.
- **Khách hàng Quốc tế (WingSide Visitors):** Trải nghiệm trang chủ mượt mà, trực quan với các hành trình đặc sắc nhất Việt Nam.

---

## 7. Tiêu chí Chấp nhận (Acceptance Criteria)

1. **AC-1 (Visual Inbound Board):** Khung biên tập hiển thị tối đa 6 hành trình Inbound dạng card có thumbnail, tên tiếng Anh, số ngày/đêm, giá từ (USD/VND) và thẻ travelStyle.
2. **AC-2 (Slot Hierarchy):** Phân chia rõ ràng Top 2 hành trình chủ đạo (Primary Showcase) và 4 hành trình tiếp nối (Secondary Showcase).
3. **AC-3 (Drag & Drop Reordering):** Kéo thả hoán đổi thứ tự giữa các card mượt mà bằng `@dnd-kit`, cập nhật đúng thứ tự vào `wingsSideHiFi.home.featuredJourneySelections`.
4. **AC-4 (Live Inbound Simulator 1:1):** Khung mô phỏng hiển thị đúng diện mạo khối Featured Journeys của WingSide theo thời gian thực, hỗ trợ chuyển đổi Desktop/Tablet/Mobile và ngôn ngữ xem trước.
5. **AC-5 (Inbound Tour Picker):** Modal tìm kiếm phân trang server-side với bộ lọc Điểm đến (Destination) và Phong cách (Travel Style), chỉ liệt kê tour thuộc site WingSide.
6. **AC-6 (Pre-validation & Warning):** Cảnh báo trực tiếp trên card nếu tour thiếu bản dịch ngôn ngữ chính (`en`) hoặc thiếu lịch bay tương lai.
7. **AC-7 (Data Integrity & Backward Compatibility):** Dữ liệu lưu giữ nguyên cấu trúc schema hiện tại, vượt qua toàn bộ kiểm tra trong `validateWingsSideHomeCuration.ts`.
