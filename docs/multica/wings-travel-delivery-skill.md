---
name: wings-travel-delivery
description: Vận hành an toàn công việc giao hàng WingsTravel từ issue Multica.
---

# Giao hàng WingsTravel

Dùng skill này cho issue Multica cần thay đổi hoặc rà soát WingsTravel.

## Trước khi làm việc

1. Đọc `AGENTS.md`, `README.md`, `docs/WORKFLOW.md` và ngữ cảnh sản phẩm, story, kế hoạch, quyết định, mã nguồn liên quan.
2. Coi `source/`, tài liệu repository, mã nguồn, kiểm thử và bằng chứng runtime là nguồn sự thật. Multica chỉ điều phối vận hành, không thay thế sự thật sản phẩm.
3. Xác nhận phạm vi issue, tài nguyên repository, tiêu chí chấp nhận và quyền ghi bên ngoài, triển khai hoặc production.
4. Không đọc, in hoặc sao chép secret. Không đổi hạ tầng triển khai/production nếu issue không cho phép rõ ràng và không có bằng chứng được ghi lại.

## Vòng lặp thực hiện

1. Chỉ chuyển issue được giao sang `in_progress` khi bắt đầu làm thật.
2. Thực hiện thay đổi nhỏ nhất nhưng trọn vẹn; giữ nguyên các thay đổi không liên quan trong working tree.
3. Chạy kiểm chứng phù hợp và báo cáo chính xác lệnh cùng kết quả trong issue.
4. Liên kết bằng chứng bằng đường dẫn repository, commit, pull request hoặc artifact bền vững.
5. Chuyển issue sang `in_review` sau khi bàn giao. Con người, close intent của PR được chấp nhận hoặc phê duyệt rõ ràng mới quyết định `done`.

## Ranh giới chuyển đổi

- Skill này cấu hình Multica cho việc chuyển đổi, không ghi đè quy tắc Plane cấp repository. Cho đến khi quyết định cutover cập nhật `AGENTS.md`, vẫn tuân thủ yêu cầu đồng bộ Plane khi thay đổi ảnh hưởng theo dõi của stakeholder.
- Không chạy import/sync Plane chỉ để cấu hình Multica hoặc chuẩn hóa lịch sử đã nhập.
- Với môi trường Multica migration mới đã được chủ sở hữu chấp nhận, dùng
  runtime hiện tại và không yêu cầu lại hardening (service identity, secret
  manager, runtime cô lập hoặc kho artifact append-only) ở từng issue. Quyết
  định này không cho phép deployment, lộ secret, Plane mutation hay ghi vào
  workspace có dữ liệu production.
- Bản ghi lịch sử đã nhập chỉ là bằng chứng: không tự gán, mention, chạy lại hoặc sửa chúng chỉ để chuẩn hóa dữ liệu.
- Giữ nguyên thuộc tính `source_plane_state` và `proof_status`; không gộp `Đã bàn giao` và `Hoàn tất` trong mô tả hoặc báo cáo.

## Mẫu kết quả

Báo cáo file đã đổi, lệnh đã chạy, bằng chứng, rủi ro chưa xử lý và quyết định tiếp theo của con người. Nêu rõ khi không thay đổi gì.
