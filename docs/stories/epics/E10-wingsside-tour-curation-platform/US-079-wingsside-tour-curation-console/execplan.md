# Execution Plan — US-079: WingSide Visual Tour Curation Console & Live Inbound Simulator

## 1. Giai đoạn Triển khai (Execution Phases)

### Giai đoạn 1: Chuẩn bị Cấu trúc & Kế thừa Mã nguồn
- [ ] Khởi tạo thư mục component: `app/src/components/WingSideTourCuration/`.
- [ ] Xây dựng file kiểu dữ liệu `types.ts` bao gồm: thông tin hành trình Inbound, điểm đến (`destinationTag`), phong cách du lịch (`travelStyle`), ngôn ngữ (`en`, `vi`) và chế độ khung nhìn (`desktop`, `tablet`, `mobile`).
- [ ] Tạo file giao diện `index.scss` kế thừa hệ màu thương hiệu WingSide (Navy blue `#0F294A`, Vàng kim cát `#D4AF37`, Emerald green `#0A5C36`).

### Giai đoạn 2: Phát triển Curation Board & Kéo thả
- [ ] Xây dựng component `InboundTourSortableCard.tsx` tích hợp `@dnd-kit/sortable`, hiển thị giá USD, số ngày/đêm và cảnh báo bản dịch tiếng Anh.
- [ ] Xây dựng component cha `WingSideFeaturedJourneysCurationField.tsx` tích hợp `useField`, `useDocumentInfo` và `@dnd-kit/core`.
- [ ] Hỗ trợ phân định Top 2 (Primary Highlight) và Slot 3..6 (Secondary Showcase).

### Giai đoạn 3: Phát triển Inbound Picker Modal
- [ ] Xây dựng `InboundTourPickerModal.tsx` với phân trang server-side (`limit=20`) và debounced search (250ms).
- [ ] Tích hợp bộ lọc taxonomy Inbound: Điểm đến (Miền Bắc, Miền Trung, Miền Nam, Vịnh Hạ Long, Hội An...) và Phong cách du lịch.
- [ ] Tự động lọc theo site WingSide và chỉ liệt kê các tour có lịch bay tương lai (`departureDate > now()`).

### Giai đoạn 4: Phát triển Live Inbound Simulator 1:1
- [ ] Xây dựng `InboundLiveSimulatorPreview.tsx` tái hiện layout thẻ tour Inbound hi-fi trên WingSide.
- [ ] Bổ sung thanh công cụ chuyển đổi Viewport (Desktop 1200px, Tablet 768px, Mobile 390px) và Ngôn ngữ (`EN`/`VI`).

### Giai đoạn 5: Đăng ký Import Map & Kiểm định Chất lượng
- [ ] Gắn component vào trường `featuredJourneySelections` trong `app/src/fields/wingsSideHiFi.ts`.
- [ ] Chạy `pnpm run generate:importmap` để cập nhật Payload import map.
- [ ] Viết unit tests (`wingsSideTourCuration.unit.spec.ts`) và component tests (`wingsSideTourCuration.component.spec.tsx`).
- [ ] Kiểm tra typecheck `tsc --noEmit` và ESLint đạt 0 lỗi.
- [ ] Đồng bộ hóa trạng thái lên Harness và Plane.
