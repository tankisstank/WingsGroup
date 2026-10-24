# US-082 / US-083 — gate phát hành cuối

20/10/2026, Asia/Bangkok. Root điều phối hai pane agy hiện hữu `wP:p1` (US082 browser/API regression) và `wP:pA` (US083 browser/deployment review). Đây là kết luận kỹ thuật hiện hành; checkpoint NO-GO/HOLD trước là lịch sử.

**GO — đã triển khai production.** Release `release-us082-us083-consent-20261020-120500`, activation19:18:29, BUILD_ID `wEYFV0d0yBTqhvpn8ZupY`, image `sha256:15ee80cde57fb60e478b015da903d8e3b70cf52ecb815700f7032723dbbf12b4`.

| Gate | Bằng chứng thực tế |
| --- | --- |
| Unit | Full150 files/1130 tests exit0; preview P3 assertion bổ sung sau đó agy5/5, rootattack1/1 đạt. |
| Component | Full46 files/237 tests exit0 sau sửa consent cuối. |
| Integration | Scoped21 lead +11 tour scoping exit0; không nhận là full repository integration/E2E. |
| Type/build | TypeScript, scoped ESLint, diff check, build/postbuild exit0. Archive17209 entries, BUILD_ID khớp, forbidden media/source/tests/docs/env0; SHA256 a4fe0984eaf301acee086507f3fe2fe2235c47dd159e7a484fe5c385d7245509. |
| Locale/tenant | Archive query/selection không VI fallback; lead query/body locale validate và trusted context ưu tiên. Production read-only EN consent/privacy, invalidfr400, other-tenant disabled đạt. |
| Race/consent | Abort success/catch guard, resetVI↔EN. Live QA tìm duplicate blank legacy checkbox, root test đỏ rồi sửa hợp nhất, explicit consent legacy POST preserved. Codex bổ sung không finding mới. |
| Persistence | Final local browser success, PG record8 localeen/site1/form1/legacytrue; marker trong brief. Source path `/`, không khẳng định EN path. Fixtures root xóa, approval restoredhidden. |
| Browser US082 | Production archive11 EN cards/tags/excerpts desktop/mobile; patch live chỉ1 canonical checkbox aria-requiredtrue, privacyEN, overflowfalse/errors0. Root xem ảnhdesktop/mobile saupatch. |
| Price/US083 | Same departure/currency/freshverified, sale>0 và original>sale; soldout/expired/contact/unverified không discount. Ba surface cùng governed DTO/formatter, promoLabel không tự sinh. |
| Browser US083 | Production homepage/catalog/Korea/Japan ×desktop1440x900/mobile390x844 đạt. Root xem thẻdesktop/mobile; ảnhđen bị loại/chụp lại. Actualproductiondiscount0 vì không có dữ liệu sale hợp lệ; local đã kiểm promo/non-promo. |
| CMS/cache | HTTP Payload PATCH/DELETE thật cập nhậtpublicgiá/nhãn/xóa; synthetictenant2evicted/tenant9preserved. Không globalflush, missing site khôngscan. Không chứng minh publiccurationRediswriter. |
| ARM64/health | Candidate thực chạy libsqlSELECT1, sharpPNG90bytes; DB/Redisup, leadDeliveryconfigured. Appactivation imagekhớp, actualBUILD_IDđúng, startup logkhông lỗiapp. Rootcandidateđãgỡ. |
| Review | Codex runtime+consent compatibility độc lập; P3protocolassertionđãsửa, khôngfindingP1/P2/P3chưa xử lý trongscope. |
| Rollback | Backup4585770bytes, fullpg_restoredecodeexit0, SHA879963288fde5e1039336bf05c298aff302e3901ccc1a9474d2b19ac56ece382; rollbacktag pinreleaseđầu fec07a9…; previouscurrent release-us082-us083-20261020-114500. Chưa restoreDBdrill. |

Không thêm/chạy migration, không restart PostgreSQL/Redis, không seed giá production. Chỉ app recreate; không push/gitreset/clean. Dirty baseline/US081 retained; release manifest lưu31sourcehashes.

Giới hạn: chưa full committed integration/E2E hoặc production POST/email. Local sale images SQLite; consent/hook PostgreSQL; không gọi toàn bộ bằng chứng là production-like PG. Redis wildcard chỉtenant, khôngcross-environment nếu cùngDB; deployment hiệnRedisriêng. Preview base SQLite cầnclosed/checkpointed, khôngvirtualtables. Hai submissions cũ cùngmarker khôngidempotencyproof.

CMS copy ngoài archive/consent cònVI: trustCTA và hotlinefooterUS081; legal/company/editorialnames làtênriêng. Không tuyên bố toàn bộ `/en` đãdịch100%.

Evidence bền vững: `docs/reviews/us082-us083-20261020/`; review độc lập tại `docs/consultations/`. Validation từngstory là contract/proof chi tiết. Harness đã ghi trace300/301, hai story implemented và unit/integration/browser/platform proof đều1. Plane preview + workitems sync exit0, patchedCount2/missingCount0. API độc lập lúc19:23 xác nhận Đã bàn giao, missing dates0, generic child names0, đúng project/Epic E09 và E07; giữ nguyên start/target19/10/2026. Đã bàn giao kỹ thuật không đồng nghĩa khách hàng đã nghiệm thu.