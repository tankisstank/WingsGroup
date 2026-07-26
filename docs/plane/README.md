# Plane Workspace Setup

Tài liệu này gồm:

- `manifest.json`: cau truc import cho Plane
- `pages/`: nội dung Pages bằng Markdown
- `app/scripts/plane-import.mjs`: script import idempotent

## Mục tiêu

Plane được dùng để:

- tái hiện trạng thái delivery của WingsGroup CMS
- cho khách hàng theo dõi tiến độ và mốc bàn giao
- lưu tài liệu hướng dẫn vận hành CMS ở mức dễ dùng

Repo docs vẫn là source of truth nội bộ. Plane là lớp trình bày và theo dõi.

## Bien moi truong can thiet

Script import doc cac bien sau:

- `PLANE_API_KEY`
- `PLANE_WORKSPACE_SLUG`
- `PLANE_BASE_URL`

Mac dinh `PLANE_BASE_URL` la `https://api.plane.so`.

## Lenh chinh

Chay trong `app/`:

```bash
pnpm run plane:preview
pnpm run plane:import:structure
pnpm run plane:import:history
pnpm run plane:import:pages
pnpm run plane:sync:dates
pnpm run plane:sync:wingsgo
pnpm run plane:sync:workitems
pnpm run plane:import:all
```

Khi chỉ cần import hoặc sync một số story, đặt `PLANE_STORY_IDS` bằng danh
sách mã phân cách bởi dấu phẩy. Bộ lọc này giúp tránh duyệt lại toàn bộ lịch sử
và không thay đổi hành vi mặc định khi biến không được đặt:

```powershell
$env:PLANE_STORY_IDS='US-053'
pnpm run plane:preview
pnpm run plane:import:history
pnpm run plane:sync:workitems
Remove-Item Env:PLANE_STORY_IDS
```

## Trinh tu de xuat

1. `plane:preview`
2. `plane:import:structure`
3. review trong Plane
4. `plane:import:history`
5. review trong Plane
6. `plane:import:pages`
7. `plane:sync:dates`

## Quy ước mapping

- Workspace = `WingsGroup`.
- Project = site hoặc phần lõi, ví dụ `WingSide`, `WingsGo`, `Nền tảng lõi WingsGroup`.
- Epic = nhóm mục tiêu như `E08 - Nâng cấp inbound WingSide`.
- `US-xxx` = work item parent.
- Acceptance criteria hoặc checklist dưới từng US = sub-work item.
- Cycle = sprint hoặc mốc thời gian.
- Module = fallback group khi Plane chưa bật Epic native cho project.
- Nếu project có work item type `Epic`, script tạo Epic như một work item thật
  và đặt các `US-xxx` làm child của Epic đó.
- Nếu project chưa có work item type `Epic`, script dùng Module cùng tên Epic
  để group các `US-xxx`.

## Lưu ý

- Lịch sử được import theo `story + child tasks` từ acceptance criteria trong story docs.
- Work item được đánh dấu `Đã bàn giao` khi proof đầy đủ; nếu proof còn thiếu thì vào `Chờ xác nhận`; story planned vào `Đã lên kế hoạch`.
- Một số story có layer `N/A` trong Harness vì không phát sinh loại test đó
  nhưng vẫn đủ acceptance criteria. Khi đó `storyMappings` có thể đặt
  `proofStatusOverride: "Full"` kèm `proofStatusNote`; không dùng override để
  che blocker thật.
- `Source Link` là đường dẫn repo nội bộ, dùng để đối chiếu với docs gốc.
- `plane:sync:dates` cập nhật `start_date` từ `story.created_at` trong Harness và `target_date` từ ngày evidence mới nhất.
- `plane:sync:wingsgo` cập nhật riêng các work item WingsGo `US-023` và `US-024`, gồm tên task con rõ nghĩa, mô tả chi tiết và ngày theo thứ tự phụ thuộc.
- `plane:sync:workitems` cập nhật toàn bộ work item đã import, gồm parent/child title, mô tả, `start_date` và `target_date` theo thứ tự phụ thuộc.
- Tất cả project hiện có work item type `Epic`; script tạo Epic như work item
  thật và đặt các `US-xxx` làm child của Epic.
- Module cùng tên Epic vẫn có thể tồn tại như group phụ hoặc fallback lịch sử,
  nhưng source mapping chính là Epic work item.
- Repo có trùng mã `US-026` đến `US-029` giữa E07 và E08; script ưu tiên folder epic theo `epicKey` để tránh lấy nhầm story file.
- E07 đã được chuẩn hóa lại: các story tour cũ bị trùng `US-025..US-029` được
  đổi thành `US-035..US-039`. `US-025` hiện là PostgreSQL Migration Smoke Gate,
  còn `US-026..US-034` thuộc E08 WingSide.
- Type thừa `Epics` trong project `Nền tảng lõi WingsGroup` đã được xóa vì
  chưa có work item nào sử dụng.
- `created_at` trên Plane là metadata hệ thống của Plane, không backdate được qua API public.
