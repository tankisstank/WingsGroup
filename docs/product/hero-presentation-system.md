# Hero Presentation System

## Mục tiêu

Hero của `WingsGroup` là một feature có thể mở rộng, không phải một component
đơn lẻ. Người quản trị chọn kiểu hiển thị trong Payload CMS; developer có thể
thêm style mới mà không sửa route, site context, theme token hoặc các block nằm
ngoài hero.

## Phạm vi

Feature áp dụng cho hero có `type = highImpact`.

Các hero `mediumImpact` và `lowImpact` tiếp tục dùng component riêng. Việc thêm
presentation cho hai loại này phải là một story khác.

## Mô hình dữ liệu

Hero high-impact có hai trục độc lập:

- `variant`: hành vi nghiệp vụ, ví dụ `standard`, `retail-departures`,
  `planner`, `utility`.
- `presentation`: bố cục và hiệu ứng thị giác.

Không dùng `presentation` để kiểm tra site, domain hoặc line business. Không
dùng `variant` để quyết định grid, vị trí visual hoặc background effect.

Các presentation tích hợp sẵn:

| Key | Tên CMS | Mục đích |
| --- | --- | --- |
| `centered-visual` | Style 1 - Centered visual | Heading, mô tả và CTA căn giữa; visual lớn nằm dưới. |
| `split-visual` | Style 2 - Split visual | Nội dung một bên; visual hoặc mockup bên còn lại. |
| `layered-visuals` | Style 3 - Layered visuals | Nhiều visual card nổi, nghiêng hoặc xếp lớp quanh nội dung trung tâm. |
| `gradient-mesh` | Style 4 - Animated gradient mesh | Nội dung trung tâm trên nền mesh gradient chuyển động nhẹ. |

`supportingMedia` là danh sách tối đa ba visual phụ, chỉ xuất hiện trong CMS
khi chọn `layered-visuals`. Nếu thiếu visual phụ, frontend lặp visual chính để
layout vẫn ổn định.

## Quy tắc CMS

- Field `Kiểu hiển thị hero` chỉ hiển thị khi `type = highImpact`.
- Option trong CMS phải lấy từ
  `app/src/heros/presentations/registry.ts`; không khai báo danh sách thứ hai.
- Field `Visual bổ sung` chỉ hiển thị với `layered-visuals`.
- Theme màu, typography, radius, spacing và button style tiếp tục lấy từ
  `site-settings` và `ThemePresets`.
- Người quản trị được đổi presentation trên từng page, theo từng locale hiện
  có của page.
- Dữ liệu cũ không có `presentation` phải render được:
  - `standard` fallback về `centered-visual`.
  - variant nghiệp vụ khác fallback về `split-visual`.

## Thao tác trong CMS

1. Đăng nhập `/admin` và mở collection `Pages`.
2. Chọn page cần chỉnh, ví dụ page có `pathname = /` cho trang chủ.
3. Trong nhóm `Hero`, chọn `High Impact`.
4. Chọn một option tại field `Kiểu hiển thị hero`.
5. Với `Style 3 - Layered visuals`, chọn tối đa ba ảnh tại `Visual bổ sung`.
6. Giữ `Hành vi nghiệp vụ` độc lập với presentation; thông thường dùng
   `standard` nếu hero không có panel nghiệp vụ riêng.
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
- Phải hỗ trợ `prefers-reduced-motion`.
- Mobile không được có horizontal overflow.

## Quy tắc thêm presentation mới

1. Thêm metadata vào `heroPresentationDefinitions`.
2. Thêm component tương ứng vào `heroPresentationComponents`.
3. Thêm CSS dưới namespace `hero-presentation`.
4. Cập nhật tài liệu này với key, mục đích và field phụ nếu có.
5. Thêm integration test cho registry và resolver.
6. Thêm Playwright route fixture, desktop assertion và mobile overflow check.
7. Chạy generate types nếu schema Payload thay đổi.
8. Tạo migration trước khi đưa schema lên PostgreSQL staging/production.

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

- Edit page high-impact hiển thị field `Kiểu hiển thị hero`.
- Danh sách có đủ bốn style đã đăng ký.
- Chọn `layered-visuals` làm xuất hiện field `Visual bổ sung`.
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
