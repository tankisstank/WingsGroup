# US-074 — Kế hoạch thực hiện chi tiết

## Trạng thái và mục tiêu

Kế hoạch triển khai candidate, cập nhật 15/09/2026; đã hợp nhất review
`applied-cms-ui-package`. Owner tracking: `c0508g`.
Engineering, QA và release owner dưới đây là vai trò cần bố trí; chưa phân công
thêm người hoặc tạo dependency trên Plane. Harness giữ trạng thái
`in_progress`; Plane/customer-facing giữ trạng thái `Chờ xác nhận` vì proof
Production đã có nhưng authenticated staging/Safari/iOS được waiver và cần
stakeholder handover.

Mục tiêu: khôi phục khả năng vận hành admin mobile, sửa preview đa site và toolbar
locale, sau đó hoàn thiện các luồng biên tập, xử lý lead và hardening design
compatibility trong cùng US. Candidate đã triển khai các WP-1 đến WP-7 và lớp
WP-9 trên workspace hiện tại; bằng chứng implementation và Production được ghi
tại thư mục [evidence/20260915](./evidence/20260915/),
cùng với các artifact lịch sử.
Account hiện có được giữ nguyên theo yêu cầu người dùng và Decision 0034.

Kế hoạch đóng blocker sau review, gồm thứ tự sửa, ma trận kiểm thử, gate UAT,
production canary và điều kiện hoàn thiện US, nằm tại
[remediation-plan.md](./remediation-plan.md). Candidate US-074 đã được
build/canary; runtime hash đã được verify trong release đang live.

Sau phản hồi trực tiếp trên Production, follow-up UI/preview/locale
`us074-admin-shell-followup-r7-20260915T143012Z` đã được triển khai trên
baseline US-075 hiện hành. Release đóng blocker site selector bị side pane che,
khôi phục rail cho các custom view (đặc biệt `/admin/theme`), bỏ active menu
marker màu cam gây đè chữ/nhảy vị trí, hoàn tất preview handoff tenant và đồng
bộ compact locale controls. Không thay đổi account, content, lead, media,
migration, PostgreSQL hoặc Redis.

Theo yêu cầu ngày 15/09/2026, authenticated staging và Safari/iOS validation
được waiver và ghi là `unverified`; không được tính là pass. Các gate Production
về owner approval, domain/preview config, backup, canary, after-state và rollback
đã được thực hiện; evidence nằm trong `evidence/20260915/production-release.md`.

## Cơ sở lập kế hoạch

- `custom.scss` có nhiều lớp override `.template-default`, topbar và breakpoint;
  cần đo cascade cuối cùng, không chỉ sửa rule đầu tiên ở 680px.
- `SiteReview/index.tsx` dùng `window.location.origin` chỉ cho same-origin
  initializer đã validate; production target phải tiếp tục resolve qua
  allowlist/signed handoff, không thay bằng arbitrary `site.domain`.
- `previewOrigin.ts` đã có allowlist deployment; `previewHandoff.ts` có token
  ràng buộc site/document/locale/path với TTL 60 giây và frame authorization.
- Pages dùng compact control; tám collection khác dùng full control:
  TourProducts, Posts, TourDepartures, Media, DepartureVariants, Categories,
  TourCampaigns, SiteSettings. Bốn collection đầu là phạm vi sửa bắt buộc;
  bốn collection sau cần kiểm tra hồi quy và áp dụng cùng bản sửa nếu tái hiện.
- Theme Manager lấy tối đa 100 pages và summary chỉ lọc `hero.type=highImpact`.
  Phải sửa cả độ đầy đủ dữ liệu lẫn câu mô tả phạm vi.
- `formSubmissionOverrides.access.update` hiện là `false`; thêm triage không
  thể chỉ bật nút Save. Nội dung khách gửi và field delivery phải tiếp tục được
  bảo vệ khi bổ sung quyền ghi metadata nghiệp vụ.
- Workspace có nhiều thay đổi khác đang diễn ra, gồm US-073. Khi triển khai phải
  dùng branch/worktree có baseline xác định, đưa đúng thay đổi phụ thuộc vào branch
  và phối hợp các file chung; không lấy tất cả dirty changes vào release.

Những điểm trên được đối chiếu source trong lượt lập kế hoạch. Số liệu production
và finding chưa reproduce cần có preflight theo đúng build đang chạy.

- `applied-cms-ui-package` là archive prototype 22 file, không có React/API/test
  runtime; chỉ nhận token, typography và interaction guardrails sau khi chuyển
  thành CSS/React contract. Archive integrity và visual review được ghi tại
  [applied-ui-package-review.md](./evidence/20260914/applied-ui-package-review.md).

## Ba đợt bàn giao

| Đợt | Phạm vi | Điều kiện ra bản | Tác động dữ liệu |
| --- | --- | --- | --- |
| A — Khôi phục vận hành | Mobile, compact locale, preview tenant; domain WingsGo nếu sai được xác nhận | Mobile/edit hoạt động, preview đúng tenant, kiểm thử access/iframe pass | Chủ yếu code/config; domain chỉ ghi khi có diff cần sửa |
| B — Hoàn thiện biên tập | Topbar/search/date/labels, title chưa dịch, Theme impact, site switcher, itinerary, Wizard | Các luồng biên tập và context không mất dữ liệu, UAT pass | Ưu tiên UI/query; không reset nội dung hiện có |
| C — Phối hợp Sales và nghiệm thu | Lead triage, migration, audit, kiểm thử tổng, rollout | Quyền ghi field đúng phạm vi, migration/rehearsal và UAT pass | Migration additive cho triage metadata |

A có thể phát hành trước B/C khi đạt gate tương ứng. US chỉ đóng khi cả A/B/C
đã nghiệm thu; nếu tách phần nào ra ngoài cần cập nhật scope và link follow-up.
Nếu mobile fix đạt sớm, có thể phát hành riêng A1 trước preview, kèm báo cáo rõ
những finding còn mở. Không phải chờ lead triage mới khôi phục mobile.

## Ước lượng và nguồn lực

Đơn vị: ngày công engineering, đã tính test gần phần thay đổi; chưa tính thời
gian chờ cửa sổ production hay quyết định nghiệp vụ. Đây là ước lượng lập kế hoạch,
không phải thời gian đã đo hoặc deadline đã được chủ dự án chốt.

| Gói | Engineering | QA riêng | Phụ thuộc chính |
| --- | --- | --- | --- |
| P0 — Baseline, fixture và reproduction | 0,5–1 | 0,5 | Build/DB/fixture phù hợp |
| WP-1 — Mobile và admin chrome/list | 1–2 | 0,5 | P0 |
| WP-2 — Preview đa site | 1,5–2,5 | 0,5 | P0, host/preview contract |
| WP-3 — Domain WingsGo | 0,5–1 | 0,25 | Preflight; có thể kết luận no-op |
| WP-4 — Locale, title fallback và nhãn | 1–2 | 0,5 | P0; dùng chung CSS với WP-1 |
| WP-5 — Theme impact và site context | 2–3 | 0,75 | WP-1, WP-2 |
| WP-6 — Itinerary và Wizard | 1–1,5 | 0,5 | WP-4 |
| WP-7 — Lead triage | 2,5–4 | 1 | Quyền nghiệp vụ và migration design |
| WP-8 — Tích hợp, UAT, release/handover | 1–2 | 1–1,5 | Các gói liên quan tới đợt phát hành |
| WP-9 — Applied UI package compatibility và accessibility hardening | 0,5–1 | 0,25–0,5 | Archive integrity, token contract, browser matrix |
| Tổng | 11,5–20 | 5,75–6,5 | Chưa cộng 20% dự phòng sửa lỗi tích hợp |

Một full-stack engineer + QA bán thời gian: dự kiến khoảng 3–5 tuần làm việc.
Hai engineer (admin UI và backend/multisite) + QA: mục tiêu khoảng 10–15 ngày
làm việc nếu đủ fixture và các quyết định được chốt sớm. Lead triage và preview
cross-domain là hai nguồn bất định lớn nhất.

Lịch minh họa cho phương án hai engineer, D1 là ngày bắt đầu thực hiện:

| Khoảng | UI engineer | Backend/multisite engineer | QA/mốc |
| --- | --- | --- | --- |
| D1 | Baseline và mobile reproduction | Preview/domain/lead access preflight | Chốt dataset và bảng lỗi |
| D2–D4 | Mobile + compact locale | Preview + domain plan/rehearsal | A1 mobile; gate A dự kiến D4–D5 |
| D5–D7 | Topbar/search/date/labels, itinerary/Wizard | Theme impact + server site filters | Hồi quy đợt A |
| D8–D10 | Site switcher + lead triage UI | Lead update contract/migration/audit | Gate B; test isolation/concurrency |
| D11–D13 | Sửa lỗi UAT | PostgreSQL rehearsal, release artifact | Gate C, UAT năm use case |
| D14–D15 | Dự phòng, handover | Canary/production verify | Hoàn tất evidence theo release thực tế |

Ngày 12–17/09 hiện trên Plane do importer suy ra từ ngày tạo và sáu child AC;
không dùng các ngày đó làm estimate kỹ thuật. Giữ ngày tracking hiện hữu cho tới
khi có ngày bắt đầu/lịch delivery được chốt; ghi lịch D1–D15 trong mô tả kế hoạch.

## P0 — Chuẩn bị baseline

1. Ghi source SHA, build đang audit, Payload/Next version, DB engine, theme và
   viewport; phân biệt kết quả local, staging và production.
2. Kiểm tra scripts fixture/setup/teardown trước khi chạy E2E: không được xóa,
   upsert hoặc đổi password/role của account hiện có. Trên local/staging
   non-Production, có thể dùng ephemeral fixture để tạo tạm role/data synthetic;
   teardown chỉ xóa exact ID đã tạo. Nếu môi trường không cho phép, dùng fixture
   đã chuẩn bị hoặc giữ phần test phụ thuộc ở trạng thái blocker.
3. Dùng PostgreSQL test riêng với schema hiện hành; tránh lặp lại lỗi SQLite
   thiếu bảng khiến không mở được Pages hoặc Site Review.
4. Tạo `evidence/baseline.md` và báo cáo geometry: width của shell/main,
   bounding boxes menu/breadcrumb/locale/avatar, search icon/text, console errors.
5. Tái hiện mobile ở 360px và biên 679/680/681px, tablet 768/820/1024px;
   capture desktop 1440px. Ghi nav mở/đóng và cả hai theme.

Done: có môi trường lặp lại được và từng finding gắn route/fixture/build hoặc
trạng thái chưa reproduce. Không dùng screenshots audit cũ làm bằng chứng đã sửa.

## WP-1 — Responsive shell và list presentation

File chính: `app/src/app/(payload)/custom.scss`, `app/src/payload.config.ts`,
`app/src/components/AdminThemeBootstrap/index.tsx`; chỉ sửa component khi CSS
layout của Payload không đủ. Test chính: `app/tests/e2e/admin.e2e.spec.ts`.

1. Sửa parent grid và vị trí wrap tại breakpoint mobile. Assert main có chiều
   rộng hữu dụng, text/control visible; điều kiện `width > 0` một mình chưa đủ.
2. Kiểm tra mở/đóng nav, back/forward, đổi orientation và sticky save.
3. Bố trí hamburger/breadcrumb/locale/avatar theo flow; thêm gap/ellipsis hợp lý
   cho tên dài. Tập trung vào bounding boxes, không sửa bằng tăng z-index đơn lẻ.
4. Sửa padding-inline-start search; kiểm tra placeholder, caret, text nhập và
   focus ring tại Pages/Posts/Tours/Media/Users/Leads.
5. Đối chiếu API/config formatter của phiên bản Payload đang cài để chuẩn hóa
   date; helper admin riêng khi cần, giữ timestamp lưu DB là UTC.
6. Pagination: kiểm thử 0/1/10/11 records, trang cuối và filter; chỉ patch nguyên
   nhân thật nếu reproduce. Số total đúng chưa chứng minh spacing đúng.

Done: không còn blank/overlap làm mất thao tác ở matrix viewport; format admin
`dd/MM/yyyy HH:mm`, ví dụ UTC `2026-09-08T18:30:00Z` thành `09/09/2026 01:30`.
Test null/invalid timestamp bằng placeholder rõ ràng.

## WP-2 — Site Review preview

File chính: `app/src/components/SiteReview/index.tsx`,
`app/src/app/(payload)/api/site-review/route.ts`,
`app/src/utilities/previewOrigin.ts`, `app/src/utilities/previewHandoff.ts`,
`app/src/app/(frontend)/next/preview/route.ts` và route handoff hiện có.

1. Resolve authoritative site/document/locale trên server; dùng host allowlist
   deployment, không lấy arbitrary URL từ client hoặc domain mutable.
   CMS hiện truy cập tại `https://wingsgroup.vn/admin`; contract bảo mật dùng
   origin `https://wingsgroup.vn` và giữ `/admin` chỉ là đường dẫn admin/referrer.
2. Phân biệt published preview và draft preview. Tạo signed handoff khi người
   dùng chọn item, không mint token cho toàn bộ list khi tải trang.
3. Tái sử dụng POST handoff hiện có. Không chuyển token thành query string dài
   hạn hoặc nới frame policy toàn site. Giữ TTL 60 giây trừ khi có thiết kế mới.
4. Kiểm tra frame-src phía CMS, frame-ancestors phía tenant, cookie cross-site
   và Safari/iOS. Thử 60s expiry, retry để cấp grant mới và đổi nhanh site/locale.
5. Iframe cross-origin không cho parent đọc HTTP status/DOM tùy ý: dùng loader
   có handshake `postMessage` kiểm tra origin/source + timeout nếu cần; chỉ hiện
   mã 403/404 khi có nguồn xác thực. Có action mở preview tab mới và thử lại.
6. Chặn stale response khi đổi item; không hiển thị dữ liệu/URL của site trước.

Done: Pages và Posts của tenant được phép mở đúng host/path/locale; grant sai
site/path/document, hết hạn hoặc bị sửa bị từ chối; iframe lỗi có recovery.
Tests kế thừa: `previewHandoff`, `localPreviewRoute`, `generatePreviewPath`;
thêm integration cho route Site Review và browser cross-domain.

## WP-3 — Domain WingsGo

File/contract: Sites, SiteSettings SEO canonical, `siteURLs.ts`, inventory host,
deployment preview allowlist và reverse proxy. `siteURLs.ts` đang có thay đổi
ngoài US-074: phối hợp baseline trước khi sửa.

1. Preflight chỉ đọc domain/canonical/host/redirect/preview config của WingsGo.
2. Dùng `wingsgo.vn` theo contract hiện tại. Chỉ đặt quyết định mới nếu dữ liệu
   DNS/deployment mâu thuẫn hoặc cần đổi sang tên miền khác.
3. Nếu production đã đúng: ghi kết luận no-op có bằng chứng; giữ `.local` fixture
   của local. Không đổi local seed hàng loạt để đạt tiêu chí production.
4. Nếu sai: lập dry-run gồm site ID, before/after, expected current value; apply
   phải dừng nếu preimage thay đổi và chạy lại phải ra zero changes.
5. Rehearse trên clone phù hợp, backup, verify canonical/HTTPS/redirect/preview;
   ghi record/config rollback có thể thực hiện riêng với app rollback.

Done: production domain được xác minh đúng hoặc correction có after-state proof.
Một bản dry-run chưa apply không được tính là đã hoàn thành correction cần thiết.

## WP-4 — Locale, bản dịch và nhãn

File chính: `ContentLocaleControl/index.tsx`, collection configs nêu ở baseline,
`utilities/locales.ts`, `utilities/adminLabels.ts`, Sites array labels.

1. Đổi bốn collection bắt buộc sang compact. Kiểm tra bốn collection full-control
   còn lại để tránh cùng một lỗi tái xuất hiện ở luồng liên quan.
2. Bảo toàn dirty-state warning khi đổi locale; toolbar nhỏ vẫn có status, focus
   và save/publish reachable trên mobile.
3. Bỏ code trong label ở đúng adapter Payload append code. Không sửa metadata
   dùng chung khiến custom locale selector hoặc public switcher mất nhãn.
4. Title fallback: batch-load title locale mặc định theo IDs cùng site và quyền
   đọc; tránh một query bổ sung cho mỗi row. Hiển thị `[Chưa dịch]`, title nguồn
   và locale nguồn. Nếu nguồn cũng trống, dùng ID + `Chưa có tiêu đề`.
5. Không suy trạng thái toàn bản dịch chỉ từ title null; lấy locale inventory
   khi có, phân biệt title chưa nhập với locale chưa tạo.
6. Việt hóa label singular/plural của Additional Domain, Page wrapper và nhãn
   slug thực sự còn lỗi; không đổi nhãn Posts đã Việt hóa chỉ vì report cũ.

Done: chín locale admin có nhãn không lặp code, title/status trung thực, đổi
locale không overwrite nội dung và policy public locale không thay đổi.

## WP-5 — Theme impact và site switcher

File chính: ThemeManager, AdminOperatorConsole, WingsGroupMetricsClient,
admin header extension, `access/siteScope.ts` và các query adapter liên quan.

1. Phân trang đầy đủ các page trong scope bằng fields cần thiết hoặc dùng count
   server khi predicate đơn giản. Không thay `100` bằng một giới hạn lớn khác.
2. Tách impact của theme khỏi impact hero highImpact; làm rõ inherit/override/
   legacy. Nếu tổng chỉ là các page người dùng được đọc, phải nói rõ phạm vi đó.
3. Khi query fail/partial, hiện unavailable và hạn chế save cần impact confirmation;
   không biến lỗi thành 0. Test fixture >100 và lỗi batch thứ hai.
4. Site context có giá trị `all` hoặc một site được phép. Dashboard/Console mặc
   định vẫn là tất cả site được phân quyền; khi chọn site, metrics/recent lists/
   deep links và collection filters đồng nhất.
5. Với collection không có site field, hiển thị `Toàn hệ` thay vì giả vờ filter.
   Record edit lấy site từ record; switcher không được âm thầm đổi quan hệ site.
6. Khi chuyển site từ form dirty, cảnh báo thao tác chưa lưu; reset pagination,
   loại stale request và giữ content locale nếu site đích hỗ trợ.
7. Thêm quick filter thị trường ở Tour Products bằng field hiện có; thử URL
   filter, reload/back/forward và tổ hợp site + thị trường + search.

Done: fixture hai tenant chứng minh UI scope và API scope trùng nhau; ID/URL
site không được phép không truy xuất dữ liệu. Dirty form không mất chỉnh sửa.

## WP-6 — Itinerary và Page Wizard

File chính: `collections/TourProducts.ts`, admin itinerary row component nếu
cần, `components/PageWizard/index.tsx` và preset registry hiện có.

1. Kiểm tra native array collapse của Payload trước khi thêm custom controls.
   Dùng API hỗ trợ của phiên bản đang cài, không click DOM hàng loạt bằng selector.
2. Thêm `Thu gọn tất cả`/`Mở rộng tất cả`; row summary có ngày và title. Lỗi trong
   row đóng phải tự mở đúng row và focus field khi submit validation fail.
3. Kiểm tra reorder/remove/add day với 6 và 14 ngày; collapsed state không mất
   dữ liệu hay gắn nhầm vào ngày khác khi reorder.
4. Sau Wizard tạo draft, giữ đường mở edit; thêm action `Tạo trang khác từ preset`
   ở guidance trong edit hoặc bước success phù hợp. Flow mới giữ site/preset,
   xóa title/slug cũ, kiểm tra slug conflict và không tạo duplicate khi double-click.
5. Khả năng thay toàn bộ preset trên page hiện có vẫn là chức năng riêng; action
   create-another không được mô tả như reset layout của page hiện tại.

Done: hai draft khác nhau được tạo đúng site, không publish; tour save/reload giữ
đúng dữ liệu. Đo thời gian hoàn thành tác vụ trước/sau, không cam kết giảm 40%
hoặc 45 xuống 5 phút khi chưa có measurement.

## WP-7 — Lead triage

File chính: `app/src/plugins/index.ts`, `app/src/lead-capture/`, admin lead
guidance/detail UI, migration registry và types sinh tự động.

1. Chốt quyền nghiệp vụ trước khi bật ghi. Phương án đề xuất để review: manager
   được assign và update triage trong site; editor chỉ đọc đến khi quyền Sales
   được duyệt. Có thể đề xuất editor cập nhật lead được giao, nhưng không tự
   kích hoạt quyền đó như một thay đổi UI ngầm.
2. Bổ sung `salesStatus`, `assignedTo`, note bounded và audit actor/time theo
   design; giữ form payload, site, consent, createdAt và delivery fields bất biến.
   Lead cũ hiển thị `Chưa phân loại`; chỉ lead mới dùng default `new`, tránh tuyên
   bố mọi lead lịch sử chưa từng được liên hệ. Quy tắc backfill cần chốt với ops.
3. Phương án ưu tiên: command cập nhật metadata chuyên biệt với field allowlist,
   kiểm tra user/site/assignee và transaction. Giữ native submission update
   khóa nếu chưa chứng minh field-level policy bảo vệ đầy đủ mọi entry point.
4. Assignee lấy từ user hiện có có quyền cùng site; không sửa account/site
   membership để ép relation hợp lệ. Không trả email/credential qua lookup.
5. Tách state sales khỏi delivery; trạng thái chọn tay, không tự gửi mail/CRM.
   Bắt buộc actor/time/from/to; note tối đa đề xuất 2.000 ký tự.
6. Dùng expected version/update timestamp và conditional write để xử lý hai
   operator cập nhật đồng thời. Trả conflict để reload, không silent overwrite.
7. Migration additive, nullable/backward compatible, rehearsal empty-to-head
   và upgrade trên DB có submissions. Chỉ thêm index theo query plan thực tế.
8. Export sử dụng capability/plugin sẵn có; hiển thị rõ quyền manager, site scope
   và format đang hỗ trợ. Không tạo export pipeline mới hoặc mở quyền PII cho editor.

Done: được phép sửa đúng triage fields, cross-site và visitor bị chặn; payload
khách gửi không đổi; concurrent update có conflict; rollback app giữ metadata
mới trong DB. Không drop cột triage đã có dữ liệu để rollback code.

Decision 0035 đã chốt vocabulary 5 trạng thái (`new`, `contacting`, `won`,
`no_answer`, `lost`). Code, API, migration, UI và test dùng cùng contract;
Production enum đã khớp, không alias/rename/backfill lead cũ. Gate WP-7/C đã có
decision và Production after-state.

## WP-8 — Validation, release và handover

1. Mỗi gói có test sát behavior trước review. Chạy suite rộng trên candidate tích
   hợp sau khi typecheck/test gần thay đổi pass; không claim pass từ source grep.
2. Matrix hình học đầy đủ 10 viewport ở validation.md, thêm 679/680/681 để test
   biên; smoke cả hai theme và nav mở/đóng. Chrome desktop + Safari/iOS cho
   preview cross-site; nếu chưa có Safari, ghi rõ coverage thiếu.
3. Roles/site: super-admin hai tenant, manager một tenant, editor; test cả API
   trực tiếp với ID không được phép. Chín locale admin, chỉ locale public đã bật.
4. PostgreSQL migration/upgrade/restore rehearsal cho C; A/B không cần schema
   migration nếu implementation không đổi model.
5. Tạo release artifact từ baseline cụ thể; smoke candidate app trước switch.
   Admin shell là dùng chung nên deploy CSS có thể tác động mọi tenant, không
   gọi domain-level traffic pilot là cô lập hoàn toàn ảnh hưởng admin.
6. Sau phát hành, kiểm tra ngay và sau 30–60 phút: admin mobile, preview host,
   error logs, public home/detail, lead intake contract. Theo dõi tiếp một ngày
   vận hành; không gửi lead thật chỉ để tạo proof.
7. Rollback khi blank tái xuất hiện, preview leak, role regression hoặc write
   lead lỗi. Revert app artifact; khôi phục domain config từ before-state khi
   cần. Giữ cột additive; xác minh dữ liệu mới trước bất kỳ DB restore diện rộng.
8. Cập nhật docs/product tương ứng với behavior đã triển khai, evidence, Harness
   và Plane; trạng thái theo kết quả từng release, không theo tuổi ticket.

Lệnh đã tồn tại trong app/package.json, chỉ chạy khi thực hiện implementation
và sau khi kiểm tra fixture lifecycle:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:unit
pnpm test:component
pnpm test:int
pnpm build
pnpm test:e2e -- tests/e2e/admin.e2e.spec.ts
```

Khi đổi component registration/schema: `pnpm generate:importmap`,
`pnpm generate:types`. Khi có migration: `pnpm db:migrate:smoke`,
`pnpm db:upgrade:smoke`, `pnpm db:restore:drill` với cấu hình DB disposable đúng
script, không dùng môi trường production mặc định. Không sửa generated file tay.

## WP-9 — Applied UI package compatibility và accessibility hardening

Mục tiêu của WP-9 là nhận phần có giá trị của package vào admin hiện tại mà
không biến prototype thành một dependency runtime. Artifact và kết luận review
được lưu tại [applied-ui-package-review.md](./evidence/20260914/applied-ui-package-review.md).

1. Xác nhận archive bằng SHA-256/inventory và giữ archive ở `artifacts/` như
   evidence. Không chạy script từ package, không copy HTML, `shell()`,
   `innerHTML`, local mock state hoặc các asset/font chưa có provenance vào
   `app/`.
2. Tạo token adapter fallback-first trong `custom.scss`: giá trị sRGB cụ thể
   được khai báo trước; OKLCH chỉ được override trong `@supports`. Map token vào
   default Payload shell ở mức alias; Finexy/ATS vẫn được phép override theme
   contract hiện hành.
3. Chuẩn hóa `--wings-admin-display`, `--wings-admin-body` và
   `--wings-admin-mono` với fallback Apple/Android/Windows. Các bespoke Console
   và Dashboard phải đi qua role chung, không phụ thuộc việc máy client có
   Bahnschrift/Segoe UI Variable hay không.
4. Tách foreground role khỏi background role: action/accent text phải có màu
   đọc được trên nền cam/teal; các status surface dùng `color-mix(in oklch)` có
   fallback rõ ràng khi WebView không hỗ trợ. Kiểm tra contrast text, focus ring,
   zoom 200% và touch target tối thiểu 44px.
5. Giữ nguyên mobile fix an toàn của WP-1 (`grid-template-columns: 1fr`,
   `min-width: 0`, khoảng đệm nav 64px). Không áp dụng nguyên văn snippet package
   đặt `padding: 0`, vì có thể làm mất vùng header/nav và tạo regression.
6. Đối chiếu lại các đề xuất package đã được candidate giải quyết: Page Wizard là
   React + server access boundary; Site Review là allowlist/signed handoff;
   locale label dùng adapter Payload. Không thay chúng bằng Radix/REST/query
   secret chỉ vì prototype dùng flow khác.
7. Port các landmark và interaction có ý nghĩa nghiệp vụ vào React: grouped
   operator rail, Console task checkbox/status, Site Review preview checklist,
   Page Wizard site/locale/template flow và Theme Manager preview/impact regions.
   Các trạng thái cục bộ phải được ghi rõ là triage aid, không giả lập publish,
   account hoặc backend capability không tồn tại trong package.
8. Chạy unit/component contract cho token/font/contrast và các interaction mới;
   browser visual smoke ở 360/375/414/768/1024/1440px trên staging fixture hoặc
   login shell Production. Ghi rõ package prototype mobile/axe gap riêng với
   proof của Payload app.

Done về compatibility layer: package được trace vào US-074, fallback có hiệu
lực, font không phụ thuộc Windows, foreground role không tạo lỗi tương phản đã
biết, grouped rail/Console/Site Review/Page Wizard/Theme landmarks đã được port
vào runtime React/SCSS, và không có raw prototype runtime. Release US vẫn chờ
authenticated browser proof, các gate Production và các blocker được nêu trong
`release.md`.

## UAT theo năm tác vụ thực tế

| Kịch bản | Thao tác | Điều kiện nghiệm thu |
| --- | --- | --- |
| WingsGo tour outbound | Tạo draft tour 6N5Đ, nhập ngày, thu gọn, sửa giá và preview | Không mất dữ liệu; toolbar/save dùng được; đúng tenant |
| WingsPass landing | Chọn preset lead, tạo draft, tạo trang khác từ preset | Hai record độc lập, slug không trùng, không publish ngầm |
| WingSide bản địa hóa | Chuyển vi/en/ja ở tour có trạng thái khác nhau | Dirty guard; status đúng; thiếu dịch được giải thích; JA không tự public |
| Sales/CSKH | Filter site, assign, đổi trạng thái, ghi chú, thử concurrent update | Chỉ quyền được duyệt được ghi; người thứ hai thấy conflict; delivery state giữ nguyên |
| Mobile ngoài hiện trường | Mở lead và preview trang, manager duyệt draft fixture trên staging | Nội dung visible, nav/focus/save usable; production smoke chỉ đọc |

## Mapping vào sáu child work items hiện có

| Child AC | Gói triển khai | Evidence yêu cầu |
| --- | --- | --- |
| AC-1 — Responsive/list | P0, WP-1, WP-9 | Geometry JSON, screenshots, date/pagination cases, font/fallback/contrast proof |
| AC-2 — Preview/domain | WP-2, WP-3 | Host/locale grant matrix, domain preflight hoặc apply proof |
| AC-3 — Locale/nhãn | WP-4, WP-9 | Collection matrix, title fallback, dirty-state, labels và cross-platform typography |
| AC-4 — Impact/context | WP-5 | Dataset >100, partial-error, server scope và navigation tests |
| AC-5 — Tour/Wizard/lead | WP-6, WP-7 | Draft integrity, triage permission, concurrency và migration |
| AC-6 — Validation/release | WP-8, WP-9 | UAT, build/tests, package compatibility, rehearsal, release/rollback và handover |

Lưu evidence dưới thư mục story theo `evidence/<release>/`; file đề xuất:
`baseline.md`, `responsive.json`, `preview-matrix.md`, `domain-preflight.md`,
`locale-matrix.md`, `lead-access.md`, `migration.md`, `uat.md`, `release.md`,
`applied-ui-package-review.md`.
Implementation candidate đã ghi artifact release mới tại `evidence/20260914/`.
Artifact production/canary đã được bổ sung sau approval tại
`evidence/20260915/production-release.md`; release hiện hành được kiểm tra để
không ghi đè một rollout khác.

## Các quyết định còn cần chốt khi đến gói tương ứng

- Không còn decision blocker trong phạm vi domain/preview hoặc vocabulary lead;
  Decision 0035 và Production after-state đã ghi nhận.
- Ngày bắt đầu và cửa sổ release: chốt trước khi đổi lịch Plane hoặc deploy;
  lịch D1–D15 là phương án triển khai, không tự động phê duyệt production write.

Implementation update 15/09/2026: candidate code/test đã pass trên database
disposable; authenticated staging và Safari/iOS được waiver theo
`evidence/20260915/scope-waiver.md`. Decision 0035 đã chốt vocabulary lead 5
trạng thái; Production migration/schema đã có sẵn và 7 lead hiện hữu không bị
backfill. Production release, domain correction, canary, after-state và
rollback được ghi riêng trong evidence của release thực tế; account/dữ liệu
khách hiện hữu không bị cleanup hoặc thay đổi ngoài domain metadata được duyệt.
Follow-up UI shell và browser geometry được ghi tại
[admin-shell-followup.md](./evidence/20260915/admin-shell-followup.md).
