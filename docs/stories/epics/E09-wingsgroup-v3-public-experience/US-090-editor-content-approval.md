# US-090 Cho phép editor cập nhật và duyệt nội dung bốn thương hiệu

## Status

implemented

## Lane

high-risk — thay đổi quyền publish nội dung trong CMS.

## Product Contract

Editor có thể sửa, lưu nháp và duyệt/xuất bản nội dung của WingsGroup, WingsGo, WingSide và WingsPlus trong các site được cấp quyền.

## Acceptance Criteria

- Editor cập nhật và publish được Pages của bốn thương hiệu.
- Editor publish được TourProducts, TourDepartures, DepartureVariants và TourCampaigns của WingsGo/WingSide.
- Editor có thể truy cập các luồng authoring dùng chung khi site scope hợp lệ.
- Site scope vẫn được kiểm soát bởi `siteScopedAccess`.
- Governance route, policy approval và dữ liệu ngoài site vẫn giữ quyền hạn hiện hành.
- Các collection quản trị không thuộc nội dung thương hiệu không được mở quyền ngoài phạm vi này.

## Changed Files

- `app/src/access/roles.ts`
- `app/src/collections/Pages/index.ts`
- `app/src/collections/Pages/hooks/validateWingsGroupV3Governance.ts`
- `app/src/collections/Posts/index.ts`
- `app/src/collections/TourProducts.ts`
- `app/src/collections/TourDepartures.ts`
- `app/src/collections/DepartureVariants.ts`
- `app/src/collections/TourCampaigns.ts`

## Validation

- CodeGraph/rg đã kiểm tra callers của `contentPublishAccess` và `preventEditorPublish`.
- Pages và WingsGroup hook đã được kiểm tra targeted integration trước khi mở rộng.
- TypeScript hiện còn lỗi tồn tại trong `tests/unit/wingsGroupCorporateRoutes.unit.spec.ts` ở vùng dirty workspace: field `type` và locale `lo`; không phát sinh từ thay đổi quyền này.
- Chưa triển khai production và chưa thực hiện thao tác ghi CMS production.

## Harness Delta

Intake #168, mở rộng phạm vi từ WingsGroup sang WingsGo, WingSide và WingsPlus.

