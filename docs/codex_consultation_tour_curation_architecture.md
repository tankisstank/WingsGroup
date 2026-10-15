## 1. Hiện trạng cần xử lý

US-078 hiện vẫn gắn dữ liệu trực tiếp vào:

```text
Pages.wingsGoTourCatalog.featuredTours
```

Trường này giới hạn tối đa 6 tour, lọc cùng site và dùng `FeaturedToursCurationField` để kéo thả, mô phỏng trực quan:

[wingsGoTourCatalog.ts](E:/repo/WingsTravel/app/src/fields/wingsGoTourCatalog.ts:10)

Frontend `/tour` chỉ bật catalog khi trang có pathname `/tour` và `enabled = true`:

[wingsGoCatalog.ts](E:/repo/WingsTravel/app/src/tours/wingsGoCatalog.ts:381)

Homepage lại tìm riêng Page có pathname `/tour` rồi lấy `featuredTours`:

[cmsPage.tsx](E:/repo/WingsTravel/app/src/app/(frontend)/cmsPage.tsx:134)

Vì vậy hiện tại có hai ràng buộc cứng:

1. Bộ tour thuộc về Page `/tour`.
2. Homepage biết dữ liệu qua truy vấn Page `/tour`.

Nếu chỉ đưa field ra Collection nhưng giữ nguyên hai hàm này, landing page mới vẫn không sử dụng được.

Ngoài ra, hook revalidate hiện tập trung vào `/tour` và các trang `/tour/*`:

[revalidatePage.ts](E:/repo/WingsTravel/app/src/collections/Pages/hooks/revalidatePage.ts:18)

Khi curation trở thành collection độc lập, hook của collection phải chủ động revalidate homepage và các Page đang sử dụng bộ đó.

---

# 2. Đánh giá khả thi trong Payload CMS 3.x multisite

## Có thể triển khai bằng các cơ chế native

Payload đã có đủ cơ chế cần thiết:

- Collection có `site` relationship.
- Access control theo site.
- Draft/publish.
- Relationship tới `tour-products`.
- Custom Admin Field để tái sử dụng Live Simulator.
- Collection hooks cho validation và cache invalidation.
- Migration tự sinh cho schema mới.
- PostgreSQL làm database chính, Redis làm cache.

Điều này phù hợp với nguyên tắc multisite hiện tại của repository: collection mới phải cân nhắc `site`, localization, access scope và public visibility ([strategy 19](<E:/repo/WingsTravel/source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md:426>)).

---

# 3. So sánh bốn phương án

| Tiêu chí | P1 Global | P2 Collection | P3 Block thuần | P4 Hybrid |
|---|---:|---:|---:|---:|
| Multisite tự nhiên | 2/5 | 5/5 | 3/5 | 5/5 |
| Nhiều bộ curation có tên | 1/5 | 5/5 | 2/5 | 5/5 |
| Reuse trên nhiều Page | 2/5 | 5/5 | 2/5 | 5/5 |
| Homepage tự lấy dữ liệu | 4/5 | 4/5 | 2/5 | 5/5 |
| Live Simulator | 4/5 | 5/5 | 3/5 | 5/5 |
| Truy cập từ sidebar | 4/5 | 5/5 | 2/5 | 5/5 |
| Migration an toàn | 4/5 | 3/5 | 2/5 | 4/5 |

## Phương án 1 — Global theo Site

### Ưu điểm

- Truy cập trực tiếp từ menu chính.
- Phù hợp với một cấu hình mặc định duy nhất.
- Ít bảng và ít quan hệ hơn.

### Vấn đề kiến trúc

Payload Global là singleton theo slug. Một Global `TourCuration` không tự tạo ra nhiều bản ghi cho WingsGo, WingSide và WingsGroup.

Nếu thêm field `site` vào Global:

```text
TourCuration.site = wings-go
```

thì chỉ có một bản ghi Global. Khi đổi sang WingSide, editor sẽ thay đổi cùng bản ghi đó.

Có thể lưu dạng:

```text
sites: [
  {
    site: wings-go,
    featuredTours: [...]
  },
  {
    site: wing-side,
    featuredTours: [...]
  }
]
```

nhưng khi đó phải tự xây:

- UI chọn site.
- Access control từng phần tử.
- Validation quan hệ tour cùng site.
- Logic chọn bộ mặc định.
- Logic cho Page tham chiếu tới một site entry.
- Cơ chế chống editor ghi đè site khác.

Relationship field của Payload trỏ tới Collection. Để Page chọn một Global, ứng dụng phải tự lưu slug hoặc key rồi tự resolve, làm mất referential integrity của relationship.

### Đánh giá

Global phù hợp cho:

```text
Một cấu hình curation mặc định duy nhất của toàn hệ thống
```

Không phù hợp với yêu cầu:

```text
Trang chủ Mùa Thu
Tour Hot Tết
Catalog Chính
Campaign Nhật Bản
```

---

## Phương án 2 — Collection `TourCurations`

Mỗi bản ghi là một bộ tour có tên.

### Ưu điểm

- Native multisite.
- Có nhiều bộ curation.
- Có draft/publish.
- Có quyền theo site.
- Có thể gắn nhiều Page.
- Có thể hiển thị trực tiếp ở sidebar.
- Live Simulator có thể tái sử dụng gần như nguyên trạng.
- Có thể truy vấn “đang được dùng ở đâu”.

### Nhược điểm

Nếu chỉ thêm Collection và relationship vào Page, Editor sẽ phải:

1. Vào menu `Bộ curation tour`.
2. Tạo hoặc sửa bộ tour.
3. Quay lại Page.
4. Gắn bộ đó vào Page.

Đây là vấn đề UX thật, nhưng giải quyết được bằng flow quản trị:

- Relationship picker có nút **Tạo bộ curation mới**.
- Sau khi lưu, tự quay lại Page và tự gắn bản ghi vừa tạo.
- Page hiển thị preview thu gọn và nút **Mở bộ curation**.
- Collection hiển thị cột `Đang dùng ở X trang`.
- Có nút `Đặt làm mặc định cho site`.

### Đánh giá

Đây là nền tảng dữ liệu tốt nhất. Tuy nhiên, Collection đơn độc chưa giải quyết cách chèn bộ tour vào vị trí tùy ý trong Page.

---

## Phương án 3 — Page Composer Block

Ví dụ:

```text
WingsGoTourCurationBlock
  curation: relationship -> tour-curations
```

### Ưu điểm

- Editor thấy vị trí hiển thị ngay trong Page layout.
- Có thể dùng trên campaign page, seasonal page, event page.
- Phù hợp với Page Composer.
- Có thể có nhiều block trên cùng một Page.

### Hạn chế

Nếu Block tự chứa:

```text
featuredTours: [tour IDs]
```

thì mỗi Page sẽ có một bản sao curation riêng. Khi đổi thứ tự tour, các Page khác không cập nhật.

Homepage hiện không phụ thuộc hoàn toàn vào `page.layout`. `cmsPage.tsx` đang gọi riêng `getWingsGoFeaturedTours` để truyền dữ liệu vào Hero và homepage sections. Vì vậy Block thuần sẽ không tự điều khiển được homepage nếu không thêm một cơ chế khác.

Live Simulator cũng bị phân tách:

- Simulator trong Block chỉ mô phỏng instance của Block.
- Simulator trong `/tour` có thể khác dữ liệu homepage.
- Nếu cùng một bộ tour dùng ở ba Page, editor phải chỉnh nhiều instance.

### Đánh giá

Block nên là **lớp trình bày/tham chiếu**, không nên là nơi sở hữu dữ liệu curation.

---

## Phương án 4 — Hybrid

Gồm ba lớp:

```text
TourCurations Collection
        ↓
Page relationship hoặc reference block
        ↓
Frontend resolver
        ↓
Homepage default fallback
```

Cụ thể:

- Collection quản lý các bộ tour có tên.
- Page có thể gắn một bộ curation.
- Landing page dùng reference block để chọn bộ curation.
- Homepage dùng bộ `isDefault` của site.
- `/tour` dùng cùng bộ curation để ưu tiên thứ tự catalog.
- Dữ liệu cũ được đọc fallback trong thời gian chuyển đổi.

Đây là phương án đáp ứng đầy đủ yêu cầu mà vẫn giữ được Live Simulator và khả năng rollback.

---

# 4. UX Editor được khuyến nghị

## Menu chính

Thêm Collection vào sidebar với nhãn rõ ràng:

```text
Bộ tour nổi bật
```

Không dùng tên kỹ thuật như `TourCurations` trong giao diện.

Danh sách nên có các cột:

```text
Tên bộ tour
Site
Mặc định cho site
Số tour
Đang dùng ở
Trạng thái
Cập nhật lần cuối
```

Collection nên nằm trong nhóm nội dung hoặc nhóm riêng `Curation tour`, không bị ẩn trong `Pages`.

## Màn hình chỉnh sửa Collection

Tái sử dụng `FeaturedToursCurationField` hiện có, chỉ đổi nguồn field:

```text
Pages.wingsGoTourCatalog.featuredTours
```

thành:

```text
TourCurations.featuredTours
```

Giữ nguyên:

- Drag & drop.
- Tối đa 6 tour.
- Không trùng tour.
- Cảnh báo thiếu lịch bay.
- Cảnh báo thiếu `promoLabel`.
- Desktop/tablet/mobile simulator.
- Tour picker lọc cùng site.

## Màn hình chỉnh sửa Page

Trong Page nên có:

```text
WingsGo tour catalog
  - Bật catalog
  - Bộ tour nổi bật: [relationship]
  - Mở bộ curation
  - Preview thu gọn
```

Trường `featuredTours` cũ giữ lại ở trạng thái deprecated trong giai đoạn chuyển tiếp.

## Flow tránh “hai nơi”

Relationship picker nên hỗ trợ:

```text
[Chọn bộ có sẵn] [Tạo bộ mới]
```

Sau khi chọn hoặc tạo xong, Page hiển thị:

```text
Đang dùng: Catalog Chính
Site: WingsGo
6 tour
Đang dùng ở: 3 trang
[Mở bộ curation]
[Đổi bộ]
```

Homepage không cần bắt Editor vào Page `/tour`. Editor chỉ cần đánh dấu một bộ là:

```text
Mặc định cho site
```

---

# 5. Schema đề xuất

## Collection `tour-curations`

```text
TourCurations
├── site
│   └── relationship -> sites
├── name
│   └── text, required
├── isDefault
│   └── checkbox, default false
├── featuredTours
│   └── relationship -> tour-products
│       hasMany: true
│       maxRows: 6
│       same-site filter
└── _status
    └── draft / published
```

Đề xuất thêm:

```text
description
```

chỉ dành cho Editor, không cần render public.

`name` nên là tên quản trị, không nhất thiết localized. Tên tour, giá, `promoLabel` và ngày bay được lấy theo locale ở thời điểm render.

### Validation

Dùng lại rule hiện tại trong `validateWingsGoTourCatalog.ts` bằng cách tách phần kiểm tra thành hàm dùng chung:

- Tối đa 6 tour.
- Không trùng tour.
- Tour cùng site.
- Tour đã publish.
- Có wrapper page `/tour/<slug>` cùng site.
- Có departure tương lai đã publish.
- Không cho publish curation vi phạm các điều kiện trên.

### Default theo site

`isDefault = true` phải có tối đa một bản ghi trên mỗi site.

Nên bảo vệ ở hai lớp:

1. `beforeChange` tự bỏ default của bản ghi cũ cùng site.
2. PostgreSQL partial unique index làm lớp bảo vệ cuối.

Nếu local SQLite không dùng cùng kiểu index, hook vẫn phải bảo đảm hành vi đúng trong môi trường bootstrap.

## Thay đổi trên `Pages`

```text
wingsGoTourCatalog
├── enabled
├── curation
│   └── relationship -> tour-curations
└── featuredTours
    └── legacy relationship, giữ lại trong giai đoạn chuyển tiếp
```

`featuredTours` cũ không nên xóa ngay. US-078 yêu cầu bảo toàn quan hệ ID trong `pages_rels` ([overview.md](<E:/repo/WingsTravel/docs/stories/epics/E07-tour-product-platform/US-078-wingsgo-tour-curation-console/overview.md:67>)).

## Reference Block

```text
WingsGoTourCuration
└── curation
    └── relationship -> tour-curations
```

Block này chỉ tham chiếu tới Collection. Nó không chứa mảng `featuredTours`.

Render contract:

- Block trên campaign page: hiển thị nhóm tour nổi bật.
- `/tour`: dùng cùng curation để sắp xếp phần featured của catalog.
- Homepage: dùng site default.
- Không nhân bản danh sách ID giữa các Page.

---

# 6. Resolver và thứ tự ưu tiên dữ liệu

Nên tách resolver khỏi giả định Page phải có pathname `/tour`.

Thứ tự đọc public:

```text
1. Curation được Page/Block gắn trực tiếp và đã publish
2. Curation mặc định của site và đã publish
3. Dữ liệu legacy từ Page /tour
4. Fallback catalog hiện tại
```

Pseudo-contract:

```text
resolveWingsGoTourCuration({
  site,
  curationID?,
  locale,
})
```

Hàm này trả về:

```text
{
  curationID,
  featuredTours,
  source: 'page' | 'default' | 'legacy' | 'catalog-fallback'
}
```

Không nên tạo một Page giả có pathname `/tour` để tái sử dụng query cũ. Nên refactor `queryWingsGoTourCatalog` để nhận nguồn curation độc lập. Hiện tại hàm này từ chối Page không phải `/tour`:

[wingsGoCatalog.ts](E:/repo/WingsTravel/app/src/tours/wingsGoCatalog.ts:400)

---

# 7. Performance và Redis cache

## Query

Collection mới giúp homepage bỏ được bước tìm Page `/tour`.

Luồng mới:

```text
find published TourCuration theo site/default
→ lấy tối đa 6 tour ID
→ hydrate tour, wrapper page, departure
→ trả featured cards
```

`queryWingsGoTourCatalog` hiện đang đọc bounded inventory của wrapper, product và departure. Khi thêm nhiều landing page, không nên để mỗi Page chạy lại toàn bộ catalog nếu chỉ cần 3–6 tour nổi bật.

Nên tách:

- Query curation cards theo ID.
- Query full catalog cho `/tour`.

## Cache key

Có thể dùng helper cache hiện có với key dạng:

```text
wingsgo-curation:{siteID}:{curationID|default}:{locale}
```

Chỉ cache dữ liệu public đã publish. Không cache:

- Draft.
- Admin preview.
- Dữ liệu phụ thuộc user.
- Query có filter riêng của catalog.

## Invalidation

Khi `TourCurations` thay đổi:

```text
invalidate curation cache
revalidate homepage
revalidate các Page đang tham chiếu
revalidate /tour nếu curation đang dùng tại đó
```

Khi `TourProduct`, `TourDeparture` hoặc wrapper thay đổi:

```text
invalidate các curation chứa tour đó
revalidate các Page liên quan
```

Current hook chỉ revalidate `/tour` và `/tour/*`, nên hook mới phải bổ sung homepage. Nếu sau này dùng Redis cache mà bỏ qua bước này, homepage có thể giữ card, giá hoặc ngày bay cũ.

---

# 8. Migration và tương thích ngược

## Migration đề xuất

### Bước 1 — Thêm schema

- Tạo `TourCurations`.
- Thêm relationship `curation` vào `Pages`.
- Thêm reference block nếu cần.
- Tạo migration Payload.
- Không xóa field cũ.

## Bước 2 — Backfill dữ liệu hiện tại

Với Page `/tour` ID 208:

```text
Tạo TourCuration:
  name: Catalog Chính
  site: WingsGo
  isDefault: true
  featuredTours: copy từ Page 208
```

Sau đó gắn `Page 208.curation` tới bản ghi mới.

Mảng cũ trong `pages_rels` vẫn giữ nguyên.

## Bước 3 — Dual read

Resolver mới đọc theo thứ tự:

```text
curation relationship
→ site default
→ legacy Page /tour
```

Nếu Collection mới lỗi hoặc chưa có dữ liệu, trang hiện tại vẫn render theo cơ chế cũ.

## Bước 4 — Kiểm chứng

Cần kiểm tra:

- `/tour`.
- Homepage VI/EN.
- Một campaign page có reference block.
- Editor có thể kéo thả trong Collection.
- Editor WingsGo không nhìn thấy tour của site khác.
- Curation draft không xuất hiện public.
- Curation bị xóa khi còn được tham chiếu phải bị chặn hoặc yêu cầu gỡ liên kết trước.

## Bước 5 — Deprecate field cũ

Sau ít nhất một chu kỳ release ổn định:

- Ẩn `featuredTours` cũ khỏi giao diện Editor.
- Tiếp tục giữ dữ liệu để rollback.
- Chỉ xóa sau khi có kế hoạch migration riêng và đã xác nhận không còn consumer.

---

# 9. Các điểm implementation phải chạm tới

Nếu triển khai, phạm vi tối thiểu gồm:

1. `app/src/collections/TourCurations.ts`
2. Đăng ký Collection trong `payload.config.ts`.
3. `adminLabels.ts` và `adminSiteContext.ts`.
4. Access/hook site scope.
5. Tách validator dùng chung với `validateWingsGoTourCatalog.ts`.
6. Chuyển `FeaturedToursCurationField` sang dùng trong Collection.
7. Refactor `wingsGoCatalog.ts` để nhận curation độc lập.
8. Cập nhật `cmsPage.tsx`.
9. Thêm `WingsGoTourCuration` reference block và renderer.
10. Revalidation cho curation, homepage, Page references và tour dependencies.
11. Migration/backfill cho Page `/tour` ID 208.
12. Generated Payload types.
13. Unit/integration tests cho resolver precedence, site isolation, validation và invalidation.
14. Cập nhật US-078, Harness evidence và Plane sau khi implementation hoàn tất.

---

# Khuyến nghị cuối cùng

Chọn:

```text
TourCurations Collection
+ isDefault theo site
+ Page relationship
+ WingsGoTourCuration reference block
+ legacy fallback
```

Phân vai rõ ràng:

```text
Collection  = nguồn dữ liệu curation
Page/Block  = nơi sử dụng curation
Homepage    = dùng default curation của site
Legacy      = fallback trong giai đoạn chuyển đổi
```

Phương án này giữ được Live Simulator của US-078, mở rộng được sang campaign/season/event page, cho Editor một mục riêng trong sidebar, và không phá quan hệ `pages_rels` hiện tại.

Đã đọc các tài liệu bắt buộc, CodeGraph, schema/hook/query liên quan và chạy `scripts/harness query matrix`. Chưa sửa file, chưa chạy migration/build/E2E; rủi ro chính còn lại là thiết kế chính xác flow “tạo curation rồi quay lại Page” và invalidation khi departure hoặc tour product thay đổi.
tokens used
801,564
# Kết luận

Tính năng hoàn toàn khả thi trong Payload CMS 3.x multisite. Phương án nên chọn là:

> **Phương án 4: Collection `TourCurations` quản lý tập trung + default theo site + block/reference để gắn vào Page.**

Collection là nguồn dữ liệu dùng chung. Page chỉ tham chiếu tới bộ curation. Homepage dùng bộ mặc định của site. Dữ liệu cũ trong `/tour` vẫn được đọc làm fallback trong giai đoạn chuyển đổi.

Không nên dùng Global làm nơi chứa nhiều bộ curation. Không nên để Page Composer Block tự sở hữu mảng tour, vì sẽ tạo bản sao dữ liệu và làm mất khả năng tái sử dụng.

---

## 1. Hiện trạng cần xử lý

US-078 hiện vẫn gắn dữ liệu trực tiếp vào:

```text
Pages.wingsGoTourCatalog.featuredTours
```

Trường này giới hạn tối đa 6 tour, lọc cùng site và dùng `FeaturedToursCurationField` để kéo thả, mô phỏng trực quan:

[wingsGoTourCatalog.ts](E:/repo/WingsTravel/app/src/fields/wingsGoTourCatalog.ts:10)

Frontend `/tour` chỉ bật catalog khi trang có pathname `/tour` và `enabled = true`:

[wingsGoCatalog.ts](E:/repo/WingsTravel/app/src/tours/wingsGoCatalog.ts:381)

Homepage lại tìm riêng Page có pathname `/tour` rồi lấy `featuredTours`:

[cmsPage.tsx](E:/repo/WingsTravel/app/src/app/(frontend)/cmsPage.tsx:134)

Vì vậy hiện tại có hai ràng buộc cứng:

1. Bộ tour thuộc về Page `/tour`.
2. Homepage biết dữ liệu qua truy vấn Page `/tour`.

Nếu chỉ đưa field ra Collection nhưng giữ nguyên hai hàm này, landing page mới vẫn không sử dụng được.

Ngoài ra, hook revalidate hiện tập trung vào `/tour` và các trang `/tour/*`:

[revalidatePage.ts](E:/repo/WingsTravel/app/src/collections/Pages/hooks/revalidatePage.ts:18)

Khi curation trở thành collection độc lập, hook của collection phải chủ động revalidate homepage và các Page đang sử dụng bộ đó.

---

# 2. Đánh giá khả thi trong Payload CMS 3.x multisite

## Có thể triển khai bằng các cơ chế native

Payload đã có đủ cơ chế cần thiết:

- Collection có `site` relationship.
- Access control theo site.
- Draft/publish.
- Relationship tới `tour-products`.
- Custom Admin Field để tái sử dụng Live Simulator.
- Collection hooks cho validation và cache invalidation.
- Migration tự sinh cho schema mới.
- PostgreSQL làm database chính, Redis làm cache.

Điều này phù hợp với nguyên tắc multisite hiện tại của repository: collection mới phải cân nhắc `site`, localization, access scope và public visibility ([strategy 19](<E:/repo/WingsTravel/source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md:426>)).

---

# 3. So sánh bốn phương án

| Tiêu chí | P1 Global | P2 Collection | P3 Block thuần | P4 Hybrid |
|---|---:|---:|---:|---:|
| Multisite tự nhiên | 2/5 | 5/5 | 3/5 | 5/5 |
| Nhiều bộ curation có tên | 1/5 | 5/5 | 2/5 | 5/5 |
| Reuse trên nhiều Page | 2/5 | 5/5 | 2/5 | 5/5 |
| Homepage tự lấy dữ liệu | 4/5 | 4/5 | 2/5 | 5/5 |
| Live Simulator | 4/5 | 5/5 | 3/5 | 5/5 |
| Truy cập từ sidebar | 4/5 | 5/5 | 2/5 | 5/5 |
| Migration an toàn | 4/5 | 3/5 | 2/5 | 4/5 |

## Phương án 1 — Global theo Site

### Ưu điểm

- Truy cập trực tiếp từ menu chính.
- Phù hợp với một cấu hình mặc định duy nhất.
- Ít bảng và ít quan hệ hơn.

### Vấn đề kiến trúc

Payload Global là singleton theo slug. Một Global `TourCuration` không tự tạo ra nhiều bản ghi cho WingsGo, WingSide và WingsGroup.

Nếu thêm field `site` vào Global:

```text
TourCuration.site = wings-go
```

thì chỉ có một bản ghi Global. Khi đổi sang WingSide, editor sẽ thay đổi cùng bản ghi đó.

Có thể lưu dạng:

```text
sites: [
  {
    site: wings-go,
    featuredTours: [...]
  },
  {
    site: wing-side,
    featuredTours: [...]
  }
]
```

nhưng khi đó phải tự xây:

- UI chọn site.
- Access control từng phần tử.
- Validation quan hệ tour cùng site.
- Logic chọn bộ mặc định.
- Logic cho Page tham chiếu tới một site entry.
- Cơ chế chống editor ghi đè site khác.

Relationship field của Payload trỏ tới Collection. Để Page chọn một Global, ứng dụng phải tự lưu slug hoặc key rồi tự resolve, làm mất referential integrity của relationship.

### Đánh giá

Global phù hợp cho:

```text
Một cấu hình curation mặc định duy nhất của toàn hệ thống
```

Không phù hợp với yêu cầu:

```text
Trang chủ Mùa Thu
Tour Hot Tết
Catalog Chính
Campaign Nhật Bản
```

---

## Phương án 2 — Collection `TourCurations`

Mỗi bản ghi là một bộ tour có tên.

### Ưu điểm

- Native multisite.
- Có nhiều bộ curation.
- Có draft/publish.
- Có quyền theo site.
- Có thể gắn nhiều Page.
- Có thể hiển thị trực tiếp ở sidebar.
- Live Simulator có thể tái sử dụng gần như nguyên trạng.
- Có thể truy vấn “đang được dùng ở đâu”.

### Nhược điểm

Nếu chỉ thêm Collection và relationship vào Page, Editor sẽ phải:

1. Vào menu `Bộ curation tour`.
2. Tạo hoặc sửa bộ tour.
3. Quay lại Page.
4. Gắn bộ đó vào Page.

Đây là vấn đề UX thật, nhưng giải quyết được bằng flow quản trị:

- Relationship picker có nút **Tạo bộ curation mới**.
- Sau khi lưu, tự quay lại Page và tự gắn bản ghi vừa tạo.
- Page hiển thị preview thu gọn và nút **Mở bộ curation**.
- Collection hiển thị cột `Đang dùng ở X trang`.
- Có nút `Đặt làm mặc định cho site`.

### Đánh giá

Đây là nền tảng dữ liệu tốt nhất. Tuy nhiên, Collection đơn độc chưa giải quyết cách chèn bộ tour vào vị trí tùy ý trong Page.

---

## Phương án 3 — Page Composer Block

Ví dụ:

```text
WingsGoTourCurationBlock
  curation: relationship -> tour-curations
```

### Ưu điểm

- Editor thấy vị trí hiển thị ngay trong Page layout.
- Có thể dùng trên campaign page, seasonal page, event page.
- Phù hợp với Page Composer.
- Có thể có nhiều block trên cùng một Page.

### Hạn chế

Nếu Block tự chứa:

```text
featuredTours: [tour IDs]
```

thì mỗi Page sẽ có một bản sao curation riêng. Khi đổi thứ tự tour, các Page khác không cập nhật.

Homepage hiện không phụ thuộc hoàn toàn vào `page.layout`. `cmsPage.tsx` đang gọi riêng `getWingsGoFeaturedTours` để truyền dữ liệu vào Hero và homepage sections. Vì vậy Block thuần sẽ không tự điều khiển được homepage nếu không thêm một cơ chế khác.

Live Simulator cũng bị phân tách:

- Simulator trong Block chỉ mô phỏng instance của Block.
- Simulator trong `/tour` có thể khác dữ liệu homepage.
- Nếu cùng một bộ tour dùng ở ba Page, editor phải chỉnh nhiều instance.

### Đánh giá

Block nên là **lớp trình bày/tham chiếu**, không nên là nơi sở hữu dữ liệu curation.

---

## Phương án 4 — Hybrid

Gồm ba lớp:

```text
TourCurations Collection
        ↓
Page relationship hoặc reference block
        ↓
Frontend resolver
        ↓
Homepage default fallback
```

Cụ thể:

- Collection quản lý các bộ tour có tên.
- Page có thể gắn một bộ curation.
- Landing page dùng reference block để chọn bộ curation.
- Homepage dùng bộ `isDefault` của site.
- `/tour` dùng cùng bộ curation để ưu tiên thứ tự catalog.
- Dữ liệu cũ được đọc fallback trong thời gian chuyển đổi.

Đây là phương án đáp ứng đầy đủ yêu cầu mà vẫn giữ được Live Simulator và khả năng rollback.

---

# 4. UX Editor được khuyến nghị

## Menu chính

Thêm Collection vào sidebar với nhãn rõ ràng:

```text
Bộ tour nổi bật
```

Không dùng tên kỹ thuật như `TourCurations` trong giao diện.

Danh sách nên có các cột:

```text
Tên bộ tour
Site
Mặc định cho site
Số tour
Đang dùng ở
Trạng thái
Cập nhật lần cuối
```

Collection nên nằm trong nhóm nội dung hoặc nhóm riêng `Curation tour`, không bị ẩn trong `Pages`.

## Màn hình chỉnh sửa Collection

Tái sử dụng `FeaturedToursCurationField` hiện có, chỉ đổi nguồn field:

```text
Pages.wingsGoTourCatalog.featuredTours
```

thành:

```text
TourCurations.featuredTours
```

Giữ nguyên:

- Drag & drop.
- Tối đa 6 tour.
- Không trùng tour.
- Cảnh báo thiếu lịch bay.
- Cảnh báo thiếu `promoLabel`.
- Desktop/tablet/mobile simulator.
- Tour picker lọc cùng site.

## Màn hình chỉnh sửa Page

Trong Page nên có:

```text
WingsGo tour catalog
  - Bật catalog
  - Bộ tour nổi bật: [relationship]
  - Mở bộ curation
  - Preview thu gọn
```

Trường `featuredTours` cũ giữ lại ở trạng thái deprecated trong giai đoạn chuyển tiếp.

## Flow tránh “hai nơi”

Relationship picker nên hỗ trợ:

```text
[Chọn bộ có sẵn] [Tạo bộ mới]
```

Sau khi chọn hoặc tạo xong, Page hiển thị:

```text
Đang dùng: Catalog Chính
Site: WingsGo
6 tour
Đang dùng ở: 3 trang
[Mở bộ curation]
[Đổi bộ]
```

Homepage không cần bắt Editor vào Page `/tour`. Editor chỉ cần đánh dấu một bộ là:

```text
Mặc định cho site
```

---

# 5. Schema đề xuất

## Collection `tour-curations`

```text
TourCurations
├── site
│   └── relationship -> sites
├── name
│   └── text, required
├── isDefault
│   └── checkbox, default false
├── featuredTours
│   └── relationship -> tour-products
│       hasMany: true
│       maxRows: 6
│       same-site filter
└── _status
    └── draft / published
```

Đề xuất thêm:

```text
description
```

chỉ dành cho Editor, không cần render public.

`name` nên là tên quản trị, không nhất thiết localized. Tên tour, giá, `promoLabel` và ngày bay được lấy theo locale ở thời điểm render.

### Validation

Dùng lại rule hiện tại trong `validateWingsGoTourCatalog.ts` bằng cách tách phần kiểm tra thành hàm dùng chung:

- Tối đa 6 tour.
- Không trùng tour.
- Tour cùng site.
- Tour đã publish.
- Có wrapper page `/tour/<slug>` cùng site.
- Có departure tương lai đã publish.
- Không cho publish curation vi phạm các điều kiện trên.

### Default theo site

`isDefault = true` phải có tối đa một bản ghi trên mỗi site.

Nên bảo vệ ở hai lớp:

1. `beforeChange` tự bỏ default của bản ghi cũ cùng site.
2. PostgreSQL partial unique index làm lớp bảo vệ cuối.

Nếu local SQLite không dùng cùng kiểu index, hook vẫn phải bảo đảm hành vi đúng trong môi trường bootstrap.

## Thay đổi trên `Pages`

```text
wingsGoTourCatalog
├── enabled
├── curation
│   └── relationship -> tour-curations
└── featuredTours
    └── legacy relationship, giữ lại trong giai đoạn chuyển tiếp
```

`featuredTours` cũ không nên xóa ngay. US-078 yêu cầu bảo toàn quan hệ ID trong `pages_rels` ([overview.md](<E:/repo/WingsTravel/docs/stories/epics/E07-tour-product-platform/US-078-wingsgo-tour-curation-console/overview.md:67>)).

## Reference Block

```text
WingsGoTourCuration
└── curation
    └── relationship -> tour-curations
```

Block này chỉ tham chiếu tới Collection. Nó không chứa mảng `featuredTours`.

Render contract:

- Block trên campaign page: hiển thị nhóm tour nổi bật.
- `/tour`: dùng cùng curation để sắp xếp phần featured của catalog.
- Homepage: dùng site default.
- Không nhân bản danh sách ID giữa các Page.

---

# 6. Resolver và thứ tự ưu tiên dữ liệu

Nên tách resolver khỏi giả định Page phải có pathname `/tour`.

Thứ tự đọc public:

```text
1. Curation được Page/Block gắn trực tiếp và đã publish
2. Curation mặc định của site và đã publish
3. Dữ liệu legacy từ Page /tour
4. Fallback catalog hiện tại
```

Pseudo-contract:

```text
resolveWingsGoTourCuration({
  site,
  curationID?,
  locale,
})
```

Hàm này trả về:

```text
{
  curationID,
  featuredTours,
  source: 'page' | 'default' | 'legacy' | 'catalog-fallback'
}
```

Không nên tạo một Page giả có pathname `/tour` để tái sử dụng query cũ. Nên refactor `queryWingsGoTourCatalog` để nhận nguồn curation độc lập. Hiện tại hàm này từ chối Page không phải `/tour`:

[wingsGoCatalog.ts](E:/repo/WingsTravel/app/src/tours/wingsGoCatalog.ts:400)

---

# 7. Performance và Redis cache

## Query

Collection mới giúp homepage bỏ được bước tìm Page `/tour`.

Luồng mới:

```text
find published TourCuration theo site/default
→ lấy tối đa 6 tour ID
→ hydrate tour, wrapper page, departure
→ trả featured cards
```

`queryWingsGoTourCatalog` hiện đang đọc bounded inventory của wrapper, product và departure. Khi thêm nhiều landing page, không nên để mỗi Page chạy lại toàn bộ catalog nếu chỉ cần 3–6 tour nổi bật.

Nên tách:

- Query curation cards theo ID.
- Query full catalog cho `/tour`.

## Cache key

Có thể dùng helper cache hiện có với key dạng:

```text
wingsgo-curation:{siteID}:{curationID|default}:{locale}
```

Chỉ cache dữ liệu public đã publish. Không cache:

- Draft.
- Admin preview.
- Dữ liệu phụ thuộc user.
- Query có filter riêng của catalog.

## Invalidation

Khi `TourCurations` thay đổi:

```text
invalidate curation cache
revalidate homepage
revalidate các Page đang tham chiếu
revalidate /tour nếu curation đang dùng tại đó
```

Khi `TourProduct`, `TourDeparture` hoặc wrapper thay đổi:

```text
invalidate các curation chứa tour đó
revalidate các Page liên quan
```

Current hook chỉ revalidate `/tour` và `/tour/*`, nên hook mới phải bổ sung homepage. Nếu sau này dùng Redis cache mà bỏ qua bước này, homepage có thể giữ card, giá hoặc ngày bay cũ.

---

# 8. Migration và tương thích ngược

## Migration đề xuất

### Bước 1 — Thêm schema

- Tạo `TourCurations`.
- Thêm relationship `curation` vào `Pages`.
- Thêm reference block nếu cần.
- Tạo migration Payload.
- Không xóa field cũ.

## Bước 2 — Backfill dữ liệu hiện tại

Với Page `/tour` ID 208:

```text
Tạo TourCuration:
  name: Catalog Chính
  site: WingsGo
  isDefault: true
  featuredTours: copy từ Page 208
```

Sau đó gắn `Page 208.curation` tới bản ghi mới.

Mảng cũ trong `pages_rels` vẫn giữ nguyên.

## Bước 3 — Dual read

Resolver mới đọc theo thứ tự:

```text
curation relationship
→ site default
→ legacy Page /tour
```

Nếu Collection mới lỗi hoặc chưa có dữ liệu, trang hiện tại vẫn render theo cơ chế cũ.

## Bước 4 — Kiểm chứng

Cần kiểm tra:

- `/tour`.
- Homepage VI/EN.
- Một campaign page có reference block.
- Editor có thể kéo thả trong Collection.
- Editor WingsGo không nhìn thấy tour của site khác.
- Curation draft không xuất hiện public.
- Curation bị xóa khi còn được tham chiếu phải bị chặn hoặc yêu cầu gỡ liên kết trước.

## Bước 5 — Deprecate field cũ

Sau ít nhất một chu kỳ release ổn định:

- Ẩn `featuredTours` cũ khỏi giao diện Editor.
- Tiếp tục giữ dữ liệu để rollback.
- Chỉ xóa sau khi có kế hoạch migration riêng và đã xác nhận không còn consumer.

---

# 9. Các điểm implementation phải chạm tới

Nếu triển khai, phạm vi tối thiểu gồm:

1. `app/src/collections/TourCurations.ts`
2. Đăng ký Collection trong `payload.config.ts`.
3. `adminLabels.ts` và `adminSiteContext.ts`.
4. Access/hook site scope.
5. Tách validator dùng chung với `validateWingsGoTourCatalog.ts`.
6. Chuyển `FeaturedToursCurationField` sang dùng trong Collection.
7. Refactor `wingsGoCatalog.ts` để nhận curation độc lập.
8. Cập nhật `cmsPage.tsx`.
9. Thêm `WingsGoTourCuration` reference block và renderer.
10. Revalidation cho curation, homepage, Page references và tour dependencies.
11. Migration/backfill cho Page `/tour` ID 208.
12. Generated Payload types.
13. Unit/integration tests cho resolver precedence, site isolation, validation và invalidation.
14. Cập nhật US-078, Harness evidence và Plane sau khi implementation hoàn tất.

---

# Khuyến nghị cuối cùng

Chọn:

```text
TourCurations Collection
+ isDefault theo site
+ Page relationship
+ WingsGoTourCuration reference block
+ legacy fallback
```

Phân vai rõ ràng:

```text
Collection  = nguồn dữ liệu curation
Page/Block  = nơi sử dụng curation
Homepage    = dùng default curation của site
Legacy      = fallback trong giai đoạn chuyển đổi
```

Phương án này giữ được Live Simulator của US-078, mở rộng được sang campaign/season/event page, cho Editor một mục riêng trong sidebar, và không phá quan hệ `pages_rels` hiện tại.

Đã đọc các tài liệu bắt buộc, CodeGraph, schema/hook/query liên quan và chạy `scripts/harness query matrix`. Chưa sửa file, chưa chạy migration/build/E2E; rủi ro chính còn lại là thiết kế chính xác flow “tạo curation rồi quay lại Page” và invalidation khi departure hoặc tour product thay đổi.

