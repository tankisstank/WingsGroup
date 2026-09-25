# KẾ HOẠCH TRIỂN KHAI IMPORT DỮ LIỆU TOUR DOICANHVIET VÀO WINGSGO

## 1. Cảnh báo và quyết định kiến trúc

Tài liệu này là nguồn triển khai chính cho việc đưa dữ liệu tour đã crawl từ
`doicanhviet.com` vào site `WingsGo` trong hệ multisite WingsTravel.

### Phạm vi US-044 đã xác nhận

- Site đích duy nhất của US-044 là `WingsGo`, với site code `wings-go`.
- Các tham chiếu lịch sử gọi US-044 là import cho `WingSide` hoặc dùng
  `wing-side` không thay đổi target này và không được dùng để chạy dry-run,
  import, rollback hoặc publish.
- Mọi implementation và bằng chứng vận hành tiếp theo phải resolve đúng
  `wings-go` trước khi đọc hoặc ghi Payload.

Các ràng buộc bắt buộc:

- không crawl lại website và không gọi mạng để bổ sung dữ liệu trong pipeline;
- chỉ đọc dữ liệu đã có tại `E:\repo\doicanhviet-crawler`;
- không chạy `clearSiteContent` và không xóa dữ liệu WingsGo hiện hữu;
- các phase lõi không thay đổi schema Payload hoặc migration PostgreSQL;
- mọi Page, TourProduct và TourDeparture được import dưới dạng draft;
- không publish tự động;
- không tạo DepartureVariant hoặc tự động gom nhiều tour nguồn;
- không import bài news vào TourProducts;
- chưa import tour nội địa khi enum `market` chưa hỗ trợ;
- giá người lớn được map vào `priceFrom`; bảng giá đầy đủ được giữ trong
  artifact đối soát;
- Page wrapper là thành phần bắt buộc để route tour, SEO và breadcrumb hoạt động;
- public slug phải mô tả tour; `tourCode=DCV-<sourceId>` là khóa idempotent trong
  Payload cho phase lõi.

Nếu muốn lưu provenance hoặc bảng giá đầy đủ trực tiếp trong Payload, dự án phải
đi qua phase mở rộng schema riêng, có migration và validation độc lập.

## 2. Mục tiêu và kết quả cần đạt

Mục tiêu là biến dữ liệu crawler dạng HTML/text/table/media thành dữ liệu có cấu
trúc, có thể biên tập và publish an toàn trên WingsGo.

Kết quả sau các phase lõi:

- có bộ parser TypeScript đọc dữ liệu crawler trên đĩa;
- có normalized dataset và báo cáo duyệt trước khi ghi DB;
- có quyết định rõ cho từng source record: create, skip hoặc reject;
- có importer Payload chạy dry-run và create-only;
- mỗi tour được duyệt có Page wrapper, TourProduct, Media và các TourDeparture
  tương lai hợp lệ;
- import có thể chạy lại mà không nhân bản tour;
- lỗi một tour không làm hỏng toàn bộ batch và không để lại dữ liệu dang dở;
- tour chỉ được publish sau khi detail, market và schedule đã qua QA;
- dữ liệu giá chưa map hết vẫn còn trong artifact để phục vụ phase mở rộng.

Không thuộc mục tiêu các phase lõi:

- hiển thị giá trẻ em, em bé hoặc phụ thu phòng đơn;
- tự động hợp nhất tour giống nhau;
- tự động tạo variant;
- tự động tạo review, FAQ, badge hoặc nội dung marketing không có bằng chứng;
- import bài news sang Posts;
- mở thêm market nội địa;
- ghi đè nội dung đã được editor chỉnh sửa.

## 3. Hiện trạng dữ liệu và hệ thống đích

### 3.1 Dữ liệu nguồn đã kiểm kê

Nguồn trên đĩa:

```text
E:\repo\doicanhviet-crawler\
├── storage\
│   ├── datasets\default\*.json
│   └── images\<tour_id>\*
├── src\
└── tests\
```

Snapshot kiểm kê ngày 15/07/2026:

| Hạng mục | Số lượng | Cách xử lý |
| --- | ---: | --- |
| Dataset record thực tế | 64 | Đọc và classify |
| File metadata dataset | 1 | Loại khỏi record tour |
| Tour hợp lệ sơ bộ | 51 | Tiếp tục normalize |
| Pagination bị nhận nhầm | 8 | Reject |
| Bài news | 5 | Tách khỏi pipeline tour |
| Tour thuộc market hiện hỗ trợ | 47 | Có thể review để import |
| Tour nội địa chưa có market | 4 | Giữ artifact, không import phase lõi |
| Tour có bảng giá | 46 | Parse departure candidates |
| Dòng bảng giá trước expand ngày | 111 | Giữ raw và normalize |
| Tour có ảnh local | 31 | Phân loại media |
| Tour không có ảnh local | 20 | Draft/reject tùy publish gate |
| Tham chiếu ảnh của tour hợp lệ | 248 | Dedupe và upload có kiểm soát |

Phân bố market có thể hỗ trợ ngay:

| Category nguồn | Market Payload | Số tour sơ bộ |
| --- | --- | ---: |
| `han-quoc` | `korea` | 18 |
| `nhat-ban` | `japan` | 10 |
| `trung-quoc` | `china` | 19 |

Số tour được publish cuối cùng có thể thấp hơn vì phải loại dữ liệu lỗi, tour
không có departure tương lai và tour trùng với nội dung WingsGo hiện hữu.

### 3.2 Cấu trúc đích trên WingsGo

Một route tour public hiện cần chuỗi dữ liệu:

```text
Page wrapper /tour/<slug>
    -> TourProduct theo cùng slug và site
        -> Media
        -> TourDepartures
        -> section resolver
        -> TourDetailPage
```

Vai trò từng collection:

| Collection | Vai trò trong phase lõi |
| --- | --- |
| `pages` | Route, pathname, SEO, canonical, breadcrumb và wrapper public |
| `media` | Hero và gallery có site scope |
| `tour-products` | Nội dung tour gốc, itinerary và cấu hình section |
| `tour-departures` | Ngày đi, ngày về, hãng bay, điểm đi và giá người lớn |
| `departure-variants` | Không tạo trong phase lõi |
| `tour-campaigns` | Không tự động cập nhật trong phase lõi |

Market page query trực tiếp TourProducts theo `market` và dùng departures để
tính giá thấp nhất, ngày gần nhất và số đợt. Schedule page query departures của
toàn site WingsGo. Vì vậy một record publish sai có thể ảnh hưởng nhiều bề mặt,
không chỉ trang detail.

## 4. Kiến trúc pipeline tổng thể

```text
Dữ liệu crawler trên đĩa
        |
        v
Phase 0 - Chuẩn bị và khóa phạm vi
        |
        v
Phase 1 - Parse, classify và normalize
        |
        +--> tours.normalized.json
        +--> import-review.md
        |
        v
Phase 2 - Duyệt và chốt import-decisions.json
        |
        v
Phase 3 - Payload dry-run và preflight
        |
        v
Phase 4 - Import draft create-only
        |
        v
Phase 5 - QA và biên tập
        |
        v
Phase 6 - Publish theo batch và hậu kiểm
        |
        +--> Phase 7 - Ổn định và tối ưu dữ liệu
        +--> Phase 8 - Mở rộng bảng giá
        +--> Phase 9 - Provenance trong CMS và variant
        +--> Phase 10 - Tour nội địa và news
```

Phase 0–6 là delivery lõi. Phase 7–10 là các initiative tiếp theo, không phải
điều kiện để hoàn thành import lần đầu.

## 5. Tổ chức source code và artifact

Source code dự kiến:

```text
app/scripts/
├── parse-doicanhviet.ts
├── import-doicanhviet.ts
└── lib/doicanhviet/
    ├── types.ts
    ├── source-reader.ts
    ├── classifier.ts
    ├── content-parser.ts
    ├── itinerary-parser.ts
    ├── pricing-parser.ts
    ├── date-parser.ts
    ├── media-parser.ts
    ├── duplicate-detector.ts
    ├── review-writer.ts
    ├── payload-preflight.ts
    └── payload-importer.ts
```

Unit và integration tests:

```text
app/tests/unit/doicanhviet/
app/tests/int/doicanhvietImport.int.spec.ts
```

Artifact sinh tự động:

```text
artifacts/imports/doicanhviet/
├── tours.normalized.json
├── import-review.md
├── import-decisions.json
├── import-dry-run.json
├── import-result.json
├── import-errors.json
└── media-manifest.json
```

Nguyên tắc lưu trữ:

- không commit ảnh crawler vào WingsTravel;
- không đặt normalized JSON lớn trong `docs/` hoặc `source/`;
- `source/strategy/` giữ kế hoạch và quyết định;
- `artifacts/imports/` giữ dữ liệu máy sinh và bằng chứng chạy;
- không chỉnh tay `tours.normalized.json`; mọi quyết định thủ công nằm trong
  `import-decisions.json`.

## 6. Contract dữ liệu trung gian

Normalized record phải đủ để importer không cần đọc lại HTML hoặc suy diễn lại
khi ghi DB.

```typescript
export type NormalizedTour = {
  source: {
    sourceSystem: 'doicanhviet'
    sourceId: string
    sourceKey: string
    sourceUrl: string
    crawledAt: string
    sourceHash: string
  }
  classification: {
    kind: 'tour' | 'news' | 'pagination' | 'invalid'
    market: 'korea' | 'japan' | 'china' | null
    originalCategory: string | null
  }
  wrapperPage: {
    title: string
    slug: string
    pathname: string
    meta: {
      title: string | null
      description: string | null
      imageSourceKey: string | null
    }
  }
  product: {
    tourCode: string
    title: string
    slug: string
    market: 'korea' | 'japan' | 'china' | null
    durationDays: number | null
    durationNights: number | null
    summary: string | null
    highlights: Array<{ title: string; description: string }>
    routeStops: Array<{
      order: number
      label: string
      type: 'origin' | 'arrival' | 'sightseeing' | 'overnight' | 'return'
    }>
    itineraryDays: NormalizedItineraryDay[]
    includes: string[]
    excludes: string[]
    servicesSummary: NormalizedServicesSummary
    sectionVisibility: string[]
    meta: {
      title: string | null
      description: string | null
      breadcrumbLabel: string | null
    }
  }
  departures: NormalizedDeparture[]
  rawPricing: Array<{
    headers: string[]
    rows: string[][]
  }>
  media: NormalizedMedia[]
  quality: {
    warnings: string[]
    blockingErrors: string[]
    duplicateCandidates: DuplicateCandidate[]
    publishEligible: boolean
  }
}
```

Mỗi field quan trọng nên giữ bằng chứng parse:

```typescript
export type ParsedValue<T> = {
  value: T
  sourceFragment: string
  confidence: number
  parserRule: string
  requiresReview: boolean
}
```

Importer chỉ sử dụng `value`, nhưng review report phải hiển thị confidence,
source fragment và warning tương ứng.

## 7. Phase 0 — Chuẩn bị và khóa phạm vi

### 7.1 Công việc

1. Ghi nhận snapshot nguồn:
   - đường dẫn crawler root;
   - số record;
   - checksum file JSON;
   - số và dung lượng ảnh;
   - thời điểm crawl.
2. Xác nhận target site code là `wings-go`.
3. Xác nhận user chạy import là `super-admin`.
4. Chụp backup DB dev/staging trước lần import ghi dữ liệu.
5. Chốt mode duy nhất của phase lõi là `create-only`.
6. Chốt không thay đổi schema và không chạy migration.
7. Chốt toàn bộ import đầu tiên ở locale `vi`.
8. Ghi nhận sáu TourProduct WingsGo hiện hữu làm tập so sánh duplicate.

### 7.2 Đầu ra

- source inventory có checksum;
- DB backup có thể restore;
- danh sách site/user/locale đã xác nhận;
- import run ID đầu tiên;
- baseline số lượng Page, Media, TourProduct và TourDeparture của WingsGo.

### 7.3 Exit gate

- không còn nhầm lẫn giữa WingsGo và site khác;
- backup restore được;
- không có command nào gọi `clearSiteContent`;
- không có schema delta trong phase lõi;
- source snapshot không thay đổi trong lúc parser chạy.

## 8. Phase 1 — Parse, classify và normalize

### 8.1 Đọc nguồn

Script `parse-doicanhviet.ts` đọc:

```text
storage/datasets/default/*.json
storage/images/<tour_id>/*
```

Script bỏ `__metadata__.json`, không gọi HTTP và không thay đổi crawler repo.

### 8.2 Classify record

| Điều kiện | Kind | Hành động |
| --- | --- | --- |
| URL khớp `/pages/p-<n>.html` | `pagination` | Reject |
| Category là `tin-tuc-nuoc-ngoai` hoặc `tin-nuoc-ngoai` | `news` | Tách khỏi tour |
| Có heading, duration và nội dung tour | `tour` | Normalize |
| Không đủ bằng chứng | `invalid` | Reject và báo lỗi |

### 8.3 Mapping market

```text
han-quoc   -> korea
nhat-ban   -> japan
trung-quoc -> china
```

`da-nang`, `dien-bien`, `mien-trung` và category nội địa khác được giữ trong
artifact nhưng có `market=null`, `UNSUPPORTED_MARKET` và không được approved
trong phase lõi.

### 8.4 Parse identity và summary

Thứ tự lấy title:

1. `content.heading`;
2. `meta.og_title`;
3. `meta.title` đã bỏ suffix thương hiệu.

Thứ tự lấy summary:

1. block tóm tắt có selector rõ ràng;
2. đoạn giới thiệu trước heading lịch trình;
3. `meta.description`;
4. `meta.og_description`.

Parser phải loại social labels, title lặp, nút chia sẻ, bảng giá và navigation.

### 8.5 Sinh public slug và khóa nguồn

Khóa idempotent trong Payload:

```text
tourCode = DCV-<sourceId>
```

Public slug theo thứ tự:

1. route chuẩn hóa;
2. duration;
3. hãng bay nếu cần tránh trùng;
4. điểm khởi hành nếu cần tránh trùng;
5. source ID chỉ dùng fallback cuối.

Ví dụ:

```text
seoul-nami-everland-5n4d
seoul-nami-everland-5n4d-vj
seoul-nami-everland-5n4d-215093
```

Không dùng `dcv-215093` làm URL public mặc định.

### 8.6 Parse duration và itinerary

Duration được đọc từ heading trước, fallback body text. Parser hỗ trợ các dạng:

```text
5N4Đ
5N4D
5 ngày 4 đêm
5 Ngày - 4 Đêm
```

Marker ngày hỗ trợ:

```text
NGÀY 1:
NGÀY 01:
NGÀY 1 -
NGÀY 1 –
NGÀY 1.
NGÀY1:
```

Mỗi itinerary day map tối thiểu:

```typescript
export type NormalizedItineraryDay = {
  dayNumber: number
  title: string
  route?: string
  summary: string
  meals?: string
  transport?: string
  accommodation?: string
  notes?: string
  sleepingStandard?: string
  equipmentNote?: string
  mediaSourceKeys?: string[]
}
```

`dayTheme` và `dayHighlight` chỉ được sinh khi có nội dung nguồn rõ ràng. Không
tạo câu marketing mẫu để lấp field.

Blocking rules:

- không có duration;
- không có itinerary day;
- day number trùng;
- day number không liên tục;
- `parsedDayCount !== durationDays`;
- thiếu title hoặc summary của một ngày.

### 8.7 Parse route và dịch vụ

Route stops được tổng hợp từ heading và itinerary, sau đó phân loại:

- `origin`: điểm xuất phát;
- `arrival`: điểm đến đầu tiên;
- `sightseeing`: điểm tham quan;
- `overnight`: nơi ngủ đêm;
- `return`: chặng về.

Services mapping:

| Nguồn | Target normalized |
| --- | --- |
| Giá/dịch vụ bao gồm | `includes[]` |
| Giá/dịch vụ không bao gồm | `excludes[]` |
| Khách sạn/nghỉ đêm | `servicesSummary.hotelSummary` |
| Bữa ăn | `servicesSummary.mealsSummary` |
| Máy bay/xe/tàu | `servicesSummary.transportSummary` |
| Điều kiện, lưu ý, visa, hoàn/hủy | `servicesSummary.notes[]` |

Không chuyển toàn bộ body HTML thành một field generic trên tour.

### 8.8 Parse bảng giá và departure candidates

Raw table luôn được giữ nguyên trong `rawPricing`.

Phase lõi chỉ map giá người lớn vào `priceFrom`. Các cột giá trẻ em, em bé và
phòng đơn tạo warning `PARTIAL_PRICE_MAPPING`, không bị xóa khỏi artifact.

Một ô nhiều ngày phải expand thành nhiều candidate:

```text
22/10;24/10/2026
    -> 2026-10-22
    -> 2026-10-24
```

Quy tắc suy năm:

1. năm ghi trực tiếp cùng ngày;
2. truyền năm trong cùng ô;
3. năm trong cùng bảng;
4. năm ghi rõ trong title/body;
5. không dùng `crawled_at` để suy năm cho record publish.

Nếu vẫn thiếu năm, gắn `AMBIGUOUS_DEPARTURE_YEAR` và không tạo departure.

Departure candidate tối thiểu:

```typescript
export type NormalizedDeparture = {
  departureDate: string
  returnDate: string
  departureCity?: string
  airline?: string
  priceFrom: number
  currency: 'VND'
  availabilityStatus: 'open'
  isFeatured: boolean
  sourceRowIndex: number
}
```

Chỉ giữ candidate ghi DB khi:

- ngày parse hợp lệ và có năm rõ;
- ngày bằng hoặc sau ngày chạy import;
- `priceFrom > 0`;
- duration hợp lệ để tính return date;
- airline và departure city không mâu thuẫn với nội dung nguồn.

Ngày quá khứ tiếp tục nằm trong raw pricing nhưng không tạo draft departure.

### 8.9 Parse và phân loại media

Pipeline chỉ đọc ảnh local, không tải lại `og_image`.

Mỗi file được tính SHA-256 và phân loại:

```text
hero-candidate
itinerary
price-poster
map
logo
unknown
```

Tên deterministic khi upload:

```text
dcv-<sourceId>-<index>-<hash8>.<ext>
```

Hero candidate phải thỏa:

- file đọc được;
- MIME được Media collection hỗ trợ;
- kích thước và tỷ lệ phù hợp;
- không phải logo hoặc bảng giá;
- không phải exact duplicate chất lượng thấp;
- có liên hệ rõ với tour.

Không có hero phù hợp tạo `NO_APPROVED_HERO`.

### 8.10 Sinh section visibility

| Section | Điều kiện bật tự động |
| --- | --- |
| `hero` | Có title, summary và hero candidate |
| `facts` | Có duration, route và ít nhất một fact bổ sung |
| `why-choose` | Có ít nhất hai highlight có bằng chứng |
| `route` | Có ít nhất hai route stop |
| `itinerary` | Day count khớp duration |
| `services` | Có includes, excludes, lưu trú hoặc service note |
| `departures` | Có ít nhất một future departure hợp lệ |
| `sticky-cta` | Có future departure hợp lệ |
| `reviews` | Không bật tự động |
| `faq` | Không bật tự động |
| `related` | Không bật tự động |

### 8.11 Duplicate candidates

Parser không merge. Nó chỉ so sánh source tour với TourProducts WingsGo hiện
hữu hoặc inventory snapshot theo:

- market;
- duration;
- route chuẩn hóa;
- itinerary skeleton;
- điểm ngủ đêm;
- airline và departure city.

Nếu có khả năng trùng, gắn `POSSIBLE_EXISTING_PRODUCT`, liệt kê candidate và
đặt `publishEligible=false` cho tới khi có quyết định thủ công.

### 8.12 Đầu ra và exit gate

Đầu ra:

- `tours.normalized.json`;
- `import-review.md`;
- media hashes;
- tổng hợp warnings/blockers;
- duplicate candidate list.

Exit gate:

- 64 dataset records được classify đúng tổng số;
- pagination và news không nằm trong danh sách tour import;
- parser deterministic: cùng input sinh cùng normalized output và source hash;
- không có HTTP request;
- mọi field bắt buộc có source evidence hoặc warning;
- test parser pass.

## 9. Phase 2 — Duyệt và chốt quyết định import

### 9.1 Review report

`import-review.md` có một dòng cho mỗi source record:

| Field review | Nội dung |
| --- | --- |
| Source ID | ID nguồn |
| Kind | tour/news/pagination/invalid |
| Title | Title normalize |
| Market | Market dự kiến |
| Duration | Ngày/đêm |
| Itinerary | Parsed/expected day count |
| Departures | Tổng candidate/tương lai/bị loại |
| Media | Tổng file/hero candidate |
| Duplicate | Candidate hiện hữu |
| Warnings | Cảnh báo cần duyệt |
| Blocking errors | Lỗi chặn import/publish |

### 9.2 Decision file

Người duyệt không sửa normalized JSON. Quyết định nằm trong:

```json
{
  "215093": {
    "approved": true,
    "action": "create",
    "approvedSlug": "seoul-nami-everland-5n4d",
    "approvedHeroSourceKey": "dcv:215093:media:01",
    "notes": "Tạo draft mới để QA."
  },
  "218945": {
    "approved": false,
    "action": "skip",
    "notes": "Trùng tour Seoul - Jeju hiện hữu."
  }
}
```

Phase lõi chỉ cho phép:

```text
create
skip
reject
```

`merge` và `create-variant` không phải action hợp lệ trong phase lõi.

### 9.3 Exit gate

- mọi tour dự định ghi DB có decision rõ;
- không approved news, pagination, invalid hoặc unsupported market;
- duplicate candidate đã được xử lý;
- slug và hero được duyệt;
- blocking errors bằng 0 cho record approved;
- người duyệt ký nhận report hoặc lưu bằng chứng chấp thuận tương đương.

## 10. Phase 3 — Payload dry-run và preflight

### 10.1 Khởi tạo Payload an toàn

Importer dùng pattern:

```typescript
const payload = await getPayload({ config })
const req = await createLocalReq({ user: adminUser }, payload)
```

User được resolve bằng `--admin-email` hoặc biến môi trường, sau đó kiểm tra:

- tồn tại;
- role là `super-admin`;
- không log password, token hoặc session;
- không tự tạo admin production.

Site được resolve bằng:

```text
code = wings-go
```

Nếu thiếu site hoặc có nhiều kết quả không nhất quán, preflight fail toàn batch.

### 10.2 Kiểm tra trước khi ghi

Dry-run thực hiện đầy đủ lookup nhưng không mutate:

- kiểm tra source files và checksum;
- kiểm tra DB connection;
- resolve site và user;
- resolve parent Page `/tour`;
- tìm TourProduct theo `site + tourCode`;
- kiểm tra slug/pathname collision;
- kiểm tra media deterministic filename;
- mô phỏng số Page, Product, Media và Departure sẽ tạo;
- kiểm tra decision và blocking errors;
- xác nhận mọi record sẽ ở trạng thái draft.

### 10.3 Đầu ra

`import-dry-run.json` phải có:

```text
runId
sourceSnapshotHash
databaseTarget
siteId
adminUserId
createCounts
reuseCounts
skipCounts
rejectCounts
collisionDetails
blockingErrors
warnings
```

### 10.4 Exit gate

- dry-run không ghi DB;
- create/skip/reject totals khớp decisions;
- không có slug/pathname collision chưa xử lý;
- không có existing product mang cùng `tourCode` nhưng khác source decision;
- backup còn hiệu lực;
- dry-run report được duyệt trước khi import thật.

## 11. Phase 4 — Import draft create-only

### 11.1 Mode vận hành

Phase lõi chỉ hỗ trợ:

```text
--mode create-only
```

Không có `--overwrite`. Nếu tìm thấy TourProduct cùng `site + tourCode`, importer
skip toàn bộ source tour và không tạo thêm Page, Media hoặc Departure.

### 11.2 Trình tự một tour

1. Validate normalized record và decision.
2. Xác nhận `approved=true`, `action=create` và không có blocker.
3. Query TourProduct theo `site + tourCode`.
4. Nếu tồn tại, ghi `skippedExisting` và kết thúc tour.
5. Resolve/reuse/upload Media theo deterministic filename và hash manifest.
6. Resolve parent Page `/tour`.
7. Tạo Page wrapper draft.
8. Tạo TourProduct draft.
9. Update TourProduct để gán `wrapperPage`.
10. Tạo các TourDeparture draft tương lai.
11. Đọc lại Page, Product và Departures để xác minh relation/site/status.
12. Ghi kết quả và ID vào `import-result.json`.

### 11.3 Mapping Page wrapper

| Page field | Giá trị |
| --- | --- |
| `site` | WingsGo site ID |
| `title` | Approved tour title |
| `slug` | Approved public slug |
| `parentPage` | Page `/tour` |
| `pathname` | `/tour/<slug>` qua page path contract |
| `hero` | Nội dung tối thiểu, không thay thế structured tour renderer |
| `layout` | Rỗng hoặc wrapper-safe content theo Page contract |
| `meta.title` | SEO title đã duyệt |
| `meta.description` | SEO description đã duyệt |
| `meta.image` | Hero Media ID nếu có |
| `_status` | `draft` |

Page và Product phải dùng cùng site, slug, locale và trạng thái trước publish.

### 11.4 Mapping TourProduct

| TourProduct field | Giá trị |
| --- | --- |
| `site` | WingsGo site ID |
| `tourCode` | `DCV-<sourceId>` |
| `title` | Approved title |
| `slug` | Approved public slug |
| `market` | `korea`, `japan` hoặc `china` |
| `durationDays` | Parsed duration |
| `durationNights` | Parsed duration |
| `wrapperPage` | Page wrapper ID |
| `summary` | Approved summary |
| `heroMedia` | Approved hero Media ID |
| `gallery` | Approved gallery IDs |
| `highlights` | Chỉ các highlight có bằng chứng |
| `factSummary` | Route/meals/hotel có bằng chứng |
| `routeViz` | Stops và travel legs parse được |
| `primaryCTA.mode` | `inquiry` hoặc `hold-seat` theo decision |
| `primaryCTA.href` | Để trống để CTA helper giữ tour/departure context |
| `itineraryDays` | Structured days đã validate |
| `includes`, `excludes` | Structured service items |
| `servicesSummary` | Structured service summary |
| `sectionVisibility` | Sinh theo quality rules |
| `sectionOrder` | Registry order hiện hành |
| `bcfg` | Dense retail defaults phù hợp |
| `meta` | SEO mirror của Page wrapper |
| `_status` | `draft` |

Không tự động điền reviewSnapshot, FAQ, relatedTours, marketCard badges hoặc nội
dung marketing không có bằng chứng.

### 11.5 Mapping TourDeparture

| TourDeparture field | Giá trị |
| --- | --- |
| `site` | WingsGo site ID |
| `tourProduct` | Product vừa tạo |
| `variantRef` | Không đặt |
| `variantKey` | Không dùng làm relation variant trong phase lõi |
| `departureCity` | Parsed/approved origin |
| `departureDate` | ISO date tương lai |
| `returnDate` | Departure date + duration - 1 |
| `airline` | Parsed/approved airline |
| `priceFrom` | Giá người lớn |
| `currency` | `VND` |
| `availabilityStatus` | `open` chỉ khi date/price hợp lệ |
| `isFeatured` | Chỉ một future departure được duyệt |
| `note` | Ghi chú nguồn có thật hoặc cảnh báo giá cần xác nhận |
| `_status` | `draft` |

Không tạo published departure quá hạn hoặc thiếu năm.

### 11.6 Mapping Media

Media upload dùng `readFileByPath`-compatible Payload file object và gán:

- `site=WingsGo`;
- alt từ nguồn đã làm sạch, fallback title tour + thứ tự ảnh;
- filename deterministic;
- caption chỉ khi có nội dung nguồn rõ;
- không reuse media khác site.

`media-manifest.json` map:

```text
sourceKey
sourcePath
sha256
deterministicFilename
payloadMediaId
action=create|reuse
```

### 11.7 Xử lý lỗi và rollback

Mỗi tour có try/catch riêng và theo dõi:

```text
createdMediaIds
reusedMediaIds
createdPageId
createdProductId
createdDepartureIds
```

Khi lỗi:

1. xóa các Departure vừa tạo;
2. xóa Product vừa tạo;
3. xóa Page vừa tạo;
4. chỉ xóa Media được tạo trong cùng tour/run và chưa được record khác reuse;
5. không xóa record tồn tại trước run;
6. ghi rollback result và tiếp tục tour sau.

Nếu rollback không hoàn tất, batch kết thúc với trạng thái `partial-failure`,
không được chuyển sang QA/publish cho tới khi xử lý orphan records.

### 11.8 Exit gate

- mọi record mới là draft;
- create/skip/error totals được ghi;
- không có source tour bị nhân bản theo `tourCode`;
- không có Page/Product khác site;
- không có departure orphan;
- không có partial failure chưa xử lý;
- chạy lại cùng input ở create-only tạo 0 tour mới.

## 12. Phase 5 — QA và biên tập

### 12.1 QA dữ liệu trong Payload

Với mỗi tour draft:

- title, slug, market và tourCode đúng;
- Page wrapper và Product cùng site/slug;
- duration khớp số itinerary day;
- route stops đúng thứ tự;
- bữa ăn, di chuyển và lưu trú không bị trộn ngày;
- includes/excludes không chứa policy sai nhóm;
- hero không phải logo hoặc bảng giá;
- gallery không có ảnh lỗi;
- departure date, return date, airline, origin và adult price đúng;
- raw pricing còn nguyên trong artifact;
- sectionVisibility không tạo section rỗng;
- không có review hoặc badge giả.

### 12.2 QA bề mặt public bằng preview/draft

Kiểm tra ít nhất:

```text
/wingsgo/tour/<slug>
/wingsgo/thi-truong/<market>
/wingsgo/lich-khoi-hanh
```

Tour detail:

- Page route resolve được;
- breadcrumb/canonical đúng;
- hero, route, itinerary, services và departures hiển thị đúng;
- CTA giữ đúng tour/departure context;
- không có technical/internal copy;
- mobile và desktop không vỡ layout.

Market page:

- tour thuộc đúng market;
- không có duplicate chưa duyệt;
- giá thấp nhất và ngày gần nhất đúng;
- tour không có future departure không được hiểu nhầm là đang mở bán.

Schedule page:

- chỉ departure hợp lệ xuất hiện sau publish;
- filter market/airline/status đúng;
- không có ngày quá khứ hoặc giá zero;
- CTA trỏ đúng product/departure.

### 12.3 Editorial completion

Editor được phép:

- sửa title/summary/SEO;
- chọn lại hero/gallery;
- chỉnh itinerary theo nguồn;
- bổ sung highlights có bằng chứng;
- chỉnh services notes;
- xác nhận departure và trạng thái bán;
- quyết định related tours sau khi inventory ổn định.

Editor không được:

- tạo review giả;
- tự đoán giá trẻ em từ adult price;
- publish departure quá hạn;
- thay source tour bằng nội dung không thể đối soát mà không ghi chú biên tập.

### 12.4 Exit gate

- product checklist pass;
- detail preview pass desktop/mobile;
- market/schedule impact pass;
- không còn blocker;
- Page, Product và Departures đã được xác nhận publish cùng đợt;
- có bằng chứng QA cho pilot và từng batch.

## 13. Phase 6 — Publish theo batch và hậu kiểm

### 13.1 Chiến lược rollout

Batch 1 — một pilot:

- tour có ảnh local tốt;
- đủ itinerary;
- có bảng giá nhiều ngày;
- có future departure;
- không trùng product hiện hữu.

Batch 2 — ba market:

- một tour Hàn Quốc;
- một tour Nhật Bản;
- một tour Trung Quốc.

Batch 3 — nhóm nhỏ:

- publish theo nhóm đã duyệt;
- kiểm tra market và schedule sau mỗi nhóm;
- không publish full 47 tour trong một thao tác đầu tiên.

### 13.2 Thứ tự publish một tour

1. Xác nhận backup và import result.
2. Publish Media không cần version status nhưng phải tồn tại và accessible.
3. Publish Page wrapper.
4. Publish TourProduct.
5. Publish TourDepartures đã duyệt.
6. Purge/revalidate theo hook hiện hành.
7. Smoke detail, market và schedule.

Nếu Product/Page chưa cùng trạng thái hoặc relation chưa hoàn chỉnh, không publish
Departure.

### 13.3 Hậu kiểm

Sau mỗi batch:

- route trả 200;
- canonical đúng domain WingsGo;
- không leak dữ liệu site khác;
- market count thay đổi đúng số dự kiến;
- schedule count thay đổi đúng số departure;
- next departure và lowest price đúng;
- logs không có revalidation hoặc query error;
- chạy lại importer create-only không tạo duplicate.

### 13.4 Rollback publish

Khi phát hiện lỗi:

1. unpublish affected Departures;
2. unpublish affected Product;
3. unpublish Page wrapper;
4. giữ artifact và import result để điều tra;
5. không xóa record nếu có thể sửa bằng draft;
6. restore DB chỉ khi lỗi batch không thể cô lập bằng unpublish.

### 13.5 Exit gate

- mọi batch pass smoke;
- không có tour/departure sai market hoặc quá hạn;
- không có duplicate public;
- Plane/customer tracking chỉ được cập nhật khi delivery status thật sự thay đổi;
- có final import report và danh sách record chưa import kèm lý do.

## 14. Phase 7 — Ổn định và tối ưu dữ liệu sau import

Phase này không đổi schema và bắt đầu sau khi batch lõi ổn định.

Công việc:

- rà duplicate draft và public;
- tạo relatedTours thủ công;
- biên tập marketCard;
- bổ sung FAQ từ policy đã được xác nhận;
- bổ sung badges có governance;
- tối ưu ảnh hero/gallery;
- chuẩn hóa airline/origin naming;
- bổ sung redirects nếu slug thay đổi;
- audit SEO và structured data;
- đối soát raw pricing với dữ liệu sales mới nhất;
- archive/unpublish departure hết hạn theo quy trình vận hành.

Exit gate:

- inventory tour không còn duplicate chưa xử lý;
- related/marketCard/FAQ không chứa nội dung suy diễn sai;
- route và SEO không bị thay đổi ngoài kiểm soát;
- có quy trình cập nhật departure định kỳ.

## 15. Phase 8 — Mở rộng bảng giá nhiều nhóm khách

Phase này là schema initiative độc lập.

### 15.1 Mục tiêu

Hiển thị và quản trị đầy đủ:

- giá người lớn;
- giá trẻ em;
- giá em bé;
- phụ thu phòng đơn;
- quy tắc độ tuổi/ngủ chung;
- note theo từng tier.

### 15.2 Schema đề xuất

```typescript
priceRows: Array<{
  type: 'adult' | 'child' | 'infant' | 'single-supplement' | 'other'
  label: string
  amount: number
  currency: 'VND'
  ageFrom?: number
  ageTo?: number
  sharingBed?: boolean
  note?: string
}>
```

### 15.3 Công việc bắt buộc

- quyết định data model và validation;
- migration PostgreSQL forward/backward;
- cập nhật TourDepartures collection;
- generate payload-types;
- cập nhật view model whitelist;
- cập nhật departure renderer;
- cập nhật schedule/detail responsive UI;
- parser map raw pricing sang priceRows;
- backfill từ artifact phase lõi;
- migration smoke và E2E.

### 15.4 Exit gate

- không mất `priceFrom` hiện hữu;
- adult price tương thích ngược;
- child/infant/supplement hiển thị đúng;
- raw headers/age rule được kiểm chứng;
- migration PostgreSQL pass;
- detail và schedule pass desktop/mobile.

## 16. Phase 9 — Provenance trong CMS và DepartureVariant

Phase này chỉ triển khai khi đội vận hành cần audit/update nguồn trực tiếp trong
Payload hoặc muốn hợp nhất các tour giống nhau.

### 16.1 Provenance schema

Nhóm field đề xuất:

```typescript
sourceInfo: {
  sourceSystem: string
  sourceId: string
  sourceUrl: string
  crawledAt: string
  sourceHash: string
  importVersion: string
  importRunId: string
}
```

Yêu cầu:

- unique logic theo site + sourceSystem + sourceId;
- field không leak ra public view model;
- backfill từ `import-result.json`;
- idempotency chuyển từ `tourCode` sang sourceInfo;
- vẫn giữ tourCode cho nghiệp vụ nếu editor cần.

### 16.2 Variant consolidation

Không tự động merge. Hệ thống chỉ đề xuất candidate; editor xác nhận:

- cùng market;
- cùng duration;
- route và itinerary skeleton tương đồng;
- khác origin, airline hoặc bounded itinerary fields;
- không làm thay đổi canonical identity ngoài ý muốn.

Quy trình:

1. Chọn base TourProduct.
2. Tạo DepartureVariant inactive.
3. Chuyển bounded overrides.
4. Relink Departures.
5. Preview variant resolution.
6. Chọn active/default variant có chủ đích.
7. Redirect hoặc archive product cũ sau QA.

Trước rollout phải cập nhật/xác nhận resolver để `variantStrategy` thực sự tham
gia lựa chọn variant hoặc loại bỏ field gây hiểu nhầm.

### 16.3 Exit gate

- provenance không public leak;
- backfill đủ source IDs;
- variant không tự override base ngoài quyết định;
- không mất departure;
- canonical/redirect đúng;
- market/schedule counts không thay đổi ngoài dự kiến.

## 17. Phase 10 — Tour nội địa và bài news

### 17.1 Tour nội địa

Đây là product/schema decision riêng vì `market` hiện chỉ có Korea, Japan và
China.

Cần quyết định một trong hai hướng:

- mở rộng enum `market`;
- thay enum bằng collection/reference market có governance.

Sau quyết định:

- migration và type generation;
- market routes mới;
- market config và navigation;
- seed/wrapper pages;
- parser mapping category nội địa;
- QA detail/market/schedule;
- SEO và sitemap.

### 17.2 News

News không đi vào TourProducts. Nếu cần giữ nội dung, xây pipeline riêng:

```text
source news
    -> normalized post
    -> categories
    -> media
    -> posts draft
    -> editorial QA
```

Pipeline news phải xử lý author, category, published date, SEO, related posts và
copyright/media riêng. Không tái sử dụng quyết định mapping tour một cách máy
móc.

### 17.3 Exit gate

- market nội địa có contract public hoàn chỉnh;
- news nằm trong Posts, không lẫn TourProducts;
- migration, sitemap, localization và SEO pass;
- mọi nội dung vẫn draft-first.

## 18. CLI contract

Package scripts dự kiến:

```json
{
  "scripts": {
    "parse:tours:doicanhviet": "cross-env NODE_OPTIONS=\"--no-deprecation --import=tsx/esm\" tsx scripts/parse-doicanhviet.ts",
    "import:tours:doicanhviet": "cross-env NODE_OPTIONS=\"--no-deprecation --import=tsx/esm\" tsx scripts/import-doicanhviet.ts"
  }
}
```

Parse toàn bộ:

```powershell
cd E:\repo\WingsTravel\app
pnpm run parse:tours:doicanhviet -- `
  --crawler-root E:\repo\doicanhviet-crawler
```

Parse chọn lọc:

```powershell
pnpm run parse:tours:doicanhviet -- `
  --crawler-root E:\repo\doicanhviet-crawler `
  --only 215093,253902 `
  --limit 2
```

Dry-run:

```powershell
pnpm run import:tours:doicanhviet -- `
  --file ..\artifacts\imports\doicanhviet\tours.normalized.json `
  --decisions ..\artifacts\imports\doicanhviet\import-decisions.json `
  --admin-email admin@example.com `
  --mode create-only `
  --dry-run `
  --only 215093
```

Import draft pilot:

```powershell
pnpm run import:tours:doicanhviet -- `
  --file ..\artifacts\imports\doicanhviet\tours.normalized.json `
  --decisions ..\artifacts\imports\doicanhviet\import-decisions.json `
  --admin-email admin@example.com `
  --mode create-only `
  --only 215093
```

CLI validation:

- `--only` được áp dụng trước `--limit`;
- source IDs được sort deterministic;
- thiếu file/decision/admin/site làm command fail trước mutate;
- `--dry-run` không được gọi create/update/delete;
- không hỗ trợ `--publish` hoặc `--overwrite` trong phase lõi.

## 19. Kế hoạch kiểm thử

### 19.1 Unit parser

Fixture tối thiểu:

- tour Hàn có nhiều ngày trong một ô;
- tour Nhật có năm chỉ xuất hiện ở ngày cuối;
- tour Trung có bảng adult/child/single supplement;
- tour có giá adult/child/infant;
- ngày không có năm;
- ô ngày bị dính như `30/706/08`;
- giá dùng dấu chấm;
- giá dùng dấu phẩy;
- marker `NGÀY 01`, `NGÀY1`, dash và dấu chấm;
- duration/itinerary mismatch;
- tour không có bảng;
- tour không có ảnh;
- bài news;
- pagination;
- tour nội địa unsupported market;
- duplicate title/slug candidate;
- exact duplicate media hash.

Assertions:

- classify đúng;
- số itinerary day đúng;
- expansion date đúng;
- priceFrom đúng number;
- rawPricing nguyên vẹn;
- warning/blocker đúng;
- sourceHash deterministic;
- parser không truy cập mạng.

### 19.2 Unit importer helpers

- resolve decision;
- deterministic filename;
- site + tourCode idempotency;
- create-only skip;
- dry-run mutation guard;
- rollback plan;
- Page/Product status consistency;
- sectionVisibility rules.

### 19.3 Integration Payload

- resolve đúng WingsGo site;
- reject user không phải super-admin;
- tạo Page wrapper draft;
- tạo Product draft và wrapper relation;
- upload/reuse Media cùng site;
- hai tour có `01.jpg` không dedupe sai;
- tạo đúng future Departures;
- không tạo past departure;
- chạy lại không nhân bản;
- rollback khi một departure lỗi;
- không thay đổi record hiện hữu;
- các record không leak cross-site.

### 19.4 E2E và visual QA

- preview tour detail desktop/mobile;
- breadcrumbs, SEO và canonical;
- hero/route/itinerary/services/departures;
- CTA context;
- market page card/count/price;
- schedule filters/count/date;
- không section rỗng;
- không technical copy;
- không tour/departure site khác.

### 19.5 Validation ladder

Khi implementation hoàn tất, chạy theo mức rủi ro:

```powershell
cd E:\repo\WingsTravel\app
pnpm exec tsc --noEmit
pnpm run lint
pnpm run test:unit
pnpm run test:int
pnpm run build
```

Sau đó chạy E2E/agent-browser cho pilot và các bề mặt tour. Không claim pass cho
command chưa chạy hoặc proof chưa được lưu.

## 20. Risk register và biện pháp kiểm soát

| Rủi ro | Mức | Kiểm soát |
| --- | --- | --- |
| Import nhầm pagination/news | Cao | Classifier + fixture + decision gate |
| Tạo tour duplicate | Cao | `site+tourCode`, duplicate candidates, create-only |
| Page wrapper thiếu/sai | Cao | Preflight + read-after-write + route QA |
| Ngày thiếu năm hoặc quá hạn | Cao | Confidence rules, blocker, không tạo past departure |
| Mất giá trẻ em/phòng đơn | Cao | Raw pricing artifact, warning, phase 8 |
| Variant override base | Cao | Không tạo variant phase lõi |
| Media trùng basename | Cao | Deterministic filename + SHA-256 manifest |
| Partial write/orphan | Cao | Per-tour rollback + partial-failure gate |
| Publish hàng loạt sai | Cao | Draft-first, batch rollout, manual publish |
| Cross-site data leak | Cao | Site-scoped queries và integration test |
| Editor content bị ghi đè | Cao | Không overwrite; create-only |
| Tour rỗng section | Trung bình | Dynamic sectionVisibility + preview QA |
| SEO dùng metadata sai | Trung bình | Đồng bộ Page/Product meta + canonical QA |
| Source artifact thay đổi | Trung bình | Source snapshot checksum |
| Generated artifact bị commit nhầm | Trung bình | Lưu artifacts, kiểm tra gitignore |

## 21. Báo cáo và khả năng audit

Mỗi import run cần có `runId` và báo cáo:

```text
sourceSnapshotHash
normalizedDatasetHash
decisionFileHash
startedAt/finishedAt
databaseTarget
siteId
adminUserId
created/reused/skipped/rejected/failed counts
Page/Product/Media/Departure IDs
warnings/errors
rollback results
validation evidence
```

Summary cuối CLI:

```text
createdTours
createdPages
createdDepartures
createdMedia
reusedMedia
skippedExisting
skippedUnapproved
rejected
rolledBack
failed
```

Không ghi credential, token, password, connection string hoặc dữ liệu nhạy cảm
vào artifact/log.

## 22. Vai trò và trách nhiệm

| Vai trò | Trách nhiệm |
| --- | --- |
| Kỹ sư import | Parser, importer, tests, dry-run, rollback và report |
| Biên tập WingsGo | Duyệt title/summary/itinerary/media/services |
| Sales/điều hành | Xác nhận giá, ngày, hãng bay, điểm đi và trạng thái bán |
| Quản trị hệ thống | Backup, DB target, quyền super-admin và rollout |
| QA | Detail/market/schedule, mobile/desktop và regression multisite |
| Product owner | Quyết định create/skip, publish batch và phase mở rộng |

Không một vai trò đơn lẻ vừa tự import vừa tự duyệt publish toàn bộ batch mà
không có proof độc lập.

## 23. Deliverables theo phase

| Phase | Deliverable chính |
| --- | --- |
| 0 | Inventory, checksum, baseline, backup, run configuration |
| 1 | Parser, normalized JSON, review report, unit tests |
| 2 | Decision file đã duyệt |
| 3 | Dry-run report không mutate |
| 4 | Draft Page/Product/Media/Departures và import result |
| 5 | QA evidence và editorial approval |
| 6 | Published batches, smoke proof và final report |
| 7 | Dữ liệu ổn định, related/marketCard/FAQ được governance |
| 8 | PriceRows schema, migration, renderer và backfill |
| 9 | SourceInfo schema và variant consolidation có kiểm soát |
| 10 | Market nội địa và news pipeline riêng |

## 24. Definition of done cho delivery lõi

Delivery phase 0–6 hoàn tất khi:

- dữ liệu nguồn được classify đầy đủ và deterministic;
- không crawl lại hoặc gọi mạng;
- news, pagination và unsupported market không vào TourProducts public;
- mọi source tour approved có Page wrapper và Product cùng site/slug;
- chỉ future Departures hợp lệ được publish;
- raw pricing đầy đủ còn trong artifact;
- importer create-only chạy lại tạo 0 duplicate;
- không có orphan hoặc partial failure;
- pilot và các batch pass detail, market, schedule QA;
- không có cross-site leak;
- không có review/badge/nội dung bịa;
- final report liệt kê đầy đủ created/skipped/rejected/failed;
- các tour chưa import có lý do rõ;
- source strategy, story/proof và Plane chỉ được cập nhật theo đúng thay đổi
  delivery thực tế.

## 25. Thứ tự triển khai được phê duyệt

Thứ tự mặc định:

1. Hoàn thành phase 0.
2. Xây parser và test phase 1.
3. Sinh review/decision phase 2.
4. Chạy dry-run phase 3.
5. Import một pilot draft phase 4.
6. QA pilot phase 5.
7. Publish pilot và hậu kiểm phase 6.
8. Lặp batch ba market, sau đó batch nhỏ.
9. Hoàn tất final report.
10. Chỉ mở phase 7–10 bằng intake/story/decision riêng.

Không bỏ qua phase review, dry-run hoặc pilot để chạy full batch trực tiếp.

## 26. Hồ sơ hoàn tất US-044 — 09/09/2026

US-044 được hoàn tất trên target duy nhất `WingsGo` (`wings-go`); không phải
WingSide. Snapshot nguồn được phê duyệt tạo 51 tour và đã được import/publish
sau quy trình draft-first. Kết quả production sau hậu kiểm là 51 TourProduct,
51 Page wrapper public và 52 TourDeparture future/published thuộc batch.

Các bằng chứng release được lưu trên VPS tại:

```text
/home/ubuntu/wings-travel/shared/artifacts/
  us044-wingsgo-catalog-10c15b9-20260909T191152Z/
  us044-wingsgo-catalog-proxy-fbb88df-20260909T193000Z/
```

- PostgreSQL migration `20260909_090000_wingsgo_tour_catalog` áp dụng đúng một
  lần, sau full backup pre-migration có checksum.
- `/tour` giữ sáu tour nổi bật được chọn từ Payload và hiển thị catalog động:
  tải thêm sáu tour mỗi lần, chỉ tour WingsGo published có wrapper và departure
  future/published; giới hạn inventory server là 200.
- API production và browser QA xác nhận `/tour` và
  `/api/wingsgo/tour-catalog?limit=6` trả HTTP 200, có 6 featured, 6 card ở
  batch đầu, `hasMore: true`, `nextOffset: 6`, và thao tác tải thêm không trùng
  card.
- Kiểm tra browser cũng xác nhận card, filter/sort và canonical pathname tour
  hoạt động. Image/release rollback cùng backup database được giữ lại cho vận
  hành.

Không tính các phase 7–10 (price rows đầy đủ, provenance schema mở rộng,
variant consolidation, domestic/news) vào scope closure này; chúng cần intake
và story độc lập. Full integration suite còn baseline failure ngoài US-044,
được ghi tách riêng và không làm thay đổi bằng chứng US-044 ở trên.
