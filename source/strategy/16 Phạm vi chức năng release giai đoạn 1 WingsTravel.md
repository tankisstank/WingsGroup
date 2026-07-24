# Phạm vi chức năng release giai đoạn 1 WingsTravel

## 1. Mục đích tài liệu

Tài liệu này dùng để chốt một bản mô tả chức năng gọn, rõ và bám sát đúng những gì hai bên đã trao đổi cho giai đoạn 1 của `WingsTravel`.

Tài liệu này không đi theo toàn bộ feature set rộng của `Payload`.

Tài liệu này chỉ tập trung vào 5 nhóm trọng tâm:

- multi-domain
- đa ngôn ngữ
- giao diện
- quản lý nội dung
- phân quyền

Mục tiêu là:

- đủ rõ để gửi khách hàng
- đủ rõ để dùng làm căn cứ nghiệm thu
- đủ rõ để bóc KPI và tiến độ triển khai

## 2. Phạm vi release giai đoạn 1

Giai đoạn 1 được hiểu là:

- dựng nền website đầu tiên cho `WingsTravel`
- phát triển đồng thời trang tổng và các site cùng hệ:
  - `WingsTravel`
  - `WingsGo`
  - `WingSide`
  - `WingsPlus`
  - `WingsCare`
  - `WingsPass`
- cho phép quản trị nội dung theo ngôn ngữ và theo từng site
- có landing page / page linh hoạt cho từng dịch vụ hoặc campaign
- có phân quyền để mỗi người chỉ quản lý đúng site hoặc nhóm site của mình

Giai đoạn 1 không nhằm release toàn bộ CRM, automation hay AI.

Về mặt hạ tầng, giai đoạn này cũng nên được hiểu theo hướng:

- local development có thể dùng môi trường gọn để build nhanh
- môi trường staging và production cần đi theo mô hình dữ liệu phù hợp cho nhiều site và nhiều người dùng

## 3. Vì sao chọn Payload cho đúng phạm vi này

Với phạm vi đã chốt, `Payload` phù hợp vì có đúng những lớp cần dùng:

- `Collections` để quản lý dữ liệu nội dung có cấu trúc
- `Globals` để quản lý các phần dùng chung theo từng site
- `Localization` để quản lý nội dung đa ngôn ngữ
- `Blocks` để làm page builder và landing page builder
- `Access Control` để phân quyền theo role và theo site
- `Auth` để quản lý tài khoản admin / editor / manager
- `Uploads` để quản lý media

Điểm quan trọng là:

- dùng đúng phần cần thiết của Payload
- không ôm các phần quá rộng không cần cho giai đoạn 1

## 4. Bản chức năng gọn theo đúng 5 nhóm đã chốt

### 4.1. Multi-domain / Multi-site

#### Mục tiêu

- Tạo nền để một hệ có thể phục vụ nhiều site / nhiều domain thuộc hệ sinh thái `WingsTravel`

#### Chức năng release

- Hệ thống có cấu trúc cho nhiều site trong cùng một nền quản trị
- Mỗi site có thể có:
  - tên riêng
  - domain riêng
  - bộ nội dung riêng
  - người quản lý riêng
- Có thể cấu hình phần dùng chung và phần riêng cho từng site
- Có thể mở thêm site mới trong cùng kiến trúc mà không phải làm lại từ đầu

#### Cách hiểu thực tế với khách hàng

- `WingsTravel`, `WingsGo`, `WingSide`, `WingsPlus`, `WingsCare`, `WingsPass` có thể đi trên cùng một nền CMS
- nhưng vẫn tách được nội dung, domain và quyền quản lý

#### Payload hỗ trợ phần này ở đâu

- `Collections`
- `Globals`
- `Access Control`

### 4.2. Đa ngôn ngữ

#### Mục tiêu

- Mỗi site có thể quản lý nội dung theo nhiều ngôn ngữ để phục vụ nhiều thị trường

#### Chức năng release

- Quản lý nội dung theo từng ngôn ngữ trong CMS
- Mỗi page / landing page / tour / dịch vụ có thể có nội dung riêng theo từng locale
- URL / route rõ theo từng ngôn ngữ
- Không lẫn nội dung sai ngôn ngữ giữa các thị trường
- Có thể mở thêm ngôn ngữ sau này mà không phải thay kiến trúc nội dung

#### Cách hiểu thực tế với khách hàng

- Cùng một dịch vụ nhưng có thể có bản tiếng Việt, tiếng Anh, tiếng Hàn, tiếng Trung
- Người quản trị sửa nội dung theo từng ngôn ngữ ngay trong CMS

#### Payload hỗ trợ phần này ở đâu

- `Localization`
- `Fields`
- `Blocks`

### 4.3. Giao diện website và landing page

#### Mục tiêu

- Có bộ mặt online đủ rõ để giới thiệu dịch vụ và mở rộng thành nhiều page theo từng site hoặc campaign

#### Chức năng release

- Website public v1 cho site đầu tiên
- Các trang nền:
  - trang chủ
  - giới thiệu
  - danh sách dịch vụ / tour
  - chi tiết dịch vụ / tour
  - liên hệ
- Landing page có cấu trúc linh hoạt theo section / block
- Có thể thay đổi:
  - hero
  - nội dung giới thiệu
  - USP
  - CTA
  - form
  - testimonial
  - FAQ
- Responsive tốt cho mobile và desktop

#### Cách hiểu thực tế với khách hàng

- Không chỉ có một website tĩnh
- mà có thể tạo page phù hợp cho từng dịch vụ, từng thị trường, từng site

#### Payload hỗ trợ phần này ở đâu

- `Blocks`
- `Collections`
- `Globals`

### 4.4. Quản lý nội dung và vận hành CMS

#### Mục tiêu

- Đội ngũ có thể tự vận hành nội dung mà không phụ thuộc vào sửa code

#### Chức năng release

- Tạo / sửa / ẩn / hiện trang nội dung
- Quản lý nội dung dịch vụ / tour
- Quản lý landing page
- Quản lý media cơ bản
- Preview nội dung trước khi publish
- Quản lý một số phần dùng chung như:
  - header
  - footer
  - thông tin liên hệ
  - thông điệp chung theo từng site
- Có cấu trúc nội dung rõ để tránh sửa tay trực tiếp trên giao diện

#### Cách hiểu thực tế với khách hàng

- Bên vận hành có thể chủ động cập nhật nội dung
- không phải mỗi lần đổi thông tin lại quay về chỉnh code

#### Payload hỗ trợ phần này ở đâu

- `Collections`
- `Globals`
- `Versions / Drafts`
- `Live Preview`
- `Uploads`

### 4.5. Phân quyền và quản lý người dùng

#### Mục tiêu

- Mỗi người quản trị chỉ thấy và quản lý đúng phần việc của mình

#### Chức năng release

- Có tài khoản đăng nhập CMS
- Có các nhóm quyền cơ bản:
  - `Super Admin`
  - `Site Manager`
  - `Editor`
- Có thể gán một người quản lý:
  - 1 site
  - hoặc nhiều site cùng lúc
- Editor chỉ thấy và sửa nội dung thuộc site được phân công
- Site Manager có thể quản lý nội dung và user trong phạm vi site phụ trách nếu được chốt
- Super Admin có quyền xem và quản lý toàn hệ

#### Cách hiểu thực tế với khách hàng

- Người quản lý `WingsCare` không nhất thiết nhìn thấy dữ liệu của `WingsGo`
- Một manager có thể cùng lúc quản trị `2-3` site nếu được cấp quyền

#### Payload hỗ trợ phần này ở đâu

- `Auth`
- `Access Control`

## 5. Các chức năng admin tối thiểu phải dùng được

Đây là phần bắt buộc để xem như release đạt mục tiêu.

Admin / editor cần làm được:

- đăng nhập vào CMS
- chọn đúng site mình phụ trách
- xem danh sách page / landing page / nội dung của site đó
- tạo / sửa / ẩn / hiện nội dung
- cập nhật nội dung theo từng ngôn ngữ
- upload / chọn media
- preview nội dung trước khi publish
- publish nội dung sau khi hoàn tất

## 6. Những gì không mặc định nằm trong release giai đoạn 1

Để tránh hiểu nhầm, các phần sau không mặc định nằm trong release này nếu chưa chốt riêng:

- CRM đầy đủ
- quy trình sale nhiều bước
- automation sâu
- chatbot AI
- RAG
- dashboard reporting nâng cao
- payment / booking / operator workflow
- hệ phân quyền quá phức tạp nhiều tầng
- số lượng lớn template riêng biệt cho từng site

## 6.1. Ghi chú hạ tầng dữ liệu

Để tránh hiểu nhầm giữa môi trường phát triển và môi trường vận hành thật:

- `SQLite` chỉ phù hợp cho local development hoặc demo kỹ thuật
- với mô hình nhiều site / nhiều domain, môi trường thật nên dùng:
  - `PostgreSQL` làm database chính
  - `Redis` làm lớp cache hỗ trợ hiệu năng khi cần

## 7. KPI nghiệm thu gắn trực tiếp với chức năng

### 7.1. KPI về multi-domain / multi-site

- Có cấu trúc CMS cho nhiều site trong cùng một hệ
- Tối thiểu site đầu tiên được cấu hình hoàn chỉnh để go-live
- Dữ liệu nội dung được tách đúng theo site, không lẫn giữa các site

### 7.2. KPI về đa ngôn ngữ

- Nội dung của các trang chính quản trị được theo ngôn ngữ đã chốt
- Frontend hiển thị đúng nội dung theo locale
- Không có lỗi hiển thị sai ngôn ngữ trên luồng chính

### 7.3. KPI về giao diện

- Website v1 deploy được và sử dụng ổn định
- Các trang chính hiển thị tốt trên mobile và desktop
- Tối thiểu `1` khung landing page dùng lại được cho site / dịch vụ / campaign

### 7.4. KPI về quản lý nội dung

- Đội vận hành có thể tự cập nhật nội dung cơ bản từ CMS
- Các phần header / footer / thông tin liên hệ / page chính cập nhật được mà không cần sửa code
- Preview và publish hoạt động ổn định trên luồng nội dung chính

### 7.5. KPI về phân quyền

- Tài khoản đăng nhập hoạt động ổn định
- User chỉ nhìn thấy đúng site hoặc nhóm site được phân quyền
- Super Admin nhìn được toàn hệ
- Không có lỗi lộ nội dung giữa các site trên luồng quản trị chính

## 8. Bộ KPI ngắn gọn để gửi khách hàng

Nếu cần một bản ngắn gọn, có thể chốt 6 KPI sau:

1. Nền CMS hỗ trợ nhiều site / nhiều domain trong cùng một hệ quản trị.
2. Site đầu tiên của `WingsTravel` được triển khai hoàn chỉnh và sẵn sàng go-live.
3. Nội dung của site được quản lý theo các ngôn ngữ đã chốt ngay trong CMS.
4. Đội ngũ có thể tự tạo, sửa và publish nội dung cơ bản mà không cần sửa code.
5. Tối thiểu một khung landing page có thể tái sử dụng cho dịch vụ / thị trường / campaign.
6. Phân quyền quản trị theo site hoạt động đúng: đúng người, đúng phạm vi, đúng nội dung.

## 9. Tiến độ triển khai đề xuất

### Tuần 1: Chốt cấu trúc và đầu vào

- chốt site đầu tiên release
- chốt các ngôn ngữ đi trước
- chốt danh sách page bắt buộc
- chốt cấu trúc nội dung
- chốt vai trò user và phân quyền cơ bản

### Tuần 2: Dựng nền CMS và giao diện

- dựng cấu trúc Payload
- dựng content model chính
- dựng website v1
- dựng phần dùng chung theo site

### Tuần 3: Dựng landing page, đa ngôn ngữ, quyền quản trị

- hoàn thiện landing page theo block
- hoàn thiện localization
- hoàn thiện role và access control
- test luồng quản trị nội dung

### Tuần 4: UAT, chỉnh sửa, bàn giao

- test nghiệm thu với phía khách hàng
- chỉnh các lỗi còn lại
- bàn giao tài khoản quản trị
- chốt KPI nghiệm thu

## 10. Kết luận

Bản release giai đoạn 1 nên được hiểu gọn như sau:

- một nền website + CMS của `WingsTravel`
- sẵn sàng cho nhiều site / nhiều domain
- quản lý đa ngôn ngữ
- có giao diện và landing page linh hoạt
- có phân quyền rõ cho người quản trị

Đó là phần vừa đủ để khách hàng nhìn thấy giá trị thực tế ngay, đồng thời vẫn mở đường rất tốt cho các giai đoạn sau.
