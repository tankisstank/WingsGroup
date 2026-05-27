# Roadmap Payload cho WingsTravel

## 1. Mục đích tài liệu

Tài liệu này dùng để mô tả roadmap triển khai mảng inbound theo hướng công nghệ lấy `Payload` làm hạt nhân cho giai đoạn đầu và các giai đoạn mở rộng tiếp theo.

Mục tiêu của roadmap này là:

- Thống nhất cách nhìn nếu chọn `Payload` thay vì `Strapi`
- Xác định rõ vai trò của `Payload` trong từng giai đoạn
- Tính đến khả năng mở rộng sang lead management, vận hành nội bộ, dữ liệu và AI
- Tránh việc chỉ nhìn `Payload` như một CMS đơn thuần

Lưu ý:

- Đây là roadmap định hướng theo kiến trúc
- Chưa phải proposal triển khai chi tiết
- Chưa phải báo giá cho các giai đoạn sau
- Các phase sau vẫn cần làm rõ `scope of work` rồi mới bóc estimate cụ thể

## 2. Vì sao chọn hướng Payload

Trong bài toán inbound hiện tại, phase đầu không chỉ là:

- có website
- có CMS
- có landing page

Mà còn là:

- tạo được nhiều page theo từng thị trường / nhóm sản phẩm
- để người dùng phổ thông có thể vận hành nội dung dễ hơn
- tạo nền để sau này mở sang lead, vận hành và một phần backend nội bộ

Với hướng này, `Payload` phù hợp vì:

- Có thể đi theo mô hình `website + CMS + page builder` trong cùng một stack
- Tự nhiên hơn cho use case `campaign landing page`
- Thuận lợi nếu muốn đi tiếp sang các lớp dữ liệu và backend nhẹ trong cùng hệ
- Phù hợp với vai trò đối tác công nghệ đồng hành từ đầu, thay vì ghép nhiều hệ quá sớm

### Ghi chú hạ tầng cho hướng này

Nếu đi theo `Payload-first`, nên tách rõ:

- `local development`: có thể dùng `SQLite`
- `staging / production`: nên dùng `PostgreSQL`
- khi hệ bắt đầu có nhiều site, nhiều nội dung và nhiều người dùng cùng thao tác, nên bổ sung `Redis` cho cache và KV layer

## 3. Vai trò của Payload trong toàn roadmap

Nếu chọn `Payload`, nên hiểu vai trò của nó theo 3 lớp:

### Lớp 1: CMS và quản trị nội dung

- Quản lý nội dung website
- Quản lý nội dung theo ngôn ngữ
- Quản lý thông tin tour / dịch vụ / bài viết / FAQ

### Lớp 2: Page builder và campaign landing page

- Tạo các page theo block
- Tạo landing page cho từng thị trường / từng campaign
- Tái sử dụng các section để nhân bản page nhanh hơn

### Lớp 3: Nền backend mở rộng giai đoạn đầu

- Có thể lưu lead ở mức cơ bản
- Có thể quản lý một số collection nội bộ giai đoạn đầu
- Có thể mở sang các bảng dữ liệu như lead, campaign, source, form submission

Điều quan trọng:

- `Payload` có thể đi xa hơn CMS
- Nhưng không nên từ đầu nhét toàn bộ CRM, vận hành nội bộ và AI orchestration vào chung một chỗ nếu bài toán chưa rõ

## 4. Bức tranh roadmap tổng thể theo hướng Payload

Có thể hình dung roadmap theo 5 giai đoạn:

1. Làm rõ định hướng và chuẩn hóa đầu vào
2. Xây website đa ngôn ngữ + CMS nền + campaign landing page trên Payload
3. Mở rộng lead management và lớp dữ liệu vận hành đầu tiên
4. Tách và chuẩn hóa lớp vận hành nội bộ khi bài toán đã đủ rõ
5. Đưa automation, RAG và AI vào đúng các điểm có hiệu quả thực tế

## 5. Roadmap chi tiết

### Giai đoạn 1: Làm rõ định hướng và chuẩn hóa đầu vào

#### Mục tiêu

- Làm rõ nhóm khách ưu tiên
- Làm rõ sản phẩm / tour ưu tiên
- Làm rõ cách nhận lead ban đầu
- Làm rõ tài nguyên hiện có để đưa vào hệ thống

#### Nội dung chính

- Chốt thị trường ưu tiên trước
- Chốt nhóm sản phẩm / tour ưu tiên trước
- Rà soát các tài sản hiện có:
  - tên thương hiệu
  - domain
  - nội dung
  - hình ảnh
  - đội ngũ phối hợp
  - cách nhận lead hiện tại
- Xác định khung content model ban đầu

#### Payload làm gì ở giai đoạn này

- Chưa triển khai mạnh về code
- Chủ yếu dùng tư duy content model để chuẩn bị:
  - tour
  - market
  - landing page
  - article
  - FAQ

#### Đầu ra kỳ vọng

- Cấu trúc đầu vào đủ rõ để triển khai Payload đúng ngay từ đầu
- Có danh sách loại nội dung và page cần xây
- Có cơ sở để bước sang phase build

### Giai đoạn 2: Website đa ngôn ngữ + CMS nền + campaign landing page

#### Mục tiêu

- Có một website v1 đủ tốt để ra thị trường
- Có CMS nền để đội ngũ chủ động cập nhật nội dung
- Có khả năng tạo landing page campaign nhanh cho từng tệp khách

#### Nội dung chính

- Xây dựng website trên `Next.js + Payload`
- Chuẩn bị hạ tầng dữ liệu theo hướng `PostgreSQL` cho môi trường thật
- Thiết lập localization
- Xây các collection nội dung cơ bản
- Xây các block section cho website và campaign page
- Thiết lập form nhận lead cơ bản
- Chuẩn bị preview / publish workflow

#### Payload làm gì ở giai đoạn này

- Giữ vai trò là `core CMS`
- Giữ logic `page builder theo block`
- Giữ dữ liệu nội dung của:
  - website
  - trang tour / dịch vụ
  - bài viết
  - FAQ
  - landing page campaign
- Có thể lưu form submission / lead cơ bản ở mức đầu tiên

#### Đầu ra kỳ vọng

- Website đa ngôn ngữ v1
- CMS nền
- Tối thiểu 1 khung campaign landing page có thể tái sử dụng
- Có nền để marketing tự tạo page trong khung cho phép

### Giai đoạn 3: Mở rộng lead management và lớp dữ liệu đầu tiên

#### Mục tiêu

- Không để lead chỉ đi vào email / inbox rồi thất lạc
- Bắt đầu dùng `Payload` như một lớp dữ liệu đầu tiên cho lead và campaign

#### Nội dung chính

- Tạo collection lead
- Tạo collection campaign / source / channel
- Gắn form submission vào đúng nguồn
- Theo dõi trạng thái lead ở mức cơ bản
- Ghi nhận các thông tin cần để sale / CS tiếp nhận

#### Payload làm gì ở giai đoạn này

- Có thể tiếp tục đóng vai trò `light backend`
- Lưu:
  - lead
  - campaign source
  - page source
  - form data
- Tạo admin view để đội ngũ xem lead theo mức cơ bản

#### Lưu ý kiến trúc

Giai đoạn này phù hợp nếu bài toán còn ở mức:

- lead đổ vào chưa quá lớn
- quy trình vận hành chưa quá phức tạp
- chưa cần CRM riêng

Nếu bài toán vận hành bắt đầu nhiều bước, đây sẽ là điểm phải đánh giá lại:

- tiếp tục để trong Payload
- hay tách riêng lớp vận hành

#### Đầu ra kỳ vọng

- Có dữ liệu lead tập trung hơn
- Có thể đo hiệu quả page / campaign tốt hơn
- Có cơ sở để quyết định logic CRM / vận hành về sau

### Giai đoạn 4: Chuẩn hóa vận hành nội bộ và tách lớp khi cần

#### Mục tiêu

- Khi bài toán vận hành đã rõ hơn, không để toàn bộ logic bị nhồi tiếp vào CMS
- Giữ `Payload` đúng vai trò mạnh nhất của nó, đồng thời mở ra lớp vận hành phù hợp hơn

#### Nội dung chính

- Đánh giá lại quy trình thực tế:
  - ai xử lý lead
  - cần trạng thái gì
  - có booking / payment / partner / operator handoff hay không
- Nếu cần:
  - giữ `Payload` cho content và dữ liệu nền
  - tách `ops app` hoặc `CRM mini` riêng

#### Payload làm gì ở giai đoạn này

- Tiếp tục là `source of truth` cho content và page
- Có thể giữ các dữ liệu nền:
  - service catalog
  - market content
  - FAQ
  - policy
- Không nên ôm hết business workflow phức tạp nếu bài toán đã lớn

#### Đầu ra kỳ vọng

- Kiến trúc rõ hơn giữa:
  - public content layer
  - lead layer
  - vận hành layer
- Tránh việc hệ thống phase đầu bị phình thiếu kiểm soát

### Giai đoạn 5: Automation, RAG và AI

#### Mục tiêu

- Dùng dữ liệu đã có để tạo hiệu quả thật
- Đưa automation và AI vào đúng chỗ, không làm vì phong trào

#### Nội dung chính

- Đồng bộ dữ liệu từ Payload sang hệ automation
- Dùng nội dung từ Payload làm nguồn cho RAG:
  - tour info
  - service info
  - FAQ
  - policy
- Kết nối n8n / worker / AI service để:
  - nhắc việc
  - tổng hợp lead
  - hỗ trợ trả lời
  - hỗ trợ tạo nội dung

#### Payload làm gì ở giai đoạn này

- Là `content source`
- Là một phần dữ liệu đầu vào cho RAG
- Là nơi quản trị tri thức có cấu trúc mà AI có thể khai thác

#### Đầu ra kỳ vọng

- Dữ liệu nội dung được tái sử dụng tốt hơn
- AI không chỉ lấy dữ liệu rời rạc mà có nguồn chuẩn hơn
- Có thể mở sang chatbot, trợ lý sale hoặc workflow automation thực tế

## 6. Kiến trúc tư duy nếu đi theo Payload

Nếu đi theo hướng này, nên hình dung hệ thống như sau:

### Giai đoạn đầu

- `Next.js + Payload` là lõi
- Payload giữ:
  - CMS
  - page builder
  - content collections
  - lead cơ bản

### Giai đoạn giữa

- Payload vẫn là lõi content
- Thêm:
  - campaign tracking
  - lead data
  - reporting cơ bản
  - cache layer bằng `Redis` nếu cần tối ưu hiệu năng

### Giai đoạn sau

- Payload giữ content và knowledge layer
- Tách dần:
  - ops backend
  - CRM logic
  - automation service
  - RAG / AI service

Thông điệp quan trọng:

> Nếu chọn Payload, mình không chỉ đang chọn một CMS. Mình đang chọn một điểm khởi đầu rất mạnh cho cả website, landing page và lớp dữ liệu đầu tiên. Nhưng cũng cần có kỷ luật để biết khi nào nên giữ trong Payload, và khi nào nên tách riêng để hệ thống lớn lên đúng cách.

## 7. Ưu điểm của roadmap theo Payload

- Phase 2 rất mạnh và tự nhiên
- Hợp với bài toán campaign landing page
- Người dùng phổ thông có thể tạo page dễ hơn nếu block được dựng tốt
- Giảm ghép nối hệ thống ở giai đoạn đầu
- Hợp với mô hình đối tác công nghệ đồng hành sâu

## 8. Rủi ro cần lưu ý

- Nếu không kiểm soát tốt, dễ có xu hướng nhét quá nhiều logic vào Payload
- Khi bài toán vận hành lớn lên, phải chủ động đánh giá điểm tách hệ
- Ít phổ biến hơn Strapi, nên việc bàn giao sau này cần tài liệu và kiến trúc rõ

## 9. Kết luận

Nếu định hướng là:

- đi nhanh ở phase 1
- có campaign landing page tốt
- muốn CMS và website gắn chặt với nhau
- muốn mở dần sang lead, data và AI một cách có kiểm soát

thì roadmap theo `Payload-first` là hợp lý.

Nếu đi hướng này, phase 1 không nên chỉ được hiểu là “làm web”, mà nên được hiểu là:

- dựng nền website
- dựng nền CMS
- dựng nền campaign page
- dựng lớp nội dung và dữ liệu đầu tiên cho tăng trưởng
