# ADR — US-084 editorial badges trên card tour

**Ngày:** 21/10/2026  
**Trạng thái:** Đã chốt và triển khai; chờ production release gates

## Bối cảnh

WingsGo cần gắn nhãn biên tập như tour hot, specialize và VIP trên card list. `promoLabel` hiện thuộc luồng giá/khuyến mại của US-083. Product schema cũng có các mảng `badges`/`marketCard.badges` dạng text cũ, chưa có loại semantic để quyết định viền rainbow hoặc sticker.

## Quyết định đề xuất

Thêm field typed, additive `TourProducts.editorialBadges[]` gồm `kind` (`hot`, `specialized`, `vip`) và `label` localized. Mapper tạo DTO dùng chung cho homepage, catalog và market cards. Giữ dữ liệu badge legacy nguyên nghĩa; không tự migrate hoặc tự đoán kind từ label.

`hot` điều khiển viền 2px gradient cầu vồng; `specialized` và `vip` điều khiển sticker ở góc trên trái card. Promo thương mại giữ góc trên phải. Badge editorial không được dùng để tính giá, discount hoặc `promoLabel`.

Label được nhập riêng theo từng locale. Khi editor chọn `kind`, CMS điền sẵn label gần nhất (`Tour hot`, `Specialize`, `VIP`) để giảm thao tác; editor có thể sửa trước khi lưu.

## Lý do

Model additive giảm rủi ro phá dữ liệu cũ, tách rõ editorial với commercial và cho phép kiểm soát site/locale. Typed kind giúp UI và validation ổn định hơn so với so khớp chuỗi label.

## Hệ quả

- Có thay đổi schema Payload nhưng không cần migration dữ liệu nếu field mới để trống.
- Cần CMS authoring, DTO, ba bề mặt card, revalidation và browser QA.
- Label preset và vị trí sticker đã được người dùng chốt ngày 21/10/2026.

## Phương án bị loại

- Dùng lại `promoLabel`: sai ownership và có thể tạo tuyên bố thương mại không có chứng cứ.
- Suy ra `hot` bằng cách tìm chuỗi trong label: không ổn định, không locale-safe.
- Đổi trực tiếp mảng `badges` legacy: có nguy cơ đổi nghĩa dữ liệu đang sử dụng.
