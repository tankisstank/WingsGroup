# Đề xuất Payload so với Wagtail cho giai đoạn 1-4

## 1. Mục đích tài liệu

Tài liệu này dùng để làm rõ 4 việc:

- chi tiết các tính năng phù hợp nếu dùng `Payload` cho giai đoạn 1
- lý do chọn `Payload` cho định hướng đã chốt
- mức độ phù hợp của `Payload` khi đi tiếp sang giai đoạn 2, 3, 4
- so sánh thêm với `Wagtail` để tránh chọn theo cảm tính

Tài liệu này không nhằm chứng minh rằng `Payload` tốt hơn `Wagtail` trong mọi trường hợp.

Mục tiêu là chọn công cụ phù hợp nhất với bài toán hiện tại của mảng inbound.

## 2. Nguồn tham chiếu chính

Tài liệu này được tổng hợp từ:

- Repo chính thức của Payload: https://github.com/payloadcms/payload
- Docs chính thức của Payload: https://payloadcms.com/docs
- Repo chính thức của Wagtail: https://github.com/wagtail/wagtail
- Docs chính thức của Wagtail: https://docs.wagtail.org

Ghi chú thời điểm kiểm tra:

- Repo `payloadcms/payload` hiển thị release mới nhất `v3.84.1` ngày `23/04/2026`
- Repo `wagtail/wagtail` hiển thị release mới nhất `7.4.1` ngày `19/05/2026`

## 3. Những gì Payload cung cấp phù hợp trực tiếp với bài toán

Từ repo và docs chính thức, các năng lực cốt lõi của `Payload` phù hợp nhất với bài toán này là:

- `Collections` để quản lý dữ liệu có cấu trúc
- `Globals` để quản lý singleton content như header, footer, thông tin thương hiệu, setting site
- `Localization` ở mức field-level cho đa ngôn ngữ
- `Blocks` để xây page builder hoặc landing page builder
- `Versions` và `Drafts` để chỉnh nội dung, preview, publish an toàn hơn
- `Live Preview` để editor nhìn thấy nội dung ngay trên frontend
- `Uploads` để quản lý media
- `Access Control` rất chi tiết theo role, document, field
- `Hooks` để gắn logic backend khi tạo/sửa/xuất bản dữ liệu
- `Auth` sẵn có để quản trị admin và user nội bộ
- chạy theo hướng `Next.js native`, có thể nằm cùng frontend trong một stack

Về mặt định hướng sản phẩm, đây là tập năng lực rất khớp với mục tiêu:

- website đa ngôn ngữ
- CMS nền
- campaign landing page
- form nhận lead cơ bản
- nền dữ liệu để mở dần sang lead management và backend nhẹ

### Ghi chú về lớp dữ liệu

Với bài toán đang mô tả, lớp dữ liệu production phù hợp hơn là:

- `PostgreSQL` cho dữ liệu chính
- `Redis` cho cache và KV layer khi cần scale

`SQLite` chỉ nên xem là lựa chọn cho local development hoặc bootstrap nhanh.

## 4. Bản detail tính năng nếu dùng Payload cho giai đoạn 1

### 4.1. Mục tiêu của giai đoạn 1

Nếu đi theo `Payload`, giai đoạn 1 nên được hiểu là:

- dựng một `website + CMS + landing page builder` trong cùng một hệ
- có khả năng quản trị nội dung nhiều ngôn ngữ
- có khả năng tạo page phục vụ campaign nhanh hơn
- có form nhận lead và lưu điểm chạm đầu tiên của lead

Không nên hiểu giai đoạn 1 là:

- làm một website tĩnh
- gắn CMS chỉ để sửa vài đoạn text

### 4.2. Nhóm tính năng public website

Các tính năng phù hợp:

- Trang chủ
- Trang giới thiệu
- Trang danh sách nhóm tour / dịch vụ
- Trang chi tiết tour / dịch vụ
- Trang liên hệ
- CTA điều hướng sang form tư vấn
- Header / footer / menu điều hướng quản trị từ `Globals`
- SEO metadata cơ bản cho từng page

Payload phù hợp ở đây vì:

- `Collections` phù hợp để lưu page, tour, service, article
- `Globals` phù hợp để lưu các phần dùng chung toàn site
- `Versions`, `Drafts`, `Live Preview` phù hợp cho quy trình biên tập và kiểm tra trước publish

### 4.3. Nhóm tính năng đa ngôn ngữ

Các tính năng phù hợp:

- Quản lý nội dung theo từng locale
- Route hoặc slug theo từng ngôn ngữ
- Quản lý field nội dung dịch theo từng locale
- Có thể mở thêm ngôn ngữ mà không phải thay kiến trúc dữ liệu

Payload phù hợp ở đây vì:

- `Localization` của Payload hoạt động ở mức field-level
- cả field thường, `array`, `blocks` đều hỗ trợ `localized`
- điều này rất hợp với use case:
  - cùng một cấu trúc page
  - nhưng nội dung khác nhau theo Hàn, Trung, Anh hoặc các thị trường khác

### 4.4. Nhóm tính năng CMS nền

Các tính năng phù hợp:

- Quản trị page
- Quản trị tour / dịch vụ
- Quản trị FAQ
- Quản trị bài viết nếu nằm trong scope
- Quản trị media cơ bản
- Preview nội dung trước khi publish
- Draft / publish / version history
- Tài khoản admin và role cơ bản

Payload phù hợp ở đây vì:

- schema được định nghĩa rõ bằng `fields`
- admin panel được sinh tự động từ schema
- có `Access Control` chi tiết
- có `Customizable React admin` nếu sau này cần tối ưu UX cho editor

### 4.5. Nhóm tính năng campaign landing page

Đây là phần Payload hợp nhất với bài toán.

Các tính năng phù hợp:

- Tạo collection `landing-pages`
- Mỗi page gồm các `Blocks` như:
  - hero
  - introduction
  - USP
  - service highlight
  - itinerary teaser
  - testimonial
  - gallery
  - CTA
  - lead form block
  - FAQ
- Nhân bản page cho từng thị trường hoặc sản phẩm
- Tạo slug riêng cho từng campaign
- Điều chỉnh thứ tự section ngay trong admin

Payload phù hợp ở đây vì:

- `Blocks Field` được thiết kế đúng cho page builder
- block có schema rõ, không bị thả tự do như rich text thuần
- editor có thể trộn nhiều block theo đúng thứ tự
- block có thể tái sử dụng ở nhiều nơi
- có thể áp dụng `localized` trực tiếp cho blocks

Trong bài toán inbound, đây là lợi thế lớn vì:

- mỗi thị trường có thể cần thông điệp riêng
- mỗi nhóm tour có thể cần landing page riêng
- nhưng team vẫn muốn giữ một khung nhất quán để dễ vận hành

### 4.6. Nhóm tính năng lead capture cơ bản

Trong giai đoạn 1, nên dùng Payload ở mức `light backend` cho lead.

Các tính năng phù hợp:

- Form nhận lead
- Validate field cơ bản
- Lưu lead vào một collection như `leads`
- Lưu thêm:
  - source
  - campaign
  - landing page
  - locale / thị trường
  - nhu cầu / tour quan tâm
- Đẩy dữ liệu về email, sheet hoặc endpoint khác nếu cần qua hook

Payload phù hợp ở đây vì:

- `Collections` phù hợp để lưu `leads`, `campaigns`, `sources`
- `Hooks` phù hợp để:
  - chuẩn hóa dữ liệu
  - gửi notification
  - đồng bộ qua dịch vụ khác
- `Access Control` cho phép tách quyền xem lead theo role nội bộ

Điểm quan trọng:

- Giai đoạn 1 chỉ nên dừng ở `lead capture + lead storage cơ bản`
- chưa nên biến Payload thành CRM đầy đủ ở ngay phase đầu

### 4.7. Nhóm tính năng vận hành editor

Các tính năng phù hợp:

- login admin
- role cơ bản
- ai được sửa page nào
- ai được publish
- ai chỉ được xem draft hoặc nội dung live
- lịch sử thay đổi nội dung

Payload phù hợp ở đây vì:

- `Auth` có sẵn
- `Access Control` chi tiết theo operation
- `Versions` và `Drafts` hỗ trợ audit và rollback tốt hơn

### 4.8. Nhóm tính năng media

Các tính năng phù hợp:

- upload hình
- dùng lại hình ở nhiều page
- preview file trong admin
- quản lý asset dùng cho landing page và tour

Payload phù hợp ở đây vì:

- có `Uploads`
- phù hợp cho ảnh tour, banner, visual campaign

## 5. Lý do chọn Payload cho giai đoạn 1

### 5.1. Khớp với mô hình `website + CMS + page builder`

Đây là lý do mạnh nhất.

Bài toán hiện tại không chỉ là:

- có website

Mà là:

- có website đa ngôn ngữ
- có CMS
- có khả năng tạo landing page theo campaign nhanh

Payload có `Blocks` và `Localization` rất khớp với mô hình này.

### 5.2. Hợp với hướng `headless nhưng không bị tách rời quá sớm`

Theo repo chính thức, Payload đi theo hướng `Next.js native`, có thể nằm trong cùng `/app` folder với frontend.

Điều này hợp với giai đoạn 1 vì:

- tránh phải ghép nối quá nhiều hệ từ đầu
- giảm overhead triển khai
- dễ đi nhanh ra thị trường
- dễ giữ chung kiểu dữ liệu giữa backend và frontend

Nếu triển khai production, vẫn nên hiểu đây là một stack gọn ở tầng ứng dụng, nhưng lớp dữ liệu phía dưới cần đủ chuẩn cho multisite:

- `PostgreSQL` là lựa chọn phù hợp
- `Redis` là lớp tối ưu bổ sung, không phải database chính

### 5.3. Mạnh ở chỗ tạo khung landing page có kiểm soát

Inbound rất dễ phát sinh nhu cầu:

- page cho Hàn
- page cho Trung
- page cho golf
- page cho local experience

Nếu không có block-based builder rõ ràng, team sẽ nhanh chóng quay lại vòng:

- sửa tay
- duplicate template lung tung
- khó kiểm soát consistency

Payload mạnh ở đúng điểm này.

### 5.4. Có thể dùng làm lớp dữ liệu đầu tiên

Ngoài content, Payload còn phù hợp để giữ:

- lead
- campaign
- source
- market
- FAQ
- policy

Tức là phase đầu có thể vừa làm CMS, vừa làm data layer nhẹ.

### 5.5. Phù hợp với vai trò đối tác công nghệ

Nếu định hướng của dự án là:

- không chỉ làm web
- mà dựng nền để sau này mở dần sang data, automation, AI

thì Payload phù hợp hơn một CMS chỉ thiên về editorial website đơn thuần.

## 6. Payload phù hợp thế nào với giai đoạn 2, 3, 4

### 6.1. Giai đoạn 2: Mở rộng website và nội dung bên ngoài

Giai đoạn 2 vẫn là vùng rất hợp với Payload.

Payload phù hợp để mở tiếp:

- thêm loại page
- thêm content model cho tour / market / service
- thêm article / guide / FAQ
- thêm block mới cho landing page
- thêm locale
- thêm preview workflow

Ở giai đoạn này, Payload vẫn có thể là lõi trung tâm rất tốt.

### 6.2. Giai đoạn 3: Lead management và lớp dữ liệu vận hành đầu tiên

Giai đoạn 3 là vùng `có thể phù hợp`, nhưng cần kỷ luật kiến trúc.

Payload phù hợp nếu phạm vi vẫn là:

- lưu lead
- lưu campaign source
- trạng thái lead cơ bản
- log tiếp nhận ban đầu
- admin view cơ bản cho nội bộ

Payload không còn là nơi lý tưởng nếu bắt đầu phát sinh mạnh:

- quy trình sale nhiều bước
- booking flow phức tạp
- payment reconciliation
- partner handoff
- phân vai điều hành sâu
- nhiều dashboard vận hành riêng

Kết luận cho giai đoạn 3:

- `Payload` phù hợp làm `light backend` hoặc `first operational layer`
- nhưng không nên mặc định ôm toàn bộ CRM / vận hành nội bộ phức tạp

### 6.3. Giai đoạn 4: Automation, AI, knowledge layer

Payload phù hợp rất tốt ở vai trò:

- `content source`
- `knowledge source`
- `structured data source`

Payload phù hợp để làm đầu vào cho:

- RAG về tour, FAQ, policy, service
- AI hỗ trợ sale
- AI hỗ trợ trả lời nội dung nền
- automation đồng bộ dữ liệu qua n8n hoặc service khác

Payload kém phù hợp hơn nếu cố dùng nó làm:

- orchestration engine chính
- workflow engine sâu
- hệ xử lý automation phức tạp thay cho tool chuyên biệt

Kết luận cho giai đoạn 4:

- rất hợp để làm `nguồn dữ liệu có cấu trúc cho AI`
- không nên dùng làm nơi ôm toàn bộ orchestration

## 7. So sánh với Wagtail theo bài toán này

## 7.1. Những gì Wagtail mạnh

Từ repo và docs chính thức, Wagtail mạnh ở các điểm:

- CMS trưởng thành trên nền `Django`
- rất mạnh về trải nghiệm biên tập nội dung
- `StreamField` là mô hình nội dung linh hoạt và có cấu trúc
- hỗ trợ `multi-site` và `multi-language`
- có `Content API` cho headless
- có workflow, revision, preview cho page và có thể mở rộng cho snippet
- rất phù hợp cho các tổ chức editorial lớn

Wagtail là lựa chọn mạnh nếu bài toán là:

- website nội dung lớn
- tổ chức editorial nhiều người
- luồng xuất bản, moderation, governance rõ
- doanh nghiệp đã mạnh về `Python/Django`

## 7.2. Điểm Wagtail hợp với dự án inbound

Wagtail vẫn có nhiều điểm hợp:

- website đa ngôn ngữ
- CMS mạnh cho editor
- `StreamField` cũng giải được bài toán page builder
- revisions, workflows, preview khá tốt
- suitable cho site content-heavy

Tức là nếu đi hướng:

- làm một hệ web / content platform nghiêng editorial
- tổ chức đã quen Django

thì Wagtail hoàn toàn là ứng viên nghiêm túc.

## 7.3. Điểm Payload hợp hơn Wagtail cho giai đoạn 1 của deal này

Trong bối cảnh cụ thể của deal hiện tại, `Payload` hợp hơn ở các điểm:

### a. Khớp hơn với stack web hiện đại kiểu `Next.js + headless CMS`

Payload được định vị rõ là `Next.js native`.

Điều này giảm đáng kể chi phí ghép nối nếu mục tiêu là:

- ra nhanh website
- có CMS
- có landing page builder
- có frontend hiện đại trong cùng stack

Wagtail làm được headless, nhưng bản thân docs của Wagtail ghi rõ với headless:

- preview draft cần workaround hoặc package ngoài
- không có official API để headless frontend submit Wagtail form

Điều này không làm Wagtail yếu toàn diện, nhưng khiến nó bớt tự nhiên hơn nếu chọn kiến trúc headless-first ngay từ đầu.

### b. Hợp hơn nếu muốn dùng CMS như một lớp backend nhẹ từ sớm

Payload từ đầu đã nhấn mạnh:

- collections
- auth
- access control
- hooks
- extensible admin

Nó tự nhiên hơn cho mô hình:

- content + lead + campaign + source trong một stack

Wagtail làm được nhiều phần tương tự, nhưng tư duy trung tâm của nó vẫn nghiêng mạnh về editorial CMS trên nền Django.

### c. Phù hợp hơn với logic `campaign landing page` lặp nhanh

`Blocks` + `Localization` + frontend cùng stack làm cho Payload rất hợp với:

- nhân bản page
- đổi section
- đổi copy theo thị trường
- preview nhanh
- publish nhanh

Wagtail cũng làm được kiểu này qua `StreamField`, nhưng với case hiện tại, tôi đánh giá Payload tự nhiên hơn nếu ưu tiên:

- tốc độ ra page
- ít lớp kỹ thuật
- một đội nhỏ cần triển khai nhanh

## 7.4. Điểm Wagtail có thể hơn Payload

Wagtail có thể hợp hơn Payload nếu về sau dự án chuyển mạnh sang:

- tổ chức editorial lớn
- governance phức tạp
- site tree lớn
- đội kỹ thuật thiên `Python/Django`
- cần bám sâu vào hệ sinh thái Django có sẵn

Nói ngắn gọn:

- `Wagtail` mạnh như một editorial CMS rất trưởng thành
- `Payload` hợp hơn như một CMS fullstack hiện đại cho website + landing page + backend nhẹ

## 8. Kết luận đề xuất

Với trạng thái hiện tại của deal inbound, nếu chốt theo:

- website đa ngôn ngữ
- CMS nền
- campaign landing page
- form nhận lead cơ bản
- có thể mở dần sang lead, data, AI

thì `Payload` là lựa chọn rất hợp lý cho `giai đoạn 1`.

### Đánh giá theo từng giai đoạn

- `Giai đoạn 1`: rất hợp với Payload
- `Giai đoạn 2`: vẫn rất hợp với Payload
- `Giai đoạn 3`: hợp nếu giữ ở mức lead layer và vận hành nhẹ; cần kỷ luật để không biến thành CRM quá sớm
- `Giai đoạn 4`: hợp ở vai trò content / knowledge source cho AI và automation, không nên ôm orchestration sâu

### Đánh giá về hạ tầng dữ liệu

- `Local`: có thể dùng `SQLite` để phát triển nhanh
- `Staging / Production`: nên dùng `PostgreSQL`
- `Production khi mở rộng`: nên bổ sung `Redis` cho cache và lớp dữ liệu ngắn hạn

### Kết luận chọn công nghệ

Nếu mục tiêu là:

- đi nhanh
- một stack gọn
- mạnh ở website + CMS + landing page
- có khả năng mở dần sang data layer và AI

thì nên ưu tiên `Payload`.

Nếu mục tiêu nghiêng nhiều hơn về:

- editorial platform lớn
- governance phức tạp
- đội Django mạnh

thì `Wagtail` là lựa chọn đáng cân nhắc hơn.

Ở bài toán inbound hiện tại, lựa chọn thực dụng hơn cho giai đoạn đầu vẫn là:

- `Payload-first`

## 9. Link tham chiếu

- Payload repo: https://github.com/payloadcms/payload
- Payload README và feature list: https://github.com/payloadcms/payload
- Payload Collections: https://payloadcms.com/docs/configuration/collections
- Payload Globals: https://payloadcms.com/docs/configuration/globals
- Payload Localization: https://payloadcms.com/docs/configuration/localization
- Payload Blocks: https://payloadcms.com/docs/fields/blocks
- Payload Versions / Drafts: https://payloadcms.com/docs/versions/overview
- Payload Live Preview: https://payloadcms.com/docs/live-preview
- Payload Access Control: https://payloadcms.com/docs/access-control/overview
- Payload Uploads: https://payloadcms.com/docs/upload/overview
- Payload Jobs: https://payloadcms.com/docs/jobs-queue/jobs
- Wagtail repo: https://github.com/wagtail/wagtail
- Wagtail README: https://github.com/wagtail/wagtail
- Wagtail Snippets: https://docs.wagtail.org/en/stable/topics/snippets/
- Wagtail optional snippet features: https://docs.wagtail.org/en/stable/topics/snippets/features.html
- Wagtail StreamField reference: https://docs.wagtail.org/en/stable/reference/streamfield/
- Wagtail headless support: https://docs.wagtail.org/en/stable/advanced_topics/headless.html
- Wagtail API: https://docs.wagtail.org/en/stable/advanced_topics/api/
