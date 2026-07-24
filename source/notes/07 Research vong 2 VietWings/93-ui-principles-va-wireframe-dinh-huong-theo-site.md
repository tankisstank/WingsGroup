# UI principles và wireframe định hướng theo từng site Wings

## 1. Mục tiêu của tài liệu

Tài liệu này chuyển research đối thủ sang định hướng UI có thể dùng cho thiết kế và implementation phase 1.

Mục tiêu là xác định:

- mỗi site nên có interaction model gì,
- giao diện nên ưu tiên điều gì trên màn hình đầu,
- bố cục trang chủ và trang quan trọng nên đi theo hướng nào,
- và nên tránh các lỗi giao diện nào.

## 2. Nguyên tắc UI chung cho toàn hệ

### 2.1. Một hệ sinh thái, nhưng không dùng một kiểu homepage

Không nên lấy một homepage rồi đổi màu cho:

- `wingsgo`
- `wingsside`
- `wingsplus`
- `wingspass`

Vì mỗi site đang giải quyết một hành vi người dùng khác nhau.

### 2.2. Mỗi site phải có 1 CTA chính rất rõ

- `wingsgo`: xem tour / xem giá / chọn lịch
- `wingsside`: plan trip / gửi inquiry
- `wingsplus`: yêu cầu proposal / tư vấn đoàn riêng
- `wingspass`: xem bảng giá / đặt dịch vụ

### 2.3. Hero không chỉ để đẹp

Hero phải trả lời ngay:

- site này bán gì,
- cho ai,
- bước tiếp theo là gì.

### 2.4. Giá và trust phải xuất hiện đúng nơi

- site retail cần giá xuất hiện sớm
- site consultative cần trust và destination/story xuất hiện sớm
- site service utility cần bảng giá xuất hiện rất sớm

### 2.5. CMS-first nhưng không “CMS look”

UI cần đủ linh hoạt cho editor, nhưng không được trông như:

- website demo template,
- blog chung chung,
- hoặc cổng thông tin quá dày và loãng ưu tiên.

## 3. Interaction model theo từng site

### 3.1. `wingsgo`

Interaction model:

- `browse and compare`
- `see price fast`
- `open tour detail`
- `leave inquiry / giữ chỗ`

Đây là site retail outbound.

### 3.2. `wingsside`

Interaction model:

- `discover destination`
- `understand travel style`
- `trust the operator`
- `send custom inquiry`

Đây là site inbound consultative.

### 3.3. `wingsplus`

Interaction model:

- `understand capability`
- `see premium trip possibilities`
- `submit private/MICE brief`

Đây là site high-value consultative.

### 3.4. `wingspass`

Interaction model:

- `check service`
- `check price`
- `understand airport applicability`
- `contact / request booking`

Đây là site utility + service pricing.

## 4. Định hướng UI cho `wingsgo`

### 4.1. Tính cách giao diện

- năng động
- rõ giá
- nhiều sản phẩm nhưng không rối
- màu sắc sống động hơn các site còn lại

### 4.2. Trang chủ đề xuất

Thứ tự khối:

1. `Hero ngắn + market switch nhanh`
2. `Khối chùm tour nổi bật theo thị trường`
3. `Bảng lịch khởi hành / giá nhanh`
4. `Campaign theo mùa`
5. `Tour card grid`
6. `Trust signals`
7. `Form tư vấn nhanh`

### 4.3. Wireframe text

```text
Header
  Logo | Thị trường | Lịch khởi hành | Campaign | Liên hệ

Hero
  Headline: Chùm tour outbound giá rõ, lịch rõ
  Subtext: Hàn - Nhật - Trung và các thị trường nổi bật
  CTA 1: Xem lịch khởi hành
  CTA 2: Xem tour theo thị trường

Quick Market Tabs
  Hàn Quốc | Nhật Bản | Trung Quốc | Châu Âu | Mỹ

Price Schedule Preview
  Bảng rút gọn theo thị trường + ngày gần nhất + giá từ

Season Campaigns
  3 card lớn: Hè 2026 / Mùa thu Nhật / Hoa anh đào Hàn

Tour Grid
  image | tên tour | thời lượng | hãng bay | giá từ | CTA

Trust Row
  Visa | Hàng không | HDV | Bảo hiểm | Kinh nghiệm

Inquiry Strip
  form ngắn hoặc CTA liên hệ nhanh

Footer
```

### 4.4. Trang thị trường

Mỗi trang thị trường như `Hàn Quốc`, `Nhật Bản`, `Trung Quốc` nên có:

- hero riêng theo thị trường
- chùm tour theo mùa
- bảng khởi hành và giá
- FAQ
- card tour detail

### 4.5. Trang chi tiết tour

Bố cục nên là:

```text
Hero summary
  tên tour | thời lượng | hãng bay | giá từ | CTA

Highlights

Departure table

Itinerary by day

Includes / excludes

Gallery / poster

FAQ

Inquiry form
```

## 5. Định hướng UI cho `wingsside`

### 5.1. Tính cách giao diện

- cao cấp vừa phải
- sạch
- trust-first
- ảnh đẹp
- thiên về destination và planning

### 5.2. Trang chủ đề xuất

Thứ tự khối:

1. `Hero destination-led`
2. `Why travel with WingSide`
3. `Destination hub`
4. `Travel styles`
5. `Sample itineraries / packages`
6. `Testimonials`
7. `Plan your trip CTA`
8. `Travel guide`

### 5.3. Wireframe text

```text
Header
  Logo | Destinations | Travel Styles | Vietnam Tours | Travel Guide | About | Contact

Hero
  Headline: Tailor-made Vietnam journeys
  Subtext: Private, flexible, locally designed experiences
  CTA 1: Plan your trip
  CTA 2: Explore destinations

Trust Section
  local expert | flexible itinerary | curated stays | support

Destination Grid
  Hanoi | Halong | Ninh Binh | Hoi An | Hue | Mekong

Travel Style Row
  Luxury | Family | Culture | Adventure | Honeymoon

Sample Itineraries
  curated cards, không cần dồn giá ở đây

Why WingSide
  nội dung proof + process

Testimonials

Plan Your Trip CTA
  form hoặc CTA block lớn

Travel Guide Preview

Footer
```

### 5.4. Trang destination

Mỗi destination page nên có:

- overview
- best time to go
- top experiences
- related tours
- related guide articles
- CTA custom inquiry

### 5.5. Điểm cần tránh

- không biến thành site bán card tour dày như outbound
- không nhồi quá nhiều giá vào homepage
- không dùng visual quá thương mại nếu muốn giữ inbound premium

## 6. Định hướng UI cho `wingsplus`

### 6.1. Tính cách giao diện

- premium
- ít nhưng đắt
- nhiều ảnh lớn
- ít card nhỏ
- nhấn năng lực triển khai và proposal

### 6.2. Trang chủ đề xuất

Thứ tự khối:

1. `Hero statement`
2. `Private / MICE / Special market entry points`
3. `Selected destinations`
4. `Capability / why choose us`
5. `Case studies or sample journeys`
6. `Proposal CTA`

### 6.3. Wireframe text

```text
Header
  Logo | Private Tours | MICE | Special Markets | About | Request Proposal

Hero
  Headline: Tailored journeys for high-value travel needs
  Subtext: Private, MICE, long-haul, special market programs
  CTA 1: Request proposal
  CTA 2: Explore destinations

Entry Cards
  Private Tours | MICE | Special Markets

Featured Destinations
  Maldives | Europe | USA | Russia | South Africa

Capability Section
  planning | operations | airline strength | visa support

Sample Journey Stories

Proposal CTA Block

Footer
```

### 6.4. Nguyên tắc quan trọng

- ít dùng bảng giá dày trên homepage
- giá có thể nằm ở page sản phẩm cụ thể hoặc luồng tư vấn
- phải tạo cảm giác đáng tin và chuyên nghiệp hơn là “shop tour”

## 7. Định hướng UI cho `wingspass`

### 7.1. Tính cách giao diện

- cực rõ
- utility-first
- thông tin cấu trúc
- đọc nhanh
- tin cậy

### 7.2. Trang chủ đề xuất

Thứ tự khối:

1. `Hero ngắn`
2. `Bảng giá nổi bật ngay`
3. `Dịch vụ theo sân bay`
4. `Add-on`
5. `FAQ`
6. `CTA liên hệ / booking`

### 7.3. Wireframe text

```text
Header
  Logo | Bảng giá | Sân bay | Add-on | FAQ | Liên hệ

Hero
  Headline: Fast Track nhanh chóng, ưu tiên, tiện nghi
  Subtext: Giá rõ theo sân bay và loại dịch vụ
  CTA 1: Xem bảng giá
  CTA 2: Liên hệ đặt dịch vụ

Pricing Table Preview
  tabs: Nội Bài | Đà Nẵng | Phú Quốc | Tân Sơn Nhất

Service Explainer
  Đón nhập cảnh nhanh | VIP | Xuất cảnh ưu tiên | Add-on

Airport Cards

FAQ

Contact CTA

Footer
```

### 7.4. Điểm cần tránh

- không nên làm quá “travel inspiration”
- không dùng quá nhiều hero ảnh vô nghĩa
- không giấu bảng giá xuống sâu

## 8. Design system gợi ý theo site

### 8.1. `wingsgo`

- màu tươi, tương phản cao
- card grid mạnh
- badge giá/khởi hành rõ
- icon hàng không/visa/HDV dễ đọc

### 8.2. `wingsside`

- nền sáng, ảnh lớn, nhiều khoảng trắng
- typography thanh hơn
- CTA ít nhưng rõ
- ưu tiên destination imagery

### 8.3. `wingsplus`

- tone sang hơn
- ít khối nhỏ
- spacing rộng
- visual “proposal/premium”

### 8.4. `wingspass`

- bảng biểu rõ
- màu phân loại dịch vụ/sân bay
- hierarchy kiểu dashboard-lite

## 9. Thứ tự ưu tiên nếu bắt đầu wireframe ngay

Nên wireframe trước:

1. `wingsgo` homepage
2. `wingsgo` market page
3. `wingsgo` tour detail page
4. `wingsside` homepage
5. `wingsside` destination page
6. `wingspass` pricing page
7. `wingsplus` homepage

Lý do:

- đây là các trang quyết định model UI của toàn hệ,
- và cũng là các trang sát nhu cầu doanh thu nhất.

## 10. Kết luận

Nếu rút gọn thành một câu:

- `wingsgo` phải dễ mua,
- `wingsside` phải đáng tin để gửi yêu cầu,
- `wingsplus` phải đủ sang để xin proposal,
- `wingspass` phải đủ rõ để chốt dịch vụ nhanh.

Đó là 4 hướng UI khác nhau, và đó cũng nên là nền cho wireframe phase 1.
