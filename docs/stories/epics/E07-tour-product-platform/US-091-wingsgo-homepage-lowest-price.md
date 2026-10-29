# US-091 Đồng bộ giá từ trên card trang chủ WingsGo

## Status

implemented

## Lane

normal — sửa logic hiển thị giá trên catalog, không thay đổi dữ liệu giá.

## Bối cảnh

Tour `HÀ NỘI – BUSAN – SEOUL – TRƯỢT TUYẾT – INCHEON – TÀU ĐIỆN VEN BIỂN (VJ)` có:

- Đợt 10/12/2026: 19.900.000 ₫.
- Đợt 11/12/2026: 18.500.000 ₫.

Trang chủ WingsGo hiển thị 19.900.000 ₫ vì catalog đang dùng đợt khởi hành sớm nhất làm giá card. Trang chi tiết hiển thị đúng 18.500.000 ₫ khi chọn đợt 11/12/2026.

## Product Contract

Trên card “Tour đang được quan tâm nhất”, nhãn “Giá từ” phải hiển thị mức giá thấp nhất trong các đợt khởi hành tương lai, đã publish, cùng site và còn trong verification window. Ngày khởi hành gần nhất vẫn hiển thị độc lập.

Nếu không có đợt giá hợp lệ, card giữ trạng thái liên hệ theo contract hiện tại.

## Acceptance Criteria

- Card tour trên trang chủ hiển thị 18.500.000 ₫ cho tour ID 132 trong dữ liệu tái hiện.
- Việc chọn giá không làm thay đổi “Khởi hành gần nhất”.
- Chỉ xét departure cùng tour, cùng site, đã publish, ngày trong tương lai và commerce verification hợp lệ.
- Không dùng giá hết hạn, sold-out hoặc giá thuộc site/tour khác.
- Trang chi tiết và giá trong CMS không bị thay đổi.
- Có test cho trường hợp giá thấp nhất nằm ở đợt sau đợt gần nhất.
- Có kiểm tra public catalog production sau khi triển khai.

## Technical Scope

- `app/src/tours/wingsGoCatalog.ts`
- Test unit/component liên quan đến catalog card.
- Không migration, không seed và không ghi CMS production.

## Changed Files

- `app/src/tours/wingsGoCatalog.ts`: Tách `nearestDeparture` (giữ nguyên ngày, hãng bay, nơi đi của đợt khởi hành tương lai gần nhất) và `lowestPriceDeparture` (tìm đợt có `priceFrom` thấp nhất trong các đợt hợp lệ: cùng tour, cùng site, tương lai, đã publish, commerce verification còn hiệu lực và không `sold-out`). `canShowDiscount` và `promoLabel` đồng bộ từ `lowestPriceDeparture`.
- `app/tests/unit/wingsGoCatalog.unit.spec.ts`: Cập nhật fallback khi đợt duy nhất bị sold-out chuyển sang giá liên hệ (`contact`), bổ sung bộ test `WingsGo lowest price catalog card rules (US-091)` bao gồm tái hiện product 132, đợt rẻ hơn nằm sau, fallback khi đợt rẻ bị sold-out, fallback khi đợt đầu bị sold-out, fallback khi hết hạn xác thực, bỏ qua đợt khác site/tour, và fallback liên hệ khi toàn bộ đợt không hợp lệ.

## Validation & Evidence

### 1. Baseline Production Evidence (Trước khi triển khai)
- `GET https://wingsgo.vn/api/wingsgo/tour-catalog?limit=6&offset=0`: Card ID 132 trả giá 19.900.000 ₫ (`nextDeparture.date`: `2026-12-10T00:00:00.000Z`).
- Chi tiết tour `https://wingsgo.vn/tour/ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj`:
  - Đợt 208 (10/12/2026): 19.900.000 ₫
  - Đợt 204 (11/12/2026): 18.500.000 ₫ (giá từ trên trang chi tiết hiển thị 18.500.000 ₫)

### 2. Unit & Component Test Suite
- `tests/unit/wingsGoCatalog.unit.spec.ts`: 23/23 tests pass (100%).
  - Tái hiện product 132: Card hiển thị `18.500.000 ₫` trong khi `nextDeparture.date` giữ nguyên `2026-12-10T00:00:00.000Z`.
  - Đợt sau rẻ hơn có discount/promoLabel: Card lấy giá rẻ nhất kèm discount và promoLabel tương ứng, ngày khởi hành vẫn là đợt sớm nhất.
  - Fallback sold-out đợt sau: Bỏ qua đợt 18.5m bị sold-out, lấy giá đợt 19.9m còn mở bán.
  - Fallback sold-out đợt đầu: Giữ nguyên ngày đợt đầu, lấy giá đợt sau mở bán.
  - Fallback hết hạn xác thực: Bỏ qua đợt hết hạn xác thực, lấy đợt hợp lệ.
  - Fallback liên hệ: Khi toàn bộ đợt đều sold-out/hết hạn, card fallback về `{ kind: 'contact', label: 'Liên hệ để nhận giá mới nhất' }`.
  - Cô lập đa site và đa tour: Đợt rẻ hơn của site khác hoặc tour khác bị loại bỏ hoàn toàn.
- Component tests:
  - `tests/component/promotionPrice.component.spec.tsx`: 11/11 tests pass.
  - `tests/component/wingsGoTourCatalog.component.spec.tsx`: 4/4 tests pass.
  - `tests/component/editorialBadges.component.spec.tsx`: 9/9 tests pass.
- Tổng hợp 4 suites WingsGo (`wingsGoCatalog`, `wingsGoPriorityMarketDeparture`, `wingsGoTourCatalogMigration`, `wingsGoTourCuration`): 50/50 tests pass.

### 3. CMS & Production Safety
- Không migration schema.
- Không seed dữ liệu.
- Không ghi CMS hay can thiệp dữ liệu production.
- Trang chi tiết và giá trong CMS hoàn toàn không bị ảnh hưởng.

## Harness

Intake #169.
- Matrix: Unit yes, Integration yes, E2E yes, Platform yes.
