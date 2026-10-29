# US-087 — Đơn giản hóa CTA thương hiệu trong CMS

## User Story

Là editor WingsGroup, tôi muốn cấu hình CTA sang trang WingsPlus hoặc thương hiệu khác bằng nhãn và URL hợp lệ, để không phải nhập các bằng chứng kiểm tra kỹ thuật không thuộc nội dung biên tập.

## Current Behavior

CTA có năm trường Owner, HTTP 200 evidence, Canonical evidence, Tracking evidence, Owner approval evidence. CMS và frontend cùng chặn URL nếu thiếu một trường. Điều này khiến editor nhập đúng URL nhưng khách vẫn bị dẫn về form liên hệ.

## Target Behavior

Bỏ năm trường khỏi CMS/types và điều kiện evidence trong validator/renderer. Editor chọn đích trang web, nhập URL HTTPS hợp lệ và nhãn CTA. Giữ lựa chọn form liên hệ, đường dẫn an toàn, dữ liệu cũ và quy tắc multisite/media/proof khác.

## Ownership and Dates

- Epic: E09 — Trải nghiệm public WingsGroup v3; project: Core; owner: c0508g.
- Bắt đầu: 2026-10-26; mục tiêu rà soát/nghiệm thu: 2026-10-30; chưa cam kết ngày production.
- Trạng thái ban đầu: planned; đã chuyển in_progress sau khi packet được khai báo vào Harness, trước khi sửa code.

## Acceptance Criteria

- Loại bỏ năm trường evidence CTA, giữ nguyên dữ liệu lịch sử.
- Kiểm tra URL HTTPS an toàn ở cả CMS và frontend.
- Giữ tương thích CTA, form liên hệ và trạng thái đã lưu.
- Kiểm chứng schema, model, component và platform; ghi Codex review.
- Đồng bộ hợp đồng sản phẩm, Harness và Plane đúng trạng thái local.

## Acceptance Details

Config/generated types không còn năm field; HTTPS sai, credentials và control characters bị từ chối; URL đúng hoạt động không cần evidence; contact fallback và guard slug cũ giữ nguyên. Kết quả test/review phải có bằng chứng, không khai đã deploy hoặc khách nghiệm thu. Phạm vi không bao gồm DROP cột, sửa migration lịch sử hoặc đổi CTA production.

## Non-Goals

Không nhập nội dung WingsPlus trong ảnh; không đổi URL production, publish, deploy, push, quyền truy cập hay schema proof/media. Nhãn tab Xem giới thiệu là thay đổi trước đó, không gộp vào US này.

## Product Contract

`docs/product/wingsgroup-v3-public-experience.md`, mục CTA Safety Rules.
