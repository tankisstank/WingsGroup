# Báo cáo triển khai US-085 — Phương án A (WingsGroup Header & Hotline Consolidation)

> **Mã công việc:** US-085 (Epic E09 - WingsGroup v3 Public Experience)  
> **Người thực hiện:** Antigravity (agy)  
> **Thời điểm hoàn thành:** 2026-10-23T12:20:00+07:00  
> **Trạng thái:** Hoàn tất triển khai local & tự kiểm toàn diện (Ready for Codex / Tech Lead Review)  
> **Markers:** `AGY_US085_ACCEPTED` | `AGY_US085_READY_FOR_REVIEW`

---

## 1. Tóm tắt kết quả triển khai Phương án A

Người dùng đã duyệt **Phương án A** cho cụm điều hướng và liên hệ trên header WingsGroup (`wings-group` tenant, v3 public surface), đồng thời chỉ đạo cập nhật hotline chính từ `0912910101` thành `0948786775` (`0948 786 775`).

### 1.1 Hợp đồng giao diện & tương tác (Option A Contract)
- **Desktop (>= 1200px):**
  - Cụm hành động vàng kim thống nhất (single golden cluster): Nút link gọi trực tiếp (`Gọi ngay` / `Call now` + `0948 786 775` với `<a href="tel:0948786775">`) kết hợp nút mũi tên disclosure độc lập (`<button aria-controls="wingsgroup-header-contact-dropdown">`).
  - Loại bỏ hoàn toàn nút CTA độc lập ("Trao đổi nhu cầu" / "Speak with a specialist") và link Zalo chữ độc lập trên header WingsGroup nhằm triệt tiêu cạnh tranh thị giác và xóa bỏ hoàn toàn hiện tượng đè logo (`brandNavOverlap = 0px`).
  - Menu "Liên hệ" / "Contact" được giữ nguyên vị trí là một navigation link trỏ về `/#contact` hoặc `/lien-he`.
  - Dropdown menu xuất hiện khi bấm nút disclosure chứa:
    1. Hotline phụ 1: `0915 250 101` (`Tư vấn tour` / `Tour consultation`)
    2. Hotline phụ 2: `0915 260 101` (`Hỗ trợ dịch vụ` / `Travel support`)
    3. Kênh Zalo OA (`Chat Zalo` / `Chat on Zalo`)
    4. Form liên hệ tư vấn (`Gửi nhu cầu` / `Send an inquiry`) dẫn đến `/lien-he#contact-form` kèm context focus.
- **Mobile (< 1200px):**
  - Cụm nút gọi rút gọn: Nút gọi trực tiếp `Gọi ngay` + nút mũi tên dropdown và nút hamburger.
  - Drawer menu di động chứa đầy đủ 6 navigation link, toàn bộ 4 kênh liên hệ (3 hotline + Zalo + Gửi nhu cầu) và bộ chuyển ngôn ngữ rút gọn.
- **Bộ chuyển ngôn ngữ (Language Switcher):**
  - Hiển thị nhãn trực quan siêu gọn `VI | EN`, giữ nguyên 100% tên accessible `aria-label="Tiếng Việt (vi)"` và `aria-label="ENGLISH (en)"`, duy trì tương thích toàn bộ test suite.
- **Khả năng tiếp cận & bàn phím (A11y & Keyboard):**
  - Phím `Escape` tự động đóng dropdown / drawer và trả focus về chính xác nút toggle mở nó.
  - Bấm click chuột bên ngoài (outside click) tự động đóng dropdown.
- **Cô lập Tenant (Tenant Isolation):**
  - Tuyệt đối không thay đổi `WINGSGO_DEFAULT_HOTLINES` trong `siteHotlines.ts`.
  - Các tenant khác (`wings-go`, `wing-side`) không bị ảnh hưởng, giữ nguyên hotline và logic header riêng biệt.

---

## 2. Danh mục file thay đổi & tạo mới

| File | Hành động | Mục đích & Phạm vi |
| :--- | :---: | :--- |
| `app/src/Header/Nav/index.tsx` | Modified | Triển khai Option A desktop cluster, dropdown channels, mobile compact tools, localized channel labels, Escape/focus handlers, sessionStorage context. Giữ nguyên tenant `wings-go` và `wing-side`. |
| `app/src/app/(frontend)/wingsgroup-v3.css` | Modified | Thêm CSS scoped cho `.wingsgroup-contact-zone`, `.wingsgroup-split-call`, `.wingsgroup-call-link`, `.wingsgroup-split-toggle`, `.wingsgroup-contact-popup`, `.wingsgroup-channel`, và responsive mobile overrides. |
| `app/src/blocks/WingsGroupContact/Component.tsx` | Modified | Cập nhật fallback hotline WingsGroup từ `0912 910 101` thành `0948 786 775`. |
| `app/scripts/lib/wingsGroupCorporateRouteSeed.ts` | Modified | Cập nhật `supportPhone` trong seed corporate routes (`vi` và `en`) từ `0912910101` thành `0948786775`, cấu hình `additionalHotlines` (`0915250101`, `0915260101`). |
| `app/scripts/updateWingsGroupHotline.ts` | **New** | Script di chuyển hotline idempotent an toàn: thuần hàm đánh giá `evaluateHotlineTransition()` và thực thi qua Payload `updateWingsGroupHotlineInPayload()` kèm context seed và hook revalidation. |
| `app/tests/unit/updateWingsGroupHotline.unit.spec.ts` | **New** | Bộ test unit 7 ca kiểm thử tính an toàn, lũy kế (idempotency), kiểm tra site code, số cũ, số mới, và từ chối số bất thường. |
| `app/tests/component/wingsGroupHeaderOptionA.component.spec.tsx` | **New** | Bộ test component Vitest 5 ca kiểm thử desktop VI, desktop EN, mobile drawer, accessible language labels, và xử lý empty hotline. |
| `app/tests/unit/wingsGroupCorporateRoutes.unit.spec.ts` | Modified | Cập nhật assertion hotline mong đợi sang `0948786775`. |
| `app/tests/unit/wingsGroupV3PreviewSeed.unit.spec.ts` | Modified | Cập nhật bootstrap inline hotline sang `0948786775`. |

*(Lưu ý: Không can thiệp các file thuộc quyền quản lý của Codex: `docs/stories/`, `docs/plane/manifest.json`, Harness, và prototype).*

---

## 3. Chuyển dịch dữ liệu & Tính lũy kế (Data Transition & Idempotency)

Đã xây dựng script `app/scripts/updateWingsGroupHotline.ts` tuân thủ nghiêm ngặt quy tắc an toàn dữ liệu đa site:
1. **Kiểm tra tiền điều kiện (Preflight Validation):**
   - Site code bắt buộc là `wings-group`. Nếu truyền site khác -> throw error ngay lập tức.
   - Số điện thoại hiện tại:
     - Nếu là `0912910101` (hoặc rỗng/chưa cấu hình) -> Chuyển thành `0948786775` (`status: updated`).
     - Nếu đã là `0948786775` -> Không cập nhật, trả về no-op an toàn (`status: noop`).
     - Nếu là số tùy chỉnh bất thường khác -> Ném ngoại lệ an toàn, dừng lại ngay và không ghi dữ liệu (`Safety abort`).
2. **Kích hoạt Hook Invalidation:**
   - Sử dụng `payload.update` kích hoạt hook `invalidateSettingsAfterChange` hiện hữu của hệ thống mà không cần flush Redis toàn hệ thống.

### Kết quả chạy kiểm thử thực tế trên DB local:
- **Lần 1 (Old -> New):**
  ```json
  {
    "siteCode": "wings-group",
    "status": "updated",
    "previousPhone": "0912910101",
    "currentPhone": "0948786775",
    "message": "Updated WingsGroup hotline from 0912910101 to 0948786775."
  }
  ```
- **Lần 2 (Idempotent No-op Verification):**
  ```json
  {
    "siteCode": "wings-group",
    "status": "noop",
    "previousPhone": "0948786775",
    "currentPhone": "0948786775",
    "message": "Hotline is already up-to-date (0948786775). No change needed."
  }
  ```

---

## 4. Kết quả kiểm thử tự động & Bằng chứng lệnh

| Hạng mục kiểm tra | Lệnh thực thi | Kết quả | Trạng thái |
| :--- | :--- | :---: | :---: |
| **TypeScript Typecheck** | `pnpm --prefix app exec tsc --noEmit` | Exit code 0, 0 errors | **PASS** |
| **Hotline Transition Safety** | `pnpm --prefix app test:unit -- tests/unit/updateWingsGroupHotline.unit.spec.ts` | 7 passed (7 tests) | **PASS** |
| **Corporate Routes Unit** | `pnpm --prefix app test:unit -- tests/unit/wingsGroupCorporateRoutes.unit.spec.ts` | 17 passed (17 tests) | **PASS** |
| **Preview Seed Unit** | `pnpm --prefix app test:unit -- tests/unit/wingsGroupV3PreviewSeed.unit.spec.ts` | 5 passed (5 tests) | **PASS** |
| **Header Option A Component** | `pnpm --prefix app test:component -- tests/component/wingsGroupHeaderOptionA.component.spec.tsx` | 5 passed (5 tests) | **PASS** |
| **Existing Header & FAB** | `pnpm --prefix app test:component -- tests/component/headerHotlines.component.spec.tsx tests/component/siteContactFab.component.spec.tsx tests/component/wingsSideHiFiChrome.component.spec.tsx` | 10 passed (10 tests) | **PASS** |
| **WingsGroup v3 Homepage** | `pnpm --prefix app test:component -- tests/component/wingsGroupV3Homepage.component.spec.tsx` | 26 passed (26 tests) | **PASS** |

### Ghi nhận về baseline pre-existing (Minh bạch kiểm tra):
Khi kiểm tra `wingsgroup-v3-release-gates.test.mjs`, phát hiện một lỗi baseline đã tồn tại từ trước liên quan đến ngày phê duyệt trong test (`2026-08-24`) so với file đăng ký `docs/product/wingsgroup-v3-release-gates.json` (`2026-09-26`). Vấn đề này không thuộc phạm vi US-085 và được ghi nhận đúng thực tế, không khai khống PASS.

---

## 5. Kiểm thử trình duyệt thực tế (`agent-browser`) & Số đo DOM

Đã khởi chạy Next.js dev server cục bộ và kiểm thử trực tiếp bằng `agent-browser` trên cả trang chủ VI, trang chủ EN và các trang con (`/ve-wingsgroup`, `/en/ve-wingsgroup`).

### 5.1 Bảng đo đạc Bounding Boxes trên 11 Viewports (320px đến 1536px)

| Viewport (px) | Primary Nav Visible | Brand Logo Right (px) | Nav Content Left (px) | **Brand-Nav Overlap (px)** | Document ScrollWidth | **Horizontal Overflow** |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **320** | False (Mobile) | - | - | **0.00** | 320 | **Không** |
| **375** | False (Mobile) | - | - | **0.00** | 375 | **Không** |
| **390** | False (Mobile) | - | - | **0.00** | 390 | **Không** |
| **768** | False (Mobile) | - | - | **0.00** | 768 | **Không** |
| **1024** | False (Mobile) | - | - | **0.00** | 1024 | **Không** |
| **1199** | False (Mobile) | - | - | **0.00** | 1199 | **Không** |
| **1200** | True (Desktop) | 175.78 | 286.05 | **0.00** *(Khoảng đệm an toàn: +110.27px)* | 1200 | **Không** |
| **1279** | True (Desktop) | 175.78 | 325.55 | **0.00** *(Khoảng đệm an toàn: +149.77px)* | 1279 | **Không** |
| **1280** | True (Desktop) | 175.78 | 326.05 | **0.00** *(Khoảng đệm an toàn: +150.27px)* | 1280 | **Không** |
| **1440** | True (Desktop) | 175.78 | 406.05 | **0.00** *(Khoảng đệm an toàn: +230.27px)* | 1440 | **Không** |
| **1536** | True (Desktop) | 175.78 | 454.05 | **0.00** *(Khoảng đệm an toàn: +278.27px)* | 1536 | **Không** |

*Kết quả đo chi tiết đã được xuất lưu tại `header-a-implementation-20261023/evidence/viewport-measurements.json`.*

### 5.2 Kiểm tra Zoom 200% & Khả năng tiếp cận
- Tại zoom 200% trên desktop 1280px: `scrollWidth = 1265px <= innerWidth = 1280px` -> Không xuất hiện thanh cuộn ngang, giao diện tự co giãn đáp ứng WCAG 2.1 Reflow.
- Phím `Escape` khi mở dropdown: Đóng ngay lập tức (`aria-expanded="false"`) và focus tự động trả về nút toggle.
- Bấm vào kênh "Gửi nhu cầu" / "Send an inquiry": Chuyển hướng chính xác đến `/lien-he#contact-form` kèm ngữ cảnh focus.

### 5.3 Bằng chứng hình ảnh (Evidence Screenshots)
Tất cả ảnh chụp màn hình được lưu trong thư mục `header-a-implementation-20261023/evidence/`:
1. `desktop-1280-vi.png`: Giao diện Desktop tiếng Việt ở trạng thái bình thường (cụm nút gọi vàng kim gọn gàng, không đè logo).
2. `desktop-1280-vi-dropdown-open.png`: Dropdown kênh liên hệ tiếng Việt mở (2 hotline phụ + Zalo + Gửi nhu cầu).
3. `desktop-1280-en-dropdown-open.png`: Dropdown kênh liên hệ tiếng Anh mở (nhãn Anh hóa hoàn toàn: Call now, Tour consultation, Travel support, Chat on Zalo, Send an inquiry).
4. `desktop-1280-subpage-vi.png`: Giao diện header trên trang con tiếng Việt (`/ve-wingsgroup`).
5. `desktop-1280-subpage-en.png`: Giao diện header trên trang con tiếng Anh (`/en/ve-wingsgroup`).
6. `mobile-390-normal.png`: Giao diện Mobile 390px (nút gọi rút gọn + mũi tên + hamburger).
7. `mobile-390-drawer-open.png`: Drawer Mobile 390px mở (đầy đủ các kênh liên hệ và bộ đổi ngôn ngữ).

---

## 6. Hướng dẫn phát hành Staging/Production & Rollback (Release Runbook)

### 6.1 Khi triển khai lên môi trường VPS Staging / Production
1. **Build & Code Deployment:** Triển khai mã nguồn đã kiểm thử theo runbook `docs/runbooks/oracle-vps-arm64-deployment.md`.
2. **Cập nhật dữ liệu Hotline CMS (Idempotent Apply):**
   Chạy script cập nhật dữ liệu Payload trên VPS:
   ```bash
   pnpm exec tsx scripts/updateWingsGroupHotline.ts
   ```
   Script sẽ tự động kiểm tra: nếu `supportPhone` đang là `0912910101` sẽ cập nhật thành `0948786775` và kích hoạt hook `invalidateSettingsAfterChange` để làm mới cache `SiteSettings` của site `wings-group`.
3. **Xác minh sau phát hành (Post-deployment Verification):**
   - Truy cập `https://wingsgroup.vn/` và `https://wingsgroup.vn/en`.
   - Xác nhận số hotline hiển thị trên header và footer là `0948 786 775` (click-to-call: `tel:0948786775`).
   - Mở dropdown xác nhận hai số hotline phụ `0915 250 101` và `0915 260 101`.
   - Kiểm tra `wingsgo.vn` để đảm bảo hotline WingsGo không bị ảnh hưởng.

### 6.2 Kế hoạch phục hồi (Rollback Runbook)
Nếu cần khôi phục lại hotline cũ trên CMS vì lý do vận hành kinh doanh:
1. Chạy cập nhật trực tiếp qua Payload CMS Admin Panel tại `SiteSettings` của `wings-group` đổi `supportPhone` về số mong muốn.
2. Hoặc nếu cần rollback mã nguồn giao diện: `git revert` commit triển khai US-085, hệ thống sẽ khôi phục lại giao diện header trước đó một cách an toàn mà không làm gián đoạn cơ sở dữ liệu.

---

## 7. Trạng thái bàn giao

- [x] Triển khai đúng 100% hợp đồng Phương án A đã phê duyệt.
- [x] Đổi hotline chính WingsGroup sang `0948 786 775` (`tel:0948786775`).
- [x] Bảo toàn tuyệt đối cô lập đa site (WingsGo, WingSide giữ nguyên).
- [x] 100% tests liên quan PASS (TypeScript, Unit, Component).
- [x] Đo đạc DOM 11 viewports chứng minh `brandNavOverlap = 0px` và không có overflow.
- [x] Báo cáo đầy đủ kèm bằng chứng hình ảnh và số liệu chi tiết.
- [x] Sẵn sàng cho phiên Codex Consultation Gate & Tech Lead Review.
