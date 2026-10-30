# Codex review — US-093 Phase 1A (2026-10-30)

**VERDICT: GO có điều kiện.** DTO, query snapshot, scope site, D11 và mốc lịch VN đã đủ nền cho Phase 1B/2/3. Chưa nên chốt Phase 1A hoàn toàn cho tới khi xử lý các finding P2 dưới đây. HEAD hiện có thêm commit `158e663` (Phase 1B); các nhận xét về helper/lead được đánh dấu theo code hiện hành, không coi đó là bằng chứng của riêng 1A.

## 1. Đối chiếu hợp đồng DTO

`app/src/tours/wingsGoSchedule.ts:35-135` khớp mục DTO trong `design.md`: row dùng `tourId`, ngày/tháng theo lịch VN, availability bốn trạng thái, giá của đúng departure, `canHoldSeat`, CTA đã dựng sẵn, stats, months, market/airline facets và `initialFilters`. `WingsGoScheduleTour` tách media/badge ra bảng `tours`, đúng yêu cầu giảm lặp. Các type phụ (`ScheduleFacetCounts`, `WingsGoScheduleTourGroup`) là phần mở rộng cho Phase 1B, không phá hợp đồng.

Đã kiểm tra `buildScheduleRow` (`wingsGoSchedule.ts:564-683`): `price.original` chỉ được giữ khi promotion hợp lệ; sold-out không được khôi phục promo; `ctaHref` lấy `departureDay` VN; `canHoldSeat` dùng cùng `now` của snapshot. Chưa thấy field bắt buộc nào thiếu đến mức chặn Phase sau.

## 2. Snapshot và scope

`getWingsGoScheduleSnapshot` (`wingsGoSchedule.ts:734-1068`) đã:

- query public theo published + từ đầu ngày `Asia/Ho_Chi_Minh`, phân trang 250, sort ngày + id, dedupe id;
- kiểm product là object, cùng site và published; media khác site hoặc thiếu site thành `null`;
- đọc EN strict, fallback title VI có scope site + published, badge vẫn lấy EN strict;
- loại row quá khứ trong snapshot; không dùng fallback lịch cũ;
- truyền cùng `now` vào verification, ngày VN và CTA.

Giới hạn còn lại: phân trang không phải transaction snapshot DB nguyên tử; kế hoạch đã ghi đúng giới hạn này. `getResolvedScheduleData` vẫn giữ fallback cũ theo hợp đồng “caller cũ giữ nguyên hành vi”, nên không được dùng test đó làm bằng chứng cho snapshot mới.

## 3. Thay đổi dùng chung và hồi quy

`queryCollection` mở rộng tham số nhưng giữ mặc định `pagination: false` và các caller cũ không truyền option mới (`queries.ts:69-115`). `normalizeDepartureCard` truyền `locale` tới mapper và `now` chỉ khi caller mới cần; các caller detail/market/campaign/homepage vẫn dùng chữ ký tương thích (`queries.ts:265-317, 377-404, 589-703`).

Rủi ro chính là mapper chung nay thêm `editorialBadges`/`hasHot` vào mọi `tourProduct` (`queries.ts:120-145, 293-315`). Không thấy field cũ bị xoá, nhưng chưa có regression assertion cho output/serialization của detail, market, campaign, homepage và WingSide. Đây là P2 test gap, không phải bằng chứng đã hồi quy.

## 4. Findings mới

### P2.1 — Nhãn `other` vẫn sai quyết định stakeholder

`app/src/tours/wingsGoSchedule.ts:997-1004` ưu tiên `WINGSGO_MARKET_LABELS[value]` trước `copy.marketOther`. Với `value === 'other'`, code vẫn trả `Tuyến khác` / `Other destinations` từ bảng dùng chung; nhãn VI phải là `Thị trường khác` theo Q2.

**Sửa:** tại mapping schedule dùng `value === 'other' ? copy.marketOther : WINGSGO_MARKET_LABELS[value]?.[locale] || copy.marketOther`; thêm integration/unit assertion cho cả VI và EN, đồng thời giữ nguyên `/tour`.

### P2.2 — `verifiedDay` loại mất đợt đã xác minh nhưng đang `quote`

`app/src/tours/wingsGoSchedule.ts:962-969` chỉ cập nhật `maxVerifiedAt` khi `row.canHoldSeat || row.availability !== 'quote'`. Một departure có verification hiện hành nhưng thiếu giá hợp lệ được phân loại `quote`, nên bị loại khỏi “Cập nhật”; điều này lệch `design.md` mục Số liệu hero (verifiedAt lớn nhất của đợt đang xác minh).

**Sửa:** tính `isDepartureVerificationCurrent(doc, now.getTime())` độc lập trong vòng dựng rows và cập nhật `maxVerifiedAt` cho mọi doc verified hiện hành; không suy từ availability. Thêm fixture verified + thiếu giá và verified + sold-out.

### P2.3 — Integration thật chưa chứng minh dedupe và pagination đủ chặt

`app/tests/int/wingsGoScheduleIntegration.int.spec.ts:119-175` tạo 260 bản ghi unique và chỉ assert `rows.length >= 260`; không assert đúng 260, unique id, hoặc Payload thực sự đã đi qua page 2. Dedupe chỉ được chứng minh trong mock test (`tests/unit/wingsGoScheduleSnapshotMocked.unit.spec.ts:25-112`), nơi `find` đã được lập trình sẵn trả hai page có overlap.

**Sửa:** integration thật assert đúng số fixture, tập id unique và thứ tự; ghi/kiểm tra số lần gọi page hoặc thêm adapter test nhỏ cho hai page overlap. Mock vẫn giữ để kiểm tra loop dedupe, nhưng không ghi nó là integration evidence.

### P2.4 — Thiếu cổng fail-closed và contract row quan trọng

`design.md:32` yêu cầu `now` không hợp lệ trả snapshot rỗng và log; `wingsGoSchedule.ts:745-773` có nhánh này nhưng chưa có test. Cũng chưa có assertion đủ mạnh rằng `buildScheduleRow` tạo CTA ngày VN và `intent` đúng theo `canHoldSeat`; test hiện chỉ kiểm `departureId` (`tests/unit/wingsGoScheduleSnapshot.unit.spec.ts:302-337`).

**Sửa:** thêm test `now` invalid/no site không query dữ liệu; thêm fixture `17:00Z` kiểm `departureDate=YYYY-MM-DD` VN, `hold-seat` khi đủ điều kiện và `inquiry` khi quote/sold-out/expired.

### P3.1 — Media URL mới chỉ kiểm tra non-empty

`extractTourMedia` (`wingsGoSchedule.ts:512-523`) kiểm site và chuỗi URL khác rỗng, nhưng chưa trim/chuẩn hóa URL như các projection media hiện có. Đây chưa phải lỗ hổng cross-site vì relation đã kiểm site, nhưng chưa chứng minh đầy đủ điều kiện “URL hợp lệ” trong `design.md:6-8`.

**Sửa:** dùng helper chuẩn hóa media URL hiện có hoặc chốt rõ URL Payload path/HTTPS được phép; thêm test whitespace, URL malformed và path `/media/...`.

## 5. Chất lượng test và bằng chứng

Không thấy test stats tự kiểm bằng cách gọi lại implementation trong các test Phase 1A; `computeScheduleStats`, `buildScheduleMonths`, `buildScheduleRow` được gọi trực tiếp. Tuy nhiên test mocked pagination không thay thế integration thật, và test real hiện chưa đủ assertion dedupe như P2.3.

Đã chạy trong `app/`:

- `pnpm run test:unit -- tests/unit/wingsGoScheduleSnapshot.unit.spec.ts tests/unit/wingsGoScheduleSnapshotMocked.unit.spec.ts tests/unit/wingsGoScheduleHelpers.unit.spec.ts` — **3 files, 39 tests pass**.
- `node scripts/run-integration-tests.mjs tests/int/wingsGoScheduleIntegration.int.spec.ts` — **1 file, 5 tests pass**; Payload SQLite thật, có cảnh báo email adapter không cấu hình.
- `pnpm exec vitest run tests/int/wingsGoLeadCompatibility.int.spec.ts --config ./vitest.config.mts` — **không đạt cổng môi trường**: `missing secret key`, 6 test bị skip; không dùng kết quả này để chứng minh D6.
- `git diff --check 56a6c26..HEAD -- app` — không có lỗi whitespace.

Theo `phase1a-report.md`, lint exit 0, component 422/422 pass, unit toàn repo còn đúng một failure baseline và TypeScript còn đúng hai lỗi baseline. Chưa tự coi các cổng đó là pass mới trong vòng review này.

## 6. Kết luận

Cho phép sang bước tiếp theo sau khi cập nhật kế hoạch/test cho P2.1–P2.4. Không có P1 mới. Trước Phase 2 cần giữ nguyên DTO hoặc ghi decision record nếu đổi; trước đóng Story cần chạy lại integration với database sạch, test regression các caller dùng chung và cổng lead với `PAYLOAD_SECRET` hợp lệ.

US093_1A_REVIEW_DONE
