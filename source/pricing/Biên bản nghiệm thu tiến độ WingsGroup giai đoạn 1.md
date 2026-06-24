# BIÊN BẢN NGHIỆM THU TIẾN ĐỘ CÔNG VIỆC

## Thông tin xác nhận

- Dự án: WingsGroup - Website đa site và hệ quản trị nội dung CMS
- Giai đoạn: Giai đoạn 1
- Mốc nghiệm thu: mã nguồn đã commit đến ngày 20/06/2026
- Repository: `https://github.com/tankisstank/WingsGroup`
- Branch: `master`
- Commit chốt: `3b306ba0674f01b41de06587fdb24d0b8633f9be`
- Commit rút gọn: `3b306ba`
- Căn cứ thương mại: `publish/html/12 Báo giá giai đoạn 1 WingsTravel - doc style.html`
- Giá trị báo giá giai đoạn 1: `60.000.000 VNĐ`, chưa bao gồm thuế
- Thời gian dự kiến theo báo giá: `45 - 60 ngày làm việc`

## Tính chất văn bản

Biên bản xác nhận khối lượng và tiến độ công việc đã được ghi nhận trong lịch
sử Git đến commit chốt. Biên bản không phải biên bản nghiệm thu hoàn thành dự
án và không phải biên bản bàn giao sản phẩm.

Việc ký biên bản không mặc nhiên xác nhận:

- hoàn thành toàn bộ phạm vi giai đoạn 1;
- bàn giao mã nguồn, tài khoản, database, hạ tầng hoặc bí mật truy cập;
- chuyển giao quyền sở hữu trí tuệ;
- chấm dứt nghĩa vụ sửa lỗi, hoàn thiện, bảo hành hoặc hỗ trợ;
- nghiệm thu các thay đổi đang tồn tại trong working tree nhưng chưa commit;
- nghiệm thu cuối cùng các URL production.
- số tiền hoặc tỷ lệ thanh toán từng đợt nếu chưa có phụ lục thanh toán riêng.

## Đối chiếu milestone theo báo giá

| Milestone | Thời lượng dự kiến | Nội dung | Trạng thái tại commit chốt |
| --- | --- | --- | --- |
| Milestone 1 | 5 - 7 ngày | Làm rõ cấu trúc website, ngôn ngữ ưu tiên, nội dung, landing page và đầu vào | Đã có bằng chứng trong lịch sử Git |
| Milestone 2 | 15 - 20 ngày | Website phiên bản đầu tiên và CMS nền | Đã có bằng chứng trong lịch sử Git |
| Milestone 3 | 10 - 15 ngày | Form tiếp nhận thông tin, điểm tiếp nhận cơ bản và khung landing page tái sử dụng | Đã có bằng chứng trong lịch sử Git; tiếp tục hoàn thiện theo thực tế |
| Milestone 4 | 7 - 10 ngày | Rà soát, chỉnh sửa, kiểm tra hoàn thiện và bàn giao | Đang thực hiện; chưa nghiệm thu hoàn thành và chưa bàn giao cuối |

Biên bản tiến độ có thể được dùng làm căn cứ xác nhận một mốc thanh toán nếu
hai bên có điều khoản hoặc phụ lục thanh toán tương ứng. Biên bản không tự xác
định tỷ lệ hay số tiền của đợt thanh toán.

## Các nhóm công việc đã ghi nhận trong Git

1. Nền tảng Payload-first multisite, routing, localization, phân quyền, page
   composer, SEO nền và kiểm thử khởi tạo.
2. Hoàn thiện các khoảng trống triển khai và bằng chứng kiểm thử giai đoạn 1.
3. CMS operator console, page wizard và tài liệu vận hành.
4. Research vòng 2, định hướng UI và chuẩn bị sitemap/site preview.
5. Theme management, theme preset, token CSS, nội dung mẫu đa site và công cụ
   rà soát liên kết.
6. Hệ thống hero presentation dạng module.
7. Thư viện layout preset, block mở rộng và page wizard preset.
8. Hoàn thiện giao diện chỉnh sửa trang trong Payload CMS.
9. Sửa bố cục navigation/header/footer phục vụ launch.
10. Đổi root brand thành WingsGroup, cấu hình domain/production, Site Review,
    go-live review pipeline, brand assets và tài liệu liên quan.

## Danh sách commit làm căn cứ

| STT | Commit | Ngày | Nội dung |
| --- | --- | --- | --- |
| 1 | `e3e7e10` | 27/05/2026 | Checkpoint WingsTravel phase 1 harness and smoke proof |
| 2 | `3e24a01` | 28/05/2026 | Complete phase 1 deployment and proof gaps |
| 3 | `d5a281d` | 01/06/2026 | Harden operator console, expand page wizard templates, and sync docs |
| 4 | `e66692c` | 06/06/2026 | Add VietWings round-2 research and UI direction |
| 5 | `5def202` | 09/06/2026 | Prepare WingsTravel sitemap preview for production review |
| 6 | `516ac4b` | 12/06/2026 | Deliver multisite themes and content review |
| 7 | `6463bf4` | 15/06/2026 | Add modular hero presentations |
| 8 | `98a8757` | 16/06/2026 | Implement CMS layout preset library |
| 9 | `11398e9` | 16/06/2026 | Polish Payload admin page edit UI |
| 10 | `8b33e38` | 18/06/2026 | Fix launch nav layout wrapping |
| 11 | `3b306ba` | 20/06/2026 | Rename root site to WingsGroup |

## Hiện trạng ngoài phạm vi biên bản

Tại thời điểm lập biên bản ngày 23/06/2026, repository có thay đổi chưa commit.
Các thay đổi này đang trong quá trình phát triển/kiểm thử, không thuộc khối
lượng được nghiệm thu tại biên bản này. Chúng chỉ được xem xét ở mốc nghiệm
thu tiếp theo sau khi được commit và có bằng chứng kiểm tra phù hợp.

## Kết luận đề xuất

Hai bên xác nhận tiến độ kỹ thuật đã thực hiện đến commit `3b306ba` theo danh
sách và giới hạn nêu trong biên bản.

Các công việc tiếp theo gồm:

- hoàn thiện và commit phần đang phát triển;
- kiểm thử lại trên commit chốt mới;
- xác nhận trạng thái production;
- hoàn thiện nội dung và các tồn đọng;
- lập biên bản nghiệm thu hoàn thành và bàn giao riêng khi đủ điều kiện.
