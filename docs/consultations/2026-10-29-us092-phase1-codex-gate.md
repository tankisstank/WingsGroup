`# Codex Gate Review — US-092 Phase 0 + Phase 1
`
`**Ngày review:** 2026-10-29
`**Branch:** \`feat/us-092-tour-catalog-v2\`
`**Baseline:** \`8980e23\`
`**Commits đã audit:** \`59fcbbb\`, \`abaa7ab\`, \`853e0bc\`, \`4092af3\`
`
`## Phạm vi và cách kiểm tra
`
`Đã đọc prompt review, \`AGENTS.md\`, README, Harness/architecture docs, story packet US-092 (\`overview.md\`, \`design.md\`, \`execplan.md\`, \`validation.md\`, \`phase0-report.md\`, \`phase0-date-audit.md\`, \`phase1-report.md\`) và các module runtime/test được chỉ định.
`
`Đã audit locale VI/EN, lịch \`Asia/Ho_Chi_Minh\`, season, departure window, \`daysUntilDeparture\`, curation/site isolation, featured/all semantics, market summaries, deterministic image, dynamic/no-store, homepage regression, stale reads, cache invalidation, pagination/race, DTO compatibility và migration safety.
`
`## P1 — Chặn Phase 1
`
`### P1.1 — Offset pagination không giữ cùng snapshot giữa các request
`
`**File:** \`app/src/tours/wingsGoCatalog.ts:739-745\`, \`app/src/tours/WingsGoTourCatalogClient.tsx:116-147\`, \`app/src/app/(payload)/api/wingsgo/tour-catalog/route.ts:89-100\`
`
`**Kịch bản lỗi:** Request đầu trả \`all\` với inventory, curation và eligibility tại \`now_1\`, rồi trả \`nextOffset=6\`. Trước khi tải thêm, editor đổi curation hoặc departure hết hạn/sold-out. Request sau đọc lại inventory, dựng lại thứ tự và áp \`offset=6\`. Card ở vị trí thứ 6 của snapshot đầu có thể bị dịch hoặc bị loại nên bị bỏ qua. Client dedupe theo \`id\` chỉ loại trùng, không khôi phục card bị offset bỏ sót.
`
`Đây là lỗi public contract trực tiếp ở AC2. AbortController/generation guard chỉ xử lý race ở client, không giữ ổn định dữ liệu giữa hai HTTP request.
`
`**Đề xuất sửa:** chuyển API tải thêm sang cursor/snapshot token. Response đầu tạo token bất biến chứa hoặc trỏ tới thứ tự card đã lọc, \`featuredIDs\`, filter canonical và \`now\`; request sau gửi token + cursor. Với inventory tối đa 200, có thể lưu snapshot bounded trong Redis với TTL ngắn; token phải gắn site + locale + filter. Khi snapshot hết hạn, yêu cầu tải lại từ đầu. Thêm integration test đổi curation/eligibility giữa request đầu và tải thêm, bảo đảm không mất và không lặp card.
`
`## P2 — Phải xử lý trong story
`
`### P2.1 — Ảnh market chưa deterministic hoàn toàn nếu thứ tự Payload thay đổi
`
`**File:** \`app/src/tours/wingsGoCatalog.ts:540-554\`, \`app/src/tours/wingsGoCatalog.ts:748-752\`
`
`Seed ổn định nhưng \`cardsInMarket\` giữ thứ tự query Payload. Cùng inventory và seed, thứ tự khác giữa replica/query plan có thể chọn ảnh khác.
`
`**Đề xuất:** sort candidates theo khóa ổn định, tối thiểu \`String(card.id)\` rồi \`url\`, trước khi lấy modulo; thêm test với cùng cards nhưng input order khác nhau.
`
`### P2.2 — Snapshot nội bộ không phải một DB read snapshot/transaction
`
`**File:** \`app/src/tours/wingsGoCatalog.ts:618-672\`
`
`Một query thực hiện ba lần đọc tuần tự: wrapper pages, products, departures. Nếu editor thay đổi product/departure giữa các lần đọc, DTO có thể ghép các trạng thái khác nhau.
`
`**Đề xuất:** dùng transaction/read snapshot nếu adapter production hỗ trợ; nếu không, dùng snapshot token ở P1.1 và ghi rõ giới hạn consistency trong validation.
`
`### P2.3 — Quy tắc enable của SSR và API không đồng nhất
`
`**Files:** \`app/src/app/(frontend)/cmsPage.tsx:145-149\`, \`app/src/tours/wingsGoCatalog.ts:603-607\`, \`app/src/app/(payload)/api/wingsgo/tour-catalog/route.ts:85-87\`
`
`SSR/API chỉ hiển thị khi \`enabled === true\`, nhưng \`queryWingsGoTourCatalog\` vẫn cho phép page \`/tour\` khi enabled false. Caller trực tiếp như \`getWingsGoFeaturedTours\` có thể nhận catalog trong trạng thái mà public page/API coi là disabled.
`
`**Đề xuất:** chốt một policy duy nhất và thêm test enabled=false cho cả ba đường gọi.
`
`### P2.4 — Phase 0 chưa chốt nhánh date audit cho trang detail
`
`**File:** \`app/src/tours/utils.ts:groupDeparturesByMonth\`; đối chiếu \`phase0-date-audit.md\` và \`design.md:67-70\`.
`
`Audit SQLite cục bộ có 0 discrepancy và 164 row ở \`00:00:00Z\`, nhưng chưa có bằng chứng staging/production. \`groupDeparturesByMonth\` dùng chung cho WingSide và các site khác nên không thể suy luận dữ liệu thật từ local DB.
`
`**Đề xuất:** chạy truy vấn PostgreSQL read-only đã ghi trong \`phase0-date-audit.md\`. Nếu vẫn 0, chuyển sang helper business calendar và thêm snapshot WingSide; nếu khác 0, giữ detail page và tạo decision/story riêng.
`
`## P3 — Khuyến nghị
`
`### P3.1 — DTO data mới là required
`
`**File:** \`app/src/tours/wingsGoCatalog.ts:93-101\`
`
`\`filtersActive\`, \`markets\`, \`upcoming\` là required. JSON consumer cũ vẫn đọc được response additive, nhưng fixture/caller TypeScript tạo DTO cũ sẽ không compile.
`
`**Đề xuất:** giữ required nếu đó là contract v2; nếu cần source compatibility, dùng adapter/factory hoặc optional fields có default ở boundary. Không cần migration.
`
`### P3.2 — Homepage vẫn có hai lần resolve curation
`
`**File:** \`app/src/tours/wingsGoCatalog.ts:896-925\`
`
`\`getWingsGoFeaturedTours\` gọi query rồi lại gọi \`resolveCuratedTourIDs\`. Curation đổi giữa hai read có thể làm thứ tự homepage lệch khỏi snapshot vừa query. Nên gom resolver vào cùng request snapshot.
`
`### P3.3 — Warning cap không phải bằng chứng inventory đầy đủ
`
`**File:** \`app/src/tours/wingsGoCatalog.ts:610-615\`
`
`Khi đạt 200 docs, code log warning rồi tiếp tục với tập bị cắt. Đây đúng với bounded inventory đã chốt, nhưng nên có metric/alert hoặc validation rõ để operator biết catalog có thể thiếu tour.
`
`## Những điểm đã kiểm chứng đạt
`
`- Locale đi từ \`cmsPage.tsx\` → section → query; API whitelist \`vi|en\`.
`- EN query dùng \`fallbackLocale: false\`, không tự rơi về tiếng Việt.
`- Copy client và nhãn giá liên hệ có bảng VI/EN.
`- Calendar VN, season, cửa sổ \`departureMonth AND season\`, giá trong cửa sổ và \`daysUntilDeparture\` có code/test.
`- Wrapper, product, departure và Tier-1 curation đều có site guard; có test cross-site và curation thiếu/different site.
`- Catch-all page vẫn \`dynamic = 'force-dynamic'\`; API giữ \`Cache-Control: no-store\`.
`- Homepage vẫn dùng \`getWingsGoFeaturedTours\` và có regression test.
`- Không thêm hero registry key, collection, schema hay migration.
`
`## Bằng chứng lệnh chạy
`
`- Targeted unit: \`pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/businessCalendar.unit.spec.ts tests/unit/cmsPageRouteGuard.unit.spec.ts tests/unit/wingsGoCatalog.unit.spec.ts tests/unit/wingsGoTourCatalogEndpoint.unit.spec.ts tests/unit/wingsGoTourCuration.unit.spec.ts\`
`  Kết quả mới: **5 files passed, 92 tests passed**.
`- Targeted component: \`pnpm exec vitest run --config ./vitest.component.config.mts tests/component/wingsGoTourCatalog.component.spec.tsx\`
`  Kết quả mới: **1 file passed, 7 tests passed**.
`- ESLint các file thay đổi: exit **0**, 0 errors; **33 warnings** \`no-explicit-any\` trong test.
`- \`pnpm exec tsc --noEmit\`: exit **1** do 2 lỗi ngoài phạm vi tại \`tests/unit/wingsGroupCorporateRoutes.unit.spec.ts:116,155\`.
`- \`git diff --check 8980e23..HEAD\`: exit **1** do trailing whitespace trong \`phase0-date-audit.md\`.
`- \`scripts/harness query matrix\`: không chạy được vì thiếu \`scripts/bin/harness-cli.exe\`.
`- Chưa chạy browser/E2E, build, integration test hoặc truy vấn staging/production; không truy cập hệ thống remote.
`
`## Kết luận
`
`Phase 0 có nền locale/calendar/site guard tốt và Phase 1 có test unit/component đáng kể. Tuy nhiên pagination offset không bảo toàn snapshot giữa request và có thể làm mất card sau thay đổi curation/eligibility; đây là rủi ro public contract trực tiếp.
`
`VERDICT: NO-GO
`
