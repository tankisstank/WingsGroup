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

## 4. Biên bản nghiệm thu triển khai Production (Oracle Cloud ARM64)

- **Thời điểm phát hành**: 2026-11-03 21:51 ICT.
- **Commit triển khai**:
  - Code triển khai gốc: `931b7ea` (Candidate release `release-931b7ea`).
  - Hotfix Media Delivery: `78f7b54` (`wingstravel-app:release-931b7ea-fixed`, image `sha256:66c983ff786f0376307eb6792d7f2f10fd7176d7f8d5bc971e9fc9a5b7d23caf`).
- **Nghiệm thu dữ liệu trên PostgreSQL Production**:
  - 4 trang con được xuất bản thành công với `draft: false`, `_status: 'published'`:
    - WingsGo: ID 384 (`/gioi-thieu-wingsgo`)
    - WingSide: ID 385 (`/gioi-thieu-wingside`)
    - WingsPass: ID 386 (`/gioi-thieu-wingspass`)
    - WingsCare: ID 387 (`/gioi-thieu-wingscare`)
  - Khối Ecosystem Explorer trên Trang chủ (ID 191) và Trang Hệ sinh thái (ID 181) đã cập nhật đồng bộ 100% qua Payload API (`apply_sync.mjs`), toàn bộ 5 thẻ trỏ về canonical deep-links với `state: 'approved-deep-link'`.
- **Nghiệm thu sự cố Media Delivery (HTTP 404 -> 200 OK)**:
  - Khắc phục đường dẫn `staticDir` resolve từ runtime `process.cwd()` thay vì bundler inlined path của máy build Windows x64.
  - Bổ sung `PAYLOAD_STANDARD_IMAGE_SIZES` vào route `public-media` phục vụ đầy đủ `thumbnail`, `square`, `small`, `medium`, `large`, `xlarge`, `og`.
- **Nghiệm thu Live Endpoints (HTTP 200 OK)**:
  - `https://wingsgroup.vn/` ➔ HTTP 200 OK
  - `https://wingsgroup.vn/he-sinh-thai` ➔ HTTP 200 OK
  - `https://wingsgroup.vn/gioi-thieu-wingsgo` ➔ HTTP 200 OK
  - `https://wingsgroup.vn/gioi-thieu-wingside` ➔ HTTP 200 OK
  - `https://wingsgroup.vn/gioi-thieu-wingspass` ➔ HTTP 200 OK
  - `https://wingsgroup.vn/gioi-thieu-wingsplus` ➔ HTTP 200 OK
  - `https://wingsgroup.vn/gioi-thieu-wingscare` ➔ HTTP 200 OK
  - Public Media images (JPG, PNG) ➔ HTTP 200 OK (Cloudflare CDN cache enabled).
- **Trạng thái Container**:
  - `http://127.0.0.1:3000/api/health/ready` ➔ `status: ready` (`database: up`, `redis: up`, `leadDelivery: configured`).

