# US-077 — Hoàn thiện UX WingsGo và chuyển đổi tư vấn

## Status

in_progress

## Lane

high-risk

## Product Contract

Hoàn thiện các bề mặt công khai WingsGo trong TASK-02, TASK-03, TASK-04,
TASK-06, TASK-07, TASK-13 và TASK-14. Khách có thể xem lịch/tour nhất quán,
đọc lịch trình theo ngày, chọn ngày khởi hành và gửi yêu cầu tư vấn; lead được
lưu trong Payload theo đúng site và có ngữ cảnh tour/ngày đi. Giá, chỗ, hãng bay
và nội dung chỉ được hiển thị khi có dữ liệu được CMS xác minh. Luồng không xác
nhận đặt chỗ hoặc gửi dữ liệu thử tới sales thật.

TASK-01 (popup thu lead) được hoãn theo yêu cầu người dùng và không thuộc phạm
vi US-077.

## Current Behavior

- WingsGo đã có header/footer, widget liên hệ, trang liên hệ, lịch khởi hành,
  trang chi tiết tour và các khối trang chủ dựa trên dữ liệu Payload.
- Lịch khởi hành có bộ lọc và dữ liệu structured; trang chi tiết đã có
  accordion lịch trình nhưng chưa có bảng giá theo tháng và luồng chọn ngày
  gửi vào form.
- Form lead hiện dùng `/api/lead-submissions` và `form-submissions`; ngữ cảnh
  ngày khởi hành chưa được persist đầy đủ.
- Dữ liệu hiện có thể thiếu PDF, hãng bay, giá gốc hoặc số điểm; giao diện phải
  thể hiện trạng thái thiếu dữ liệu thay vì sinh giá trị giả.

## Target Behavior

- TASK-02: desktop header WingsGo một hàng từ 1280px; hotline gọi được; Zalo OA
  và chuyển ngôn ngữ hoạt động; footer giữ hotline trên một dòng, có địa chỉ,
  thông điệp tư vấn và CTA Zalo kèm hotline.
- TASK-03: widget liên hệ 24/7 vừa khung responsive, có hotline và hai email
  theo site, cùng liên kết trang liên hệ.
- TASK-04: `/lien-he` có banner, bốn selling points, form đúng trường và
  validation; submission tạo lead site-scoped trong luồng Payload hiện hữu.
- TASK-06/07: trang chủ có một khối lịch khởi hành sắp tới cho Hàn/Nhật/Trung
  (không dùng nhãn trùng lặp), Hero hiển thị tối đa ba mini-card ưu đãi có thumbnail
  và badge do CMS chọn, và section `🔥 Tour đang được quan tâm nhất` khôi phục lại Grid 4
  card tour lớn đầy đủ ảnh/badge/giá, cùng ba card thị trường điểm đến.
- TASK-13: tour detail có accordion, tải PDF khi tour được gắn PDF, bảng giá
  theo tháng/năm và CTA theo trạng thái chỗ. CTA truyền departure đã chọn vào
  form; thông tin loyalty chỉ là dữ liệu do sales nhập.
- TASK-14: lịch khởi hành có tiêu đề/intro, ba card tour theo thị trường và
  khối tư vấn cuối trang.
- Các thay đổi chỉ áp dụng WingsGo; không làm lệch site dùng chung khác.

## Affected Users

- Khách truy cập WingsGo trên desktop/mobile.
- Nhân viên sales/biên tập viên cập nhật tour, departure và lead trong CMS.
- Người vận hành phát hành và kiểm tra site đa tenant.

## Affected Product Docs

- `docs/product/tour-product-platform.md`
- `docs/product/tour-detail-builder-foundation.md`
- `docs/product/multisite-platform.md`
- `docs/stories/epics/E07-tour-product-platform/US-023-tour-product-model.md`
- `docs/stories/epics/E07-tour-product-platform/US-024-tour-detail-builder.md`
- `docs/stories/epics/E07-tour-product-platform/US-028-schedule-browse-and-convert-ux.md`

## Non-Goals

- TASK-01 popup lead.
- Booking/payment/account/loyalty engine, CRM hoặc lead router mới.
- Tạo analytics để suy đoán tour “được quan tâm”; dùng curation và trạng thái
  đã có trong CMS.
- Bắt buộc có PDF thật hoặc bổ sung hàng loạt nội dung/giá trước khi nghiệm thu.
- Gửi email/webhook test tới sales thật hoặc thay đổi nội dung Production thủ
  công để làm test pass.
