# Xây dựng cơ chế bảo vệ cho việc nhập lịch sử vào Multica

## Mục tiêu

Mở rộng công cụ chuyển đổi hiện có bằng kế hoạch nhập lịch sử có tính xác định,
an toàn mặc định và chỉ sẵn sàng để thực thi sau khi con người phê duyệt riêng.

## Phạm vi

- Giữ `multica-import.mjs preview` là lệnh chỉ đọc mặc định.
- Thêm hợp đồng `apply` tường minh, từ chối ghi nếu thiếu bất kỳ xác nhận bắt buộc nào.
- Trước mọi khả năng ghi, kiểm tra bất biến của bản xem trước và yêu cầu người vận hành xác nhận độc lập: 7 dự án, 8 Epic, 57 story, 189 tiêu chí chấp nhận.
- Bảo đảm bản ghi lịch sử không được gán người/agent và không có cú pháp mention có thể kích hoạt agent.
- Xuất kế hoạch/báo cáo nêu các thao tác dự kiến trên project, Epic, story và tiêu chí chấp nhận mà không gọi chúng trong issue này.
- Bổ sung kiểm thử tập trung, gồm cả đường đi thất bại khi thiếu xác nhận.

## Ràng buộc

- Issue này không được tạo, sửa, gán, xóa hoặc nhập bất kỳ bản ghi lịch sử Multica nào.
- Không chạy lệnh Plane, triển khai hoặc truy cập secret.
- Không thay thế thay đổi cục bộ của người dùng.
- Mọi thao tác ghi thực sự phải chờ một phê duyệt riêng của con người.

## Tiêu chí chấp nhận

- Lệnh mặc định vẫn chỉ đọc và `multica:verify` tiếp tục thành công.
- Đường `apply` bị chặn an toàn khi thiếu xác nhận rõ ràng.
- Bản xem trước/báo cáo cho phép kiểm tra ràng buộc không-gán và không-kích-hoạt-agent.
- Agent để issue ở `in_review`, kèm lệnh và bằng chứng chính xác.
