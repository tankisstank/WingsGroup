# Hướng dẫn Hero Presentation trong CMS

## Khái niệm

- Theme preset kiểm soát màu, font, spacing, radius và button.
- Hero presentation kiểm soát bố cục, media và chuyển động của hero.
- Nội dung hero luôn thuộc page; site chỉ đặt presentation và behavior mặc định.

## Đặt hero mặc định cho site

1. Mở `/admin/theme`.
2. Chọn site.
3. Trong `Hero presentation`, chọn preset mặc định.
4. Chọn business behavior: Standard, Retail departures, Planner hoặc Utility.
5. Kiểm tra preview và bấm `Lưu theme`.

Thao tác này chỉ ảnh hưởng page đang chọn `Kế thừa từ site`.

## Cấu hình hero trên page

1. Mở `Pages`, chọn page và tab `Hero`.
2. Chọn `High Impact`.
3. Tại `Nguồn presentation`, chọn `Kế thừa từ site` hoặc `Override trên page`.
4. Nếu override, chọn một presentation preset.
5. Tại `Chuyển động`, giữ `Theo preset` hoặc override timing/controls cho page.
6. Save draft và kiểm tra Live Preview trước khi publish.

## Carousel

- Nhập từ 2 đến 8 slide.
- Mỗi slide bắt buộc có ảnh desktop.
- Ảnh mobile là tùy chọn; nếu trống sẽ dùng ảnh desktop.
- Title, description và CTA có thể khác nhau theo slide.
- Không dùng nhiều slide chỉ để trang trí; mỗi slide cần mang một thông điệp rõ.

## Video

- Chọn video desktop.
- Có thể chọn video mobile riêng.
- Poster là bắt buộc về mặt vận hành, dù CMS vẫn cho lưu draft thiếu poster.
- Video tự tắt trong reduced-motion hoặc khi không phát được; poster phải đủ đẹp để đứng độc lập.

## Rollback

- Đổi page về preset trước đó, hoặc chọn `Kế thừa từ site`.
- Đổi site default trong Theme Manager.
- Không xóa preset đang dùng. Deactivate preset để ngăn lựa chọn mới.
- Theme WingsSide cũ vẫn được giữ bằng `wings-side-classic`.

## Checklist trước publish

- Headline đọc được trong 2-3 dòng desktop.
- CTA chính xuất hiện trong viewport đầu.
- Ảnh có focal point phù hợp desktop/mobile.
- Carousel có số slide vừa đủ và CTA không lặp vô nghĩa.
- Poster video đúng tỉ lệ và không có chữ/logo nhúng gây xung đột.
- Kiểm tra Live Preview desktop, tablet và mobile.
