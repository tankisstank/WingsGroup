# Validation — US-085

## Current follow-up — footer, 2026-10-23

**Production deployed / Đã bàn giao.** Người dùng đã ủy quyền deploy footer. Release `d6057d41c2b3897b27cbd656356f83873d652870` activated at `2026-10-23T14:29:13Z` (21:29:13+07). Cạnh form còn một link gọi, footer V3 còn một hotline/một email; hotline phụ và Zalo vẫn trong header. Không sửa CMS/schema hay các tenant khác. Báo cáo hiện hành: footer-contact-review-20261023/production-release/release-report.md.

Fresh scoped component59/59, tsc, TS/TSX lint và build/postbuild exit0. Browser16/16 home/contact VI/EN ×320/390/768/1280 sau sửa cuối, gồm link gọi44px và không overflow. Build Windows/local SQLite, chưa phải ARM64; generated payload-types.ts giữ nguyên hash trước/sau. Codex review đã xử lý fixture sai phoneNumber, duplicate markup, invalid raw phone fallback và icon lệch dòng. Chi tiết/lệnh/log/ảnh: footer-contact-review-20261023/review.md.

Isolated production candidate: install/build/postbuild và release gates exit0, fresh component59/59. Encrypted backup4786606bytes và real PostgreSQL restore6 sites/6 homepages qua; migrate:status28/28 applied, không chạy migration/schema push. ARM64 libsql write/read và sharp/libvips qua. Candidate UI12/12 (6 routes ×320/1280); public production UI24/24 (6 routes ×320/390/768/1280), gồm link gọi44px, đúng số/email, không lặp kênh và không overflow. Fingerprint toàn bộ6 site-settings và4 additional-hotline rows trước/sau giống nhau. PostgreSQL/Redis/leadDelivery ready, restart0; immutable image/build match exact candidate.

Live follow-up:8/8 checks WingsGo/WingSide ở390/1280; WingSide/en chuyển về trang canonical tiếng Anh/, không tính là locale mới. Hai luồng liên hệ VI/EN qua: popup giữ2 số phụ/Zalo/inquiry, Tab/Escape/focus đúng; GET cấu hình form200, available/enabledtrue, có consent checkbox và privacy link, không submit. Codex đã xem live-footer-en-320.png và live-contact-vi-1280.png; browser errors[]. Temporary candidate/restore DB và local helpers đã dọn. Final runtime21:46+07 vẫn ready/restart0, backup và image rollback giữ nguyên; VPS2.6GB trống. Các lỗi giả định của runner và kết quả mới sau sửa được lưu trong release-report.md.

Harness implemented; Plane sync patched5/missing0, readback PASS: đúng project/E09, US và4 children Đã bàn giao, owner/dates đầy đủ, generic child0. Target kỹ thuật26/10 giữ nguyên; actual footer delivery23/10, không đồng nghĩa khách hàng đã nghiệm thu.

Local lead configuration400 là quan sát lịch sử trên fixture, không chứng minh lỗi production. Không gọi/chat thật, không gửi lead hoặc kiểm thiết bị vật lý/full suites. Phần dưới lưu bằng chứng riêng của header release6a0dac0; không dùng số lượng test header làm kết quả mới của footer.

## Historical header production proof

**Production deployed / Đã bàn giao — 2026-10-23.** User explicitly authorized deploy and production CMS write. Candidate6a0dac015340f7279bfe352e377193c38b3d0d91 activated at08:12:01Z (15:12:01+07), hotline0948786775 persisted through Payload for WingsGroup only. Delivery is not stakeholder acceptance.

Full operational report: header-a-implementation-20261023/production-release/release-report.md. Earlier local review and historical failed evidence remain in audit.md and codex-review/.

| Layer | Actual result |
| --- | --- |
| Candidate build | Isolated worktree based on live0701404; pnpm install --offline --frozen-lockfile and pnpm run build/postbuild exit0; no unrelated diff or schema changes. |
| Unit/component | Fresh candidate58/58 unit and45/45 component, both exit0. Earlier tsc/lint exit0; lint17 existing any warnings. Earlier release-gate node tests16/16. Actual candidate release gate approved, exit0. |
| Backup/restore | Encrypted PostgreSQL backup4786535bytes, SHA c32a55aa5fc22471039539ce95f2cbb8d52af15dffd7df8a005028c91f9797b0. Real disposable restore passed,6 sites/6 homepages. |
| CMS integration | Same candidate ops image: updater rehearsal on restored PostgreSQL then production apply. Row lock + shared Payload transaction; one write, second execution noop. Every settings document compared; only WingsGroup supportPhone/updatedAt changed. Additional hotlines and all other tenants/fields preserved. |
| Migration | Fresh immutable ops migrate:status exit0; all28 applied. Existing dev-push warning stopped before confirmation. No new migration, force or DB push. |
| ARM64/platform | Correct immutable ops revision; app libsql read/write and sharp/libvips PNG90bytes passed. Active image/build match candidate; PostgreSQL/Redis up, delivery configured, restart0. |
| Candidate UI |4/4 VI/EN ×320/1280 via tunnel with correct tenant Host. |
| Public production UI |44/44 cases,4 routes ×11 widths320..1536, no collision/clipping/overflow, popup in viewport, targets≥44px, EN labels and VI/EN pseudo labels correct. |
| Keyboard/form | VI/EN popup/drawer Escape restores focus. Inquiry navigation passed both locales twice after exact URL/document-ready wait; full-name focused, outbound context preserved, no second dialog. No submission. |
| Cross-site |8 browser checks WingsGo/WingSide at390/1280; no Group control/number leak, WingsGo EN accessible label correct. Data assertions covered all6 sites. |
| Contact consistency | Public VI5 / EN4 links to new main and zero old main links. Actual visible FAB opens original dialog with new phone and preserved additional numbers; Escape closes. |
| Visual/runtime | Codex viewed live-en-320-popup.png and live-vi-1280-popup.png. Final browser exception buffer empty. App stays healthy. |

## Commands and evidence

From candidate app: pnpm run build; pnpm run test:unit -- six targeted files; pnpm run test:component -- five files; node scripts/wingsgroup-v3-release-gates.mjs --json. Exact file arguments are captured in production-release/release-report.md and logs. Package via deploy/oracle/package-release.ps1, native relinking via generate-symlinks.js; archive17155 entries with no env/public-media.

Production-release scripts and outputs: backup-restore.*, cms-operation.mts, run-cms.sh, cms-rehearsal.log, cms-production-apply.log, migration-* logs, candidate-build.log, cutover.log, final-runtime.log, check-layout.ps1/browser-measurements.json, check-keyboard.ps1/keyboard-results.json, check-inquiry.ps1/inquiry-results*.json, check-tenants.ps1/tenant-browser-results.json, live-phone-links-*.json, fab-dialog-final.txt and browser-errors.json.

First inquiry report retained: its wait could succeed before destination document readiness. Corrected runner waits exact URL+complete document+focused field; two subsequent full runs passed without application modification. Candidate localhost alias404 was resolved by correct tenant host routing. These tool observations are not hidden as successes.

## Limits

Real calls, external Zalo conversations, lead submissions, physical devices, true browser200% zoom and full repository E2E/integration suites were not run. Scoped restored PostgreSQL/Redis, actual ARM64 and live browser proof passed. Existing dev-push marker remains; no schema write. VPS3.6GB free after release, historical rollback artifacts retained.

## Tracking

Harness implemented with scoped unit/integration/E2E/platform proof. Plane intended state Đã bàn giao / Full, with EpicE09 and four named children. Final sync and readback are recorded in production-release/plane-*.log/json; completion does not imply client acceptance. Original engineering target2026-10-26 retained; delivery occurred2026-10-23.
