# Exec Plan — US-078: WingsGo Visual Tour Curation Console & Live Simulator

## Goal

Triển khai hoàn chỉnh component Custom Field **Level 3: WingsGo Visual Tour Curation Console & Live Simulator** trong Payload CMS 3.x, thay thế ô input relationship text thô hiện tại bằng một bảng điều phối kéo thả trực quan có mô phỏng thời gian thực, đáp ứng 100% các tiêu chí chấp nhận trong `overview.md`.

## Scope

- **In Scope:**
  - Component React Client: `FeaturedToursCurationField`, `TourSortableCard`, `TourPickerModal`, `LiveSimulatorPreview`.
  - Tích hợp `@dnd-kit/core` và `@dnd-kit/sortable` (chuẩn React 19).
  - Cấu hình trường `wingsGoTourCatalogField` trong `app/src/fields/wingsGoTourCatalog.ts`.
  - Chạy `pnpm run generate:importmap` để Payload nhận diện component.
  - Viết unit / component test xác minh luồng dữ liệu và render.
  - Kiểm tra tương thích browser thực tế bằng `agent-browser`.
  - Cập nhật tài liệu vận hành và đồng bộ Harness / Plane.

- **Out of Scope:**
  - Thay đổi schema database hoặc migration cơ sở dữ liệu (giữ nguyên cấu trúc `featuredTours`).
  - Thay đổi thuật toán query frontend `wingsGoCatalog.ts`.

## Execution Phases

### Phase 1: Scaffold & Data Types
1. Tạo thư mục `app/src/components/WingsGoTourCuration/`.
2. Định nghĩa types/DTO: `CuratedTourCardData`, `TourPickerFilter`, `SimulatorViewportMode`.
3. Chuẩn bị file SCSS `index.scss` hỗ trợ flex/grid, card hover, drop indicator và theme variables.

### Phase 2: Core Components (Card & Picker)
1. Xây dựng `TourSortableCard.tsx`: Tích hợp hook `useSortable` từ `@dnd-kit/sortable`, render thumbnail, tiêu đề, giá, ngày bay, badge Promo và nút thao tác.
2. Xây dựng `TourPickerModal.tsx`: Render popup chọn tour, fetch danh sách tour WingsGo từ REST API, bộ lọc theo thị trường và ô tìm kiếm tức thì.

### Phase 3: Live Simulator Component
1. Xây dựng `LiveSimulatorPreview.tsx`:
   - Mô phỏng Khối 1: Hero Commerce Panel (3 mini cards với badge gradient cam).
   - Mô phỏng Khối 2: Catalog Grid (lưới tour 4 cột).
   - Thanh công cụ chuyển đổi kích thước: Desktop (1440px), Mobile (375px).

### Phase 4: Container & Payload Integration
1. Xây dựng `FeaturedToursCurationField.tsx`:
   - Kết nối với form Payload bằng `useField({ path: 'wingsGoTourCatalog.featuredTours' })`.
   - Bố cục Split-Screen: Board kéo thả bên trái, Live Simulator bên phải.
   - Quản lý DndContext và xử lý sự kiện `onDragEnd` bằng `arrayMove`.
   - Pre-validation engine hiển thị cảnh báo hợp lệ.
2. Cập nhật `app/src/fields/wingsGoTourCatalog.ts` khai báo `admin.components.Field`.
3. Chạy lệnh: `pnpm run generate:importmap` từ thư mục `app/`.

### Phase 5: Verification & Testing
1. Viết unit test trong `app/tests/unit/wingsGoTourCuration.unit.spec.ts` kiểm tra:
   - Khởi tạo danh sách từ array IDs.
   - Thao tác kéo thả thay đổi vị trí mảng.
   - Pre-validation logic (max 6, no duplicate, thiếu đợt bay, thiếu promo label).
2. Chạy `pnpm run test:unit` và `pnpm run test:component`.
3. Chạy `pnpm exec tsc --noEmit` để đảm bảo 0 lỗi TypeScript.
4. Mở CMS Admin trên trình duyệt bằng `agent-browser` để nghiệm thu giao diện thực tế.

### Phase 6: Documentation & Harness / Plane Sync
1. Cập nhật `publish/html/18 Huong dan editor quan tri tour hot va landing page WingsGo.html` bổ sung hướng dẫn sử dụng tính năng kéo thả và live simulator mới.
2. Cập nhật bằng chứng vào `validation.md`.
3. Cập nhật trạng thái story trong Harness: `pwsh -File scripts/harness.ps1 story update --id US-078 ...`.
4. Đồng bộ Plane workitems qua `pnpm run plane:sync:workitems`.
