# Nghiệm thu US-082 — WingsGroup English

Ngày 20/10/2026, Asia/Bangkok. Bản phát hành hiện hành: `release-us082-us083-consent-20261020-120500`, kích hoạt 19:18:29. BUILD_ID `wEYFV0d0yBTqhvpn8ZupY`; image `sha256:15ee80cde57fb60e478b015da903d8e3b70cf52ecb815700f7032723dbbf12b4`.

## Contract và kiểm chứng

- Archive query và selection lấy locale từ site context, `fallbackLocale:false`, `overrideAccess:false`, published/site scope; selection tải lại ID theo locale. Browser production desktop/mobile kiểm tra 11 thẻ bài viết EN, tags/excerpts EN, không tràn ngang.
- GET gửi query locale, POST gửi body locale; server validate locale và ưu tiên trusted site/path context. Production GET EN consent/privacy `/en/chinh-sach-bao-mat` đạt; locale fr trả400, WingsGo không nhận lead contract WingsGroup.
- AbortController và success/catch guard ngăn response cũ; reset consent khi đổi VI/EN. Component tái hiện late TypeError trước sửa và chạy đạt sau sửa.
- Live QA release đầu phát hiện hai checkbox: legacy required `consent` nhãn EN rỗng và canonical control. Đã tái hiện test đỏ, hợp nhất thành một canonical checkbox `aria-required=true`; chỉ explicit acceptance mới thêm legacy `consent:true` vào POST. Không bỏ validation máy chủ hay tự đồng ý theo default CMS.
- Local browser final build trên PostgreSQL/Redis rehearsal: một checkbox desktop/mobile, unchecked error, VI↔EN reset, success sau tick. Root xem ảnh thực tế và truy vấn record8: site1/form1, locale=en, consent version đúng, legacy consent string true. Marker `us082-compat-local-20261020` nằm trong brief; source path lưu `/`, không nhận là đã chứng minh source path EN.
- Contact page4 và checkbox fixture do root tạo đã xóa; English approval state khôi phục hidden; remaining fixture blocks/checkbox đều0. Không sửa CMS hay submit lead trên production.

## Lệnh và kết quả

- `pnpm run test:unit`: exit0, 150 files /1130 tests. Assertion preview alias sau đó được tăng cường; agy5/5 và root attack1/1 đạt.
- `pnpm run test:component`: exit0, 46 files /237 tests, sau bản sửa consent cuối.
- `pnpm run test:int tests/int/leadSubmissionRoute.int.spec.ts tests/int/wingsSideTourScoping.int.spec.ts`: exit0, 21+11 tests. Regression missing/false legacy consent→400/no create; true+governance→202/en.
- `pnpm exec tsc --noEmit`, scoped ESLint Form/component/API test, `git diff --check`: exit0.
- `pnpm run build` gồm postbuild exit0. Package kiểm BUILD_ID, 17209 entries, forbidden source/tests/docs/env/media0; SHA256 trong release-consent-manifest.json.
- ARM64 candidate thực chạy libsql SELECT1 và sharp/libvips PNG90bytes; readiness database/Redis up, leadDelivery configured. Production read-only smoke sau activation exit0; candidate đã gỡ sau kiểm image trùng app.

## Review, rollback và giới hạn

Codex độc lập: `docs/consultations/us082-us083-final-runtime-review-20261020.md` và `docs/consultations/us082-consent-compat-release-review-20261020.md`. Không còn finding P1/P2/P3 chưa xử lý trong scope; P3 assertion cũ đã sửa và kiểm lại.

Backup trước bản vá: `/home/ubuntu/wings-travel/shared/backups/release-us082-us083-consent-20261020-120500.dump`, 4585770 bytes, SHA256 `879963288fde5e1039336bf05c298aff302e3901ccc1a9474d2b19ac56ece382`. Full decode `pg_restore --file=/dev/null` exit0. Rollback tag `wingstravel-app:rollback-release-us082-us083-consent-20261020-120500` pin image release đầu `fec07a9…`; previous current `release-us082-us083-20261020-114500`. Không migration, không flush Redis; chỉ recreate app. Chưa restore drill vào DB khác.

Bằng chứng bền vững: `docs/reviews/us082-us083-20261020/`. Chưa chạy toàn bộ committed integration/E2E hoặc gửi email production. Browser fixture sale dùng SQLite; consent dùng standalone PostgreSQL. Hai submissions cũ cùng marker là hai lần gửi, không phải idempotency proof.

Một số CMS copy ngoài archive/consent vẫn VI: trust CTA và nhãn hotline footer từ US081; tên pháp nhân/ban biên tập là tên riêng. Không tuyên bố toàn bộ `/en` đã dịch 100%.