# Tham vấn Codex — US-081, US-082, US-083

Ngày: 2026-10-19. Đây là đề xuất kiến trúc và phân rã US, chưa phải quyết định triển khai.
Chỉ thêm biên bản trong thư mục mới; không đổi app, story, Harness proof, manifest hoặc Plane.

## 1. Kết luận và giả định cần sửa

Giữ ba US độc lập; ưu tiên US-082 trước. Kiến trúc Payload-first hiện tại đủ đáp ứng.
US-081 cần migration bổ sung nếu quản trị hotline qua CMS. US-082/083 không cần đổi schema theo phương án dưới đây.

Đối chiếu source local:
- ArchiveBlock/Component.tsx:51 thiếu locale; nhánh selectedDocs dùng object được populate sẵn.
- Form/Component.tsx:545 GET không truyền locale, effect chỉ phụ thuộc isWingsGroupV3; POST:630 cũng không truyền locale.
- lead-submissions/route.ts:578 GET lấy getCurrentLocale; POST cũng dùng currentLocale để lưu governance.
- siteContext.ts:172 lấy locale từ trusted x-locale rồi defaultLocale. Proxy.ts:299 lấy locale từ pathname. Thêm query locale không tự đổi context.
- SiteSettings.ts:287 có supportPhone text; đã có hook invalidate settings.
- WingsGoTourCard.tsx:33 ĐÃ render badge từ nextDeparture.promoLabel.
- StructuredPages.tsx:3510 ĐÃ render promoLabel; TourDepartureMatrix.tsx:264/315 ĐÃ có giá gạch ngang.
- TourCurations.ts KHÔNG có promoLabel: có site, name, isDefault, featuredTours, description.
- wingsGoCatalog.ts:35 DTO chưa có originalPrice. BuildCard chọn commercialDeparture; :254 vẫn đưa promoLabel vào DTO kể cả khi giá là contact.
- queries.ts:239 normalizeDepartureCard đã chặn originalPrice/promoLabel khi freshness hết hiệu lực.
- revalidateTourContent.ts:13/247/297 hook departure chưa phủ homepage.
- sharedCache.ts có memory trong process và Redis; TTL mặc định 60 giây, cấu hình 5–300 giây.

Các kết luận trên là review source local; chưa đối chiếu revision và dữ liệu production.

## 2. Rủi ro theo mức ưu tiên

P1 là điều kiện chặn phát hành; P2 phải xử lý trong US; P3 là hoàn thiện UX/vận hành.
Không diễn giải rủi ro triển khai thành sự cố production đã được xác nhận.

| Mức | Finding / rủi ro | Hướng xử lý |
| --- | --- | --- |
| P1 | Archive Local API chưa khai báo public access/published filter. Payload 3.84.1 mặc định overrideAccess=true. | Fixture draft-only để kiểm; giữ site + published và public access. Preview cần xác thực riêng. Chưa chứng minh production lộ draft. |
| P1 | Ghép giá gốc của departure A với giá bán/date của B. | Giá gốc, giá bán, currency, priceBasis, variant và badge định lượng phải cùng departure. |
| P1 | Ưu đãi hiện khi expired, sold-out hoặc không có giá hợp lệ. | Chặn projection thương mại; ẩn del và badge giảm, chuyển liên hệ/trạng thái kín chỗ. Giữ chính sách legacy hiện có cho record không có freshness metadata. |
| P2 | Sửa GET consent EN nhưng POST vẫn lưu locale VI. | Resolver locale thống nhất GET/POST; site vẫn từ trusted host; giữ governance validation. |
| P2 | Chuyển locale nhưng config/consent hoặc response cũ còn giữ. | Refetch theo locale, reset consent/config, bỏ response về muộn, chặn submit khi đang nạp. |
| P2 | Chỉ sửa Archive collection query bỏ sót selectedDocs, category và meta.description. | Kiểm cả hai nhánh, relationship, thứ tự chọn tay và policy thiếu bản dịch. |
| P2 | Đổi supportPhone text thành array phá callers/API/SEO. | Giữ field cũ; bổ sung field và backfill chỉ WingsGo, không ghi đè dữ liệu đã chỉnh. |
| P2 | Invalidate Redis không xóa memory ở process khác; cập nhật departure chưa revalidate home. | Kiểm toàn chuỗi home/catalog/detail, nhiều process và validity khi thời gian trôi qua mà không có save. |
| P3 | Hai request cùng đặt default curation. Hook hiện find rồi update, chưa có unique constraint. | Resolver chọn ổn định/báo dữ liệu bất thường; không đổi cơ chế default trong US-083 nếu không cần. |
| P3 | Hotline/badge dài, menu vỡ, keyboard khó dùng. | Responsive, focus/Escape/click ngoài, giới hạn nhãn và ưu tiên trạng thái kín chỗ. |

## 3. US-081 — Chọn hotline tư vấn WingsGo

**User story:** Là khách WingsGo, tôi chọn một trong ba hotline để gọi hoặc mở Zalo đã được xác minh.

### Thiết kế tối thiểu

Giữ supportPhone làm số chính; thêm additionalHotlines array chứa phone và zaloUrl tùy chọn.
Phone không localized. Một resolver dùng chung chuẩn hóa, loại trùng và sinh danh sách/tel URL.
Giữ supportPhone cho structuredData.ts, llms.ts và callers/API cũ.

Backfill WingsGo: chính 0912910101; thêm 0915250101, 0915260101.
Fallback config chỉ là lựa chọn nếu ba số cố định và chưa cần CMS; phải giới hạn site wings-go.
Không để fallback ghi đè danh sách đã chỉnh trong CMS.

Zalo không suy ra là hoạt động chỉ từ số điện thoại. Chỉ hiển thị liên kết được chủ dự án xác minh.
Giữ Zalo OA hiện có theo mục đích, không tự thay bằng tài khoản cá nhân.

### Công việc con

1. Schema additive, validation, generated types và migration/backfill PostgreSQL có thể chạy lại.
2. Resolver và truyền dữ liệu qua server → HeaderClient/Nav, Footer, FAB, consultation dialog.
3. Rà thêm CTA hotline ở StructuredPages và các consumers tìm được.
4. Test resolver/UI, DB cũ và tenant khác.

### Tiêu chí nghiệm thu

- Desktop giữ số chính gọi trực tiếp, nút riêng mở hai số phụ, không đẩy menu.
- Mobile drawer, Footer, FAB và modal liệt kê đủ ba số cùng thứ tự.
- Gọi đúng số; Zalo đúng tài khoản xác minh; không ghép nhiều số trong một tel URL.
- Settings cũ chỉ có supportPhone vẫn chạy; tenant khác không nhận hotline WingsGo.
- Chuẩn hóa để số 0 đầu, +84 và dấu cách không tạo số trùng/sai; không parse số điện thoại thành number.
- CMS save cập nhật các bề mặt trong thời gian cache đã chốt; kiểm hai process nếu production dùng nhiều process.

**Risk lane:** high-risk khi có migration. Add schema trước khi app đọc field mới; rollback app giữ field additive, không drop dữ liệu mới.

## 4. US-082 — Hiển thị đúng tiếng Anh trên WingsGroup

**User story:** Là khách /en, tôi đọc bài, consent và chính sách bằng EN; lead ghi nhận đúng ngôn ngữ đã hiển thị.

### Thiết kế tối thiểu

Archive truyền getCurrentLocale vào payload.find, giữ site constraint và public boundary.
selectedDocs phải được populate đúng locale từ query trang.
Nếu cần rehydrate, query hàng loạt theo ID + site + published và khôi phục thứ tự; tránh N+1.
Card đọc trích dẫn từ meta.description, category từ categories.title.

GET và POST Form dùng locale explicit qua query, cùng resolver vi/en có allowlist tại route.
Không đổi getCurrentLocale toàn hệ để chữa riêng endpoint này.
Không cho query/header của browser thay tenant; tiếp tục trusted site context.
Request không có locale giữ hành vi cũ; giá trị locale không hợp lệ trả 400.
Effect phụ thuộc locale, giữ AbortController, bảo vệ response cũ và reset consent khi locale/config/version thay đổi.
Giữ no-store và validation consent/version hiện có.

Payload hiện fallback=true. locale=en vẫn có thể trả VI khi field EN thiếu.
Đề xuất English archive chỉ render bài có đủ field EN bắt buộc theo policy biên tập.
Không đổi fallback toàn hệ. Nếu dùng fallbackLocale:false riêng query, xử lý null và không để card rỗng.
Không đổi consent copy/version khi chỉ sửa cách chọn bản dịch đã có.

### Công việc con

1. Archive locale, selectedDocs, related category/meta và published/site boundary.
2. Form GET/POST, route resolver, lifecycle config/consent và submit.
3. Regression VI/EN, fixture dịch thiếu, public/preview và stored lead governance.

### Tiêu chí nghiệm thu

- Collection và selectedDocs hiển thị title/category/meta.description EN; link bài giữ /en.
- GET trả consentCopy/policyHref EN; POST ghi governance.locale=en tương ứng.
- VI, request legacy thiếu locale và tenant khác vẫn đúng.
- Chuyển vi → en khi GET vi pending không thể đưa config vi trở lại.
- Consent reset khi đổi ngôn ngữ/config; config lỗi không cho submit, dữ liệu người dùng không bị mất.
- Fixture khác tenant/draft-only không xuất hiện; không mở preview bằng locale query.
- Kiểm cả fresh load và client navigation, không chỉ kiểm JSON endpoint.

**Risk lane:** high-risk vì public authorization và consent/governance. Không cần migration.

## 5. US-083 — Hiển thị ưu đãi nhất quán trên Tour Card WingsGo

**User story:** Là khách WingsGo, tôi thấy giá/ưu đãi gắn đúng đợt khởi hành và mở đúng tour để tìm hiểu.

### Thiết kế tối thiểu

Tái sử dụng TourDepartures.originalPrice/promoLabel và TourCurations.featuredTours/thứ tự hiện có.
Curation chọn tour/vị trí; departure quyết định điều kiện thương mại.
Chưa cần field promoLabel trên curation. Nhãn cả bộ khác với mức giảm của từng đợt đi.

Thêm originalPrice optional vào nhánh price.kind=verified của WingsGoCatalogCard.
Giữ các field/API cũ; cập nhật InventoryDeparture, mapper, endpoint JSON, fixtures, simulator và consumers.
Chia sẻ quy tắc projection nhỏ, không xây hệ campaign/coupon mới.

Chỉ render del khi originalPrice và priceFrom hữu hạn, originalPrice > priceFrom > 0,
cùng currency, basis và variant.
Số giảm = originalPrice - priceFrom.
% giảm = 100 * (originalPrice - priceFrom) / originalPrice; nếu hiển thị số nguyên, làm tròn xuống và ẩn 0%.
Không parse số tiền/% từ promoLabel tự do.
Ưu tiên promoLabel hợp lệ của departure; nếu trống mới sinh badge từ giá.
Badge biên tập không được che badge ưu đãi hoặc tình trạng kín chỗ.

Giữ thuật toán chọn departure hiện hành nếu chưa có yêu cầu đổi.
Nếu chọn departure khuyến mãi khác để làm nổi bật, date/price/badge phải cùng đổi theo nó.
Không đổi thành min-price rồi tiếp tục gọi đó là lịch gần nhất.
Promotion kế thừa validity của departure khi chưa có thời hạn riêng; campaign hết hạn độc lập là scope bổ sung.
Hết hiệu lực theo thời gian cần projection/cache policy, vì không có afterChange hook tự chạy lúc expiresAt.

### Công việc con

1. Projection giá/ưu đãi, DTO optional và negative tests.
2. WingsGoTourCard, Homepage spotlight, StructuredPages.DepartureStrip theo cùng rule.
3. Curation console/simulator dùng projection thực, giữ max 6, thứ tự và fallback hiện tại.
4. Revalidation save/unpublish/delete của departure/product/curation và kiểm hết hạn.

### Tiêu chí nghiệm thu

- 12 triệu → 10 triệu: del 12 triệu, giá bán 10 triệu, badge đúng; không đổi giá trong DB.
- Original null/0/bằng/thấp hơn sale, NaN hoặc contact không tạo giảm giá.
- Expired, future verifiedAt, sold-out, unpublished hoặc cross-site không tạo offer hợp lệ.
- Hai departure có date/price/promo khác nhau không bị trộn.
- Curation giữ thứ tự, không làm tour không đủ điều kiện trở thành offer.
- Home, catalog lần đầu/load-more, detail và simulator nhất quán.
- Kiểm ngay trước/sau expiresAt không có save; VI/EN, nhãn dài, mobile và mức giảm rất nhỏ.
- Giữ giá gốc/giá bán trên cùng cơ sở mỗi khách hoặc mỗi booking, không so sánh chéo.

**Risk lane:** normal với kiểm chứng mạnh; nâng high-risk nếu đổi schema, currency/basis hoặc policy thương mại. Phương án này không cần migration.

## 6. Mapping và tương thích

- US-081/083: đề xuất WingsGo/E07; kế thừa khả năng curation của US-078.
- US-082: Core, module Localization; chọn Epic theo hợp đồng hiện hữu.
- Mã US chưa thấy trong tracking local; chưa kiểm trùng ID trên Plane.
- Không tự gán owner, ngày hoặc trạng thái triển khai.
- Khi chính thức tạo stories/manifest/proof, sync Plane theo skill và review trước release.
- Ba US độc lập; khi thực thi nhiều module song song phải áp dụng quy tắc subagent của repo.
- So sánh phương án hotline: config riêng nhanh nhất nhưng không quản trị CMS; thêm array bổ sung giữ field cũ là lựa chọn đề xuất; đổi text thành array trực tiếp bị loại vì phá tương thích.
- PostgreSQL là gate migration; SQLite bootstrap không đủ chứng minh production migration.
- Invalidate cache theo site + locale, bao phủ alias/canonical route thực tế; không coi revalidatePath đã xóa mọi lớp Redis/memory/CDN.
- Memory process khác có thể tồn tại tới TTL; nếu cần cập nhật tức thì phải có cơ chế đồng bộ tương ứng.

## 7. Kiểm chứng và giới hạn

Lệnh từ app/:

pnpm run test:unit -- tests/unit/wingsGoCatalog.unit.spec.ts tests/unit/wingsGoTourCuration.unit.spec.ts tests/unit/wingsGoCatalogRevalidation.unit.spec.ts tests/unit/wingsGroupLeadGovernance.unit.spec.ts tests/unit/sharedCache.unit.spec.ts

Kết quả thật: exit 0; 5 test files passed, 48 tests passed; Start 10:24:05, Duration 20.80s.
Đây là baseline hiện có, không phải nghiệm thu ba yêu cầu mới.

Đã chạy CodeGraph explore và scripts/harness.ps1 query matrix.
Không thay stories/tracking nên không chạy Plane sync trong tham vấn này.
Chưa chạy browser/DB production, migration rehearsal hoặc test behavior mới; chưa sửa app.
P1 public draft là finding source cần runtime fixture để xác nhận mức ảnh hưởng, không phải kết luận đã có sự cố.

Tài liệu chính thức đã đối chiếu:
- Payload v3.84.1 docs/local-api/overview.mdx: locale/fallbackLocale và overrideAccess=true.
- Payload v3.84.1 docs/configuration/localization.mdx: fallback khi field dịch thiếu.
- Payload Documentation / Database / Migrations.
- Next.js Documentation / revalidatePath.

