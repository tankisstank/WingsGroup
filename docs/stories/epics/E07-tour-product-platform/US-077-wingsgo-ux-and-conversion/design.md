# Design — US-077

## Constraints

- Payload là nguồn dữ liệu tour, departure, Page và lead; dùng collection,
  query, form-submissions queue và site-scope đang có.
- Không tạo collection CRM/booking hoặc dependency mới.
- Không đổi schema/API theo hướng phá vỡ submission cũ. Field mới là optional
  và client context phải được server resolve/validate.
- Chỉ render nội dung WingsGo ở site WingsGo; common components phải giữ nguyên
  hành vi WingsSide/WingsGroup.
- Mọi giá/chỗ cần dựa trên freshness (`verifiedAt`/`expiresAt`) và trạng thái
  departure. Không suy diễn “còn chỗ” hay giá.

## Data and Lead Contract

- `TourDepartures`: optional `originalPrice`, `loyaltyPoints`, `flightNumber`
  và `tourClass`; không thay `priceFrom`/giá hiện tại. Giá gốc phải lớn hơn giá
  ưu đãi mới được gạch ngang.
- `TourProducts`: quan hệ PDF itinerary có thể để trống; nếu có, chỉ chấp nhận
  media PDF và tải từ URL Payload hiện tại.
- Lead context chỉ cho phép các khóa cần thiết: `intent`, `tourId`, `tourSlug`,
  `departureId`, ngày khởi hành đã resolve, `discovery` và `source`. API xác
  minh site/tour/departure liên quan, trạng thái và dữ liệu public; không tin
  ngày/giá do browser tự gửi.
- Context được lưu trong `form-submissions` hiện tại và đưa qua queue/email
  hiện tại nếu task queue hỗ trợ; không đổi người nhận hoặc tự thêm webhook,
  Google Sheets hay SaaS mới.
- Giữ nguyên form cũ. Chỉ WingsGo contact form bổ sung tour/departure context.

## Rendering

- Reuse `TourItineraryDayDetails`, `ScheduleInteractiveDepartures`, query
  helpers và `wingsGoTourCatalog` hiện có.
- Thêm curation qua trường/block CMS tối thiểu, có lọc site và validate tối đa
  bốn tour trang chủ; không tạo nguồn giá trùng lặp.
- Khối lịch trang chủ chọn một departure kế tiếp cho từng thị trường, ưu tiên
  CMS `isFeatured`, sau đó tình trạng giới hạn chỗ và ngày gần nhất; ngày, hãng
  bay, mã chuyến và giá phải lấy từ cùng một record.
- Trang tour hiển thị giá theo tháng năm, không trộn các năm. Departure quá
  hạn/không xác minh sẽ không công bố giá hoặc chỗ.
- Nút của departure mở native `<dialog>` và truyền ID/ngữ cảnh đã chọn; sold
  out dùng “Gửi yêu cầu”, tình trạng có thể nhận tư vấn dùng “Giữ chỗ ngay”.
  Submit vẫn là yêu cầu tư vấn, không phải xác nhận booking.
- PDF button chỉ xuất hiện khi có PDF hợp lệ; thiếu file không chặn xuất bản
  tour hay nghiệm thu kỹ thuật.

## UI and Localization

- Dùng native date input, form controls hiện có và CSS responsive.
- Header giữ menu gọn trên viewport nhỏ; một hàng ở desktop rộng từ 1280px.
- Giữ locale VI/EN theo contract site hiện tại. Không hard-code locale switch
  href hoặc sửa copy chung của site khác.
- Cung cấp focus-visible, Escape/đóng dialog, label/error gắn với trường và
  layout không tràn ngang tại 390px.

## Open Implementation Decisions

- Trước khi đổi collection: kiểm tra field hiện hữu và schema đã đổi ở workspace;
  thêm migration chỉ khi Payload yêu cầu và rehearsal được rollback.
- Nếu curation đã có field CMS tương đương, tái sử dụng thay vì thêm field.
- Nếu queue/email không có hợp đồng truyền lead context an toàn, lưu context
  vào submission và chỉ bổ sung tối thiểu cho template hiện hữu.
