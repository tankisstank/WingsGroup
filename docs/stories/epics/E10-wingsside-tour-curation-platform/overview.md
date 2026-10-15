# E10 - Nền tảng biên tập & Curation Tour Inbound WingSide (WingSide Inbound Tour Curation Platform)

> **Identity Contract:** Site công khai: `wingside.vn` | Mã tenant kỹ thuật: `wing-side` | Local alias: `/wingsside` | Theme key: `wings-side` | Project Key: `wingsside`.

## 1. Trạng thái (Status)

`planned` (Kế hoạch phát triển giai đoạn tiếp theo — Phase 2)

---

## 2. Mục tiêu chiến lược (Objective)

Kế thừa toàn diện kiến trúc **Interactive Curation Console & Live Simulator 1:1 (Level 3)** đã được chuẩn hóa và triển khai thành công tại WingsGo (`US-078`), để đưa vào hệ thống quản trị nội dung của **WingSide (`wingside.vn`)**.

Mục tiêu cốt lõi:
1. **Nâng cấp trải nghiệm biên tập (Editor Experience):** Xóa bỏ hoàn toàn thao tác chọn relation dạng chip text thô ráp, thay bằng bảng điều phối trực quan (Visual Merchandising Console) với thẻ tour đầy đủ ảnh bìa, tên quốc tế, giá khởi điểm quy đổi (USD / VND), thời lượng hành trình và điểm đến nổi bật.
2. **Hỗ trợ đặc thù Tour Inbound Quốc tế:**
   - Đa ngôn ngữ (Multilingual): Hỗ trợ chuyển đổi nhanh ngữ cảnh hiển thị (`en`, `vi`, `zh`, `ja`, v.v.).
   - Đa tiền tệ (Multi-currency): Hiển thị giá tour Inbound theo chuẩn quốc tế (USD mặc định, VND phụ trợ).
   - Phân loại trải nghiệm Inbound: Lọc theo phong cách du lịch (`travelStyle`: Văn hóa Di sản, Khám phá thiên nhiên, Nghỉ dưỡng cao cấp, Ẩm thực địa phương) và vùng miền (`destinationTag`: Miền Bắc - Vịnh Hạ Long - Sapa, Miền Trung - Hội An - Huế, Miền Nam - Đồng bằng sông Cửu Long).
3. **Mô phỏng trực tiếp thời gian thực (Live Inbound Simulator 1:1):** Giúp Editor và Marketing Lead nhìn thấy ngay tức thì cách các hành trình nổi bật (`featuredJourneySelections`) hiển thị trên trang chủ `wingside.vn` theo 3 chế độ xem (Desktop 1200px, Tablet 768px, Mobile 390px) trước khi xuất bản.
4. **Bảo toàn dữ liệu & Hook kiểm định:** Tương thích 100% với schema `wingsSideHiFi.home.featuredJourneySelections` và hook kiểm tra chất lượng `validateWingsSideHomeCuration.ts`.

---

## 3. Danh sách User Stories (Workstreams)

| Story | Tiêu đề | Phân làn | Trạng thái | Mục tiêu chính |
|---|---|---|---|---|
| **US-079** | WingSide Visual Tour Curation Console & Live Inbound Simulator | `normal` | `planned` | Triển khai Curation Console Level 3 cho `featuredJourneySelections` trên `wingside.vn`, hỗ trợ kéo thả, picker modal với bộ lọc Inbound, live simulator đa ngôn ngữ và tiền tệ USD/VND. |

---

## 4. Tài liệu tham chiếu liên quan

- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`
- `docs/stories/epics/E07-tour-product-platform/US-078-wingsgo-tour-curation-console/overview.md`
- `docs/stories/epics/E08-wingsside-inbound-upgrade/overview.md`
- `app/src/fields/wingsSideHiFi.ts`
- `app/src/collections/Pages/hooks/validateWingsSideHomeCuration.ts`
