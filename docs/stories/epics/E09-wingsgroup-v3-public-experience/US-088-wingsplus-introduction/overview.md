# US-088 — Xuất bản trang giới thiệu WingsPlus

## User Story

Là khách tìm hiểu WingsPlus, tôi muốn đọc trang giới thiệu có bốn nhóm dịch vụ và nút trao đổi với chuyên viên, để chọn hướng tư vấn phù hợp trước khi gửi yêu cầu.

## Scope

Theo đính chính của người dùng ngày 2026-10-27, trang giới thiệu thuộc site wings-group tại wingsgroup.vn/gioi-thieu-wingsplus, quản lý trong CMS → Pages → WingsGroup → Giới thiệu WingsPlus → Content/Layout. Trang thuộc tenant WingsGroup, dùng Hero, Feature Grid và CTA hiện có. Khối hệ sinh thái chỉ dùng mô tả ngắn: “Hành trình riêng, Company Trip, MICE và các chương trình thiết kế theo yêu cầu.” Không đưa bốn nhóm nội dung dài vào khối này.

CTA trên trang mới: “Trao đổi với chuyên viên”, dẫn tới /lien-he#contact-form của WingsGroup. CTA WingsPlus trong hệ sinh thái: “Xem giới thiệu”, dẫn tới trang giới thiệu trên WingsGroup. Nội dung bốn nhóm lấy từ bản editor cung cấp: Company Trip, MICE, Private Tour, Wellness & Medical Travel.

Phạm vi kỹ thuật cần thiết: bổ sung đúng một route giới thiệu được quản trị /gioi-thieu-wingsplus, giữ inventory và seed mười corporate routes hiện hữu; tiếp tục kiểm tra tenant, locale, approval và media. Phát hành phần đơn giản hóa CTA đã yêu cầu trong US-087 để CMS có thể lưu mô tả và liên kết mà không yêu cầu năm trường evidence không phù hợp. Không tạo collection hoặc schema mới; giữ cột cũ để tương thích dữ liệu và rollback. Page372 trên wingsplus.vn là kết quả hiểu sai trước đính chính, không được tính là bằng chứng hoàn tất; chuyển trang tự tạo này về draft sau khi trang đúng chạy được.

## Ownership and Dates

Owner c0508g; bắt đầu 2026-10-27. Epic E09, project Core. Site nội dung là WingsGroup. Ngày kiểm tra và bàn giao ghi theo bằng chứng thực tế.

## Acceptance Criteria

- Tạo trang /gioi-thieu-wingsplus trên WingsGroup có Hero và metadata đúng site.
- Trình bày đủ bốn nhóm dịch vụ bằng Feature Grid.
- Dẫn CTA Trao đổi với chuyên viên tới form WingsGroup.
- Giữ mô tả hệ sinh thái ngắn, CTA Xem giới thiệu mở /gioi-thieu-wingsplus; bảo toàn nội dung và draft hiện hữu.
- Kiểm tra production trên desktop và mobile, lưu review và bằng chứng.
- Cập nhật trạng thái, kết quả Harness và Plane theo thực tế.

## Implementation and Rollback

Kiểm tra tồn tại route trước khi tạo; lưu bằng chứng sửa vị trí trong wingsplus-on-wingsgroup-20261027. Candidate tách riêng từ source production; không kéo thay đổi ngoài phạm vi từ working tree. Tham vấn Codex trước thay đổi governance và trước release; tuân thủ runbook ARM64. Dùng CMS/Payload hiện có, không sửa database trực tiếp. Lưu snapshot published và latest draft trước khi sửa ecosystem; giao dịch có kiểm tra đồng thời, không phát hành Hero draft của editor. Nếu lỗi, rollback image và đúng nội dung do tác vụ thay đổi; giữ cột lịch sử.

## Verification

Kiểm tra nội dung render, một H1, bốn thẻ, CTA thực sự mở form, ảnh tải được nếu dùng ảnh, không tràn ngang mobile. Không gửi lead thật. Không coi HTTP 200 hoặc tìm chuỗi là đủ bằng chứng. Các hạn chế sẽ ghi vào validation.md.
