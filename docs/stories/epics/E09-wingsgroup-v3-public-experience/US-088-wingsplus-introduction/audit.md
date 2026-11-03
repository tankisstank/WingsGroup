# US-088 — Rà soát đính chính sang WingsGroup, 2026-10-27

## Kế hoạch đã khai báo

Overview và Harness được sửa về site WingsGroup trước khi sửa code. Page372 trên WingsPlus là kết quả hiểu sai trước đính chính; chỉ rút về draft sau khi page đúng hoạt động. URL cuối `/gioi-thieu-wingsplus` vì `/wingsplus` là tenant alias có sẵn, đã thấy404 thực trên native canary. Không đổi cơ chế alias.

Candidate cô lập từ production be016fe, final8a0e4700e4925078bf50de7c02eb554d5d1a7845. Thêm đúng một route được quản trị, giữ10 corporate seeds, tenant/locale/approval/media gates. Bao gồm US087 xóa5 evidence fields nhưng giữ HTTPS validation và cột lịch sử nullable. Không thêm dependency/schema/migration. Hai lỗi browser được sửa: mobile hero tràn390px và CSS global ghi đè FeatureGrid2cột.

## Tham vấn và finding

- plan-review.md: chấp nhận kiến trúc tối thiểu có điều kiện seed type tách biệt, bảo toàn draft, kiểm kê CTA, rollback đúng thứ tự. Đã áp dụng.
- release-review.md: HOLD cho native/migration/provenance/concurrency gates; hoàn tất trong preflight-release.log, public-candidate.json, browser-candidate-proof.md và contention.log.
- final-release-review.md: HOLD/P2 cho rollback trước khi có result receipt của homepage. Đã sửa để ghi prepared receipt bền vững trước commit; rollback kiểm tra bước hoàn thành, có thể rút trang mới độc lập khi homepage chưa đổi.
- recovery-without-homepage.log và phase1-test exit0: rút page375 khi chưa có homepage receipt; xác nhận không sửa homepage.
- recovery-injected-commit.log expectedexit1: commit thật rồi giả lập ngắt trước result receipt. phase2-test exit0 xác nhận published/draft đã đổi và result receipt không tồn tại.
- recovery-after-commit.log và phase3-test exit0: khôi phục WingsPlus VI/EN, giữ public/draft hero/governance, rút trang mới. Script assert toàn bộ nội dung trước commit.
- Lỗi thử đầu meta.image do localeall đã được sửa bằng localevi cho withdrawal; chạy lại cả hai tình huống bằng chứng mới đều đạt.

## Bằng chứng trước release

Build/typecheck exit0;70unit,27component,28integration; targeted ESLint exit0. ARM64 Sharp selfcheck pass. App digest ce19fe40fd375fcc30d48146dd752d5e8c61274b3a3f4996281d98f9b4242ca8, ops8613cecb715bc077d643643db31a2c86b75b391f9f5ddf5281cba733ec09453b, cả hai label finalSHA/arm64. Migration status52applied.

Encrypted backup checksum f9681297e122369d1eb0774e3dc1ebeaebc70ca31c593856d89ca613226c6c7c; restore thực DBus088_restore_20261027:6sites/6homepages. Snapshot published/latestdraft đủ locale. Transaction serializable, lock _pages_v + page191, timeout5s. Injected failure/stale abort; actual Payload draft contention abort rồi rollback; full rehearsal bảo toàn.

Browser native final: desktop1679 bốncard2x2; mobileVI/EN390 document374, card342, không tràn. Hero/Group chrome/media/H1/4nhóm đúng; click CTA thật tới Group contact theo locale. Loopback form bị Origin chặn; production form hiện hữu enabled sau load, không gửi lead. HTTP bổ trợ kiểm canonical, sitemap, unknown404, không thay cho browser.

## Quy tắc cutover và rollback

Cutover code trước mọi mutation nội dung; immutable digest, readiness database/Redis/leadconfigured, tự về image cũ nếu cutover lỗi. Tạo Group draft, publish VI/EN bằng CMS đã đăng nhập; sau đó transaction homepage191; cuối cùng withdraw own372. Nếu nội dung đã đổi: rollback-content trước image cũ; exactafter-snapshot guard, không restore toànDB. Careapproved không có reference phải vềpending để không tạo bằng chứng giả. Page181 có draft riêng và được giữ nguyên.

Đang chờ kết luận follow-up độc lập; chưa ghi đã deploy hoặc story hoàn tất tại thời điểm lập tài liệu này. Bằng chứng production sẽ bổ sung validation.md sau thực thi.
- 2026-10-27 follow-up `recovery-release-review.md`: SHIP; prior P2 closed with real pre-apply and post-commit interruption/recovery tests.
- Cutover first attempt stopped before symlink/content changes: Payload migrate prompted about an existing dev-push marker. No consent was entered; stopped only own migration container. Final app has no migrations diff, so cutover now runs read-only migrate:status and requires exactly52 migration rows all applied. No marker/database metadata edits. Bounded independent review recorded separately.
# Follow-up AC7 — 2026-11-02

Owner c0508g. Candidate only, baseline8efdbbf. Ba kiểm thử FeatureGrid giữ text chính xác gồm dòng trống, một dòng và chữ dài; standard + accordion/tabs dùng pre-line/break-words. Browser bốn nhóm nội dung thật ở1440/390px không overflow; accordion mở giữ newline. Bằng chứng `followups-20261102/us088-*.log`, `us088-browser-*.json`, `us088-detail-click.json`, ảnh WingsPlus.

Codex review độc lập cuối không có P1/P2/P3: `followups-20261102/final-codex-review.md`. Không thay schema/textarea, nhập lại CMS hay deploy. Follow-up Đang rà soát/Partial, không thay lịch sử bàn giao cũ.


## Production follow-up — 2026-11-03

Production follow-up delivered 2026-11-03, owner c0508g, revision5b81a19d663f2f78a04d0e411fcfa0afbd416c4a. Bounded Payload CTA/H1 apply verified:556 page-locales/6sites,only3 changed locales,all1399 media unchanged,drafts preserved; rerun noop. ARM64 media path defect found by public browser QA, rolled back and fixed with3unit/typecheck/ESLint/build and independent Codex noP1/P2/P3. Fresh encrypted PG backup+disposable restore,28/28 migrations,immutable image gate,readiness passed. Production desktop1440/mobile390 verifies hotline0948786775,newVIH1,EN unchanged,caption scope,playing video and4WingsPlus descriptions pre-line/nooverflow. Evidence followups-20261102/PRODUCTION-REPORT.md. Technical delivery is not stakeholder acceptance; real calls/leads and physical Safari/iOS not exercised.

- Deployed code: `5b81a19d663f2f78a04d0e411fcfa0afbd416c4a`, branch `work/followups-20261102-us081-088-005`.
- Release: `/home/ubuntu/wings-travel/releases/release-5b81a19`; previous `release-us093-8efdbbf` retained.
- CMS journals remain protected on VPS at `shared/artifacts/followups-642b857/{cta-apply,heading-apply}.json`. No shared media edits or database restore performed.
- New follow-up state: **Đã bàn giao / Full**, start2026-11-02, delivery/review2026-11-03. Earlier dated candidate-only and historical delivery entries remain as history.
- Evidence: `followups-20261102/production-content-verify-final.log`, `production-media-gates-2.log`, `production-media-cutover-2.log`, `production-browser-qa.json`, four production screenshots, `production-media-codex-review.md` plus original independent reviews. No unresolved P1/P2/P3.

Resolved production findings: campaign identity now follows exact public pathname despite namespaced CMS slug; standalone preserves traced database driver packages; media directory now resolves from runtime app-root cwd. The first media-defective image was rolled back immediately after public QA; final preview tested actual1024-byte206 media response before cutover. Existing preview-store restrictions and tenant access checks remain intact.
