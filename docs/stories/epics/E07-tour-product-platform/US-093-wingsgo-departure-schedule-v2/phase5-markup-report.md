# Báo cáo US-093 Phase 5: Giảm markup HTML (AC6)

## 1. Kết quả đo lường HTML SSR & Row Bytes

Đo lường trực tiếp trên cổng thật bằng SSR request (`Host: wingsgo.vn`):
- **Bản cũ (baseline `58cbd24`):** Cổng 3101 (251.262 byte VI, 225.109 byte EN)
- **Bản trước tối ưu Phase 5 (`71661e3`):** Cổng 3100 (242.267 byte VI, 230.764 byte EN, row avg ~3.023 byte)
- **Bản mới sau tối ưu Phase 5:**

| Chỉ số | Baseline cũ (`58cbd24`) | Trước tối ưu Phase 5 | Sau tối ưu Phase 5 | % Giảm so với Baseline | Mục tiêu đề ra | Đánh giá |
|---|---|---|---|---|---|---|
| **HTML VI (`/lich-khoi-hanh`)** | 251.262 B | 242.267 B | **183.652 B** | **−26,91%** | < 213.572 B (−15%) | **ĐẠT** |
| **HTML EN (`/en/lich-khoi-hanh`)** | 225.109 B | 230.764 B | **179.906 B** | **−20,08%** | < 191.342 B (−15%) | **ĐẠT** |
| **Kích thước row VI (min / avg / max)** | — | avg: 3.023 B | **1.105 / 1.397,08 / 1.855 B** | **−53,8%** | avg ≤ 1.600 B | **ĐẠT** |
| **Kích thước row EN (min / avg / max)** | — | avg: 2.980 B | **1.098 / 1.349,97 / 1.593 B** | **−54,7%** | avg ≤ 1.600 B | **ĐẠT** |

---

## 2. Các thay đổi kỹ thuật chính

1. **Scoped Semantic CSS trong `app/src/app/(frontend)/globals.css`:**
   - Gom các chuỗi tiện ích Tailwind dài lặp lại hàng chục lần thành các class ngữ nghĩa có scope:
     - `.wg-row`, `.wg-stub`, `.wg-day`, `.wg-month`, `.wg-wday`, `.wg-main`, `.wg-title`, `.wg-link`, `.wg-meta`, `.wg-route`, `.wg-badge`, `.wg-urgency`, `.wg-price-col`, `.wg-price-lbl`, `.wg-price-val`, `.wg-actions`, `.wg-view`, `.wg-cta`.
     - Giữ nguyên các class `wingsgo-schedule-*` dưới dạng alias để đảm bảo tương thích ngược.
     - Giữ nguyên các hiệu ứng: notch vé khoét lỗ (`.wg-stub::before/::after`), focus-visible 44px, prefers-reduced-motion.
   - Thay thế các inline SVG lặp lại ở mỗi row (Plane icon 238 byte, Hot icon 185 byte) bằng CSS mask vector `.wg-plane` và `.wg-hot-icon`, tiết kiệm trực tiếp hơn 200–300 byte trên mỗi row.

2. **Refactor các component hiển thị đợt khởi hành:**
   - `WingsGoScheduleRow.tsx`: Chuyển sang class `.wg-*`, giữ nguyên `data-od-id="departure-${row.id}"`, accessibility attributes, và các trạng thái sold-out / hold seat.
   - `WingsGoScheduleDateList.tsx`: Chuyển class nhóm tháng, tiêu đề tháng, đếm đợt khởi hành và nút xem thêm sang scoped CSS.
   - `WingsGoScheduleTourList.tsx`: Chuyển thẻ tour, thumbnail media, body, chip ngày và footer sang scoped CSS, bảo toàn `min-h-[44px]` cho vùng chạm cảm ứng.
   - `WingsGoScheduleFilterBar.tsx`: Chuyển select (hãng bay, tình trạng, sắp xếp) và chip thị trường sang scoped CSS.
   - `WingsGoScheduleMarketCards.tsx`: Chuyển thẻ spotlight thị trường sang scoped CSS.

---

## 3. Danh sách file đã chỉnh sửa

1. `app/src/app/(frontend)/globals.css`
2. `app/src/tours/WingsGoScheduleRow.tsx`
3. `app/src/tours/WingsGoScheduleDateList.tsx`
4. `app/src/tours/WingsGoScheduleTourList.tsx`
5. `app/src/tours/WingsGoScheduleFilterBar.tsx`
6. `app/src/tours/WingsGoScheduleMarketCards.tsx`

---

## 4. Bằng chứng kiểm thử & Cổng chất lượng

- `pnpm run lint`: **0 errors** (479 warnings baseline).
- `pnpm run test:unit`: **172 passed, 1 failed** (chỉ còn đúng 1 lỗi baseline `wingsGroupV3Shell.unit.spec.ts`).
- `pnpm run test:component`: **66 passed (482/482 tests)** (bao gồm toàn bộ tests `wingsGoSchedulePhase2`, `wingsGoSchedulePhase3`, `wingsGoSchedulePhase4`).
- `pnpm exec tsc --noEmit`: **2 lỗi baseline** (cả 2 lỗi tại `wingsGroupCorporateRoutes.unit.spec.ts`).
- `pnpm run build`: **Exit code 0** (Next.js 16.2.6 Turbopack production build thành công).
- **Hình ảnh minh chứng giao diện không đổi (Artifacts):**
  - Đã lưu đầy đủ 8 ảnh trước / sau vào `docs/stories/epics/E07-tour-product-platform/US-093-wingsgo-departure-schedule-v2/artifacts/phase5-markup/`:
    - `before-1440-theo-ngay.png` vs `after-1440-theo-ngay.png`
    - `before-1440-theo-hanh-trinh.png` vs `after-1440-theo-hanh-trinh.png`
    - `before-390-theo-ngay.png` vs `after-390-theo-ngay.png`
    - `before-390-theo-hanh-trinh.png` vs `after-390-theo-hanh-trinh.png`
