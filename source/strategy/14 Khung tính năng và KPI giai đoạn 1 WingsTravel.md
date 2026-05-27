# Khung tính năng và KPI giai đoạn 1 WingsTravel

## 1. Mục đích tài liệu

Tài liệu này dùng để chuyển trạng thái từ:

- đã chốt báo giá giai đoạn 1

sang trạng thái:

- có khung tính năng rõ
- có phạm vi chức năng rõ
- có KPI và tiêu chí nghiệm thu cụ thể
- có cơ sở để kickoff, bám tiến độ và tránh trượt phạm vi

Tài liệu này bám theo hướng đã chốt:

- website đa ngôn ngữ
- CMS nền
- campaign landing page
- form nhận lead và điểm tiếp nhận lead cơ bản

## 2. Mục tiêu của giai đoạn 1

Giai đoạn 1 không nhằm xây toàn bộ hệ thống inbound hoàn chỉnh.

Mục tiêu thực tế là tạo ra một nền đủ tốt để:

- giới thiệu dịch vụ inbound một cách bài bản
- triển khai landing page theo từng campaign hoặc thị trường
- nhận lead ổn định
- quản trị nội dung không phải sửa tay
- tạo nền để mở tiếp sang vận hành, CRM, dữ liệu và AI ở giai đoạn sau

## 3. Kết quả đầu ra cần có

Sau giai đoạn 1, cần có tối thiểu các đầu ra sau:

- 1 website v1 phục vụ giới thiệu dịch vụ inbound
- cấu trúc đa ngôn ngữ giai đoạn đầu
- CMS nền để quản trị nội dung
- 1 khung campaign landing page có thể tái sử dụng
- form nhận lead hoạt động ổn định
- điểm tiếp nhận lead cơ bản
- tracking nền để đo chuyển đổi bước đầu

## 4. Khung tính năng theo nhóm

### 4.1. Nhóm A: Website public

#### Mục tiêu

- Có bộ mặt online đủ rõ để giới thiệu dịch vụ
- Có cấu trúc thông tin đủ tốt cho khách hàng và đối tác xem

#### Tính năng chính

- Trang chủ
- Trang giới thiệu
- Trang danh sách nhóm tour / dịch vụ
- Trang chi tiết tour / dịch vụ
- Trang liên hệ
- CTA rõ để điều hướng sang form nhận tư vấn
- Header / footer dùng chung
- Responsive tốt cho mobile và desktop

#### Tiêu chí nghiệm thu

- Người dùng có thể hiểu được công ty làm gì, bán gì, dành cho ai
- Có luồng điều hướng rõ từ trang nội dung sang form nhận lead
- Không có lỗi layout nghiêm trọng ở mobile phổ biến và desktop phổ biến

### 4.2. Nhóm B: Đa ngôn ngữ

#### Mục tiêu

- Cho phép triển khai giai đoạn đầu với cấu trúc nhiều ngôn ngữ
- Không phải làm lại kiến trúc khi mở thêm thị trường

#### Tính năng chính

- Cấu trúc localization cho website
- Quản trị nội dung theo từng locale
- URL hoặc cấu trúc route rõ theo ngôn ngữ
- Có cơ chế fallback nội dung nếu được chấp thuận từ đầu

#### Tiêu chí nghiệm thu

- Admin có thể tạo hoặc chỉnh nội dung theo từng ngôn ngữ trong CMS
- Frontend hiển thị đúng nội dung theo locale được cấu hình
- Không lẫn dữ liệu sai ngôn ngữ giữa các trang

### 4.3. Nhóm C: CMS nền

#### Mục tiêu

- Đội ngũ có thể chủ động cập nhật nội dung mà không phụ thuộc sửa code

#### Tính năng chính

- Quản lý trang tĩnh cơ bản
- Quản lý nội dung tour / dịch vụ
- Quản lý bài viết / FAQ nếu nằm trong scope chốt
- Quản lý media cơ bản
- Preview nội dung trước khi publish nếu stack hỗ trợ
- Phân quyền admin cơ bản

#### Tiêu chí nghiệm thu

- Có thể tạo, sửa, ẩn / hiện nội dung từ CMS
- Nội dung sau khi cập nhật phản ánh đúng ra website
- Cấu trúc content model đủ dùng cho giai đoạn đầu, không phải sửa thủ công trong code cho các nội dung thường xuyên thay đổi

### 4.4. Nhóm D: Campaign landing page

#### Mục tiêu

- Có khả năng tạo landing page theo từng campaign, thị trường hoặc nhóm sản phẩm mà không phải dựng lại từ đầu

#### Tính năng chính

- 1 khung landing page chuẩn
- Các section có thể tái sử dụng theo block
- Cho phép thay hero, nội dung, USP, CTA, form, testimonial hoặc section tương đương
- Có slug / route riêng cho từng landing page
- Có thể nhân bản landing page để tạo campaign mới nhanh hơn

#### Tiêu chí nghiệm thu

- Có thể tạo ít nhất 1 landing page mới từ khung nền mà không cần sửa code cấu trúc
- Có thể thay nội dung theo từng thị trường / sản phẩm
- Landing page giữ được cấu trúc chuyển đổi nhất quán

### 4.5. Nhóm E: Lead capture

#### Mục tiêu

- Không để lead rơi vào trạng thái chỉ có giao diện mà không có luồng tiếp nhận thật

#### Tính năng chính

- Form nhận tư vấn / liên hệ
- Validate các trường cơ bản
- Gửi lead về điểm tiếp nhận đã chốt
- Lưu bản ghi lead ở mức cơ bản nếu nằm trong scope
- Thông báo thành công / thất bại rõ cho người dùng
- Chống spam cơ bản

#### Trường dữ liệu tối thiểu nên có

- Họ tên
- Số điện thoại hoặc kênh liên hệ chính
- Email nếu cần
- Quốc tịch / thị trường quan tâm nếu cần
- Nhu cầu / loại tour quan tâm
- Ghi chú thêm
- Nguồn page / campaign

#### Tiêu chí nghiệm thu

- Lead test gửi thành công ở các điểm form chính
- Dữ liệu lead không mất trường bắt buộc
- Có thể xác định lead đến từ page hoặc campaign nào ở mức cơ bản

### 4.6. Nhóm F: Tracking và đo lường nền

#### Mục tiêu

- Tạo khả năng đo hiệu quả sớm, không chờ sang giai đoạn sau mới gắn tracking

#### Tính năng chính

- Gắn công cụ analytics nền
- Theo dõi page view cơ bản
- Theo dõi submit form
- Theo dõi nguồn traffic cơ bản nếu có UTM
- Chuẩn bị naming logic cho campaign đo lường

#### Tiêu chí nghiệm thu

- Có thể nhìn thấy sự kiện submit form trong công cụ đo lường đã chốt
- Có thể phân biệt được traffic cơ bản theo page hoặc campaign
- Có cơ sở để chạy quảng cáo và đọc tín hiệu ban đầu

### 4.7. Nhóm G: SEO kỹ thuật nền

#### Mục tiêu

- Không làm website chỉ để chạy ads mà bỏ qua nền indexing và chia sẻ link

#### Tính năng chính

- Meta title / description cơ bản
- Open Graph cơ bản
- Sitemap nếu nằm trong stack chuẩn
- Robots cơ bản
- URL sạch

#### Tiêu chí nghiệm thu

- Các trang chính có metadata cơ bản
- Link chia sẻ hiển thị được thông tin nền
- Không có lỗi kỹ thuật SEO nghiêm trọng ngay ở bản đầu

## 5. Chức năng quản trị tối thiểu cần chốt

Ở mức tối thiểu, admin cần làm được các việc sau:

- đăng nhập vào CMS
- tạo / sửa / ẩn / hiện trang nội dung
- cập nhật nội dung theo ngôn ngữ
- tạo / nhân bản campaign landing page từ khung có sẵn
- cập nhật form hoặc điểm nhận lead theo cấu hình cho phép
- xem hoặc nhận được lead theo cách đã chốt

Nếu admin chưa tự làm được các việc trên thì giai đoạn 1 chưa đạt đúng mục tiêu "CMS nền".

## 6. KPI giai đoạn 1

KPI nên chia thành 3 lớp để tránh hiểu sai giữa:

- KPI bàn giao
- KPI vận hành
- KPI kết quả kinh doanh ban đầu

### 6.1. KPI bàn giao / nghiệm thu

Đây là lớp KPI bắt buộc phải đạt khi bàn giao.

- `100%` trang và chức năng trong scope chốt phải hoàn thiện và deploy được
- `100%` form chính phải gửi lead thành công trong test nghiệm thu
- `100%` nội dung của các trang chính phải quản trị được từ CMS theo scope đã chốt
- Tối thiểu `1` khung landing page phải có thể tái sử dụng cho campaign mới
- `0` lỗi blocker trên luồng xem trang chính, đổi ngôn ngữ, gửi form
- Hiển thị tốt trên mobile và desktop ở mức không có lỗi vỡ layout nghiêm trọng

### 6.2. KPI vận hành giai đoạn đầu

Đây là lớp KPI dùng trong 2-4 tuần đầu sau khi go-live.

- Lead từ form được chuyển tới đúng điểm tiếp nhận với tỷ lệ thành công mục tiêu `>= 95%`
- Thời gian phản hồi lead đầu tiên mục tiêu:
  - trong giờ làm việc: `<= 30 phút`
  - ngoài giờ: theo quy ước nội bộ đã chốt
- Tỷ lệ bỏ sót lead do lỗi hệ thống mục tiêu: `0%`
- Tỷ lệ trang chính có thể tự cập nhật nội dung từ CMS mục tiêu: `>= 90%` theo nhu cầu thường gặp
- Tỷ lệ tạo landing page mới từ khung có sẵn mà không cần sửa code mục tiêu: `>= 80%` các case campaign chuẩn

### 6.3. KPI thị trường / hiệu quả ban đầu

Đây là lớp KPI nên theo dõi, nhưng cần hiểu là còn phụ thuộc vào traffic, nội dung, ads, offer và quy trình sale.

- Số lượng lead theo từng campaign
- Cost per lead nếu có chạy ads
- Tỷ lệ chuyển đổi từ landing page sang submit form
- Tỷ lệ lead hợp lệ
- Tỷ lệ phản hồi lead đúng SLA
- Tỷ lệ chuyển lead sang bước tư vấn thực tế

Lưu ý:

- Không nên cam kết cứng KPI doanh thu hoặc số đơn ngay trong giai đoạn 1 nếu chưa kiểm soát traffic, offer và sale operation
- Nên cam kết mạnh ở lớp bàn giao và lớp vận hành

## 7. Bộ KPI cụ thể nên đề xuất với đối tác

Nếu cần một bộ KPI ngắn, rõ và dễ chốt, có thể đề xuất:

1. Website v1 và CMS nền hoàn thành đúng phạm vi chốt, deploy được, vận hành ổn định.
2. Tối thiểu 1 landing page campaign có thể tạo và tái sử dụng từ khung nền.
3. Toàn bộ form lead chính hoạt động ổn định, không mất lead trong test nghiệm thu.
4. Lead từ website / landing page được đổ về đúng điểm tiếp nhận với tỷ lệ thành công mục tiêu từ `95%` trở lên.
5. Đội ngũ phía đối tác có thể tự cập nhật nội dung cơ bản mà không cần sửa code.
6. Có công cụ đo được traffic nền và submit form để bắt đầu tối ưu campaign.
7. Sau go-live, lead đầu tiên được phản hồi theo SLA nội bộ đã chốt.

## 8. Những gì nên ghi rõ là ngoài phạm vi giai đoạn 1

Để tránh trượt phạm vi, nên ghi rõ các phần sau chưa mặc định nằm trong giai đoạn 1 nếu chưa chốt riêng:

- CRM đầy đủ
- quy trình vận hành nội bộ nhiều bước
- phân quyền phức tạp nhiều vai trò
- automation sâu với n8n
- chatbot AI
- RAG
- dashboard báo cáo nâng cao
- tích hợp nhiều nguồn lead phức tạp
- logic booking / payment / partner handoff
- sản xuất media lớn
- SEO sâu hoặc content production số lượng lớn

## 9. Các câu cần chốt ngay trước kickoff

- Giai đoạn 1 có bao nhiêu ngôn ngữ thực tế?
- Những trang nào là bắt buộc trong bản đầu?
- Tour / dịch vụ sẽ hiển thị theo cấu trúc nào?
- Form lead sẽ đổ về đâu?
- Ai là người duyệt nội dung?
- Ai là người test nghiệm thu phía đối tác?
- SLA phản hồi lead mong muốn là bao lâu?
- Campaign landing page cần nhân bản ở mức nào trong giai đoạn 1?

## 10. Đề xuất cách chốt với đối tác

Không nên chỉ nói:

> Giai đoạn 1 gồm website, CMS và landing page.

Nên chốt theo hướng:

> Giai đoạn 1 sẽ được khóa theo 3 lớp:  
> lớp 1 là các tính năng phải có để website và landing page vận hành được;  
> lớp 2 là các chức năng admin phải tự dùng được trong CMS;  
> lớp 3 là KPI nghiệm thu và KPI vận hành sau khi go-live.  
> Như vậy hai bên sẽ dễ bám tiến độ, dễ nghiệm thu và tránh phát sinh ngoài phạm vi.

## 11. Kết luận

Việc cần làm tiếp theo không phải là mở thêm ý tưởng, mà là khóa cho rõ:

- tính năng nào thuộc giai đoạn 1
- chức năng admin nào bắt buộc phải dùng được
- KPI nào dùng để nghiệm thu
- KPI nào dùng để đo hiệu quả sau khi vận hành

Khi 4 phần trên được chốt, giai đoạn 1 mới thực sự chuyển từ "đã đồng ý báo giá" sang "sẵn sàng triển khai".
