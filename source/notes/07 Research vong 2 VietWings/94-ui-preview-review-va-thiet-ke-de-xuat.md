# UI preview review và thiết kế đề xuất sau khi kiểm tra trực tiếp

Thời điểm kiểm tra: `2026-06-06`

Phạm vi:

- `http://localhost:3000/wingsgo`
- `http://localhost:3000/wingsgo/thi-truong/han-quoc`
- `http://localhost:3000/wingsside`
- `http://localhost:3000/wingsside/destinations/ha-noi`

Ảnh preview đã lưu tại:

- `artifacts/tmp/ui-preview-2026-06-06/wingsgo-home-desktop.png`
- `artifacts/tmp/ui-preview-2026-06-06/wingsgo-home-mobile.png`
- `artifacts/tmp/ui-preview-2026-06-06/wingsgo-korea-desktop.png`
- `artifacts/tmp/ui-preview-2026-06-06/wingsside-home-desktop.png`
- `artifacts/tmp/ui-preview-2026-06-06/wingsside-home-mobile.png`
- `artifacts/tmp/ui-preview-2026-06-06/wingsside-hanoi-desktop.png`

Ghi chú công cụ:

- Đã dùng workflow `ui-preview` để mở local UI, chụp screenshot và đọc DOM/snapshot.
- Đã dùng skill `ui-ux-pro-max` tại `C:\Users\VIETD\.codex\skills\ui-ux-pro-max\SKILL.md`.
- Đã chạy `--design-system` riêng cho `WingsGo` và `WingSide`, sau đó chạy domain search cho `product`, `ux`, `landing`, `color`, `typography`.

## 0. Kết quả áp dụng `ui-ux-pro-max`

## 0.1. Kết quả cho `WingsGo`

Query design-system:

```powershell
python C:\Users\VIETD\.codex\skills\ui-ux-pro-max\scripts\search.py "travel ecommerce outbound retail tour pricing schedule mobile-first" --design-system -f markdown -p "WingsGo"
```

Kết quả hữu ích:

- `Product`: match gần nhất là `E-commerce` + `Travel/Tourism Agency`.
- `Landing`: nên lấy hướng `Pricing-Focused Landing`, `Feature-Rich Showcase`, và `Trust & Authority + Conversion`.
- `Color`: `Travel/Tourism Agency` đề xuất `sky blue + adventure orange`.
- `Typography`: `E-commerce Clean`, heading `Rubik`, body `Nunito Sans`.
- `UX`: mobile phải không có horizontal scroll, touch target tối thiểu `44x44px`, spacing giữa touch target ít nhất `8px`.

Phần cần loại bỏ khỏi kết quả tự động:

- Pattern `Event/Conference Landing` không đúng với outbound tour retail.
- Style `Zero Interface` không phù hợp vì `wingsgo` cần giao diện hiển thị nhiều thông tin, giá, lịch và CTA.

Design system chốt cho `WingsGo`:

- Style: retail travel storefront, vibrant nhưng có kiểm soát.
- Palette: sky blue làm màu nhận diện, orange làm CTA/price accent, nền sáng.
- Typography: `Rubik` cho heading/card title, `Nunito Sans` cho body và bảng giá.
- UI priority: price, departure, tour comparison, inquiry CTA.

## 0.2. Kết quả cho `WingSide`

Query design-system:

```powershell
python C:\Users\VIETD\.codex\skills\ui-ux-pro-max\scripts\search.py "travel inbound luxury destination planning consultative service editorial" --design-system -f markdown -p "WingSide"
```

Kết quả hữu ích:

- `Product`: match gần nhất là `Travel/Tourism Agency`, `Road Trip Planner`, `Hotel/Hospitality`, `Luxury/Premium Brand`.
- `Landing`: nên dùng `Storytelling-Driven + Hero-Centric`, kết hợp `Trust & Authority + Conversion`.
- `Typography`: `Classic Elegant`, heading `Playfair Display`, body `Inter`.
- `Color`: kết quả tốt hơn nằm ở `Hotel/Hospitality` hoặc `Luxury/Premium Brand`: navy/dark neutral + gold/service accent + nền sáng.
- `UX`: destination/planning flow cần CTA rõ trên fold, không phụ thuộc hover, mobile touch target đủ lớn.

Phần cần loại bỏ khỏi kết quả tự động:

- Palette soft pink/lavender không phù hợp với thương hiệu inbound Vietnam của WingSide.
- Style `Gradient Mesh / Aurora` chỉ nên dùng rất tiết chế nếu có, không làm ngôn ngữ chính vì dễ lệch sang lifestyle/fashion và có rủi ro contrast.

Design system chốt cho `WingSide`:

- Style: editorial premium travel planning.
- Palette: nền sáng/neutral, dark ink hoặc navy cho text, gold/olive/teal nhẹ cho accent, tránh tím/hồng.
- Typography: `Playfair Display` hoặc serif editorial cho headline, `Inter` cho body/navigation/form.
- UI priority: destination image, trust, planning CTA, sample itinerary, inquiry.

## 0.3. Checklist `ui-ux-pro-max` áp vào review

Các lỗi/tiêu chuẩn quan trọng nhất:

- `horizontal-scroll`: mobile không được có nội dung rộng hơn viewport.
- `touch-target-size`: nút/icon/menu tối thiểu `44x44px`.
- `touch-spacing`: khoảng cách touch target tối thiểu `8px`.
- `color-contrast`: text thường tối thiểu `4.5:1`.
- `keyboard-nav`: tab order theo visual order, nav/menu không tạo bẫy keyboard.
- `motion-sensitivity`: mọi motion/parallax phải respect `prefers-reduced-motion`.
- `primary-action`: mỗi screen chỉ có một CTA chính rõ ràng.

## 1. Đối chiếu với mong muốn khách hàng

Từ tài liệu tổng hợp nhu cầu và research vòng 2, khách hàng đang cần:

- một hệ multisite theo line business, không phải một website công ty chung;
- `wingsgo` là outbound retail, cần giá rõ, lịch rõ, duyệt tour nhanh;
- `wingsside` là inbound consultative, cần trust, destination storytelling, trip planning và inquiry;
- CMS phải thay thế dần cách vận hành phân mảnh bằng Google Sheets, Docs và poster;
- phase production phải đủ nội dung thật để public launch.

Kết luận đối chiếu:

- Content hiện tại đã đi đúng hướng theo sitemap và business role.
- UI hiện tại chưa đủ khác biệt giữa `wingsgo` và `wingsside`.
- Homepage hiện tại vẫn mang cảm giác template chung: hero tối, headline lớn, card chữ bên dưới.
- Những tín hiệu quyết định chuyển đổi của từng site chưa xuất hiện đủ sớm trong first viewport.

## 2. Review UI hiện tại

## 2.1. Điểm đang đúng

- Route và URL hierarchy đã hoạt động đúng cho homepage, market page và destination page.
- Header đã có navigation theo từng site, không dùng một menu chung.
- Nội dung `wingsgo` đã có đủ nhóm: market, schedule, campaign, tour detail, contact.
- Nội dung `wingsside` đã có đủ nhóm: destinations, styles, packages, travel guide, planning CTA.
- Trang dưới như `wingsgo/thi-truong/han-quoc` và `wingsside/destinations/ha-noi` đã bắt đầu dùng hình ảnh thật, tốt hơn homepage.

## 2.2. Vấn đề chung

### Hai site đang giống nhau quá nhiều

`wingsgo` và `wingsside` hiện cùng dùng:

- nền tối;
- hero center;
- headline lớn;
- CTA đôi;
- section card chữ;
- khoảng cách hero rất lớn.

Điều này đi ngược nguyên tắc đã chốt ở tài liệu `93`: mỗi site cần một interaction model riêng.

### First viewport chưa đủ business signal

Ở desktop, hero chiếm gần hết màn hình đầu. User thấy được định vị chung, nhưng chưa thấy:

- giá;
- lịch khởi hành;
- tour card;
- destination image grid;
- inquiry/planning panel;
- trust proof cụ thể.

Với `wingsgo`, đây là điểm yếu lớn vì khách hàng muốn public price và lịch rõ.

Với `wingsside`, đây là điểm yếu vì site inbound cần tạo trust bằng ảnh, tuyến điểm, cách plan và proof vận hành.

### Mobile navigation bị tràn ngang

Ở viewport mobile `390x844`, navigation desktop vẫn render thành một hàng ngang rộng hơn viewport:

- `wingsgo` nav rộng khoảng `459px` trên viewport `390px`;
- `wingsside` nav rộng khoảng `603px` trên viewport `390px`.

Đây là lỗi production-blocking vì traffic tour thường đến từ mobile/social/ad.

### Card chữ đang quá nhiều

Các section hiện có nhiều card chữ nhưng thiếu visual/product evidence:

- `wingsgo`: cần tour card có giá, ảnh, ngày gần nhất, hãng bay.
- `wingsside`: cần destination image, itinerary rhythm, trust/process, planner form.

Nếu giữ như hiện tại, UI dễ bị cảm giác "CMS demo" dù nội dung đúng.

## 3. Review riêng `wingsgo`

## 3.1. Hiện trạng

Trang chủ:

- headline đúng: `Chùm tour outbound giá rõ, lịch rõ`;
- CTA đúng hướng;
- nhưng giá/lịch nằm sâu sau hero và block giải thích;
- market cards và schedule tốt nhưng không xuất hiện trong first viewport;
- visual còn yếu vì homepage chưa dùng ảnh tour/poster/market làm anchor.

Trang `Tour Hàn Quốc`:

- có breadcrumb tốt;
- có ảnh poster Jeju thật;
- có schedule và tour lines;
- nhưng poster quá lớn, chiếm khoảng `1400px` chiều cao trước khi user thấy schedule;
- với retail page, poster nên hỗ trợ bán hàng, không được đẩy giá/lịch xuống quá sâu.

## 3.2. Thiết kế đề xuất cho `wingsgo`

Visual thesis:

`wingsgo` là một storefront outbound tươi, rõ giá, nhiều lựa chọn nhưng phải quét nhanh như một trang bán tour hiện đại.

Design system từ `ui-ux-pro-max`:

- Product base: `E-commerce` + `Travel/Tourism Agency`.
- Color: sky blue + adventure orange, ưu tiên nền sáng để price/schedule dễ đọc.
- Typography: `Rubik` cho heading, `Nunito Sans` cho body.
- Landing pattern: pricing-focused + feature-rich showcase + trust/conversion.

Interaction thesis:

- user chọn market hoặc lịch gần nhất ngay trong first viewport;
- hover/click vào tour card phải làm nổi giá, ngày đi và CTA;
- mobile ưu tiên sticky CTA `Xem lịch` và `Gửi yêu cầu`.

First viewport đề xuất:

```text
Header compact
  Logo | Market | Schedule | Campaign | Tour | Contact | Search
  Mobile: logo + search icon + menu button

Hero commerce band
  Left:
    WingsGo
    Chùm tour outbound giá rõ, lịch rõ
    Hàn Quốc, Nhật Bản, Trung Quốc và campaign theo mùa
    CTA: Xem lịch khởi hành
    CTA phụ: Xem tour theo thị trường

  Right:
    3 departure cards gần nhất
      Tour name
      Date
      Airline
      Price from
      CTA

Below fold hint:
  market tabs/cards visible immediately
```

Homepage order mới:

1. Hero commerce band + lịch gần nhất.
2. Market switch: Hàn Quốc, Nhật Bản, Trung Quốc.
3. Featured tour cards có ảnh, giá, hãng bay, ngày gần nhất.
4. Campaign theo mùa bằng image-led cards.
5. Bảng lịch khởi hành đầy đủ.
6. Trust row: visa, airline, HDV, insurance, local operator.
7. FAQ và inquiry strip.

Market page order mới:

1. Hero ngắn theo market.
2. Price/departure strip ngay dưới headline.
3. Tour line cards.
4. Campaign poster nhỏ hoặc gallery, không để poster chiếm toàn bộ flow.
5. Schedule table.
6. FAQ.
7. Inquiry CTA.

Tour detail page cần có:

```text
Tour summary header
  tên tour | thời lượng | market | hãng bay | giá từ | ngày gần nhất | CTA

Departure table

Highlights

Itinerary by day

Includes / excludes

Gallery / poster

FAQ

Inquiry
```

Design rules cho `wingsgo`:

- Không dùng hero full-height tối nếu không có sản phẩm thật trong viewport.
- Giá và ngày đi phải xuất hiện trước hoặc cùng lúc với hero CTA.
- Card tour không chỉ là card text; phải có image, price badge, duration, airline, departure.
- CTA chính dùng ngôn ngữ giao dịch: `Xem lịch`, `Giữ chỗ`, `Nhận tư vấn`.
- Mobile phải có menu gọn và CTA dễ bấm, không tràn nav.
- Không dùng style `Zero Interface`; `wingsgo` cần visible interface cho browse, compare và chọn lịch.

## 4. Review riêng `wingsside`

## 4.1. Hiện trạng

Trang chủ:

- nội dung đúng hướng inbound;
- có destinations, styles, packages, guide;
- nhưng visual vẫn giống `wingsgo`;
- thiếu ảnh destination trong homepage first screen;
- trust đang được nói bằng text, chưa được chứng minh bằng layout/process;
- CTA `Plan your trip` nằm trong hero nhưng chưa có planning surface cụ thể.

Trang `Ha Noi`:

- có ảnh destination lớn và cấu trúc destination page đúng;
- nhưng ảnh đứng một mình, chưa kết hợp với planner/itinerary signal;
- top experiences tốt nhưng còn giống card chữ.

## 4.2. Thiết kế đề xuất cho `wingsside`

Visual thesis:

`wingsside` là một inbound Vietnam planning site có cảm giác editorial, sáng, ảnh lớn, yên tĩnh và đáng tin.

Design system từ `ui-ux-pro-max`:

- Product base: `Travel/Tourism Agency` + `Road Trip Planner` + `Luxury/Premium Brand`.
- Color: editorial neutral hoặc hospitality navy/gold, không dùng palette hồng/tím mặc định từ search.
- Typography: `Playfair Display` cho headline editorial, `Inter` cho body/UI.
- Landing pattern: storytelling-driven + trust & authority + conversion.

Interaction thesis:

- user bắt đầu bằng điểm đến hoặc style;
- planner CTA luôn hiện như một hành động tư vấn nhẹ, không như ecommerce;
- scroll nên tạo cảm giác đọc một itinerary được curate, không phải lướt catalog.

First viewport đề xuất:

```text
Header compact
  Logo | Destinations | Travel Styles | Packages | Travel Guide | Plan Your Trip
  Mobile: logo + menu button + Plan CTA

Hero destination-led
  Full-width Vietnam image hoặc destination montage có crop sạch
  Text anchored left:
    WingSide
    Tailor-made Vietnam journeys
    Private, flexible, locally designed trips
    CTA: Plan your trip
    CTA phụ: Explore destinations

  Bottom overlay:
    mini planner strip
      Destination
      Travel style
      Duration
      CTA
```

Homepage order mới:

1. Full-bleed destination hero + mini planner strip.
2. Trust/process row: local design, flexible pacing, curated stays, on-trip support.
3. Destination image grid: Hanoi, Halong, Hoi An, Hue, Mekong.
4. Travel styles as editorial tiles: luxury, family, culture, adventure.
5. Sample itineraries with route map feel, not dense retail cards.
6. Testimonials/proof.
7. Travel guide preview.
8. Final planning CTA.

Destination page order mới:

1. Destination hero image + short positioning.
2. "Best for" and "Combine with" quick facts.
3. Top experiences with imagery.
4. Sample route modules.
5. Related packages.
6. Related travel guide.
7. Plan your trip CTA.

Design rules cho `wingsside`:

- Nên chuyển homepage sang nền sáng hoặc neutral editorial, không dùng cùng nền tối với `wingsgo`.
- Ảnh destination phải là signal đầu tiên, không chỉ xuất hiện ở detail page.
- Không show giá dày ở homepage; dùng inquiry/planning language.
- CTA chính dùng ngôn ngữ tư vấn: `Plan your trip`, `Start planning`, `Design my Vietnam trip`.
- Card ít hơn, ảnh nhiều hơn, copy ngắn hơn.
- Không dùng gradient mesh/aurora làm style chính; nếu dùng chỉ nên là lớp nhấn rất nhẹ để không ảnh hưởng contrast và cảm giác premium travel.

## 5. Thiết kế hệ thống chung cần sửa

## 5.1. Header responsive

Yêu cầu production:

- desktop: nav đủ rộng, không wrap xấu;
- tablet: rút gọn nav hoặc dùng priority menu;
- mobile: logo + menu button + search/CTA icon;
- không render desktop nav tràn ngang ở mobile.

## 5.2. Page builder cần thêm block phù hợp hơn

Các block hiện có đủ để dựng content, nhưng chưa đủ tạo interaction model riêng.

Nên bổ sung hoặc nâng cấp:

- `CommerceHero`: hero cho `wingsgo`, có lịch/giá nổi bật.
- `MarketTabs`: market switch có tour count/price from.
- `TourCardGrid`: card có image, duration, airline, price, departure, CTA.
- `PlannerHero`: hero cho `wingsside`, có mini planner.
- `DestinationMosaic`: image-led destination grid.
- `ItineraryTimeline`: ngày 1, ngày 2, ngày 3 cho tour/detail hoặc sample package.
- `TrustProcess`: process/trust proof theo site.

## 5.3. Visual assets

Ưu tiên dùng ảnh thật từ khách hàng:

- poster/tour creative dùng cho campaign và tour cards;
- ảnh destination thật cho `wingsside`;
- không dùng ảnh chỉ làm nền tối mơ hồ;
- poster không nên chiếm quá nhiều chiều cao nếu mục tiêu chính là xem giá/lịch.

## 6. Backlog thiết kế ưu tiên

1. Sửa responsive header để hết tràn mobile.
2. Thiết kế lại `wingsgo` homepage theo commerce-first first viewport.
3. Thiết kế lại `wingsgo` market page để giá/lịch xuất hiện trước poster lớn.
4. Thiết kế lại `wingsside` homepage theo destination-led editorial.
5. Thiết kế lại `wingsside` destination page với quick facts, combine-with và planning CTA.
6. Chuẩn hóa tour card, destination tile và schedule row thành components/blocks tái sử dụng.
7. Preview lại desktop/mobile trước khi chuyển sang `wingspass` và `wingsplus`.

## 7. Kết luận

Trạng thái hiện tại đã đúng ở tầng kiến trúc, routing và content skeleton, nhưng chưa đạt production UI.

Điểm cần sửa không phải chỉ là màu sắc. Cần đổi interaction model:

- `wingsgo`: từ hero marketing chung sang commerce-first tour storefront.
- `wingsside`: từ hero text chung sang destination-led planning experience.

Khi hai site này khác nhau rõ ở first viewport, các site sau sẽ dễ đi đúng hướng hơn:

- `wingspass`: utility pricing-first.
- `wingsplus`: premium proposal-first.
