# Đánh Giá Độc Lập Phát Hành Production: US-085 (Header Option A & Hotline WingsGroup)

**Mã tài liệu:** `AGY-RELEASE-REVIEW-US085`  
**Dự án:** WingsTravel — Workspace `WingsTravel`  
**Story:** US-085 (WingsGroup Header Option A & Hotline Consolidation `0948786775`)  
**Mục tiêu đối chiếu:** Production hiện hành `0701404` → Candidate US-085  
**Người đánh giá độc lập:** agy (Antigravity)  
**Thời điểm đánh giá:** 2026-10-23T15:00:00+07:00  
**Trạng thái đề xuất:** **APPROVED FOR CONTROLLED CUTOVER (Khuyến nghị phát hành có kiểm soát)**

---

## 1. Tóm Tắt Tổng Quan & Phạm Vi Candidate

Đánh giá này được thực hiện độc lập theo ủy quyền phát hành US-085, tuân thủ nghiêm ngặt runbook Oracle Cloud ARM64 (`docs/runbooks/oracle-vps-arm64-deployment.md`), Codex audit (`docs/stories/.../US-085.../audit.md`) và kết quả kiểm thử tái hiện (`codex-recheck/`).

- **Base Production hiện hành:** Commit `0701404` (đã gắn proof preview handoff và SAVE).
- **Candidate Scope (chỉ US-085):**
  1. Header Option A split call button + contact popup (`app/src/Header/Nav/index.tsx`).
  2. Scoped CSS v3 WingsGroup (`app/src/app/(frontend)/wingsgroup-v3.css`).
  3. Contact section fallback component (`app/src/blocks/WingsGroupContact/Component.tsx`).
  4. Script cập nhật hotline an toàn (`app/scripts/updateWingsGroupHotline.ts`).
  5. Đăng ký gate release & fidelity contract (`wingsgroup-v3-release-gates.json`, `wingsgroup-v3-fidelity-contract.json`).
- **Phần loại trừ (dirty baseline):** Diff của `app/src/payload-types.ts` (thứ tự field do generation) và `postgresCrudSmokeLifecycle.mjs` thuộc baseline trước, không được đóng gói lẫn vào functional code US-085.

---

## 2. Race Conditions & Tính Đồng Thời (Concurrency)

### 2.1. Thao tác CMS đồng thời với Script Update
- **Phân tích rủi ro:** Payload Local API khi cập nhật `site-settings` không có cơ chế *Optimistic Concurrency Control* / *Compare-And-Swap (CAS)*. Nếu Admin CMS đang mở form SiteSettings và nhấn "Save" đúng thời điểm script chạy, dữ liệu có thể bị ghi đè chéo.
- **Biện pháp kiểm soát bắt buộc trong runbook:**
  1. **Khóa cửa sổ thao tác CMS (Maintenance Window):** Thông báo quản trị viên không sửa SiteSettings trong quá trình cutover (khoảng 5-10 phút).
  2. **Thứ tự thực thi:** 
     - Snapshot / Backup PostgreSQL.
     - Chạy script cập nhật hotline qua immutable operations container.
     - Kiểm tra kết quả ngay lập tức bằng read query.
     - Chuyển symlink `current` và recreate container app.

### 2.2. Đọc đồng thời trong lúc Revalidation (Stale Reads)
- **Cơ chế:** Khi `payload.update` hoàn tất, hook `afterChange` gọi `invalidateSettingsCache(siteId)` kích hoạt xóa cache Redis và revalidate tag Next.js.
- **Hành vi chuyển tiếp:** Các request SSR đang dở dang có thể đọc số cũ `0912910101` hoặc số mới `0948786775`. Tuy nhiên:
  - Cả hai số đều là số điện thoại thật của doanh nghiệp, không gây gãy liên kết `tel:`.
  - Không có bất kỳ race condition nào dẫn đến crash hệ thống, treo kết nối database, hoặc sinh exception `500`.

---

## 3. Edge Cases & Khả Năng Chống Lỗi (Robustness)

| Trường hợp biên (Edge Case) | Cơ chế xử lý đã kiểm chứng | Đánh giá an toàn |
|---|---|---|
| **CMS-cleared (supportPhone rỗng/null)** | `evaluateHotlineTransition` coi đây là chủ động xóa từ CMS, trả về `noop` với **0 writes**. Contact section render `null`, không tiêm số hardcode. | **Tuyệt đối an toàn** (Đã đóng F1, kiểm chứng qua 7/7 reproducer cases). |
| **Hotline chính mang số tùy biến khác** | Nếu số hiện tại không phải `0912910101` (ví dụ admin đã đặt số khác), script lập tức `safe-abort` với **0 writes**, không ghi đè bừa bãi. | **Tuyệt đối an toàn** (Bảo vệ dữ liệu quản trị viên). |
| **Kênh phụ (additionalHotlines)** | Giữ nguyên 100% mảng `additionalHotlines` (dù là `null`, `[]`, hay mảng có nhãn tùy chỉnh). Script không chạm vào field này. | **Tuyệt đối an toàn**. |
| **Màn hình hẹp cực hạn (320px)** | Cụm gọi mobile thu gọn padding `8px`, mark `22px`, gap `4px`. Khoảng cách logo→call đạt 15.55px (VI) / 16.25px (EN). Popup rộng 260px, mép trái `left: 35px`, không tràn mép (trước sửa là `-3px`). | **Đạt chuẩn responsive** (Đã đóng F2, kiểm chứng qua 44 browser cases). |
| **Chuyển đổi Locale đa ngữ (VI / EN)** | Popup mobile dùng chung `resolveHotlineItemLabel`, hiển thị chuẩn "Tour consultation" và "Travel support" khi sang EN. | **Đạt chuẩn i18n** (Đã đóng F3). |
| **Tên tiếp cận WingsGo (Aria-label)** | Nút gọi mobile WingsGo giữ đúng `Call WingsGo ...` (EN) và `Gọi hotline WingsGo ...` (VI), không bị ghi đè bởi chuỗi cố định. | **Đạt chuẩn A11y & Tenant Isolation** (Đã đóng F4). |
| **Điều hướng Bàn phím (WCAG 2.1)** | Khi nhấn Escape từ bên trong link của mobile drawer, focus được hoàn trả chuẩn xác về ref của nút hamburger toggle. | **Đạt chuẩn A11y** (Đã đóng F5). |
| **Trùng lặp nhãn Locale (VIVI / ENEN)** | Thêm rule `content: none !important;` cho `::after` trong CSS v3 scoped của WingsGroup, triệt tiêu việc nhân đôi text từ `globals.css:3943`. | **Đạt chuẩn hiển thị** (Đã đóng F6). |

---

## 4. Cache Invalidation & Tính Nhất Quán (Cache & Stale Reads)

1. **Next.js Standalone Container:**
   - Quá trình deploy theo runbook (`docker compose up -d --force-recreate app`) sẽ hủy container cũ và khởi động container mới từ release bundle.
   - Cache in-memory (lru-cache) và cache ephemeral của Next.js cũ bị xóa sạch hoàn toàn, loại bỏ 100% nguy cơ giữ lại mã JS/CSS cũ.
2. **Next.js Static Assets Hashing:**
   - Các file CSS và JS chunks trong `_next/static/` đều được băm theo content hash mới từ lệnh build. Trình duyệt client và CDN sẽ fetch ngay file mới, không bị dính cache stylesheet cũ.
3. **Redis Tag & Settings Cache:**
   - Dữ liệu `site-settings` được invalidate qua hook `invalidateSettingsCache(siteId)`.
   - *Khuyến nghị bổ sung:* Trong bước 8 của quy trình deploy, sau khi container khởi động, thực hiện kiểm tra `curl -s http://127.0.0.1:3000/api/health/ready` (đảm bảo Redis `"up"`) và kiểm tra trang chủ xem số `0948 786 775` đã hiển thị nhất quán trên header và footer.

---

## 5. Cô Lập Đa Site (Multisite Isolation)

- **Database Isolation (`siteField`):**
  - Schema `site-settings` liên kết trực tiếp với bảng `sites` qua `site.id`.
  - Script `updateWingsGroupHotline.ts` thực hiện query lọc nghiêm ngặt `{ site: { equals: site.id } }` với `site.code === 'wings-group'`.
  - Hoàn toàn không có khả năng tác động nhầm sang site settings của `wing-side` hay `wings-go`.
- **CSS Scope Protection:**
  - Toàn bộ CSS Option A được đóng gói trong bộ chọn:
    `body[data-site-code='wings-group'][data-wingsgroup-v3='true']`
  - Unit test `wingsGroupV3ResponsiveCss.unit.spec.ts` (6/6 pass) xác nhận không có bất kỳ selector nào rò rỉ ra ngoài phạm vi site `wings-group`.
  - Các trang của WingsGo (`/wingsgo`) và WingSide (`/wingside`) hoàn toàn không bị ảnh hưởng style hay bố cục.

---

## 6. Tính An Toàn Migration & Database Schema

- **Không Thay Đổi Schema (Zero Schema Migration):**
  - US-085 là thay đổi thuần túy về UI Header và giá trị dữ liệu hotline trong field `supportPhone` có sẵn.
  - Không thêm Collection, không thêm trường mới, không đổi kiểu dữ liệu PostgreSQL.
  - Lệnh `pnpm payload migrate` trên production sẽ báo `No pending migrations`, đảm bảo tương thích ngược 100% giữa code mới và schema database hiện hữu.
- **Phương Thức Cập Nhật Dữ Liệu An Toàn:**
  - Khuyến nghị sử dụng immutable tools image (`operations-image.tar`) để chạy:
    ```bash
    sudo docker run --rm \
      --network wingstravel_default \
      --env-file /home/ubuntu/wings-travel/shared/.env \
      -e NODE_ENV=production \
      -e PAYLOAD_DB_PUSH=false \
      "$OPS_IMAGE_ID" \
      pnpm exec tsx scripts/updateWingsGroupHotline.ts --apply
    ```
  - Chạy qua script Payload đảm bảo:
    - Kích hoạt đúng lifecycle hooks (`afterChange`).
    - Tự động xóa cache Redis cho site `wings-group`.
    - Kiểm tra preflight nghiêm ngặt trước khi cập nhật.

---

## 7. Kế Hoạch Rollback Toàn Diện (Rollback Plan)

Trường hợp phát sinh sự cố sau khi cutover, thực hiện rollback theo 2 kịch bản phân tách rõ ràng:

### Kịch bản A: Rollback Ứng Dụng (Code / UI Issue) — Thời gian < 30 giây
Nếu phát hiện lỗi hiển thị hoặc xung đột runtime trên production:
```bash
# 1. Chuyển lại symlink về release 0701404 trước đó
ln -sfn /home/ubuntu/wings-travel/releases/release-0701404 /home/ubuntu/wings-travel/current

# 2. Recreate container với bản build cũ
cd /home/ubuntu/wings-travel/current
docker compose -f docker-compose.production.yml -p wingstravel --env-file /home/ubuntu/wings-travel/shared/.env up -d --no-deps --no-build --pull never --force-recreate app

# 3. Kiểm tra healthcheck
curl -s http://127.0.0.1:3000/api/health/ready
```
*Ghi chú:* Vì không có thay đổi schema database, release `0701404` hoàn toàn tương thích và hiển thị bình thường với số điện thoại mới trong database.

### Kịch bản B: Rollback Dữ Liệu Hotline (Data Revert)
Nếu ban điều hành yêu cầu trả lại số hotline cũ `0912910101`:
1. **Cách 1 (Nhanh nhất):** Đăng nhập Payload Admin UI (`/admin`), vào mục **Cài đặt trang** của `Wings Group`, sửa trường `supportPhone` thành `0912910101` và lưu lại.
2. **Cách 2 (Database restore):** Sử dụng bản sao lưu PostgreSQL được tạo ngay trước cutover tại Bước 6 của Runbook để khôi phục bảng `site_settings`.

---

## 8. Bảng Kiểm Tra Trước Cutover (Pre-Cutover Checklist)

| STT | Hạng mục kiểm tra | Trách nhiệm | Trạng thái xác nhận |
|---|---|---|---|
| 1 | Docker Operations Image ARM64 bất biến khớp SHA candidate US-085 | Codex | Sẵn sàng (`operations-image.tar`) |
| 2 | Backup cơ sở dữ liệu PostgreSQL trước khi apply hotline | Codex / Ops | Bắt buộc trước cutover |
| 3 | Khóa thao tác chỉnh sửa SiteSettings trên CMS Admin | Quản trị viên | Trong cửa sổ cutover |
| 4 | Kiểm tra output script update hotline báo `status: updated`, 1 write | Codex / Ops | Chạy qua ops image |
| 5 | Symlink `current` chuyển sang release candidate mới | Codex / Ops | Sau khi update DB |
| 6 | Kiểm tra `api/health/ready` trả về `database: up`, `redis: up` | Codex / Ops | Sau khi container chạy |
| 7 | Chụp ảnh kiểm chứng live browser trên `wingsgroup.vn` & `wingsgo.vn` | Codex / Root | Hoàn tất trước đóng story |

---

## 9. Kết Luận Độc Lập

Candidate US-085 đáp ứng đầy đủ các tiêu chuẩn khắt khe về kỹ thuật, cô lập đa site, an toàn dữ liệu và khả năng rollback tức thời. Không tồn tại rào cản kỹ thuật (P1/P2) nào ngăn cản việc triển khai.

**Khuyến nghị:** Phê duyệt tiến hành đóng gói và triển khai candidate US-085 lên Production VPS theo đúng quy trình của Oracle Cloud ARM64 Runbook.
