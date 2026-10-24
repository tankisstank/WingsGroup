# Codex review — WingsGo footer follow-up, 23/10/2026

## Phạm vi và quyết định

Root Codex review source, unit/component logs, Payload rehearsal và browser production-build proof sau thay đổi; agy hiện hữu là reviewer tích hợp độc lập. Bản sửa cục bộ đạt hợp đồng footer mới. **Chưa đóng story hoặc xác nhận production release.** Intake150, candidate từ live `d6057d4`, evidence `wingsgo-footer-review-20261023/review.md`.

| Mức | Finding | Xử lý / trạng thái |
| --- | --- | --- |
| P1 | Không có lỗi P1 được xác nhận trong phạm vi local đã thử | Không suy thành đảm bảo mọi môi trường |
| P2 | CMS main đang là số cũ; chỉ đổi fallback sẽ tiếp tục hiển thị số cũ | Updater có old→new guard, site lookup duy nhất, plan mặc định, custom/invalid abort và repeat noop; SQLite6 settings giữ nguyên mọi trường khác. Production data chưa đổi |
| P2 | Local API overrideAccess không bỏ hook xác thực | Đã tái hiện lỗi, dùng context seed theo pattern migration nội bộ; không nới access/public endpoint; rehearsal mới exit0 |
| P2 | Read→write CMS có race nếu dùng CLI apply độc lập khi editor sửa đồng thời | **Release gate đã đóng:** production wrapper dùng shared req/transaction, row lock đúng site với timeout và so sánh all6 settings/repeat trước commit; apply PostgreSQL production đã đạt |
| P2 | Floating contact có thể ẩn trigger khi dialog mở hoặc làm mất focus sau Escape | Điều kiện ẩn có !open, dialog giữ nguyên; focus chuyển sang footer call. Component và browser thật đã qua |
| P2 | Forced-light chỉ che selector có thể vẫn nhận dark cũ | SSR light + provider guard WingsGo/Group; client tests và browser lưu dark/reload + fetch HTML gốc đã qua. Không tác động tenant khác |
| P3 | Rule span footer tạo pill lồng làm nút gọi xấu | Bỏ span WingGo thừa;14 footer tests, build và20 browser cases sau sửa đều qua, ảnh mới đã xem |
| P3 | Báo cáo agy trích nhiều ví dụ không đúng source và quá mức chứng minh | Giữ raw report, root disposition chi tiết trong review.md; dùng log test và source thực làm căn cứ, không dùng narrative làm proof |
| P3 | Build sinh diff payload-types theo môi trường Media sizes | Generated artifact không thuộc18 file phạm vi; không thay collection/migration, không sửa generated types có sẵn ở main workspace |

## Kiểm tra rủi ro kiến trúc

- **Multisite:** scope compact footer bằng isWingsGo; Group V3 giữ compact cũ, Group legacy và WingSide có regression tests. Không thay siteField, queries site-scoped; updater không chạm số tenant khác.
- **Cache/stale reads:** component tiếp tục lấy settings resolver/cache hiện hữu; updater dùng Payload hook. Chưa có write production, nên cần invalidate đúng site sau transaction ở release; không flush toàn Redis.
- **Migration:** không có schema mới, DDL hay dependency thay đổi. Không dùng seed-subsites để chuyển production vì có nội dung ngoài phạm vi; chỉ updater main.
- **CMS safety:** giữ phone custom, additionalHotlines, email, addresses/nav ngoài phần render;6 settings được so sánh sâu trong local fixture. Fixture không thay DB nguồn, Redis rỗng và DB push=false.
- **Availability:** production đã restart/cutover thành công. ARM64 image/native/readiness, backup/restore mới và rollback image digest cùng symlink đã được kiểm tra; VPS còn khoảng 1.3GB trống sau release.
- **Accessibility:** link gọi chuẩn tel, target tối thiểu44px, focus-visible và Escape restoration; browser không tràn ngang320–1280px. Chưa audit WCAG toàn diện/thiết bị thật.

## Evidence sau sửa

21 unit;94 component trước sửa span và14 footer sau sửa span; build/postbuild/TypeScript exit0; lint0 errors/8 warnings baseline; CMS rehearsal riêng exit0;20 browser cases exit0, no exceptions;2 ảnh mới được xem. Các lệnh, failed-first logs và giới hạn được ghi trong review.md, không xóa evidence lỗi.

**Kết luận:** đủ review bản sửa và đề xuất rollout. Chưa đủ tuyên bố đã sửa WingsGo production hoặc đóng release khi PostgreSQL transaction rehearsal, ARM64/public smoke và phạm vi deploy/CMS chưa hoàn tất.

## Production release review addendum — 24/10/2026

Các gate P2 đã đóng:

- Shared transaction/row lock: wrapper production đã dùng request transaction và `SELECT ... FOR UPDATE` trên settings WingsGo; assertion 1 write, deep comparison 6 settings và idempotent repeat đều đạt.
- PostgreSQL safety: fresh encrypted backup + full-site restore drill đạt trước apply; migration status 28/28 applied, không pending.
- Cache: sau commit wrapper gọi invalidate cache theo site ID; readiness sau cutover cho database/Redis/lead delivery đều đạt.
- ARM64/public release: operations image label khớp revision `16ff60a28ba48489d7d06de648780c522372e13f`; app image chạy đúng candidate digest; browser QA bốn route VI/EN đạt.

Release vẫn có giới hạn: chưa gọi số/Zalo/gửi lead thật, chưa test Safari/iOS và chưa có stakeholder UAT. Đây là giới hạn nghiệm thu, không phải blocker kỹ thuật deploy.


