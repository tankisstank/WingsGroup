# Nghiệm thu US-083 — WingsGo Discount / Promotion

Ngày 20/10/2026, Asia/Bangkok; lane `high_risk`. Release hiện hành `release-us082-us083-consent-20261020-120500`, kích hoạt19:18:29; BUILD_ID `wEYFV0d0yBTqhvpn8ZupY`, image `sha256:15ee80cde57fb60e478b015da903d8e3b70cf52ecb815700f7032723dbbf12b4`. Bản bổ sung chỉ sửa Form consent, không đổi quy tắc giá đã phát hành18:52:46.

## Contract và kiểm chứng

| Tiêu chí | Kết quả |
| --- | --- |
| Cùng departure | Sale/original/currency/promo cùng departure và site; unit hai departure giá khác nhau bảo vệ không trộn giá. |
| Không giảm giá ảo | Chỉ originalPrice>priceFrom>0, currency khớp, verification hiện hành, chưa sold-out. Zero/expired/unverified/mismatched currency không có discount. CommerceVerified được suy ra, không thêm cột. |
| Ba bề mặt | Homepage, WingsGoTourCard và StructuredPages dùng DTO governed và formatter thống nhất. Badge chỉ promoLabel; không sinh marketing hay phần trăm. |
| CTA | Contact/unverified/sold-out/past dùng consultation; chỉ future verified commercial departure được giữ chỗ. Component4 tests đạt. |
| Curation | Tái dùng chọn tour hiện có; không thêm promoLabel vào schema TourCurations. |
| Revalidation | Product/departure change/delete và curation hooks cập nhật home/catalog/schedule/market; missing site không scan; tenant-scoped Redis purge. |
| CMS/cache rehearsal | HTTP Payload login/PATCH/DELETE thật: public8.8M/13.8M/label cập nhật, delete→featured0. Synthetic tenant2 key evicted, tenant9 preserved; cleanup admin0, departure restored. Không nhận raw SQL→HTTP là hook proof. |

## Kiểm thử và browser

- Full unit `pnpm run test:unit`: exit0, 150 files /1130 tests; preview assertion tăng cường sau đó agy5/5, root attack1/1 đạt.
- Full component `pnpm run test:component`: exit0, 46 files /237 tests trên bản build cuối.
- Scoped integration `pnpm run test:int tests/int/leadSubmissionRoute.int.spec.ts tests/int/wingsSideTourScoping.int.spec.ts`: exit0, 21+11 tests.
- TypeScript, scoped ESLint, git diff check, production build/postbuild: exit0.
- Local browser có promo/non-promo trên cả ba bề mặt; desktop/mobile không overflow. Sale fixture dùng SQLite dev; final HTTP hook/cache dùng standalone PostgreSQL/Redis. Không gọi toàn bộ ảnh là PostgreSQL production-like.
- Production browser: homepage, `/tour`, `/thi-truong/han-quoc`, `/thi-truong/nhat-ban` ×1440x900/390x844 đạt, không overflow/errors. Root đã xem ảnh thẻ desktop và mobile rõ giá14.9M,40.9M và giá liên hệ. Ảnh đại diện đen bị loại và chụp lại.
- Production read-only API sau bản vá exit0:6 all cards/6 featured occurrences, discountCount0/promoLabels[]. Dữ liệu hiện không có discount hợp lệ; không tạo giá/nhãn giả trên production để QA.

## Review và vận hành

Codex độc lập `docs/consultations/us082-us083-final-runtime-review-20261020.md`: không P1/P2 mới; P3 chỉ kiểm HTTP200 đã sửa bằng CREATE/INSERT riêng và SELECT exact memory-only row, sentinel nguồn giữ nguyên.

ARM64 candidate thực chạy libsql SELECT1 và sharp/libvips PNG90bytes, database/Redis up, leadDelivery configured. Chỉ recreate app; không migration, không restart DB/Redis, không flush Redis. Candidate của đợt phát hành đã gỡ.

Backup trước bản vá4585770bytes, full decode pg_restore exit0; SHA256 `879963288fde5e1039336bf05c298aff302e3901ccc1a9474d2b19ac56ece382`. Rollback tag `wingstravel-app:rollback-release-us082-us083-consent-20261020-120500` pin release đầu; chưa restore drill DB khác. Manifest/hash/logs tại `docs/reviews/us082-us083-20261020/`.

Redis test keys là synthetic, chưa chứng minh public curation Redis writer. Wildcard hiện cô lập tenant, không cô lập nhiều môi trường cùng Redis DB/site IDs. Deployment hiện Redis riêng; khi chia sẻ Redis hoặc thêm writer phải chốt namespace contract. Preview SQLite yêu cầu closed/checkpointed base image, không virtual table; production dùng PostgreSQL.

Chưa chạy toàn bộ committed integration/E2E repository hoặc gửi email production. PostgreSQL rehearsal dùng freshness window động; không nhận byte-identical snapshot.
## Bổ sung CMS authoring — 20/10/2026 21:29 +07

Người dùng chọn ưu đãi riêng từng đợt ngay trong màn hình Tour. Đã triển khai checkbox Áp dụng ưu đãi + Giá gốc/Nhãn promotion vào phần Ngày khởi hành & giá; lưu đúng localized draft, tắt gửi null, thay đổi bỏ xác minh cũ, không tự publish. Refresh readiness sau lưu/xóa, generation guards chống locale roundtrip. Không đổi collection/schema/API access hoặc quy tắc giá public.

Final local BUILD_ID GHux1OjjppK42suiKM04m; full component247/247, targeted authoring component17/17, authoring unit18/18, tsc/scoped lint/build exit0. Browser desktop/mobile và real PostgreSQL draft save/clear đạt, fixtures0. Review Codex độc lập tìm3P2 đã sửa và có regression; chi tiết/giới hạn tại docs/reviews/us083-cms-promotion-20261020.md.

**Phần CMS bổ sung chưa phát hành production.** Release public nêu trên vẫn đang chạy. Harness platform proof cho delta mới để0; không nhận trạng thái release cũ là bằng chứng phần CMS mới đã lên VPS.

## Production release bổ sung — 20/10/2026

CMS per-departure promotion đã được đóng gói và phát hành VPS ARM64 với elease-us083-cms-promotion-20261020-150000, BUILD_ID GHux1OjjppK42suiKM04m, image sha256:8756cce56b9bf7978f2586d382e0039a16075962463248bbc39f7beeb3d3541f. Backup/rollback/readiness/candidate native checks đạt. Browser smoke live desktop/mobile trên 5 route đạt, overflow false và page errors 0. Asset CMS production khớp build local và có checkbox/giá gốc/nhãn promotion. Không migration hoặc production CMS data write. Bằng chứng tại docs/reviews/us083-cms-promotion-20261020/.

## Production giá ưu đãi và tìm kiếm — 21/10/2026 00:25 +07

Đã phát hành `release-us083-promotion-search-market-20261020-172000` lúc 2026-10-20T17:25:02Z; BUILD_ID `Jbkhivn63kcHi42C2Be4O`, image `sha256:bf1387fd6dfb057b8ac2774f85746708683e0f40b373aff7fac14b43d7f6703f`. Bao gồm commit `58633ae36834bcc0869237f5565d12ccac41929d` và delta hiển thị giá/badge. Server bundle đang chạy xác nhận đủ6 trường tìm kiếm departure. Không thay schema/migration, không ghi dữ liệu kinh doanh production.

Shared PromotionPrice/PromotionBadge áp dụng homepage hot offer, card /tour, lịch đi, detail và market. Giá gốc gạch ngang, giá bán đỏ; badge chữ nằm trên ảnh và không tràn mobile. Không hiện nhãn chỉ chứa số. Market chọn một departure tương lai, commerceVerified, chưa sold-out, giá/currency hợp lệ; original/sale/label cùng departure. Detail header/rail đồng bộ selection và không giữ badge khi bộ lọc không còn departure phù hợp.

Các gate cuối:

- Unit4files32/32; component6files41/41; integration query perimeter1file11/11; TypeScript exit0, scoped ESLint exit0/0errors/99warnings có sẵn; build và postbuild exit0.
- `deploy/oracle/package-release.ps1` exit0; archive SHA256 `1279f517351a9ce48b4a9be77670f5b5daf24f396cd4e31fa7e4bee62eee3e10`, không public/media hoặc env. Hash và BUILD_ID khớp trên VPS.
- Candidate ARM64 thực thi libsql memory CREATE/INSERT/SELECT và sharp PNG90bytes; readiness database/Redis up, delivery configured. Chỉ recreate app; candidate riêng đã gỡ, không flush cache toàn hệ thống.
- Candidate và active API/render smoke exit0: English consent/privacy, locale hợp lệ/bất hợp lệ, trusted locale, tenant isolation, giá verified. Homepage, /tour, detail119 và Japan đều có42.900.000đ gạch ngang,40.900.000đ đỏ. Public JS SHA256 khớp build.
- Browser production12/12:6 route (homepage,/tour,detail119,HanQuoc,Japan,WingsGroup/en) x desktop1440/mobile390; không overflow, pageErrors0, /en privacy link đúng. Root đã xem ảnh giá cận cảnh mobile. Numeric label40900000 trong CMS được giữ nguyên và ẩn trên UI; nhãn chữ cần nhập trong CMS để hiện badge.
- Backup4593773bytes/SHA256 `e845a6fb4e727f0fd3bb509418b3918f62b69c78c5f89a5508de9c1655b66837`; pg_restore list3662 và full decode /dev/null exit0. Rollback tag pins image46d8b184 của release trước; không cần rollback. Không restart PostgreSQL/Redis.

Codex độc lập và2 agy đã review; các finding P2 về SSR helper, badge stale, currency và sold-out selection đã sửa kèm regression. Chi tiết, lệnh chạy, hash, log và giới hạn tại `docs/reviews/us083-promotion-visual-search-20261020.md` và thư mục bằng chứng `docs/reviews/us083-promotion-visual-search-20261020/market-followup/`.

Chưa chạy lại toàn bộ integration/E2E repository, authenticated CMS save hoặc gửi lead/email production cho delta này. Integration11 cases dùng mock query; production smoke read-only. Chưa thực hiện database restore drill. Không gọi các gate này là đã kiểm.

## CMS preview refresh follow-up — 21/10/2026 00:44 +07

Đã sửa lỗi preview trong CMS không tự cập nhật sau khi sửa giá/ưu đãi của một lịch khởi hành. Mutation `tour-departures` giờ phát Payload document event sau khi lưu/xóa thành công; readiness reload theo `departureRevision`, còn phản hồi stale khi đổi tour/ngôn ngữ bị bỏ qua. Preview của `tour-products` dùng draft mode ngay cả khi TourProduct cha đã publish, để đọc được bản nháp của departure liên quan. Không mở rộng TTL token, không migration và không ghi dữ liệu production.

Component authoring/promotion/preview đạt27/27; preview handoff unit đạt19/19; TypeScript và production build exit0. Chi tiết tại `artifacts/tmp/us083-preview-refresh-20261021/validation.md`. Follow-up này chưa deploy production.

## Sự cố CMS SAVE — 22/10/2026

Đã tái hiện bằng browser đăng nhập trên TourProduct161: lưu lịch311 với live preview bật trả request thành công rồi CMS lỗi `Cannot read properties of undefined (reading 'id')`. Payload Relationship Input đọc `event.doc.id`, trong khi event refresh tùy chỉnh thiếu `doc`. Readiness actions dùng cùng contract lỗi.

Candidate bổ sung document đầy đủ, ID và collection khớp khi refresh preview của tour cha sau lưu/xóa lịch và readiness actions. Giữ stale guards, locale/site scope, quyền truy cập và schema. Đã reload lại CMS, lịch311 vẫn có bản nháp cùng giá20.590.000VND; không publish dữ liệu để chẩn đoán.

Full component293/293 và build/postbuild cuối exit0, BUILD_ID `J8S1JEJCCJN96WuCFCEcW`. Sau khi AGY bổ sung identity boundary cases, root chạy lại2 suite liên quan15/15, TypeScript và lint cuối exit0/0warning. Đóng gói106.34MiB exit0, không public/media hoặc env. Plane đã sync `missingCount:0`. **Hotfix chưa deploy**: review Codex độc lập chưa chạy được do lỗi phiên/API key và model capacity, kể cả sau xác nhận đăng nhập lại. Không nhận các lần gọi review thất bại là đã qua gate. Bằng chứng, phạm vi và rollback tại `docs/reviews/cms-save-crash-20261022/audit.md`; vẫn phải kiểm browser SAVE sau cutover.
