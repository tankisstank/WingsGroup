# Re-Review vòng 2 — US-077 Hero tour curation

Ngày review: 2026-10-13
Phạm vi: các thay đổi mới nhất sau vòng review P1/P2, tập trung vào Hero Commerce Panel WingsGo và catalog Payload.

## Kết luận

**Đạt có điều kiện để đóng US-077.** Các điểm P1/P2 chính của vòng trước đã được xử lý đúng trong code:\n
- hợp đồng chỉ còn `heroFeaturedTours`;
- locale được truyền từ helper xuống query pages, tour-products và tour-departures;
- bỏ badge `Hot` tự sinh;
- có empty state VI/EN;
- ngày, giá và `promoLabel` lấy từ cùng commercial departure;
- test và lint được mở rộng;
- typecheck và production build pass.

Không còn blocker P1. Còn một điểm P2 cần xác nhận với chính sách dữ liệu: departure không có `verifiedAt`/`expiresAt` hiện vẫn được coi là có thể dùng giá nếu có `priceFrom`. Điều này giữ tương thích với dữ liệu hiện hữu, nhưng chưa phải cách diễn giải chặt nhất của “giá xác minh còn hiệu lực”. Nên thêm test và quyết định rõ đây là dữ liệu hợp lệ hay phải chuyển sang contact fallback.

---

## 1. Kiến trúc và hợp đồng dữ liệu CMS

### Kết quả kiểm tra

Luồng hiện tại vẫn đúng Payload-first:\n
```text
Pages (/tour)
  └─ wingsGoTourCatalog.featuredTours
       └─ tour-products
            └─ tour-departures
                 └─ queryWingsGoTourCatalog(locale)
                      └─ getWingsGoFeaturedTours(locale)
                           └─ cmsPage.tsx
                                └─ RenderHero
                                     └─ HighImpactHero
```

`cmsPage.tsx` chỉ gọi catalog Hero cho homepage WingsGo. `RenderHero` và `HighImpactHero` hiện chỉ nhận một prop `heroFeaturedTours`, loại bỏ hợp đồng kép của vòng trước.

`queryDocs` nhận locale và truyền cả `locale` cùng `fallbackLocale: 'vi'` tới ba collection. Điều này khắc phục rủi ro Hero EN hiển thị nội dung localized mặc định ở collection con.

Các điều kiện tenant vẫn được giữ:

- site code phải là `wings-go`;
- Page phải là `/tour`;
- Page, wrapper, product và departure được lọc theo site;
- product/departure phải publish;
- catalog phải enabled;
- media cross-site tiếp tục bị loại khỏi DTO.

Không thấy ảnh hưởng mới tới WingSide hoặc WingsGroup.

### Đánh giá

**Đạt.** Kiến trúc dùng lại catalog domain hiện hữu, không tạo nguồn curation thứ hai và không đưa dữ liệu WingsGo vào hero của tenant khác.

---

## 2. Đánh giá code và UX/UI

### Các điểm đã sửa đúng

#### Hợp đồng props

`heroFeaturedTours` là prop duy nhất trong `cmsPage.tsx`, `RenderHero.tsx` và `HighImpact/index.tsx`. Không còn fallback qua tên prop cũ.

#### Badge khuyến mại

Hero chỉ render badge khi `nextDeparture.promoLabel` có giá trị sau trim. Tour không có promoLabel không nhận badge giả. Component test đã xác nhận tour thứ hai không render chữ `Hot`.

#### Empty state

Khi catalog rỗng, panel hiển thị thông báo thân thiện:\n
- VI: `Hiện chưa có tour nổi bật. Xem toàn bộ tour đang mở bán bên dưới.`
- EN: `No featured tours available at the moment. Explore our full catalog below.`

CTA `/tour` và trust row vẫn giữ nguyên, nên người dùng có đường tiếp tục rõ ràng.

#### Commercial departure

`buildCard` chọn một `commercialDeparture` duy nhất và dùng record đó cho:\n
- ngày;
- hãng bay;
- departure city;
- promoLabel;
- giá khi giá được xác nhận.

Điểm này loại bỏ lỗi ghép ngày/promo từ departure này với giá từ departure khác của vòng trước.

### Điểm còn lại cần xác nhận

#### P2 — Chính sách giá không có metadata xác minh

Đoạn chọn giá hiện có dạng:\n
```ts
const hasFreshness = Boolean(departure.verifiedAt || departure.expiresAt)
return hasFreshness ? isDepartureVerificationCurrent(departure) : true
```

Nghĩa là departure có `verifiedAt`/`expiresAt` phải nằm trong cửa sổ xác minh; nhưng departure không có cả hai trường vẫn được xem là hợp lệ nếu có `priceFrom` dương.

Đây có thể là chủ ý để tương thích dữ liệu legacy, và không gây lỗi nếu hệ thống coi `priceFrom` không có freshness metadata là giá hợp lệ. Tuy nhiên, nếu acceptance criterion yêu cầu mọi giá hiển thị phải “xác minh còn hiệu lực”, điều kiện này vẫn còn rộng.

**Đề xuất:**

- nếu freshness metadata bắt buộc: bỏ nhánh `: true`, chuyển về contact fallback;
- nếu legacy được phép: giữ code, ghi rõ chính sách trong schema/validation và thêm test cho cả hai trường hợp.

Đây là điểm cần quyết định nghiệp vụ, không phải lỗi kiến trúc tenant.

---

## 3. Kiểm thử và Harness

### Kiểm tra đã chạy lại

Các lệnh và kết quả:

```text
pnpm run test:unit -- tests/unit/wingsGoCatalog.unit.spec.ts
  1 file, 10 tests passed

pnpm run test:component -- tests/component/heroPresentations.component.spec.tsx
  1 file, 7 tests passed

pnpm run test:unit -- tests/unit/wingsGoCatalog.unit.spec.ts tests/unit/wingsGoPriorityMarketDeparture.unit.spec.ts
  2 files, 13 tests passed

pnpm run test:component -- tests/component/heroPresentations.component.spec.tsx tests/component/wingsGoTourCatalog.component.spec.tsx
  2 files, 10 tests passed

pnpm exec tsc --noEmit --pretty false
  passed

ESLint trên 7 file liên quan
  0 errors, 0 warnings

git diff --check
  passed

pnpm run build
  Next compile passed
  TypeScript passed
  static pages: 20/20
  postbuild standalone preparation passed
```

### Coverage mới đã có

- locale được truyền và được quan sát trong mock Payload;
- promoLabel được giữ trong DTO;
- catalog page thiếu hoặc disabled trả về mảng rỗng;
- component render promo badge thật;
- component không render badge giả;
- component render empty state;
- hợp đồng prop mới được dùng xuyên suốt.

### Khoảng trống còn lại

Chưa có test riêng cho:\n
- departure có freshness metadata nhưng đã expired bị loại khỏi giá;
- departure không có freshness metadata nhưng có `priceFrom`, để chốt chính sách nêu ở trên;
- site mismatch ở chính `getWingsGoFeaturedTours` với Page `/tour` hợp lệ;
- curated ID thiếu hoặc duplicate trong helper mới;
- kiểm tra trực tiếp href của từng card trong Hero.

Các khoảng trống này không làm fail luồng hiện tại, nhưng test freshness nên bổ sung nếu giá là dữ liệu nhạy cảm về thương mại.

### Harness

`validation.md` hiện phản ánh đúng:\n
- một prop `heroFeaturedTours`;
- locale xuyên suốt;
- commercial departure;
- badge không tự sinh;
- empty state;
- 13/13 unit tests;
- 10/10 component tests;
- 0 errors/0 warnings;
- build 20/20 static pages.

Browser smoke VI/EN ở 390px và 1440px vẫn được ghi là pending. Đây là bằng chứng vận hành còn thiếu, nhưng không phải lỗi code được phát hiện trong vòng re-review.

---

## 4. Đánh giá theo tiêu chí

| Tiêu chí | Kết quả vòng 2 |
|---|---|
| Payload-first | Đạt |
| Một nguồn curation CMS | Đạt |
| Multi-site isolation | Đạt về code; nên bổ sung test mismatch trực tiếp |
| Một prop duy nhất | Đạt |
| Locale xuyên suốt | Đạt |
| Không có badge Hot giả | Đạt |
| Empty state | Đạt |
| Ngày/giá/promo cùng departure | Đạt |
| Giá xác minh còn hiệu lực | Đạt nếu legacy price không có freshness được cho phép; cần chốt chính sách |
| Unit/component tests | Đạt, 13/13 và 10/10 |
| TypeScript/lint/build | Đạt |
| Harness evidence | Đạt cho local checks; browser smoke còn pending |

## Quyết định re-review

**Approve có điều kiện / Ready for final acceptance.** Không còn P1 và không còn lỗi P2 bắt buộc phải sửa để bảo vệ luồng Hero. Trước khi đóng hoàn toàn US-077, nên thực hiện hai việc nhỏ:

1. Chốt và ghi rõ chính sách đối với `priceFrom` không có freshness metadata, đồng thời thêm test tương ứng.
2. Chạy browser smoke homepage WingsGo VI/EN ở 390px và 1440px, rồi cập nhật bằng chứng Harness/Plane.

Đã kiểm tra: diff code/test hiện tại, unit/component test mục tiêu, typecheck, ESLint, diff check và production build. Chưa kiểm tra: browser smoke trực tiếp và read-after-write Plane. Rủi ro còn lại là diễn giải dữ liệu giá legacy không có cửa sổ xác minh.
