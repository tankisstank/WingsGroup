# Codex Consultation — US-093 WingsGo Departure Schedule v2

- Date: 2026-10-30 ICT
- Gate: Planning milestone / architectural checkpoint
- Reviewer: Codex via Herdr (nhãn reviewer theo hand-off; bằng chứng thực thi của phiên Codex này ở cuối báo cáo).
- Scope: Đối chiếu brief/prototype với query, commerce, DTO, locale, multisite, SEO và UI hiện hữu. Chỉ đọc code; không sửa `app/`, DB, trạng thái Story/Plane; không commit hoặc phát hành.
- Baseline: `feat/us-093-departure-schedule-v2`, HEAD `58cbd246d401834fe1297de48576d7ddca62d79f`.
- Decision status: Có thể lập kế hoạch sau khi bổ sung các phát hiện dưới đây. Q1/Q2/Q3 vẫn là đề xuất, chưa phải quyết định của stakeholder. Chưa đủ bằng chứng để duyệt triển khai/phát hành.

## Decisions reviewed

| Decision | Recommendation |
|---|---|
| D1 | Query đợt published, đúng site, từ đầu ngày Việt Nam; không dùng `isDeparturePublishable` để loại các row chờ báo giá. Không fallback về toàn bộ lịch quá khứ. |
| D2 | Bỏ trần im lặng 200. Đọc theo trang có phân trang thật, sort ổn định ngày + id; ngưỡng cảnh báo phải quan sát được. Không dùng `totalDocs` của `pagination:false` làm tổng inventory. |
| D3 | Một `now` server cho ngày nghiệp vụ, verification và CTA; DTO chứa `daysUntilDeparture`, `canHoldSeat`, ngày lịch đã chuẩn hóa. Client không tính lại eligibility khi hydrate. |
| D4 | Helper `canHoldSeat` trong `tours/utils.ts`; dùng quy tắc chặt của `DepartureStrip`, nhưng ngày theo lịch Việt Nam. `ctaLabelOverride` chỉ đổi nhãn. |
| D5 | `depth:2` đủ departure → product → media. Override `populate` riêng của query để lấy badge/site; chỉ tăng mapper là chưa đủ. Không mở rộng `defaultPopulate` toàn hệ thống trong US-093. |
| D6 | D11: nội dung tour EN thiếu dịch được fallback VI; badge vẫn lấy từ EN strict. Truyền locale rõ tới mapper, tránh callback `.map(mapper)` nhận index làm locale. |
| D7 | Client nhận row DTO gọn; chỉ một bản dữ liệu, không chuyển cả Payload document hoặc mọi nhóm trùng lặp. Giá và promo cùng một departure. |
| D8 | Giữ đủ row trong HTML SSR, mặc định ẩn phần sau row thứ 8 của mỗi tháng bằng `hidden`/CSS; progressive enhancement cho “Xem thêm”. Đây là lựa chọn SEO đề xuất. |
| D9 | Tái dùng cơ chế metadata D9 ở `cmsPage.tsx`, thêm whitelist riêng cho schedule; canonical đúng locale, `noindex,follow` khi có query trạng thái đã quy định. |
| D10 | Airline chỉ chuẩn hóa hiển thị/lọc, không sửa CMS. Bảng prototype là đầu vào tham khảo, chưa phải thống kê DB hoặc danh mục hãng đã được xác minh. |
| D11 | Q1: link `/lien-he` có ngữ cảnh. Q2: giữ enum và nhóm `other`. Q3: rainbow/sticker trên card, không thêm rainbow/chip hot vào row. Cần stakeholder chốt trước phần code liên quan. |
| D12 | Giữ US-093 thành một story UI/data cùng AC; nếu mở enum thì story riêng, mã US-094 chỉ là ứng viên cần kiểm tra với orchestrator. |
| D13 | Header hiện không sticky, không có CSS variable chiều cao. Không copy `top:76px/64px` của prototype; thanh lọc có thể dùng `top:0` theo shell hiện tại. |
| D14 | Không có component “3 bước” chuyên biệt trên `/tour` trong baseline. Dùng utility hotline/Zalo sẵn có và copy VI/EN nhỏ; không tạo CMS block/schema mới. |

## Findings

### P1

1. **Inventory có thể bị cắt và lịch quá khứ tái xuất hiện.** `app/src/tours/queries.ts:664` lấy tối đa 200 rồi lọc ngày; `:677` fallback về lịch cũ khi không còn tương lai. Payload 3.84.1 vẫn áp dụng limit khi tắt pagination. Nếu đổi sang lọc “publishable” theo giá, row chờ báo giá trong brief cũng sẽ biến mất. Xử lý theo mục 1.
2. **CTA đang không đồng nhất; ngày UTC có thể loại nhầm đợt hôm nay.** `ScheduleInteractiveDepartures.tsx:163` suy verification từ status khi thiếu boolean, `:235` không kiểm tra giá/ngày. Quy tắc chặt tại `StructuredPages.tsx:3512`. `utils.ts:531` vẫn dùng UTC, khác `businessCalendar.ts:29`. Kiểm tra thực thi đã tái hiện sai lệch ngày.
3. **Scope của query gốc không đủ bảo đảm relation/media cùng site.** `siteContext.ts:190` chỉ thêm điều kiện site vào root; `queries.ts:105` bỏ site khỏi product DTO và chuyển nguyên `heroMedia`. `sameSiteFilterOptions` tại `TourDepartures.ts:73` là bộ lọc authoring, không thay thế kiểm tra khi đọc. Phải giữ ID site để kiểm tra product/media, published và đường dẫn tour trước khi dựng DTO public.
4. **Đổi ngày CTA sang lịch VN có thể làm lead trả HTTP 400, kể cả chọn Q1 link.** `app/src/app/(payload)/api/lead-submissions/route.ts:95–102` so context với ngày `.slice(0,10)` của departure; `:445` trả 400 nếu không khớp. Fixture departure `2026-10-29T17:00Z` đã chạy: context ngày VN `2026-10-30` bị từ chối, ngày UTC `2026-10-29` được nhận. Cần thống nhất lịch ở URL/form/resolver/persistence; không chỉ sửa UI. Brief liệt kê endpoint chỉ khi chọn dialog là chưa đủ cho thay đổi này.

### P2

1. **Badge có thể luôn rỗng dù mapper đã sửa.** `TourProducts.ts:115` không populate `editorialBadges`, `site`, `_status`, `marketCard`. Cần query projection/populate thật và test qua Payload; xem mục 4.
2. **Locale D11 chưa có trong schedule.** `queries.ts:75` dùng EN strict; schedule không có bước fallback nội dung riêng như `wingsGoCatalog.ts:823`. Không được fallback cả badge sang VI; `normalizeEditorialBadges` không đoán được nguồn locale của chuỗi không gắn `_locale`.
3. **Giá tối thiểu và “đợt gần nhất” có nhiều lỗi độc lập.** `getLowestPrice` nhận 0/âm/NaN/Infinity; hero gọi formatter thiếu currency tại `StructuredPages.tsx:3901`, `:3923`. `getNextDeparture` ưu tiên giá rẻ tại `utils.ts:623`, không bảo đảm ngày gần nhất. Sửa `>0` đơn lẻ không giải quyết các điểm còn lại.
4. **Thẻ thị trường có thể chọn đợt đã kín.** `utils.ts:561` chỉ yêu cầu airline và giá; `:570` không loại sold-out. Kiểm tra thực thi xác nhận helper trả sold-out khi đó là ứng viên duy nhất.
5. **SEO/URL cần nối xuyên cả route và client.** Metadata đã nhận searchParams, nhưng `cmsPage.tsx:608` chỉ xử lý `/tour`; `:728` chưa truyền searchParams cho schedule. Chỉ khởi tạo filter sau mount sẽ làm SSR sai trạng thái URL.
6. **Thông tin về component tái dùng trong brief chưa khớp code.** Header là relative; khối 3 bước chưa tồn tại; simulator hiện có mapper riêng, không tự nhận thay đổi từ `normalizeTourProductCard`. Chi tiết mục 4, 9, 10.
7. **Chưa có DB/dependency/runtime ở worktree để xác nhận dữ liệu thật và kích thước.** Không thể coi 177 row prototype, 20 tên airline trong audit, hoặc HTML ~770 KB là phép đo mới của worktree này. Cần bổ sung baseline trong Phase 0.

### P3

1. Chuẩn hóa tên có thể đổi viết tắt dài, mã thời lượng và không tách đoạn không có separator; không sửa hàng loạt tên CMS để chữa layout.
2. Chốt bảng trạng thái/đếm facet, tỷ giá, nhãn “đang mở bán”, cập nhật theo `verifiedAt`, và thứ tự đồng hạng trước khi viết helper thống kê.
3. A11y: row thu gọn không được có phần tử focus ẩn; biểu đồ cần tên đầy đủ, `aria-pressed`; reduced motion, tương phản sold-out, hotline và nhãn dài phải kiểm tra ở mọi breakpoint yêu cầu.
4. Prototype thực tế có **8 key market** tại dòng 443, trong khi brief nói 9 nhóm. Cả hai đều không thay thế enum CMS. Nhãn VI `other` hiện là “Tuyến khác”, không phải “Thị trường khác”.

## Trả lời 13 câu hỏi

### 1. `getResolvedScheduleData`: limit, where, calendar và depth

**Hiện tại:** `queries.ts:69` → `appendSiteWhere` (`:87`) → `payload.find` với `overrideAccess:draft`, `pagination:false` (`:89–98`). Schedule truyền `depth:3`, `limit:200`, `where:{}` tại `:664–670`; query không sort DB. Sau đó sort JS, lấy future bằng UTC và fallback quá khứ tại `:673–677`. Public read vẫn có lớp access: `TourDepartures.ts:20` → `access/siteScope.ts:235`, anonymous Local API yêu cầu `_status:published` và site tồn tại. Vì vậy nói query hoàn toàn không có lọc published là thiếu chính xác, dù nên đưa điều kiện này rõ vào public where.

**Phiên bản:** `app/package.json` và `app/pnpm-lock.yaml:4167` khóa Payload **3.84.1**, Next **16.2.6** (`pnpm-lock.yaml:4025`). Không có `app/node_modules/payload/package.json`, nên không thể khẳng định “đã đọc version đang cài”. Đã đối chiếu source tag 3.84.1 và thực thi artifact phát hành cùng version, không cài package vào workspace.

Ở source upstream [S1], `find.ts:133–134` vẫn giữ limit được truyền. Drizzle [S2] `findMany.ts:35–45`, `:164–165` áp dụng limit; khi `pagination:false`, `:192–197` gán `totalDocs=rawDocs.length`, `hasNextPage=false`. Thử 205 row bằng adapter DB giả: `limit:200` → 200 row, tổng 200, không báo trang sau; `limit:0` → đủ 205. Đây là kiểm tra code package với DB stub, không phải integration SQLite/PostgreSQL.

**Public where đề xuất**, sau đó vẫn qua `appendSiteWhere`:

```ts
const today = toBusinessCalendarDay(now)
const startOfToday = new Date(`${today}T00:00:00+07:00`).toISOString()
const where = {
  and: [
    { _status: { equals: 'published' } },
    { departureDate: { greater_than_equal: startOfToday } },
  ],
}
```

Validate `today` trước khi tạo timestamp. Ví dụ ngày 30/10/2026 bắt đầu tại `2026-10-29T17:00:00.000Z`, không phải `2026-10-30T00:00Z` hoặc giờ hiện tại. Dùng một `now` cho toàn request. Product liên quan phải published/cùng site và có route public hợp lệ; có thể lấy theo tập ID từ query products đã scope hoặc kiểm tra populate có đủ trường. Preview giữ draft theo chủ đích, không vô tình áp public where lên mọi query dùng chung.

**Phân biệt ba khái niệm:** published là trạng thái xuất bản; `isDeparturePublishable` (`utils.ts:561`) là tiêu chí card có airline + giá; `selectPublishableDepartures` (`:546`) lại yêu cầu future + commerceVerified. Không dùng hai helper sau để lọc toàn bộ lịch: chúng sẽ làm mất trạng thái chưa giá/chưa xác minh mà brief yêu cầu. Chỉ dùng eligibility thương mại cho giá, CTA và thẻ nổi bật. Không hồi sinh lịch quá khứ khi kết quả future rỗng.

**Ngưỡng:** đề xuất batch 250 với `pagination:true`, sort `['departureDate','id']`, đọc tiếp đến hết, loại trùng ID. Cảnh báo khi đạt 1.000 future row/site để đánh giá query time/DTO. Đây là ngưỡng vận hành đề xuất, chưa được load test; không phải bảo đảm capacity. Không thay 200 bằng một trần khác rồi im lặng. Nếu buộc có hard cap, phải nhận biết kết quả thiếu, báo rõ và có cơ chế đọc hết trước khi công bố tổng inventory/SEO. Khi tắt pagination, không dùng `hasNextPage`/`totalDocs` để phát hiện cắt; sentinel N+1 hoặc count độc lập mới có ý nghĩa. `limit:0` có thể dùng ở bộ dữ liệu nhỏ đã đo, nhưng không nên là giải pháp mặc định vô hạn.

**Depth:** UI chỉ cần departure → product → heroMedia, nên **2** đủ. Dùng `select` cho trường departure: ID, site, tourProduct, ngày đi/về, nơi đi, airline, currency, priceFrom/originalPrice, promo/urgency/availability/CTA override, isFeatured, verifiedAt/expiresAt và commerce input thực sự tồn tại. `commerceVerified` hiện là giá trị normalizer tính từ governance/legacy, không giả định đó là field truy vấn được. `originalCurrency` chỉ có guard tương thích trong normalizer, chưa có field trong `TourDepartures`; không thêm select/schema field này theo phỏng đoán. Product populate: ID, site, `_status`, slug, title, market, durationDays/Nights, heroMedia, editorialBadges; wrapperPage nếu kiểm tra route. Media: ID/site/url/alt và size cần dùng. Variant chỉ cần ID/label nếu row còn hiện biến thể. Không cần related tours, itinerary, PDF, Page layout, hoặc chuỗi relation cấp 3. Kiểm tra select/populate trên Payload thật, vì wrapper `queryCollection` hiện chưa nhận các option này.

### 2. `getLowestPrice` và mọi caller

`utils.ts:504–514` chỉ kiểm tra `typeof value === 'number'`: nhận 0, âm, NaN và Infinity. Kiểm tra thực thi: `[0,18900000]` → `0`; `[NaN,18900000]` → NaN. Sửa nhỏ nên là **number + finite + >0**, giữ `null` khi không có giá hợp lệ.

Chỉ có **hai call site** trong source, đều tại `queries.ts`:

| Caller | Tác động |
|---|---|
| `getToursByMarketRoute`, `queries.ts:594` | `TourCardViewModel.lowestPrice` của từng tour sẽ bỏ giá liên hệ 0. Không tự lọc sold-out/currency/verification chỉ bằng sửa helper này. Market dùng `nextDeparture` riêng (`:595`), nên cần bảo đảm giá hiển thị và promo lấy đúng departure. |
| `getResolvedScheduleData`, `queries.ts:712` | `heroStats.lowestPrice` không còn bị 0 lấn giá có thật; gián tiếp homepage gọi schedule ở `WingsGoHomepageSections.tsx:77`, nhưng không đọc lowestPrice tại đó. V2 bỏ giá thấp nhất khỏi hero theo brief. |

Không có caller trực tiếp ở catalog/curation/simulator. Lệnh `rg -n 'getLowestPrice' app/src app/tests` xác nhận hai vị trí gọi; các kết quả trong `docs/reviews` là log lịch sử.

**Lỗi độc lập cần ghi nhận:** hero hiện tại gọi `formatTourPrice(lowestPrice)` thiếu currency (`StructuredPages.tsx:3901`, `:3923`). `currency.ts:25` từ chối currency thiếu, nên ngay cả 18.900.000 cũng trả null/“Liên hệ”. Không kết luận nguyên nhân chỉ là giá 0. Với card theo hành trình, lọc các departure khớp filter và đủ `canHoldSeat`, rồi chọn departure có giá thấp nhất và giữ cả currency/originalPrice/promo của chính đợt đó. Không ghép giá gốc từ đợt gần nhất khác.

### 3. `canHoldSeat` và `normalizeGovernedTourPrice`

- `DepartureStrip`, `StructuredPages.tsx:3512–3517`: truthy commerceVerified, không sold-out, có future departure, giá được `normalizeGovernedTourPrice` chấp nhận.
- `ScheduleInteractiveDepartures.tsx:163–164`, `:232–244`: `commerceVerified ?? Boolean(availabilityStatus)`; chỉ hạ sang inquiry nếu chưa verified/sold-out. Giá 0, currency lạ hoặc ngày quá khứ vẫn có thể mang intent hold-seat nếu truyền một DTO như vậy. Đây là khác biệt đã xác nhận từ code.
- Helper hiện tại còn lệch lịch VN do dùng `getFutureDepartures` UTC. Dùng `daysUntilBusinessDay(departureDate,now) >= 0` sau khi kiểm tra kết quả khác null; `null >= 0` trong JS là true nên không được bỏ điều kiện null.

Chữ ký đề xuất tại `app/src/tours/utils.ts`, pure và dùng được server/client:

```ts
canHoldSeat(
  departure: Pick<DepartureCardViewModel,
    'commerceVerified' | 'availabilityStatus' | 'departureDate' |
    'currency' | 'priceFrom'>,
  now: Date = new Date(),
): boolean
```

Yêu cầu `commerceVerified === true`, không sold-out, ngày hợp lệ từ hôm nay VN, giá governed hợp lệ. Server dùng helper để dựng `canHoldSeat` vào DTO; client đọc boolean, không gọi lại với thời gian mới khi hydrate. Giữ `DepartureStrip` vì `TourMarketPage` còn gọi ở `StructuredPages.tsx:3831`; đổi cả hai caller sang helper. Những biểu thức tương tự ở detail/market (`:1348`, `:3625`) là phạm vi regression cần rà, không tự thay đổi commerce của WingSide.

`currency.ts:10–38`: trim/uppercase currency, chỉ VND/USD; value phải là number hữu hạn và >0. Không nhận string số, 0, âm, NaN, Infinity, currency thiếu hoặc EUR. Không đổi tiền, không kiểm tra freshness, inventory hay ngày. `normalizeDepartureCard` (`queries.ts:244–255`) chịu trách nhiệm verification: có verifiedAt/expiresAt thì kiểm tra cửa sổ; legacy thiếu cả hai chỉ được verified nếu boolean true; draft bypass. Hai timestamp không hợp lệ/hết hạn → commerce false, giá/status/promo public bị giảm về null. Muốn một snapshot chặt phải truyền cùng `now` vào bước verification này nữa.

Intent và nhãn phải tách: override không nâng inquiry thành hold-seat. `getTourInquiryPath` giữ source=schedule và đầy đủ ID/ngày/tour. Với ngày có timestamp 17:00Z, `.slice(0,10)` như `ScheduleInteractiveDepartures.tsx:233` gửi ngày UTC trước ngày khách thấy. Tuy nhiên đổi riêng CTA sang ngày business sẽ bị `resolveDepartureLeadContext` tại `app/(payload)/api/lead-submissions/route.ts:95–102` từ chối; POST trả 400 ở `:445`. Đã thực thi chính hàm resolver với mock DB và xác nhận cả hai trường hợp. Phải đồng bộ ngày business giữa URL/form/resolver/persistence và kiểm tra link cũ; nếu cần chấp nhận biểu diễn UTC cũ, chỉ chấp nhận ngày suy ra từ chính departure đã đối chiếu ID/site/tour, không bỏ validation để nhận ngày tùy ý. Điều này cần xử lý ngay cả khi Q1 chọn link, không phải chỉ khi mở dialog.

### 4. `normalizeTourProductCard`: phạm vi thực sự và badge

Mapper tại `queries.ts:105–125` trả product gọn, hiện không có badge/hasHot/site. Hai đường gọi trực tiếp: `normalizeDepartureCard` (`:286`) và fallback related cards của `selectRelatedTourCards` (`:214`). Nó **không phải** mapper duy nhất của toàn bộ card WingsGo.

| Bề mặt | Đường truyền dữ liệu / tác động |
|---|---|
| Lịch v2 | `getResolvedScheduleData` → `normalizeDepartureCard` → nested product. Thêm badge ở đây là cần thiết cho card theo tour/thị trường. |
| Homepage departure spotlight | `WingsGoHomepageSections.tsx:77` dùng schedule. Nhận thêm field nhưng UI hiện không tự đọc nested editorial badge (`:133–158`); thêm DTO không đồng nghĩa viền sẽ xuất hiện. |
| Market | Departures được normalize tại `queries.ts:561`; mảng `tours` lại tự normalize badge tại `:583–593`. Không normalize lần hai mù quáng hoặc thay giá/đợt đang chọn ngoài ý muốn. |
| Detail WingsGo và WingSide | `getTourDeparturesForProduct`, `queries.ts:375`, cấp nested product; fallback related tours tại `:470`. Root tour detail được trả riêng (`:491`), không qua mapper này. Preserve sanitization WingSide và kiểu relation primitive/null. |
| Campaign | Departures đi qua mapper tại `queries.ts:651–652`; kiểm tra shape nhưng không thêm giao diện mới ngoài scope. |
| `/tour`, Hero, Upcoming, MarketTiles | Đi qua `queryWingsGoTourCatalog`/`buildCard`, `wingsGoCatalog.ts:271`, `:376`, `:868`, đã có normalize badge riêng; không tự chịu thay đổi mapper trong `queries.ts`. |
| Curation public | Catalog dùng cùng buildCard sau resolver; không cần thêm badge override vào TourCurations. |
| CMS picker/simulator | `FeaturedToursCurationField.tsx:138–204` gọi REST rồi tự map `CuratedTourCardData`; `LiveSimulatorPreview.tsx:30` nhận kiểu riêng, chia 3 slot hero + 3 slot catalog. `types.ts:1–20` không có badge. Không dùng `normalizeTourProductCard`, và không tự cập nhật từ thay đổi này. |
| WingSide homepage projection | `homeCuration.ts:312–336` có projection riêng. Không được đổi theo assumption mọi nơi dùng một mapper. |

**Bẫy populate:** `TourProducts.ts:115–124` chỉ lấy title/slug/market/duration/summary/heroMedia/itineraryPdf khi product là relationship. Không có badge/site/marketCard. Theo cơ chế Payload [S3], tăng depth không lấy lại những field bị loại bởi `defaultPopulate`. Khuyến nghị thêm `populate['tour-products']` đủ field tại query schedule (wrapper cần nhận option); giữ default toàn cục để giảm blast radius. Nếu dùng query product riêng, phải cùng site/locale và cùng snapshot.

**Locale propagation:** thêm locale rõ cho `normalizeDepartureCard` và `normalizeTourProductCard`, truyền qua schedule, market, detail, campaign và fallback related cards. Nếu bổ sung tham số thứ hai cho mapper, thay `.map(normalizeTourProductCard)` tại `:214` bằng arrow có locale: callback map truyền index ở đối số thứ hai. Kiểm tra các test `tourPublicProjection.unit.spec.ts:104`, `:133`; configured related cards hiện bypass mapper (`queries.ts:211–214`), nên không coi chúng đã được normalize đồng nhất.

**D11:** tham khảo `wingsGoCatalog.ts:823–836`: đọc EN strict, fallback nội dung VI cho tour thiếu title, nhưng giữ `editorialBadges` từ bản EN. `normalizeEditorialBadges` (`editorialBadges.ts:109–176`) trả mảng DTO `{kind,label}` và boolean; loại kind lạ, trùng kind và label rỗng, tối đa ba; EN không fallback localized map VI. Tuy nhiên chuỗi VI không có `_locale` vẫn được nhận (`:137–144`), nên tuyệt đối không lấy badge từ object đã fallback toàn bộ sang VI.

**Serialization/hydration:** string/number/boolean/null, array và plain object của badge an toàn theo shape hiện có. Không đưa Date, Set/Map, hàm hoặc raw locale map vào contract JSON; không nhầm giới hạn contract này với khẳng định React Flight không hỗ trợ Date. Không có bằng chứng mapper hiện gây hydration lỗi. Rủi ro thực tế là SSR/client chọn locale/now khác nhau và lặp product/media cho từng row. DTO client nên chỉ có product ID/title/slug/market/duration, badge normalized, media `{url,alt}` đã kiểm site nếu cần, và commerce/date fields cần hiển thị. `verifiedAt` hiện không được giữ tại `queries.ts:266–289`; nếu muốn dòng “Cập nhật”, phải thêm dữ liệu đã xác minh hoặc aggregate server, không dùng `updatedAt` thay thế.

### 5. Airline trong local DB và bảng chuẩn hóa

**Kết quả kiểm kê local:** không tìm thấy `.db`, `.sqlite`, `.sqlite3` hoặc WAL/SHM tương ứng trong `E:\repo\WingsTravel-us093\app`; không có `.env` hoặc `node_modules`. Các tên mặc định là `payload-tourplatform.db` / `payload.db` (`utilities/localDatabase.ts:5–6`, `.env.example:4`). Do đó **không có danh sách DISTINCT airline đã đọc từ SQLite ở phiên này**. Không dùng DB của worktree khác, không boot Payload vì config có thể chạy repair schema (`payload.config.ts:70–75`).

Airline là field **localized** (`TourDepartures.ts:120–124`), nên khi có snapshot phải đọc cả VI/EN và site, không chỉ một cột bảng departure. Dùng kết nối SQLite `mode=ro`/`PRAGMA query_only=ON`, inspect schema trước; tổng hợp count theo site + locale + chuỗi gốc từ cả bảng locales. Không gọi script repair hoặc seed để mở DB.

Ba biến thể được brief nêu là `Vietjet`, `VIETJET AIR (VJ)`, `Vietjet (về chuyến 06h25)`. Audit prototype nói có 20 lựa chọn trùng; đây là bằng chứng từ tài liệu đầu vào, **không phải phép đo DB mới**.

Prototype `wingsgo-departures-v2.html:444` có đúng bảng sau; alias bên phải là đề xuất để triển khai/test, không phải kết quả query DB:

| Key | Nhãn prototype / đề xuất | Alias hiển thị có thể nhận |
|---|---|---|
| VJ | Vietjet Air | VJ; Vietjet; Vietjet Air; VIETJET AIR (VJ); Vietjet kèm ghi chú giờ bay |
| VN | Vietnam Airlines | VN; VNA; Vietnam Airlines; VIETNAM AIRLINES (VN) |
| CA | Air China | CA; Air China; AIR CHINA (CA) |
| NH | All Nippon Airways | NH; ANA; All Nippon Airways |
| 7C | Jeju Air | 7C; Jeju Air |
| VU | Vietravel Airlines | VU; Vietravel; Vietravel Airlines |
| EK | Emirates | EK; Emirates |
| TK | Turkish Airlines | TK; Turkish Airlines |
| 9G | Sun PhuQuoc Airways | 9G; Sun PhuQuoc Airways; chỉ thêm cách viết khác sau khi xem snapshot |
| FD | Thai AirAsia | FD; Thai AirAsia; không gộp mọi chuỗi “AirAsia” thành FD |
| WE | Parata Air | WE; Parata Air; đối chiếu danh mục vận hành trước khi khẳng định mã/tên |

Bảng trên ghi lại mapping prototype, không xác nhận độc lập IATA hiện hành của từng hãng. Không dùng prototype để đổi dữ liệu CMS.

Helper nhỏ đề xuất `normalizeScheduleAirline(value)` trong module display của schedule: trim, NFKC, gom khoảng trắng; bỏ dấu nháy thừa ở biên để matching; match tên rõ hoặc mã token có ranh giới (`(VJ)`, mã đứng riêng), không substring tùy tiện. Trả key ổn định + label. Một chuỗi rõ một hãng thì quy về nhãn bảng; không nhận diện hoặc có nhiều hãng thì giữ chuỗi gốc đã trim, tránh đoán hãng từ “air” hoặc thời gian bay. Filter dùng key, row dùng label, URL encode key; airline lạ vẫn được chọn/lọc. Test chữ thường/hoa, quote lệch, khoảng trắng, mã trong ngoặc, ghi chú và hãng lạ. Bổ sung fixture bằng mọi DISTINCT local trước khi chốt bảng; chưa thể tuyên bố bao phủ dữ liệu thật.

### 6. `getTourRouteTitle` với tên tour

`wingsGoDisplay.ts:104–120` chỉ tách dấu `-`, `–`, `—` có khoảng trắng hai bên; bỏ origin khi có nhiều segment; chỉ đổi chữ khi **toàn route** là uppercase. `:95` coi mọi token ASCII 2–3 ký tự là acronym, không chỉ airline. Caller hiện có: `WingsGoUpcomingStrip.tsx:79`, `heros/WingsGoCommerceHero.tsx:177`; test tại `wingsGoDisplay.unit.spec.ts:49–54` chưa bao phủ token dài/thời lượng.

| Đầu vào | Output đã chạy / nhận xét |
|---|---|
| `THÁI LAN 5N4Đ` | `Thái LAN 5n4đ`: “LAN” bị giữ in hoa vì dài 3, mã thời lượng bị lowercase. Đây là fixture uppercase dựa trên tên “Thái Lan 5N4Đ” có trong prototype, chưa xác nhận raw title DB. |
| `HÀ NỘI – SEOUL – UNESCO` | `Seoul · Unesco`: acronym >3 ký tự bị đổi. Đây là fixture biên, không khẳng định có tour UNESCO trong DB. |
| `HÀ NỘI-SEOUL-JEJU` | `Hà Nội-seoul-jeju`: không tách route, không bỏ origin. Fixture biên để chứng minh quy tắc separator. |
| Tên thật trong prototype: `Đón Tết Đinh Mùi Tại Nhật Bản 2027: Nagoya – Kyoto – Làng Cổ Shirakawago – Takayama – Núi Phú Sĩ – Tokyo – Ngắm Hoa Anh Đào Nở Sớm` | Output giữ nguyên cả tiền tố dài đến “2027: Nagoya”, chỉ thay các dấu phân đoạn sau thành `·`. Vẫn có rủi ro wrap lớn ở vé mobile. |

Đã parse prototype: 177 departure / 43 slug tour; đây là dữ liệu nhúng có chú thích lấy từ trang public ngày 30/10, **không phải snapshot DB** (`prototype:440–441`). Tên “Hongkong – Disneyland – Cửu Long Thành Trại” trong prototype không tự chứng minh lỗi acronym: Disneyland là tên riêng, không nên giữ ALL CAPS tùy tiện.

Khuyến nghị sửa display helper với fixture thực tế trước: nhận diện riêng mã thời lượng `5N4Đ`/`5N4D`, allowlist acronym có căn cứ; không coi mọi từ 2–3 ký tự là acronym. Không split mọi dấu `-` trong tên quốc tế để chữa thiếu khoảng trắng. Nếu chưa có DB chứng minh separator mới, giữ nguyên nội dung, xử lý chiều dài bằng layout và tên đầy đủ cho accessible name; không tự xóa phần trước dấu `:` hoặc mã hãng ở cuối. Brief yêu cầu tái dùng helper, không yêu cầu xóa hãng khỏi title như audit prototype.

### 7. Giữ link tour trong HTML khi thu gọn 8 đợt/tháng

**Chọn render đủ row ở SSR, thu gọn bằng thuộc tính `hidden`/CSS cho phần sau row thứ 8.** Tất cả `<a href>` tour vẫn có trong response HTML, nội dung là cùng lịch người dùng mở bằng “Xem thêm”, không tạo bản SEO khác. Dùng một danh sách; không render thêm cả bản vô hình thứ hai. Nút có `aria-expanded` và `aria-controls`; row đang hidden cùng mọi link/CTA bên trong phải rời accessibility tree và thứ tự tab. Tôn trọng reduced motion.

Cần progressive enhancement: khi JS không hoạt động, cho hiển thị toàn bộ hoặc có fallback mở bằng HTML/CSS. Có thể chỉ áp CSS thu gọn sau enhancement với initial markup/hydration đồng nhất; không đổi state tùy window ngay trong initial render. Không dùng `.slice(0,8)` để loại node ngay SSR rồi hy vọng client tạo lại link.

So với phương án danh sách link riêng: hidden row giữ nguyên context tour/ngày và ít duplication, đổi lại HTML vẫn lớn. DTO gọn giảm dữ liệu Flight/JSON, không tự làm toàn bộ HTML nhỏ nếu vẫn render 177 row. So với `<noscript>`: đó không phải nguồn link thay thế thích hợp cho crawler có JS và không đạt cùng UX. Đây là lựa chọn giữ link theo yêu cầu; sự hiện diện trong HTML không bảo đảm từng link được index.

Khi sort giá, dùng một danh sách toàn cục, không chia tháng; quy tắc “8/tháng” chỉ áp chế độ ngày. Khi theo hành trình, đủ link tour + sáu ngày ban đầu và nút mở phần còn lại; giữ đủ anchors liên quan trong SSR. Bằng chứng cần so tập href tour public của toàn snapshot với HTML ban đầu, cả VI/EN và tour chỉ có đợt nằm sau vị trí thứ 8. Có thể dùng `HTMLParser` để so tập link; HTTP 200 không chứng minh yêu cầu này.

### 8. Metadata noindex và URL filter

**Có:** `[...slug]/page.tsx:11–16`, `:28–38` đã nhận `searchParams` dạng Promise và forward vào `generateCmsPageMetadataByPath`. Page forward vào render tại `:25`. Route có `dynamic='force-dynamic'` tại `:9`; không phải bổ sung mới từ đầu.

**D9 `/tour` hiện có:** `cmsPage.tsx:500–523` khai báo whitelist và detector tham số không rỗng; `:608–622` áp `robots.index=false, follow=true` khi site WingsGo và path `/tour`. `generateMeta.ts:74–84`, `:109–113` tạo canonical bằng requestedPath + site + locale, không lấy query. Catalog API trả `Cache-Control:no-store` ở `app/(payload)/api/wingsgo/tour-catalog/route.ts:27–34`; schedule chưa có API riêng và đang đọc Local API trong dynamic page.

**Tái dùng:** bổ sung whitelist schedule `market,month,airline,status,q,sort,view` và route branch `/lich-khoi-hanh` trong cùng metadata function. Không bê nguyên `getDiscoverySEOPolicy` (`discoveryCore.ts:358–367`), vì canonical của nó là `/journeys`, parser và key khác. Canonical vẫn qua utility site/locale hiện có; `/en/lich-khoi-hanh?...` phải canonical về `/en/lich-khoi-hanh` trên canonical host của site.

Phân biệt **validation URL** và **SEO policy**: parser bỏ giá trị lạ/mảng nhiều phần tử theo rule rõ; noindex dựa trên sự hiện diện query trạng thái thuộc whitelist như D9, kể cả giá trị không hợp lệ, để tránh index URL rác. Cần chốt handling query không biết: khuyến nghị noindex cho query không phải tracking nếu giữ chúng; chỉ index URL sạch. Tracking như utm không phải filter. Không lấy `Object.keys(searchParams).length` mà vô tình đổi SEO mọi route/site. Phải test cả `?view=tour`, `?sort=price`, giá trị sai, duplicate query và EN.

`cmsPage.tsx:728` hiện không truyền searchParams tới `TourSchedulePage`. Nối từ `resolveStructuredTourPage` (`:628`) xuống parser server/initialFilters; client khởi tạo từ chính kết quả đó, rồi đồng bộ URL, back/forward, xóa chip, debounce search. Không chỉ đọc `location.search` sau mount. Nếu phát sinh API mới, giữ no-store và cùng parser/locale/site như SSR; không thêm API nếu mọi dữ liệu đã có trong DTO.

### 9. Header WingsGo và top của thanh lọc

**Code thật không có sticky header WingsGo:** `Header/Component.client.tsx:67–74` chỉ có `container site-header`; `globals.css:622–624` dùng `relative z-20`. Không có header height CSS variable hoặc measurement/ResizeObserver trong component. CSS WingsGo tại `globals.css:4652–4670` chỉ điều chỉnh layout desktop, không đổi position. `wingsgroup-v3.css` là shell khác, không lấy offset của WingsGroup áp vào WingsGo.

`Logo.tsx:104` đặt logo header child `h-14` (56px với root 16px); bar có `py-3` và border-b (`globals.css:627`). Tổng danh nghĩa một hàng là 56 + 24 + 1 = 81px, nhưng **không phải số đo browser**: nav có wrap (`:663–668`), font/root size/cấu hình ảnh có thể đổi kích thước. Không thể báo chiều cao thật 81px khi chưa chạy app. Prototype có topbar sticky (`:45`) và filter `top:76px`/mobile `64px` (`:123`, `:292`), đó là shell khác.

Khuyến nghị giữ header hiện hành và đặt filter sticky `top:0` khi header đã cuộn khỏi viewport. Không tự biến global header thành sticky trong story trang lịch. Nếu stakeholder thực sự muốn header cùng sticky, đó là thay đổi shell cần chốt rõ; đo height thực bằng ResizeObserver và một CSS custom property theo breakpoint/locale, dùng chung cho filter/scroll offset. QA bật menu/hotline dropdown, keyboard focus và anchor scrolling. `WingsGoMarketTiles.tsx:66` hiện dùng yOffset=-40, không phải variable chiều cao header để tái dùng.

### 10. Khối “3 bước / hotline” ở `/tour`

**Chưa có component chuyên biệt để import.** `WingsGoTourCatalogSection.tsx:42–60` chỉ render `WingsGoCommerceHero`, `WingsGoUpcomingStrip`, `WingsGoTourCatalogClient`; client/copy không có khối ba bước. `cmsPage.tsx:470` còn render CMS blocks, nhưng worktree không có DB để xác nhận nội dung CMS đang gắn trên `/tour`. Không khẳng định nội dung runtime chắc chắn thiếu chỉ từ source.

Những thứ thật sự dùng lại được:

- `resolveSiteHotlines`, `formatHotlineDisplay` trong `utilities/siteHotlines.ts`; danh sách đã được resolve và truyền vào schedule ở `cmsPage.tsx:728`.
- `getSharedZaloCTA` trong `utilities/sharedConsultationChannels.ts:17`; đây là cấu hình Zalo OA shared, không phải URL hard-code mới của schedule.
- Khối tư vấn hiện tại **nằm trực tiếp** trong `TourSchedulePage`, `StructuredPages.tsx:4020–4066`, gồm link contact + hotline + Zalo.
- `CallToActionBlock` tại `blocks/CallToAction/Component.tsx` là renderer CTA CMS chung, không phải component “3 bước” với hotline.
- `RetailTourConsultationDialog` tồn tại cho detail; mount tại `StructuredPages.tsx:3090–3113` phụ thuộc `TourDepartureSelectionProvider`. Không có mount đó trong catalog section `/tour` để gọi lại bằng một trigger tùy ý.

Với Q1 link contact, viết copy VI/EN ba bước nhỏ trong section lịch, dùng utilities sẵn có. Không cần CMS block hay registry mới. “Trao đổi với chuyên viên” đi theo contact path locale-aware; nếu sau này cả `/tour` cần cùng section thì mới tách component thực sự dùng ở hai nơi.

### 11. Revalidation khi sửa giá/đợt/badge

**Có cho hai đường dẫn được hỏi, theo wiring hiện tại:**

- `revalidateTourContent.ts:14`: basePaths có `/lich-khoi-hanh`.
- `:29–34`: revalidate bản không locale và mọi `publicLocaleCodes`, bao gồm `/en/lich-khoi-hanh`.
- `TourDepartures.ts:318–319` đăng ký `revalidateTourDeparture`/Delete; hook change tại `revalidateTourContent.ts:199`, `:255–272` dùng basePaths khi sửa giá/đợt.
- `TourProducts.ts:1212–1213` đăng ký hook product; `revalidateTourProduct` tại `revalidateTourContent.ts:133`, `:162–171` chạy basePaths khi sửa/xóa badge của public tour. Đây là collection `tour-products`, không phải một collection tên `Tours`; `Tours` trong đường dẫn là thư mục hooks.
- `clearRedisCurationCache` theo site tại `:175–177`, `:274`, không cần thêm flush toàn Redis cho schedule. Query schedule hiện không thêm Redis cache riêng.

Điều kiện bỏ qua: `context.disableRevalidate`, admin-create render, hoặc cả doc và previousDoc chỉ là draft (`:138–143`, `:204–209`). Draft-only không phải bug; published → draft vẫn invalidates vì kiểm tra cả previousDoc. Không phải mọi lần save đều đồng nghĩa public thay đổi.

**Bằng chứng hiện có là source, chưa phải sửa CMS local và quan sát browser.** Unit `editorialBadgesRevalidation.unit.spec.ts:27–70` hiện assert homepage/catalog/market, chưa assert schedule. Thêm assert cho `/lich-khoi-hanh`, `/en/lich-khoi-hanh` ở cả departure/product hooks, bao gồm xóa/unpublish; kiểm tra sửa giá gốc/promo và badge thực khi đã có DB. Xem cả missing related product/delete path trước khi bổ sung dữ liệu lỗi làm test hook throw.

Không gọi revalidatePath để giải quyết hết hạn theo thời gian: `expiresAt` và đổi ngày không có save hook. Giữ dynamic, cùng now và không cache DTO quá hạn. Tab đang mở lâu không tự mới chỉ vì server force-dynamic; kiểm tra lại khi refresh/navigation và không mô tả CTA như xác nhận còn chỗ. Alias `/wingsgo/...` nếu còn public cần test rewrite riêng; hook hiện chỉ có alias WingSide tại `:16`, `:64–71`, chưa chứng minh invalidation alias WingsGo.

### 12. Phân tách Story và Q1/Q2/Q3

**Giữ một US-093** cho query/DTO/helper/UI/SEO của trang lịch: các module cùng một hợp đồng và cần một lần nghiệm thu xuyên suốt. Chia phase/PR nhỏ để review, không chia thành nhiều story chỉ vì nhiều file. Bản report này là một nhiệm vụ review với một đầu ra; không có module ứng dụng nào được giao triển khai.

| Câu hỏi | Đề xuất và lý do |
|---|---|
| Q1 — link hay dialog | Chọn link `/lien-he` có source/tour/departure/intent. Đã có lead flow, không thêm modal + Turnstile + submission state/duplicate retry vào lịch; vẫn phải sửa/kiểm tra hợp đồng ngày CTA–endpoint như P1.4. Nếu chọn dialog, scope phải gồm bảo mật endpoint, site, validation, keyboard/focus, idempotency và kiểm tra lead được persist; không giả định component detail có thể mount độc lập. |
| Q2 — giữ other hay enum mới | Giữ enum hiện tại; chip từ product.market thật. `WINGSGO_MARKET_LABELS` tại `wingsGoCatalogCopy.ts:318–329` đang dùng VI “Tuyến khác”; cần đổi có chủ ý thành “Thị trường khác” hoặc override copy schedule để đáp ứng brief, và ghi ảnh hưởng `/tour` nếu đổi constant shared. Không suy thị trường từ title. |
| Q3 — hot trên row | Chỉ dùng rainbow và sticker ở card tour/thị trường; row giữ metadata/promo/urgency đúng nguồn. Khuyến nghị không thêm nhãn hot dạng chip văn bản vào row. Chốt riêng nếu stakeholder muốn thông tin hot trên row; không dùng màu làm tín hiệu duy nhất nếu có hiển thị trạng thái đó. |

Nếu Q2 chọn enum mới, tách story migration riêng (US-094 là mã gợi ý, chưa cấp): collection enum và migration PostgreSQL/SQLite, generated types, whitelist/labels/route market, mapping hooks revalidation (`revalidateTourContent.ts:8` hiện chỉ 3 key), taxonomy/curation/filter/API, admin, test và kế hoạch backfill được duyệt. Tách **schema** khỏi **phân loại lại dữ liệu**; không đoán thị trường và không ghi production trong US-093. Giữ tương thích `other` và URL cũ, kiểm tra site dùng chung. Story này cần planning gate mới. Không tạo story/Plane item hoặc đổi timeline trong phiên review.

### 13. Rủi ro bổ sung cần đưa vào kế hoạch

1. **Single snapshot:** giữ một tập departure sau scope/ngày và một now; mọi stats, chart, card, view đều derive từ tập đó. Query từng trang có thể gặp insert/update giữa các trang: sort ổn định + dedupe giúp giảm trùng nhưng không thay thế transaction snapshot; nếu yêu cầu snapshot DB tuyệt đối, phải chốt isolation/transaction. Không hứa tính nguyên tử chỉ vì cùng now.
2. **Freshness:** `isDepartureVerificationCurrent` (`departureCommerce.ts:65–77`) cần cả verifiedAt/expiresAt hợp lệ, `verifiedAt<=now<expiresAt`. Normalize bằng cùng now; không suy verification từ status ở client. `verifiedAt` hiển thị chỉ lấy từ các row hợp lệ và giải thích “cập nhật” là ngày xác minh nào, không dùng max timestamp bất kỳ như lời khẳng định toàn lịch vừa xác minh.
3. **Giá/currency:** `TourDepartures.ts:154–159` cho VND/USD. Không lấy min/sort số trần giữa hai currency, hoặc giả định toàn WingsGo là VND khi chưa query DB. Không tự thêm FX; chốt cách xử lý dữ liệu khác currency trước sort giá và giá từ theo tour. `PromotionPrice` không biết sold-out/verification: caller phải chỉ truyền originalPrice/promo đủ governance; normalization hiện hạ originalPrice ở `queries.ts:251–264`. Row giá phải là đúng đợt, card gom tour phải giữ departure nguồn của min price.
4. **Đếm/status:** openCount hiện là tổng `visibleDepartures.length` (`queries.ts:714`), gồm row có thể đã kín/chưa giá. Không đặt nhãn “đợt mở bán” cho tổng này. Lập bảng rõ verified/invalid price/open/limited/sold-out/custom availabilityBadge và filter chờ báo giá; chốt liệu sold-out không giá có thể khớp cả hai filter. Override badge chỉ đổi câu chữ, không đổi facts/intent.
5. **Facets:** chart tháng chịu mọi filter khác nhưng bỏ chính filter month khi đếm; giữ tháng trống/cross-year theo brief. Market chip count nên bỏ chính market để có đường thoát; giữ chip đang chọn ngay cả count=0. Không cộng số đợt thành số tour; tourCount distinct ID cùng snapshot.
6. **Ngày:** `groupDeparturesByMonth` đã dùng `businessCalendarMonth` (`utils.ts:643`), trái phần mô tả cũ trong design US-092 nói vẫn UTC. Tuy nhiên `getFutureDepartures` còn UTC và `getNextDeparture` chọn rẻ nhất (`:615–631`). Không tái dùng tên helper như bằng chứng semantics đúng. Thống kê gần nhất chọn min ngày hợp lệ, không dùng helper chọn giá rẻ này.
7. **Multisite/locale:** kiểm cả relationship product/media và wrapper route; giữ SiteLink/sitePaths cho `/en` và alias. Phân biệt `other` với unknown/null, không giấu dữ liệu vì chip enum không có. Không đổi renderer site khác từ một branch WingsGo.
8. **Payload size:** `SchedulePageViewModel` có departures, featured và grouped (`types.ts:93–103`), nhưng hiện chỉ `schedule.departures` được truyền vào client ở `StructuredPages.tsx:4017`. Không nói toàn bộ schedule object đang serialize xuống client. Dẫu vậy mỗi nested product có heroMedia/marketCard, chưa gọn; đo HTML, Flight và DTO riêng. Không dùng “depth giảm” làm bằng chứng byte đã giảm.
9. **URL/search:** chuẩn hóa không dấu và giới hạn query đầu vào hợp lý; query/mảng lạ không làm exception. Debounce không được ghi đè market/month mới đổi bằng closure cũ; giữ unrelated tracking/hash khi replace URL; xử lý popstate và không reset focus vô cớ khi lọc. Không tạo fetch/generation guard mới nếu không có request async cần nó.
10. **A11y/responsive:** button tháng có label tháng+năm+số đợt, aria-pressed và disabled đúng; live region kết quả có debounce; nút bỏ chip có tên; mode view keyboard được; “+N ngày khác” mở ngày thật, không CTA chung mất context. Test focus ring/rainbow pseudo-element không chặn pointer, ≥44px, contrast sold-out ≥4,5:1, xóa filter và empty state, không horizontal page overflow ở đủ 10 width brief nêu. Market rail được cuộn ngang có chủ ý không đồng nghĩa cho phép body tràn ngang.
11. **Regression:** `getResolvedScheduleData` còn dùng ở homepage và wrapper `getSiteScheduleData` (`queries.ts:720–732`, hiện không thấy caller bên ngoài). Thay lịch quá khứ/future/limit phải có fixture homepage không inventory. Giữ sanitization và default non-WingsGo layout; đừng xóa DepartureStrip chỉ vì schedule không dùng nữa.

## Required response in implementation

Orchestrator cần chuyển các phát hiện vào `US-093/design.md`, `execplan.md`, `validation.md` hoặc `audit.md` trước code; phiên review này không sửa các file đó.

1. Ghi quyết định stakeholder Q1–Q3, khác biệt header/prototype, lựa chọn SSR đủ link và bảng semantics stats/status/currency. Không coi D1–D14 trong báo cáo là quyền tự duyệt sản phẩm.
2. Phase 0 cung cấp DB local/snapshot read-only, version package thực cài, DISTINCT airline VI/EN theo site, raw tour title và dạng timestamp; đo HTML/Flight/DTO cũ. Không tự seed dữ liệu để thay thế bằng chứng hiện trạng.
3. Unit: finite positive lowestPrice; đủ trạng thái canHoldSeat và expiry; ranh giới 17:00Z/00:00 VN, cùng ngày/quá khứ, qua tháng/năm; sold-out không thành spotlight thương mại; earliest không nhầm cheapest; normalize airline/title; AND filter/facet/URL whitelist, query >200 row với dữ liệu quá khứ, thứ tự/dedupe và empty future.
4. Component: row giá/promo/originalPrice cùng departure, overrides, quote/unverified/sold-out, date-specific CTA; card hot/sticker/no-badge VI/EN; chart keyboard; thu gọn/mở lại; empty state và clear filter; SSR initial filters bằng URL.
5. Integration Payload thật: depth 2 + populate lấy được badge/site/media, EN thiếu title vẫn hiện nội dung VI nhưng không lọt badge VI; foreign-site relation/media, draft/unpublish, primitive/missing relation; query nhiều hơn 200 không cắt inventory. Test hook schedule VI/EN khi sửa giá/badge và xóa/unpublish. Lead phải persist đúng ngày VN cho cả timestamp 00:00Z/17:00Z, link cũ và site/tour/departure không khớp vẫn bị từ chối.
6. Chạy các suite được brief yêu cầu trong `app/`: `pnpm run lint`, `pnpm run test:unit`, `pnpm run test:component`, `pnpm run test:int`, `pnpm run build`; các test cụ thể brief liệt kê phải có kết quả. Ghi baseline riêng: validation US-092 đã ghi một unit failure `wingsGroupV3Shell` và hai lỗi tsc có sẵn; đây là log lịch sử, chưa được chạy lại ở worktree này. Không gọi suite “pass” nếu lệnh vẫn khác 0.
7. Browser bằng `agent-browser`, VI/EN ở 1440/390 và đủ width yêu cầu: URL reload/back/forward, focus, reduced motion, không body overflow/console error, CTA vào đúng form theo locale và đúng ngày business; so tập link tour trong HTML ban đầu; sửa CMS local rồi thấy giá/badge mới. Đo byte trước/sau với cùng snapshot.
8. Mỗi P1/P2/P3 phải có response, sửa và bằng chứng hoặc quyết định scope rõ của stakeholder; không lặng lẽ bỏ qua finding. Chạy release review riêng trước đóng Story; không phát hành chỉ vì planning review xong. Sync Plane khi orchestrator thay đổi story/tracking theo quy định repo. Không sync Plane trong phiên này vì chỉ thêm consultation, không đổi story/tracking.

## Bằng chứng và giới hạn của phiên review

### Đã làm / đã kiểm

- Đọc hand-off, prototype/audit, AGENTS, README, Harness/intake/architecture, design/validation US-092, overview US-084/083/077 và US-028; đối chiếu source ở các file:dòng nêu trên.
- `.codegraph/` không tồn tại; do đó dùng `rg`, không tạo index. Không đọc/quét các worktree khác. `git worktree list` chỉ dùng để xác nhận vị trí/baseline, không dùng code/DB của worktree khác.
- `git branch --show-current` → `feat/us-093-departure-schedule-v2`; `git rev-parse HEAD` → `58cbd246d401834fe1297de48576d7ddca62d79f`.
- `rg -n 'getLowestPrice' app/src app/tests` → hai caller ở `queries.ts:594`, `:712`; definition tại `utils.ts:504`.
- Kiểm kê đệ quy **chỉ trong app/** bằng Node `fs.readdirSync(...,{withFileTypes:true})`, loại node_modules/.git, đuôi db/sqlite/sqlite3 và WAL/SHM → `localSQLiteFiles:[]`; `nodeModules:false`, `payloadPackage:false`, `codegraph:false`. Parse `const RAW` trong prototype bằng JSON.parse → 177 row / 43 slug; không dùng dữ liệu đó cho sản phẩm.
- Kiểm tra báo cáo bằng `@'<report assertions + embedded Node reproduction>'@ | python -` lúc 08:32:12Z: exit 0; đủ 13 câu, 14 quyết định, 82 tham chiếu có kiểm tra số dòng (nguồn upstream tách khỏi file local), fence cân bằng; chạy lại script Node trích nguyên từ báo cáo có 5 assertions PASS. `git diff --quiet -- app` và `git diff --cached --quiet -- app` cùng exit 0. Đây là kiểm tra artifact/bảo toàn phạm vi, không phải integration app.

Các lệnh thực thi dùng PowerShell heredoc `@' ... '@ | node -`; mã nguồn TypeScript được đọc rồi strip type trong bộ nhớ bằng `node:module.stripTypeScriptTypes`, chạy bằng `node:vm`. Không ghi script/test file và không thay đổi helper. Kết quả PASS dưới đây là **tái hiện hành vi hiện tại**, gồm hành vi có lỗi; không phải các lỗi đã được sửa.

| Lệnh / phép kiểm | Thời điểm UTC 2026-10-30 | Kết quả thật |
|---|---|---|
| `node --version`; `python --version` | Đầu phiên | v22.20.0; Python 3.11.9 |
| `@'<helper source assertions>'@` pipe `node --disable-warning=ExperimentalWarning -` | 08:13:51.486Z | 11 assertions PASS: lowest=0, NaN, currency thiếu, currency support, calendar, route |
| `@'<published Drizzle findMany + DB stub>'@` pipe `node -` | 08:15:29.306Z | 5 behavior assertions PASS: 205 input → 200 khi limit 200, totalDocs 200, hasNextPage false; limit 0 → 205; không count query |
| `@'<calendar/priority/nextDeparture source assertions>'@` pipe `node --disable-warning=ExperimentalWarning -` | 08:17:12.530Z | 5 assertions PASS: UTC loại nhầm hôm nay VN, publishable/priority nhận sold-out, nextDeparture chọn rẻ hơn thay vì sớm hơn |
| `@'<title source assertions + prototype title>'@` pipe `node --disable-warning=ExperimentalWarning -` | 08:23:41.487Z | 3 assertions PASS: duration/acronym/separator; in output tên tour prototype dài |
| Lệnh tái hiện rút gọn đầy đủ bên dưới | 08:27:24.105Z | 5 assertions PASS, bằng chứng mới sau khi ghi phần phân tích |
| `@'<resolveDepartureLeadContext source + mock DB>'@` pipe `node --disable-warning=ExperimentalWarning -` | 08:30:54.088Z | 2 assertions PASS: ngày business bị resolver từ chối, ngày cắt UTC được chấp nhận; POST map null thành 400 theo source |

Lượt thử title trước đó có assertion kỳ vọng “Thái Lan…” sai; lỗi thực thi trả “Thái LAN…” vì regex bảo toàn token ASCII 3 ký tự. Đã đọc lỗi, sửa expectation của script khảo sát, chạy lại lúc 08:23:41Z; không sửa app để ép test pass.

Lệnh tái hiện rút gọn, chạy từ root worktree, đúng mã đã thực thi:

```powershell
@'
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {stripTypeScriptTypes} = require('node:module');
const utils = fs.readFileSync('app/src/tours/utils.ts','utf8');
const take = (start,end) => utils.slice(utils.indexOf(start),utils.indexOf(end));
const source = [
  fs.readFileSync('app/src/tours/businessCalendar.ts','utf8'),
  fs.readFileSync('app/src/tours/currency.ts','utf8'),
  fs.readFileSync('app/src/tours/wingsGoDisplay.ts','utf8').replace(/^import .*$/gm,''),
  take('export const formatTourPrice','export const formatTourDate'),
  take('export const getLowestPrice','const toDateOnly'),
].join('\n').replace(/export /g,'');
const context = vm.createContext({Date,Intl});
vm.runInContext(stripTypeScriptTypes(source),context);
const check = expression => vm.runInContext(expression,context);
assert.equal(check('getLowestPrice([{priceFrom:0},{priceFrom:18900000}])'),0);
assert.equal(check('formatTourPrice(18900000)'),null);
assert.equal(check('normalizeGovernedTourPrice({currency:"EUR",value:100})'),null);
assert.equal(check('daysUntilBusinessDay("2026-10-29T17:00:00Z","2026-10-30T05:00:00Z")'),0);
assert.equal(check('getTourRouteTitle("THÁI LAN 5N4Đ")'),'Thái LAN 5n4đ');
console.log(JSON.stringify({timestamp:new Date().toISOString(),assertions:5,result:'PASS'}));
'@ | node --disable-warning=ExperimentalWarning -
```

Artifact Drizzle đã fetch vào bộ nhớ có SHA-256 `a7c7721566fc349a64d420f34b53dbab025aa9bf7c39969fec106325c064ce51`; version 3.84.1, không phải package cài local. Stub chỉ thay tầng DB/build query/transform, giữ nguyên hàm findMany của artifact; không đủ để chứng minh adapter SQL/permissions thực tế.

### Chưa kiểm / lỗi môi trường / phạm vi không làm

- `& .\scripts\harness.ps1 query matrix` đã chạy và thất bại: `Harness CLI not found`, thiếu `scripts/bin/harness-cli.exe` và `sub/harness-experimental/target/release/harness-cli.exe`. Không init DB hoặc ghi intake/trace vì nhiệm vụ chỉ cho phép một file kết quả.
- Chưa query được SQLite, chưa kiểm kê mọi airline/raw title DB; chưa đọc version trong node_modules vì không tồn tại. Không có kết luận về dữ liệu production.
- Chưa chạy lint/unit/component/integration/build của repo; chưa khởi động app hoặc browser, đo height header thật/HTML/Flight/DTO; chưa thao tác CMS hoặc chứng minh invalidation runtime.
- Chỉ ghi consultation này. Không có sửa app/schema/CMS/strategy/Story/Plane, commit, push, tạo site, publish hay deploy. Các lỗi sản phẩm nêu trên còn nguyên để đội triển khai xử lý.

## Nguồn thư viện ngoài repo

Đối chiếu ngày 30/10/2026; ưu tiên source **đúng tag 3.84.1** hơn tài liệu live có thể đổi. Đây là nguồn bổ sung cho kiểm tra local, không thay thế integration. Các địa chỉ dưới đây được ghi trong code để làm provenance.

- S1 — Payload `find.ts`, tag v3.84.1, dòng 133–134: giữ limit đầu vào khi tắt pagination.
- S2 — Drizzle `findMany.ts`, tag v3.84.1, dòng 35–45, 164–197: áp limit và trả metadata khi không count. Artifact phát hành cùng version đã được chạy với DB stub.
- S3 — Payload `relationshipPopulationPromise.ts`, tag v3.84.1, dòng 70–84: ưu tiên populate override rồi defaultPopulate; tài liệu Select xác nhận semantics.
- S4 — Next.js generateMetadata: page được nhận searchParams Promise; repo đã wire đúng tại catch-all. Không dùng docs live để khẳng định toàn bộ behavior của bản Next 16.2.6 ngoài phần đã đối chiếu code.

```text
S1 https://raw.githubusercontent.com/payloadcms/payload/v3.84.1/packages/payload/src/collections/operations/find.ts
S2 https://raw.githubusercontent.com/payloadcms/payload/v3.84.1/packages/drizzle/src/find/findMany.ts
S2-artifact https://unpkg.com/@payloadcms/drizzle@3.84.1/dist/find/findMany.js
S3 https://raw.githubusercontent.com/payloadcms/payload/v3.84.1/packages/payload/src/fields/hooks/afterRead/relationshipPopulationPromise.ts
S3-doc https://payloadcms.com/docs/queries/select
S4 https://nextjs.org/docs/app/api-reference/functions/generate-metadata
```


## Vòng 2 — Review kế hoạch (2026-10-30)

**VERDICT: GO có điều kiện.** Cho phép tiếp tục chuẩn bị Phase 0; sửa các hợp đồng dưới đây trước khi giao implementation tương ứng. Chưa duyệt release. Q1/Q2/Q3 đã chốt, kể cả nhãn hot tĩnh trên row; không đề nghị mở lại. Không có P1 mới.

### Đối chiếu finding vòng 1

“Đã xử lý” ở đây là kế hoạch có cách làm và phép kiểm cụ thể, chưa phải lỗi sản phẩm đã được sửa.

| Finding cũ | Đánh giá kế hoạch |
|---|---|
| P1.1 inventory/past/quote | D1 có paging thật, sort, dedupe, không lọc mất quote; đúng hướng. Phạm vi D2 còn vướng R4. Cần integration >200, không chỉ unit. |
| P1.2 CTA/ngày | Có helper chặt, server DTO và test biên ngày; còn thiếu đường truyền `now` xuyên normalization/selector (R3). |
| P1.3 relation/site | Có populate và integration scope; yêu cầu published cho media chưa đúng schema (R5). |
| P1.4 ngày lead | D6 đã sửa đúng cả resolver và persistence, có tương thích link cũ. Cần bổ sung ma trận bên dưới. |
| P2.1 populate; P2.2 D11 | Cách làm cụ thể: populate riêng, EN strict rồi fallback nội dung, badge EN strict; có integration. Giữ kiểm tra trên raw relation trước mapper. |
| P2.3 giá/currency/nearest | VND/USD cho UI mới và earliest đã chốt; scalar giá của renderer cũ chưa có hợp đồng currency (R4). |
| P2.4 sold-out spotlight | `validation.md:39` chốt prefilter, nhưng chưa thành việc/test rõ trong Phase 1/2; cần R3. |
| P2.5 SEO/URL | Có đường metadata → SSR → client, whitelist và popstate; làm rõ R6. |
| P2.6 reuse; P2.7 baseline | Header/khối 3 bước đã sửa giả định. Simulator có mapper riêng: xác nhận ngoài phạm vi, không hứa tự nhận badge. Phase 0 có baseline thật, hiện chưa phải bằng chứng pass. |
| P3.1 title; P3.2 semantics | Title có fixture/allowlist cụ thể; status vẫn tự mâu thuẫn (R2), tie-break cần chốt. |
| P3.3 a11y; P3.4 market | Có tiêu chí và QA cụ thể. Copy `other` riêng trang, giữ enum: đáp ứng quyết định stakeholder. |

### Finding còn mở và chỗ sửa

1. **R1 — P2: DTO chưa thể dùng làm giao diện giữa các phase.** `design.md:41–67` vừa nhúng toàn bộ `row.tour`, vừa yêu cầu `row` chỉ tham chiếu bảng `tours`; type không có ảnh dù Phase 2/4 cần ảnh. Sửa mục **Hợp đồng dữ liệu** thành `row.tourId` và một type tour dùng chung có media đã kiểm site; khai báo đầy đủ `WingsGoScheduleSnapshot`, `marketCards`, bốn chỉ số hero và dữ liệu facet. Chốt nơi giữ filter và cách chart/thẻ thị trường cập nhật cùng browser; Phase 2 chưa thể kiểm tương tác lọc hoàn chỉnh trước Phase 3.

2. **R2 — P2: sold-out không giá đang được định nghĩa thành hai trạng thái.** `design.md:74,79` ưu tiên quote khi thiếu giá, nhưng `:80` yêu cầu sold-out. Sửa **Bảng trạng thái** theo thứ tự: chưa verified → quote; đã verified + sold-out → sold-out; thiếu giá hợp lệ → quote; còn lại limited/open. Thêm fixture sold-out không giá, sold-out chưa verified và custom badge. `original`/promo phải giữ governance hiện hữu: hữu hạn, original > giá, đúng departure/currency; không khôi phục promotion cho sold-out/hết verification. Chốt thứ tự theo ngày/giá bằng nhau bằng ngày rồi id.

3. **R3 — P2: tái dùng helper vẫn phá ngày VN/một now.** `utils.ts:570–590` gọi lại `getFutureDepartures` theo UTC, không nhận `now`. Một row thuộc hôm nay VN vẫn mất khỏi market card sau khi query đúng. `queries.ts:249` cũng gọi verification bằng đồng hồ mặc định. Sửa **Snapshot/canHoldSeat** và **execplan Phase 1/2**: derive verification từ raw bằng cùng epoch của snapshot, truyền `now` rõ qua helper liên quan; selector market phải dùng lịch VN và prefilter `canHoldSeat`/sold-out, không chỉ nhắc trong validation. Giữ mặc định tương thích cho caller cũ nếu mở rộng helper. Test khi `now=2026-10-30T03:00Z`, departure `2026-10-29T17:00Z`, cùng expiry đúng bằng now và thời điểm qua tháng/năm. `canHoldSeat` nhận boolean đã derive, tự nó không kiểm được expiry khi thiếu raw freshness.

4. **R4 — P2: thay đổi dùng chung chưa khớp cổng không hồi quy.** D2 áp mọi site (`design.md:168`), trong khi `execplan.md:14` cấm đổi output WingSide/WingsGroup. WingsGo home đã lọc future lại ở `WingsGoHomepageSections.tsx:80–83`: past-only và empty đều không có candidate; chưa thấy nguyên nhân crash chỉ do bỏ fallback. WingSide home dùng `homeCuration`; route lịch hiện chỉ bật WingsGo (`siteCapabilities.ts:1`, `cmsPage.tsx:718`), nên không kết luận WingSide home bị vỡ. Tuy vậy “đã kiểm tra” tại D2 là quá sớm: đổi thành “phải kiểm”, thêm fixture render empty/past-only/future. Chốt D2 chỉ WingsGo hoặc ghi ngoại lệ phạm vi được duyệt cho hàm dùng chung. Đồng thời `design.md:101` nói truyền currency cho hero cũ nhưng `ScheduleHeroStats` chỉ có scalar `lowestPrice` (`types.ts:87`): không được ghép min của USD với currency một đợt VND. Hoặc giữ sửa legacy này ngoài story, hoặc định nghĩa cặp giá/currency và departure nguồn, cập nhật query/type/caller/test; không ép VND.

5. **R5 — P2: media không có `_status=published`.** `design.md:6`, `execplan.md:55` áp published cho cả product/media, nhưng collection `Media.ts:126` không bật versions/drafts. Guard đó sẽ loại ảnh hợp lệ. Sửa thành: product published + cùng site; media cùng site, có dữ liệu URL hợp lệ và tuân access/governance hiện có. Thêm integration media hợp lệ không `_status`, media khác site, relation primitive/mất, product draft/unpublish; không thêm schema để đáp ứng câu chữ kế hoạch.

6. **R6 — P3: SEO/progressive enhancement còn hai cách diễn đạt.** `design.md:146` gắn `hidden` cho row thứ 9, `:148` lại nói CSS mở khi không JS; D8 chỉ thu gọn sau JS. Chốt SSR và render client đầu đều chưa hidden; sau enhance mới đặt `hidden` thật, nút cập nhật thuộc tính đó. Bổ sung kiểm browser tắt JS và focus row ẩn. Với `overview.md:56`/`design.md:149`, phép so toàn bộ snapshot áp cho URL không lọc; URL có filter so với tập tour khớp filter của cùng snapshot. Không render thêm tour ngoài kết quả chỉ để đạt phép đếm link.

7. **R7 — P3: gate và chỉ số hiệu năng chưa nhất quán.** `design.md:98` đã hỗ trợ USD nhưng `execplan.md:178` dừng khi gặp USD; >1.000 vừa là cảnh báo vừa điều kiện dừng. Chốt một hành vi ở hai file. `overview.md:66` đòi cả HTML/Flight nhỏ hơn tuyệt đối trong khi inventory mới không còn trần 200: đo cùng dữ liệu/thời điểm, ghi số row và byte/row, DTO, HTML, Flight riêng; thêm mẫu >200. Không bảo đảm tổng HTML luôn giảm khi số row tăng. Giữ yêu cầu giảm byte cho mẫu so sánh có cùng inventory.

### D6 — Bảo mật và tương thích

Hai ngày **tính từ cùng departure đã resolve trên server** là hai alias của cùng ngữ cảnh, không tự mở quyền giữ chỗ. Không dùng khoảng ±1 ngày, không tìm departure theo ngày khách gửi, không tin tour/site/intent từ URL như quyền booking. Giữ nguyên kiểm tra site của departure và tour, tour published, id/slug, trusted host/form, validation, rate limit và idempotency. `toBusinessCalendarDay` trả null hoặc timestamp lỗi phải fail closed.

Bổ sung vào **D6, execplan Phase 1 và validation AC2**: ngày VN và UTC cũ đều persist ngày VN; thử `00:00Z`/`17:00Z`, thiếu ngày như hợp đồng cũ, không có departureId, ngày sai, sai tourId/slug, site khác, relation mất và record không tồn tại. Resolver hiện dùng `overrideAccess:true` và chưa kiểm published của departure (`route.ts:70–76`): ghi rõ chính sách nhận inquiry cho departure draft/unpublish, không coi published của tour thay thế kiểm tra đó. Nếu siết thêm hợp đồng này, ghi quyết định riêng theo ngưỡng dừng D6. Đổi ngày persist là thay đổi semantics cho caller cũ: thêm test form/lead thực lưu, không chỉ URL và helper. Không có finding P1 mới chỉ vì nhận hai alias.

### Phase và bằng chứng cần bổ sung

Giữ một story, nhưng tách Phase 1 thành **1A query/scope/locale/DTO/thời gian** và **1B shared helpers/lead compatibility**, mỗi phần có diff và test riêng; Codex chốt DTO sau 1A, kiểm hợp đồng public sau 1B. Phase 2–4 giữ được; nối tương tác chart/thẻ/filter trong Phase 3 và kiểm lại trước Phase 4.

Ngoài bộ test đã có, thêm vào `execplan.md`/`validation.md`: integration Payload thật >200 qua ít nhất hai trang, sort/dedupe; draft/primitive/missing relation; earliest khác cheapest; sold-out không làm spotlight; snapshot giữ nguyên now khi qua expiry; cả hai caller `getLowestPrice` với Infinity/không có giá/currency trộn. Kiểm hook VI/EN khi delete/unpublish, không chỉ edit. Browser xác nhận không JS, URL lọc ở SSR, VI/EN và cả hai dạng ngày lead; 768 có ảnh riêng. Phân trang sort + dedupe không bảo đảm transaction snapshot khi CMS thay đổi giữa các trang: ghi giới hạn, không tuyên bố ảnh chụp DB nguyên tử.

### Bằng chứng vòng 2 và giới hạn

- Đã đọc đủ bốn file story và đối chiếu source/caller tại HEAD `58cbd246d401834fe1297de48576d7ddca62d79f`.
- Đã chạy `node --disable-warning=ExperimentalWarning -` bằng source TS thực nạp trong VM, đồng hồ cố định và Payload stub; exit 0 lúc `2026-10-30T08:42:11Z`: **PASS** row hôm nay VN bị selector UTC loại; **PASS** past-only/empty cho cùng candidate home; **PASS** resolver hiện từ chối ngày VN, nhận UTC cũ, từ chối khác site/tour. Đây là tái hiện source hiện hữu, không phải implementation D6 đã pass.
- Vòng này chưa query DB, chạy suite/build hoặc browser; chưa xác minh số liệu production 323/323 được story dẫn lại. Không dùng dữ liệu đó thay baseline Phase 0. Dependency/env/DB đã xuất hiện trong worktree trong lúc review, chưa được dùng để xác nhận runtime.
- Chỉ append consultation. Có hoạt động đồng thời ở worktree; không sửa/hoàn tác file của phiên khác, không sửa story, không sync Plane, commit hay triển khai. Các R1–R7 vẫn mở, cần orchestrator cập nhật kế hoạch và gắn bằng chứng trước khi đóng finding.
