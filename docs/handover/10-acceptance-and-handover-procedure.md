# Thủ tục nghiệm thu và bàn giao

> Tài liệu này là hướng dẫn vận hành và chuẩn bị hồ sơ, không thay thế tư vấn
> pháp lý. Trước khi ký, hai bên cần đối chiếu lại hợp đồng, báo giá, phụ lục,
> thẩm quyền người ký và điều kiện thanh toán thực tế.

## Khuyến nghị ngắn

Văn bản phù hợp tại thời điểm hiện tại là:

**Biên bản nghiệm thu và bàn giao sản phẩm phần mềm giai đoạn 1**.

Biên bản này xác nhận đồng thời:

- phạm vi và phiên bản sản phẩm được kiểm tra;
- kết quả nghiệm thu theo tiêu chí hai bên đã thống nhất;
- tài liệu, tài khoản, mã nguồn và quyền truy cập đã bàn giao;
- các tồn đọng, ngoại lệ và thời hạn xử lý còn lại;
- thời điểm bắt đầu bảo hành, hỗ trợ và nghĩa vụ thanh toán, nếu hợp đồng có
  quy định.

Không nên dùng riêng một biên bản bàn giao tài khoản để thay cho nghiệm thu.
Không nên ký biên bản thanh lý ngay nếu vẫn còn nghĩa vụ thanh toán, khắc phục
lỗi, bàn giao hạ tầng hoặc bảo hành chưa hoàn tất.

## Bộ hồ sơ đề xuất

| Tài liệu | Mục đích | Trạng thái |
| --- | --- | --- |
| Hợp đồng, báo giá hoặc xác nhận phạm vi | Căn cứ thương mại và phạm vi | Hai bên cung cấp bản đã chốt |
| Phụ lục phạm vi và tiêu chí nghiệm thu | Xác định chức năng, KPI, ngoại lệ | Dùng tài liệu phase 1 đã thống nhất |
| Biên bản UAT hoặc checklist kiểm thử | Ghi nhận kết quả kiểm tra thực tế | Lập trước buổi ký |
| Biên bản nghiệm thu và bàn giao | Văn bản xác nhận chính giữa hai bên | Dùng mẫu trong `templates/` |
| Danh mục tài sản và quyền truy cập | Repo, hosting, domain, CMS, email, tài liệu | Đính kèm biên bản |
| Danh sách tồn đọng | Phân loại lỗi, người xử lý, hạn xử lý | Bắt buộc nếu nghiệm thu có điều kiện |
| Hóa đơn/chứng từ thanh toán | Thực hiện nghĩa vụ tài chính | Theo hợp đồng và quy định thuế |
| Biên bản thanh lý hợp đồng | Xác nhận các nghĩa vụ đã hoàn thành | Chỉ ký khi phù hợp |

## Quy trình thực hiện

1. **Khóa phạm vi nghiệm thu**

   Chốt rõ đây là giai đoạn 1, phiên bản/commit, môi trường và ngày kiểm tra.
   Dùng tài liệu phạm vi, báo giá, email xác nhận và change request đã được hai
   bên chấp thuận làm căn cứ.

2. **Thực hiện UAT**

   Đại diện khách hàng kiểm tra các luồng chính: website, CMS, phân quyền,
   nội dung, form, responsive, SEO nền, theme và các site thuộc phạm vi.
   Mỗi tiêu chí được đánh dấu đạt, đạt có điều kiện hoặc chưa đạt.

3. **Phân loại vấn đề còn lại**

   - lỗi chặn nghiệm thu;
   - lỗi không chặn nghiệm thu nhưng phải sửa trong thời hạn xác định;
   - yêu cầu thay đổi hoặc bổ sung ngoài phạm vi;
   - đầu vào còn chờ khách hàng như nội dung, hình ảnh, domain, SMTP.

4. **Lập và rà soát biên bản**

   Ghi đúng tên pháp lý, mã số thuế, địa chỉ, người đại diện, căn cứ ký và danh
   mục phụ lục. Không ghi chung chung “đã bàn giao toàn bộ” nếu còn ngoại lệ.

5. **Ký và phát hành**

   Người ký phải là đại diện có thẩm quyền hoặc có giấy ủy quyền hợp lệ. Bản
   giấy nên lập tối thiểu hai bản có giá trị như nhau. Nếu ký điện tử, nên dùng
   nền tảng/chữ ký điện tử cho phép xác định chủ thể ký và kiểm tra tính toàn
   vẹn của văn bản.

6. **Thực hiện nghĩa vụ sau ký**

   Bên cung cấp xử lý tồn đọng và bảo hành theo biên bản/hợp đồng. Bên khách
   hàng xác nhận đầu mối vận hành, đổi mật khẩu ban đầu và thực hiện thanh toán
   theo mốc đã thỏa thuận.

## Quy tắc re-check trước production push

Mỗi khi nhận yêu cầu đẩy, cập nhật hoặc hotfix lên production, phải re-check và
re-confirm lại các dữ kiện vận hành trước khi chạm vào môi trường thật. Không
được dùng lại giả định của lần triển khai trước nếu chưa xác minh lại trạng
thái live.

Danh sách xác nhận tối thiểu:

- host/VPS đích;
- release path hoặc compose project đang chạy;
- domain đang live và chế độ TLS;
- file môi trường và vị trí secret;
- container/service status trước khi đổi;
- điểm rollback hoặc bản deploy trước đó;
- phạm vi thay đổi có ảnh hưởng dữ liệu, DNS, SSL hay không.

Nếu một mục chưa được xác nhận, dừng lại để kiểm tra trước khi tiếp tục.

## Điều kiện ký đề xuất

Chọn một trong ba kết luận, không dùng câu chữ mơ hồ:

- **Nghiệm thu đạt:** toàn bộ tiêu chí bắt buộc đã đạt.
- **Nghiệm thu có điều kiện:** sản phẩm được tiếp nhận và vận hành; các tồn
  đọng không chặn vận hành được liệt kê cùng hạn xử lý.
- **Chưa nghiệm thu:** tồn tại lỗi chặn; hai bên lập lịch khắc phục và nghiệm
  thu lại.

Đối với WingsGroup hiện tại, chỉ nên ký “nghiệm thu đạt” khi môi trường bàn
giao đã được xác định rõ. Nếu production domain, email provider, nội dung hoặc
hạ tầng vẫn do khách hàng chưa chốt, nên dùng “nghiệm thu có điều kiện” và ghi
những mục đó là phụ thuộc đầu vào khách hàng, không phải lỗi phần mềm.

## Nội dung bắt buộc trong biên bản

- thông tin pháp lý của hai bên;
- căn cứ hợp đồng/báo giá/phụ lục/xác nhận phạm vi;
- tên sản phẩm, giai đoạn, phiên bản, commit và môi trường;
- danh sách chức năng và tiêu chí đã kiểm tra;
- kết quả nghiệm thu;
- danh mục tài liệu, tài khoản và tài sản số bàn giao;
- danh sách tồn đọng, ngoại lệ và trách nhiệm xử lý;
- phạm vi bảo hành, hỗ trợ và thời điểm bắt đầu;
- điều kiện thanh toán được kích hoạt bởi biên bản, nếu có;
- quyền sở hữu, quyền sử dụng mã nguồn và tài sản bên thứ ba theo hợp đồng;
- bảo mật thông tin đăng nhập và dữ liệu;
- số bản, hiệu lực và chữ ký đúng thẩm quyền.

Không ghi mật khẩu, secret, API key hoặc private key trực tiếp trong biên bản.
Chỉ ghi kênh bàn giao và người nhận; bí mật phải được chuyển qua kênh riêng.

## Căn cứ và lưu ý pháp lý

- Bộ luật Dân sự 2015 quy định nền tảng về hợp đồng dịch vụ, quyền và nghĩa vụ
  của bên cung ứng và bên sử dụng dịch vụ. Với dự án tư nhân, nội dung hợp đồng
  và thỏa thuận của hai bên là căn cứ trực tiếp để nghiệm thu.
- Luật Thương mại 2005 điều chỉnh hoạt động cung ứng dịch vụ mang tính thương
  mại và nghĩa vụ thực hiện đúng chất lượng, thời hạn, phương thức đã thỏa
  thuận.
- Luật Giao dịch điện tử 2023 công nhận thông điệp dữ liệu và chữ ký điện tử
  khi đáp ứng điều kiện luật định; vì vậy biên bản có thể ký điện tử thay cho
  bản giấy nếu quy trình ký bảo đảm nhận diện người ký và tính toàn vẹn.
- Thông tư 16/2024/TT-BTTTT quy định lập và quản lý chi phí đầu tư ứng dụng
  công nghệ thông tin; đây là nguồn tham khảo hữu ích về cách tổ chức sản phẩm,
  khối lượng và hồ sơ, nhưng không mặc nhiên áp dụng cho mọi hợp đồng phần mềm
  tư nhân.

Nguồn tra cứu, kiểm tra ngày 12/06/2026:

- Cơ sở dữ liệu quốc gia về văn bản pháp luật, Bộ luật Dân sự 2015:
  <https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=95942>
- Cơ sở dữ liệu quốc gia về văn bản pháp luật, Luật Thương mại 2005:
  <https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=26117>
- Cơ sở dữ liệu quốc gia về văn bản pháp luật, Luật Giao dịch điện tử 2023:
  <https://vbpl.vn/TW/Pages/vbpq-thuoctinh.aspx?ItemID=165913>
- Cơ sở dữ liệu quốc gia về văn bản pháp luật, Thông tư
  16/2024/TT-BTTTT:
  <https://vbpl.vn/TW/Pages/vbpq-luocdo.aspx?ItemID=174916>

## Tài liệu nội bộ dùng làm phụ lục

- [Tổng quan dự án](00-project-overview.md)
- [Danh mục site và đường dẫn](01-site-inventory.md)
- [Bàn giao tài khoản](07-access-and-account-handover.md)
- [Hạ tầng, domain và email](08-deployment-server-domain-email.md)
- [Ranh giới phạm vi](09-scope-boundary-and-next-steps.md)
- [Mẫu biên bản nghiệm thu và bàn giao](templates/01-bien-ban-nghiem-thu-ban-giao.md)
