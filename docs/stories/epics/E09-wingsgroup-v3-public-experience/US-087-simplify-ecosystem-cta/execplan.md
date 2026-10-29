# US-087 — Exec Plan

## Goal and Risk

Đơn giản hóa CTA CMS theo yêu cầu người dùng. Lane high-risk do bỏ một validation gate và thay cấu hình field; không đổi kiến trúc multisite hoặc xóa dữ liệu. Người dùng đã yêu cầu xem xét loại các trường và khai báo US trước khi thực hiện.

## Phases

1. Khai báo story packet, Harness planned, mapping Plane; ghi ngày và owner.
2. Tham vấn Codex về tương thích schema, safety URL và phạm vi kiểm thử trước khi sửa code.
3. Chuyển in_progress, sửa schema/runtime/helper/types/tests; giữ mọi thay đổi khác trong workspace.
4. Chạy kiểm chứng cần thiết, đọc lỗi và xử lý finding dựa trên bằng chứng.
5. Cập nhật validation/audit, hợp đồng sản phẩm, Harness/Plane; chỉ ghi trạng thái local verified nếu chưa phát hành.

## Stop Conditions

Không chạy thao tác DROP dữ liệu, ghi CMS production hoặc deploy trong US này. Nếu phát hiện cần migration phá hủy hoặc thay luồng multisite, ghi lại và xin quyết định trước bước đó. Không thay các validation proof/media không thuộc yêu cầu.
