# Code Review & Audit Báo Cáo — US-078 WingsGo Visual Tour Curation Console & Live Simulator

- **Ngày audit:** 2026-10-14
- **Đối tượng review:** Commit `f376c9f` (Triển khai Level 3 Interactive Curation Console & Live Simulator)
- **Công cụ thực hiện:** Codex Agent Code Review & Audit Engine

---

## 1. Kết Luận Tổng Quan

Codex Agent đã thực hiện kiểm tra sâu trên toàn bộ diff mã nguồn, phân tích kiến trúc Payload 3.x, tương thích React 19, tính năng kéo thả `@dnd-kit`, kiểm tra đa site (multi-site tenant isolation) và các điều kiện kinh doanh.

**Đánh giá:**
Kiến trúc tổng thể vững chắc, tuân thủ đúng định hướng Payload-first và giải quyết triệt để bài toán UX kéo thả kết hợp Live Simulator 1:1. 
Codex đưa ra **5 findings (P2)** nhằm tối ưu hóa tính toàn vẹn dữ liệu, khả năng mở rộng catalog và độ hoàn thiện UI. **Toàn bộ 5/5 findings đã được khắc phục hoàn toàn trong mã nguồn.**

---

## 2. Chi Tiết Các Findings & Giải Pháp Xử Lý

### [P2-1] Giới hạn kết quả Picker theo Site và kiểm tra tính đủ điều kiện (Eligibility)
- **Finding từ Codex:** Đối với tài khoản `super-admin` hoặc người dùng quản lý nhiều site, query `/api/tour-products` ban đầu chưa ràng buộc theo site của trang hiện tại, đồng thời chưa cảnh báo trực tiếp nếu tour thiếu trang wrapper `/tour/<slug>` hoặc lịch bay tương lai.
- **Xử lý:**
  - Lấy `siteId` của page qua hook `useDocumentInfo()` trong `FeaturedToursCurationField.tsx` và truyền vào `TourPickerModal`.
  - Bổ sung tham số `where[site][equals]=<siteId>` và `where[_status][equals]=published` vào request API.
  - Kiểm tra `hasWrapperPage` và `hasFutureDeparture`. Nếu tour không thỏa mãn, hiển thị nhãn cảnh báo đỏ (`⛔ Hết lịch bay tương lai` / `⛔ Thiếu wrapper`) và vô hiệu hóa nút chọn với nhãn `Chưa đủ điều kiện`.

### [P2-2] Phân trang danh sách Tour trong Picker Modal (Server-side Pagination & Search)
- **Finding từ Codex:** Giới hạn cố định `limit=100` sẽ bỏ sót các tour cũ hơn khi kho tour vượt quá 100 sản phẩm, đồng thời tìm kiếm client-side chỉ lọc trên tập dữ liệu đã bị cắt ngắn.
- **Xử lý:**
  - Chuyển đổi sang phân trang phía máy chủ (`page`, `limit=20`, `totalPages`, `totalDocs`).
  - Tích hợp debounce tìm kiếm server-side theo `title` và `slug` qua `where[or]`.
  - Bổ sung thanh điều hướng phân trang ở chân modal (`« Trang trước`, `Trang X / Y`, `Trang sau »`).

### [P2-3] Lọc đợt khởi hành tương lai chính xác (Future Departure Date Filter)
- **Finding từ Codex:** Query departures toàn cục theo `where[tourProduct][in]` không lọc ngày có thể bị các đợt khởi hành trong quá khứ chiếm hết giới hạn `limit=100`, dẫn đến tour có đợt bay tương lai bị nhận định sai là `hasFutureDeparture=false`.
- **Xử lý:**
  - Thêm điều kiện `where[departureDate][greater_than]=${new Date().toISOString()}` trực tiếp vào API call cho cả `FeaturedToursCurationField` và `TourPickerModal`.
  - Chỉ truy vấn các đợt bay tương lai cho danh sách tour hiển thị trên trang hiện tại, đồng bộ 100% với logic của hook backend `validateWingsGoTourCatalog.ts`.

### [P2-4] Bổ sung chế độ giả lập Tablet (768px) cho Live Simulator
- **Finding từ Codex:** Khung mô phỏng ban đầu chỉ có Desktop và Mobile, trong khi tiêu chí chấp nhận AC-4 yêu cầu hỗ trợ Desktop, Tablet và Mobile.
- **Xử lý:**
  - Mở rộng kiểu `SimulatorViewportMode = 'desktop' | 'tablet' | 'mobile'` trong `types.ts`.
  - Bổ sung nút `📋 Tablet` vào thanh điều khiển của `LiveSimulatorPreview.tsx`.
  - Bổ sung CSS class `.mode-tablet` với `max-width: 768px` và lưới responsive 2 cột trong `index.scss`.

### [P2-5] Chuẩn hóa bộ lọc cho tất cả các Tab thị trường
- **Finding từ Codex:** Tab `Khác` chưa có nhánh lọc tương ứng, danh sách thị trường Đông Nam Á thiếu các thị trường hợp lệ được định nghĩa trong schema `TourProducts.ts` (Việt Nam, Campuchia, Lào, Myanmar).
- **Xử lý:**
  - Định nghĩa tường minh danh mục `SOUTHEAST_ASIA_MARKETS = ['vietnam', 'thailand', 'cambodia', 'laos', 'myanmar', 'indochina']`.
  - Nhánh `other` lọc chính xác các tour có `market === 'other'` hoặc thị trường nằm ngoài danh mục chính.
  - Áp dụng filter đồng bộ cả ở REST query và fallback client filtering.

---

## 3. Bằng Chứng Nghiệm Thu Kỹ Thuật Sau Khi Xử Lý

- **TypeScript Compilation:**
  ```bash
  pnpm exec tsc --noEmit
  # 0 errors, 0 warnings
  ```
- **ESLint Quality Check:**
  ```bash
  pnpm exec eslint src/components/WingsGoTourCuration
  # 0 errors, 0 warnings
  ```
- **Unit Test Suite:**
  ```bash
  pnpm test:unit tests/unit/wingsGoTourCuration.unit.spec.ts
  # 10 passed (10 tests)
  ```
- **Component Test Suite:**
  ```bash
  pnpm test:component tests/component/wingsGoTourCuration.component.spec.tsx
  # 2 passed (2 tests - covers Desktop, Tablet, Mobile toggles and DnD reordering)
  ```
- **Catalog Baseline Tests:**
  ```bash
  pnpm test:unit tests/unit/wingsGoCatalog.unit.spec.ts
  # 10 passed (10 tests)
  ```
