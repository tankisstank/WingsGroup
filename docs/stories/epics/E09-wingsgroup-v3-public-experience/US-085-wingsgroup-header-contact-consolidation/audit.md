# Codex review — US-085, 2026-10-23

## Footer release audit — 2026-10-23

Phản hồi mới: ba hotline/hai email/Zalo lặp cả cạnh form và footer. Codex review độc lập phần Footer do agy thực hiện; chỉ V3 được rút gọn. Giữ CMS, tenant isolation, protected email, native tel link, form và legal/privacy; không đổi schema/cache/luồng ghi dữ liệu.

Finding đã xử lý: duplicate contact markup (P3), fixture phone sai field phoneNumber có thể false-positive (P2), invalid supportPhone rơi xuống raw tel khi có email (P2), icon điện thoại lệch dòng trên mobile (P3). Có component test cho CMS override, empty/invalid, email fallback, VI/EN, non-V3 và các tenant khác. Không còn finding trong phạm vi local này.

Fresh59 component, tsc, TS/TSX lint và build/postbuild exit0;16 browser cases sau sửa cuối exit0, ảnh EN320 được Codex xem. Hai runner failures do Windows encoding và computed flex blockification được ghi riêng. Biên bản đầy đủ: footer-contact-review-20261023/review.md, agy-report.txt và browser-results*.json. Build không đổi payload-types.ts sẵn có (SHA2564078D1ADF10C2B9C840CFEC244E16D34FB737E39F90288E282AA959EC2799D11 trước/sau).

Footer đã deploy theo ủy quyền người dùng: `d6057d4`, 21:29:13+07 ngày2026-10-23. Codex audit đúng6 file diff từ live6a0dac0; agy review bổ sung và fresh59/59 component tests. Biên bản: footer-contact-review-20261023/production-release/codex-release-review.md và agy-release-review.md. Các diễn giải agy về empty hotline,44px/WCAG, rollback và cache được Codex hiệu chỉnh trong biên bản; không còn finding mở trong phạm vi release.

Release dùng immutable ARM64 image, fresh encrypted backup + real restore,28 applied migrations, không DDL/CMS writes/Redis flush. Candidate12/12 và public24/24 browser cases qua; whole settings/additional-hotline fingerprints giữ nguyên. Rollback phải retag image pin cũ và phục hồi symlink rồi recreate riêng app; không hứa thời gian rollback. Chi tiết mới và giới hạn: production-release/release-report.md trong thư mục footer-contact-review-20261023. Historical header delivery bên dưới giữ nguyên.

Local lead-config400 chỉ là bằng chứng fixture local. Không gọi/chat thật, không kiểm physical devices/full suites. Delivery theo proof không thay thế nghiệm thu của khách hàng.

Final live smoke:8/8 tenant checks,2/2 VI/EN contact-channel/focus/form-config checks, errors[], hai ảnh live được Codex xem. Runner đã hiệu chỉnh dựa trên bằng chứng: chờ actual ready sau navigation timeout; WingSide/en canonical về/; WingSide Zalo là cấu hình tùy chọn trong nhánh cũ; consent dùng accessible role=checkbox thay native required input. Không sửa app để làm qua test. Original failures và fresh passes giữ trong production-release. Cleanup chỉ candidate/restore/helpers của phiên này; runtime21:46+07 vẫn ready/restart0, backup và pinned previous image tồn tại. Plane readback PASS, đúng E09 và4 children có owner/dates, không generic title.

## Verdict

**Local review PASS sau sửa; chưa phê duyệt phát hành.** Agy đã xử lý F1–F5 và F6 phát hiện trong vòng kiểm lại. Codex xác nhận 58 unit, 45 component, 16 release-gate tests và 44 cases browser qua; typecheck và build/postbuild exit 0. Chi tiết mới ở phần Recheck bên dưới. Story vẫn in_progress, Plane Chờ xác nhận / Partial vì chưa có bằng chứng PostgreSQL/Redis và phát hành. Phần còn lại trước Recheck lưu nguyên quan sát của vòng review đầu.

Reviewer: Codex, độc lập với implementer agy tại pane `wP:p1`. Đã đọc báo cáo `header-a-implementation-20261023/agy-implementation.md`, diff, code/callers qua CodeGraph và chạy lại test/browser thật. Đây là Codex consultation/audit; kết quả không phải release approval.

## Findings vòng review đầu

### F1 — P2: Script ghi lại hotline CMS đã chủ động xóa và báo noop khi vẫn ghi

- Vị trí: `app/scripts/updateWingsGroupHotline.ts:53`, `:103`, `:111`; fallback contact cần đối chiếu tại `app/src/blocks/WingsGroupContact/Component.tsx:62`.
- Hợp đồng đã duyệt: đổi main old→new, new→no-op, giữ nguyên additionalHotlines và trạng thái CMS-cleared. Code hiện coi main null/empty là cần tự điền, additionalHotlines null/[] là cần thêm lại hai số mặc định.
- Reproduce bằng mock Payload có settings main `0948786775`, additional `[]`: hàm trả `status: noop` nhưng gọi `payload.update` để ghi hai hotline phụ. Với main cũ + `[]`, vừa đổi main vừa chèn lại hai số phụ. Main null cũng được tự điền. Không có ghi DB thật trong reproducer.
- Tác động: công cụ đổi một số chính có thể khôi phục kênh liên hệ đã bị CMS manager chủ động bỏ; status/đánh giá idempotency không phản ánh write thật.
- Cần sửa: script chỉ đổi main khi khớp giá trị được phép; không sửa additionalHotlines, không coi explicit empty là số cũ; new main phải thật sự không write. Kiểm contact fallback để `hotlines=[]` không tự tạo số ngoài CMS. Bổ sung test wrapper Payload, gồm old/new/custom/empty và xác nhận trường ghi, số lần ghi.
- Evidence: `header-a-implementation-20261023/codex-review/hotline-update-check.log` và `check-hotline-update.mts`; exit **1**, timestamp 2026-10-23T05:51:51.638Z.

### F2 — P2: 320px còn va chạm logo/cụm gọi và dropdown bị cắt mép trái

- Vị trí: `app/src/app/(frontend)/wingsgroup-v3.css:930` (`right: -48px` cho popup mobile) và bố cục `.site-header__bar` / `.site-header__nav` / kích thước cụm gọi.
- Browser thật: 4/44 trường hợp layout fail, đều ở 320px trên homepage và `/ve-wingsgroup`, cả VI/EN. Hộp logo và cụm gọi lấn nhau **2.453125px VI**, **1.75px EN**. Popup có `left: -3`, `right: 285`, `width: 288`; document vẫn không overflow ngang.
- Tác động: chưa đạt yêu cầu không va chạm/cắt nội dung. Kiểm scrollWidth không phát hiện được lỗi này; dữ liệu agy ở mobile đang trả contactBox toàn số 0 nên chưa chứng minh cụm gọi mobile không va chạm.
- Cần sửa: điều chỉnh kích thước/gap ở mobile từ constraint thật; canh popup theo vùng an toàn viewport. Kiểm lại 320/375/390 và các breakpoint, không dùng overflow hidden để che lỗi.
- Evidence: `codex-review/browser-measurements.json` (44 cases, layout pass **40**, fail **4**) và `codex-review/en-320-popup-clipping.png`. Desktop 1200–1536px qua cả hai locale/trang, số main đúng.

### F3 — P2: Dropdown hotline mobile EN vẫn dùng nhãn VI

- Vị trí: `app/src/Header/Nav/index.tsx:794`–`:805`.
- Desktop và drawer dùng `resolveHotlineItemLabel`; popup mobile dùng `item.label || defaultLabel`, vì vậy nhãn CMS `Tư vấn tour`, `Hỗ trợ dịch vụ` không được đổi ở locale EN.
- Browser EN tại 390px có accessible names `Call Tư vấn tour 0915 250 101`, `Call Hỗ trợ dịch vụ 0915 260 101`. Lỗi xuất hiện ở **12/12** case EN mobile được đo (hai route × sáu kích thước dưới 1200px).
- Cần sửa: dùng chung hàm resolve nhãn theo locale, giữ nhãn CMS tùy chỉnh đúng chính sách hiện có; thêm test popup mobile EN với nhãn CMS tiếng Việt.
- Evidence: `codex-review/browser-measurements.json`, `codex-review/en-320-popup-clipping.png` và browser snapshot mới.

### F4 — P2: Shared HeaderNav làm tên accessible của WingsGo EN đổi sang VI

- Vị trí: `app/src/Header/Nav/index.tsx:875`.
- Diff thay nhánh mobile từ điều kiện `resolvedLocale === en ? Call ... : Gọi hotline ...` thành chuỗi tiếng Việt cố định. Đây là regression ngoài tenant WingsGroup, dù số WingsGo và WINGSGO_DEFAULT_HOTLINES không đổi.
- Browser thật `/wingsgo/en`, 390px: main local `tel:0903000111`, accessible label `Gọi hotline WingsGo 0903 000 111` trong tài liệu `lang=en`.
- Cần sửa: khôi phục locale-aware label của WingsGo và test VI/EN mobile. Không thay số CMS WingsGo để trùng WingsGroup.
- Evidence: `codex-review/wingsgo-en-label-regression.json`, timestamp 2026-10-23T05:56:57.583Z.

### F5 — P2: Escape ở mobile drawer không khôi phục keyboard focus

- Vị trí: `app/src/Header/Nav/index.tsx:380` và nút `aria-controls=mobile-primary-navigation`.
- Reproduce browser thật: mở popup → Escape (focus về disclosure đúng) → Tab đến hamburger → Enter mở drawer → Tab vào link đầu → Escape. Drawer đóng, `document.activeElement` trở thành **BODY**, không trở lại hamburger.
- Handler drawer này tồn tại từ trước trong code, nhưng hợp đồng US-085 và báo cáo bàn giao đã khẳng định drawer Escape/focus hoàn tất. Chưa thể đánh dấu AC accessibility qua.
- Cần sửa: giữ ref nút hamburger, trả focus khi đóng bằng Escape; test từ một link bên trong drawer. Kiểm cả VI/EN. Không yêu cầu trap focus cho disclosure đơn giản.
- Evidence: `codex-review/drawer-focus-check.json`, timestamp 2026-10-23T05:54:24.995Z.

## Kết quả chạy lại

Các lệnh test chạy từ `app/`; log mới ở `header-a-implementation-20261023/codex-review/`.

| Lệnh | Kết quả thật |
| --- | --- |
| `pnpm run test:unit -- tests/unit/updateWingsGroupHotline.unit.spec.ts tests/unit/wingsGroupCorporateRoutes.unit.spec.ts tests/unit/wingsGroupV3PreviewSeed.unit.spec.ts tests/unit/siteHotlines.unit.spec.ts` | Exit 0, **41/41** qua, 4 files. `unit.log`. |
| `pnpm run test:component -- tests/component/wingsGroupHeaderOptionA.component.spec.tsx tests/component/headerHotlines.component.spec.tsx tests/component/siteContactFab.component.spec.tsx tests/component/wingsSideHiFiChrome.component.spec.tsx tests/component/wingsGroupV3Homepage.component.spec.tsx` | Exit 0, **41/41** qua, 5 files. jsdom có notice navigation chưa implement; đây không phải bằng chứng browser navigation. `component.log`. |
| `pnpm exec tsc --noEmit --incremental false` | Exit 0. `typecheck.log`. |
| `pnpm exec eslint` trên 8 file TS/TSX thuộc implementation | Exit 0, **0 errors / 2 warnings**: unused isHotlineSite và container test. `lint.log`. |
| `node --test scripts/wingsgroup-v3-release-gates.test.mjs` | Exit **1**, **15/16** qua; expected approval date 2026-08-24, actual 2026-09-26. `release-gates.log`. Hai file test/register không có diff US-085: ghi nhận baseline, không quy là regression hotline. |
| `pnpm exec tsx ../header-a-implementation-20261023/codex-review/check-hotline-update.mts` | Exit **1**, tái hiện F1. Bản thử `.ts` đầu tiên gặp top-level await/CJS; đổi artifact thành `.mts`, chạy lại mới ra bằng chứng F1. |
| `run-browser-review.ps1` dùng agent-browser trên local Next dev | Exit **1**, 44 cases: 2 locale × home/subpage × 11 widths. 40 layout qua, 4 fail tại 320px; 12 case EN mobile sai nhãn. |

Browser kiểm 320/375/390/768/1024/1199/1200/1279/1280/1440/1536px. Server local do Codex khởi chạy bằng `pnpm exec next dev --port 3000`, DB xác nhận là SQLite local `file:./payload-tourplatform.db`, PAYLOAD_DB_PUSH=false. Không thay CMS production.

Luồng EN Gửi nhu cầu đã bấm thật từ dropdown: đến `/wingsgroup/en/lien-he#contact-form`, không mở dialog lần hai; sau hydration ô `full-name` được focus và focus session key được consume. Evidence `inquiry-navigation.json`. Link locale desktop giữ query `utm_source=us085-review`. Main tel mới đúng trên cả 44 case và contact/footer quan sát thực tế. Browser error buffer không ghi exception trong lượt kiểm này (`browser-errors.log`).

## Giới hạn và thay đổi ngoài báo cáo

- Chưa chạy production build, PostgreSQL rehearsal, Redis invalidation runtime, browser zoom 200% thực, cuộc gọi thật, Zalo OA ngoài hoặc submit lead. Chưa deploy/push. Với các finding đã tái hiện, không mở rộng test để kết luận release-ready.
- `app/src/payload-types.ts` có thêm diff generated media sizes và sắp xếp field tour, không nằm trong danh sách bàn giao agy. Chưa xác định provenance, không tự revert thay đổi có thể thuộc người khác. Cần tách/giải thích trước đóng gói release.
- Các thay đổi baseline khác, gồm postgresCrudSmokeLifecycle.mjs và artifact deploy/review cũ, không được sửa/reset.
- Các test focused qua chưa bao phủ F1/F2/F3/F4/F5. Không dùng tổng số test qua để ghi Full proof hoặc khẳng định 100% tenant isolation/accessibility.

## Bước tiếp theo

Sửa F1–F5 theo phạm vi từng file, bổ sung regression nhỏ cần thiết; chạy lại test bị ảnh hưởng và browser sau lần sửa cuối. Đối chiếu diff generated types, xử lý/ghi nhận baseline gate trước bất kỳ đề nghị release nào. Codex review lại bằng bằng chứng mới; kế hoạch target kỹ thuật vẫn 2026-10-26, chưa có ngày production.

## Recheck — Codex, 2026-10-23

Agy bàn giao `header-a-implementation-20261023/agy-fixes-report.md`, marker `AGY_US085_FIXES_READY`, source đóng băng. Codex kiểm độc lập; bằng chứng mới ở `header-a-implementation-20261023/codex-recheck/`. Không ghi đè bằng chứng fail của vòng review đầu.

### Finding resolution

| Finding | Sửa và bằng chứng kiểm lại | Trạng thái |
| --- | --- | --- |
| F1 | Updater chỉ ghi supportPhone khi main khớp số cũ; null/empty/new không write; custom abort. Mock Payload kiểm 7 case, site query/id/context và chính xác dữ liệu ghi, không đổi additionalHotlines. Contact block giữ explicit `[]`, chỉ còn fallback khi prop undefined. Wrapper unit và contact component qua. `hotline-update-check.log`. | Closed local |
| F2 | Arrow desktop/mobile 44×44px; call và hamburger cũng đạt mục tiêu. CSS chỉnh padding/gap ở màn hình hẹp, popup mobile 260px. 4 case 320px có popup left=35px, khoảng logo→call 15.546875px VI / 16.25px EN. 44/44 case không collision, clipping, overflow; đủ 6 nav desktop. | Closed local |
| F3 | Mobile popup dùng resolveHotlineItemLabel như desktop/drawer. 0 case EN mobile lẫn nhãn VI trong ma trận; regression component qua. | Closed local |
| F4 | WingsGo mobile aria-label theo locale được khôi phục. Browser VI/EN giữ main CMS riêng `0903000111`, EN là Call WingsGo; không đổi default tenant. `wingsgo-label-results.json`. | Closed local |
| F5 | Ref hamburger nhận focus khi Escape đóng drawer. Keyboard thật từ link trong popup/drawer trên VI/EN: mở, Tab vào, Escape đóng và focus về đúng trigger. `keyboard-results.json`; có bản fail trước sửa để đối chiếu. | Closed local |
| F6 | Ảnh desktop phát hiện VIVI / ENEN: globals.css chèn ::after vào nhãn compact thật. CSS giới hạn WingsGroup v3 tắt pseudo content. Probe kiểm nhãn/pseudo ở cả 44 case; ảnh mới xác nhận VI / EN. Bỏ reveal animation không thuộc yêu cầu và comment trước @media để giữ committed scope test, không nới test. | Closed local |

### Commands và kết quả mới

Lệnh pnpm/node chạy từ app/; browser scripts chạy từ root. Các log trong codex-recheck có thời gian sau thay đổi liên quan.

| Command | Kết quả |
| --- | --- |
| `pnpm run test:unit -- tests/unit/updateWingsGroupHotline.unit.spec.ts tests/unit/wingsGroupCorporateRoutes.unit.spec.ts tests/unit/wingsGroupV3PreviewSeed.unit.spec.ts tests/unit/siteHotlines.unit.spec.ts tests/unit/wingsGroupV3FidelityContract.unit.spec.ts` | Exit 0, 52/52; unit.log. Sau chỉnh type fixture fidelity, chạy lại riêng fidelity: 7/7, fidelity-contract.log. Không cộng lượt chạy lại vào tổng. |
| `pnpm run test:unit -- tests/unit/wingsGroupV3ResponsiveCss.unit.spec.ts` | Exit 0, 6/6; responsive-css.log. Tổng unit thuộc 6 file là 58. |
| `pnpm run test:component -- tests/component/wingsGroupHeaderOptionA.component.spec.tsx tests/component/headerHotlines.component.spec.tsx tests/component/siteContactFab.component.spec.tsx tests/component/wingsSideHiFiChrome.component.spec.tsx tests/component/wingsGroupV3Homepage.component.spec.tsx` | Exit 0, 45/45; component.log. jsdom vẫn báo navigation chưa implement, dùng browser proof cho điều hướng thật. |
| `pnpm exec tsc --noEmit --incremental false` | Exit 0; typecheck.log. Hai Form fixture mới thiếu createdAt/updatedAt đã sửa và kiểm lại. |
| `pnpm exec eslint` trên 10 TS/TSX files thay đổi | Exit 0, 0 errors, 17 warnings any sẵn có trong fidelity fixture; lint.log. Hai unused warnings của implementation đã hết; không gọi toàn bộ lint là zero warnings. |
| `node --test scripts/wingsgroup-v3-release-gates.test.mjs` | Exit 0, 16/16; release-gates.log. Sửa expected approvedAt thành 2026-09-26, khớp commit b59b8c3 và evidence đã có; không đổi ngày duyệt để ép test qua. Register hotline hiện hành và test đổi sang 0948786775. |
| `pnpm exec tsx ../header-a-implementation-20261023/codex-recheck/check-hotline-update.mts` | Exit 0, 7/7 tình huống bảo toàn dữ liệu; không ghi DB thật. |
| `pwsh -NoProfile -File header-a-implementation-20261023/codex-recheck/run-browser-review.ps1` | Exit 0, 44/44; report 2026-10-23T07:24:31.3983914Z. Gồm bounds, targets 44px, VI/EN compact và pseudo content. |
| `check-keyboard.ps1` / `check-inquiry.ps1` cùng thư mục | Exit 0 cả hai; VI/EN focus đúng. Inquiry đến contact-form, không dialog lần hai; key focus được consume, session context outbound được giữ. Không submit. |
| `pnpm run build` với PAYLOAD_DB_PUSH=false | Exit 0, gồm postbuild prepare-standalone; build.log. Có warning SQLite experimental, không có build error. Đây là build Windows/local SQLite, không phải build/deploy ARM64. |

Ảnh `en-320-popup-final.png` và `vi-1280-popup-final.png` được chụp sau sửa CSS cuối và Codex đã xem trực tiếp. Error buffer trong browser-errors.json không có uncaught exception ở lượt đã lưu. Server dev do Codex tạo đã dừng trước build để tránh xung đột output.

### Scope, cache và giới hạn còn lại

- Codex đồng bộ fidelity contract, validator và test từ header dialog cũ sang split-call A; thêm nav Liên hệ để đủ sáu. Hero/FAB dialog vẫn theo hợp đồng cũ. Product contact register và public-experience doc có số mới; không global replace số của WingsGo/WingSide hoặc historical migration.
- Code review xác nhận SiteSettings.site unique, updater tìm settings theo site id, chỉ update một settings id; hook invalidateSettingsAfterChange vẫn gọi invalidateSettingsCache cho site hiện tại/trước đó và không bỏ qua do context seed. Chưa rehearsal PostgreSQL/Redis runtime. Khi apply release cần backup, tránh sửa CMS đồng thời, đọc lại/revalidate và có rollback; script này không có compare-and-swap chống thao tác CMS concurrent.
- Không đổi collection/schema. Diff payload-types.ts gồm media sizes theo config Media.imageSizes phụ thuộc môi trường và thứ tự field tour do generation; đã tồn tại trước lượt sửa, được giữ. Chưa xác minh người tạo diff; cần tách phần không liên quan khi đóng gói release. Reorder-only importMap do phiên dev/build này sinh đã được trả về thứ tự baseline, không đổi mapping.
- Chưa kiểm zoom trình duyệt 200% thật, thiết bị/gọi điện thật, Zalo OA ngoài, submit lead, PostgreSQL/Redis hay production/ARM64. Không deploy/push/ghi CMS production. Local review pass không đồng nghĩa release approval hoặc Full integration proof.

Kết luận: F1–F6 đã đóng ở local; không còn finding UI/data đang tái hiện trong phạm vi đã kiểm. US-085 tiếp tục in_progress, Chờ xác nhận / Partial; target review vẫn 2026-10-26. Gate integration và phát hành được theo dõi riêng, không tự đóng Story.

## Production release — 2026-10-23 (supersedes earlier no-deploy status)

User explicitly authorized deployment and production CMS write. Codex created an isolated candidate6a0dac015340f7279bfe352e377193c38b3d0d91 from active0701404, excluding unrelated generated types/CRUD helper changes. No push. Existing agy pane supplied a second release opinion; independent Codex disposition is production-release/codex-release-review.md. It corrects agy unsupported cache/rollback/phone ownership claims.

P2 concurrency addressed in operational wrapper: PostgreSQL target row locked before read, same Payload transaction passed through updater, full settings comparison, commit and second cache invalidation. Rehearsal on real restored production backup and production apply both passed one-write/noop assertions. Settings14/site1 only supportPhone0912910101→0948786775 plus updatedAt; six sites/other fields and two additional hotlines unchanged.

Encrypted backup4786535bytes/SHA c32a55aa5fc22471039539ce95f2cbb8d52af15dffd7df8a005028c91f9797b0 restored into disposable us085_restore_6a0dac0, six active sites/six homepages. Candidate ops revision verified exact SHA. All28 migrations applied; CLI migrate hit an existing dev-push marker warning and was stopped before confirmation. No schema delta, DDL, marker cleanup or DB push. Fresh migrate:status exit0 is retained. No claim that a new migration ran.

Candidate build/package/58 unit/45 component/actual release gate exit0. ARM64 libsql memory write/read and sharp PNG90bytes pass. Four candidate UI cases pass. Production CMS apply08:11:43Z and app cutover08:12:01Z (15:12:01+07) exit0. Running image54821addabf22f01d90986cc1fcea3e00e4d842627bf4738729b14d2f3c0b962, BUILD_ID wYS7T-NhV_t69ozSUjTj3, restart0, DB/Redis up/delivery configured.

Public44/44 browser cases, VI/EN keyboard,8 WingsGo/WingSide cases pass. Inquiry first assertion saw transient focus before destination readiness; first report preserved. Runner now waits exact URL+complete document+focused field; two fresh VI/EN runs pass, no app change. Context preserved/no duplicate dialog. Public Group home old main links0; VI5/EN4 new main links. Exact visible consultation-fab opens native dialog with new phone and preserved numbers, Escape closes. Broad/stale selector attempts were tool mistakes and not success evidence. Final exception buffer empty. Codex viewed EN320 and VI1280 live popup screenshots.

Release report and all commands/evidence: header-a-implementation-20261023/production-release/. Previous0701404 symlink/digest pinned as rollback-us085-6a0dac0; activation auto rollback was not needed. Encrypted backup retained. Only owned candidate/restore/tunnel/browser resources may be cleaned. No real calls/Zalo conversation/lead submit/physical device/true200% zoom/full repo integration-E2E suite. Existing dev marker remains; disk3.6GB free, historical artifacts retained.

Disposition: scoped US085 technical delivery complete; Harness implemented, Plane Đã bàn giao / Full after sync. This is delivery, not customer acceptance. Original review target2026-10-26 retained; delivered2026-10-23.
