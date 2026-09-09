# Overview

## Current Behavior

Trang chủ và các trang con chuyên đề của WingsGroup (`/nang-luc-dich-vu`, `/tin-cay-va-phap-ly`, `/ve-chung-toi`, Header, Footer) còn tồn tại các vấn đề về trải nghiệm người dùng và truyền thông thương hiệu theo 19 slides review:
- Tiêu đề Hero và các khối nội dung mang nặng văn phong báo cáo nội bộ thay vì văn phong truyền thông ấm áp, định vị du lịch chào đón ("Một hệ sinh thái - Trọn vẹn hành trình").
- Khối thống kê số liệu trên trang chủ khô cứng, thiếu dẫn chứng xã hội (social proof / testimonials) từ khách hàng thực tế.
- Khối điều hướng nhu cầu du khách chưa trực quan, thiếu các CTA tư vấn giải pháp nhanh theo từng trường hợp (tour quốc tế, tour nội địa, dịch vụ sân bay, MICE doanh nghiệp, hỗ trợ khác).
- Bố cục trang Năng lực dịch vụ chưa phản ánh đúng cấu trúc 2 cột đối sánh (quy trình 4 bước + 6 tiêu chuẩn phục vụ), thiếu các dòng dịch vụ chi tiết cho 5 thương hiệu con và thiếu bộ sưu tập hình ảnh thực tế.
- Bố cục trang Giới thiệu và Tin cậy & Pháp lý bị lỗi CSS ép cột cứng (460px) dẫn đến lọt cột giữa màn hình lớn, thiếu thông tin pháp nhân đầy đủ và 3 trụ cột phụng sự.
- Header có logo hiển thị nhỏ trên desktop, kích thước chữ điều hướng bé; Footer thiếu địa chỉ Văn phòng Du lịch tại Hà Nội, thiếu click-to-call cho Hotline và thiếu liên kết Chính sách bảo mật khách hàng.

## Target Behavior

Triển khai trọn vẹn 3 giai đoạn cải tiến trải nghiệm WingsGroup theo định hướng review:
1. **Giai đoạn 1 - Nội dung & Copy-edit**:
   - Cập nhật văn phong Hero ấm áp, định vị "Một hệ sinh thái - Trọn vẹn hành trình.", bổ sung 2 CTA rõ ràng: "Tham khảo dịch vụ" và "Nhận tư vấn 🎧".
   - Khối tương tác 5 thương hiệu: Tuyên ngôn "MỘT HỆ SINH THÁI. NĂM CÁCH ĐỒNG HÀNH", làm rõ Cơ chế vận hành 5 lớp ("Một đội ngũ — Trọn hành trình") và Lợi ích Một đầu mối duy nhất ("Đỡ việc, dễ quản lý"), kết thúc bằng banner CTA chuyển đổi "Bạn chọn điểm đến. WingsGroup lo phần còn lại!".
   - Khối lưới 5 card tương tác nhu cầu (`JourneyInquiryGrid`) với CTA tư vấn chuyên biệt cho từng tệp khách hàng.
   - Trang Năng lực dịch vụ: Bố cục 2 cột (4 bước quy trình tư vấn + 6 tiêu chuẩn phục vụ), 5 dòng năng lực dịch vụ (`data-service-row`), và Gallery 4 khung hình ảnh đại diện.
   - Trang Giới thiệu & Pháp lý: Chuẩn hóa quan hệ pháp nhân Vietwings, bổ sung thông tin pháp nhân đầy đủ, 3 trụ cột phụng sự và lưới chứng chỉ pháp lý trực quan.
2. **Giai đoạn 2 - Giao diện Header & Footer**:
   - Header: Logo phóng to nổi bật (`h-12 md:h-14 lg:h-16 max-w-[210px]`) bảo toàn hợp đồng kích thước và data attributes; chữ điều hướng to rõ (`0.9375rem`, `font-weight: 600`); chuẩn hóa nhãn ngôn ngữ `ENGLISH (en)`.
   - Footer: Bổ sung địa chỉ VP Du lịch Hà Nội (Ngọc Khánh Plaza, Ba Đình) kèm icon bản đồ, click-to-call link cho hotline (`tel:`), liên kết Chính sách bảo mật khách hàng (`/chinh-sach-bao-mat`), và nút CTA liên hệ 24/7 nổi bật.
   - Khắc phục triệt để lỗi CSS grid lọt cột giữa trang bằng bố cục responsive linh hoạt `:has(> :nth-child(2))` và `:has(> :nth-child(3))`.
3. **Giai đoạn 3 - Social Proof & Hình ảnh**:
   - Thay thế thống kê khô cứng bằng khối Testimonials (`TestimonialsSection`) gồm 3 đánh giá thực tế từ khách hàng cá nhân & doanh nghiệp, kèm banner kích hoạt chuyển đổi kép.
   - Tích hợp gallery hình ảnh minh họa cho các trang chuyên đề.

## Affected Users

- Khách hàng cá nhân, gia đình và doanh nghiệp tìm kiếm giải pháp du lịch toàn diện.
- Đội ngũ biên tập viên và quản trị viên CMS WingsGroup.
- Bộ phận tư vấn khách hàng 24/7 tiếp nhận yêu cầu từ các CTA chuyên biệt.

## Affected Product Docs

- `docs/product/wingsgroup-v3-fidelity-contract.json`
- `docs/product/wingsgroup-v3-media-manifest.json`
- `docs/product/wingsgroup-v3-release-gates.json`
- `docs/product/editorial-operations.md`

## Non-Goals

- Không làm thay đổi routing đa site hoặc cấu hình Cloudflare edge.
- Không sửa đổi schema database hay sinh ra migration phá vỡ tương thích dữ liệu.
- Không thay đổi tên thương hiệu chuẩn đã duyệt (`WingSide`, `WingsPlus`).
