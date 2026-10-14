# Validation — US-078: WingsGo Visual Tour Curation Console & Live Simulator

## Story Info

- **ID:** `US-078`
- **Title:** WingsGo Visual Tour Curation Console & Live Simulator
- **Status:** implemented
- **Lane:** normal
- **Epic:** `E07 - Nền tảng sản phẩm tour WingsGo`

---

## 1. Verification Matrix

| Layer | Target / Test Suite | Acceptance Expectation | Status |
|---|---|---|---|
| **Unit** | `app/tests/unit/wingsGoTourCuration.unit.spec.ts` | 100% pass logic reorder array, max 6 slots, filter valid tours, pre-validation diagnostics (10/10 tests). | PASS (10/10) |
| **Component** | `app/tests/component/wingsGoTourCuration.component.spec.tsx` | Render đúng trạng thái slots, split-screen layout, quick reorder, remove, and live simulator desktop/mobile (2/2 tests). | PASS (2/2) |
| **Catalog Baseline** | `app/tests/unit/wingsGoCatalog.unit.spec.ts` | Không gây bất kỳ xung đột nào với logic catalog & validation backend hiện tại. | PASS (10/10) |
| **Typecheck** | `pnpm exec tsc --noEmit` | 0 errors TypeScript across all files. | PASS (0 errors) |
| **Admin Import Map** | `app/src/app/(payload)/admin/importMap.js` | Component `@/components/WingsGoTourCuration/FeaturedToursCurationField` đăng ký thành công trong Payload import map. | PASS (Generated) |
| **Documentation** | `publish/html/18 Huong dan editor quan tri tour hot va landing page WingsGo.html` | Cập nhật toàn diện hướng dẫn editor sử dụng Curation Console Level 3 & Live Simulator. | PASS (Updated) |

---

## 2. Acceptance Criteria Checklist

- [x] **AC-1 (Visual Curation Board):** Khung `Tour nổi bật` hiển thị tối đa 6 card tour có ảnh thumbnail, tên đầy đủ, giá từ, ngày bay kế tiếp và nhãn promoLabel.
- [x] **AC-2 (Slot Hierarchy):** Phân chia rõ ràng Top 3 tour (Hero Showcase - viền cam) và 3 tour tiếp theo (Catalog Grid Showcase - viền xanh).
- [x] **AC-3 (Drag & Drop Reordering):** Kéo thả hoán đổi thứ tự giữa các card mượt mà bằng `@dnd-kit`, kèm nút di chuyển nhanh `▲`/`▼` và nút gỡ `✕`, cập nhật đúng thứ tự mảng vào `wingsGoTourCatalog.featuredTours`.
- [x] **AC-4 (Live Simulator 1:1):** Khung mô phỏng hiển thị đúng diện mạo Hero mini-cards và Catalog grid theo thời gian thực khi editor thao tác, hỗ trợ chuyển đổi Desktop/Mobile.
- [x] **AC-5 (Tour Picker Modal):** Nút thêm tour mở modal tìm kiếm trực quan có bộ lọc thị trường (Hàn Quốc, Nhật Bản, Trung Quốc, Đông Nam Á), chỉ liệt kê tour hợp lệ thuộc site WingsGo và disable các tour đã chọn.
- [x] **AC-6 (Pre-validation & Warning):** Cảnh báo trực tiếp trên card nếu tour thiếu đợt bay tương lai (`⛔ Hết lịch bay tương lai`) hoặc chưa gắn promoLabel trên Hero slot (`⚠️ Chưa có nhãn ưu đãi`).
- [x] **AC-7 (Data Integrity & Backward Compatibility):** Dữ liệu lưu vào database giữ nguyên quan hệ ID mảng `pages_rels`, vượt qua toàn bộ các kiểm tra trong `validateWingsGoTourCatalog.ts` và render chuẩn xác trên frontend WingsGo.

---

## 3. Evidence Log

### 3.1 Unit Test Execution:
```bash
> website@1.0.0 test:unit E:\repo\WingsTravel\app
> cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.unit.config.mts "tests/unit/wingsGoTourCuration.unit.spec.ts"

 ✓ tests/unit/wingsGoTourCuration.unit.spec.ts (10 tests) 5ms
 Test Files  1 passed (1)
      Tests  10 passed (10)
```

### 3.2 Component Test Execution:
```bash
> website@1.0.0 test:component E:\repo\WingsTravel\app
> cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.component.config.mts "tests/component/wingsGoTourCuration.component.spec.tsx"

 ✓ tests/component/wingsGoTourCuration.component.spec.tsx (2 tests) 111ms
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

### 3.3 TypeScript Zero-Error Check:
```bash
> pnpm exec tsc --noEmit
# Exit code 0, 0 errors, 0 warnings.
```

### 3.4 Payload Import Map Registration:
```javascript
// app/src/app/(payload)/admin/importMap.js
import { default as default_4f889175352c2e72d9690f43fdcf17c2 } from '@/components/WingsGoTourCuration/FeaturedToursCurationField'
export const importMap = {
  "@/components/WingsGoTourCuration/FeaturedToursCurationField#default": default_4f889175352c2e72d9690f43fdcf17c2,
}
```

---

## 4. Codex Review & Audit Resolution

Commit `f376c9f` được chuyển sang Codex Agent để thực hiện độc lập quy trình code review và audit chuyên sâu. Codex trả về 5 khuyến nghị (P2) và toàn bộ đã được khắc phục triệt để:

| Finding | Khuyến nghị của Codex | Giải pháp triển khai & Bằng chứng |
|---|---|---|
| **P2-1: Restrict picker results to eligible same-site tours** | Lọc tour cùng `site` đang biên tập và chỉ cho phép chọn tour hợp lệ (có wrapper page & lịch bay tương lai). | Lấy `siteId` từ `useDocumentInfo()`, truyền qua `TourPickerModal` với query `where[site][equals]=${siteId}` và kiểm tra `hasWrapperPage && hasFutureDeparture`. Vô hiệu hóa nút chọn nếu không đủ điều kiện. |
| **P2-2: Paginate picker inventory** | Tránh fetch toàn bộ dữ liệu 100 tours một lúc trong picker modal. | Chuyển picker sang phân trang server-side (`limit=20`, `page`, `totalPages`, `totalDocs`) với debounced server-side search (250ms) và thanh điều hướng `« Trang trước` / `Trang sau »`. |
| **P2-3: Future departure query filter** | Query tour departures không dùng bộ lọc ngày nên có thể lấy trúng các đợt bay trong quá khứ. | Bổ sung `where[departureDate][greater_than]=${new Date().toISOString()}` vào REST queries của cả `FeaturedToursCurationField` và `TourPickerModal`. |
| **P2-4: Add tablet viewport to simulator** | Bổ sung viewport tablet (768px) để kiểm tra giao diện 2 cột. | Mở rộng `SimulatorViewportMode` thêm `'tablet'`, thêm nút toggle `📋 Tablet (768px)` và CSS grid 2 cột responsive. |
| **P2-5: Expand market tab filters** | Đồng bộ hóa toàn bộ các tab thị trường với enum `market` thực tế. | Khai báo hằng `SOUTHEAST_ASIA_MARKETS`, bao gồm `vietnam`, `thailand`, `cambodia`, `laos`, `myanmar`, `indochina` và hỗ trợ tab `Khác` (`other`). |

Chi tiết báo cáo audit: `docs/codex_review_wingsgo_curation_console.md`.

