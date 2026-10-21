# US-082 — Bản địa hóa Hoàn chỉnh WingsGroup English (`/en`)

## 1. Trạng thái (Status)

`implemented` — production `release-us082-us083-consent-20261020-120500`; kết quả nghiệm thu hiện hành tại `validation.md`.

## 2. Phân làn (Lane)

`normal`

## 3. Hợp đồng Sản phẩm (Product Contract)

Xử lý dứt điểm các thành phần chưa chuyển đổi tiếng Anh trên site `https://wingsgroup.vn/en` (theo bằng chứng thực tế từ người dùng), bao gồm:
1. **Khối Bài viết/Cẩm nang/Tin tức (`ArchiveBlock`):**
   - Thẻ danh mục (Category tags), tiêu đề bài viết (Post titles) và đoạn trích dẫn (Excerpts/Meta descriptions) bắt buộc phải hiển thị tiếng Anh đầy đủ khi truy cập qua route `/en`.
   - Giữ nguyên các đường dẫn bài viết giữ prefix `/en/posts/...`.
   - Nếu một bài viết chưa có bản dịch tiếng Anh, hệ thống áp dụng fallback an toàn có kiểm soát hoặc ẩn khỏi danh sách để tránh lẫn lộn ngôn ngữ.
2. **Khối Biểu mẫu Liên hệ/Tư vấn (`Form/Component`):**
   - Checkbox đồng ý (Consent) bắt buộc hiển thị văn bản tiếng Anh:
     > *"I agree that WingsGroup may use the information provided to contact me, provide consultation, and route my request to the appropriate team in accordance with the Privacy Policy."*
   - Đường dẫn liên kết Chính sách bảo mật trỏ về `/en/chinh-sach-bao-mat` (hoặc `/en/privacy-policy`).
   - Thời hạn lưu trữ dữ liệu hiển thị tiếng Anh: *"Information is retained for up to 24 months under the Privacy Policy."*
3. **Đồng bộ 2 chiều GET/POST cho Lead Capture API:**
   - Client component truyền rõ ràng `locale: 'en'` khi fetch cấu hình lead intake (`GET /api/lead-submissions?locale=en`).
   - Khi submit form (`POST /api/lead-submissions`), payload gửi kèm `locale: 'en'` để server ghi nhận `governance.locale = 'en'`, bảo đảm tính toàn vẹn audit.
   - Xử lý race condition: Khi người dùng chuyển đổi ngôn ngữ trong lúc request đang xử lý, hệ thống hủy request cũ, reset trạng thái checkbox consent và tải lại cấu hình ngôn ngữ tương ứng.

## 4. Hành vi Hiện tại (Current Behavior)

- Khi vào `wingsgroup.vn/en`, khối bài viết hiển thị tags tiếng Việt ("PHÁP LÝ VÀ NIỀM TIN", "CẨM NANG LỰA CHỌN"), tiêu đề và trích dẫn tiếng Việt, chỉ có nút "View details ->" là tiếng Anh.
- Checkbox đồng ý trong form liên hệ hiển thị tiếng Việt dù toàn bộ các trường khác đã là tiếng Anh.

## 5. Hành vi Đích (Target Behavior)

- Trang `wingsgroup.vn/en` thuần nhất 100% tiếng Anh trên cả khối nội dung bài viết và khối form liên hệ/tư vấn.
- Dữ liệu lưu vết lead capture ghi nhận chuẩn xác ngôn ngữ người dùng gửi là `en`.

## 6. Tiêu chí Chấp nhận (Acceptance Criteria)

- **AC1:** Khối Archive trên `/en` hiển thị tiêu đề, danh mục và tóm tắt hoàn toàn bằng tiếng Anh.
- **AC2:** Checkbox consent trên form liên hệ hiển thị văn bản tiếng Anh từ `WINGSGROUP_CONSENT_COPY.en`.
- **AC3:** Route `/api/lead-submissions` hỗ trợ đọc `locale` từ query param và request body bên cạnh trusted header.
- **AC4:** Hệ thống bảo toàn tính cô lập đa site và access control (`_status: 'published'`).
