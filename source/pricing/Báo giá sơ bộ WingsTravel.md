# Báo giá sơ bộ theo giai đoạn cho WingsTravel

> **Tài liệu lịch sử - không dùng làm căn cứ thương mại hiện tại.**
>
> Báo giá đã chốt với đối tác là `60.000.000 VNĐ`, chưa bao gồm thuế, thời
> gian dự kiến `45 - 60 ngày làm việc`, theo
> `publish/html/12 Báo giá giai đoạn 1 WingsTravel - doc style.html`.
> Các mức `80 triệu` bên dưới chỉ là đề xuất sơ bộ trước khi chốt.

## 1. Mục đích

Tài liệu này dùng để gửi một khung giá dự kiến theo từng giai đoạn, bám theo logic đã trao đổi:

- Không nhìn bài toán như làm một website đơn lẻ
- Đi theo từng giai đoạn, mỗi giai đoạn có mục tiêu và đầu ra rõ
- Có thể khởi động nhanh ở lớp ngoài trước, rồi mới mở dần vào website, vận hành, dữ liệu và AI

Đây là báo giá sơ bộ để định hướng ra quyết định. Giá chi tiết cần chốt lại sau khi khóa phạm vi từng giai đoạn.

## 2. Cách đọc báo giá

- Mỗi giai đoạn dưới đây là một lớp triển khai tương đối độc lập
- Có thể làm tuần tự từng giai đoạn, không bắt buộc chốt toàn bộ ngay từ đầu
- Giai đoạn sau chỉ nên mở khi giai đoạn trước đã rõ mục tiêu, đầu vào và đầu mối phối hợp
- Giá dưới đây là giá dịch vụ triển khai và đồng hành công nghệ
- Chưa bao gồm ngân sách quảng cáo, mua domain, hosting, chi phí bên thứ ba, nội dung media lớn, chụp ảnh, quay dựng video, dịch thuật số lượng lớn

## 3. Báo giá đề xuất cho giai đoạn 1

### Giai đoạn 1: Website đa ngôn ngữ + CMS nền + campaign landing page

#### Mục tiêu

- Có một nền website đủ tốt để ra thị trường
- Có thể triển khai landing page theo từng campaign, thị trường hoặc nhóm sản phẩm
- Có khả năng quản trị nội dung thay vì sửa tay rời rạc

#### Phạm vi dự kiến

- Website giới thiệu dịch vụ / tour cho `WingsTravel`, với trọng tâm giai đoạn đầu là mảng inbound
- Cấu trúc đa ngôn ngữ giai đoạn đầu
- Các trang nền: trang chủ, giới thiệu, nhóm tour / dịch vụ, chi tiết tour, liên hệ, form nhận lead
- CMS nền để quản lý bài viết, trang và nội dung cơ bản
- Tính năng tạo campaign landing page từ một khung nền để phục vụ chạy quảng cáo hoặc thử nghiệm theo từng tệp khách
- Form nhận lead và điểm tiếp nhận lead cơ bản
- Tối ưu trải nghiệm cơ bản cho thiết bị di động
- Tư vấn cấu trúc thông tin và hành trình người dùng

#### Milestone khái quát

- Milestone 1: Làm rõ cấu trúc website, ngôn ngữ ưu tiên, nhóm nội dung và khung campaign landing page
- Milestone 2: Thiết kế và dựng website v1 cùng CMS nền
- Milestone 3: Hoàn thiện form nhận lead, luồng tiếp nhận lead cơ bản và khung landing page campaign
- Milestone 4: Review, chỉnh sửa, bàn giao và chốt hướng mở rộng giai đoạn tiếp theo

#### KPI / tiêu chí đánh giá giai đoạn 1

- Website v1 được hoàn thiện và có thể dùng để giới thiệu dịch vụ một cách bài bản
- CMS nền hoạt động ổn định để đội ngũ có thể chủ động cập nhật nội dung
- Có ít nhất 1 khung campaign landing page có thể tái sử dụng cho từng thị trường / sản phẩm
- Form nhận lead và điểm tiếp nhận lead hoạt động ổn định
- Có thể bắt đầu triển khai marketing / chạy thử thị trường ngay sau bàn giao
- Có cơ sở rõ hơn để quyết định scope of work cho giai đoạn tiếp theo

#### Đầu ra chính

- Website v1 đa ngôn ngữ, hỗ trợ SEO tự động hoàn chỉnh
- CMS nền để chủ động cập nhật nội dung
- Có khả năng tạo landing page campaign theo từng thị trường / sản phẩm
- Có nền lead flow ban đầu để phục vụ marketing và sale
- Có cơ sở mở rộng thêm thị trường, sản phẩm và nội dung

#### Giá dự kiến

- `80 triệu`

#### Ghi chú phạm vi

- Mức này phù hợp khi chốt rõ phạm vi website v1, CMS nền và một khung campaign landing page có thể nhân bản
- Nếu phát sinh thêm nhiều ngôn ngữ, nhiều loại landing page khác nhau, logic tour phức tạp, tích hợp sâu hoặc khối lượng nội dung lớn, cần bóc bổ sung
- Không bao gồm các chi phí hạ tầng, VPS, Domain, chi phí công cụ hoặc database cao cấp.
- Không bao gồm việc xuất bản nội dung, thiết kế banner, landing page, email

## 4. Ghi chú về các giai đoạn tiếp theo

Các giai đoạn tiếp theo như:

- quản lý lead / CRM mini / vận hành nội bộ
- dữ liệu nội bộ / RAG / tự động hóa
- mô hình đối tác công nghệ đồng hành dài hạn

đều là các lớp triển khai có khả năng trượt scope cao nếu chưa làm rõ kỹ bài toán thực tế.

Vì vậy:

- Ở thời điểm hiện tại chỉ nên chốt báo giá cho giai đoạn 1
- Sau khi hoàn thành giai đoạn 1 và có thêm đầu vào thực tế, hai bên sẽ làm rõ tiếp scope of work cho từng giai đoạn sau
- Khi scope đủ rõ mới nên bóc estimate và báo giá cụ thể cho từng phần

## 5. Gợi ý cách mở trao đổi với đối tác

Nếu cần một cách nói ngắn gọn, có thể mở như sau:

> Theo góc nhìn của em, để phù hợp với giai đoạn hiện tại thì mình nên chia theo từng giai đoạn thay vì báo một cục chung.  
> Giai đoạn 1 em đề xuất gộp luôn phần website đa ngôn ngữ, CMS nền và khả năng tạo campaign landing page để bên anh có một nền đủ tốt cho việc giới thiệu dịch vụ, chạy thị trường và nhận lead. Với phạm vi này, em đang hình dung mức ngân sách phù hợp là khoảng 80 triệu.  
> Các giai đoạn sau như quản lý lead, vận hành nội bộ, dữ liệu hay AI thì em nghĩ nên làm rõ thêm scope of work sau khi giai đoạn 1 chạy xong hoặc khi đầu vào đã đủ rõ, rồi khi đó em sẽ bóc tiếp báo giá cụ thể cho từng phần.

## 6. Gợi ý phương án nên đề xuất trước

Nếu cần chốt một điểm vào hợp lý để bên họ dễ ra quyết định, nên ưu tiên đề xuất:

- Giai đoạn 1: `80 triệu`

Lý do:

- Không bị nhìn như báo giá làm landing page đơn lẻ
- Có đủ không gian để xây nền website, nội dung và campaign landing page ngay từ đầu
- Vẫn hợp lý để đối tác thử hợp tác ở giai đoạn đầu
- Giữ được vị thế tư vấn và đồng hành công nghệ
- Có chỗ để mở tiếp sang giai đoạn 2, 3, 4 nếu hai bên làm việc hợp nhau

## 7. Những gì cần ghi rõ để tránh trượt phạm vi

- 1 ngôn ngữ hay nhiều ngôn ngữ
- 1 landing page hay nhiều landing page
- Có bao gồm viết nội dung hay chỉ biên tập / tối ưu từ đầu vào có sẵn
- Có bao gồm thiết kế bộ nhận diện hay không
- Có bao gồm chạy ads hay chỉ chuẩn bị nền tảng cho ads
- Lead về email / sheet / CRM / backend riêng
- Có bao gồm hosting, domain, tool bên thứ ba hay không
- Số vòng chỉnh sửa trong từng giai đoạn

## 8. Kết luận

Nếu cần gửi ngay, nên giữ tinh thần:

- Báo giá theo giai đoạn
- Giai đoạn hiện tại chỉ chốt giá cho giai đoạn 1
- Các giai đoạn sau chỉ nên báo giá sau khi làm rõ scope of work
- Vẫn mở đường cho mô hình đối tác công nghệ dài hạn
