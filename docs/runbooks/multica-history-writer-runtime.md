# Runbook runtime cho writer lịch sử Multica

## Mục đích

Thiết lập điều kiện thực thi an toàn trước khi triển khai hoặc chạy writer nhập
lịch sử Plane sang Multica. Tài liệu này không chứa secret và không cấp quyền
ghi production.

## Sandbox đã tạo

- Workspace: `WingsGroup Migration Sandbox`
- ID: `fbd0e39f-4459-4ae2-a997-2133145fced1`
- Slug: `wingsgroup-migration-sandbox`
- Prefix issue: `WMS`
- Trạng thái: rỗng; chưa có project, agent, repository resource hoặc bản ghi
  lịch sử nào được tạo trong workspace này.

## Điều kiện khi ghi vào workspace có dữ liệu thật

### 1. Service identity và secret

- Tạo service identity riêng cho `multica-history-writer`, không dùng token cá nhân.
- Cấp quyền tối thiểu chỉ trong sandbox: đọc, tạo và cập nhật project/issue cần
  cho kiểm chứng; không cấp quyền quản trị workspace, agent, runtime, member
  hoặc xóa dữ liệu.
- Đặt secret trong secret manager của runtime, inject vào biến môi trường lúc
  chạy; tuyệt đối không đưa token vào repository, issue, artifact hoặc log.
- Đặt hạn token, owner, ngày xoay vòng và quy trình thu hồi.

Bằng chứng cần ghi vào WIN-7: tên identity, phạm vi quyền, tên tham chiếu secret
(không phải giá trị secret), owner, hạn token và phương án thu hồi.

### 2. Runtime cô lập

- Tạo user/container/runtime riêng cho writer; không dùng runtime cục bộ đang
  phục vụ người dùng hoặc checkout có thay đổi chưa commit.
- Mount repository ở chế độ chỉ đọc khi chỉ cần dữ liệu nguồn; chỉ thư mục
  scratch/export riêng mới được ghi.
- Tắt hoặc chặn truy cập Plane, production application, deployment và secret
  không liên quan.
- Thiết lập giới hạn thời gian, nhật ký đã redaction và mạng chỉ tới Multica
  sandbox cùng kho artifact.

Bằng chứng cần ghi vào WIN-7: runtime ID, image/version, user thực thi, đường
dẫn mount, chính sách mạng và kết quả kiểm tra không có secret trong log.

### 3. Kho artifact append-only

- Tạo bucket/thư mục artifact có versioning hoặc immutable-retention.
- Writer chỉ có quyền ghi thêm; không có quyền sửa/xóa phiên bản đã tạo.
- Lưu: preview JSON, operation plan, journal từng batch, export trước/sau,
  báo cáo đối chiếu và checksum cho từng artifact.
- Xác định retention, owner và cách khôi phục artifact khi rollback.

Bằng chứng cần ghi vào WIN-7: URI kho, chính sách retention/versioning, quyền
writer, ví dụ artifact đã checksum và quy trình truy xuất.

## Quyết định phạm vi sandbox — 2026-08-10

Chủ sở hữu chấp nhận **hoãn** ba điều kiện trên khi phát triển và kiểm chứng
writer trong workspace sandbox rỗng. Vì sandbox không có dữ liệu hiện hữu,
không cần service identity, runtime cô lập hay kho artifact append-only chỉ để
xây dựng và chạy thử writer.

Việc hoãn này không áp dụng khi writer ghi vào workspace `WingsGroup` hoặc bất
kỳ workspace có dữ liệu thật nào. Khi đó phải hoàn tất toàn bộ các điều kiện
trên trước khi chạy import.

## Cổng mở WIN-8

WIN-8 được phép bắt đầu trong sandbox sau khi xác nhận rõ workspace đích bằng
ID `fbd0e39f-4459-4ae2-a997-2133145fced1`. Dù được hoãn hardening, writer vẫn
phải giữ dry-run mặc định, xác nhận số lượng 7/8/57/189, không gán bản ghi lịch
sử, không dùng mention kích hoạt agent và không lưu secret vào repository hay
issue.
