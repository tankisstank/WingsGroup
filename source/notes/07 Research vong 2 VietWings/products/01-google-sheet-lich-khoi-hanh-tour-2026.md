# Google Sheet - VIETWINGS TRAVEL - LỊCH KHỞI HÀNH TOUR 2026

- Link gốc: https://docs.google.com/spreadsheets/d/1_dfaEYPNpPOi-jRAZL3jr1YALYh_LX55mab4cx6AMpk/edit?usp=sharing

## Đây là gì

Đây là bảng vận hành/sales nguồn cho lịch khởi hành và giá tour 2025-2026 của VietWings. Nó đang đóng vai trò product source trước website/CMS.

## Cấu trúc tài liệu

- Workbook có 3 sheet chính: `TOUR HÀN QUỐC`, `TOUR NHẬT BẢN`, `TOUR TRUNG QUỐC`.
- Mỗi sheet chứa tên chương trình, hãng hàng không, ngày khởi hành, giá tour, và cột `Chi tiết` để trỏ sang tài liệu chương trình riêng.
- Dữ liệu đang ở dạng sales-ready hơn là CMS-ready: có nhiều dòng merge logic, nhiều biến thể ngày/giá, và format thiên về con người đọc hơn là máy đọc.

## Ý chính rút ra

- Hàn Quốc hiện có cả mùa đông và hè 2026, nhiều line tour khác nhau và nhiều hãng bay như Vietjet, Jeju Air, Vietnam Airlines, Asiana.
- Nhật Bản có các line Osaka - Kobe - Nagoya - Kyoto - Phú Sĩ - Tokyo, Hokkaido, và có phân mùa hè/mùa thu.
- Trung Quốc có các line Bắc Kinh, Thượng Hải - Ô Trấn - Hàng Châu, Bắc Kinh - Hàng Châu - Ô Trấn - Thượng Hải; giá bám rất sát lịch bay Air China.

## Hàm ý cho website/CMS

Website phase 1 cần có content model cho `tour line`, `departure batch`, `price row`, `airline`, `market`, `season`. Nếu chỉ dùng page tĩnh thì sẽ rất khó cập nhật khi lịch khởi hành thay đổi liên tục.
