# Tổng hợp nhu cầu khách hàng vòng 2 và hướng triển khai

## 1. Context rút ra từ trao đổi vòng 2

Từ transcript, website benchmark, Google Docs/Sheet và bộ ảnh tour, có thể chốt một số tín hiệu rất rõ:

- Khách hàng không chỉ muốn một website công ty. Họ muốn một hệ nhiều site theo line business.
- Các domain được gán vai trò khá cụ thể:
  - `wingsgroup.vn`: site tổng/hub hệ sinh thái.
  - `wingside.vn`: inbound.
  - `wingsgo.vn`: outbound.
  - `wingsplus.vn`: MICE, private, thị trường khó, long-haul, high-value.
  - `wingspass`: fast track.
  - `wingscare`: insurance.
- Trong phase 1, khách hàng muốn hoàn thiện luôn `wingsgo`, `wingsside`, `wingsplus`, `wingspass`; `wingscare` có thể lùi sau nhưng kiến trúc vẫn phải sẵn.
- Khách hàng thích website có giá hiển thị sẵn, không bắt user phải để lại lead rồi mới biết giá.
- Khách hàng đang vận hành sản phẩm bằng Google Sheets + Google Docs + creative ảnh. Nghĩa là dữ liệu sản phẩm đã có, nhưng đang phân mảnh và chưa có CMS/website làm source-of-truth public.
- Khách hàng đánh giá cao các benchmark inbound có khả năng phân luồng theo ngôn ngữ/thị trường và các benchmark outbound có logic listing + pricing mạnh.
- Khách hàng còn nêu nhu cầu sau này inbound có thể cộng thêm dịch vụ fast track thành full package. Đây là dấu hiệu của product bundling/add-on.

## 2. Khách hàng đang thực sự cần gì

### 2.1. Không phải chỉ cần "làm web"

Thứ khách hàng đang cần là một nền `multisite commerce-content platform` cho travel, nơi mỗi site có vai trò kinh doanh riêng nhưng cùng dùng một lõi quản trị nội dung và sản phẩm.

### 2.2. Cần 3 lớp trải nghiệm khác nhau

- `Outbound retail` cho `wingsgo`: nhiều lịch khởi hành, giá rõ, campaign theo mùa/thị trường, card tour dễ duyệt.
- `Inbound consultative` cho `wingsside`: destination hub, trip planning, market/language routing, form inquiry và storytelling đủ trust.
- `Private/MICE/high-ticket` cho `wingsplus`: landing theo nhu cầu hoặc theo thị trường khó, thiên về tư vấn và proposal hơn là bảng giá đại trà.
- `Service pricing` cho `wingspass`: bảng giá cấu trúc, add-on, sân bay, logic bán kèm package.

### 2.3. Cần content model sâu hơn page builder cơ bản

Bộ dữ liệu khách gửi cho thấy phase 1 không thể dừng ở `pages/posts/media` thuần marketing. Ít nhất cần thêm các model kiểu:

- `tourLines` hoặc `products`
- `departureBatches`
- `pricingRows`
- `destination / market taxonomy`
- `airlines`
- `tourCampaigns`
- `serviceAddons`
- `fastTrackServices`
- `departureVariants` theo Hà Nội / TP.HCM khi dùng chung một chương trình

Nếu không có lớp dữ liệu này, đội ngũ sẽ quay về sửa tay bằng ảnh và Google Sheet, còn website chỉ là vỏ.

## 3. Map vào mô tả dự án hiện tại

Điều này không mâu thuẫn với định hướng hiện tại của repo. Ngược lại, nó làm rõ phase 1 cần đi sâu hơn ở lớp content structure.

Những gì vẫn đúng theo chiến lược đã chốt:

- `Payload-first` là hợp lý.
- `Multisite-ready` là bắt buộc, không phải nice-to-have.
- `SQLite local / PostgreSQL production / Redis support` vẫn đúng.
- Không nên trượt sang CRM đầy đủ hay booking engine đầy đủ ngay phase 1.

Những gì cần bổ sung so với mức hiện tại:

- Không chỉ có `pages` và `landing pages`, mà phải có product schema phục vụ tour/service thật.
- Không chỉ có site-aware branding/SEO, mà phải có site-aware product strategy.
- Không chỉ có page wizard, mà phải có editorial workflow cho lịch khởi hành, giá, tour detail, và campaign landing theo mùa/thị trường.

## 4. Đề xuất triển khai để hoàn thành đúng nhu cầu

### 4.1. Ưu tiên business release

Thứ tự hợp lý:

1. `wingsgo.vn`
2. `wingside.vn`
3. `wingspass`
4. `wingsplus.vn`
5. `wingscare` sau cùng nếu còn capacity

Lý do:

- `wingsgo` đang có dữ liệu tour mạnh nhất và gần launch nhất.
- `wingsside` là nhu cầu chiến lược vì khách hàng nhắc rõ inbound + language/market routing.
- `wingspass` chưa có domain live nhưng đã có rate card rất cụ thể.
- `wingsplus` cần kỹ hơn về định vị và mẫu landing cao giá trị.

### 4.2. Information architecture đề xuất

- `wingsgroup`: corporate hub + điều hướng hệ sinh thái.
- `wingsgo`: market pages (`Han Quoc`, `Nhat Ban`, `Trung Quoc`), seasonal campaign pages, tour detail pages, lịch khởi hành, bảng giá.
- `wingsside`: destination pages, travel style pages, trip planner, inquiry pages, market/language routing.
- `wingsplus`: private/MICE pages, special market pages, proposal/request pages.
- `wingspass`: pricing table, airport/service taxonomy, add-on pages, contact/request flows.

### 4.3. CMS/data model nên làm ngay

- `sites`
- `siteSettings`
- `pages`
- `tourProducts`
- `tourDepartures`
- `tourCampaigns`
- `destinations`
- `markets`
- `airlines`
- `fastTrackServices`
- `fastTrackPriceTables`
- `media`
- `forms / inquiries`

### 4.4. UI patterns nên có ngay trong phase 1

- `market landing page` có nhiều package con và bảng giá.
- `tour detail page` có itinerary theo ngày, highlight, giá, lịch khởi hành, CTA.
- `destination / inbound planning page` kiểu consultative, nhiều trust + form.
- `service pricing page` cho fast track với bảng dữ liệu rõ ràng.
- `language / market switcher` để điều hướng user sang đúng site hoặc đúng locale.

### 4.5. Quy trình nhập liệu thực tế

Vì khách hàng đang làm việc bằng Google Sheets và Docs, nên phase 1 cần tối thiểu một trong hai hướng:

- import bán tự động từ sheet/doc vào Payload, hoặc
- form nhập liệu trong CMS mô phỏng rất sát tư duy bảng lịch khởi hành hiện tại.

Nếu bắt user nhập bằng schema quá kỹ thuật, adoption sẽ thấp.

## 5. Kết luận làm việc

Mong muốn thật của khách hàng là:

- có một hệ website nhiều site phục vụ nhiều mảng kinh doanh du lịch khác nhau,
- có thể hiển thị giá và lịch khởi hành rõ ràng,
- có thể bán cả tour retail lẫn inbound inquiry và fast-track add-on,
- có CMS đủ thực dụng để thay thế dần Google Sheets + ảnh + docs,
- nhưng chưa cần đi vào booking engine/CRM phức tạp ở phase 1.

Để hoàn thành đúng nhu cầu đó, đội triển khai nên giữ kiến trúc multisite Payload hiện tại nhưng mở rộng phase 1 theo hướng `productized content platform`, không chỉ là `marketing page CMS`.
