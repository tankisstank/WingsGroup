# Tham vấn độc lập US-082 / US-083 — 20/10/2026

**Đề xuất gate: NO-GO phát hành / chưa đóng Story.** Audit đọc candidate đang có trong working tree; không sửa code, chạy Herdr, browser, PostgreSQL/Redis hoặc tác động production. Chỉ tạo báo cáo này.

## Findings

**P1:** Chưa xác nhận lỗi P1 trong phạm vi đã đọc.

### P2-1 — Mapper chung vẫn tự xác minh departure không có cửa sổ xác minh

- Vị trí: `app/src/tours/queries.ts:242–248`, `:249–279`; nơi hiển thị mới: `app/src/tours/WingsGoHomepageSections.tsx:154`, `app/src/tours/StructuredPages.tsx:3512`.
- Với `draft=false`, thiếu cả `verifiedAt`/`expiresAt` và `priceFrom>0`, mapper trả `commerceVerified=true`. Nếu có `originalPrice>priceFrom`, currency hợp lệ và chưa sold-out, giá gạch ngang/promo vẫn được bật. Dữ liệu chưa xác minh được quảng bá như đã xác minh; catalog lại chuyển dữ liệu lưu trữ tương tự về contact.
- Đã tái hiện bằng assert trên thân mapper đọc trực tiếp từ file: không có hai mốc thời gian vẫn nhận `commerceVerified=true`, `originalPrice=15000000`.
- Đề nghị: public derive verification từ cửa sổ lưu trữ hợp lệ; giữ ngoại lệ draft riêng. Thêm ca không có hai mốc thời gian qua schedule/homepage/market.

### P2-2 — Giá liên hệ vẫn có promo trên departure strip

- Vị trí: `app/src/tours/queries.ts:278–279`; `app/src/tours/StructuredPages.tsx:3511`, `:3528–3531`; caller market: `:3697`.
- Cửa sổ xác minh còn hiệu lực nhưng `priceFrom=0` vẫn trả `commerceVerified=true` và giữ `promoLabel`. Strip hiển thị “Liên hệ” đồng thời hiện badge sale vì điều kiện badge không kiểm giá dương hợp lệ. Catalog đã chặn trường hợp này.
- Assert độc lập xác nhận đầu ra `priceFrom=0`, `commerceVerified=true`, `promoLabel='AUDIT SALE'`.
- Đề nghị: promo public dùng cùng điều kiện giá thương mại hợp lệ; kiểm zero/null/currency không hợp lệ và cửa sổ hết hạn.

### P2-3 — Departure hết hạn/chưa xác minh vẫn được mời giữ chỗ

- Vị trí: `app/src/tours/queries.ts:535–542`, `:641–650`; `app/src/tours/StructuredPages.tsx:3505–3508`, `:3537–3545`.
- Market/schedule giữ departure tương lai dù mapper đã đặt `commerceVerified=false`, xóa giá và availability. Strip vẫn in ngày/airline và CTA vô điều kiện `intent='hold-seat'`, nhãn mặc định “Giữ chỗ”; sold-out cũng không chuyển CTA sang tư vấn.
- Đây là sai lệch nhánh contact, không phải bằng chứng đã xảy ra giao dịch sai: lead endpoint chỉ tiếp nhận yêu cầu. Đề nghị giữ tour liên hệ được nhưng chuyển CTA sang tư vấn, không phát tín hiệu giữ chỗ/ngày tồn kho đã xác minh.

### P3 — Phạm vi cache chưa chứng minh được isolation đầy đủ

- `app/src/collections/TourCurations/hooks.ts:165`: wildcard đầu pattern không ràng buộc environment prefix; nếu nhiều môi trường dùng chung Redis DB và trùng site ID, lệnh xóa có thể khớp key môi trường khác. Khi thiếu site ID, pattern mở rộng mọi site. Chưa có bằng chứng cấu hình thực tế gặp điều kiện này.
- `app/src/collections/Tours/hooks/revalidateTourContent.ts:29–34` chỉ invalidate đường dẫn gốc và locale; không có `/wingsgo/en/...`. Đây là thiếu phủ alias local, **chưa đủ kết luận stale runtime** vì frontend hiện `force-dynamic`, public cache policy là private.
- Tìm `wingsgo-curation` trong `app/` không thấy writer cache tương ứng; test hook mock không chứng minh eviction thật. Rehearsal cần chỉ rõ key thật, prefix, tenant/locale, trước/sau update/delete và tenant đối chứng.

## Các điểm không coi là lỗi

- Archive: `app/src/blocks/ArchiveBlock/Component.tsx:51–60`, `:71–91` đã áp dụng public access, published, đúng site, locale và `fallbackLocale:false`; selection được re-query, giữ thứ tự ID. Hai test hiện kiểm options bằng mock, chưa chứng minh dữ liệu translation/relationship thật. Cần browser/data proof cho bài thiếu bản dịch.
- Lead: `app/src/app/(payload)/api/lead-submissions/route.ts:234–242`, `:588–595` ưu tiên header locale rồi request locale hợp lệ. Proxy xóa header nội bộ đầu vào và ký lại (`app/src/utilities/siteDomains.ts:178–212`); API không có prefix locale sẽ không tự gán header locale. Không thấy request locale đổi tenant. Thiếu ca xung đột trusted header/request và bằng chứng lead lưu PostgreSQL, không quy thành lỗi đã xác nhận.
- Catalog: `app/src/tours/wingsGoCatalog.ts:230–280` derive từ `verifiedAt/expiresAt` khi có cửa sổ, truyền đúng `now`, lấy ngày/giá gốc/giá bán/promo cùng departure; chặn discount/promo sold-out và contact. Schema `app/src/collections/TourDepartures.ts:125–181` không có `commerceVerified` hay `originalCurrency`; không yêu cầu thêm cờ schema hoặc bắt buộc originalCurrency. Giá gốc và giá bán dùng cùng trường currency.

## Release và bằng chứng còn chờ

- Candidate còn trộn US-081: `app/src/migrations/index.ts:304–308`, `app/src/migrations/20261019_100000_site_settings_hotlines.ts:3`, `app/src/utilities/repairLocalSQLiteSchema.ts:859`; SQL `deploy/oracle/migrate-us081.sql` cũng hiện diện. US-082/083 không tự cần migration này. Cần chốt manifest scope trước package; không gắn nhãn migration hotline là lỗi US-082/083.
- Migration hotline có up tạo bảng/backfill khi bảng chưa tồn tại; down DROP TABLE CASCADE (`app/src/migrations/20261019_100000_site_settings_hotlines.ts:55`). Không coi rollback đó là bảo toàn dữ liệu hotline. Chưa chứng minh rehearsal/rollback hoặc package ARM64 sau sửa cuối.
- Theo thông tin root: component **227 pass trước Archive fix**, catalog/cache **21 pass**, lead/scoping **28 pass**, Archive mới **2 pass**; full rerun còn chạy. Đây là bằng chứng được cung cấp, không phải suite tôi chạy.
- Hai worker đang làm browser và PostgreSQL/Redis: kết quả vẫn pending tại audit này. Cần nghiệm thu đúng WingsGroup English desktop/mobile, sale/contact/sold-out/expiry, lead persistence và cache isolation; không dùng ảnh tenant khác thay thế.
- Chỉ xét lại GO sau khi xử lý P2, có full rerun trên candidate cuối, proof hai worker và release scope/build/package phù hợp. Không suy ra GO từ số test mock đã pass.

## Lệnh và kết quả audit

- `git status --short`, `git diff --stat`, `git diff -- <các file liên quan>`: đọc được candidate/diff; có thay đổi US-081 ngoài hai story.
- `codegraph explore "ArchiveBlock wingsGoCatalog lead-submissions queries"`, `./scripts/harness.ps1 query matrix`: exit 0; hai story đang in_progress. Đối chiếu tiếp file hiện tại có số dòng, không dựa riêng index.
- `rg` theo symbol/cache/schema và đọc file được nêu: hoàn tất đối chiếu tĩnh. Một số lượt tìm ban đầu dùng wildcard đường dẫn PowerShell không hợp lệ; đã tìm lại bằng đường dẫn cụ thể.
- Here-string JavaScript qua `node`: đọc/extract mapper và freshness helper, assert hai ca tổng hợp P2-1/P2-2; lần cuối **exit 0 lúc 2026-10-20T03:35:42.677Z**. Lần đầu helper audit lỗi xử lý CRLF, đã sửa lệnh đọc và chạy lại. Đây là kiểm tra logic độc lập, không phải browser/DB integration.

Chưa chạy lại suite, browser, rehearsal, build/package; không đọc secret hoặc sửa production. Rủi ro còn lại: ưu đãi/CTA sai ở mapper chung và proof phát hành chưa hoàn tất.

