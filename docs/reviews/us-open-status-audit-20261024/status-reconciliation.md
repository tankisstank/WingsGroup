# Audit đối chiếu trạng thái US giữa Harness và Plane

- Ngày rà soát: 2026-10-24
- Phạm vi: Harness story matrix, Plane work items theo project, `docs/plane/manifest.json`, story files và bằng chứng release.
- Mục tiêu: tìm US đã lỗi thời hoặc đã được xử lý bởi US khác; tránh đóng nhầm các gate còn chờ UAT, stakeholder hoặc release.

## Kết quả tóm tắt

Trước rà soát, Harness còn 7 US ở trạng thái mở (`in_progress` hoặc `planned`). Sau khi đối chiếu bằng chứng, 3 US đã được điều chỉnh về `implemented`; còn 4 US thực sự mở.

| US | Trạng thái trước | Quyết định | Lý do |
|---|---|---|---|
| US-041 | `in_progress` | `implemented` | Manifest và bằng chứng stakeholder ghi nhận đóng ngày 2026-09-25; release `ac54a810`, lead delivery, metrics, health và backup đã có bằng chứng. |
| US-042 | `planned` | `implemented` | Stakeholder đã chỉ đạo đóng ngày 2026-09-25; kiểm tra homepage/health cross-domain đã đạt. Checklist Appendix 01 M1-M3 chưa chạy lại được ghi rõ là giới hạn bằng chứng, không phải implementation còn mở. |
| US-044 | `in_progress` | `implemented` | Hồ sơ hoàn tất có batch 51 tour WingsGo, rehearsal PostgreSQL, backup, catalog migration, public API/browser smoke và rollback. Baseline integration fail được ghi nhận là lỗi không liên quan. |
| US-056 | `in_progress` | Giữ mở | Còn chờ khôi phục production bằng backup thật, phê duyệt và live API/browser QA. |
| US-058 | `planned` | Giữ mở | Story và Plane đều đang ở giai đoạn kế hoạch. |
| US-077 | `in_progress` | Giữ mở | Còn chờ external data và các proof lead/PDF có kiểm soát; story vẫn có task đang hoạt động. |
| US-079 | `planned` | Giữ mở | Story và Plane đều đang ở giai đoạn kế hoạch. |

## Đối chiếu Plane

Đọc trực tiếp Plane sau sync cho thấy 19 work item customer-facing chưa ở `Hoàn tất`, `Đã bàn giao` hoặc `Đã hủy`:

- 12 `Chờ xác nhận`
- 4 `Đang thực hiện`
- 3 `Đã lên kế hoạch`

Danh sách này không đồng nghĩa 19 US đều stale. Phần lớn là trạng thái bàn giao/UAT/release gate còn chờ xác nhận. Ngoài ra, Plane có các ID trùng số giữa các project (ví dụ US-061, US-064, US-066 ở WGCORE và WTRAVEL), vì vậy phải đối chiếu theo cả project và external ID, không gộp theo số US.

### Khoảng phủ giữa manifest và Plane

`plane:preview` hiện sinh 68 story từ manifest. Trong 19 Plane item đang mở, 6 có mặt trong danh sách preview hiện tại: WGCORE/US-059, WGCORE/US-071, WSIDE/US-056, WSIDE/US-058, WGO/US-077 và WSIDE/US-079. 13 item còn lại không nằm trong manifest preview hiện tại:

- WGCORE: US-061, US-062, US-063, US-064, US-065, US-066, US-068, US-069, US-074
- WTRAVEL: US-061, US-064, US-066
- WGO: US-075

Đây là dấu hiệu cần reconciliation về phạm vi/mapping hoặc archival. Chưa có đủ bằng chứng để tự động đóng các item này; các story core đang gắn với release/UAT/publication gate và cần quyết định riêng.

## Các trường hợp đã kiểm tra

- **US-074:** một overlay/UI follow-up cũ đã bị US-075 supersede, nhưng US-074 hiện vẫn là story riêng còn chờ handover/UAT; không đóng parent.
- **US-044:** bằng chứng nguồn xác nhận đây là import cho WingsGo. Tên Harness hiện còn chữ “WingSide”, là metadata lỗi thời cần dọn riêng; không làm thay đổi quyết định đã hoàn tất.
- **US-059, US-061/062/063/064/065/066/071, US-074/075:** đang phản ánh các gate UAT, publication, legal/privacy, stakeholder hoặc production write còn chờ; chưa có đủ căn cứ để đóng tự động.

## Kiểm chứng đã chạy

```powershell
.\scripts\harness query matrix
pnpm run plane:preview
pnpm run plane:sync:workitems
```

Kết quả sync Plane:

```text
patchedCount: 265
missingCount: 0
```

Có cảnh báo API `402 Payment required` khi đọc loại Epic/native Epic của E10; script đã bỏ qua đúng nhánh xử lý và vẫn hoàn tất đồng bộ work item. Có retry `429` do rate limit nhưng tiến trình duy nhất cuối cùng thoát `0`.

Kết quả Harness liên quan sau cập nhật:

```text
US-041 implemented
US-042 implemented
US-044 implemented
US-056 in_progress
US-058 planned
US-077 in_progress
US-079 planned
```

## Việc còn lại

1. Dọn tên metadata Harness của US-044 từ “WingSide” về tên WingsGo nếu CLI/workflow cho phép đổi title.
2. Lập quyết định riêng cho 14 Plane item ngoài manifest: đưa vào manifest, đánh dấu legacy/archived, hoặc liên kết vào US mới.
3. Khi có bằng chứng UAT/stakeholder tương ứng, rà soát tiếp các item Plane đang `Chờ xác nhận`.
4. Không gộp các US trùng số giữa các project nếu chưa xác nhận cùng một work item.

## Giới hạn

Đây là rà soát trạng thái và bằng chứng hiện có, không phải semantic re-review toàn bộ 69 story. Các title/owner/note lịch sử còn sót có thể cần một đợt metadata cleanup riêng.

## Quyết định cập nhật từ stakeholder — 2026-10-24

- **US-044:** title Harness đã đổi thành `Nhập và phát hành catalog tour WingsGo`; trạng thái `implemented` giữ nguyên. Plane và manifest vốn đã đúng WingsGo.
- **US-041, US-042:** xác nhận đóng; Harness `implemented`, Plane `Hoàn tất`.
- **US-056:** giữ Harness `in_progress`. Plane vẫn `Chờ xác nhận` vì còn sign-off biên tập năm locale và xác nhận metrics bên ngoài; chưa ép đổi Plane sang `Đang thực hiện`.
- **US-058:** giữ theo kế hoạch Plane: Harness `planned`, Plane `Đã lên kế hoạch`. Manifest mapping đã bổ sung và preview nhận đúng item; source story packet vẫn chưa có.
- **US-077:** chưa đóng. Harness `in_progress`, Plane `Chờ xác nhận`; còn 7 task/evidence gate, gồm controlled lead proof, dữ liệu China/flight/price và PDF được duyệt.
- **US-079:** chưa triển khai. Harness `planned`, Plane `Đã lên kế hoạch`; validation của story vẫn để toàn bộ AC ở `Planned`, chưa có implementation/test proof.

### Ma trận nhóm Plane ngoài manifest hoặc lệch project

| Project Plane | US | Manifest hiện tại | Plane hiện tại | Nhận xét |
|---|---|---|---|---|
| WGCORE | US-061 | Có, nhưng là mapping Core/E09 | Chờ xác nhận | Gate release core; không stale rõ ràng. |
| WGCORE | US-062 | Có, Core/E09 | Chờ xác nhận | Còn runtime consent/publication gate. |
| WGCORE | US-063 | Có, Core/E09 | Chờ xác nhận | Engineering đã nhận; proof publication còn fail-closed. |
| WGCORE | US-064 | Có, Core/E09 | Chờ xác nhận | Còn production delivery/owner/SLA/consent proof. |
| WGCORE | US-065 | Có, Core/E09 | Chờ xác nhận | Còn runtime consent và ecosystem destination gate. |
| WGCORE | US-066 | Có, Core/E09 | Chờ xác nhận | Còn migration/seed, production smoke và lead delivery. |
| WGCORE | US-068 | Không có | Đang thực hiện | Cần quyết định thêm vào manifest hay giữ Plane legacy. |
| WGCORE | US-069 | Không có | Đã lên kế hoạch | Cần quyết định thêm vào manifest hay giữ Plane legacy. |
| WGCORE | US-074 | Có, Core/E02 | Chờ xác nhận | US-075 supersede một follow-up cũ; parent vẫn còn handover/UAT. |
| WTRAVEL | US-061 | Không có WTRAVEL variant | Đang thực hiện | ID trùng US-061 Core; cần mapping riêng hoặc archive. |
| WTRAVEL | US-064 | Không có WTRAVEL variant | Đang thực hiện | ID trùng US-064 Core; cần mapping riêng hoặc archive. |
| WTRAVEL | US-066 | Không có WTRAVEL variant | Đang thực hiện | ID trùng US-066 Core; cần mapping riêng hoặc archive. |
| WGO | US-075 | Có, WingsGo/E07 | Chờ xác nhận | Story riêng về CMS tour/preview; chưa đóng. |
| WSIDE | US-058 | Có, WingSide/E08 | Đã lên kế hoạch | Mapping đã hợp nhất; source story packet vẫn cần bổ sung khi triển khai. |

Không tự đóng hoặc gộp các item ở bảng trên vì một số item là release gate thật, một số item là variant theo project, và một số item chỉ còn thiếu mapping manifest.

## Kết quả hợp nhất — 2026-10-24

- **Đã hợp nhất US-058:** thêm mapping `wingside / E08 / Phase 1 / Content` vào `docs/plane/manifest.json`, giữ `Pending` và `Đã lên kế hoạch`. Plane preview hiện nhận đúng US-058; nguồn story packet vẫn thiếu và được ghi rõ là việc cần bổ sung khi triển khai.
- **Không hợp nhất US-061/064/066 giữa WGCORE và WTRAVEL:** WGCORE là release gate E09, WTRAVEL là implementation packet cùng mã; gộp sẽ làm mất phân biệt giữa technical delivery và launch approval.
- **Không hợp nhất US-074 với US-075:** US-075 chỉ thay thế một follow-up/UI overlay cũ; US-074 còn handover/UAT riêng.
- **Không thêm US-068/069 vào manifest:** Plane có item nhưng Harness chưa có story record; thêm mapping khi chưa có nguồn Harness sẽ tạo item đồng bộ không có nguồn sự thật.
- **Không gộp US-058 với US-079:** cùng thuộc WingSide nhưng khác mục tiêu; US-058 là imagery governance, US-079 là tour curation console.

Harness trace cho đợt hợp nhất: `#320`. Plane sync: `patchedCount=266`, `missingCount=0`.
