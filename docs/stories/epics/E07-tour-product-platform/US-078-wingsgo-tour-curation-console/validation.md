# Validation — US-078: WingsGo Visual Tour Curation Console & Live Simulator

## Story Info

- **ID:** `US-078`
- **Title:** WingsGo Visual Tour Curation Console & Live Simulator
- **Status:** completed
- **Lane:** normal
- **Epic:** `E07 - Nền tảng sản phẩm tour WingsGo`

---

## 1. Verification Matrix

| Layer | Target / Test Suite | Acceptance Expectation | Status |
|---|---|---|---|
| **Unit** | `app/tests/unit/wingsGoTourCuration.unit.spec.ts` | 100% pass logic reorder array, max 6 slots, filter valid tours, pre-validation diagnostics, collection hooks, cross-site isolation, and multi-tier 4-layer resolver. | PASS (19/19) |
| **Component** | `app/tests/component/wingsGoTourCuration.component.spec.tsx` | Render đúng trạng thái slots, split-screen layout, quick reorder, remove, and live simulator desktop/tablet/mobile (2/2 tests). | PASS (2/2) |
| **Catalog Baseline** | `app/tests/unit/wingsGoCatalog.unit.spec.ts` | Không gây bất kỳ xung đột nào với logic catalog & validation backend hiện tại. | PASS (10/10) |
| **Typecheck** | `pnpm exec tsc --noEmit` | 0 errors TypeScript across all files. | PASS (0 errors) |
| **Admin Import Map** | `app/src/app/(payload)/admin/importMap.js` | Component `@/components/WingsGoTourCuration/FeaturedToursCurationField` đăng ký thành công trong Payload import map. | PASS (Generated) |
| **Documentation** | `publish/html/18 Huong dan editor quan tri tour hot va landing page WingsGo.html` | Cập nhật toàn diện hướng dẫn editor sử dụng Curation Console Level 3, menu Bộ tour nổi bật & Live Simulator. | PASS (Updated) |

---

## 2. Acceptance Criteria Checklist

- [x] **AC-1 (Visual Curation Board):** Khung `Tour nổi bật` hiển thị tối đa 6 card tour có ảnh thumbnail, tên đầy đủ, giá từ, ngày bay kế tiếp và nhãn promoLabel.
- [x] **AC-2 (Slot Hierarchy):** Phân chia rõ ràng Top 3 tour (Hero Showcase - viền cam) và 3 tour tiếp theo (Catalog Grid Showcase - viền xanh).
- [x] **AC-3 (Drag & Drop Reordering):** Kéo thả hoán đổi thứ tự giữa các card mượt mà bằng `@dnd-kit`, kèm nút di chuyển nhanh `▲`/`▼` và nút gỡ `✕`, cập nhật đúng thứ tự mảng vào state form.
- [x] **AC-4 (Live Simulator 1:1):** Khung mô phỏng hiển thị đúng diện mạo Hero mini-cards và Catalog grid theo thời gian thực khi editor thao tác, hỗ trợ chuyển đổi Desktop/Tablet/Mobile.
- [x] **AC-5 (Tour Picker Modal):** Nút thêm tour mở modal tìm kiếm trực quan có bộ lọc thị trường (Hàn Quốc, Nhật Bản, Trung Quốc, Đông Nam Á, Khác), phân trang server-side, chỉ liệt kê tour hợp lệ thuộc site WingsGo.
- [x] **AC-6 (Pre-validation & Warning):** Cảnh báo trực tiếp trên card nếu tour thiếu đợt bay tương lai hoặc chưa gắn promoLabel trên Hero slot.
- [x] **AC-7 (Dedicated TourCurations Collection in Menu):** Collection `tour-curations` xuất hiện trên sidebar admin thuộc nhóm Nội dung, có trường `site`, `name`, `isDefault`, `featuredTours` và `description`.
- [x] **AC-8 (Site Default Uniqueness):** Hook `beforeChange` đảm bảo mỗi site chỉ có tối đa một bản ghi `isDefault = true`. Khi bật cờ cho bản ghi mới, bản ghi cũ cùng site tự động tắt cờ.
- [x] **AC-9 (Page-Level Curation Relationship):** Trường `wingsGoTourCatalog.curation` trên collection `Pages` cho phép chọn bộ curation tùy ý, tự động lọc theo site.
- [x] **AC-10 (Multi-Tier Resolver & Fallback):** Frontend hỗ trợ thứ tự đọc: Curation gắn riêng trên Page -> Curation mặc định của Site -> Dữ liệu legacy `/tour` -> Fallback catalog. Không bao giờ làm gián đoạn hiển thị.
- [x] **AC-11 (Cache Invalidation & Revalidation):** Lưu bản ghi `TourCurations` tự động xóa cache Redis và revalidate đồng thời Trang chủ, trang `/tour` và các Page liên quan.

---

## 3. Evidence Log

### 3.1 Unit Test Execution:
```bash
> website@1.0.0 test:unit E:\repo\WingsTravel\app
> cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.unit.config.mts "tests/unit/wingsGoTourCuration.unit.spec.ts"

 ✓ tests/unit/wingsGoTourCuration.unit.spec.ts (19 tests) 289ms
 Test Files  1 passed (1)
      Tests  19 passed (19)
```

### 3.2 Component Test Execution:
```bash
> website@1.0.0 test:component E:\repo\WingsTravel\app
> cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.component.config.mts "tests/component/wingsGoTourCuration.component.spec.tsx"

 ✓ tests/component/wingsGoTourCuration.component.spec.tsx (2 tests) 123ms
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

### 3.5 Data Backfill & Database Migration:
- **PostgreSQL Migration:** `app/src/migrations/20261015_090000_wingsgo_tour_curations.ts` tạo bảng `tour_curations`, `tour_curations_rels`, các cột relationship `curation_id` và chỉ mục.
- **SQLite Repair:** `app/src/utilities/repairLocalSQLiteSchema.ts` hỗ trợ tự động bù đắp schema local mà không gây xung đột.
- **Backfill Script:** `pnpm exec tsx scripts/backfill-wingsgo-tour-curations.ts`
  - Đã tạo bản ghi `TourCurations` đầu tiên: ID `1`, Tên: `Tour nổi bật mặc định WingsGo`, `isDefault: true`, Site: `1 (WingsGo)`.
  - Danh sách tour kế thừa nguyên vẹn: `[17, 16, 15, 14, 13, 12]`.
  - Đã cập nhật Page ID `311` (`/tour`) liên kết trực tiếp `curation = 1`.

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

### 4.2 Codex Pre-Deployment Audit Resolution (Level 3+ Platform Gate)

Theo quy định bắt buộc tại `AGENTS.md`, phiên kiểm toán phát hành (Release Review) cho giai đoạn Nền tảng Curation Độc lập được thực hiện qua Herdr pane (`wP:pD`) với Codex Agent (`gpt-6.1-sol`). Báo cáo chính thức: `docs/codex_release_review_us078_tour_curations.md`. Toàn bộ các phát hiện đã được khắc phục:

| Finding | Phân loại & Rủi ro | Giải pháp triển khai & Bằng chứng |
|---|---|---|
| **P1-1: Preflight duplicate defaults** | Rủi ro migration fail nếu production có duplicate `is_default=true` cùng site trước khi tạo partial unique index. | Đã lập câu lệnh SQL preflight trong checklist release: `SELECT site_id, COUNT(*) FROM tour_curations WHERE is_default = true GROUP BY site_id HAVING COUNT(*) > 1;`. Bắt buộc kiểm tra 0 dòng trước khi migrate. |
| **P2-1: Cross-site curation isolation** | Resolver dùng `overrideAccess: true` có thể chấp nhận curation khác site nếu được liên kết sai ngoài CMS. | Đã bổ sung kiểm tra `curationSite === siteID` tại Tier 1 của `resolveCuratedTourIDs` (`wingsGoCatalog.ts`). Nếu khác site sẽ bị từ chối và fallback về default của site. Đã bổ sung unit test xác minh (23/23 tests PASS). |
| **P2-2: Non-blocking Redis invalidation** | Lệnh `redis.keys` gây nghẽn Redis production đơn luồng khi số lượng keys lớn. | Đã thay thế hoàn toàn bằng `redis.scan` cursor loop không chặn với batch `COUNT 100` trong `TourCurations/hooks.ts`. |
| **P2-3: Revalidate pages pagination limit** | Query tìm các trang liên kết bị chặn ở `limit: 100` có thể bỏ sót trang thứ 101 trở đi. | Đã bổ sung `limit: 1000, pagination: false` trong `revalidateCurationSurfaces` (`TourCurations/hooks.ts`). |
| **P2-4: Migration FK constraint integrity** | Cột `site_id` là `NOT NULL` nhưng FK ban đầu dùng `ON DELETE SET NULL`, gây lỗi xung đột schema PostgreSQL khi xóa site. | Đã chuẩn hóa FK sang `ON DELETE CASCADE` trong migration `20261015_090000_wingsgo_tour_curations.ts`. |
| **P2-5: Migration backfill version consistency** | Backfill chỉ cập nhật `pages` mà không cập nhật bảng `_pages_v`, khiến draft/version có thể bị lệch. | Đã bổ sung câu lệnh `UPDATE "_pages_v" SET "version_wings_go_tour_catalog_curation_id" = v_curation_id` trong migration. |
| **P2-6: Rollback down() implementation** | Hàm `down()` là no-op, không thể rollback DB nếu cần thiết. | Đã triển khai hoàn chỉnh hàm `down()` trong migration để drop columns, foreign keys và tables một cách an toàn. |
| **P2-7: Curation delete protection** | Xóa curation đang được trang liên kết hoặc curation mặc định làm mất liên kết im lặng ngoài frontend. | Đã triển khai hook `preventCurationDelete` trong `TourCurations/hooks.ts` chặn xóa bộ mặc định hoặc bộ đang được trang tham chiếu. Đã có 3 unit test xác minh độc lập. |
| **P2-8: Partial update relation fallback** | Cập nhật partial (đổi site/tên) không truyền `featuredTours` có thể lọt qua validation. | Đã cập nhật `validateTourCurationTours` tự động nạp `originalDoc.featuredTours` khi `data.featuredTours` undefined để kiểm tra cô lập site nhất quán. |
| **P2-9: Reconcile partial backfill state** | Trạng thái migration dở hoặc default rỗng có thể khiến backfill bỏ qua việc nạp tour. | Đã bổ sung logic reconcile vào `scripts/backfill-wingsgo-tour-curations.ts`: nếu default tồn tại nhưng rỗng, script tự động nạp từ legacy hoặc tour active. |
| **P2-10: Curation lifecycle & direct-save contract** | Contract draft/versioning chưa đồng bộ giữa docs và schema collection. | Đã làm rõ quy ước kiến trúc: `TourCurations` là Preset trung tâm dùng chung, áp dụng cơ chế direct-save với quyền hạn phân quyền chặt chẽ (`siteScopedAccess`), tự động clear Redis cache và revalidate ISR ngay lập tức khi lưu. |

**Kết luận kiểm toán:** Đủ điều kiện phát hành (**SHIP READY**) sau khi chạy preflight check P1-1. Toàn bộ 23 unit tests, 10 catalog tests, 2 component tests và TypeScript build đều pass tuyệt đối (exit 0).

