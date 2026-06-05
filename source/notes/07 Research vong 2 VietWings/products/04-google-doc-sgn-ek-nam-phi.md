# Google Doc - SÀI GÒN - EMIRATES - NAM PHI 9N7Đ 2026

- Link gốc: https://docs.google.com/document/d/1ub-q5sV_LBah0yEV0L5wImIVxPrZ3ex8/edit?tab=t.0

## Đây là gì

Đây là biến thể của tour Nam Phi 9 ngày 7 đêm nhưng khởi hành từ TP.HCM. Về bản chất sản phẩm gần như giống bản Hà Nội, chỉ khác departure city và một số thông tin vận hành liên quan.

## Cấu trúc tài liệu

- Giữ nguyên khung bán hàng: title, subtitle, storytelling, bảng giá, lịch bay, itinerary.
- Khác biệt chính nằm ở dòng `Khởi hành từ TP. Hồ Chí Minh` và logic chặng bay phù hợp điểm xuất phát.
- Tài liệu này cho thấy một sản phẩm có thể cần nhiều biến thể theo departure city nhưng vẫn dùng chung phần lớn nội dung.

## Ý chính rút ra

- Đây là bằng chứng mạnh cho nhu cầu content reuse + variant management.
- Nếu website tạo page tách rời hoàn toàn cho từng city xuất phát, editor sẽ lặp lại rất nhiều nội dung dài.
- CMS nên hỗ trợ base product + departure variant hoặc ít nhất là schema con cho nhiều điểm khởi hành trên cùng sản phẩm.

## Hàm ý cho website/CMS

Thiết kế content model cần tránh nhân bản thủ công vô hạn. Đây là use case rất thật cho `tour line` + `departure variant` trong Payload.
