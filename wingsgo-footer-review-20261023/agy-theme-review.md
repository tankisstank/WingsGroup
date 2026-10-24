# Đánh Giá Kỹ Thuật Độc Lập: Cố Định Light Theme Cho WingsGo (US-085 Follow-up)

**Mã tài liệu:** `AGY-THEME-REVIEW-WINGSGO`  
**Dự án:** WingsTravel — Workspace `WingsTravel`  
**Nhiệm vụ:** WingsGo Footer Correction & Theme Normalization  
**Người thực hiện:** agy (Antigravity)  
**Thời điểm hoàn tất:** 2026-10-23T22:10:00+07:00  
**Trạng thái:** **READY FOR ROOT QA & RELEASE**

---

## 1. Tóm Tắt Nhiệm Vụ & Phạm Vi Sở Hữu

Theo yêu cầu độc lập cho module Theme, agy chỉ chỉnh sửa duy nhất 3 file trong workspace và xuất 1 báo cáo:
1. `app/src/providers/Theme/index.tsx`: Chuẩn hóa `ThemeProvider` cho các site cố định Light theme.
2. `app/src/app/(frontend)/layout.tsx`: Gán `data-theme="light"` ở cấp SSR HTML tag cho WingsGo.
3. `app/tests/component/themeProvider.component.spec.tsx`: Bộ kiểm thử component bao phủ WingsGo, WingsGroup và cô lập WingSide.

Root sở hữu toàn bộ các file Footer, CSS, FAB, Hotline, CMS ops và tests liên quan. Không có bất kỳ thay đổi nào ngoài phạm vi 3 file trên.

---

## 2. Chi Tiết Thực Hiện Theo Hợp Đồng Kỹ Thuật (Contract)

### 2.1. SSR HTML Initialization (Chống chớp sáng/tối - No Flash)
- **Vị trí:** `app/src/app/(frontend)/layout.tsx:73`
- **Thay đổi:**
  ```tsx
  <html
    className={cn(GeistSans.variable, GeistMono.variable)}
    data-theme={site.code === 'wings-group' || site.code === 'wings-go' ? 'light' : undefined}
    lang={locale}
    suppressHydrationWarning
  >
  ```
- **Cơ chế hoạt động:** 
  - Với `wings-go` và `wings-group`, thuộc tính `data-theme="light"` được đưa trực tiếp vào HTML tĩnh từ phía Server Component (SSR).
  - Khi trình duyệt nhận HTML và tải CSS, token màu Light được kích hoạt ngay lập tức trước khi JavaScript tải xong, triệt tiêu 100% hiện tượng chớp tối (FOUT / Flash of dark theme) ngay cả khi trình duyệt của người dùng có dark mode hệ thống hoặc `localStorage` cũ.
  - Với `wing-side` và các site khác, `data-theme` giữ nguyên `undefined` trong SSR, cho phép hydrate động theo preference cá nhân của người dùng.

### 2.2. Client ThemeProvider & Khóa Trạng Thái Theme
- **Vị trí:** `app/src/providers/Theme/index.tsx:25-67`
- **Thay đổi:**
  - Định nghĩa cờ `isAlwaysLight = siteCode === 'wings-group' || siteCode === 'wings-go'`.
  - Khởi tạo `useState`: Nếu `canUseDOM`, ưu tiên gán ngay `'light'` khi `isAlwaysLight`.
  - `setTheme`: Nếu `isAlwaysLight`, luôn đặt `themeState` là `'light'` và `document.documentElement.setAttribute('data-theme', 'light')`, bỏ qua hoàn toàn tham số `dark` hoặc `null` và không ghi vào `localStorage`.
  - `useEffect`: Nếu `isAlwaysLight`, ép buộc `data-theme` là `'light'`, bỏ qua việc đọc `localStorage` (`payload-theme`) và bỏ qua `getImplicitPreference()` (hệ thống).
- **Tính bất biến:** Bất kể component con nào gọi `setTheme('dark')`, trạng thái của WingsGo vẫn giữ cố định `light`.

---

## 3. Kết Quả Kiểm Thử (Verification Gates)

### 3.1. Targeted Component Tests
- **Lệnh thực thi chính xác:**
  ```powershell
  pnpm --prefix app test:component -- tests/component/themeProvider.component.spec.tsx
  ```
- **Exit Code:** `0`
- **Thời gian chạy:** 1.31s (tests: 112ms)
- **Kết quả:** **1 passed (1 file), 6 passed (6 tests), 0 failed**
- **Chi tiết 6 kịch bản kiểm thử:**
  1. `keeps WingsGroup light despite a stored dark preference`: PASS.
  2. `keeps WingsGo light despite a stored dark preference and ignores setTheme to dark`: PASS.
  3. `keeps WingsGo light when setTheme is called with null`: PASS.
  4. `preserves the existing preference behavior for other sites`: PASS (WingSide tôn trọng preference).
  5. `allows other sites to change theme to dark via setTheme and persists preference`: PASS (WingSide chuyển được sang dark và lưu `localStorage`).
  6. `ensures strict site isolation between WingsGo and WingSide`: PASS (Kiểm thử liên tiếp WingsGo cố định light, WingSide nhận dark).

### 3.2. TypeCheck (TypeScript)
- **Lệnh thực thi:**
  ```powershell
  pnpm --prefix app exec tsc --noEmit
  ```
- **Exit Code:** `0` (Không có bất kỳ type error nào).

### 3.3. ESLint
- **Lệnh thực thi:**
  ```powershell
  pnpm --prefix app exec eslint src/providers/Theme/index.tsx "src/app/(frontend)/layout.tsx" tests/component/themeProvider.component.spec.tsx
  ```
- **Exit Code:** `0` (0 errors, 0 warnings).

---

## 4. Đánh Giá Các Trục Kỹ Thuật

| Trục đánh giá | Phân tích thực tế | Đánh giá |
|---|---|---|
| **Khởi tạo Light & No Flash** | `layout.tsx` đặt `data-theme="light"` từ SSR. Không phụ thuộc vào client script; loại bỏ hoàn toàn flash khi load trang. | **Đạt chuẩn (Zero Flash)** |
| **Bỏ qua Stored/System Dark** | `ThemeProvider` không truy vấn `localStorage` hay `matchMedia` khi `siteCode === 'wings-go'`. | **Đạt chuẩn** |
| **Khóa `setTheme`** | `setTheme('dark')` hoặc `setTheme(null)` trả về ngay lập tức với giá trị `'light'`, không ghi đè `data-theme`. | **Đạt chuẩn** |
| **Cô lập Site (Site Isolation)** | Điều kiện `isAlwaysLight` chỉ đúng với `wings-group` và `wings-go`. Site `wing-side` và các tenant khác giữ nguyên 100% logic dark/light selector hiện có. | **Đạt chuẩn tuyệt đối** |
| **Bảo toàn Schema & Baseline** | Không sửa schema, không thêm dependency, không đổi tokens hay branding. Giữ nguyên mọi diff có sẵn của repo. | **Đạt chuẩn** |

---

## 5. Kết Luận

3 file thuộc quyền sở hữu của agy đã được cập nhật chính xác, tinh gọn, vượt qua toàn bộ 6 test cases thành phần và sẵn sàng để Root tích hợp cùng phần việc Footer/CSS/Hotline.
