# Poster bảng giá dịch vụ Fast Track

- File nguồn: `docs/Tai_lieu_trao_doi_vong_2/3358106227761608430.jpg`

## Đây là gì

Bảng giá đầy đủ cho dịch vụ Fast Track theo sân bay, chiều nhập/xuất cảnh, nhóm khách và add-on. Đây không phải ảnh quảng cáo đơn lẻ mà là tài liệu sản phẩm bán hàng gần với rate card.

## Phân tích

Thông tin rất dày và rất cấu trúc: mã dịch vụ, mức giá theo Nội Bài/Đà Nẵng/Phú Quốc/Tân Sơn Nhất, giá đoàn, giá add-on, lưu ý VAT và phụ thu. Nó cho thấy `wingspass` là một mảng sản phẩm độc lập, có logic bảng giá phức tạp và có khả năng bán kèm package.

## Hàm ý cho website/CMS

`wingspass` nên có schema riêng cho service pricing table, airport, service code, group tier, direction, add-on. Không nên xử lý như bài blog hay page text thông thường.
