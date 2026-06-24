# Hero Presentation Development Guide

## Kiến trúc

Hệ thống có ba lớp độc lập:

1. Base template trong code: DOM, component, capability và validation.
2. Presentation preset trong Payload: slot, visual settings và motion an toàn.
3. Page content: rich text, CTA, media, slides và video.

Không branch theo site code, hostname hoặc pathname. Brand đi qua `--site-*`;
business behavior đi qua `variant`.

## Thêm base template

1. Thêm key và capability vào `heroPresentationDefinitions`.
2. Tạo component nhận `HeroPresentationProps`.
3. Đăng ký component trong `heroPresentationComponents`.
4. Chỉ dùng input đã normalize; component không query Payload.
5. Namespace CSS bằng `hero-presentation--<key>`.
6. Thêm seed preset nếu template cần xuất hiện trong CMS.
7. Generate Payload types nếu schema thay đổi.
8. Tạo PostgreSQL migration trước staging.

Capability phải mô tả đúng: `singleMedia`, `multipleMedia`,
`perSlideContent`, `video`, `businessPanel`.

## Motion contract

- Chỉ animate opacity, transform hoặc background.
- Hỗ trợ `prefers-reduced-motion`.
- Carousel dừng khi tab hidden, hero ngoài viewport hoặc người dùng pause.
- Autoplay interval: 3000-15000 ms.
- Transition duration: 200-2000 ms.
- Controls tối thiểu 44px và có accessible name.
- Video autoplay phải muted và playsInline.

## Resolver contract

Không thay đổi precedence:

1. page override
2. site inheritance
3. legacy presentation
4. variant fallback

Null từ Payload phải được normalize về default, không ép thành `0` hoặc `false`.

## Validation bắt buộc

- Unit: resolver, normalization, invalid preset.
- Component: component map, controls/timer, reduced-motion/fallback.
- Integration: registry uniqueness, seed uniqueness, site assignment.
- E2E frontend: marker, visual surface, interaction, mobile overflow.
- E2E CMS: site default, page inheritance/override và conditional fields.
- Visual: baseline chọn lọc với animation bị cố định.

## Performance

- SSR phải có visual đầu hoặc poster.
- Chỉ media đầu được priority.
- Không preload toàn bộ carousel.
- Media mobile được dùng ở viewport nhỏ.
- Không thêm animation dependency nếu CSS/React controller đáp ứng được.

## Migration

Local dùng SQLite schema push để bootstrap, nhưng schema push không alter đầy đủ
database cũ. Staging/production phải dùng migration PostgreSQL đã commit.

Khi collection hoặc page-version schema đổi, migration phải bao gồm page table,
version table, array child tables, media/relationship foreign keys, indexes và
locked-document relation nếu thêm collection.
