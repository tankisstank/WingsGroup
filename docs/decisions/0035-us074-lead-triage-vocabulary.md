# 0035 — US-074 Lead triage vocabulary

Date: 2026-09-15

## Status

Accepted

## Context

US-074 có hai proposal khác nhau cho `salesStatus`: candidate vận hành dùng
năm giá trị, còn design cũ mô tả sáu giá trị với `qualified` và
`no_response`. Production đã có migration lead triage và enum candidate; đổi
tên sau khi phát hành sẽ làm tăng rủi ro migration mà không thêm năng lực xử lý
thực tế.

## Decision

Giữ vocabulary năm trạng thái hiện hành:

| Value | Nhãn quản trị |
| --- | --- |
| `new` | Mới tiếp nhận |
| `contacting` | Đang gọi tư vấn |
| `won` | Đã chốt |
| `no_answer` | Không nghe máy |
| `lost` | Không phù hợp |

Đây là contract được chấp thuận cho US-074 và phải được dùng thống nhất trong
code, migration, API allowlist, UI, filter, export và test. Không thêm alias
`qualified`/`no_response` và không backfill các lead hiện hữu. Bảy lead
Production hiện có tiếp tục giữ `salesStatus = NULL` cho tới khi Sales chủ động
phân loại qua luồng triage.

Account, nội dung khách gửi, consent, delivery metadata, `createdAt` và site
relation không nằm trong quyết định này.

## Alternatives Considered

1. Dùng sáu trạng thái theo design cũ: loại vì chưa có nhu cầu nghiệp vụ đã
   được xác nhận và sẽ yêu cầu migration/alias sau khi schema candidate đã tồn
   tại.
2. Tự động backfill lead cũ thành `new`: loại vì làm thay đổi ý nghĩa dữ liệu
   lịch sử và che giấu trạng thái chưa được Sales phân loại.

## Consequences

Positive:

- Không cần migration đổi enum trên Production.
- UI và API có một bộ nhãn nhất quán, dễ đào tạo Sales/CSKH.
- Lead cũ được bảo toàn, trạng thái chưa biết vẫn biểu diễn được bằng `NULL`.

Tradeoffs:

- Không phân biệt riêng `qualified` và `no_response`; Sales dùng `contacting`,
  `no_answer` hoặc `lost` theo quy trình hiện hành.
- Cần ghi rõ `Chưa phân loại` khi hiển thị lead cũ chưa có trạng thái.

## Follow-Up

- Verify enum Production vẫn đúng 5 giá trị sau release.
- Không tạo fixture hoặc ghi lead thật chỉ để chứng minh vocabulary.
- Nếu nghiệp vụ cần trạng thái mới, tạo decision/migration riêng ngoài US-074.
