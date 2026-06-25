# Hero Presentation System

## Mục tiêu

Hero của `WingsGroup` là một feature có thể mở rộng, không phải một component
đơn lẻ. Hệ thống dùng mô hình hybrid: developer quản trị base template,
component, capability và validation trong code; super-admin quản trị preset an
toàn; site-manager chọn default theo site; editor kế thừa hoặc override trên
từng page.

## Phạm vi

Feature áp dụng cho hero có `type = highImpact`.

Các hero `mediumImpact` và `lowImpact` tiếp tục dùng component riêng. Việc thêm
presentation cho hai loại này phải là một story khác.

## Mô hình dữ liệu

Hero high-impact có hai trục độc lập:

- `variant`: hành vi nghiệp vụ, ví dụ `standard`, `retail-departures`,
  `planner`, `utility`.
- `presentation`: bố cục và hiệu ứng thị giác. Trong flow CMS mới, trục này
  được điều khiển qua `presentationMode` + `presentationPreset`; field
  `hero.presentation` chỉ còn là legacy fallback.

Không dùng `presentation` để kiểm tra site, domain hoặc line business. Không
dùng `variant` để quyết định grid, vị trí visual hoặc background effect.

Các base template tích hợp sẵn:

| Key | Tên CMS | Mục đích |
| --- | --- | --- |
| `centered-visual` | Style 1 - Centered visual | Heading, mô tả và CTA căn giữa; visual lớn nằm dưới. |
| `split-visual` | Style 2 - Split visual | Nội dung một bên; visual hoặc mockup bên còn lại. |
| `layered-visuals` | Style 3 - Layered visuals | Nhiều visual card nổi, nghiêng hoặc xếp lớp quanh nội dung trung tâm. |
| `gradient-mesh` | Style 4 - Animated gradient mesh | Nội dung trung tâm trên nền mesh gradient chuyển động nhẹ. |
| `planner-split` | Planner split | Nội dung tư vấn và planner panel kết hợp visual lớn. |
| `cinematic-carousel` | Cinematic carousel | Hai đến tám ảnh, nội dung theo slide, autoplay và controls. |
| `video-background` | Video background | Video desktop/mobile với poster và fallback. |

Thứ tự resolve presentation:

1. Page override hợp lệ.
2. Page inherit và site có default preset.
3. Dữ liệu cũ dùng `hero.presentation`.
4. Fallback cũ theo `variant`.

Site default chỉ chứa preset và business variant. Headline, CTA, ảnh, slide và
video luôn thuộc page để tránh một thay đổi site làm đổi nội dung hàng loạt.

`supportingMedia` là danh sách tối đa ba visual phụ, chỉ xuất hiện trong CMS
khi chọn `layered-visuals`. Nếu thiếu visual phụ, frontend lặp visual chính để
layout vẫn ổn định.

## Quy tắc CMS

- `Theme Manager` ở `/admin/theme` là nơi chọn `site default hero`.
- `Pages` chỉ quyết định page đang `inherit` hay `override`.
- `presentationMode = inherit` dùng default từ `site-settings.heroDefaults`.
- `presentationMode = override` yêu cầu chọn page-level presentation preset.
- `hero.presentation` chỉ giữ để đọc dữ liệu cũ; không còn là control chính cho
  editor/site-manager.
- Preview trong page guide phải hiển thị đúng source đang resolve:
  `site`, `page`, `legacy`, hoặc `fallback`.
- Theme màu, typography, radius, spacing và button style tiếp tục lấy từ
  `site-settings` và `ThemePresets`.
- Media luôn nằm ở page hiện tại:
  - centered/split/planner/layered: dùng `Ảnh hero chính`
  - layered: có thể thêm `Visual bổ sung`
  - carousel: dùng `Slides`
  - video background: dùng `Video hero`, poster là bắt buộc
- Dữ liệu cũ không có presentation mode vẫn phải render được:
  - nếu có `hero.presentation` hợp lệ thì source là `legacy`
  - nếu không có legacy thì fallback theo `variant`

## Thao tác trong CMS

### Đổi site default hero

1. Đăng nhập `/admin/theme`.
2. Chọn site cần cấu hình.
3. Duyệt preset trong gallery preview và chọn hero phù hợp.
4. Chọn `Business behavior` mặc định cho site.
5. Kiểm tra impact summary để biết bao nhiêu page đang `inherit`.
6. Dùng `Lưu hero mặc định` nếu chỉ đổi hero, hoặc `Lưu tất cả` nếu đổi cả theme shell.

### Đổi hero của một page

1. Đăng nhập `/admin` và mở `Pages`.
2. Chọn page cần chỉnh.
3. Trong nhóm `Hero`, chọn `High Impact`.
4. Đặt `Nguồn presentation`:
   - `Kế thừa từ site` nếu page dùng site default hero
   - `Override trên page` nếu page cần preset riêng
5. Nếu override, chọn `Presentation override`.
6. Dùng guide để xem source đang resolve và nhóm media cần cấu hình ngay.
7. Save draft để preview hoặc publish để áp dụng lên public site.

Frontend phải phản ánh lựa chọn bằng attribute `data-hero-presentation`. Nếu
field không xuất hiện, kiểm tra hero đang dùng đúng type `highImpact`.

## Quy tắc frontend

- `HighImpactHero` chỉ làm nhiệm vụ resolve presentation, chuẩn bị business
  panel và gọi component từ registry.
- Mỗi presentation là một component riêng trong
  `app/src/heros/presentations/`.
- Component chỉ nhận content đã cấu trúc: badge, rich text, links, media,
  supporting media, postcards và business panel.
- Mỗi hero public phải có:
  - `data-hero-presentation`
  - `data-hero-variant`
- Style phải dùng `--site-*` token. Không hardcode tên site hoặc kiểm tra URL.
- Không sửa DOM của block phía dưới để phục vụ hero.
- Không dùng animation làm thay đổi layout. Chỉ animate `transform`, `opacity`
  hoặc background layer.
- `planner-split` trên desktop/laptop phải giữ cấu trúc hai khối tổng thể:
  copy bên trái, unified stage bên phải. Business panel chỉ được nằm trong
  phạm vi stage, có thể overlay nội bộ với visual nhưng không được tràn sang
  cột copy. Tablet landscape có thể giữ hai khối; phone quay về stacked mode.
- Phải hỗ trợ `prefers-reduced-motion`.
- Carousel phải có pause, keyboard-accessible controls, và dừng khi tab/hero
  không active.
- Video phải muted, playsInline và quay về poster khi lỗi hoặc reduced-motion.
- Mobile không được có horizontal overflow.

## Quy tắc thêm presentation mới

Chi tiết thực hiện nằm trong
`docs/handover/hero-presentation-development-guide.md`.

Không thêm `if (siteCode === ...)` hoặc `if (pathname === ...)` vào presentation.
Khác biệt theo brand phải đi qua theme token; khác biệt nghiệp vụ phải đi qua
`variant`.

## Quy tắc test

### Integration

- Registry có key duy nhất.
- Mỗi definition có component tương ứng.
- Resolver chấp nhận key hợp lệ.
- Resolver fallback đúng cho dữ liệu cũ.
- Payload schema chỉ chấp nhận option đã đăng ký.

### Playwright frontend

Mỗi presentation phải được render bằng fixture page riêng:

- desktop: marker đúng, heading và CTA hiển thị, visual/presentation surface tồn tại
- mobile `390x844`: không có horizontal overflow
- CTA chính có touch target tối thiểu 44px
- `layered-visuals`: có tối thiểu ba visual layer
- `gradient-mesh`: có đủ mesh layer và nội dung vẫn đọc được

### Playwright CMS

- `/admin/theme` hiển thị preset browser với preview và impact summary.
- Split save không overwrite group không liên quan.
- Edit page high-impact hiển thị `Nguồn presentation`.
- Guide page resolve đúng source khi page `inherit` site default.
- Save draft và public preview phải giữ đúng `data-hero-presentation`.

## Validation commands

```text
cd app
pnpm run generate:types
pnpm exec tsc --noEmit
pnpm run lint
pnpm run test:int
pnpm run test:e2e
pnpm run build
```

## Production migration

Schema thêm `hero.presentation` và `hero.supportingMedia`. SQLite local có thể
bootstrap bằng push, nhưng staging và production PostgreSQL phải chạy Payload
migration được commit cùng feature.
