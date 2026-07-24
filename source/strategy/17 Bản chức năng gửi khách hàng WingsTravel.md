# Bản chức năng gửi khách hàng WingsTravel

## 1. Mục tiêu giai đoạn 1

Giai đoạn 1 của `WingsTravel` được xây theo hướng tạo ra một nền website và CMS đủ tốt để:

- triển khai site đầu tiên một cách bài bản
- sẵn sàng mở rộng sang nhiều site / nhiều domain trong cùng hệ sinh thái
- quản lý nội dung theo nhiều ngôn ngữ
- cho phép đội ngũ tự vận hành nội dung
- tạo nền để mở rộng tiếp theo từng giai đoạn

Ở giai đoạn này, trọng tâm là:

- multi-domain
- đa ngôn ngữ
- giao diện website / landing page
- quản lý nội dung
- phân quyền quản trị

## 2. Phạm vi chức năng chính

### 2.1. Quản lý nhiều site / nhiều domain

Hệ thống sẽ được xây theo hướng một nền quản trị chung cho nhiều site trong hệ sinh thái `WingsTravel`.

Điều này có nghĩa là:

- mỗi site có thể có domain riêng
- mỗi site có thể có nội dung riêng
- mỗi site có thể có người quản lý riêng
- một người cũng có thể được phân quyền để quản lý nhiều site cùng lúc

Giai đoạn 1 chốt phát triển theo cấu trúc:

- `WingsTravel`
- `WingsGo`
- `WingSide`
- `WingsPlus`
- `WingsCare`
- `WingsPass`

## 2.2. Quản lý đa ngôn ngữ

Nội dung của website sẽ được quản lý theo các ngôn ngữ đã chốt cho giai đoạn đầu.

Hệ thống sẽ cho phép:

- quản lý nội dung theo từng ngôn ngữ trong CMS
- hiển thị đúng nội dung theo từng ngôn ngữ trên website
- mở thêm ngôn ngữ sau này mà không phải làm lại kiến trúc từ đầu

## 2.3. Giao diện website và landing page

Giai đoạn 1 sẽ triển khai nền giao diện cho site đầu tiên của `WingsTravel`, bao gồm:

- trang chủ
- trang giới thiệu
- trang dịch vụ / tour
- trang chi tiết dịch vụ / tour
- trang liên hệ
- landing page phục vụ dịch vụ / thị trường / campaign

Landing page sẽ được xây theo hướng linh hoạt để có thể tái sử dụng và điều chỉnh nội dung theo từng mục tiêu truyền thông hoặc bán hàng.

## 2.4. Quản lý nội dung bằng CMS

Đội ngũ phía khách hàng sẽ có thể chủ động quản lý nội dung trong hệ thống mà không cần phụ thuộc vào sửa code cho các thay đổi thông thường.

CMS sẽ hỗ trợ các nhu cầu chính như:

- tạo và cập nhật trang nội dung
- quản lý nội dung dịch vụ / tour
- quản lý landing page
- quản lý hình ảnh / media cơ bản
- cập nhật các phần dùng chung như header, footer, thông tin liên hệ
- xem trước nội dung trước khi publish

## 2.5. Phân quyền quản trị

Hệ thống sẽ có phân quyền cơ bản để phù hợp với mô hình nhiều site.

Các nhóm quyền chính dự kiến gồm:

- quản trị toàn hệ
- quản lý theo site
- người biên tập nội dung

Mục tiêu của phần này là:

- đúng người quản lý đúng site
- hạn chế nhầm lẫn giữa các site
- hỗ trợ mô hình một người quản lý một site hoặc nhiều site cùng lúc

## 3. Kết quả đầu ra của giai đoạn 1

Sau khi hoàn thành giai đoạn 1, hệ thống cần đạt được các đầu ra chính sau:

- có site đầu tiên của `WingsTravel` sẵn sàng để đưa vào sử dụng
- có nền quản trị nội dung bằng CMS
- có cấu trúc sẵn sàng cho nhiều site / nhiều domain
- có khả năng quản lý nội dung đa ngôn ngữ
- có landing page linh hoạt để phục vụ dịch vụ / thị trường / campaign
- có phân quyền quản trị theo đúng phạm vi từng người

## 4. KPI nghiệm thu đề xuất

Để việc triển khai và nghiệm thu rõ ràng, có thể chốt các KPI chính như sau:

1. Nền CMS hỗ trợ mô hình nhiều site / nhiều domain trong cùng một hệ quản trị.
2. Site đầu tiên của `WingsTravel` được triển khai hoàn chỉnh và sẵn sàng go-live.
3. Nội dung của site được quản lý theo các ngôn ngữ đã chốt ngay trong CMS.
4. Đội ngũ có thể tự tạo, sửa và publish nội dung cơ bản mà không cần sửa code.
5. Tối thiểu một khung landing page có thể tái sử dụng cho dịch vụ / thị trường / campaign.
6. Phân quyền quản trị theo site hoạt động đúng phạm vi người dùng.

## 5. Tiến độ triển khai đề xuất

### Tuần 1: Chốt cấu trúc và đầu vào

- chốt site đầu tiên triển khai
- chốt ngôn ngữ đi trước
- chốt cấu trúc page chính
- chốt nhóm người dùng quản trị

### Tuần 2: Dựng nền CMS và giao diện

- dựng cấu trúc CMS
- dựng website nền cho site đầu tiên
- dựng cấu trúc nội dung chính

### Tuần 3: Hoàn thiện đa ngôn ngữ, landing page, phân quyền

- hoàn thiện nội dung đa ngôn ngữ
- hoàn thiện landing page linh hoạt
- hoàn thiện phân quyền quản trị

### Tuần 4: Test, chỉnh sửa và bàn giao

- test nghiệm thu
- chỉnh các điểm còn lại
- bàn giao tài khoản quản trị
- chốt KPI nghiệm thu

## 6. Ghi chú phạm vi

Giai đoạn 1 tập trung vào nền website và CMS.

Các phần như:

- CRM đầy đủ
- tự động hóa sâu
- AI / chatbot
- vận hành nội bộ phức tạp
- dashboard nâng cao

không nằm trong phạm vi mặc định của giai đoạn này nếu chưa có thống nhất thêm.

## 7. Kết luận

Giai đoạn 1 của `WingsTravel` không chỉ là làm một website.

Đây là bước xây nền đầu tiên để:

- có một site đủ tốt để vận hành
- có CMS để đội ngũ chủ động quản lý
- có cấu trúc sẵn sàng cho nhiều site trong hệ sinh thái
- có khả năng mở tiếp theo các giai đoạn sau một cách bài bản
