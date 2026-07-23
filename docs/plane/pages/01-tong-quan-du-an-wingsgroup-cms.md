# Tổng quan dự án WingsGroup CMS

## Mục tiêu

WingsGroup CMS là nền tảng quản trị nội dung đa site cho hệ sinh thái WingsGroup.
Mục tiêu giai đoạn 1 là đưa site đầu tiên vào vận hành và giữ kiến trúc sẵn sàng mở rộng cho các site con.

## Mô hình triển khai

- một codebase dùng chung
- nền tảng theo định hướng Payload-first
- frontend nhận biết theo site
- mỗi site có nội dung, nhận diện và cấu hình riêng

## Các site trong hệ sinh thái

- WingsTravel
- WingsGo
- WingsSide
- WingsPlus
- WingsCare
- WingsPass

## Nhóm năng lực chính của giai đoạn 1

- đa site và đa tên miền
- đa ngôn ngữ
- trang nội dung và landing page
- quản trị nội dung và media
- phân quyền quản trị

## Nguyên tắc

- chưa mở rộng sớm sang CRM đầy đủ
- chưa đưa booking, payment và workflow AI vào mặc định của giai đoạn 1
- tài liệu trong repo là nguồn gốc nội bộ để đối chiếu
- Plane được dùng để theo dõi tiến độ triển khai và hướng dẫn vận hành
