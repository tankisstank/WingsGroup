# Design — US-093

## Ràng buộc

- Chỉ đổi giao diện khi `site.code === 'wings-go'`. Site khác giữ renderer cũ của `TourSchedulePage`.
- Mọi query đi qua `appendSiteWhere`. Trước khi đưa vào DTO, relation lồng bên trong phải được kiểm tra lại trên dữ liệu thô (trước mapper):
  - product phải published và cùng site;
  - media phải cùng site, có URL hợp lệ và tuân access hiện có. Media **không** có `_status` vì collection `Media` không bật versions/drafts, nên không lọc media theo published (R5).
- Prototype chỉ là tham chiếu giao diện, câu chữ và tương tác. Không chép HTML/CSS/JS hay mảng `RAW` của prototype.
- Tái dùng helper sẵn có: `PromotionPrice`/`PromotionBadge`, `getTourInquiryPath`, `getPriorityMarketDeparture`, `groupDeparturesByMonth`, các hàm trong `wingsGoDisplay.ts` và `businessCalendar.ts`, cùng `normalizeEditorialBadges`. Không viết helper trùng chức năng.
- Màu lấy từ `--site-brand`, `--site-accent` và token theme. Tiêu đề dùng `.wingsgo-display`, nội dung dùng font theme. Không thêm Be Vietnam Pro.
- Ưu tiên class có sẵn (`.wingsgo-eyebrow`, `.wingsgo-board`, `.wingsgo-ticket*`, `.hot-rainbow-card`) trước khi thêm CSS mới. CSS mới đặt trong scope `.wingsgo-schedule`.

## Ánh xạ thiết kế → module

| Phần | Module hiện có | Thay đổi |
|---|---|---|
| Dữ liệu | `getResolvedScheduleData`, `queryCollection`, `normalizeDepartureCard` | Thêm hàm `getWingsGoScheduleSnapshot` (server) để query và dựng DTO. `queryCollection` nhận thêm `populate`/`select`/`sort`/`page`. `getResolvedScheduleData` **giữ nguyên hành vi**, chỉ đổi `getLowestPrice` (xem D2). |
| DTO | `DepartureCardViewModel` | Thêm `WingsGoScheduleRow` và `WingsGoScheduleSnapshot` trong `tours/wingsGoSchedule.ts`. |
| Hero và biểu đồ | `TourSchedulePage` | Thêm `WingsGoScheduleHero` (server shell) và `WingsGoScheduleMonthChart` (client, nhận số đếm theo facet). |
| Thẻ thị trường | `WingsGoMarketTiles` (`/tour`) | Thêm `WingsGoScheduleMarketCards`, dựa trên cấu trúc thẻ và `hot-rainbow-card` của `/tour`. |
| Thanh lọc, danh sách, hai chế độ xem | `ScheduleInteractiveDepartures` | Thay bằng `WingsGoScheduleBrowser` (client). Xoá file cũ nếu không còn nơi dùng. Site khác vẫn dùng renderer cũ. |
| Khối "Trước khi giữ chỗ" | Khối tư vấn nằm trực tiếp trong `TourSchedulePage` (`StructuredPages.tsx:4020–4066`) | Tạo `WingsGoScheduleAssurance`: copy 3 bước theo locale, hotline lấy từ `resolveSiteHotlines`/`formatHotlineDisplay`, Zalo từ `getSharedZaloCTA`. `/tour` chưa có khối này nên không có gì để tái dùng. |
| Copy | `wingsGoCatalogCopy.ts` | Thêm `wingsGoScheduleCopy.ts` theo cùng mẫu VI/EN. |
| Metadata | `cmsPage.tsx:500–523`, `:608–622` | Thêm whitelist và nhánh `/lich-khoi-hanh` cạnh nhánh `/tour` của D9. Truyền `searchParams` xuống `TourSchedulePage` (`cmsPage.tsx:728`). |
| Lead | `api/lead-submissions/route.ts:95–102` | Resolver chấp nhận ngày VN của chính đợt đó (xem D6). |

## Hợp đồng dữ liệu

### Snapshot

- Server lấy **một** `now`. Ngày hôm nay là `today = toBusinessCalendarDay(now)`, và mốc đầu ngày là `${today}T00:00:00+07:00`. Nếu `today` là null thì fail closed (trả snapshot rỗng và ghi log).
- Mọi đối tượng (hero, biểu đồ, thẻ thị trường, row, bộ đếm facet, `canHoldSeat`, `daysUntilDeparture`, verification) đều suy ra từ cùng tập đợt và cùng `now` (R3):
  - `normalizeDepartureCard` nhận thêm tham số `now` tuỳ chọn và truyền tiếp vào `isDepartureVerificationCurrent`. Mặc định vẫn là `new Date()`, nên caller cũ không đổi.
  - `getPriorityMarketDeparture` nhận thêm `now` tuỳ chọn và dùng lịch VN thay cho `getFutureDepartures` (UTC) khi có `now`. Caller cũ không truyền `now` thì giữ hành vi cũ, và test hiện có được giữ nguyên.
  - Trang lịch lọc trước các đợt `canHoldSeat` (đã loại sold-out) rồi mới gọi selector thị trường.
- Đọc theo trang (sort và loại trùng) **không** cho một snapshot DB nguyên tử. Nếu CMS ghi xen giữa hai trang, một request có thể thấy trạng thái lẫn. Đây là giới hạn được chấp nhận; lần render sau sẽ tự đúng lại.
- Điều kiện `where` ở nhánh public: `_status = published` **và** `departureDate >= mốc đầu ngày`, sau đó đi qua `appendSiteWhere`. Preview/draft giữ đường riêng như hiện tại.
- Không dùng `isDeparturePublishable`/`selectPublishableDepartures` để lọc lịch. Hai hàm này loại mất các đợt chờ báo giá. Chúng chỉ dùng cho giá, CTA và thẻ nổi bật.
- Đọc theo trang: `pagination: true`, batch 250, sort `['departureDate', 'id']`, đọc đến hết, loại trùng theo `id`. Khi số đợt tương lai của một site vượt 1.000 thì chỉ ghi log cảnh báo, không dừng và không cắt. Không có trần im lặng.
- Dùng `depth: 2`, kèm `populate['tour-products']` gồm id, site, `_status`, slug, title, market, durationDays/Nights, heroMedia, editorialBadges. Không mở rộng `defaultPopulate` toàn hệ thống. Media chỉ cần id, site, url, alt và kích thước cần dùng.
- Locale theo D11: đọc EN strict. Tour chưa có title EN thì lấy nội dung VI, theo mẫu `wingsGoCatalog.ts:823–836`. Badge luôn lấy từ bản đọc EN strict.

### DTO cho client (R1)

Toàn bộ type nằm trong `tours/wingsGoSchedule.ts`. Đây là hợp đồng giữa các phase; mọi thay đổi phải cập nhật mục này trước.

```ts
type ScheduleAvailability = 'open' | 'limited' | 'sold-out' | 'quote'
type ScheduleMoney = { value: number; currency: 'VND' | 'USD'; original: number | null }

type WingsGoScheduleTour = {
  id: string
  slug: string
  href: string                    // locale-aware, đã có tiền tố /en khi cần
  title: string                   // D11: VI khi EN thiếu bản dịch
  routeTitle: string              // getTourRouteTitle
  market: string | null           // enum thật; null nếu không có
  durationLabel: string | null
  media: { url: string; alt: string } | null   // đã kiểm site; null → ảnh fallback
  badges: { kind: string; label: string }[]    // normalizeEditorialBadges, EN strict
  hasHot: boolean
}

type WingsGoScheduleRow = {
  id: string
  tourId: string                  // tham chiếu snapshot.tours
  departureDay: string            // YYYY-MM-DD theo lịch VN
  returnDay: string | null        // chỉ khi returnDate có dữ liệu thật
  monthKey: string                // YYYY-MM theo lịch VN
  daysUntilDeparture: number      // server tính (D3 của US-092)
  departureCityCode: string | null
  airline: { key: string; label: string } | null
  availability: ScheduleAvailability
  availabilityLabel: string       // availabilityBadge nếu có, không thì nhãn theo locale
  price: ScheduleMoney | null     // giá của đúng đợt này, đã qua governance
  promoLabel: string | null
  urgencyLabel: string | null
  canHoldSeat: boolean
  ctaLabel: string                // ctaLabelOverride hoặc nhãn mặc định
  ctaHref: string                 // getTourInquiryPath, intent và ngày VN đã tính sẵn
  isFeatured: boolean
  searchText: string              // tên tour + thị trường + hãng bay, đã bỏ dấu
}

type WingsGoScheduleMarketCard = {
  market: string
  label: string
  rowId: string                   // đợt nổi bật, đã lọc canHoldSeat
  tourId: string
  departureCount: number
}

type WingsGoScheduleStats = {
  openCount: number               // open + limited
  tourCount: number               // số tour khác nhau
  pricedCount: number             // số đợt có price
  nearestDay: string | null       // ngày sớm nhất trong snapshot
  yearRange: { from: number; to: number } | null
  sharedDepartureCity: string | null  // chỉ khi mọi đợt cùng nơi đi
  verifiedDay: string | null      // verifiedAt lớn nhất của đợt đang xác minh
}

type WingsGoScheduleSnapshot = {
  locale: 'vi' | 'en'
  todayDay: string
  tours: Record<string, WingsGoScheduleTour>
  rows: WingsGoScheduleRow[]      // đã sort theo ngày rồi id
  months: string[]                // mọi tháng từ đợt đầu tới đợt cuối, kể cả tháng trống
  markets: { value: string; label: string }[]   // chỉ giá trị có dữ liệu
  airlines: { key: string; label: string }[]
  marketCards: WingsGoScheduleMarketCard[]      // tối đa 3
  stats: WingsGoScheduleStats
  initialFilters: ScheduleFilters  // đã parse từ URL ở SSR
}
```

- Thông tin tour (ảnh, badge) chỉ gửi một lần cho mỗi tour qua `tours`, và row tham chiếu bằng `tourId`. Cách này tránh lặp dữ liệu khi một tour có nhiều đợt.
- Không đưa Date, Set, Map, hàm hay map locale thô vào DTO.
- `stats` mô tả toàn bộ snapshot và không đổi theo bộ lọc. Số trên cột biểu đồ và chip thị trường thì đổi theo bộ lọc, do client tính bằng `countScheduleFacets` trên `rows`.

### Nơi giữ trạng thái bộ lọc

- `WingsGoScheduleBrowser` (client) là root duy nhất giữ `filters`. Nó render biểu đồ tháng, thẻ thị trường, thanh lọc, dòng kết quả và danh sách.
- Phần chữ của hero (eyebrow, H1, mô tả, 4 số liệu) render trên server và không phụ thuộc bộ lọc.
- Phase 2 làm biểu đồ và thẻ thị trường dưới dạng component trình bày, nhận `counts`, `selected` và `onSelect`. Phase 3 nối chúng vào `WingsGoScheduleBrowser`.

### Bảng trạng thái

`deriveScheduleAvailability` xét lần lượt theo thứ tự dưới đây và dừng ở bước đầu tiên khớp (R2). Nhờ vậy mỗi đợt thuộc đúng một trạng thái.

| Bước | Điều kiện | `availability` | Nhãn VI / EN | Lọc theo |
|---|---|---|---|---|
| 1 | Đợt không `commerceVerified` (kể cả đã hết hạn xác minh) | `quote` | Liên hệ báo giá / Request a quote | "Chờ báo giá" |
| 2 | Đã xác minh và `availabilityStatus = sold-out` (có giá hay không) | `sold-out` | Đã kín / Sold out | "Đã kín" |
| 3 | Đã xác minh nhưng không có giá hợp lệ theo `normalizeGovernedTourPrice` | `quote` | Liên hệ báo giá / Request a quote | "Chờ báo giá" |
| 4 | Đã xác minh, có giá, `limited` | `limited` | Sắp hết chỗ / Few seats left | "Sắp hết chỗ" |
| 5 | Đã xác minh, có giá, `open` hoặc trống | `open` | Mở bán / Open | "Mở bán" |

- Fixture bắt buộc cho test: sold-out không giá, sold-out chưa xác minh, đợt có `availabilityBadge` tuỳ chỉnh.
- `availabilityBadge` chỉ đổi câu chữ hiển thị, không đổi trạng thái hay CTA. Badge chỉ áp cho trạng thái `open`/`limited`. Ở `sold-out` và `quote` luôn dùng nhãn chuẩn, vì badge biên tập cũ (ví dụ "Đang mở bán") không được nằm trên đợt đã kín. `urgencyLabel` chỉ hiện khi `canHoldSeat` (Phase 5, phát hiện trên dữ liệu seed).
- `price.original` và `promoLabel` giữ governance hiện có của `normalizeDepartureCard`: số hữu hạn, `original > value`, cùng đợt và cùng currency. Đợt sold-out hoặc hết hạn xác minh không được khôi phục ưu đãi.
- Khi hai đợt bằng nhau về khoá sắp xếp (ngày hoặc giá), xếp theo ngày rồi theo `id`.
- Số liệu "đợt mở bán" ở hero = `open + limited`. Số "đợt có giá" = số đợt có `price`.
- **Quy tắc nhãn CTA (`ctaLabelOverride`, S1/AC2):** `ctaLabelOverride` chỉ được áp dụng khi `canHoldSeat === true`. Khi `canHoldSeat === false` (chưa xác minh, hết hạn, thiếu giá hợp lệ hoặc đã kín chỗ `sold-out`), nhãn CTA luôn là nhãn chuẩn theo locale `copy.ctaRequestQuote` ("Liên hệ báo giá" / "Request a quote"), không dùng override nhằm đảm bảo tính trung thực (AC2: "Giữ chỗ" chỉ hiện khi `canHoldSeat`). `intent` và `ctaHref` luôn được xác định theo `canHoldSeat` không đổi.

### `canHoldSeat` (helper dùng chung trong `tours/utils.ts`)

`canHoldSeat(departure, now)` đúng khi đủ cả bốn điều kiện:

- `commerceVerified === true`;
- `availabilityStatus` khác `sold-out`;
- `daysUntilBusinessDay(departureDate, now)` khác `null` và `>= 0`;
- `normalizeGovernedTourPrice({ currency, value: priceFrom })` khác `null`.

Server gọi helper này để điền `canHoldSeat` vào DTO; client chỉ đọc giá trị đó. `DepartureStrip` cũng chuyển sang dùng helper. Hai chỗ tính tương tự ở `StructuredPages.tsx:1348` và `:3625` chỉ được rà soát, không sửa trong story này.

### Giá và tiền tệ

- **Row:** dùng giá của đúng đợt đó. `original` chỉ có khi lớn hơn `value` và cùng đợt.
- **Sắp theo giá:** đợt VND xếp tăng dần, tiếp theo là đợt USD tăng dần, cuối cùng là đợt không có giá. Không quy đổi tỷ giá. Phase 0 xác nhận production và local hiện 100% VND; quy tắc USD chỉ để phòng dữ liệu sau này và không phải điều kiện dừng.
- **"Giá từ" của tour (chế độ Theo hành trình):** chọn đợt có giá thấp nhất trong các đợt đang hiển thị và có `canHoldSeat`. Ưu tiên đợt VND; nếu tour không có đợt VND thì xét đợt USD. Lấy `original` và promo của chính đợt được chọn.
- **`getLowestPrice`:** chỉ nhận số hữu hạn và lớn hơn 0. Thay đổi này ảnh hưởng `queries.ts:594` (market) và `:712`. Có test cho cả hai caller với 0, NaN, Infinity, danh sách không có giá và currency trộn.
- **Hero cũ gọi `formatTourPrice` không truyền currency:** để ngoài phạm vi (R4). Route lịch chỉ bật cho WingsGo (`siteCapabilities.ts`, `cmsPage.tsx:718`), nên hero cũ không còn render sau US-093. `ScheduleHeroStats.lowestPrice` vẫn là số đơn, không ghép với currency của một đợt khác.

### Số liệu hero

- **"Lịch khởi hành YYYY – YYYY":** lấy năm của đợt đầu và đợt cuối. Nếu cùng năm thì chỉ ghi một năm.
- **Thành phố trong câu mô tả:** chỉ nêu khi mọi đợt có cùng `getDepartureCityCode`.
- **"Đợt gần nhất":** đợt có ngày sớm nhất trong snapshot. Không dùng `getNextDeparture`, vì hàm này ưu tiên giá rẻ.
- **"Cập nhật dd/mm/yyyy":** lấy `verifiedAt` lớn nhất trong các đợt đang được xác minh. Không có giá trị nào thì bỏ dòng này. Không dùng `updatedAt`.
- **"Cao điểm":** tháng có nhiều đợt nhất. Nếu bằng nhau, chọn tháng sớm hơn.

### Facet và bộ lọc

- Tham số URL nằm trong whitelist:
  - `market`: giá trị enum đang có trong dữ liệu;
  - `month`: `YYYY-MM` có trong snapshot;
  - `airline`: key đã chuẩn hoá;
  - `status`: `open | limited | sold-out | quote`;
  - `q`: tối đa 80 ký tự;
  - `sort`: `date | price`;
  - `view`: `date | tour`.
- Giá trị lạ, mảng hay tham số lặp bị bỏ qua. Mặc định `sort=date`, `view=date` và không ghi các giá trị mặc định lên URL.
- Các bộ lọc kết hợp theo AND. Số đếm của mỗi facet (cột tháng, chip thị trường) tính với mọi bộ lọc khác nhưng **bỏ chính facet đó**. Chip đang chọn vẫn hiện kể cả khi số đếm bằng 0.
- Tìm kiếm bỏ dấu: dùng NFD, xoá dấu kết hợp, `đ` → `d`, chữ thường, debounce 250ms.
- SSR parse URL và trả bộ lọc ban đầu, nên client khởi tạo từ đúng kết quả SSR. Khi bộ lọc đổi, client gọi `history.replaceState`, giữ lại tham số tracking và hash. Client cũng xử lý `popstate`.

### Hãng bay

`normalizeScheduleAirline(raw)` nằm trong `wingsGoDisplay.ts`:

- Chuẩn hoá chuỗi: trim, NFKC, gom khoảng trắng, bỏ dấu nháy thừa ở hai đầu.
- So khớp tên rõ ràng hoặc mã IATA đứng riêng/trong ngoặc. Không so theo chuỗi con tuỳ tiện, ví dụ không gộp mọi chuỗi chứa "AirAsia" vào FD.
- Bảng khởi đầu: VJ, VN, CA, NH, 7C, VU, EK, TK, 9G, FD, WE (theo prototype). Bảng này được bổ sung bằng danh sách DISTINCT thật đọc ở Phase 0.
- Chuỗi không nhận diện được, hoặc khớp nhiều hãng, giữ nguyên chuỗi gốc đã trim với key `raw:<chuỗi chuẩn hoá>`.

### Tên tour

- Dùng `getTourRouteTitle`.
- Sửa helper khi có fixture thật:
  - Nhận diện mã thời lượng `5N4Đ`/`5N4D` và không đổi chữ hoa thường của mã này.
  - Không coi mọi token 2–3 ký tự là từ viết tắt; chỉ giữ chữ in hoa cho từ trong allowlist.
- Không tách theo dấu `-` không có khoảng trắng. Tên dài xử lý bằng layout (line-clamp), còn tên đầy đủ đặt trong `title`/accessible name.

## SEO: giữ link trong HTML

Cách làm đã chốt (R6):

- SSR và lần render đầu tiên ở client đều render **đủ** mọi row khớp bộ lọc trong một danh sách duy nhất, **chưa** có `hidden`. Nhờ vậy HTML ban đầu giống nhau ở server và client, không lệch khi hydrate.
- Sau khi mount (`useEffect` đặt `enhanced = true`), client mới gắn thuộc tính `hidden` thật cho:
  - row từ thứ 9 trở đi của mỗi tháng, ở chế độ Theo ngày;
  - các chip ngày sau chip thứ 6, ở chế độ Theo hành trình.
- Nút "Xem thêm" và "+N ngày khác" chỉ hiện sau khi enhance. Nút có `aria-expanded`/`aria-controls` và bỏ `hidden` khi bấm. Phần tử đang `hidden` không có trong cây accessibility và không nằm trong thứ tự tab.
- Không có JS thì toàn bộ danh sách hiện đủ. Không dùng `.slice(0, 8)` ở SSR và không dùng `<noscript>`.
- **Bằng chứng:**
  - URL không lọc: tập `href` tour trong HTML ban đầu phải bằng tập tour của toàn snapshot.
  - URL có lọc: so với tập tour khớp bộ lọc trong cùng snapshot.
  - Kiểm ở cả VI và EN. Không render thêm tour ngoài kết quả chỉ để đủ số link.

## Giao diện

- **Header:** WingsGo hiện không sticky. Thanh lọc dùng `position: sticky; top: 0`. Không chép `top: 76px/64px` của prototype và không đổi header toàn site.
- **Cuộn tới danh sách:** dùng `window.scrollTo` với offset bằng chiều cao thanh lọc đo bằng `getBoundingClientRect`. Khi người dùng bật reduced motion thì dùng `behavior: 'auto'`.
- **Row theo ngày (Q3):** tour hot hiện nhãn chữ tĩnh "Tour hot" / "Hot tour" với nền token accent, kèm icon không chỉ dựa vào màu. Row không dùng `hot-rainbow-card`, và không có chip giảm giá tự sinh.
- **Thẻ tour và thẻ thị trường:**
  - `hot` dùng `hot-rainbow-card` kèm `sr-only`.
  - `specialized`/`vip` dùng sticker theo US-084.
  - Radius của `::before` đồng bộ với thẻ.
  - Không có badge thì không thêm class hay khoảng trống.
- **`sold-out`:** chữ dùng `--muted-foreground` đã kiểm tương phản ≥ 4,5:1, giá có gạch nhạt, CTA là "Hỏi giá".
- **`limited`:** dùng nhãn accent và giữ CTA "Giữ chỗ" nếu `canHoldSeat` đúng.
- **Nhãn thị trường:** `other` hiện "Thị trường khác" / "Other destinations" qua bảng copy riêng của trang lịch. Không đổi `WINGSGO_MARKET_LABELS` dùng chung (đang là "Tuyến khác" trên `/tour`).

## Quyết định

- **D1 — Một snapshot.** Query public lọc published và ngày VN, đọc theo trang đến hết, không trần im lặng. Dùng một `now` cho mọi phép tính.
- **D2 — Không hiện lại lịch quá khứ, chỉ trên trang lịch WingsGo.** `getWingsGoScheduleSnapshot` không fallback về lịch quá khứ; khi không còn đợt tương lai thì hiện trạng thái rỗng. `getResolvedScheduleData` dùng chung (trang chủ, `getSiteScheduleData`) **giữ nguyên** fallback để không đổi output site khác (R4). Trang chủ WingsGo vẫn được kiểm với fixture rỗng, chỉ có quá khứ, và có tương lai.
- **D3 — `canHoldSeat` dùng chung, quy tắc chặt, ngày theo lịch VN.** Server tính, client chỉ đọc.
- **D4 — Kênh liên hệ chỉ gồm Zalo OA và hotline từ cấu hình site** (kế thừa D4 của US-092).
- **D5 — DTO gọn và bảng tour dùng chung.** `depth: 2` kèm populate riêng. Ghi kích thước trước và sau.
- **D6 — Ngày lead theo lịch VN.**
  - `getTourInquiryPath` nhận `departureDay` VN.
  - `resolveDepartureLeadContext` chỉ chấp nhận hai giá trị, cả hai đều **tính từ chính đợt đã resolve trên server** (đối chiếu id, site, tour): ngày VN `toBusinessCalendarDay(departureDate)`, và ngày UTC cũ `.slice(0,10)` để link cũ không hỏng. Không dùng khoảng ±1 ngày và không tìm đợt theo ngày khách gửi.
  - Ngày lưu vào lead luôn là ngày VN.
  - `toBusinessCalendarDay` trả null hoặc timestamp lỗi thì fail closed (400).
  - Giữ nguyên mọi kiểm tra hiện có: site của đợt và tour, tour published, id/slug, trusted host, validation, rate limit, idempotency. Thiếu ngày hoặc thiếu `departureId` xử lý như hợp đồng cũ.
  - Resolver hiện dùng `overrideAccess: true` và chưa kiểm published của đợt (`route.ts:70–76`). Story này **giữ nguyên** chính sách đó (nhận inquiry cho đợt draft/unpublish như hiện tại). Siết thêm cần một quyết định riêng.
  - Đổi ngày lưu từ UTC sang VN là thay đổi ngữ nghĩa cho dữ liệu lead. Với dữ liệu hiện có (100% `00:00Z`) hai ngày trùng nhau, nên không đổi giá trị thực tế.
- **D7 — Link thẳng tới trang chi tiết**, có tiền tố `/en` khi ở EN (kế thừa D7 của US-092).
- **D8 — SSR và lần render đầu đủ row; chỉ gắn `hidden` sau khi enhance** (mục SEO).
- **D9 — URL có bộ lọc dùng `noindex, follow`**, canonical về `/lich-khoi-hanh` theo locale. Noindex khi có bất kỳ tham số nào trong whitelist, kể cả giá trị sai. Tham số tracking như `utm_*` không tính.
- **D10 — Hãng bay chỉ chuẩn hoá khi hiển thị và lọc.** Hãng lạ giữ chuỗi gốc.
- **D11 — Locale theo D11 của US-092.**
- **D12 — Quyết định Q1–Q3 của stakeholder** ghi trong `overview.md`.
- **D13 — Thanh lọc sticky ở `top: 0`.** Không đổi header.
- **D14 — Khối "Trước khi giữ chỗ" là copy tĩnh theo locale**, không tạo CMS block.
- **D15 — Một story duy nhất, chia theo phase.** Không tách story vì Q2 giữ enum hiện có.

## Phương án đã cân nhắc

1. **Giữ `limit: 200` và nâng lên 500:** vẫn là trần im lặng. Loại theo D1.
2. **Lọc lịch bằng `isDeparturePublishable`:** làm mất các đợt chờ báo giá. Loại.
3. **Chỉ SSR 8 row mỗi tháng, phần còn lại tải sau:** mất link SEO. Loại theo D8.
4. **Danh sách link SEO riêng hoặc `<noscript>`:** trùng lặp dữ liệu và khác trải nghiệm thật. Loại.
5. **Đổi `WINGSGO_MARKET_LABELS.other` dùng chung:** làm đổi `/tour` ngoài phạm vi. Loại; dùng copy riêng.
6. **Dialog lead trên trang:** Q1 đã chọn link.
7. **Biến header thành sticky để khớp prototype:** đổi shell toàn site. Loại theo D13.
