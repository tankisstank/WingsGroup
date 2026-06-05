# Phân tích website - tugo.vn

- Loại: Benchmark outbound kiểu retail/ecommerce
- URL research: `https://tugo.vn/`
- Trạng thái tại thời điểm research 2026-06-05: `200`
- Title hiện tại: `Công ty du lịch Tugo`

## Giao diện

Giao diện thiên về storefront/ecommerce, có dấu hiệu nền tảng Shopify (`collections`, `products`, `cart`, `checkout`). Điều này làm việc duyệt tour giống duyệt catalog sản phẩm hơn là một website CMS thuần.

## Nội dung

Nội dung chia theo khu vực mạnh như Mỹ-Canada, Châu Âu, Úc, Châu Á, tour trong nước, du thuyền, visa. CTA là xem chi tiết, liên hệ, và luồng form/contact khá tiêu chuẩn storefront.

## Phân cấp URL

Hierarchy rất rõ kiểu commerce: `collections/<group>`, `products/<tour>`, `pages/about-us`, `blogs/...`, cùng các route hệ thống `account`, `cart`, `search`, `checkout`.

### Dấu hiệu cấu trúc thu được từ homepage/sitemap

- `collections`: 49 liên kết nội bộ nổi bật
- `products`: 6 liên kết nội bộ nổi bật
- `pages`: 4 liên kết nội bộ nổi bật
- `blogs`: 4 liên kết nội bộ nổi bật
- `(home)`: 2 liên kết nội bộ nổi bật
- `account`: 1 liên kết nội bộ nổi bật
- `cart`: 1 liên kết nội bộ nổi bật
- `checkout`: 1 liên kết nội bộ nổi bật
- `search`: 1 liên kết nội bộ nổi bật

### Một số URL tiêu biểu

- Trang chủ: `https://tugo.vn/`
- Giới thiệu: `https://tugo.vn/pages/about-us`
- Mỹ - Canada: `https://tugo.vn/collections/my-canada`
- Tour Châu Âu: `https://tugo.vn/collections/tour-chau-au`
- Tour Úc: `https://tugo.vn/collections/tour-uc`
- Tour Châu Á: `https://tugo.vn/collections/tour-chau-a`
- Tour trong nước: `https://tugo.vn/collections/tour-trong-nuoc`
- Du thuyền: `https://tugo.vn/collections/du-thuyen`

### Sitemap ghi nhận được

- `https://tugo.vn/sitemap.xml`: 6 mục

## Hàm ý cho WingsTravel

Đây là benchmark rất hợp cho `wingsgo.vn` và một phần `wingsplus.vn` ở góc nhìn phân nhóm outbound theo khu vực và mindset catalog bán tour. Tuy nhiên kiến trúc Payload hiện tại hợp với content commerce nhẹ hơn là full cart/checkout.
