# Đề xuất chi tiết pages và hình ảnh cho WingsTravel root site

## 1. Mục đích tài liệu

Tài liệu này dùng để chốt hướng nội dung cho `WingsTravel` root site, tức site
trang tổng chạy ở `/` và đóng vai trò umbrella site của toàn hệ.

Mục tiêu:

- xác định rõ `WingsTravel` nên có những page nào
- tách page nào thuộc root site, page nào phải để child site xử lý
- tận dụng tài sản nội dung từ website cũ `doicanhviet.com`
- đề xuất danh mục hình ảnh cần có để có thể thay placeholder bằng nội dung
  production

Tài liệu này là tài liệu định hướng nội dung và information architecture. Nó
không thay thế cho copywriting cuối cùng, nhưng đủ chi tiết để:

- biên tập nội dung
- lập plan nhập liệu CMS
- giao designer / content / media chuẩn bị asset
- tránh để `WingsTravel` root site trở thành bản sao mơ hồ của `WingsGo`

## 2. Nguồn đã đối chiếu

### 2.1. Tài liệu nội bộ

- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`
- `docs/product/phase-1-scope.md`
- `docs/product/phase-1-launch-readiness.md`
- `docs/product/page-composer-and-landing-pattern.md`
- `docs/handover/01-site-inventory.md`
- `app/scripts/seed-subsites.ts`

### 2.2. Website cũ tham chiếu

Đã review `doicanhviet.com` vào ngày `2026-06-08` để lấy:

- cấu trúc menu
- nhóm page thông tin
- loại nội dung đang có thật
- tín hiệu trust và thông tin pháp lý
- cách website cũ đang dùng hình ảnh, bài viết và tour listing

Các URL tham chiếu chính:

- Trang chủ: https://doicanhviet.com/
- Giới thiệu chung: https://doicanhviet.com/gioi-thieu-chung.html
- Liên hệ: https://doicanhviet.com/lien-he.html?handle=85641872
- Chính sách bảo mật: https://doicanhviet.com/chinh-sach-bao-mat.html?handle=41402602

## 3. Kết luận ngắn

`WingsTravel` root site không nên là site bán tour trực tiếp.

Nó nên là:

- lớp trust của thương hiệu
- lớp giới thiệu hệ sinh thái dịch vụ
- lớp điều hướng sang child site đúng line business
- lớp thể hiện năng lực công ty, pháp lý, vận hành và liên hệ
- lớp editorial chung cho tin tức / bài viết thương hiệu / bài định hướng hệ
  sinh thái

Nó không nên giữ:

- listing tour dày đặc như website cũ
- taxonomy tour trong nước / tour nước ngoài / từng quốc gia
- booking flow nặng
- policy transaction quá chi tiết nếu giao dịch thực tế diễn ra ở child site

Nói ngắn gọn: website cũ là site bán tour tổng hợp; `WingsTravel` mới phải là
site umbrella có định vị rõ hơn.

## 4. Những gì rút ra từ website cũ

## 4.1. Website cũ đang có rất nhiều tài sản trust và nội dung nền

Từ website cũ, có thể tái sử dụng logic nội dung sau:

- thông tin công ty
- tầm nhìn / sứ mệnh / giá trị cốt lõi
- giấy phép lữ hành và pháp lý
- địa chỉ, hotline, email, Facebook
- các nhóm năng lực chính:
  - tour trong nước
  - tour nước ngoài
  - tổ chức sự kiện / MICE
  - thuê xe
  - vé máy bay / vé tàu / dịch vụ phụ trợ
- bài viết tin tức / hướng dẫn / mùa vụ

Đây là những phần nên chuyển hóa thành nội dung trust và capability cho
`WingsTravel`.

## 4.2. Website cũ có cấu trúc rất rộng nhưng thiếu phân lớp

Các menu trên website cũ cho thấy:

- rất nhiều taxonomy địa điểm
- rất nhiều route category theo thị trường và điểm đến
- mục dịch vụ và tour trộn vào nhau
- mục thông tin / chính sách tồn tại nhưng nhiều page còn trống

Ví dụ:

- `Chính sách bảo mật` hiện chỉ là `Nội dung đang cập nhật`
- phần legal tồn tại để đủ chân trang nhưng chưa phải bộ nội dung vận hành tốt

Điều này có nghĩa:

- ta không nên bê nguyên website cũ sang root site mới
- chỉ nên lấy phần trust, company profile, năng lực và legal baseline
- phần traffic / conversion theo tour nên phân rã cho `WingsGo`, `WingSide`,
  `WingsPass`, `WingsPlus`, `WingsCare`

## 4.3. Website cũ cho thấy công ty có 2 nhóm tín hiệu mạnh

### Tín hiệu 1: năng lực bán sản phẩm du lịch

- nhiều tour outbound
- có tour domestic
- có bài viết thị trường
- có campaign và lịch khởi hành

### Tín hiệu 2: năng lực pháp lý và vận hành thật

- địa chỉ văn phòng
- trụ sở đăng ký kinh doanh
- hotline
- người đại diện
- giấy phép lữ hành quốc tế

`WingsTravel` root site nên giữ tín hiệu thứ 2 làm lõi, và dùng tín hiệu thứ 1
để điều hướng sang các child site đúng vai trò.

## 5. Đánh giá hiện trạng nội dung root site trong app

Trong seed hiện tại, `WingsTravel` đã có các page mẫu:

- `/`
- `/he-sinh-thai`
- `/ve-wingstravel`
- `/cms-va-van-hanh`
- `/lien-he`

Điểm đúng:

- đã thể hiện `WingsTravel` là umbrella site
- đã có page hệ sinh thái
- đã có page giới thiệu và liên hệ

Điểm chưa đúng với public production:

- page `CMS và vận hành` đang viết nhiều cho ngữ cảnh nội bộ / delivery hơn là
  public visitor
- home page hiện vẫn nghiêng về nói về platform và CMS, chưa nghiêng đủ về
  brand trust, năng lực dịch vụ, chứng cứ pháp lý và business role
- chưa có page riêng cho:
  - năng lực / dịch vụ tổng quan
  - pháp lý / trust / điều kiện chung
  - newsroom / bài viết thương hiệu

Kết luận:

- seed hiện tại tốt cho demo kiến trúc
- chưa đủ tốt cho root site production-facing

## 6. Vai trò nên chốt cho WingsTravel root site

`WingsTravel` root site nên có 5 vai trò:

### 6.1. Brand trust layer

Cho người dùng thấy:

- đây là doanh nghiệp thật
- có giấy phép, địa chỉ, hotline, legal footprint
- có danh mục dịch vụ rõ

### 6.2. Ecosystem gateway

Điều hướng người dùng sang đúng site:

- outbound retail -> `WingsGo`
- inbound consultative -> `WingSide`
- fast track / airport service -> `WingsPass`
- private / MICE / premium -> `WingsPlus`
- insurance / care / claim support -> `WingsCare`

### 6.3. Corporate capability layer

Giải thích công ty làm được gì ở cấp doanh nghiệp:

- tour và chương trình du lịch
- đoàn và MICE
- dịch vụ sân bay / phụ trợ
- bảo hiểm / hậu mãi
- vận hành nội dung và hỗ trợ sau bán

### 6.4. Editorial and trust content layer

Chứa:

- bài giới thiệu
- bài tin tức thương hiệu
- bài tổng quan sản phẩm / mùa vụ / cẩm nang ở mức umbrella

### 6.5. Contact and lead routing layer

Mọi lead không rõ line business đi vào root site sẽ được phân loại để chuyển
sang team phù hợp.

## 7. Cấu trúc page đề xuất cho WingsTravel

## 7.1. Nhóm bắt buộc cho phase 1

### 1. `/` - Trang chủ WingsTravel

### Mục tiêu

- định vị `WingsTravel` là hệ sinh thái du lịch
- thể hiện trust
- điều hướng sang đúng child site
- tạo lead chung nếu khách chưa biết cần line business nào

### Section đề xuất

1. Hero tổng
   - headline định vị hệ sinh thái
   - subcopy ngắn
   - CTA `Khám phá hệ sinh thái`
   - CTA `Liên hệ tư vấn`
2. Khối 5 line business / 5 child site
   - card cho `WingsGo`, `WingSide`, `WingsPass`, `WingsPlus`, `WingsCare`
3. Vì sao chọn WingsTravel
   - giấy phép
   - vận hành nhiều line business
   - đội ngũ tư vấn
   - nội dung và hỗ trợ sau bán
4. Năng lực dịch vụ tổng quan
   - outbound
   - inbound
   - premium / MICE
   - airport service
   - insurance / care
5. Trust proof
   - legal entity
   - giấy phép lữ hành
   - văn phòng / địa chỉ
   - hotline / email
6. Bài viết nổi bật
7. CTA cuối trang + form lead routing

### Ghi chú

Không đưa listing tour chi tiết lên trang chủ root site.

## 7.2. `/he-sinh-thai` - Hệ sinh thái dịch vụ

### Mục tiêu

- giải thích rõ vai trò từng child site
- giúp khách hiểu vì sao hệ được tách site
- làm page trung tâm cho internal linking

### Section đề xuất

1. Hero giới thiệu hệ sinh thái
2. Bản đồ 5 site + use case
3. Bảng đối chiếu:
   - đối tượng khách
   - nhu cầu
   - loại nội dung
   - CTA chính
4. Luồng chọn đúng site
5. CTA sang từng child site

### Ghi chú

Đây nên là page public quan trọng nhất sau homepage.

## 7.3. `/ve-wingstravel` - Về WingsTravel

### Mục tiêu

- kế thừa phần mạnh nhất từ `Giới thiệu chung` của website cũ
- thể hiện lịch sử, sứ mệnh, giá trị cốt lõi, định vị

### Section đề xuất

1. Giới thiệu công ty
2. Hành trình hình thành
3. Tầm nhìn
4. Sứ mệnh
5. Giá trị cốt lõi
6. Năng lực con người / phong cách phục vụ
7. CTA sang page liên hệ hoặc hệ sinh thái

### Nguồn lấy nội dung

- `gioi-thieu-chung.html`
- thông tin công ty trên footer website cũ

## 7.4. `/nang-luc-dich-vu` - Năng lực và dịch vụ

### Mục tiêu

- gom toàn bộ năng lực doanh nghiệp thành một page corporate
- thay cho việc website cũ rải rác `tour`, `dịch vụ`, `sự kiện`, `vé`, `thuê xe`

### Section đề xuất

1. Tổng quan năng lực
2. Outbound retail
3. Inbound và tailor-made journey
4. MICE / đoàn / event
5. Airport service / fast track / add-on
6. Insurance / travel care
7. Hỗ trợ đặt dịch vụ và điều phối team
8. CTA dẫn sang child site tương ứng

### Ghi chú

Page này nói ở mức capability overview, không làm route category chi tiết kiểu
website cũ.

## 7.5. `/tin-cay-va-phap-ly` - Tin cậy và pháp lý

### Mục tiêu

- gom mọi trust signal pháp lý vào một nơi
- giảm cảm giác website chỉ là listing tour

### Section đề xuất

1. Giấy phép lữ hành
2. Pháp nhân công ty
3. Người đại diện
4. Văn phòng giao dịch / trụ sở
5. Kênh liên hệ chính thức
6. Cam kết chất lượng và an toàn dịch vụ
7. CTA tải hồ sơ năng lực hoặc liên hệ

### Ghi chú

Đây là page cần có cho khách doanh nghiệp, khách đối tác, và cho SEO trust.

## 7.6. `/tin-tuc` - News / bài viết thương hiệu

### Mục tiêu

- giữ lớp editorial umbrella
- xuất bản các bài:
  - tin công ty
  - mùa vụ
  - bài định hướng
  - bài tổng hợp từ hệ sinh thái

### Section đề xuất

- archive bài viết
- filter `Tin thương hiệu`, `Mùa vụ`, `Thông báo`, `Cẩm nang`

### Ghi chú

Không dùng root site để cạnh tranh từ khóa tour detail. Phần đó để child site.

## 7.7. `/lien-he` - Liên hệ

### Mục tiêu

- tiếp nhận lead chung
- định tuyến sang đúng line business

### Section đề xuất

1. Form liên hệ chung
2. Trường chọn line business
3. Thông tin văn phòng
4. Hotline / email / Facebook / Zalo nếu có
5. Bản đồ
6. Khối CTA nhanh sang từng child site

### Nguồn lấy nội dung

- `lien-he.html`

## 7.8. Nhóm nên có nếu đủ nguồn lực trong phase 1

### 8. `/ho-so-nang-luc`

Page hoặc downloadable profile dành cho:

- khách doanh nghiệp
- đối tác
- đoàn / MICE
- khách cần chứng minh legal / năng lực

### 9. `/thu-vien`

Chỉ nên làm nếu có ảnh và video thật đủ tốt.

Nếu không, ưu tiên chèn gallery có chọn lọc vào các page chính thay vì mở một
thư viện rỗng.

### 10. `/cau-hoi-thuong-gap`

Chỉ cần nếu root site thực sự tiếp nhiều câu hỏi chung. Nếu FAQ là theo line
business, nên đặt ở child site.

## 8. Nhóm page thông tin / legal nên có

Website cũ có các page:

- phương thức thanh toán
- chính sách bảo mật
- chính sách giao nhận
- chính sách hủy - phạt
- quy định bảo vệ
- quy định thanh toán

Không nên bê nguyên bộ này sang `WingsTravel` root site mà không phân loại.

Đề xuất:

### Bắt buộc

- `/chinh-sach-bao-mat`
- `/dieu-khoan-su-dung`

### Tùy điều kiện giao dịch thực tế

- `/chinh-sach-thanh-toan`
- `/chinh-sach-huy-doi`

### Không ưu tiên ở root site

- `giao nhận`
- các policy quá transaction-specific nếu root site không trực tiếp checkout

Lý do:

- `WingsTravel` là umbrella site
- transaction có thể xảy ra ở child site hoặc qua tư vấn thủ công
- legal root site nên đủ đúng, không nên phình thành một bộ chính sách rời rạc

## 9. Mapping nội dung cũ sang site mới

| Nội dung từ website cũ | Nên đi đâu trong hệ mới |
| --- | --- |
| Giới thiệu chung công ty | `WingsTravel` -> `/ve-wingstravel` |
| Tầm nhìn / sứ mệnh / giá trị cốt lõi | `WingsTravel` -> `/ve-wingstravel` |
| Tour outbound Hàn / Nhật / Trung | `WingsGo` |
| Tour inbound / điểm đến Việt Nam | `WingSide` |
| Fast track / sân bay / add-on | `WingsPass` |
| MICE / private / market cao cấp | `WingsPlus` |
| Insurance / care / claim guidance | `WingsCare` |
| Tin tức thương hiệu chung | `WingsTravel` -> `/tin-tuc` |
| Chính sách privacy / terms | `WingsTravel` |
| Chính sách booking / thanh toán cụ thể theo giao dịch | child site liên quan hoặc quy trình offline |

## 10. Đề xuất navigation cho WingsTravel

## Header nav

- Trang chủ
- Hệ sinh thái
- Về WingsTravel
- Năng lực dịch vụ
- Tin cậy & pháp lý
- Tin tức
- Liên hệ

## Footer nav nhóm 1: hệ sinh thái

- WingsGo
- WingSide
- WingsPass
- WingsPlus
- WingsCare

## Footer nav nhóm 2: công ty

- Về WingsTravel
- Năng lực dịch vụ
- Tin cậy & pháp lý
- Liên hệ

## Footer nav nhóm 3: legal

- Chính sách bảo mật
- Điều khoản sử dụng
- Chính sách thanh toán nếu cần
- Chính sách hủy đổi nếu cần

## 11. Đề xuất hình ảnh cho WingsTravel root site

## 11.1. Nguyên tắc hình ảnh

Root site phải dùng hình ảnh mang tính:

- thương hiệu
- con người
- hệ sinh thái
- legal trust
- dịch vụ thật

Không nên dùng chủ yếu:

- poster giá tour
- banner sale
- ảnh dàn trải quá thiên về một thị trường
- ảnh tối, stock generic, hoặc ảnh chỉ có typography

## 11.2. Danh mục asset bắt buộc

### A. Hero tổng của hệ sinh thái

#### Cần có

- 1 ảnh hero ngang lớn
- concept: nhiều line business trong một hệ
- có thể là collage hoặc ảnh gốc ghép có kiểm soát

#### Mục đích

- dùng cho `/`
- có thể tái dùng cho `/he-sinh-thai`

#### Có thể tận dụng

- `app/scripts/seed-assets/wingstravel-ecosystem-hero.png` làm placeholder

### B. Ảnh đại diện cho 5 child site

#### Cần có

- mỗi child site 1 ảnh cover rõ vai trò
- tổng cộng tối thiểu 5 ảnh

#### Nguồn hiện có

- `wingsgo-*`
- `wingsside-*`
- `wingspass-fast-track-hero.png`
- `wingsplus-private-mice-hero.png`
- `wingscare-travel-care-hero.png`

### C. Ảnh công ty / con người / văn phòng

#### Cần có

- 1 ảnh văn phòng giao dịch
- 1 ảnh team hoặc tư vấn viên
- 1 ảnh hoạt động / tiếp khách / dẫn đoàn

#### Dùng cho

- `/ve-wingstravel`
- `/lien-he`
- `/tin-cay-va-phap-ly`

#### Trạng thái

Website cũ có thông tin địa chỉ mạnh nhưng chưa thể hiện nhiều ảnh corporate
chất lượng cao. Đây là khoảng trống cần chụp mới nếu muốn root site đáng tin.

### D. Ảnh trust / pháp lý

#### Cần có

- scan hoặc ảnh chụp rõ giấy phép lữ hành
- logo / con dấu / văn bản pháp lý quan trọng nếu được phép công khai

#### Dùng cho

- `/tin-cay-va-phap-ly`

### E. Ảnh năng lực dịch vụ

#### Cần có

- 1 ảnh outbound retail
- 1 ảnh inbound experience
- 1 ảnh MICE / corporate group
- 1 ảnh airport service
- 1 ảnh insurance / travel care support

#### Dùng cho

- `/nang-luc-dich-vu`

### F. Editorial images cho bài viết

#### Cần có

- bộ cover nhất quán cho `Tin tức`
- ratio đồng nhất
- alt text rõ

#### Ghi chú

Không dùng poster giá tour làm featured image mặc định cho mọi bài root site.

## 11.3. Số lượng tối thiểu để launch root site

### Bắt buộc

- 1 hero tổng
- 5 ảnh đại diện 5 child site
- 3 ảnh corporate / team / office
- 2 ảnh trust / pháp lý
- 5 ảnh năng lực dịch vụ
- 6 ảnh cover cho 6 bài viết đầu tiên

Tổng tối thiểu nên chuẩn bị: `22 ảnh`.

## 12. Đề xuất block cho từng page

### Trang chủ

- `hero`
- `feature-list`
- `service-highlight`
- `gallery`
- `testimonial` nếu có chứng thực
- `cta`
- `contact-form`

### Hệ sinh thái

- `hero`
- `feature-list`
- `content`
- `cta`

### Về WingsTravel

- `hero`
- `rich-text`
- `feature-list`
- `gallery`
- `cta`

### Năng lực dịch vụ

- `hero`
- `service-highlight`
- `content`
- `cta`

### Tin cậy và pháp lý

- `hero`
- `rich-text`
- `gallery`
- `cta`

### Liên hệ

- `hero`
- `rich-text`
- `contact-form`
- `content`

## 13. Khuyến nghị sửa seed hiện tại

### Nên giữ

- `/`
- `/he-sinh-thai`
- `/ve-wingstravel`
- `/lien-he`

### Nên đổi hướng

- `cms-va-van-hanh`:
  - không nên là page public chính của root site
  - nên chuyển thành:
    - page partner / delivery riêng, hoặc
    - page internal/demo, hoặc
    - thay bằng `nang-luc-dich-vu`

### Nên bổ sung

- `/nang-luc-dich-vu`
- `/tin-cay-va-phap-ly`
- `/tin-tuc`
- legal pages tối thiểu

## 14. Danh sách nội dung cần content team chuẩn bị

### Copy bắt buộc

- headline và subheadline cho homepage
- mô tả ngắn cho 5 child site
- giới thiệu công ty
- tầm nhìn / sứ mệnh / giá trị cốt lõi
- mô tả năng lực dịch vụ
- pháp lý / giấy phép / địa chỉ / hotline / email
- copy cho page liên hệ
- 6 bài viết đầu tiên cho root site
- privacy policy
- terms of use

### Asset bắt buộc

- 22 ảnh như mục 11.3
- file logo chuẩn
- thông tin pháp lý xác nhận lại
- social link chính thức

## 15. Kết luận

Nếu làm đúng vai trò, `WingsTravel` root site phải là:

- site trust
- site umbrella
- site giới thiệu năng lực
- site định tuyến lead
- site editorial chung

Nó không nên là một bản tổng hợp tất cả tour, quốc gia và campaign như website
cũ.

Hướng hợp lý cho phase 1 là:

1. giữ root site gọn nhưng đủ trust
2. dồn conversion theo line business sang child site
3. chuyển website cũ thành nguồn nhập liệu chọn lọc, không phải mẫu để sao chép
4. thay placeholder hiện tại bằng bộ copy và hình ảnh đúng vai trò corporate
