# Code Review vòng 3 — US-077 Hero và Card curation

Ngày review: 2026-10-13
Phạm vi: thay đổi mới nhất nâng cấp Hero Commerce Panel thành mini-card, đổi tên section lịch khởi hành và khôi phục Grid 4 card `WingsGoTourCard`.

## 1. Kết luận

**Đạt về chức năng và chất lượng triển khai; chưa nên đóng hoàn toàn trước khi hoàn tất browser smoke và chỉnh lại bằng chứng Harness.**

Luồng mới đúng với feedback production:\n
- Hero hiển thị mini-card có thumbnail 56x56, badge CMS, title, ngày/hãng bay và giá.
- Section lịch đổi thành `Lịch khởi hành sắp tới`.
- Section card khôi phục Grid tối đa 4 `WingsGoTourCard` với ảnh lớn, badge, market, duration, summary, giá và departure.
- Hero và Grid dùng chung DTO `WingsGoCatalogCard` từ một lần lấy dữ liệu CMS ở `cmsPage.tsx`; không tạo nguồn catalog thứ hai.
- Không ảnh hưởng tenant khác theo code hiện tại.

Không phát hiện lỗi P1. Có ba điểm P2 cần ghi nhận: Hero và Grid hiện có thể hiển thị cùng các tour; badge cấp curation ngoài `promoLabel` chưa được mô hình hóa; acceptance criterion và Plane evidence còn chứa nội dung cũ.

---

## 2. Kiến trúc và hợp đồng dữ liệu

### Điểm đạt

`cmsPage.tsx` gọi `getWingsGoFeaturedTours` một lần cho homepage WingsGo rồi truyền:\n
- `heroFeaturedTours` cho `RenderHero`/`HighImpactHero`;
- `featuredTours` cho `WingsGoHomepageSections`.

Cả hai dùng cùng `WingsGoCatalogCard`, nên ngày, giá, media, promoLabel và site filtering đi qua cùng catalog domain. Đây là cách phù hợp với kiến trúc Payload-first.

Các điều kiện dữ liệu vẫn được kế thừa từ catalog helper:\n
- Page `/tour` phải thuộc site WingsGo;
- catalog phải enabled;
- wrapper, product và departure phải publish và cùng site;
- departure phải ở tương lai;
- locale được truyền xuống query;
- media cross-site không được đưa vào DTO.

`WingsGoTourCard` được tái sử dụng cho Grid thay vì tạo một component card thứ hai. Điều này giữ trải nghiệm trang `/tour` và homepage nhất quán.

### Multi-site isolation

Không thấy thay đổi nào làm lộ dữ liệu WingsSide hoặc WingsGroup. `cmsPage.tsx` vẫn chỉ tạo dữ liệu curation cho `site.code === 'wings-go'`, còn các query catalog vẫn lọc theo site ID.

### P2 — Hai vị trí có thể lặp cùng tour

Hero lấy tối đa 3 card từ `wingsGoFeaturedTours`, còn Grid lấy tối đa 4 card từ cùng mảng `featuredTours`. Vì vậy ba tour đầu có thể xuất hiện ở cả Hero và Grid.

Đây không phải lỗi dữ liệu hoặc tenant isolation, nhưng có thể làm người dùng cảm thấy trang lặp nội dung dù tiêu đề đã khác.

Có ba hướng xử lý:

1. Chấp nhận lặp có chủ đích vì Hero là teaser và Grid là phần khám phá chi tiết.
2. Hero ưu tiên chỉ các tour có `promoLabel`, Grid hiển thị toàn bộ featured.
3. Thêm curation riêng `heroFeaturedTours` trong Pages nếu business cần kiểm soát không trùng tuyệt đối.

**Khuyến nghị:** dùng hướng 2 trước vì không cần đổi schema. Chỉ thêm field curation riêng khi đội vận hành cần chọn độc lập từng vị trí.

---

## 3. Review UI/UX

### Hero mini-card

Triển khai đáp ứng đúng feedback production:\n
- thumbnail bo góc 56x56;
- fallback icon khi thiếu ảnh;
- badge gradient cam/amber khi có `promoLabel`;
- title giới hạn một dòng;
- ngày/hãng bay giới hạn một dòng;
- giá nổi bật ở cạnh phải;
- toàn bộ item là `SiteLink`;
- hover và focus kế thừa hành vi link nội bộ.

Không còn danh sách text trơn như phiên bản trước.

### Grid card

`WingsGoTourCard` có đầy đủ:

- ảnh tỷ lệ 16:10;
- badge ở góc ảnh;
- market và duration;
- title và summary;
- giá từ hoặc contact fallback;
- khởi hành gần nhất;
- CTA xem tour;
- responsive grid `1 → 2 → 4` cột.

Điều này phù hợp với giai đoạn khám phá tour và đáp ứng yêu cầu “giàu hình ảnh” của người dùng.

### P2 — Badge “feature” chưa có nguồn riêng

Card chỉ hiển thị `badge` truyền vào hoặc `card.nextDeparture.promoLabel`. Vì vậy các nhãn `Hot`, `Feature`, `Nổi bật` chỉ xuất hiện nếu CMS lưu trong `promoLabel` của departure.

Nếu business phân biệt “tour được chọn biên tập” với “khuyến mại của một departure”, nên tách dữ liệu:\n
- `departure.promoLabel`: ưu đãi của departure cụ thể;
- metadata curation cấp tour: `featuredBadge` hoặc `featuredReason`;
- `Pages.wingsGoTourCatalog.featuredTours`: thứ tự tour được chọn.

Không nên tự sinh “Hot” theo vị trí card vì sẽ tạo popularity giả.

### Responsive và hình ảnh

CSS đã có breakpoint mobile cho `.site-departure-row`, và Grid dùng `sm:grid-cols-2 xl:grid-cols-4`. Tuy nhiên chưa có browser screenshot/visual smoke mới để xác nhận:\n
- title dài không làm panel cao bất thường;
- giá không bị tràn ở mobile;
- ảnh thumbnail không bị méo;
- Grid 4 card không làm thay đổi nhịp dọc homepage quá nhiều;
- Hero panel và section card không tạo cảm giác lặp quá mạnh.

Đây là lý do chưa thể kết luận visual acceptance hoàn toàn từ test component.

### P2 — Dùng raw `<img>` và disable lint

Hero và `WingsGoTourCard` dùng `<img>` với eslint disable cho `@next/next/no-img-element`. Cách này nhất quán với implementation hiện có và build pass, nhưng bỏ qua tối ưu ảnh của Next.js.

Không phải blocker US-077. Nếu ảnh Hero tăng lớn hoặc cần Core Web Vitals, nên chuyển thumbnail/cover sang component ảnh chuẩn có kích thước và priority phù hợp.

---

## 4. Kiểm thử và Harness

### Kết quả đã chạy lại

```text
Unit:\n  pnpm run test:unit -- tests/unit/wingsGoCatalog.unit.spec.ts tests/unit/wingsGoPriorityMarketDeparture.unit.spec.ts
  2 files, 13 tests passed

Component:\n  pnpm run test:component -- tests/component/heroPresentations.component.spec.tsx tests/component/wingsGoTourCatalog.component.spec.tsx
  2 files, 11 tests passed

TypeScript:\n  pnpm exec tsc --noEmit --pretty false
  passed

ESLint:\n  các file code/test liên quan
  0 errors, 0 warnings

git diff --check:\n  passed

Build:\n  pnpm run build
  Next compile passed
  TypeScript passed
  static pages 20/20
  postbuild standalone preparation passed
```

Component test mới xác nhận badge động của `WingsGoTourCard`. Các test Hero trước đó vẫn bảo vệ promo badge và empty state.

### Khoảng trống kiểm thử

Chưa có test component cho toàn bộ `WingsGoHomepageSections` với:\n
- chính xác 4 card featured;
- card thiếu ảnh;
- title/summary dài;
- Grid locale EN;
- CTA `/tour`;
- kiểm tra Hero/Grid có hoặc không lặp ID theo chính sách đã chọn.

Chưa có browser smoke để xác nhận layout thực tế ở 390px và 1440px.

### Harness evidence không đồng bộ

`validation.md` đã cập nhật checkpoint mới với 13/13 unit và 11/11 component, nhưng acceptance criterion TASK-07 vẫn còn câu “không còn khối featured trùng lặp phía dưới Hero”. Thiết kế mới đã khôi phục Grid featured bên dưới Hero, nên tiêu chí này cần đổi thành:\n
> Không còn khối lịch/tour mở bán trùng nhãn; Grid featured bên dưới Hero là section khám phá riêng, dùng tiêu đề và vai trò khác.

`harness query matrix` vẫn hiển thị evidence US-077 từ checkpoint cũ với số test 9/9 và 6/6 + 3/3. Cần đồng bộ lại evidence customer-facing trước khi chuyển trạng thái hoàn tất.

---

## 5. Đánh giá theo tiêu chí

| Tiêu chí | Đánh giá |
|---|---|
| Payload-first | Đạt |
| Tái sử dụng catalog DTO | Đạt |
| Multi-site isolation | Đạt về code |
| Hero mini-card | Đạt về cấu trúc và dữ liệu |
| Grid card giàu hình ảnh | Đạt |
| Badge không dựng giả | Đạt với promoLabel; badge curation cấp tour chưa có field riêng |
| Responsive layout | Chưa có browser evidence |
| Unit/component tests | Đạt, 13/13 và 11/11 |
| TypeScript/lint/build | Đạt |
| Harness acceptance/docs | Cần đồng bộ TASK-07 và matrix evidence |
| Plane/browser release evidence | Chưa hoàn tất |

## 6. Quyết định review

**Approve về code với điều kiện hoàn thiện release evidence.** Không phát hiện lỗi P1 hoặc lỗi làm sai dữ liệu CMS. Bản triển khai hiện đáp ứng feedback chính: Hero trực quan hơn và section Grid card đã trở lại.

Trước khi đóng US-077, nên làm theo thứ tự:

1. Quyết định có chấp nhận cùng tour xuất hiện ở Hero và Grid hay lọc Hero chỉ lấy tour có `promoLabel`.
2. Cập nhật TASK-07 trong `validation.md` để phản ánh Grid featured mới.
3. Đồng bộ lại Harness matrix với test evidence 13/13 và 11/11.
4. Chạy browser smoke VI/EN ở 390px và 1440px, kiểm tra ảnh, title dài, giá và khoảng cách giữa Hero/Grid.
5. Nếu business cần badge `Hot/Feature` độc lập với departure, bổ sung field curation cấp tour trong Pages hoặc `tour-products`.

Đã kiểm tra: diff code/test hiện tại, CodeGraph call paths, unit/component tests, typecheck, ESLint, `git diff --check`, Harness matrix và production build. Chưa kiểm tra: browser screenshot trực tiếp và read-after-write Plane. Rủi ro còn lại chủ yếu là trải nghiệm visual và việc lặp cùng tour giữa Hero với Grid.
