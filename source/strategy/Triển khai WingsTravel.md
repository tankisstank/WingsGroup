# Triển khai WingsTravel

## Tài liệu liên quan

- [[01 Meeting script WingsTravel]]
- [[02 Proposal 30 ngày WingsTravel]]
- [[Estimate sơ bộ WingsTravel]]
- [03 Proposal guide WingsTravel.html](../../publish/html/03%20Proposal%20guide%20WingsTravel.html)
- [[04 Memo nội bộ sau họp WingsTravel]]
- [[05 Memo gửi đối tác WingsTravel]]
- [[06 Follow-up nhẹ sau buổi gặp WingsTravel]]
- [[07 Roadmap cộng tác WingsTravel]]
- [08 Roadmap guide WingsTravel.html](../../publish/html/08%20Roadmap%20guide%20WingsTravel.html)
- [09 WingsTravel partner guide complete.html](../../publish/html/09%20WingsTravel%20partner%20guide%20complete.html)
- [[10 Kiến trúc hệ thống WingsTravel]]
- [[14 Khung tính năng và KPI giai đoạn 1 WingsTravel]]
- [[15 Đề xuất Payload so với Wagtail cho giai đoạn 1-4]]
- [[16 Phạm vi chức năng release giai đoạn 1 WingsTravel]]
- [[17 Bản chức năng gửi khách hàng WingsTravel]]
- [[18 Áp dụng Payload vào dự án WingsTravel]]
- [13 Bản chức năng gửi khách hàng WingsTravel.html](../../publish/html/13%20B%E1%BA%A3n%20ch%E1%BB%A9c%20n%C4%83ng%20g%E1%BB%ADi%20kh%C3%A1ch%20h%C3%A0ng%20WingsTravel.html)

## 1. Bối cảnh

Đây là ý tưởng triển khai dịch vụ công nghệ cho dự án `WingsTravel`, với trọng tâm giai đoạn hiện tại là mảng dịch vụ inbound.

Phía đối tác đang phát triển `WingsTravel` như một thương hiệu / nền tảng dịch vụ mới trong hệ sinh thái:

- Một công ty bán vé máy bay
- Một công ty bán tour du lịch ra nước ngoài

Trong đó, mảng inbound hiện tại gần như chưa có nền tảng số đáng kể và cần xây dựng từ đầu.

## 2. Vai trò mình muốn tham gia

Không chỉ dừng ở việc làm website.

Mục tiêu là đồng hành với vai trò đối tác công nghệ, có thể hiểu gần như một CTO thuê ngoài:

- Tư vấn định hướng công nghệ
- Xây dựng các nền tảng hiện diện online
- Thiết kế hệ thống nhận lead
- Đề xuất và triển khai các quy trình vận hành số
- Từng bước đưa AI và tự động hóa vào sale, marketing, vận hành

## 3. Buổi gặp gần nhất

- Đầu mối hiện tại: anh Định Kenya
- Lịch hẹn: thứ Sáu, ngày 10/04/2026, lúc 15:00

## 4. Mục tiêu của buổi gặp

Mục tiêu chính không phải chốt làm một website đơn lẻ, mà là:

- Chốt hoặc gợi mở rõ định hướng hợp tác lâu dài với vai trò đối tác công nghệ
- Xác định một sản phẩm đầu tiên có thể triển khai trong 30 ngày
- Thu thập đủ thông tin để sau buổi gặp có thể gửi một bản đề xuất hoặc estimate chuyên nghiệp

## 5. Những gì đã biết đến lúc này

- Họ đang mở một công ty con về inbound
- Trước mắt có thể cần làm các thứ trình bày ra ngoài và hiện diện online cho mảng mới
- Hướng ưu tiên ban đầu nhiều khả năng là:
  - Landing page
  - Hệ thống nhận lead
  - Bộ nội dung marketing cơ bản

## 6. Những gì chưa rõ và cần khai thác trong buổi gặp

Đây là phần quan trọng nhất. Hiện các điểm sau vẫn chưa rõ:

- Khách hàng mục tiêu là ai
- Sản phẩm inbound cụ thể là gì
- Vấn đề kinh doanh hiện tại là gì
- Ai là người quyết định cuối cùng
- Mảng inbound sẽ tận dụng được gì từ hệ sinh thái sẵn có
- Phía đối tác hiện có sẵn những tài nguyên gì để triển khai nhanh

## 7. Câu hỏi khai thác trong buổi gặp

### 7.1. Về mô hình kinh doanh

- Công ty inbound này sẽ phục vụ nhóm khách nào là chính?
- Họ đang muốn bán gì trước: tour, combo, land tour, xe đưa đón, visa, local experience, hay dịch vụ khác?
- Mục tiêu 6-12 tháng đầu của công ty inbound là gì?
- Họ đang muốn xây thương hiệu dài hạn hay ưu tiên có khách nhanh trước?

### 7.2. Về khách hàng và thị trường

- Khách inbound mục tiêu đến từ thị trường nào?
- Họ đang nhắm phân khúc nào: phổ thông, trung cấp, cao cấp, khách đoàn, khách lẻ?
- Hiện có giả định nào về insight của khách chưa?
- Điểm khác biệt của công ty này so với các đơn vị inbound khác là gì?

### 7.3. Về hệ sinh thái sẵn có

- Công ty inbound mới có thể tận dụng gì từ công ty vé máy bay và công ty outbound?
- Có sẵn data khách hàng, đội sale, đối tác, sản phẩm, hay thương hiệu để tận dụng không?
- Có thể cross-sell hoặc dùng chung tài nguyên nào ngay từ đầu không?

### 7.4. Về tổ chức và quyết định

- Ai là người phụ trách vận hành trực tiếp?
- Ai là người quyết định cuối cùng về ngân sách và định hướng?
- Anh Định Kenya đang giữ vai trò điều phối, vận hành, hay có quyền chốt?

### 7.5. Về dữ liệu và tài nguyên đầu vào

- Họ đã có logo, bộ nhận diện, domain, fanpage, hình ảnh, video, tài liệu giới thiệu chưa?
- Họ đã có danh sách sản phẩm/tour mẫu chưa?
- Có đội ngũ nào phụ trách nội dung, sale, chăm sóc khách hàng chưa?
- Có ngân sách dự kiến cho giai đoạn thử nghiệm đầu tiên không?

### 7.6. Về bài toán cần giải quyết ngay

- Thứ họ cần nhất trong 30 ngày đầu là gì?
- Cần có khách nhanh, cần dựng thương hiệu, hay cần chứng minh mô hình?
- Quy trình tiếp nhận và xử lý khách hiện tại đang hình dung như thế nào?

## 8. Thông điệp mình cần show trong buổi gặp

Điểm mạnh của mình không nằm ở việc "biết làm web", mà ở chỗ hiểu cách công nghệ phục vụ tăng trưởng và vận hành.

Thông điệp cốt lõi có thể là:

> Tôi không tiếp cận theo kiểu làm từng thứ rời rạc như thuê một agency dựng web. Tôi có kinh nghiệm phát triển và vận hành các dự án thương mại điện tử và hệ thống kinh doanh thực tế, nên có thể cùng anh chị nhìn bài toán theo hướng tổng thể hơn: bán hàng, vận hành, dữ liệu, tự động hóa và khả năng mở rộng. Trong bối cảnh AI đang đi rất sâu vào hoạt động doanh nghiệp, cần có một người làm công nghệ thực chiến để giúp doanh nghiệp đi cùng tốc độ thay đổi đó.

## 9. Những gì có thể dùng để tạo niềm tin

### Kinh nghiệm thực chiến

- Xây dựng hệ thống quản lý kinh doanh cho shop
- Triển khai hệ thống bot openClaw dạng SaaS
- Có kinh nghiệm phát triển và vận hành hệ thống bán vé máy bay trực tuyến
- Có kinh nghiệm làm các dự án thương mại điện tử

### Giá trị mình có thể mang vào

- Góc nhìn hệ thống, không làm rời rạc
- Hiểu bài toán vận hành và tăng trưởng
- Có khả năng áp dụng AI vào quy trình thực tế
- Có thể vừa tư vấn, vừa cùng triển khai

## 10. Đề xuất sản phẩm đầu tiên trong 30 ngày

Mục tiêu giai đoạn đầu là có một thứ đủ nhanh để trình bày ra ngoài và bắt đầu tạo lead.

### Phương án ưu tiên

- Landing page giới thiệu dịch vụ inbound
- Hệ thống nhận lead
- Bộ nội dung marketing cơ bản để bắt đầu truyền thông hoặc chạy ads

### Thành phần cụ thể có thể đề xuất

- 1 landing page chính
- Form nhận thông tin khách hàng
- Kênh đổ lead về email, Google Sheet, CRM đơn giản hoặc chatbot
- Kịch bản xử lý lead ban đầu
- Nội dung cơ bản: giới thiệu, USP, nhóm dịch vụ, form tư vấn

## 11. Roadmap hợp tác sơ bộ

### Giai đoạn 1: Trình bày ra ngoài và có lead

- Làm landing page
- Thiết lập hệ thống nhận lead
- Chuẩn bị nội dung marketing cơ bản
- Hỗ trợ setup nền tảng chạy quảng cáo nếu cần

### Giai đoạn 2: Hoàn thiện website

- Xây dựng website đầy đủ hơn
- Bổ sung nội dung và cấu trúc dịch vụ
- Tối ưu trải nghiệm khách hàng

### Giai đoạn 3: Hệ thống vận hành

- Chuẩn hóa quy trình nhận lead và xử lý lead
- Xây dựng các công cụ hỗ trợ sale, chăm sóc khách
- Tập trung vào dữ liệu và khả năng đo lường
- Từng bước hình thành lớp backend gồm CRM, CMS, dữ liệu tri thức nội bộ và công cụ vận hành

### Giai đoạn 4: Tự động hóa và AI

- Chatbot AI tư vấn bước đầu
- Tự động trả lời và phân loại lead
- Hỗ trợ tạo nội dung marketing
- Hỗ trợ báo cáo và theo dõi hiệu quả vận hành
- Kết nối n8n, AI bot và các workflow tự động hóa với dữ liệu nội bộ và lead flow

## 11.1. Mô hình kiến trúc đã trao đổi thêm

Trong quá trình trao đổi, có bổ sung một cách hình dung hệ thống theo các tầng:

### Tầng Frontend

- Website đa ngôn ngữ
- Website cung cấp thông tin tour
- Website tối ưu theo từng nhóm khách hàng / agency
- Landing page tùy biến theo tệp khách hàng
- Các kênh chạy quảng cáo như Facebook, Google

### Tầng Backend

- CRM
- RAG phục vụ dữ liệu nội bộ
- CMS
- Hệ thống vận hành / quản lý nội bộ
- Hệ thống quản lý lead

### Tầng dữ liệu

- Kho tri thức cho RAG
- Database lead
- Database khách hàng
- Database đối tác
- Database dịch vụ

### Tầng tự động hóa

- n8n
- AI bot chat
- Hệ thống giao việc / workflow tự động

Luồng hình dung cơ bản:

- Quảng cáo và landing page tạo lead
- Lead được thu thập vào database
- Backend và đội vận hành xử lý lead
- Dữ liệu nội bộ, tour, bảo hiểm, chính sách được đưa vào RAG
- AI và automation sử dụng dữ liệu đó để hỗ trợ sale, chăm sóc và vận hành

## 12. Cách đặt vấn đề về AI

Không nên nói AI quá chung chung. Nên gắn AI vào các bài toán cụ thể:

- Chatbot hỗ trợ tư vấn khách bước đầu
- Tự động phản hồi lead nhanh hơn
- Hỗ trợ phân loại nhu cầu khách hàng
- Hỗ trợ sale và chăm sóc khách
- Hỗ trợ tạo nội dung marketing
- Hỗ trợ tổng hợp dữ liệu và báo cáo

## 13. Hướng làm việc sau buổi gặp

Nếu buổi gặp thuận lợi, đầu ra sau đó nên là:

- Một bản tóm tắt nhu cầu và hiện trạng
- Một đề xuất triển khai giai đoạn 1 trong 30 ngày
- Một estimate sơ bộ về phạm vi, thời gian, chi phí
- Một roadmap hợp tác công nghệ theo giai đoạn

Điểm cần lưu ý:

- Có thể ngay tại buổi gặp chưa đủ dữ liệu để estimate chính xác
- Nhưng nếu đưa ra được khung triển khai và cách bóc tách công việc, điều đó sẽ thể hiện sự chuyên nghiệp và kinh nghiệm vận hành

## 14. Những câu cần tiếp tục trả lời sau

- Khách hàng mục tiêu cụ thể là ai?
- Sản phẩm inbound cụ thể là gì?
- Ai là người quyết định cuối cùng?
- Hệ sinh thái hiện có hỗ trợ được gì cho mảng inbound?
- Giai đoạn 1 sẽ làm theo mô hình dự án, retainer hay follow-up như thế nào?
- Tiêu chí thành công trong 30 ngày đầu là gì?
