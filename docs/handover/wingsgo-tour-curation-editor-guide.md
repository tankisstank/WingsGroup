# Hướng Dẫn Trực Quan Cho Editor: Cấu Hình Tour Hot & Tour Nổi Bật (Featured) Trên WingsGo

> **Dành cho:** Biên tập viên (Editor), Site Manager, Quản trị viên nội dung WingsGo.  
> **Mục tiêu:** Giúp editor nắm rõ vị trí cấu hình trong CMS Admin để ghim các **Tour Hot / Ưu đãi hot**, gắn **Badge khuyến mại (Hot, Giảm giá...)**, và xếp thứ tự các **Tour nổi bật** hiển thị trực tiếp trên trang chủ WingsGo.

---

## 1. Bản Đồ Hiển Thị Tour Trên Trang Chủ WingsGo

Trên trang chủ `https://wingsgo.vn`, các tour nổi bật/hot xuất hiện ở **2 khu vực chiến lược**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [KHỐI 1: HERO COMMERCE PANEL] - "Ưu đãi hot / Tour đang được quan tâm" │
│  - Nằm ngay dưới Hero Banner đầu trang (dạng mini-card có thumbnail)  │
│  - Hiển thị 3 Tour đầu tiên trong danh sách Tour nổi bật               │
│  - Có Badge khuyến mại màu cam rực rỡ (Lấy từ trường "Promo label")    │
└────────────────────────────────────────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ [KHỐI 2: CATALOG GRID] - "🔥 Tour đang được quan tâm nhất"             │
│  - Nằm ở giữa trang chủ (lưới 4 cột ảnh lớn visual sắc nét)            │
│  - Hiển thị tối đa 4 - 6 Tour nổi bật được editor ghim theo thứ tự     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cách 1: Ghim & Sắp Xếp Thứ Tự Tour Nổi Bật (Trực Quan)

Để chọn chính xác tour nào sẽ lên trang chủ và sắp xếp thứ tự hiển thị (Tour nào đứng 1, 2, 3...):

### Bước 1: Mở CMS Admin
1. Truy cập trang quản trị: `https://wingsgo.vn/admin` (hoặc domain CMS được cấp).
2. Đăng nhập với tài khoản Editor / Site Manager.

### Bước 2: Tìm Trang Catalog `/tour`
1. Trên thanh điều hướng menu bên trái, nhấp vào **Pages (Trang)**.
2. Tìm trang có đường dẫn:
   - **Title / Tiêu đề:** `Tour` hoặc `Danh mục Tour`
   - **Pathname:** `/tour`
   - **Site:** `WingsGo`
3. Nhấp vào để mở giao diện chỉnh sửa trang.

### Bước 3: Cấu hình Khối "WingsGo tour catalog"
Cuộn xuống phần cài đặt **WingsGo tour catalog (Catalog tour WingsGo)**:

1. **Bật catalog động (Enabled):** Đảm bảo ô checkbox này đã được **Tích chọn (Checked)**.
2. **Tour nổi bật (Featured Tours):**
   - Đây là ô chọn quan hệ (**Relationship**) cho phép chọn tối đa **6 Tour**.
   - **Thao tác chọn:** Nhấp vào `Add existing` hoặc tìm kiếm tên sản phẩm tour (ví dụ: *Hà Nội - Osaka*, *Thượng Hải - Ô Trấn*...).
   - **Sắp xếp thứ tự ưu tiên:** Editor có thể **kéo - thả (Drag & Drop)** các dòng tour để thay đổi thứ tự:
     - 📌 **Vị trí 1, 2, 3:** Sẽ tự động xuất hiện trên khối **"Ưu đãi hot / Tour đang được quan tâm"** ở đầu trang (Hero).
     - 📌 **Toàn bộ 4 - 6 tour:** Sẽ xuất hiện tại khối **"🔥 Tour đang được quan tâm nhất"** ở lưới giữa trang.

> [!TIP]
> **Điều kiện để Tour hiển thị thành công:**  
> Tour được chọn phải thuộc Site `WingsGo`, đã **Publish**, có **đợt khởi hành tương lai (Tour Departure)** đang mở bán và có bài viết chi tiết liên kết (Wrapper page).

---

## 3. Cách 2: Gắn Nhãn Khuyến Mại / Badge Hot ("Promo Label")

Để tour hiển thị các huy hiệu nổi bật màu cam như **"HOT"**, **"GIẢM 2 TRIỆU"**, **"MÙA LÁ ĐỎ"**, **"BAY VIETNAM AIRLINES"**... trên mini-card Hero:

### Bước 1: Mở Quản Lý Đợt Khởi Hành
1. Trên menu bên trái CMS, tìm mục **Tour Departures (Đợt khởi hành)**.
2. Tìm đợt khởi hành của tour tương ứng mà bạn muốn gắn nhãn (hoặc vào từ liên kết trong chi tiết sản phẩm Tour).

### Bước 2: Điền Trường "Promo label"
1. Trong màn hình chi tiết đợt khởi hành, cuộn đến phần thông tin thương mại:
   - **Promo label (Nhãn khuyến mại):** Nhập chữ ngắn gọn bạn muốn hiển thị làm Badge (Ví dụ: `Hot`, `Mùa lá đỏ`, `Giảm 1.5tr`, `Tặng vé xem show`...).
   - **Ưu tiên hiển thị (isFeatured):** Tích chọn ô này nếu muốn đợt khởi hành này luôn được ưu tiên chọn làm giá/ngày bay đại diện cho tour.
   - **Trạng thái (Availability status):** Đảm bảo chọn `Mở bán (Open)` hoặc `Sắp hết chỗ (Limited)`.
2. Nhấp **Save (Lưu)** hoặc gửi phê duyệt Publish.

> [!NOTE]
> Hệ thống sẽ tự động lấy giá trị từ trường **`Promo label`** của đợt bay gần nhất để hiển thị thành Badge viền tròn gradient nổi bật ngay cạnh tiêu đề tour trên trang chủ!

---

## 4. Tóm Tắt Quy Trình Nhanh (Cheat Sheet)

| Bạn muốn làm gì? | Vào đâu trong CMS? | Thao tác |
|---|---|---|
| **Đổi 3 tour hiển thị ở khối Hero đầu trang** | `Pages` ➔ Mở trang `/tour` ➔ Mục `WingsGo tour catalog` | Kéo thả 3 tour mong muốn lên **3 vị trí đầu tiên** trong danh sách `Tour nổi bật`. |
| **Gắn Badge "Hot" / "Giảm 2 triệu" / "Mùa lá đỏ"** | `Tour Departures` ➔ Chọn đợt đi của tour | Nhập nội dung vào ô **`Promo label`** (ví dụ: `Hot`). |
| **Đổi 4 tour ở khối lưới giữa trang** | `Pages` ➔ Mở trang `/tour` ➔ Mục `WingsGo tour catalog` | Chọn tối đa 6 tour trong ô `Tour nổi bật`. |
| **Ưu tiên đợt bay đẹp nhất** | `Tour Departures` ➔ Chọn đợt đi | Tích chọn ô **`Ưu tiên hiển thị (isFeatured)`**. |
