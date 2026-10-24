# WingsGo footer correction — 23/10/2026

## Trạng thái và nguyên nhân

**Bản sửa đã được kiểm chứng và đã triển khai WingsGo production trong follow-up này.** US-081 / Epic E07 / WingsGo được mở lại, intake Harness #150. Release đang chạy `d6057d41c2b3897b27cbd656356f83873d652870` trước đó rút gọn WingsGroup; nhánh WingsGo vẫn giữ thiết kế đa hotline cũ. Production CMS WingsGo cũng còn main `0912910101`. Thay fallback không tự ghi đè giá trị CMS hợp lệ, nên cần một bước dữ liệu riêng.

Baseline public thực tế (`production-before.json`): footer có **4 link gọi** (main lặp hai lần, hai số phụ), **2 email**, **2 Zalo** và **1 theme selector**; còn trigger liên hệ nổi. Đọc PostgreSQL production ở chế độ read-only xác nhận WingsGo settings16 main cũ; WingsGroup settings14 main mới. Không ghi dữ liệu production.

## Đã thay đổi

- Footer WingsGo giữ **một nút “Gọi ngay: 0948 786 775” / “Call now”** và **một email ưu tiên support rồi sales**. Bỏ cột nhận tư vấn lặp, số phụ, Zalo và mục liên hệ/Zalo trùng trong navigation; giữ địa chỉ pháp lý và navigation thông tin.
- WingsGo cố định light ở HTML SSR và ThemeProvider; bỏ selector thực sự, bỏ tác động từ stored dark. WingsSide/tenant khác giữ cơ chế cũ.
- FAB WingsGo ẩn khi footer hiện, hiện lại khi rời footer. Dialog đã mở không bị đóng do cuộn; Escape đóng và focus về nút gọi footer.
- Header/dialog vẫn giữ hotline phụ và Zalo. Form WingsGo dùng hotline CMS đã truyền từ RenderBlocks, thay ba literal số cũ. Không đổi submit flow.
- Resolver fallback và seed riêng WingsGo dùng số mới. Không thay số WingsSide hoặc chạy lại seed toàn site.
- Updater mặc định plan; chỉ main cũ đúng WingsGo được đổi. New/empty → noop, custom/invalid → abort; không thay additionalHotlines. Trusted migration dùng `context: { seed: true }` đúng pattern sẵn có, không sửa access hook.
- Agy hiện hữu `wP:p1` sở hữu provider/layout/theme tests và chạy kiểm thử tích hợp; Codex sở hữu phần còn lại, rehearsal, browser, review và tracking.

## Kiểm chứng thực tế

Candidate: `wingsgo-footer-review-20261023/candidate`, tách từ đúng release đang chạy; 18 file ứng dụng/tests được chọn, không gộp dirty changes khác. SQLite là bản sao nhất quán riêng, Redis tắt, DB push tắt. `.env` không xuất ra log.

| Lệnh / phép kiểm | Kết quả và bằng chứng |
| --- | --- |
| `pnpm install --offline --frozen-lockfile` | Exit0, `install.log` |
| Targeted `pnpm run test:unit -- tests/unit/siteHotlines.unit.spec.ts tests/unit/updateWingsGoHotline.unit.spec.ts` | **21/21**, exit0, `unit-final.log` |
| Agy: 9 related component specs | **94/94**, exit0, `agy-component-final.log` |
| `pnpm run test:component -- tests/component/footerHotlines.component.spec.tsx` sau sửa span CSS | **14/14**, exit0, `footer-component-final.log`, 22:31:44+07 |
| `pnpm exec tsc --noEmit --incremental false` | Exit0, `typecheck.log`; build cuối cũng chạy TypeScript thành công |
| Targeted ESLint | Exit0, **0 errors / 8 warnings**, `agy-lint-final.log`: 6 any seed có sẵn, 1 ignored generated type, 1 unused import test có sẵn |
| `pnpm exec tsx ../../rehearse-local.mts` từ candidate/app với config candidate | Exit0, `cms-rehearsal-final.log`: plan không ghi; apply chỉ main/updatedAt; repeat không ghi; so sánh cả6 settings, giữ5 site và mọi trường khác |
| `pnpm run build` và postbuild | Exit0, `build-final.log`, compile20.3s và TypeScript28.5s; không đổi schema/dependency/migration |
| `node --env-file=.env .next/standalone/server.js` và proxy Host cục bộ | Chạy production build theo tên miền, chỉ bind loopback. Không dùng alias localhost làm bằng chứng production routing |
| `.\check-browser.ps1` | **20/20 ca**, exit0, `browser-final.log` và `browser-results.json`, 22:34:24+07 |

16 ca WingsGo = home/contact × VI/EN × 320/390/768/1280px. Mỗi ca xác nhận đúng site/locale, footer một tel mới/một email, không selector/Zalo/advice trùng, target gọi44px trở lên, không tràn ngang, không còn link tel main cũ trên các trang thử, FAB ẩn tại footer và hiện lại khi cuộn lên. Bốn ca WingsGroup/WingsSide 390/1280px xác nhận nhánh footer không lẫn WingGo.

Kiểm tra tương tác thật: lưu dark rồi reload WingsGo vẫn light; fetch HTML gốc có `data-theme="light"`; mở dialog, cuộn xuống footer, dialog vẫn hiện; Escape đóng và focus nút gọi footer. Browser exceptions **[]**. Hai ảnh cuối đã mở xem: `footer-vi-desktop.png`, `footer-en-mobile.png`.

## Lỗi phát hiện và xử lý

- Lần component đầu93/94: expectation WingGo cũ nằm trong suite chrome WingsSide. Cập nhật đúng case WingGo, không đổi số WingsSide; chạy lại94/94.
- Fixture local có custom main `+84 903000111`: updater abort đúng thiết kế. Chỉ fixture riêng được chuẩn bị về số cũ để rehearsal, không ghi DB nguồn/production.
- Lần rehearsal đầu lỗi “Authentication is required”: overrideAccess không bỏ hook beforeChange. Dùng trusted seed context như các migration hiện hữu; chạy lại thành công.
- Xem ảnh phát hiện span nhãn nút bị rule `.site-footer__contacts span` tạo pill lồng. Bỏ span thừa; chạy lại14 footer tests, build và toàn bộ browser proof mới.
- Runner ban đầu `next start` cảnh báo standalone, alias localhost404 do production host contract. Đổi sang standalone server + proxy Host thực; không sửa tenant routing.
- Build/Payload tự tạo lại `payload-types.ts` theo môi trường; không coi diff generated Media sizes này là thay đổi schema hay đưa vào phạm vi18 file. Main workspace generated types có từ trước được giữ nguyên.

## Review độc lập và giới hạn của nhận xét agy

Raw report/log của agy được giữ nguyên để đối chiếu. Codex đọc source thật và bác các mô tả không chính xác trong narrative: nav hiện lọc Contact/Liên hệ/Zalo, không có bộ lọc tel được trích dẫn; không sửa copyright; không có wrapper ThemeSelector như ví dụ; updater **chỉ supportPhone**, không additionalHotlines; custom main **abort**, không noop; fallback main WingGo vẫn áp dụng khi thiếu/invalid theo hợp đồng cũ, còn []/null additional chỉ xóa số phụ. Form/FAB nhận prop[] thì không tự sinh link. Theme tests là client tests, không tự chứng minh SSR; bằng chứng SSR riêng ở browser proof. Form nhận prop từ RenderBlocks, không lấy layout context. Hai headerHotlines tests là WingsGo; OptionA WingsGroup có suite12 riêng. Không suy từ kết quả này ra WCAG đầy đủ hoặc 100% no-flash trên mọi thiết bị.

Root audit chi tiết: `docs/stories/epics/E07-tour-product-platform/US-081-wingsgo-multi-hotlines/audit.md`.

## Kế hoạch production có thể duyệt

1. Chốt đúng18 file từ candidate và review diff; giữ nguyên schema/dependencies, không dùng dirty workspace làm release. Đọc runbook Oracle ARM64 và package bằng `deploy/oracle/package-release.ps1`, native binaries bằng `generate-symlinks.js`.
2. Thực hiện release audit Codex trước phát hành; lấy backup PostgreSQL mã hóa mới và restore thật trên DB riêng. Kiểm tra28 migrations đã áp dụng, không chạy DDL mới. Kiểm tra dung lượng trước build; không tự prune tài nguyên release cũ.
3. Rehearse updater với shared Payload request/transaction và `SELECT ... FOR UPDATE` theo siteID tìm qua code, lock timeout5s như wrapper release header trước. Chỉ old→new, assert chỉ main/updatedAt đổi, repeat noop, toàn bộ6 settings và hotline phụ giữ nguyên. Không dùng ID16 hardcode vì fixture local là18. CLI apply không kèm row lock chưa phải thao tác production đã duyệt.
4. Build image ARM64 mới; giữ immutable digest và current symlink cũ làm rollback. Chạy candidate riêng với main mới trên DB restore; kiểm tra readiness DB/Redis/lead delivery, native sharp/libsql và browser VI/EN/tenant.
5. Khi phạm vi WingsGo deploy/CMS được xác nhận: cập nhật main qua wrapper có khóa và Payload hooks, invalidate đúng site cache; cutover app, kiểm tra public footer/header/contact VI/EN và tenant khác. Nếu lỗi rollback image **và** symlink; dữ liệu phone rollback chỉ khi vẫn đúng giá trị do release ghi, không đè chỉnh sửa CMS mới.

Đã có production write/cutover cho follow-up này. US-081 đã được bàn giao kỹ thuật; stakeholder UAT vẫn chờ xác nhận.

## Tracking và kết thúc QA

`plane:preview` exit0:1 story/4 child. `plane:sync:workitems` exit0:patched5/missing0. API readback22:40+07 (`plane-readback.log`) xác nhận đúng project WingsGo, Epic E07, US081 có4 child tên cụ thể, owner c0508g,0 missingDates/0 genericChildNames. Giữ lịch gốc parent19–22/10 và từng child19/20/21/22; không tự dời hạn cũ. Kiểm lần đầu phát hiện owner trống, đã gán owner và nhãn bug/content/uat theo skill rồi đọc lại. Plane không hỗ trợ Initiative trên plan hiện tại; mapping Project/Epic/US không bị ảnh hưởng.

`source-manifest.json` ghi SHA256 của18 file đã so sánh main/candidate giống nhau, base commit và buildID `5Ldw8c9J0JVnrfUO-XFYc`. Candidate generated payload-types đã trả về HEAD riêng của candidate sau QA; không sửa file generated có sẵn ở main. Browser và server/proxy cục bộ của phiên đã dừng; không còn listener3192–3195. Không commit/push; đã deploy production theo ủy quyền của người dùng.

Chưa kiểm: quay số/chát Zalo/gửi lead thật, thiết bị vật lý, Safari/iOS, toàn bộ repository suite; PostgreSQL/ARM64/public proof của follow-up còn là release gate.

## Production release addendum — 24/10/2026

Follow-up đã được triển khai production trên Oracle VPS ARM64.

- Candidate release revision: `16ff60a28ba48489d7d06de648780c522372e13f`.
- Operations image: `sha256:f9a0f53174fcacd34465a6745f45f4c80f8592aedec54baa077ce5600ea57ec8`; label revision khớp candidate.
- Backup/restore gate: backup mã hóa mới `shared/backups/release-us081-wingsgo-d1d1030/wingstravel-2026-10-23T17-33-32-306Z.dump.age`, checksum `88a00dc36d1b186f2e212b62fdef0334f6e545197edcee9997f9e76e2d500aeb`; restore thử nghiệm full-site đạt `activeSites=6`, `homepages=6`, rồi đã xóa DB tạm.
- Migration gate: `migrate` exit 0; `migrate:status` xác nhận 28/28 migration `Yes`, không pending. CLI chạy trong container tạm đã loại file `.env.example` SQLite khỏi image runtime.
- CMS apply: WingsGo site `wings-go`, settings ID16; transaction có `FOR UPDATE`, đúng 1 write, `0912910101 → 0948786775`, repeat là noop, 6 settings được so sánh và site khác giữ nguyên; cache site được invalidate.
- Cutover: `current` trỏ `release-us081-wingsgo-16ff60a`; app image container trùng digest candidate `sha256:6ff0106b45f4eba6a5019e502891903a7103105ca893a65602bbabac5e1a8f27`.
- Health sau cutover: database/leadDelivery/redis đều `up`, status `ready`.
- Production browser QA: `/`, `/en`, `/lien-he`, `/en/lien-he` đều có đúng 1 footer `tel`, 1 email, 0 theme toggle; ảnh `production-home.png`, `production-en-footer-mobile.png`; browser errors/console rỗng.

US-081 đã được bàn giao kỹ thuật production; stakeholder UAT, gọi số thật, Zalo thật, lead submission thật và Safari/iOS chưa được kiểm tra.

