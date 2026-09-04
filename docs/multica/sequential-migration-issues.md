# Các issue chuyển đổi Multica theo thứ tự

## Issue cha

Hoàn tất an toàn việc chuyển lịch sử từ Plane sang Multica. Repository và
Harness vẫn là nguồn sự thật xuyên suốt. Plane chỉ đọc cho đến khi quyết định
cutover được phê duyệt.

## Giai đoạn 1 — Chấp nhận bộ nhập có cơ chế bảo vệ

Rà soát bằng chứng `WIN-4` và quyết định rõ ràng có chấp nhận phần chuẩn bị bộ
nhập có cơ chế bảo vệ hay không. Issue này không cấp phép ghi dữ liệu lịch sử.

## Giai đoạn 2 — Xác nhận phạm vi runtime migration

Chủ sở hữu đã chấp nhận dùng runtime hiện tại cho Multica mới, rỗng trong toàn
bộ migration; không yêu cầu lại service identity, secret manager, runtime cô
lập hoặc kho artifact append-only. Vẫn cấm deployment, Plane mutation, lộ
secret và ghi vào workspace có dữ liệu production.

## Giai đoạn 3 — Xây dựng writer idempotent

Chỉ sau khi giai đoạn 1 và 2 được chấp nhận, thêm writer Multica idempotent với
external ID, nhật ký tiếp tục an toàn, chống trùng lặp, xử lý rate limit và mặc
định dry-run. Giữ bản ghi lịch sử không được gán và cấm mention kích hoạt agent.
Không thực hiện nhập production.

## Giai đoạn 4 — Kiểm chứng trên mục tiêu dùng một lần

Chạy writer chỉ trên mục tiêu Multica dùng một lần. Kiểm tra chính xác 7 dự án,
8 Epic, 57 story, 189 tiêu chí chấp nhận; hierarchy, trạng thái, provenance,
không-gán, không mention, chạy lại idempotent và bằng chứng rollback/export.
Không ghi lịch sử production.

## Giai đoạn 5 — Go/no-go cho nhập production

Rà soát báo cáo mục tiêu dùng một lần, năm tài liệu được khai báo nhưng thiếu và
bảy story chỉ có Harness; ghi quyết định phê duyệt hoặc từ chối rõ ràng. Issue
phê duyệt này không ghi dữ liệu.

## Giai đoạn 6 — Nhập lịch sử và đối chiếu hai nguồn

Sau khi được phê duyệt production rõ ràng, thực hiện import bị giới hạn,
idempotent, lưu nhật ký/export và so sánh Multica với repository/Harness. Giữ
bản ghi lịch sử không-gán, không mention agent. Plane vẫn chỉ đọc.

## Giai đoạn 7 — Quyết định cutover và cập nhật governance

Quyết định Multica có trở thành công cụ quản lý nội bộ hay không. Nếu được chấp
nhận, cập nhật hướng dẫn vận hành repository và decision record, xác định vai
trò chỉ đọc/lưu trữ của Plane và truyền thông cutover. Không xóa Plane.
