# US-084 — Thiết kế

## Quyết định thiết kế

Dùng model `editorialBadges` typed, additive trên `TourProducts`. Không tái sử dụng trực tiếp các mảng `badges` tự do hiện có vì chúng không mang semantic kind để điều khiển viền/sticker và có thể đang được dùng cho nội dung cũ.

```text
editorialBadges[]
  kind: hot | specialized | vip
  label: localized text
```

Payload mapper chuẩn hóa dữ liệu một lần thành DTO card:

```text
editorialBadges: [{ kind, label }]
hasHotEditorialBadge: boolean
```

Các component chỉ render DTO. `promoLabel` và `PromotionBadge` tiếp tục là dữ liệu thương mại độc lập.

## CMS và validation

- Field đặt trong Tour Product, gần nhóm card/marketing metadata.
- `kind` là select cố định; `label` là text localized bắt buộc.
- Khi chọn `kind`, CMS điền sẵn label gần nhất theo locale (ví dụ `Tour hot`, `Specialize`, `VIP`); editor được sửa label trước khi lưu. Preset chỉ hỗ trợ authoring, không biến label thành giá trị cố định.
- Chặn kind trùng và quá ba dòng bằng validate server-side; UI chỉ hỗ trợ nhập thuận tiện.
- Query và mapper giữ site scope, locale scope và published behavior hiện có.

## CSS và layout

- Dùng wrapper/pseudo-element hoặc background layer để tạo viền `2px` mà không làm thay đổi box size.
- Sticker dùng một góc nhất quán, có stacking gap và giới hạn chiều rộng; commercial promo badge phải có vùng riêng.
- Card mobile được kiểm tra ở viewport hiện có của suite; text dài phải wrap hoặc truncate có chủ đích.
- `prefers-reduced-motion` tắt chuyển động gradient.

## Cache và tương thích

Revalidation dùng hook hiện có cho `TourProducts`, invalidating homepage, `/tour`, market routes và cache key tenant `wings-go`. Không flush Redis toàn hệ thống. Dữ liệu `badges` legacy không bị đổi nghĩa.

## Quyết định đã chốt ngày 21/10/2026

- Giữ code `specialized`; label nhập riêng theo từng locale, có preset gần nhất để editor không phải nhập lại.
- Sticker editorial đặt góc trên trái; promo thương mại đặt góc trên phải.
