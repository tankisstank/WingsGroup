# US-095 — Báo cáo nghiệm thu & Bằng chứng kiểm thử

## 1. Tóm tắt kết quả triển khai

- **Story**: US-095 (E09 WingsGroup v3 Public Experience)
- **Harness Intake**: #177 (lane: normal)
- **Harness Decision**: `0036-wingsgroup-subservice-introductions`
- **Mục tiêu**:
  - Khai báo 4 route giới thiệu con (`/gioi-thieu-wingsgo`, `/gioi-thieu-wingside`, `/gioi-thieu-wingspass`, `/gioi-thieu-wingscare`) trong Route Governance của WingsGroup.
  - Chuẩn bị dữ liệu 4 trang giới thiệu song ngữ VI/EN với đầy đủ Hero, Feature Grid (4 đặc trưng cốt lõi), CTA tư vấn, và gắn thẻ kiểm duyệt `wingsgroup-content-approved-v1`.
  - Cung cấp script giao dịch đồng bộ khối Ecosystem Explorer trên cả Trang chủ (`/`, Page 191) và Trang Hệ sinh thái (`/he-sinh-thai`, Page 181), trỏ 5 CTA "Xem giới thiệu" tới 5 page tương ứng.

## 2. Kết quả kiểm thử tự động (Verification Gates)

| Hạng mục kiểm thử | Lệnh thực hiện | Kết quả |
| :--- | :--- | :--- |
| **Unit tests** | `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsGroupCorporateRoutes.unit.spec.ts` | **18/18 passed**, exit 0 |
| **Component tests** | `pnpm exec vitest run --config ./vitest.component.config.mts tests/component/wingsGroupV3Homepage.component.spec.tsx` | **27/27 passed**, exit 0 |
| **TypeScript check** | `pnpm -C app exec tsc --noEmit` | **0 errors**, exit 0 |
| **ESLint** | `pnpm -C app exec eslint src/wingsgroup/corporateRoutes.ts tests/unit/wingsGroupCorporateRoutes.unit.spec.ts` | **0 warnings/errors**, exit 0 |

## 3. Biên bản Codex Consultation Gate

- **Phương thức thực hiện**: `codext exec --dangerously-bypass-approvals-and-sandbox`
- **Các điểm phản biện & Khắc phục**:
  - **P2 (Major) - Đảm bảo tính hiển thị công khai**: Codex cảnh báo trạng thái `published` chưa đủ nếu thiếu `contentApproval` marker. Đã cập nhật 4 file cấu hình trang kèm `contentApproval: { vi: WINGSGROUP_CONTENT_VALIDATION_MARKER, en: WINGSGROUP_CONTENT_VALIDATION_MARKER }`.
  - **P2 (Major) - Transaction & Concurrency**: Viết script `sync-ecosystems.mts` áp dụng `serializable` transaction, khóa bảng `_pages_v` và khóa dòng `SELECT id FROM pages WHERE id IN (181, 191) FOR UPDATE`, đồng thời lưu snapshot trước/sau và cơ chế rollback tự động.
  - **P3 (Minor) - Loại bỏ Alias không cần thiết**: Bỏ `/gioi-thieu-wing-side`, chuẩn hóa duy nhất một canonical URL `/gioi-thieu-wingside`.
  - **P3 (Minor) - Mở rộng Coverage**: Cập nhật ma trận test kiểm tra tất cả 5 route `introPaths` × VI/EN × `isRuntimeResolvablePage`.
