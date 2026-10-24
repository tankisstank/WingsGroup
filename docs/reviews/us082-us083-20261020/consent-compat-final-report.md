# Báo cáo Kiểm thử Tương thích Consent Checkbox (Consent Compatibility Final Report)

- **Thời gian thực hiện:** 2026-10-20T19:17:00+07:00
- **Phiên bản Standalone Build:** `wEYFV0d0yBTqhvpn8ZupY` (PID 44592 trên cổng 3102 qua Reverse Proxy 3103)
- **Đối tượng kiểm thử:** Trang liên hệ thực tế `page4` (`http://127.0.0.1:3103/en/lien-he`), form thực tế `form1` tích hợp legacy required consent checkbox với nhãn EN trống (exact production shape).
- **Cấu hình Trình duyệt:** Explicit session `--session us082-consent-compat`, headers `{}`.

---

## 1. Kết quả Kiểm thử Hồi quy Tích hợp (Scoped Integration Test)

- **Tập tin kiểm thử:** [`app/tests/int/leadSubmissionRoute.int.spec.ts`](file:///E:/repo/WingsTravel/app/tests/int/leadSubmissionRoute.int.spec.ts)
- **Lệnh thực thi:** `pnpm --dir app exec vitest run tests/int/leadSubmissionRoute.int.spec.ts`
- **Kết quả tổng thể:** **21 tests passed (21/21, 100% PASS)** trong 1.15s (exit code 0).
- **Ca kiểm thử hồi quy mới được bổ sung:**
  - `enforces legacy required checkbox name consent with governed leadContract and persists locale en`:
    1. Khi thiếu trường legacy consent trong `submissionData` -> Server từ chối **HTTP 400**, không gọi `payload.create`.
    2. Khi trường legacy consent mang giá trị `false` -> Server từ chối **HTTP 400**, không gọi `payload.create`.
    3. Khi legacy consent là `true` + kèm hợp đồng governance `leadContract` hợp lệ -> Server chấp thuận **HTTP 202**, lưu thành công bản ghi với governance `locale: 'en'` và `consentVersion: 'wingsgroup-contact-v1'`.

---

## 2. Kết quả Xác thực Trình duyệt Trực tiếp (Browser Compatibility on Standalone 3102)

| Hạng mục Kiểm tra | Kỳ vọng | Kết quả Thực tế (DOM / UI) | Trạng thái |
|---|---|---|---|
| **Số lượng Checkbox trong Form 1** | Chỉ duy nhất 1 ô canonical | `checkboxCount: 1`, `hiddenInputsCount: 0`. Lỗi trùng lặp 2 checkbox đã được loại bỏ hoàn toàn. | **PASS** |
| **Thuộc tính Checkbox Canonical** | `id="1-wingsgroup-consent"`, `aria-required="true"` | `<button id="1-wingsgroup-consent" role="checkbox" aria-required="true" aria-checked="false" ...>` | **PASS** |
| **Kiểm tra Giao diện Mobile (390x844)** | Responsive, không tràn ngang, 1 checkbox | `scrollWidth: 375px < 390px` (overflow: false), `checkboxCount: 1`, `aria-required="true"`. | **PASS** |
| **Xác thực Báo lỗi khi Chưa tick (Unchecked Submit)** | Hiển thị lỗi validation, viền đỏ, `aria-invalid="true"` | Nút checkbox nhận `aria-invalid="true"`; xuất hiện thông báo lỗi: `"Please confirm your consent before submitting this request."`. | **PASS** |
| **Reset Hai chiều (VI <-> EN Switcher)** | Đổi ngôn ngữ tự động reset checkbox về false, đổi nội dung điều khoản | - Chuyển sang `/lien-he`: `aria-checked="false"`, văn bản tiếng Việt.<br>- Chuyển về `/en/lien-he`: `aria-checked="false"`, văn bản tiếng Anh. | **PASS** |
| **Gửi Lead Cục bộ (Local Lead Submit)** | Gửi thành công với marker và email chỉ định, hiển thị thẻ xác nhận UI | Gửi thành công marker `us082-compat-local-20261020` với email `qa@example.invalid`; giao diện hiển thị thẻ xác nhận: `"Brief received - A specialist will review your plans and return with a tailored proposal."`. | **PASS** |

---

## 3. Danh mục Bằng chứng Hình ảnh Thực tế (Artifacts)

Toàn bộ ảnh chụp màn hình được thu thập từ phiên `--session us082-consent-compat` tại thư mục `artifacts/tmp/us082-us083-gates-20261020/browser/`:

| Tên File | Khung nhìn / Nội dung | Kích thước | Trạng thái Thẩm định |
|---|---|---|---|
| [`consent-compat-desktop-error.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/consent-compat-desktop-error.png) | Báo lỗi validation consent khi chưa tick (`aria-invalid="true"`) | 71.732 bytes | Đạt, hiển thị rõ cảnh báo đỏ và thông báo tiếng Anh |
| [`consent-compat-mobile-form.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/consent-compat-mobile-form.png) | Form 1 trên Mobile (390x844), 1 checkbox duy nhất | 43.165 bytes | Đạt, responsive hoàn chỉnh, không tràn layout |
| [`consent-compat-desktop-success.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/consent-compat-desktop-success.png) | Thẻ xác nhận gửi brief thành công sau khi tick consent | 106.264 bytes | Đạt, UI chuyển sang trạng thái "Brief received" |

---

## 4. Kết luận Nghiệm thu Kỹ thuật

1. **Khắc phục triệt để lỗi Checkbox Trùng lặp:** Bản sửa đổi của Root đã hợp nhất thành công legacy required consent field với canonical governed consent control. Biểu mẫu chỉ còn duy nhất 1 checkbox có đầy đủ văn bản pháp lý tiếng Anh và `aria-required="true"`.
2. **Bảo toàn Quy tắc Nghiệp vụ Máy chủ:** Server API kiểm tra đồng bộ cả trường `consent: true` và `leadContract`, đồng thời lưu trữ chính xác `locale: 'en'` vào `wingsGroupLead`.
3. **Sẵn sàng Triển khai Vá Sản xuất:** Bản build `wEYFV0d0yBTqhvpn8ZupY` đã vượt qua 100% các tiêu chí kiểm thử cục bộ, sẵn sàng để Root tiến hành đóng gói và triển khai bản vá lên môi trường Production.
