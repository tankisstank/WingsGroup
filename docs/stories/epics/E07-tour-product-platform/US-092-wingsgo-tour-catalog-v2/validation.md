# Validation — US-092

## Chiến lược bằng chứng

Story chỉ đóng khi mỗi phase có bằng chứng từ code, test và trình duyệt, kèm release review của Codex. Đây là khung validation ở giai đoạn lập kế hoạch; chưa có bằng chứng implementation.

## Tham vấn kiến trúc

### Review kiến trúc độc lập (Claude) — 2026-10-29

Đây là bản review kế hoạch do Claude thực hiện, **không thay thế** cổng tham vấn Codex trong AGENTS.md. Toàn bộ finding đã được đưa vào `design.md` và `execplan.md`.

| Mức | Finding | Xử lý |
|---|---|---|
| P1 | Locale bị rò: section, API và DTO/client mặc định `vi` | Phase 0; mục "Locale" trong design |
| P1 | Thêm key vào hero registry kéo theo migration enum | D1: dùng `WingsGoCommerceHero`, không đụng registry |
| P1 | Các section lấy dữ liệu từ nhiều snapshot khác nhau, gây trùng hoặc lệch card | Mục "Một snapshot cho mỗi request" |
| P1 | Quy tắc featured khi có filter mâu thuẫn với yêu cầu không trùng | D6 và bảng quy tắc hai section |
| P1 | Lệch tháng do timezone; trang detail dùng chung cho mọi site | Mục "Lịch nghiệp vụ" và quy tắc trang detail ở Phase 0 |
| P1 | Chưa có quy tắc giá và ngày khi lọc theo `season` | Mục "Cửa sổ khởi hành" |
| P2 | Badge N ngày và rủi ro dữ liệu cũ | D3: tính trên server, trang giữ dynamic/no-store, có test canh giữ |
| P2 | Chọn ảnh market | D2: seed deterministic, có fallback, log khi chạm trần 200 |
| P2 | CTA liên hệ | D4: lấy từ cấu hình site |
| P2 | SEO cho URL có filter | D9: `noindex, follow` và canonical |
| P2 | Live Simulator lệch với public renderer | Phase 5: dùng chung mapper |
| P3 | Tier 1 của curation chấp nhận curation thiếu `site`; market trên URL chưa có whitelist | Phase 1 |
| P3 | Tiền tố `/en` cho link detail; viền rainbow trên card wide | D7; mục Ràng buộc |
| P3 | Workspace có nhiều thay đổi không liên quan | Phase 0: làm trên worktree/branch riêng |

### Cổng tham vấn Codex (AGENTS.md)

- Trước Phase 1: **Chưa có kết quả, đã ghi nhận sai lệch.** Ngày 2026-10-29, `codext exec -m gpt-6.1-sol -s read-only` lỗi "Selected model is at capacity" ở mọi lần chạy (từ khoảng 07:45Z đến 08:28Z, 7 lần). Người dùng chỉ định chỉ dùng `gpt-6.1-sol`, sau đó yêu cầu "tiếp tục", nên Phase 1 được làm trên branch local `feat/us-092-tour-catalog-v2` (không push, không deploy) song song với việc tiếp tục thử lại Codex. Bù đắp: cổng Codex phải chạy trên diff Phase 0 và Phase 1 trước khi bắt đầu Phase 2 và trước khi merge. Biên bản lưu ở `docs/consultations/2026-10-29-us092-phase1-codex-gate.md`.
- Cổng bù đắp (Phase 0 + Phase 1), 2026-10-29 17:10: Codex `gpt-6.1-sol`, chạy tương tác qua herdr. **VERDICT: NO-GO.** Xử lý:

| Finding | Quyết định của orchestrator | Trạng thái |
|---|---|---|
| P1.1 Phân trang offset làm mất card khi curation hoặc eligibility thay đổi giữa hai request | Sửa ở Phase 1b bằng cursor keyset không lưu trạng thái (dùng lại `compareCards`). Không dùng snapshot Redis vì cần thêm hạ tầng, trong khi keyset đã chặn được lỗi bỏ sót do dịch vị trí. Phase 1c gắn cursor với ngữ cảnh request và nhúng ID featured vào cursor (xem cổng 2) | Đã sửa (`ef5f2f4`, `16adb69`) |
| P2.1 Ảnh market phụ thuộc thứ tự trả về của Payload | Sắp xếp ứng viên theo `id` rồi `url` trước khi lấy modulo | Đã sửa (`ef5f2f4`) |
| P2.2 Ba lần đọc tuần tự không nằm trong một transaction | Ghi nhận là giới hạn đã chấp nhận: cursor ở P1.1 chặn lỗi bỏ sót card; nếu một lần ghi xen giữa ba lần đọc, DTO có thể ghép các trạng thái khác nhau trong một request, và lần render sau sẽ tự đúng lại | Chấp nhận, đã ghi rõ |
| P2.3 Quy tắc `enabled` khác nhau giữa SSR, API và query | `queryWingsGoTourCatalog` chỉ chạy khi `enabled === true`; homepage giữ việc ghi đè tường minh trong `getWingsGoFeaturedTours` | Đã sửa (`ef5f2f4`; route thống nhất ở `16adb69`) |
| P2.4 Chưa có bằng chứng dạng ngày trên production | Người dùng đã đồng ý; truy vấn chỉ đọc ngày 2026-10-29: 323 departure, 100% `00:00:00Z`, 0 lệch ngày (chi tiết ở `phase0-date-audit.md` mục 6). Trang detail chuyển sang helper lịch VN cùng Phase 2, kèm snapshot WingSide | Đã có bằng chứng |
| P3.1 Các field DTO mới là bắt buộc | Giữ bắt buộc, vì đây là hợp đồng v2; JSON consumer cũ không bị ảnh hưởng | Chấp nhận |
| P3.2 Homepage gọi resolver curation hai lần | Trả trực tiếp `catalog.featured`, bỏ lần resolve thứ hai | Đã sửa (`ef5f2f4`) |
| P3.3 Chạm trần inventory chỉ ghi log warning | Giữ warning; metric/alert để Phase 6 hoặc vận hành | Hoãn |
| `git diff --check` báo khoảng trắng thừa | Sửa | Đã sửa |

- Cổng 2 (Phase 1b, `ef5f2f4`), 2026-10-29 19:26: Codex `gpt-6.1-sol`. **VERDICT: NO-GO.** Biên bản: `docs/consultations/2026-10-29-us092-phase1b-codex-gate.md`. Xử lý:

| Finding | Quyết định của orchestrator | Trạng thái |
|---|---|---|
| P1.1 Cursor không gắn site, locale, filter | Cursor v2 có `ctx` = FNV-1a của site, locale, sort và filter chuẩn hóa; sai ngữ cảnh thì bắt đầu lại từ đầu. Không dùng HMAC: catalog là dữ liệu công khai, sửa cursor chỉ đổi kết quả của chính người gửi | Đã sửa (`16adb69`) |
| P1.2 `exclude` cho phép loại card tùy ý | Bỏ param `exclude`; ID featured nằm trong cursor (`x`). Orchestrator sửa thêm: cursor các trang sau mang tiếp `x` của trang 1, không lấy featured hiện tại (có test 3 trang) | Đã sửa (`16adb69`, commit kế tiếp) |
| P2.1 Card tự đổi khóa sort ra trước cursor thì không hiện ở trang sau | Giới hạn của keyset, ghi trong `phase1c-report.md`; card khác không bị bỏ sót | Chấp nhận, đã ghi rõ |
| P2.2 Route và query dùng hai biểu thức `enabled` khác nhau | Route dùng `enabled !== true`; có test giá trị truthy không phải boolean | Đã sửa (`16adb69`) |
| P2.3 Test API chỉ mock query | Thêm test API chạy qua query thật: phân trang, ba kiểu đổi dữ liệu, sai ngữ cảnh, cursor giả mạo | Đã sửa (`16adb69`) |
| P2.4 Ba lần đọc không chung snapshot DB | Rủi ro còn lại khi release, ghi trong `phase1c-report.md` | Chấp nhận, đã ghi rõ |

- Cổng 3 (Phase 1c, `16adb69`..`ea6236e`), 2026-10-29 19:56: Codex `gpt-6.1-sol`. **VERDICT: GO** cho Phase 2. Biên bản: `docs/consultations/2026-10-29-us092-phase1c-codex-gate.md`. Không có P1. Xử lý:

| Finding | Quyết định của orchestrator | Trạng thái |
|---|---|---|
| P2.1 `nextOffset` tính từ offset của client khi cursor bị từ chối | Dùng `effectiveOffset`; có test | Đã sửa (commit kế tiếp sau `ea6236e`) |
| P2.2 `ctx` dùng FNV-1a 32-bit, không bảo đảm toàn vẹn | Chấp nhận cho dữ liệu công khai, API no-store. Xem lại nếu cursor dùng cho dữ liệu riêng tư, cache dùng chung hoặc phân quyền | Chấp nhận, đã ghi rõ |
| P2.3 Ba lần đọc không chung snapshot DB | Rủi ro còn lại khi release; xem lại trước production nếu cần snapshot nghiêm ngặt | Chấp nhận, đã ghi rõ |
| Khoảng trống test: SSR integration kiểm tra `initial.nextCursor` | Bổ sung trong Phase 2 (Phase 2 sửa SSR page) | Hoãn sang Phase 2 |

### Review của orchestrator

- Phase 0 (`59fcbbb`, `abaa7ab`): đạt. Đã yêu cầu sửa lỗi locale thiếu bị rơi về EN; bản sửa có test.
- Phase 1 (`853e0bc`): đạt. Orchestrator tự chạy lại test WingsGo: 104/104 unit, 29/29 component. Lỗi `wingsGroupV3Shell.unit.spec.ts` cũng xảy ra trên baseline `8980e23`, nên là lỗi có từ trước. Phát hiện một lỗ hổng trong design (Hero vẫn hiện slot #1–#3 khi đang lọc, gây trùng card với "Tất cả tour"); đã xử lý bằng cách cập nhật D6 và giao cho Phase 2.
- Phase 2 (`9992ee0`, `754d95f`, `68afa86`, `3eb80ec`): đạt.
  - Snapshot hồi quy (panel homepage VI/EN và `groupDeparturesByMonth` với dữ liệu kiểu WingSide) được commit trước khi refactor và giữ nguyên sau refactor.
  - Orchestrator tự chạy lại: unit WingsGo 114/114, component hero/catalog 29/29, eslint 0 lỗi, `git diff --check` đạt.
  - Kiểm tra trên dev server local (SQLite, host `wingsgo.local`):
    - `/tour` VI: hero có slot #1 (badge hot, sticker, "Khởi hành sau N ngày") và hai ô phụ; form tìm nhanh; "Tour nổi bật" từ slot #4.
    - `/tour?season=autumn`: hero không có thẻ tour và section nổi bật bị ẩn (D6).
    - `/en/tour`: copy hero toàn tiếng Anh. Catalog rỗng vì DB local không có bản dịch EN (query EN dùng `fallbackLocale: false` từ baseline); cần kiểm lại ở Phase 6 với dữ liệu có bản dịch.
  - Lỗi phát hiện khi kiểm tra trên server và đã sửa (`3eb80ec`): bảng nhãn market được export từ module `'use client'`, nên server component chỉ nhận client reference và hiện mã thô "japan". Test component không bắt được lỗi này.
- Phase 3 (`65f4aaf`, `18a12e8`, `8dfc391`, commit sửa nhãn chip kế tiếp): đạt.
  - Snapshot card grid commit trước khi đổi card và giữ nguyên.
  - Orchestrator tự chạy lại: unit WingsGo/SEO 140/140, component catalog/card/hero 48/48, `git diff --check` đạt.
  - Kiểm tra trên dev server local (`wingsgo.local`):
    - `/tour`: không có thẻ robots, canonical `https://wingsgo.vn/tour`; có chip market/mùa/sort, select tháng; "Tour nổi bật" là 3 card wide.
    - `/tour?season=autumn&priceMax=1000` và `/tour?sort=price`: `noindex, follow`, canonical `/tour`. Empty state giải thích tour giá "Liên hệ" không tham gia lọc ngân sách, có nút "Xóa bộ lọc" và "Bỏ lọc ngân sách".
    - `/en/tour?priceMax=1000&durationMax=6`: `noindex, follow`, canonical `/en/tour`; chip, empty state và nút không có tiếng Việt.
  - Lỗi orchestrator phát hiện và đã sửa:
    - `pendingParamsRef` chỉ bị xóa khi filter đổi; sau một thao tác chip không đổi URL, thao tác chip kế tiếp ghi đè params mà hero hoặc nút Back vừa đặt. Sửa bằng cách xóa ref khi transition kết thúc; test mới thất bại trên code cũ (`8dfc391`).
    - Chip khoảng giá/số ngày dùng nhãn "Giá từ"/"Số ngày tối thiểu" cả khi là cận trên ("Giá từ: ≤ 1.000"). Đổi sang "Ngân sách"/"Số ngày" (EN "Budget"/"Duration"), có test.
  - Để Phase 6 kiểm tra trên trình duyệt: hiệu ứng hover `-translate-y-1` của card (có từ baseline) khi bật reduced motion; layout 390px.
- Phase 4 (`667a529` D10, `e999928`, commit sửa copy ô thị trường kế tiếp): đạt.
  - Orchestrator tự chạy lại: unit WingsGo/SEO 147/147, component 51/51, tsc chỉ còn 2 lỗi có từ trước, `git diff --check` đạt.
  - `upcoming` loại toàn bộ ID featured (slot #1–#6), rỗng khi có filter (D10). Ô thị trường render trong client catalog, trước "Tour nổi bật"; bấm ô đặt `?market=`, giữ filter khác, xóa `cursor`/`offset`, `window.scrollTo` tới "Tất cả tour".
  - Dev server local (`wingsgo.local`): `/tour` hiện dải "Sắp cất cánh" 6 tour có badge "Khởi hành sau N ngày", rồi ô thị trường (Hàn Quốc 9, Nhật Bản 6, Trung Quốc 2), rồi "Tour nổi bật". `/en/tour` không có dải và ô vì DB local thiếu bản dịch EN (đã ghi ở Phase 2).
  - Orchestrator sửa copy mô tả ô thị trường: "với mức giá tốt nhất" / "verified best available pricing" là khẳng định không kiểm chứng được; đổi thành mô tả đúng dữ liệu (số tour và giá thấp nhất đang mở bán).
- Release production 2026-10-30 (Phase 0–4 + D11), release `release-us092-cd58ca0`:
  - Đối chiếu trước deploy: `app/src` của release đang chạy (`wingsgo-price-20261029`) giống hệt baseline `8980e23` (chỉ khác `payload-types.ts` sinh tự động), nên release không gỡ mất thay đổi nào đang chạy.
  - Truy vấn chỉ đọc trên production: 184 departure tương lai đã publish (92% trần 200), 49 product, 50 wrapper, **0/49 product có title EN** ⇒ D11.
  - Migration: release diff không có migration; 52/52 migration trong code đã ghi trong `payload_migrations` (đọc trực tiếp DB). Lưu ý runbook: `migrate:status` chạy với `--env-file shared/.env` không có `DATABASE_URI` nên đọc SQLite rỗng trong container và báo `No` hết (ops image của release trước cũng vậy); cần sửa runbook.
  - App image `sha256:d787de72…`, ops image `sha256:662b79c9…` (revision `cd58ca0` đã xác minh). Readiness: database up, Redis up, leadDelivery configured.
  - Rollback: `previous` = `releases/wingsgo-price-20261029`, image bất biến `sha256:d5352f45…` (ghi trong `current/PREVIOUS_IMAGE_ID` và `current/rollback-compose.yml`). Không có schema mới nên rollback chỉ cần đổi image.
  - Smoke sau cutover: wingsgo.vn `/`, `/en`, `/tour`, `/en/tour`, `/tour?season=autumn`, API catalog, wingside.vn, wingsgroup.vn đều 200. `/tour` và `/en/tour` 17 card (trước `/en/tour` 13). Homepage EN có lại tour. URL có lọc `noindex, follow`. API WingSide trả DTO rỗng. Thời gian phản hồi `/tour` khoảng 2,1–3,4s (trước khoảng 1,9–2,4s), `/en/tour` khoảng 2,4–2,6s (trước khoảng 1,7–2,0s).
  - Theo dõi sau release: thời gian phản hồi `/tour`/`/en/tour` (EN thêm một query VI), log `[wingsgo-catalog] ... reached maximum cap`, nhãn promo bị cắt trong thumbnail ô phụ hero (component dùng chung với homepage, có từ trước).
- Chưa làm: Phase 5 (Live Simulator) và E2E đầy đủ Phase 6.

## Kiểm tra chi tiết theo tiêu chí chấp nhận

Nguồn của 6 tiêu chí chấp nhận là mục `Acceptance Criteria` trong `overview.md`, được đồng bộ sang Plane. Các kiểm tra dưới đây là phần chi tiết:

- AC1 → mục 1
- AC2 → mục 2, 3, 4
- AC3 → mục 5, 6, 11
- AC4 → mục 7, 8
- AC5 → mục 9, 10
- AC6 → mục 12, 13

1. `/en/tour` và API tải thêm ở ngữ cảnh EN không có nhãn tiếng Việt nào, kể cả nhãn giá liên hệ và các chuỗi của client.
2. Hero, Tour nổi bật, Tất cả tour, ô thị trường và Sắp cất cánh lấy từ một snapshot với cùng `now`. Không có card trùng giữa Hero, Tour nổi bật và Tất cả tour, cả khi có và không có filter, kể cả sau khi tải thêm. "Sắp cất cánh" không chứa tour ở Hero/Tour nổi bật và ẩn khi có filter (D10).
3. Khi không có filter: Hero hiện slot #1–#3, Tour nổi bật hiện slot #4–#6, Tất cả tour loại các tour đó. Khi có filter: Tour nổi bật ẩn, và Tất cả tour chứa mọi tour khớp.
4. Resolver giữ đúng thứ tự Page → mặc định của site → legacy → fallback, chỉ trong phạm vi site. Curation có ít hơn 3 tour vẫn render đúng.
5. `departureMonth` và bốn mùa dùng helper lịch VN, kết hợp AND, mùa đông đúng khi qua năm mới, giá trị không hợp lệ bị bỏ qua.
6. Khi có cửa sổ khởi hành, card dùng departure gần nhất và giá thấp nhất trong cửa sổ, và bộ lọc ngân sách dùng cùng mức giá đó. Khi không có cửa sổ, kết quả trùng US-091.
7. Badge "Khởi hành sau N ngày" lấy từ DTO và đúng ở ranh giới 16:59Z/17:00Z. `/tour` vẫn dynamic và API vẫn `no-store`.
8. Ô thị trường đếm đúng số tour, hiện đúng giá thấp nhất, ảnh ổn định trong ngày và có fallback khi market không có ảnh.
9. Quy tắc giá và promotion của US-083 và badge của US-084 vẫn đúng trên card thường và card wide.
10. Homepage WingsGo giữ nguyên output. WingSide và WingsGroup không đổi gì: API catalog trả rỗng, trang detail không đổi, trừ khi có decision record theo Phase 0.
11. URL có filter có `noindex, follow` và canonical về `/tour` theo locale.
12. Live Simulator dùng chung mapper với public renderer.
13. Bằng chứng trên trình duyệt đạt ở 1440px và 390px, VI và EN: reduced motion, khôi phục khi kết quả rỗng, đổi thứ tự curation thì Hero và grid cập nhật.

## Kế hoạch test

| Tầng | Trường hợp |
|---|---|
| Unit | Locale VI/EN; `toBusinessCalendarDay` với dạng 00:00Z, 12:00Z, 17:00Z và ranh giới 16:59Z/17:00Z; slot #1–#6 và trường hợp ít hơn 3 tour; quy tắc hai section; cửa sổ khởi hành, giá cửa sổ, ngân sách; parser tháng và mùa; tổng hợp market, ảnh deterministic, fallback, trần 200; promotion không tự sinh giảm giá. |
| Integration | Resolver bốn tầng cho `/tour`; một snapshot, không trùng card qua API tải thêm; cô lập site và locale ở API; test canh giữ dynamic/no-store; `/tour` và trang detail cùng tháng; snapshot WingSide không đổi. |
| Component | Hero và card wide với hot, sticker, promo; không có badge thì không có class thừa; chips, khôi phục khi rỗng, giá liên hệ, link detail có `/en`; homepage không hồi quy; Simulator khớp public renderer. |
| E2E | `agent-browser` 1440/390, VI/EN; đổi thứ tự curation trong CMS; từng filter, tháng, bốn mùa; race giữa ô tìm nhanh và chip; reduced motion; bàn phím và focus. |
| Platform | lint, unit, component, integration, build; runbook Oracle ARM64; release review bằng Codex. |

## Fixtures

- Tour WingsGo đủ slot #1–#6, nhiều market, có giá hợp lệ và không hợp lệ, `originalPrice`, `promoLabel`, badge hot/specialized/vip; một curation có ít hơn 3 tour.
- Departure ở ranh giới nửa đêm giờ VN, cả tương lai và quá khứ, trải trên nhiều tháng và qua năm mới; departure không giá để thử trạng thái liên hệ; đủ ba dạng 00:00Z, 12:00Z và 17:00Z ngày trước.
- Inventory chạm trần 200; một market không có ảnh hợp lệ.
- Nhãn VI/EN; hotline và Zalo cấu hình theo site.
- Dữ liệu WingSide/WingsGroup để chứng minh không rò giữa các site.

## Lệnh kiểm tra

```text
cd E:\repo\WingsTravel\app
pnpm run lint
pnpm run test:unit
pnpm run test:component
pnpm run test:int
pnpm run build
```

## Bằng chứng nghiệm thu

| Mục | Kết quả |
|---|---|
| Truy vấn Phase 0: số departure có ngày VN khác ngày UTC, theo site | Local: 164/164 `00:00Z`, 0 lệch. Production 2026-10-29: 323/323 `00:00Z`, 0 lệch |
| Biên bản tham vấn Codex trước Phase 1 | Cổng bù đắp chạy sau Phase 1: NO-GO (17:10) → NO-GO (19:26) → GO (19:56), biên bản trong `docs/consultations/2026-10-29-us092-phase1*-codex-gate.md` |
| Exit code của các lệnh kiểm tra | Commit release `cd58ca0`: `pnpm run lint` 0 (0 error), `pnpm run build` 0, `test:unit` 1370/1371 (lỗi duy nhất `wingsGroupV3Shell` có từ baseline), `test:component` 418/418, `tsc` chỉ 2 lỗi baseline |
| Ảnh chụp và log trình duyệt | Production 2026-10-30: `agent-browser` `/tour` 1440px và 390px, không lỗi console, không cuộn ngang ở 390px. Chưa làm E2E đầy đủ Phase 6 (reduced motion, bàn phím, đổi curation) |
| Bằng chứng dynamic/no-store | Production: API trả `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`; `/tour` `force-dynamic` (guard test) |
| Release review bằng Codex | Lần 1 NO-GO (P1 lint) → sửa → lần 2 **GO**. Biên bản `docs/consultations/2026-10-30-us092-release-review.md` |

## Chỉnh theo mockup sau release (2026-10-30)

Người dùng phát hiện ba điểm lệch so với `wingsgo-tour-redesign-v2.html` trên bản production `release-us092-cd58ca0`:

| Điểm lệch | Sửa |
|---|---|
| "Sắp cất cánh" là grid card thường | Bảng vé cuộn ngang: cuống vé ngày/tháng/thứ theo lịch VN, tuyến `HAN ✈ THỊ TRƯỜNG · 6N5Đ`, giá rút gọn, nút trước/sau (ẩn trên mobile, tôn trọng reduced motion). |
| Breadcrumb có khoảng trống lớn | `/tour` WingsGo dùng `pt-4 md:pt-6` cho article và breadcrumb không có `pt-8`; hero còn `pt-4 md:pt-7`. |
| Hero xếp dọc, ba tour nằm dưới ô tìm kiếm | Hero 2 cột 5/7: tiêu đề, dock tìm kiếm và số liệu thật (số thị trường, số hành trình từ `markets`) bên trái; mosaic slot #1 cao hai hàng cùng slot #2–#3 bên phải. |

Giữ nguyên ràng buộc: không chip "Tour hot" (hot vẫn là viền cầu vồng), không số liệu bịa, giá qua `PromotionPrice` ở slot #1, sticker/promo theo US-084/US-083. Font tiêu đề Playfair Display (OFL) tự host trong `app/public/fonts/wingsgo/`.

Kiểm tra: component 422/422, unit 1370/1371 (lỗi có sẵn `wingsGroupV3Shell`), tsc chỉ còn 2 lỗi có sẵn, eslint sạch; dev server 1440/390 không tràn ngang, không lỗi console.

Release `release-us092-35d85d6` (2026-10-30 08:19 ICT): app image `sha256:47a23a4c…`, ops `sha256:a48dfffa…`, không migration. `previous` = `release-us092-cd58ca0`, rollback image `sha256:d787de72…` trong `rollback-compose.yml`. Readiness `ready`; wingsgo/wingside/wingsgroup trả 200; font `/fonts/wingsgo/*.woff2` 200; `/tour?market=japan` vẫn `noindex, follow` và ẩn mosaic. Ảnh production 1440/390: không tràn ngang, không lỗi console. `package-release.ps1` nay copy `app/public/fonts`.
