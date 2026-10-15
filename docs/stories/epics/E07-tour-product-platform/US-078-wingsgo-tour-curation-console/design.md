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

---

## 6. Kiến trúc Mở rộng: Collection Độc lập `TourCurations` (Level 3+)

Để giải phóng tính năng Curation khỏi sự phụ thuộc vào document trang `/tour`, kiến trúc được nâng cấp thành mô hình **Hybrid (Collection tập trung + Default Site + Page Binding)**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Navigation Menu Sidebar CMS                     │
│  [Nội dung]                                                            │
│    ├── Trang (Pages)                                                   │
│    ├── Bài viết (Posts)                                                │
│    ├── Chiến dịch tour (Tour Campaigns)                                │
│    └── ⭐ Bộ curation tour (Tour Curations)  <── MỤC MỚI ĐỘC LẬP      │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1. Schema Collection `TourCurations` (`app/src/collections/TourCurations.ts`):
```typescript
export const TourCurations: CollectionConfig = {
  slug: 'tour-curations',
  admin: {
    group: adminGroups.content,
    useAsTitle: 'name',
    defaultColumns: ['name', 'site', 'isDefault', 'updatedAt'],
  },
  fields: [
    siteField(), // Tự động khóa theo site hiện tại qua withAdminSiteContext
    {
      name: 'name',
      label: 'Tên bộ curation',
      type: 'text',
      required: true,
      admin: { placeholder: 'Ví dụ: Tour Hot Trang chủ - Mùa Thu 2026' },
    },
    {
      name: 'isDefault',
      label: 'Đặt làm bộ mặc định cho Site',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Khi bật, bộ này sẽ tự động cung cấp tour cho Trang chủ và trang Catalog của site nếu trang đó không chọn bộ riêng.',
      },
    },
    {
      name: 'featuredTours',
      label: 'Danh sách tour nổi bật (Tối đa 6 tour)',
      type: 'relationship',
      relationTo: 'tour-products',
      hasMany: true,
      maxRows: 6,
      filterOptions: sameSiteFilterOptions,
      admin: {
        components: {
          Field: '@/components/WingsGoTourCuration/FeaturedToursCurationField',
        },
      },
    },
    {
      name: 'description',
      label: 'Ghi chú nội bộ cho Editor',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeChange: [enforceSingleDefaultPerSite, validateTourCurationTours],
    afterChange: [revalidateTourCuration],
    afterDelete: [revalidateTourCuration],
  },
}
```

### 6.2. Trường liên kết trên `Pages` (`wingsGoTourCatalogField`):
Trên `app/src/fields/wingsGoTourCatalog.ts`:
```typescript
{
  name: 'curation',
  label: 'Bộ curation áp dụng',
  type: 'relationship',
  relationTo: 'tour-curations',
  filterOptions: sameSiteFilterOptions,
  admin: {
    description: 'Chọn bộ curation riêng cho trang này. Nếu để trống, trang sẽ tự động sử dụng bộ curation Mặc định của site.',
  },
}
```

---

## 7. Logic Resolver Đa tầng & Fallback 4 Lớp

Hàm `resolveWingsGoTourCuration({ site, curationID, locale })` trong `wingsGoCatalog.ts` thực hiện truy xuất theo thứ tự an toàn:

```text
[Yêu cầu lấy Tour Nổi bật]
          │
          ▼
   1. Curation gắn riêng trên Page? ──(Có & Published)──> Dùng Curation của Page
          │ (Không)
          ▼
   2. Curation mặc định (isDefault=true) của Site? ──(Có & Published)──> Dùng Curation Mặc định Site
          │ (Không)
          ▼
   3. Dữ liệu cũ trong pages_rels của trang /tour? ──(Có)──> Dùng Legacy Featured Tours
          │ (Không)
          ▼
   4. Thuật toán tự động tìm các tour có ngày bay gần nhất
```

---

## 8. Cơ chế Xóa Cache (Redis & Next.js ISR)

Khi một bản ghi `TourCurations` được lưu hoặc xóa:
1. **Redis Cache:** Xóa toàn bộ key cache dạng `wingsgo-curation:${siteID}:*`.
2. **Next.js Revalidation:**
   - Luôn revalidate trang chủ: `revalidatePath('/')`.
   - Luôn revalidate trang catalog: `revalidatePath('/tour')`.
   - Revalidate tất cả các Page đang có `wingsGoTourCatalog.curation == curation.id`.

