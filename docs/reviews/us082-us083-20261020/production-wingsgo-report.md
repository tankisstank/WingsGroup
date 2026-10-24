# Báo cáo Kiểm thử Trực quan Độc lập Production (WingsGo Live QA Report)

**Thời điểm thực hiện:** 20/10/2026 - 19:05 (UTC+7)  
**Phiên làm việc (Session):** `--session us083-production` (Cô lập hoàn toàn, không can thiệp session của Root hay các luồng khác)  
**Môi trường:** Production thật (`https://wingsgo.vn`, kích hoạt bản build `release-us082-us083-20261020-114500`)  
**Phương thức:** Read-only 100% (Không click phone, không mở Zalo OA, không submit form, không can thiệp CMS).  
**Đánh giá tổng thể WingsGo:** 🟢 **PASS 100% TRÊN CẢ 4 ROUTES & 2 VIEWPORTS** (Không tràn ngang, không lỗi console/page, không hiển thị giá gạch `<del>` hay badge promo giả tạo khi chưa có đợt giảm giá hợp lệ).

---

## 1. Tóm tắt Tiêu chí & Kết quả Đo kiểm

| Trang / URL | Kích thước Viewport | `scrollWidth` vs `innerWidth` | Số thẻ `<del>` (Giá gạch) | Số Badge Promo | Số Lỗi Console / Page | Trạng thái Đánh giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Trang chủ (`/`)** | Desktop (`1440x900`) | `1425px` <= `1440px` (Không tràn) | 0 | 0 | 0 | 🟢 **PASS** |
| **Trang chủ (`/`)** | Mobile (`390x844`) | `375px` <= `390px` (Không tràn) | 0 | 0 | 0 | 🟢 **PASS** |
| **Danh mục Tour (`/tour`)** | Desktop (`1440x900`) | `1425px` <= `1440px` (Không tràn) | 0 | 0 | 0 | 🟢 **PASS** |
| **Danh mục Tour (`/tour`)** | Mobile (`390x844`) | `375px` <= `390px` (Không tràn) | 0 | 0 | 0 | 🟢 **PASS** |
| **Thị trường Hàn Quốc (`/thi-truong/han-quoc`)** | Desktop (`1440x900`) | `1425px` <= `1440px` (Không tràn) | 0 | 0 | 0 | 🟢 **PASS** |
| **Thị trường Hàn Quốc (`/thi-truong/han-quoc`)** | Mobile (`390x844`) | `375px` <= `390px` (Không tràn) | 0 | 0 | 0 | 🟢 **PASS** |
| **Thị trường Nhật Bản (`/thi-truong/nhat-ban`)** | Desktop (`1440x900`) | `1425px` <= `1440px` (Không tràn) | 0 | 0 | 0 | 🟢 **PASS** |
| **Thị trường Nhật Bản (`/thi-truong/nhat-ban`)** | Mobile (`390x844`) | `375px` <= `390px` (Không tràn) | 0 | 0 | 0 | 🟢 **PASS** |

---

## 2. Chi tiết Kết quả Trên Từng Trang

### A. Trang Chủ (`https://wingsgo.vn/`)
- **Desktop (1440x900):** Layout hiển thị chuẩn xác, font chữ và hình ảnh tối ưu. `scrollWidth: 1425px` hoàn toàn nằm trong `innerWidth: 1440px`. Không có lỗi console hoặc page error.
- **Mobile (390x844):** Responsive co giãn mượt mà, `scrollWidth: 375px` nằm trong viewport 390px. Floating contact elements hiển thị đúng vị trí.
- **Ảnh chụp bằng chứng:**
  - Desktop: [`prod-wingsgo-home-desktop.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgo-home-desktop.png)
  - Mobile: [`prod-wingsgo-home-mobile.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgo-home-mobile.png)

---

### B. Danh Mục Tour Outbound (`https://wingsgo.vn/tour`)
- **Kiểm định 6 Thẻ Tour Nổi bật Thực tế:**
  1. `TOUR 6N5Đ: OSAKA - KOBE - KYOTO - NÚI PHÚ SĨ - TOKYO (KIX-NRT)`: Giá hiển thị `GIÁ TỪ 40.900.000 ₫`, khởi hành `24/11/2026 • HÀ NỘI • VIETNAM AIRLINES (VNA)`. Không có giá gạch, không có badge sale giả tạo.
  2. `HÀ NỘI – SEOUL – NAMI – EVERLAND - THƯ VIỆN SÁCH - HÁI TÁO (7C)`: Giá hiển thị `GIÁ TỪ 14.900.000 ₫`, khởi hành `22/10/2026 • Hà Nội • Jeju Air`.
  3. `HÀ NỘI – OSAKA – KOBE – KYOTO – NÚI PHÚ SĨ – TOKYO (VJ)`: Giá hiển thị `GIÁ TỪ Liên hệ để nhận giá mới nhất`.
  4. `HÀ NỘI – BUSAN – SEOUL – ĐẢO NAMI – INCHEON- ĐI PHÀ CHO HẢI ÂU ĂN (VJ)`: Giá hiển thị `GIÁ TỪ 19.900.000 ₫`, khởi hành `22/10/2026 • Hà Nội • Vietjet`.
  5. `BẮC KINH - TỬ CẤM THÀNH - CỐ CUNG (CA)`: Giá hiển thị `GIÁ TỪ Liên hệ để nhận giá mới nhất`.
  6. `TOKYO – NÚI PHÚ SĨ – NAGOYA – KYOTO – OSAKA (VNA)`: Giá hiển thị `GIÁ TỪ Liên hệ để nhận giá mới nhất`.
- **Ràng buộc Giá & Promo:** Toàn bộ danh mục tour hiển thị đúng nguyên tắc của US-083: khi không có `originalPrice` hợp lệ hoặc chưa có đợt khuyến mãi được cấp phép, hệ thống **tuyệt đối không hiển thị giá gạch `<del>` hoặc nhãn giảm giá giả tạo** (`delCount = 0`, `promoBadgeCount = 0`).
- **Ảnh chụp bằng chứng:**
  - Desktop: [`prod-wingsgo-tour-desktop.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgo-tour-desktop.png)
  - Mobile: [`prod-wingsgo-tour-mobile.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgo-tour-mobile.png)
  - Card đại diện Desktop: [`prod-wingsgo-tour-card-representative.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgo-tour-card-representative.png) (Đã recapture & kiểm tra trực quan xác nhận non-blank 1.2MB, hiển thị chi tiết cụm thẻ tour Osaka - Kobe - Kyoto và Seoul - Nami).
  - Card đại diện Mobile (Bằng chứng độc lập từ ROOT): [`root-production-tour-mobile.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/root-production-tour-mobile.png) (390x844, hiển thị đầy đủ thẻ tour Hàn Quốc 14.9M 5N4Đ, không có giá gạch/false discount).

---

### C. Thị Trường Hàn Quốc (`https://wingsgo.vn/thi-truong/han-quoc`)
- **Hiển thị Tuyến & Đợt Khởi hành:** Các đợt khởi hành mùa thu/đông được nhóm rõ ràng theo line tour (Busan, Seoul, Nami, Everland, Jeju).
- **Trạng thái Mở bán & Hết chỗ:** Hiển thị chính xác trạng thái đợt khởi hành thực tế (VD: `Mở bán`, `Đã kín`, `Liên hệ tư vấn`).
- **Kích thước & Tràn ngang:** Không có tràn ngang (`scrollWidth: 1425px` trên desktop 1440; `375px` trên mobile 390).
- **Ảnh chụp bằng chứng:**
  - Desktop: [`prod-wingsgo-hanquoc-desktop.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgo-hanquoc-desktop.png)
  - Mobile: [`prod-wingsgo-hanquoc-mobile.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgo-hanquoc-mobile.png)

---

### D. Thị Trường Nhật Bản (`https://wingsgo.vn/thi-truong/nhat-ban`)
- **Hiển thị Tuyến & Đợt Khởi hành:** Tuyến mùa thu lá đỏ và tour Tết Đinh Mùi 2027 (Tokyo, Phú Sĩ, Kyoto, Osaka, Shirakawago, Hokkaido).
- **Giá Khởi điểm:** Thể hiện đúng giá chuẩn từ hệ thống (VD: `46.900.000 ₫`, `39.900.000 ₫`, `Liên hệ`). Không phát sinh thẻ `<del>` hay badge giảm giá giả tạo.
- **Kích thước & Tràn ngang:** Hoàn toàn không tràn ngang trên cả 2 viewports.
- **Ảnh chụp bằng chứng:**
  - Desktop: [`prod-wingsgo-nhatban-desktop.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgo-nhatban-desktop.png)
  - Mobile: [`prod-wingsgo-nhatban-mobile.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgo-nhatban-mobile.png)

---

## 3. Ghi nhận Tình trạng Phát hành Chung
- **WingsGo Production:** Đạt 100% các tiêu chuẩn kiểm thử trực quan trên production thật.
- **WingsGroup Live QA (Root Owned):** Quá trình QA độc lập của Root trên WingsGroup phát hiện vấn đề checkbox consent thừa kế (legacy required checkbox `consent` với nhãn tiếng Anh trống bên cạnh checkbox governed mới). Root đã chủ động sửa tại `Form/Component.tsx` (nghiệm thu component test 4/4 pass) và đang đưa qua chu trình test/build/review additive.
- **Kỷ luật Release:** Worker **không tự ý kết luận đợt phát hành hoàn tất (Do not claim overall story complete)**; giữ nguyên trạng thái đóng băng mã nguồn cho đến khi Root hoàn tất toàn bộ quy trình nghiệm thu.
