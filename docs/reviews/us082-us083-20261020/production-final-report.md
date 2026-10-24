# Báo cáo Kiểm thử Sản xuất Trực tiếp (Production Browser QA Report)

- **Phạm vi thẩm định:** Phân hệ WingsGroup (`https://wingsgroup.vn`) sau kích hoạt release `release-us082-us083-20261020-114500` (image `fec07a9405c1...`).
- **Phân công Worker:** Worker AGY phụ trách độc quyền WingsGroup EN (`/en`, `/en/tin-tuc`, consent/privacy policy inspection). Worker pA phụ trách WingsGo trong phiên `us083-production`.
- **Phương thức thực thi:** `agent-browser` với persistent sessions riêng biệt: `--session desktop` (1440x900) và `--session mobile` (390x844). Dùng base64 eval (`eval -b`) để đảm bảo tính toàn vẹn cú pháp selector. Headers trình duyệt giữ nguyên mặc định `{}`.
- **Nguyên tắc an toàn:** Hoàn toàn Read-Only. Tuyệt đối không submit form, không ghi CMS, không gọi hotline/Zalo, không seed dữ liệu giả.

---

## 1. Trạng thái Release Gate: DỪNG PASS / GIỮ NGUYÊN NO-GO (HOLD)

> [!WARNING]
> **GATE VERDICT: DỪNG NGHIỆM THU CUỐI CÙNG (STOP FINAL PASS / CLOSURE - HOLD).**
>
> **Lý do:** Phát hiện lỗi trực tiếp (Live Defect) trong cơ chế Consent của Form 17 trên trang chủ `https://wingsgroup.vn/en`:
> - Tồn tại **2 checkbox song song (Duplicate Checkbox Bug)**:
>   1. Checkbox form-builder kế thừa (Legacy required): `id="17-consent"`, nhãn chỉ có `* (required)`, backed bởi `<input type="checkbox" name="consent" required="">`.
>   2. Checkbox canonical governed consent: `id="17-wingsgroup-consent"`, hiển thị đầy đủ văn bản điều khoản tiếng Anh và link chính sách bảo mật.
> - **Kế hoạch xử lý của Root:** Root đã mở lại freeze mã nguồn cho Form + targeted tests để hợp nhất tên checkbox `consent` với canonical governed consent và đồng bộ `submissionData` cho server validation.
> - **Hành động của Worker:** Không sửa đổi mã nguồn; ghi nhận bằng chứng DOM/ảnh chụp màn hình thực tế và giữ phán quyết NO-GO cho đến khi Root hoàn tất bản vá.

---

## 2. Bằng chứng Lỗi Trực tiếp: Checkbox Trùng lặp (Duplicate Checkbox Evidence)

Tại khối Consultation Form (`form17`) trên `https://wingsgroup.vn/en` (Desktop & Mobile):

```html
<!-- Checkbox 1: Legacy Form-builder required checkbox (chỉ có nhãn dấu sao bắt buộc) -->
<button type="button" role="checkbox" id="17-consent" aria-required="true" aria-checked="false" ...></button>
<input type="checkbox" name="consent" value="on" required="" ...>
<!-- Label text: "* (required)" -->

<!-- Checkbox 2: Canonical governed consent control của WingsGroup -->
<button type="button" role="checkbox" id="17-wingsgroup-consent" class="site-wingsgroup-consent__control" aria-checked="false" ...>
  <span>I agree that WingsGroup may use the information provided to contact me, provide consultation, and route my request to the appropriate team in accordance with the Privacy Policy.</span>
</button>
<!-- Label text: "I agree that WingsGroup may use the information... Read the Privacy Policy" -->
```

- **Hệ quả kiểm thử:** Người dùng gặp 2 ô checkbox riêng biệt cho cùng một mục đích thỏa thuận, trong đó checkbox trên chỉ có nhãn `* (required)` gây mơ hồ ngữ nghĩa, trong khi checkbox dưới chứa nội dung chính sách pháp lý thực tế.
- **Bằng chứng ảnh chụp màn hình:** [`prod-wingsgroup-en-duplicate-checkbox-bug.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgroup-en-duplicate-checkbox-bug.png) (357.942 bytes).

---

## 3. Kết quả Thẩm định Các Tuyến Khác

### 3.1. Tuyến Tin tức Tiếng Anh (`https://wingsgroup.vn/en/tin-tuc`): ĐẠT (PASS)
- Metadata: `"News and Insights | Travel Ecosystem | WingsGroup"`.
- Không nhúng khối form consultation (`hasForm: false`, `formCheckboxes: 0`).
- Toàn bộ 11 bài viết tin tức thực tế hiển thị tiêu đề và trích dẫn hoàn toàn bằng tiếng Anh chuẩn xác (không có văn bản tiếng Việt trong thẻ bài viết hay tags trong scope).
- Tác giả hiển thị định danh pháp nhân `BAN BIÊN TẬP WINGSGROUP`.
- Không lỗi console, không lỗi trang, không tràn ngang (`scrollWidth: 1425px` trên Desktop 1440px; `375px` trên Mobile 390px).

### 3.2. Nội dung Tiếng Việt Tồn lưu trên Trang Chủ (Residual Baseline / CMS Copy)
- Ghi nhận độc lập các thành phần CMS gốc chưa dịch, không khẳng định `/en` là 100% tiếng Anh:
  1. Trust CTA: Liên kết `Xem hồ sơ pháp lý và câu chuyện doanh nghiệp ↗` trỏ về `/en/ve-wingsgroup`.
  2. US-081 Footer Hotline Labels: `Tư vấn tour: 0915 250 101` và `Hỗ trợ dịch vụ: 0915 260 101`.
  *(Được theo dõi riêng biệt, không mutate CMS trên production).*

---

## 4. Danh mục Bằng chứng Hình ảnh Thực tế (Artifacts)

| Tên File | Khung nhìn / Nội dung | Kích thước | Trạng thái Thẩm định |
|---|---|---|---|
| [`prod-wingsgroup-en-duplicate-checkbox-bug.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgroup-en-duplicate-checkbox-bug.png) | Bằng chứng lỗi 2 Checkbox trùng lặp trên Form 17 | 357.942 bytes | **LIVE DEFECT (HOLD)** |
| [`prod-wingsgroup-en-home-desktop.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgroup-en-home-desktop.png) | Home tiếng Anh Desktop (1440x900) | 354.623 bytes | Layout đạt, ghi nhận residual CMS |
| [`prod-wingsgroup-en-form-desktop.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgroup-en-form-desktop.png) | Focus Form 17 Desktop | 223.090 bytes | Thể hiện cả 2 ô checkbox |
| [`prod-wingsgroup-en-news-desktop.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgroup-en-news-desktop.png) | News Archive tiếng Anh Desktop (1440x900) | 400.983 bytes | Đạt 11 bài viết tiếng Anh |
| [`prod-wingsgroup-en-home-mobile.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgroup-en-home-mobile.png) | Home tiếng Anh Mobile (390x844) | 120.846 bytes | Responsive đạt, không tràn ngang |
| [`prod-wingsgroup-en-form-mobile.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgroup-en-form-mobile.png) | Focus Form 17 Mobile | 54.095 bytes | Thể hiện cả 2 ô checkbox |
| [`prod-wingsgroup-en-news-mobile.png`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/browser/prod-wingsgroup-en-news-mobile.png) | News Archive tiếng Anh Mobile (390x844) | 148.397 bytes | Đạt layout và card tin tức |

---

## 5. Kết luận & Hướng xử lý Tiếp theo

1. **Duy trì phán quyết NO-GO / HOLD:** Đóng story hoặc cấp phép phát hành toàn diện bị chặn cho đến khi lỗi trùng lặp checkbox trên Form 17 được Root xử lý dứt điểm.
2. **Trách nhiệm của Root:** Hợp nhất `17-consent` với `17-wingsgroup-consent`, đồng bộ payload `submissionData` cho server validation và chạy test targeted form component.
3. **Trách nhiệm của Worker:** Không chạm vào mã nguồn sản phẩm, giữ nguyên hiện trạng các phiên kiểm thử, chờ thông báo deploy bản vá từ Root để tái kiểm thử (re-verify).
