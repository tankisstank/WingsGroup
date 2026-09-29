# WingsGroup Web Brand Asset Guide

Phiên bản: 2026-08-23  
Phạm vi: WingsGroup, WingsGo, WingSide, WingsPlus, WingsPass và WingsCare.

## 1. Nguồn dùng cho website

Thư mục `exports/<site-code>/` là bộ asset web đã xử lý. Mỗi site có một bộ
PNG master với kích thước cố định:

| Asset | Kích thước master | Dùng cho |
| --- | ---: | --- |
| `*-logo-primary.png` | 2400 × 800 px | Header, footer, light surface |
| `*-logo-reverse.png` | 2400 × 800 px | Khu vực nền màu hoặc dark surface |
| `*-mark.png` | 1024 × 1024 px | Avatar, app tile, compact brand mark |
| `*-favicon.png` | 512 × 512 px | Favicon/PWA source |
| `*-og-image.png` | 1200 × 630 px | Open Graph / social preview |

Các file logo ngang được xuất trên canvas lớn cố định. Khi dùng trên web, CSS
chỉ quyết định kích thước hiển thị theo CSS pixel; không crop, không kéo méo,
không tạo thêm bản resize trong repository.

## 2. Quy tắc CSS pixel

```css
.site-logo {
  width: 180px;
  height: 60px;
  object-fit: contain;
  object-position: center;
  display: block;
}

.site-mark {
  width: 40px;
  height: 40px;
  object-fit: contain;
  display: block;
}
```

Kích thước CSS là kích thước hiển thị, không phải kích thước file nguồn. Ví dụ
logo master 2400×800 hiển thị ở `180px × 60px` vẫn giữ đúng tỷ lệ 3:1.

```html
<img
  class="site-logo"
  src="/brand/wingsgroup/wingsgroup-logo-primary.png"
  width="180"
  height="60"
  alt="WingsGroup"
>
```

Khi dùng Next/Image hoặc component tương đương, truyền đúng `width` và
`height` theo CSS pixel của vùng hiển thị; asset vẫn lấy từ file master.

## 3. Mapping thương hiệu

| Site code | Tên hiển thị | Tagline | Màu chính | Màu accent |
| --- | --- | --- | --- | --- |
| `wingsgroup` | WingsGroup | Fly further. Together | `#005090` | `#FDB515` |
| `wingsgo` | WingsGo | Go More. Feel More. | `#005090` | `#0090E0` |
| `wingsside` | WingSide | See Vietnam Differently. | `#005090` | `#104030` |
| `wingsplus` | WingsPlus | More Benefits. More Journeys. | `#005090` | `#6040A0` |
| `wingspass` | WingsPass | Your Journey. Seamless. | `#005090` | `#008070` |
| `wingscare` | WingsCare | We Care. You Enjoy. | `#005090` | `#F02020` |

WingSide có thêm màu phụ `#C09030` cho chi tiết nhấn và biểu tượng. Các màu
trên là token tham chiếu hiện tại từ bộ brand board; không tự ý đổi màu logo
bằng CSS filter.

## 4. Chọn asset theo nền

| Bối cảnh | Asset |
| --- | --- |
| Nền trắng, nền sáng, card sáng | `logo-primary` |
| Nền thương hiệu hoặc nền tối | `logo-reverse` |
| Header mobile compact, avatar, tile | `mark` |
| Browser tab và PWA manifest | `favicon` |
| Chia sẻ mạng xã hội | `og-image` |

Logo phải giữ khoảng thở tự nhiên của canvas. Không đặt logo sát mép container,
không xoay, không bóp tỷ lệ và không thay tagline bằng text CSS nếu tagline đã
nằm trong artwork nguồn.

## 5. Đường dẫn và manifest

Mỗi site có `manifest.json` ghi:

- nguồn PDF thiết kế;
- tagline, value line và màu thương hiệu;
- đường dẫn asset;
- hợp đồng kích thước `webAssetContract`;
- nguyên tắc `unit: css-px`, `doNotCrop: true`, `doNotUpscale: true`.

Mapping tổng hợp có tại [site-brand-reference.json](./site-brand-reference.json).
Script tái tạo asset là [export-assets.py](./scripts/export-assets.py).

## 6. Favicon và metadata

Từ `*-favicon.png` 512×512 có thể tạo các biến thể triển khai bằng công cụ
build/deployment, nhưng không commit thêm các bản resize thủ công vào thư mục
brand master. Tối thiểu website cần khai báo:

```html
<link rel="icon" type="image/png" sizes="512x512" href="/brand/wingsgroup/wingsgroup-favicon.png">
<meta property="og:image" content="/brand/wingsgroup/wingsgroup-og-image.png">
```

## 7. Nguồn gốc và giới hạn

Asset hiện tại được trích xuất từ các PDF CorelDRAW trong `pdf/`. Đây là bản
PNG web master đã xử lý, không phải vector gốc. Nếu có file vector được duyệt,
vector nên trở thành nguồn xuất mới; không chỉnh sửa thủ công các PNG master.
