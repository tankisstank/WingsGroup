# Design — US-078: WingsGo Visual Tour Curation Console & Live Simulator

## 1. Technical Architecture & Integration Point

Component được cấu hình dưới dạng Custom Field Component của Payload CMS 3.x trên trường `wingsGoTourCatalog.featuredTours`:

```text
Payload Page Schema (`Pages.ts`)
  │
  └── Tab: 'WingsGo tour catalog'
        │
        └── Group: `wingsGoTourCatalogField`
              ├── Checkbox: `enabled`
              └── Relationship: `featuredTours` (type: 'relationship', relationTo: 'tour-products')
                    │
                    └── admin.components.Field: '@/components/WingsGoTourCuration/FeaturedToursCurationField'
```

### Component Structure:
```text
app/src/components/WingsGoTourCuration/
├── FeaturedToursCurationField.tsx   # Container chính, kết nối useField, quản lý state và layout
├── TourSortableCard.tsx              # Card tour kéo thả tích hợp @dnd-kit sortable
├── TourPickerModal.tsx               # Modal chọn tour trực quan với tìm kiếm & filter
├── LiveSimulatorPreview.tsx          # Khung mô phỏng 1:1 giao diện WingsGo Hero & Grid
└── index.scss                        # Styling hệ thống, tương thích Payload dark/light theme
```

---

## 2. Data Flow & State Management

1. **Đọc dữ liệu hiện tại:**
   - Sử dụng hook `useField<Array<number | string | { id?: number | string }>>({ path: 'wingsGoTourCatalog.featuredTours' })` từ `@payloadcms/ui`.
   - Lấy danh sách ID đã lưu.
2. **Nạp chi tiết sản phẩm (Client-side Hydration):**
   - Gọi REST API nội bộ của Payload:
     `GET /api/tour-products?where[id][in]=<IDs>&depth=2`
     `GET /api/tour-departures?where[tourProduct][in]=<IDs>&where[_status][equals]=published&sort=departureDate`
   - Map dữ liệu thành ViewModel trực quan:
     ```typescript
     export interface CuratedTourCardData {
       id: number | string
       title: string
       slug: string
       thumbnailUrl?: string | null
       priceFrom?: number | null
       nextDepartureDate?: string | null
       promoLabel?: string | null
       isPublished: boolean
       hasFutureDeparture: boolean
       wrapperPagePathname?: string | null
       slotNumber: number // 1 to 6
     }
     ```
3. **Kéo thả sắp xếp (Reordering):**
   - Sử dụng `@dnd-kit/core` và `@dnd-kit/sortable` với hàm `arrayMove`.
   - Khi vị trí thay đổi:
     - State hiển thị của 6 card cập nhật ngay lập tức.
     - Hàm `setValue(newIDs)` của `useField` được gọi để đồng bộ vào form Payload.
     - Component `LiveSimulatorPreview` nhận mảng mới và re-render giao diện mô phỏng tức thì.

---

## 3. UI/UX Wireframe & Thành Phần Giao Diện

### Khung Curation Board (Cột Trái):
- **Phân vùng Slot rõ rệt:**
  - **Khu vực Hero (Slot #1, #2, #3):** Viền bo góc màu cam nhẹ (`border-orange-500/40`, background `amber-50/10`), có tiêu đề *"🌟 Khối Ưu đãi hot Hero (Hiển thị 3 Tour đầu trang)"*.
  - **Khu vực Catalog (Slot #4, #5, #6):** Viền xanh dịu (`border-slate-300`), có tiêu đề *"📋 Lưới Catalog tiếp nối (Hiển thị giữa trang)"*.
- **Card Chi tiết:**
  - Kích thước chuẩn: Card ngang hoặc dạng thẻ gọn gàng.
  - Cột ảnh: Thumbnail tỷ lệ 16:9 bo góc, fallback icon nếu chưa có ảnh.
  - Cột thông tin: Tên tour đậm nét; dòng metadata nhỏ gọn gồm giá `💰 28.990.000 đ` và ngày bay `✈️ 25/10/2026`.
  - Cột nhãn:
    - Nếu có `promoLabel`: Render Badge viền cam nổi bật (Ví dụ: `🔥 Hot`, `Giảm 2Tr`).
    - Nếu chưa có: Nút nhỏ `+ Gắn nhãn khuyến mại` dẫn nhanh tới đợt khởi hành.
  - Cột thao tác: Icon cầm kéo `⠿` và nút gỡ `✕`.

### Khung Live Simulator (Cột Phải):
- Khung mô phỏng có viền giả lập thiết bị (device frame) với thanh công cụ trên cùng:
  - Nút chuyển: `💻 Desktop (1440px)` | `📱 Mobile (375px)`.
  - Nút phóng to / thu nhỏ simulator zoom scale (75%, 100%).
- Bên trong khung mô phỏng:
  - **Khối Hero Commerce Panel:** 3 mini-card render đúng theo component `EditorialHero` của frontend WingsGo, có thumbnail, gradient overlay, tiêu đề, giá và badge cam.
  - **Khối Catalog Grid:** Render thu nhỏ dạng lưới 4 cột đúng chuẩn giao diện catalog WingsGo.

### Cửa sổ chọn Tour (TourPickerModal):
- Dialog pop-up dạng modal overlay.
- Thanh tìm kiếm tức thời theo từ khóa.
- Filter chips: `Tất cả` | `Nhật Bản` | `Hàn Quốc` | `Trung Quốc` | `Đông Nam Á` | `Châu Âu`.
- Danh sách kết quả dạng grid card: Hiển thị trạng thái (Đang mở bán, Số ngày đêm, Giá).
- Bấm vào tour ➔ Thêm ngay vào slot trống tiếp theo và đóng modal.

---

## 4. Pre-validation Engine (Kiểm Tra Trước Khi Lưu)

Thực hiện kiểm tra client-side tương ứng với hook `validateWingsGoTourCatalog.ts`:
1. **Rule 1 (Max 6):** Khung tối đa 6 slot; khi đã đủ 6 tour thì nút `+ Thêm tour` tự động ẩn hoặc disabled.
2. **Rule 2 (No Duplicate):** Không cho phép chọn trùng tour đã có trong danh sách.
3. **Rule 3 (Future Departure):** Kiểm tra xem tour có ít nhất 1 đợt bay tương lai ở trạng thái published không. Nếu không, hiển thị tag đỏ: `⛔ Hết lịch bay tương lai` để editor biết không chọn tour này lên trang chủ.
4. **Rule 4 (Promo Label Warning):** Với 3 slot đầu (Hero), nếu tour chưa có `promoLabel`, hiển thị icon cảnh báo vàng `⚠️ Thiếu nhãn nổi bật` để nhắc nhở editor bổ sung.

---

## 5. Backward Compatibility & An Toàn Dữ Liệu

- Không thay đổi kiểu dữ liệu của `wingsGoTourCatalog.featuredTours` (vẫn là relationship array ID lưu vào `pages_rels`).
- Không ảnh hưởng tới frontend runtime: code frontend `wingsGoCatalog.ts` đọc dữ liệu như bình thường.
- Trong trường hợp component React gặp sự cố render, Payload fallback an toàn không gây mất dữ liệu trang `/tour`.
