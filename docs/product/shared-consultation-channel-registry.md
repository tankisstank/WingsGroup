# Shared consultation channel registry

Đây là bản ghi dùng chung cho các site trong hệ WingsTravel. Mục tiêu là để
WingsGroup, WingsGo và WingSide dùng cùng một endpoint Zalo OA, nhưng việc bật
CTA vẫn được kiểm soát theo từng site.

Nguồn máy đọc: [`shared-consultation-channel-registry.json`](./shared-consultation-channel-registry.json)

## Zalo OA đã được duyệt

| Trường | Giá trị |
| --- | --- |
| Tên hiển thị | Wingsgroup - Vietwings Travel |
| OAID | `4142059657526524531` |
| URL chuẩn | `https://zalo.me/4142059657526524531` |
| Owner | WingsGroup Sales |
| SLA | Phản hồi trong 1 ngày làm việc / Reply within 1 business day |
| Tracking reference | `stakeholder-approved-zalo-oa-4142059657526524531-2026-08-29` |
| Trạng thái | `approved` |

## Phạm vi rollout

- **WingsGroup (`wings-group`)**: đã cấu hình production.
- **WingsGo (`wings-go`)**: CTA đã live trong release
  `cd78eaf431ffab7fa4f764e47dfccb328d4ddde5`.
- **WingSide (`wing-side`)**: CTA đã live trong cùng release
  `cd78eaf431ffab7fa4f764e47dfccb328d4ddde5`.

Khi triển khai thêm site, seed/migration phải đọc registry này, ghi channel vào
SiteSettings của đúng tenant, rồi QA canonical URL, tracking, owner/SLA và
fallback form. Không sao chép OAID vào component riêng lẻ.
