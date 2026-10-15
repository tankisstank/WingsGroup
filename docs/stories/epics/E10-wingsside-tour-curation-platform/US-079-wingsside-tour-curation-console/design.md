# Design — US-079: WingSide Visual Tour Curation Console & Live Inbound Simulator

## 1. Kiến trúc Tổng thể & Kế thừa từ US-078

Tính năng được xây dựng trên nền tảng kiến trúc **Level 3 Interactive Curation Console & Live Simulator** đã được chứng minh hiệu quả tại WingsGo (`US-078`), đồng thời tinh chỉnh các lớp logic để tương thích hoàn toàn với hệ thống tour Inbound của WingSide.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Payload CMS 3.x Admin UI                                  │
│                 Page Edit View: /admin/collections/pages/<id> (Site: WingSide)        │
├─────────────────────────────────────────────────────────┬──────────────────────────────┤
│               Curation Console (Cột trái)               │  Live Inbound Simulator (Phải)│
│  ┌───────────────────────────────────────────────────┐  │  ┌─────────────────────────┐ │
│  │ Primary Journeys (Slot #1, #2)                    │  │  │ Toolbar: Viewport Mode  │ │
│  │ [Card 1: Hanoi - Halong - Sapa Discovery (USD)]   │  │  │ [Desktop|Tablet|Mobile] │ │
│  │ [Card 2: Central Heritage Trail: Hue-Hoian (USD)] │  │  │ Lang: [EN] [VI]         │ │
│  ├───────────────────────────────────────────────────┤  │  ├─────────────────────────┤ │
│  │ Secondary Showcase (Slot #3 - #6)                 │  │  │ Live Component Render:  │ │
│  │ [Card 3: Southern Charm & Mekong Cruise]          │  │  │ Featured Inbound        │ │
│  │ [Card 4: Vietnam Grand Tour 14D13N]               │  │  │ Journeys Hi-Fi Grid     │ │
│  │ [Card 5: ...]                                     │  │  │ (Cập nhật thời gian     │ │
│  │ [Card 6: ...]                                     │  │  │  thực khi kéo thả)      │ │
│  └───────────────────────────────────────────────────┘  │  └─────────────────────────┘ │
│  [+ Add Inbound Journey] (Mở Inbound Picker Modal)    │                                │
└─────────────────────────────────────────────────────────┴──────────────────────────────┘
```

---

## 2. Thiết kế Component Chi tiết

Thư mục mục tiêu: `app/src/components/WingSideTourCuration/`

1. **`WingSideFeaturedJourneysCurationField.tsx` (Client Field Component):**
   - Đăng ký vào trường `wingsSideHiFi.home.featuredJourneySelections` trong `app/src/fields/wingsSideHiFi.ts`.
   - Kết nối với Payload qua hook `useField<Array<{ tour: string }>>({ path })`.
   - Lấy ngữ cảnh site hiện tại qua `useDocumentInfo()`.
   - Quản lý state danh sách tour, xử lý sự kiện kéo thả `@dnd-kit`, hiển thị cảnh báo tiền kiểm tra (pre-validation).
2. **`InboundTourSortableCard.tsx` (Sortable Item):**
   - Bọc bởi `useSortable` từ `@dnd-kit/sortable`.
   - Hiển thị badge vị trí (Slot #1, #2: Primary Highlight viền vàng hoàng gia / Slot #3..#6: Secondary viền xanh biển đặc trưng của WingSide).
   - Hiển thị thumbnail, tên tour bản địa hóa (`en`), số ngày/đêm, giá từ định dạng quốc tế (`From $X USD`), các tag điểm đến và nút thao tác nhanh `▲`, `▼`, `✕`.
3. **`InboundTourPickerModal.tsx` (Smart Picker Modal):**
   - Phân trang phía server (`limit=20`, `page`, `totalPages`, `totalDocs`).
   - Tìm kiếm tức thời kèm debounce (250ms).
   - Bộ lọc chuyên biệt cho Inbound:
     - **Điểm đến (Destination):** Tất cả, Miền Bắc (Hà Nội, Vịnh Hạ Long, Ninh Bình, Sapa), Miền Trung (Huế, Đà Nẵng, Hội An), Miền Nam (TP.HCM, Đồng bằng sông Cửu Long, Phú Quốc).
     - **Phong cách (Travel Style):** Classic Highlights, Culture & Heritage, Beach & Wellness, Adventure & Nature.
   - Kiểm tra hợp lệ: Chỉ hiển thị các tour thuộc site WingSide và có đợt khởi hành tương lai. Vô hiệu hóa nút chọn nếu tour đã nằm trong danh sách 6 slots.
4. **`InboundLiveSimulatorPreview.tsx` (Live Simulator):**
   - Mô phỏng khối *Featured Journeys* 1:1 theo phong cách thiết kế hi-fi của WingSide.
   - Hỗ trợ 3 chế độ khung nhìn: Desktop (1200px), Tablet (768px), Mobile (390px).
   - Hỗ trợ nút chuyển đổi ngôn ngữ mô phỏng (`EN` / `VI`) để kiểm tra hiển thị nội dung dịch.

---

## 3. Cấu trúc Dữ liệu & Tính Tương thích Ngược (Data Contract)

Trường `wingsSideHiFi.home.featuredJourneySelections` trong Payload hiện lưu dạng mảng:
```typescript
[
  { tour: "tour-id-1" },
  { tour: "tour-id-2" },
  { tour: "tour-id-3" },
  ...
]
```
Component Curation mới sẽ đọc và ghi mảng đúng định dạng này, đảm bảo:
- Không thay đổi schema cơ sở dữ liệu PostgreSQL.
- Không gây ảnh hưởng đến hook `validateWingsSideHomeCuration.ts`.
- Tự động tương thích với frontend `WingSideJourneysClient.tsx` và trang chủ WingSide.
