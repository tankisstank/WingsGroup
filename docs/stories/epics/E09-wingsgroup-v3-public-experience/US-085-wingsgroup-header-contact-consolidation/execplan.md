# Exec Plan — US-085

## Goal

Triển khai phương án A đã chốt và hotline chính WingsGroup 0948 786 775, tạo bản local review được cùng bằng chứng mới.

## Architecture and scope

Giữ Payload-first, SiteSettings.supportPhone và additionalHotlines hiện hữu. Header nhận HotlineItem[] qua Header/Component.tsx → Component.client.tsx → HeaderNav. Dùng resolveSiteHotlines, getSharedZaloCTA và luồng form/context hiện hữu; không tạo schema, dependency hay contact platform mới.

Codex sở hữu story packet, manifest Plane, Harness, prototype so sánh và handoff. Agy sở hữu thay đổi app/src, tests liên quan và script cập nhật hotline local/disposable cần thiết. Không chỉnh file của nhau trong lúc triển khai.

## Work phases

1. **23/10 — Chuẩn bị:** kiểm git baseline, đọc AGENTS và docs bắt buộc; trace đúng caller qua CodeGraph; xác định chỗ đang đọc supportPhone. Kiểm tra plan/schema không cần đổi. Đọc prototype như visual reference, không chép mock UI thay component thật.
2. **23/10 — Hotline data:** cập nhật seed/config thuộc WingsGroup; chuẩn bị hoặc tái dùng script đổi supportPhone tenant wings-group với preflight old/new/unexpected, idempotent và cache invalidation qua hook có sẵn. Rehearsal local/disposable; không chạm production.
3. **23–26/10 — Header:** gộp CTA/hotline/Zalo thành một cụm vàng tách link gọi và disclosure button, dropdown có hotline phụ/Zalo/form; copy VI/EN; compact mobile và locale switcher. Scope điều kiện wings-group + v3; giữ các nhánh site con.
4. **26/10 — Kiểm chứng:** focused unit/component, typecheck/lint, build hoặc verify gate hiện hữu, browser real với main/subroutes VI/EN và đủ breakpoint; kiểm collision, không chỉ scrollWidth. Chụp ảnh/log sau sửa cuối.
5. **26/10 — Review:** agy gửi danh sách file, command/exit code, finding/giới hạn và evidence; Codex review độc lập trước đóng story. Chỉ cập nhật trạng thái theo bằng chứng.
6. **Sau review/approval phát hành riêng:** chạy runbook Oracle ARM64, backup/rollback, apply hotline CMS có điều kiện, revalidate cache và smoke live. Đây là bước dự kiến cho lần release, chưa được thực hiện/ủy quyền trong nhiệm vụ này.

## Risk classification

High-risk: public contract, desktop/mobile, shared components/tenant isolation, existing consultation behavior và CMS-configured contact number. Không cần schema migration; nếu phát hiện cần đổi luồng multisite hoặc schema, gửi đề xuất cho Codex consultation trước code phần đó.

## Validation and acceptance

Xem design.md và validation.md. Tất cả finding P1/P2/P3 phải ghi nhận và xử lý trước hoàn tất. Không tuyên bố test prototype tương đương QA app. Không đóng US/đánh dấu production sau chỉ local test.

## Progress — 2026-10-23

Agy đã triển khai A, đổi main local/seed WingsGroup sang 0948786775 và sửa F1–F6 sau Codex review. Source đã đóng băng; báo cáo agy-fixes-report.md được đối chiếu bằng recheck độc lập. Unit 58/58, component 45/45, release gate 16/16, browser 44/44, tsc/build/postbuild exit 0; xem audit.md/validation.md và codex-recheck/. Codex đồng bộ fidelity contract và contact register, giữ số tenant khác và baseline generated types.

Engineering local review đạt trước target 2026-10-26. Story vẫn in_progress, Plane Chờ xác nhận / Partial; cần integration PostgreSQL/Redis và release/apply/revalidate/rollback riêng trước khi đánh dấu phát hành. Không deploy/push/ghi CMS production trong lượt này.

## Stop conditions

Không tự deploy/push hoặc ghi production CMS. Không sửa/reset thay đổi có sẵn của người khác; baseline có app/scripts/lib/postgresCrudSmokeLifecycle.mjs và nhiều untracked deploy/artifact không thuộc US-085. Nếu công cụ chặn, ghi lỗi cụ thể, thử cách an toàn trong phạm vi và báo blocker; không giả lập bằng chứng.

## Production execution completed — supersedes historical release restriction

Người dùng đã ủy quyền rõ deploy và ghi CMS production sau local review. Codex triển khai release6a0dac0 ngày2026-10-23 lúc15:12:01+07, trước mục tiêu engineering2026-10-26. Fresh isolated build58 unit/45 component/release gate đạt; encrypted backup + real PostgreSQL restore, updater row lock rehearsal/apply, ARM64 smoke,44 public layout cases, keyboard/inquiry và8 cross-site cases đạt. Main0948786775, hai số phụ và các tenant khác giữ nguyên. Không push.

Bản trước0701404 và backup được giữ để rollback. Không áp migration mới; existing dev-push warning được dừng trước xác nhận, toàn bộ28 migration đã applied. Release report, consultation dispositions, command outputs và giới hạn: header-a-implementation-20261023/production-release/release-report.md. Harness implemented; Plane Đã bàn giao / Full theo proof, không phải nghiệm thu khách hàng. Các mục no-deploy/no-production-write phía trên là ràng buộc của giai đoạn implementation trước khi có ủy quyền mới.

## Footer follow-up — 2026-10-23

Mở lại US-085 theo phản hồi cuối trang dư kênh liên hệ. Codex sửa shared contact section/CSS/test; agy sửa Footer và footerHotlines tests trong pane hiện hữu. Không đổi schema/CMS; chỉ WingsGroup v3. Cạnh form còn một link gọi chính, footer còn một hotline/một email; header giữ kênh phụ.

Local implementation/review hoàn tất:59 component, tsc/lint/build/postbuild exit0;16 browser cases home/contact VI/EN ×320/390/768/1280 đạt. Codex đã xử lý finding và xem ảnh sau sửa. Proof và giới hạn: footer-contact-review-20261023/review.md. Harness mở lại in_progress, Plane Chờ xác nhận / Partial. Header vẫn live6a0dac0; footer mới chưa deploy/ghi production. Khi phát hành footer, dùng release riêng theo runbook ARM64 và audit trước triển khai, không seed/xóa hotline/email CMS.

## Footer production execution — 2026-10-23

Người dùng đã đồng ý deploy thay đổi footer. Isolated release `d6057d4` từ đúng live6a0dac0, chỉ6 file app/tests, được Codex audit và agy review/test độc lập trước phát hành. Install/build/postbuild/release gates qua; fresh59 component, encrypted backup + real restore,28 applied migration status và ARM64 native smoke qua. Không migration/schema push/CMS write/Redis flush.

Cutover lúc21:29:13+07; candidate12/12 và public24/24 browser cases qua. Settings của6 site và4 additional-hotline rows không thay đổi. Bản cũ được pin theo immutable image để rollback, không push. Báo cáo, commands, ảnh và giới hạn: footer-contact-review-20261023/production-release/release-report.md. Harness implemented và Plane Đã bàn giao / Full theo proof; target engineering26/10 giữ để bảo toàn kế hoạch gốc. Các đoạn pending/no-deploy trên đây lưu lịch sử trước khi được ủy quyền mới.
