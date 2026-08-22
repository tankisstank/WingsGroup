# Tiến độ và mốc bàn giao

## Cách theo dõi

Tiến độ được theo dõi theo 3 lớp:

- milestone: mốc giao hàng lớn
- work item: deliverable hoặc story
- child task: tiêu chí chấp nhận và bằng chứng chi tiết

## Các milestone chính

- Sẵn sàng nền tảng
- Rà soát nội bộ CMS
- UAT khách hàng
- Phát hành site đầu tiên
- Ổn định sau phát hành

## Cách đọc trạng thái

- Tiếp nhận: yêu cầu mới vừa được ghi nhận
- Kế hoạch: đã đưa vào kế hoạch
- Đang thực hiện: đang triển khai
- Đang rà soát: đang review hoặc nghiệm thu
- Chờ xác nhận: đã làm xong phần chính nhưng bằng chứng còn thiếu
- Tắc nghẽn: đang bị chặn
- Hoàn tất: nội bộ xem như xong
- Đã bàn giao: đã đạt mức bàn giao và bằng chứng đầy đủ

## Ghi chú cho khách hàng

Trạng thái trong Plane phản ánh delivery thực tế của dự án.
Tài liệu chi tiết và bằng chứng kỹ thuật vẫn được đối chiếu từ repo nội bộ khi cần.

## E09 - Trải nghiệm public WingsGroup v3

E09 đã được ghi nhận là accepted engineering trong khoảng bằng chứng
`2026-08-14` đến `2026-08-22`. Sáu story US-061 đến US-066 được map dưới Epic
native E09 trong project lõi WingsGroup và hiện ở trạng thái `Chờ xác nhận`;
đây không phải là production launch.

Các cổng còn mở là legal/privacy/consent, proof publication rights, brand
token/logo, editorial media và English copy, consultation endpoint owner/SLA/
tracking, ecosystem destination validation, cùng hai environment gate là
disposable PostgreSQL rehearsal và Harness database. Các route, media, proof,
English và external channel chưa đủ điều kiện vẫn giữ fail-closed.
