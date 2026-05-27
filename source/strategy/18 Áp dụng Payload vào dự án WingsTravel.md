# Áp dụng Payload vào dự án WingsTravel

## 1. Mục đích tài liệu

Tài liệu này dùng để mô tả cách áp `Payload` vào dự án `WingsTravel` theo đúng phạm vi đã chốt cho giai đoạn 1.

Mục tiêu của tài liệu này là:

- chuyển từ mức "chọn công nghệ" sang mức "áp vào dự án như thế nào"
- làm rõ Payload sẽ giữ vai trò gì trong hệ thống
- làm rõ content model, quyền hạn và cấu trúc dữ liệu cần có
- tránh việc dùng Payload quá rộng ngay từ đầu

Tài liệu này là tài liệu nội bộ triển khai, không phải bản gửi khách hàng.

## 2. Phạm vi áp dụng trong giai đoạn 1

Trong giai đoạn 1, Payload chỉ nên được dùng cho đúng 5 nhóm bài toán:

- multi-site / multi-domain
- đa ngôn ngữ
- quản lý page và landing page
- quản lý nội dung và media
- phân quyền quản trị

Payload ở giai đoạn này không nên bị mở rộng quá sớm sang:

- CRM đầy đủ
- workflow vận hành sâu
- automation orchestration
- AI / chatbot
- reporting phức tạp

## 3. Vai trò của Payload trong kiến trúc WingsTravel

Trong giai đoạn 1, Payload nên giữ 4 vai trò chính:

### 3.1. CMS lõi

Payload là nơi quản trị:

- page
- landing page
- nội dung dịch vụ / tour
- nội dung theo ngôn ngữ
- phần dùng chung theo site

### 3.2. Lớp quản trị nhiều site

Payload là nơi giữ cấu trúc để một hệ có thể phục vụ nhiều site như:

- `WingsTravel`
- `WingsGo`
- `WingsCare`
- `WingsInsurance`

Mỗi site có:

- domain riêng
- nội dung riêng
- cấu hình riêng
- quyền quản lý riêng

### 3.3. Lớp page builder / landing page builder

Payload là nơi cho phép dựng:

- website page theo cấu trúc chuẩn
- landing page theo block
- page riêng cho từng site
- page riêng theo ngôn ngữ

### 3.4. Lớp quyền hạn quản trị

Payload là nơi kiểm soát:

- ai nhìn thấy site nào
- ai được sửa nội dung nào
- ai được publish
- ai được quản lý toàn hệ

## 4. Các capability của Payload sẽ dùng trong dự án

Không cần dùng toàn bộ khả năng của Payload.

Những capability lõi nên dùng là:

- `Collections`
- `Globals`
- `Localization`
- `Blocks`
- `Auth`
- `Access Control`
- `Uploads`
- `Versions / Drafts`
- `Live Preview`

## 4.1. Hạ tầng dữ liệu đề xuất

Để áp `Payload` đúng vào dự án này, cần tách rõ 3 môi trường:

- `Local development`: có thể dùng `SQLite` để bootstrap nhanh
- `Staging`: nên dùng `PostgreSQL`
- `Production`: nên dùng `PostgreSQL + Redis`

Vai trò:

- `PostgreSQL` giữ dữ liệu chính của CMS và multisite
- `Redis` giữ cache, KV data và các dữ liệu ngắn hạn phục vụ hiệu năng

Nguyên tắc:

- không dùng `Redis` thay database chính
- không dùng `SQLite` cho môi trường vận hành thật

## 5. Đề xuất cấu trúc dữ liệu cho WingsTravel

## 5.1. Collection `sites`

Đây là collection trung tâm để biểu diễn từng site trong hệ sinh thái.

### Mục đích

- quản lý danh sách site
- làm khóa liên kết cho nội dung, quyền hạn và cấu hình

### Trường dữ liệu đề xuất

- `name`
- `slug`
- `domain`
- `status`
- `brandName`
- `defaultLocale`
- `supportedLocales`
- `siteType`
- `description`

### Ví dụ bản ghi

- `WingsTravel`
- `WingsGo`
- `WingsCare`
- `WingsInsurance`

## 5.2. Global theo từng site

Nên dùng `Globals` hoặc cấu trúc tương đương để giữ phần dùng chung của mỗi site.

### Mục đích

- tách phần dùng chung khỏi page riêng lẻ

### Nội dung nên quản lý

- header
- footer
- logo
- thông tin liên hệ
- social links
- thông điệp thương hiệu ngắn
- CTA mặc định

### Gợi ý triển khai

Có 2 hướng:

1. `Globals` chung + field tham chiếu theo site
2. collection `site-settings` gắn `site`

Với case `WingsTravel`, hướng `site-settings` thường linh hoạt hơn nếu mỗi site có cấu hình riêng nhiều.

## 5.3. Collection `pages`

### Mục đích

- quản lý các trang nội dung chuẩn của từng site

### Trường dữ liệu đề xuất

- `site` liên kết tới `sites`
- `title`
- `slug`
- `locale`
- `pageType`
- `hero`
- `sections`
- `seo`
- `publishedAt`

### Page type gợi ý

- `home`
- `about`
- `service-list`
- `service-detail`
- `contact`
- `generic`

## 5.4. Collection `landing-pages`

### Mục đích

- quản lý landing page riêng cho campaign / thị trường / dịch vụ

### Trường dữ liệu đề xuất

- `site`
- `title`
- `slug`
- `locale`
- `campaignCode`
- `market`
- `pageGoal`
- `sections`
- `seo`
- `status`

### Điểm khác với `pages`

- tập trung chuyển đổi
- có thể nhân bản nhanh
- thay đổi block linh hoạt hơn

## 5.5. Collection `services`

### Mục đích

- quản lý dịch vụ hoặc nhóm tour để tái sử dụng trên page và landing page

### Trường dữ liệu đề xuất

- `site`
- `title`
- `slug`
- `locale`
- `summary`
- `highlights`
- `content`
- `gallery`
- `cta`
- `seo`

## 5.6. Collection `media`

### Mục đích

- quản lý ảnh và asset dùng trong nhiều site

### Trường dữ liệu đề xuất

- `site` nếu cần ràng buộc theo site
- `alt`
- `caption`
- `tags`
- `localeScope` nếu cần

### Lưu ý

- nếu một asset dùng chung toàn hệ thì không nhất thiết phải ép theo `site`
- nếu cần tách media theo site thì thêm `site` là hợp lý

## 5.7. Collection `users`

### Mục đích

- quản lý tài khoản đăng nhập CMS

### Trường dữ liệu đề xuất

- `name`
- `email`
- `role`
- `sites`
- `status`

### Role gợi ý

- `super-admin`
- `site-manager`
- `editor`

## 6. Đề xuất block cho page builder / landing page builder

Giai đoạn 1 chỉ nên giữ bộ block gọn và đủ dùng.

### Block bắt buộc

- `hero`
- `rich-text`
- `feature-list`
- `service-highlight`
- `gallery`
- `testimonial`
- `faq`
- `cta`
- `contact-form`

### Nguyên tắc

- block phải có schema rõ
- block đủ linh hoạt để dùng lại
- không tạo quá nhiều block ngay từ đầu

## 7. Đề xuất localization cho WingsTravel

## 7.1. Cấp cấu hình

Nên bật `Localization` ngay từ đầu ở cấp hệ thống.

### Tối thiểu cần chốt

- `defaultLocale`
- danh sách locale cho phase 1

### Gợi ý

- `vi`
- `en`
- các locale khác như `ko`, `zh` mở theo site hoặc theo campaign

## 7.2. Cấp dữ liệu

Nên localize các field sau:

- `title`
- `summary`
- `hero`
- `sections`
- `seo`
- `cta text`

Không nhất thiết localize:

- `slug` nếu muốn cố định theo cấu trúc
- mã campaign
- trạng thái

## 8. Đề xuất phân quyền và access control

## 8.1. Mục tiêu

Phân quyền phải bám theo 2 trục:

- role
- site

## 8.2. Vai trò

### `super-admin`

- xem toàn bộ site
- quản lý users
- quản lý mọi nội dung
- cấu hình toàn hệ

### `site-manager`

- chỉ xem và quản lý các site được gán
- tạo / sửa / publish page và landing page của site đó
- quản lý nội dung và media trong phạm vi được giao

### `editor`

- chỉ xem và sửa nội dung của site được gán
- có thể bị hạn chế quyền publish nếu cần

## 8.3. Rule access control nên áp

### Theo collection

- `pages`: chỉ thấy record có `site` thuộc danh sách site được gán
- `landing-pages`: tương tự
- `services`: tương tự
- `media`: tùy mô hình, có thể theo site hoặc toàn hệ
- `users`: chỉ `super-admin` toàn quyền; `site-manager` chỉ có quyền nếu thực sự cần

### Theo hành động

- `read`
- `create`
- `update`
- `delete`

Không nên mặc định cho mọi role quyền `delete` rộng.

### Theo field

Các field nhạy cảm như:

- `role`
- `sites`
- `domain`
- `status`

nên hạn chế cho `super-admin` hoặc nhóm quyền cao hơn.

## 9. Luồng quản trị tối thiểu cần có

Giai đoạn 1 cần đảm bảo user có thể làm được các luồng sau:

### Luồng 1: Quản lý page theo site

- đăng nhập
- chọn site phụ trách
- xem danh sách page
- tạo / sửa / preview / publish

### Luồng 2: Quản lý landing page theo campaign

- tạo landing page mới
- chọn site
- chọn locale
- kéo / sắp block theo cấu trúc
- preview
- publish

### Luồng 3: Quản lý nội dung đa ngôn ngữ

- mở page
- chuyển locale
- cập nhật nội dung
- kiểm tra hiển thị đúng ngôn ngữ

### Luồng 4: Quản lý quyền

- gán user vào một hoặc nhiều site
- kiểm tra user chỉ nhìn thấy đúng site của mình

## 10. Những gì nên bật ngay trong phase 1

- `Localization`
- `Blocks`
- `Auth`
- `Access Control`
- `Uploads`

### Nên cân nhắc bật

- `Versions`
- `Drafts`
- `Live Preview`

Lý do:

- rất hữu ích cho biên tập nội dung
- nhưng cần chốt rõ luồng publish với khách hàng

## 11. Những gì chưa nên làm trong phase 1

- lead workflow nhiều bước
- CRM mini nhiều trạng thái
- dashboard reporting phức tạp
- workflow nội bộ nhiều actor
- automation / queue / job phức tạp
- tích hợp AI

## 12. Đề xuất cấu trúc thư mục nếu build riêng cho dự án

Nếu tách thành dự án Payload riêng, nên hình dung cấu trúc gần như:

- `collections/sites`
- `collections/pages`
- `collections/landing-pages`
- `collections/services`
- `collections/media`
- `collections/users`
- `globals/site-settings`
- `blocks/hero`
- `blocks/rich-text`
- `blocks/feature-list`
- `blocks/gallery`
- `blocks/testimonial`
- `blocks/faq`
- `blocks/cta`
- `blocks/contact-form`
- `access/`
- `hooks/`

## 13. Mapping Payload vào các yêu cầu đã chốt

### Multi-domain

- xử lý qua `sites` + cấu hình frontend theo domain

### Đa ngôn ngữ

- xử lý qua `Localization`

### Giao diện

- xử lý qua `pages` + `landing-pages` + `blocks`

### Quản lý nội dung

- xử lý qua `Collections` + `Globals` + `Uploads` + `Drafts`

### Phân quyền

- xử lý qua `Auth` + `Access Control`

## 14. Kết luận

Nếu áp đúng cách, Payload trong dự án `WingsTravel` nên được hiểu là:

- không phải chỉ là CMS
- không phải là CRM
- không phải là workflow engine

Mà là:

- nền quản trị nhiều site
- nền quản trị đa ngôn ngữ
- nền page builder / landing page builder
- nền phân quyền quản trị nội dung

Về hạ tầng dữ liệu, cách áp đúng cho dự án này là:

- `SQLite` cho local development
- `PostgreSQL` cho staging và production
- `Redis` để tối ưu hiệu năng khi hệ mở rộng

Đó là cách dùng Payload đúng và đủ cho giai đoạn 1 của dự án này.
