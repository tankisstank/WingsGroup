# US-086 Tối ưu SEO và hành trình tìm kiếm WingsGroup, WingsGo

## Status

in_progress

## Lane

high-risk

## Product Contract

Khách từ tìm kiếm vào WingsGroup hoặc WingsGo gặp nội dung đúng ngôn ngữ,
thông tin liên hệ nhất quán, liên kết hoạt động và thông tin dịch vụ có căn cứ.
Sitemap, canonical, hreflang và schema phản ánh đúng nội dung đã xuất bản của
từng site. Tối ưu dựa trên baseline đo được, không cam kết thứ hạng.

Đây là một US chung của E03, project Core, bao phủ wingsgroup.vn và wingsgo.vn.
Audit ngày 2026-10-24 là bằng chứng lập kế hoạch; chưa phải proof triển khai.

### Triển khai AC6 — intake 161

User giao agy thực hiện qua herdr, Codex điều phối/kiểm chứng và Claude review
độc lập sau implementation. Kế hoạch thực thi, phạm vi và protocol đã khóa tại
`us086-ac6-implementation-20261024/plan.md`. Candidate làm trong worktree riêng
base `74f849b2e1116a5814dd3e07044de51d6613ba4d`; chưa deploy hay sửa CMS production.
Ngày 2026-10-25 đã nhận candidate và tích hợp19file vào workspace chính:
WP1 `fe7a915`, packaging `1a99b3f`; agy thực hiện, Codex kiểm chứng, Claude
review độc lập và xác nhận các finding code đã sửa. Kiểm tra tại app chính:
28unit +41component, TypeScript và scoped lint exit0; actual Next/Chrome
kiểm ảnh/video, poster404/recovery, pause/resize/scroll và SSR. Sharp có
transform640 WebP/PNG/AVIF host-control; chưa có thực thi ARM64 thật.
Chi tiết/lệnh/bằng chứng/giới hạn: `us086-ac6-implementation-20261024/acceptance.md`.
Các AC1–5 và gate tốc độ/release của AC6 tiếp tục mở. Whole-US proof vẫnno;
candidate local không đồng nghĩa nghiệm thu hiệu năng production hoặc đóng US.

## Relevant Product Docs

- `docs/product/ai-agent-seo-and-theme.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`
- `seo-audit-20261024/FULL-AUDIT-REPORT.md`
- `seo-audit-20261024/ACTION-PLAN.md`
- `seo-audit-20261024/performance-images/REPORT.md`
- `source/strategy/us086-ac6-media-20261024/AC6.md`
- `source/strategy/us086-ac6-media-20261024/CMS-DESIGN.md`
- `source/strategy/us086-ac6-media-20261024/OPERATIONS.md`

## Acceptance Criteria

- Sửa liên kết tour và điều hướng VI/EN không còn 404.
- Đồng bộ nội dung và trạng thái xuất bản tiếng Anh.
- Đồng bộ hotline, mùa vụ và cam kết dịch vụ có căn cứ.
- Chuẩn hóa metadata và liên kết bài viết WingsGroup.
- Đồng bộ sitemap, hreflang và schema theo nội dung thật.
- Tối ưu tốc độ tải, ảnh và kiểm chứng sau phát hành.

## Design Notes

### Phạm vi nghiệm thu chi tiết

Sáu AC trên tương ứng tám hạng mục dưới đây: AC3 bao gồm hạng mục 3 và 5;
AC5 tương ứng hạng mục 6; AC6 bao gồm hạng mục 7 và 8.

| Hạng mục | Điều kiện hoàn thành |
| --- | --- |
| 1 | Crawl lại toàn bộ URL sitemap và link HTML cùng host của hai site; không còn link nội dung/điều hướng nội bộ dẫn tới 404/5xx. Sửa nguồn tạo slug tour ở trang chủ, lịch khởi hành, market và language switcher; alias cũ có redirect một bước nếu có đích tương đương thật. Không đưa mọi URL lỗi về trang chủ. |
| 2 | Các URL EN được public có main content, H1, title, description và CTA đúng tiếng Anh. Locale thiếu bản dịch phải có quy tắc ẩn/chuyển hướng/noindex rõ ràng và nhất quán với sitemap/hreflang, không xuất bản bản sao VI rồi khai báo EN. Không tự dịch điều khoản thương mại chưa được xác nhận. |
| 3 | Thay hotline cũ trong body, FAQ và CTA bằng nguồn liên hệ đã duyệt; số phụ hợp lệ có nhãn riêng. Rà soát campaign hè 2026 tại ngày audit 2026-10-24; trang lịch sử có nhãn lưu trữ hoặc cập nhật thông tin thật, không chỉ đổi năm. Không sửa giá, lịch bay hoặc quyền lợi bằng phỏng đoán. |
| 4 | Hai trang EN Contact và News có description riêng đúng ý định. Ba thẻ bài viết trang chủ WingsGroup dẫn bài tương ứng. Title/description theo mục đích trang; không coi giới hạn ký tự là lỗi xếp hạng tuyệt đối. |
| 5 | Lập bảng claim → URL → chứng cứ → owner → ngày rà soát. Ưu tiên FAQ hoàn tiền visa/đổi lịch WingsGo và mô tả WingsPlus, tỷ lệ visa, tiết kiệm 40% trên WingsGroup. Nội dung chưa chứng minh được được sửa về thông tin có căn cứ hoặc gỡ claim; không khẳng định claim hiện tại là sai khi chưa xác minh. Bài hướng dẫn kiểm tra pháp lý có nguồn chính thức phù hợp và người rà soát. |
| 6 | Sitemap chỉ có URL canonical, indexable và phục vụ được; hreflang có self/return link đúng locale và đích hoạt động. JSON-LD parse được, host/entity nhất quán, ảnh/logo truy cập được, nội dung/điều khoản khớp trang nhìn thấy. Chạy Rich Results Test cho loại Google hỗ trợ; không hứa rich result cho mọi schema hoặc FAQ du lịch. Kiểm tra email obfuscation trong browser trước khi kết luận link Cloudflare là lỗi khách hàng. |
| 7 | Thực hiện checklist AC6.1–10 tại `source/strategy/us086-ac6-media-20261024/AC6.md`: ảnh đúng byte/kích thước/slot, không tải kép, video poster-first, upload/replace/publish tự kiểm tra, race/cache/tenant an toàn, backfill và rollback. Đối chiếu đủ sáu cấu hình × ba lượt; cảnh báo tải chưa xong không là proof đạt. Ngưỡng và protocol phải chốt trước triển khai; chưa có field CWV ghi N/A. |
| 8 | Chạy suite phù hợp thay đổi và browser desktop/mobile VI/EN: vào bài/tour từ trang chủ, chuyển ngôn ngữ, mở CTA tới form và kiểm tra context không gửi lead thật. Không overflow, không lỗi runtime mới, không rò tenant. Có audit độc lập trước release, bằng chứng production mới sau release và kế hoạch đối chiếu GSC 28 ngày; thiếu quyền GSC được ghi là chưa đo, không giả số. |

### AC6 — Contract tốc độ và media bền vững trong CMS

AC6 bao gồm sửa các asset hiện tại **và** ngăn tái phát khi upload/thay ảnh.
Một AC6 duy nhất trên Plane, checklist nội bộ không tạo thêm child:

| Mã | Kết quả bắt buộc |
| --- | --- |
| AC6.1 | Chốt URL/build/content/cấu hình đo; ba lượt/nhóm, giữ warning và min/max. |
| AC6.2 | Go dùng biến thể/srcset/sizes đúng slot và DPR; Group w640 không còn trả1440px trong đường được browser sử dụng; physical byte/dimensions và chất lượng được kiểm. |
| AC6.3 | Không tải kép JPEG/AVIF; không preload ảnh dưới fold; sửa CLS ecosystem và chẩn đoán JS/response còn chậm. |
| AC6.4 | Poster trong HTML đầu; video chỉ tải sau gate rõ, một nguồn active; reduced-motion/error có fallback; MIME/range/seek đúng origin và CDN. |
| AC6.5 | CMS upload/replace tự tạo và kiểm tra bản web; editor thấy lỗi/preview. User chốt mọi ảnh editor upload vào Go đều public, bản gốc/derivative không cần duyệt/publish/rights riêng hoặc trang tham chiếu; readiness kỹ thuật không cản public ảnh gốc. Group giữ governance. |
| AC6.6 | Worker nếu cần phải có runner/resource cap; conditional commit nguyên tử chống job cũ, retry/crash/disk-full không phá bản tốt hoặc khôi phục quyền đã thu hồi. |
| AC6.7 | Original/derivative chỉ phục vụ đúng site/publication; cache/revalidate theo dependency, test warm-cache revoke và URL cũ. |
| AC6.8 | Backfill dry-run/canary/resume, giữ nguồn/quan hệ/alt/rights, rollback có mục tiêu; không tự xóa media hay restore DB mất lead. |
| AC6.9 | Chốt trước code: LCP median≤2,5s, CLS từng lượt≤0,1, TBT median mobile≤200ms/desktop≤150ms, critical transfer mobile≤2MiB; đủ ba lượt sạch/cấu hình. Đây là mục tiêu lab đề xuất, không cam kết field CWV. |
| AC6.10 | Before/after, CMS staging thật, suite phù hợp, review release và production evidence mới; thiếu gate thì AC6 còn mở. |

Budget file đề xuất: thumb≤50KiB, card≤150KiB, hero/poster≤250KiB; MP4 web
mobile≤3MiB/desktop≤5MiB. Ngoại lệ chất lượng theo media revision/slot và người
duyệt, không miễn gate trang. Giữ bản gốc; không đổi thiết kế hoặc cắt chữ trên
poster để đạt byte. Chi tiết metric, cách tính và ngoại lệ ở tài liệu AC6 nguồn.

Hướng P2: mở rộng Media/Payload/Sharp và renderer đang có. Dùng lại biến thể;
chỉ thêm state/size/jobs khi chứng minh cần, không thêm DAM/queue Redis/CDN
service làm điều kiện mặc định. Video trước mắt có thể dùng MP4 đã chuẩn bị;
không hứa tự transcode khi chưa kiểm chứng encoder/công suất.

Tham vấn Claude Code qua herdr: `claude-review/result.md` và
`claude-review/resolution.md` trong thư mục thiết kế AC6. Tiếp nhận G-Async:
đo latency/resource upload ARM trước, giữ sync nếu đủ; CAS/lease/generation
test chỉ áp dụng khi chọn async, không buộc xây worker để đóng AC6.
G-Eligibility ảnhGo đã chốt trực tiếp bởi user: public toàn bộ ảnh editor
upload. Không thêm schema private/draft/approval cho ảnhGo. Site ownership,
an toàn tên file và governance Group giữ riêng. Media gate/page gate theo
dõi riêng nhưng AC6 chỉ đóng khi các gate áp dụng đều có bằng chứng.

Nếu phát sinh schema/migration/worker hoặc thay quyền media, phải có execution
plan rủi ro cao, review migration/site isolation và tham vấn trước code/release.
Đề xuất này chưa phê duyệt một schema mới hoặc thay đổi luồng public multisite.
Biên bản tham vấn và xử lý finding: `source/strategy/us086-ac6-media-20261024/`.

### Thứ tự và lịch đề xuất

- Ghi nhận kế hoạch: 2026-10-24. Khung triển khai đề xuất: 2026-10-26 đến 2026-11-06.
- Mốc này phục vụ sắp xếp công việc, chưa phải cam kết deadline với khách hàng.
- Đợt 1: link lỗi, locale, hotline và claim thương mại; đợt 2: metadata,
  nội dung, schema và hiệu năng; đợt 3: nghiệm thu và đo sau phát hành.
- Owner mặc định theo workspace: c0508g. Người duyệt nội dung/điều khoản cần
  được xác định khi bắt đầu phần nội dung, không tự gán người duyệt.
- Giữ kiến trúc Payload-first và scope site của dữ liệu. Chỉ sửa điểm dùng chung
  sau khi kiểm tra tác động sáu tenant; không thay schema/migrate trong US nếu
  chưa có quyết định kiến trúc riêng.
- Candidate AC6 đã tích hợp local ngày 2026-10-25. Sau hai lần rollback,
  lần cutover thứ ba thành công lúc 21:29 ICT ngày 2026-10-25, SHA `8278868`.
  Cloudflare hai zone dùng Respect Existing Headers; public Range/cache và
  resize thực tế đã qua gate. US/AC6 còn mở đến khi đạt toàn bộ ngưỡng đã chốt.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Regression cho bộ tạo URL/locale/metadata và logic thực sự thay đổi. |
| Integration | Kiểm tra xuất bản/locale/site isolation khi sửa truy vấn hoặc hook. |
| E2E | Click thật qua home → listing → detail → CTA; VI/EN, desktop/mobile. |
| Platform | Crawl mới, sitemap/hreflang/schema, mobile lab cùng cấu hình trước/sau. |
| Release | Codex review và production browser sau release; rollback theo runbook. |

## Harness Delta

- Intake 157; tạo US-086, lane normal, status planned, proof triển khai đều no.
- Map một story sang Core / E03; sáu AC thành sáu sub-work item có tên cụ thể.
- Đồng bộ Plane bằng preview, import-history và sync-workitems có filter US-086.
- Intake 158 bổ sung phép đo tốc độ, ảnh/video và cập nhật AC6 trong cùng US;
  giữ trạng thái planned và proof triển khai bằng 0.
- Intake 159 làm rõ AC6.1–10, phương án CMS P2, vận hành và phản biện độc lập;
  sáu child không đổi số lượng, ngưỡng lab là đề xuất phải chốt trước code.
- Intake 160: tham vấn Claude Code qua herdr và quyết định user public mọi
  ảnh editor upload vào Go; cập nhật G-Async và tracking, planned/proof0.
- Intake 161: triển khai candidate AC6 qua agy/herdr, Codex kiểm chứng và Claude
  review;69test local đạt, statusin_progress/proof0 toànUS. ARM/CMS/CDN và
 18lượt Lighthouse còn mở; giữ lịch đề xuất đến 2026-11-06.
- Intake 162: triển khai theo yêu cầu user, build ARM64, backup/restore thật,
  CMS canary trên DB riêng, 70 test và Codex release review đã có bằng chứng.
  Nginx sửa cache/Range; cutover rollback lúc 13:09 và 13:19 ngày 2026-10-25
  vì public CDN gate chưa đạt. Sau user đăng nhập Cloudflare, sửa Browser Cache
  TTL về Respect Existing Headers cho hai zone; backup/restore mới và cutover
  21:29 ICT thành công, SHA `8278868`. Public gate 9/9 đạt; current/previous
  đều hợp lệ, tài nguyên canary riêng đã dọn. Retest đủ 172 URL và crawl độc
  lập hoàn tất; 40 ảnh ghép đúng mẫu: Group giảm 40,995% byte, Go 0%.
  WingsGo vẫn 63 content 404, 2 sitemap 404; lỗi nội dung F01–F06 chưa giảm.
  Đủ18 lượt Lighthouse cùng protocol, exit0, warning0/HTTP lỗi0 lượt mới.
  LCP Go home mobile17,24→5,83s (giảm66,2%), desktop3,45→1,76s (49,1%);
  detail mobile4,98→4,58s (8,0%). Group desktop2,22→2,01s (9,6%);
  Group mobile4,79→5,96s (chậm24,6%), Go listing4,61→5,42s (chậm17,5%).
  TBT Go home/detail tăng, hai cấu hình có một lượt CLS vượt0,1; chỉ Group
  desktop đạt toàn bộ ngưỡng áp dụng. Legacy backfill450Go/13Group và MP4
  khoảng11MiB còn mở. Giữ in_progress/proof0 toànUS; đã sync Plane kết quả.

## Evidence

- Audit: `seo-audit-20261024/FULL-AUDIT-REPORT.md`.
- Action plan: `seo-audit-20261024/ACTION-PLAN.md`.
- Crawl có thời gian và HTML gốc: `seo-audit-20261024/wingsgroup.vn/crawl.json`,
  `seo-audit-20261024/wingsgo.vn/crawl.json`, thư mục `pages/` tương ứng.
- Browser snapshots/screenshots và giới hạn Google API: `seo-audit-20261024/`.
- Baseline tốc độ và ảnh/video: `seo-audit-20261024/performance-images/REPORT.md`,
  18 JSON Lighthouse, tám inventory browser và 40 kết quả GET ảnh.
- AC6/CMS design và consultation resolution:
  `source/strategy/us086-ac6-media-20261024/` (tài liệu lập kế hoạch).
- Candidate code/local evidence: `us086-ac6-implementation-20261024/acceptance.md`,
  `review-resolution.md`, `claude-review/final-review.md` trong cùng thư mục.
- Release checkpoint và log cutover/rollback:
  `us086-production-20261025/DEPLOYMENT-STATUS.md`.
- Production release/cache proof: `us086-production-20261025/CDN-CHANGE.md`,
  `cutover-resume.log`, `delivery-public.json`, `verify-live-release.log`.
- Audit sau phát hành: `us086-production-20261025/seo/SEO-COMPARISON.md`,
  `seo-leader-acceptance.log`; đủ 172 URL và 40 ảnh, không suy diễn % SEO chung.
- Báo cáo hợp nhất sau phát hành: `us086-production-20261025/REPORT.md`;
  `performance/COMPARISON.md`, `performance/comparison.json` và18 JSON/raw log
  trong cùng thư mục. Identity/health cuối: `verify-live-release-final.log`.
- Chưa có proof nghiệm thu toàn US. Phép đo lab production và gate AC6 được
  theo dõi riêng; không dùng kết quả candidate thay số đo production.

## Follow-up checkpoint — 2026-10-26

- Intake163: candidate `5e8b89a` triển khai trên cổng canary riêng, chưa cutover
  production. Production vẫn `8278868`; không dùng kết quả canary làm số đo live.
- Đã sửa routing/locale/sitemap và projection title; EN thiếu bản dịch chuyển307
  về VI, legacy alias308; draft/preview bỏ qua fallback tour. CTA số cũ chuyển
  sang hotline trong site settings, chỉ WingsGo/WingsGroup và đúng số nghỉ dùng.
- Codex và Claude review nhiều lượt: xử lý transaction/CAS/draft race, journal
  trước commit kèm file+directory fsync, khóa editor và race khi rollback ảnh.
  Sáu suite80 test và bảy suite104 test đạt; standard Next build/postbuild exit0;
  operations image bất biến ARM64 cùng SHA, resize WebP/AVIF thực thi thật đạt.
- Database khôi phục sạch sáu site: plan/apply/verify9 sửa CMS và video homepage
  VI/EN đạt. So sánh toàn bảng/field xác nhận chỉ các trường dự kiến và history;
  media gốc115 giữ nguyên hash. Video mới4.305.405B desktop,2.287.827B mobile,
  thay bản11.546.189B khi gắn pointer (giảm62,7%/80,2% riêng file video).
- Backfill v3: source hash nằm trong plan bất biến, database name/OID binding,
  CAS, session advisory lock và khóa media khi cleanup. Forced kill giữa UPDATE
  trên DB riêng rồi resume/verify/rollback đạt; writer cạnh tranh làm cleanup
  timeout an toàn, lần chạy tiếp xóa đúng6 file, giữ nguyên ảnh gốc.
- Canary: sáu tenant đúng H1/canonical; HEAD200,Range2061024B,416 đều no-store,
  WingsGroup không đọc được videoGo. Mobile phát480x854, pause hoạt động,
  reduced-motion không có video và poster decode xong; không có lỗi JS.
- Còn gate vận hành từ release review: đóng mọi tab editor, tạm ngừng ghi/drain,
  apply/verify rồi bắt buộc mở lại/reload trước khi tiếp tục biên tập. Đã hỏi user
  bất đồng bộ, chưa nhận xác nhận; chưa ghi dữ liệu production/chuyển current.
- Product141 có draft mới nên loại khỏi script;152/153 cần editor tạo wrapper.
  Claim thương mại, bản dịch và campaign quá hạn cần dữ liệu/người duyệt thật.
- Giữ `in_progress`, proof toàn US bằng0 và target đề xuất2026-11-06. Chưa chạy
  lại18 Lighthouse/172 URL/40 ảnh production cho candidate chưa phát hành.
- Bằng chứng: `us086-followup-20261025/`, gồm `final-restored-proof.md`,
  `media-v3-crash-proof.md`, `editor-lock-restored-proof.md`, các review Codex/
  Claude, `final-build.log`, `final-delivery-probe.json` và screenshot browser.

## Production follow-up — 2026-10-26

- User xác nhận đã đóng tab CMS và cho phép triển khai. Freeze có giới hạn tại
  các endpoint biên tập trên sáu tenant; backup mã hóa mới và restore đủ sáu site
  đạt trước khi sửa dữ liệu. Không push Git, không restore đè DB production.
- Follow-up `5e8b89a` cutover 10:56 ICT; CMS mở lại 11:01 ICT. Bản imagefix
  `ba03d3f219294301dcb3a01feb0044c79399230c` cutover 11:34 ICT, BUILD_ID
  `4wg8rYMOQh1coP7liYVNC`; current/previous đều trỏ release tồn tại.
- CMS phát hiện drift do editor tạo wrapper365/367 và gắn product124/125;
  plan cũ từ chối an toàn. Tool CMS-only `0997872` sửa đúng5record, bảo toàn
  hash toàn hàng của8record cần giữ. Chưa sửa draft mới của product141.
- Backfill production208record (Go199/Group9),822derivative (768/54), kiểm đủ
  hash ảnh gốc/biến thể, byte, format, kích thước và state DB. Lần chạy cuối
  unlimited áp dụng0 thay đổi mới mỗi site. Mọi ảnh gốc giữ nguyên.
- Video mobile2.287.827B và desktop4.305.405B thay source11.546.189B khi phát;
  giảm80,2%/62,7% riêng file. HEAD200/Range206/416/no-store và cross-site404
  kiểm lại public. Mobile phát/pause đúng; reduced-motion chỉ hiện poster.
- Full-scroll smoke phát hiện4ảnh Next Image400 bị bỏ sót ở kiểm tra trên fold.
  `ba03d3f` dùng renderer Media chung; build/postbuild và native Sharp ARM64 đạt.
  Tám inventory mới sau cutover có0ảnh hỏng;34URL ảnh được chọn tải200/decode.
- Thiếu sót quy trình: imagefix chưa qua review độc lập trước cutover; có chỉnh
  cùng file khi agy còn thực hiện. Codex/Claude review bù đều khuyên giữ bản,
  không rollback; không tính đây là gate predeployment đã đạt. Delta CMS-query
  bổ sung của agy còn uncommitted/undeployed, giữ để xử lý DTO/logging/test đúng
  trước release sau. Phạm vi công khai không đổi sang chính sách media khác.
- SEO kiểm đúng172URL và40URL ảnh gốc: Go content404 từ63→10 (giảm84,1%),
  sitemap404 từ2→0, H1 lỗi3→0; nhóm39route EN tour không còn404 nhờ307 về VI.
  Campaign404 còn4/7. Bốn mươi cặp hash VI/EN đều về cùng URL VI, không phải
  40trang độc lập trùng nội dung. Group vẫn0 content404.
- Active tel link đến số nghỉ dùng bằng0, nhưng số cũ còn trong body/footer
  trên10URL Go+6URL Group và có thể gây nhầm khi khách tự quay số. Chưa đóngAC3.
  Bảng40URL ảnh gốc cho Go0% giảm byte vì giữ original; hiệu quả AVIF cần đọc
  inventory/Lighthouse, không được lấy bảng này làm kết luận không tối ưu ảnh.
- Bản đo cuối gồm18Lighthouse13.5.0 theo6cấu hình, đối chiếu baseline24/10 và
  production25/10 tại `production-window/performance-final/`. Chưa có fieldCWV,
  GSC28ngày, traffic hay ranking. Không có % tối ưu SEO tổng hợp.
- Giữ `in_progress`, proof toàn US bằng0; các ngưỡngAC6 chưa được mặc định đạt.
  Planned target 2026-11-06 retained; start 2026-10-24.
- Evidence: `us086-followup-20261025/REPORT.md`, `production-window/seo/`,
  `production-window/imagefix/` (Codex/Claude review, backup/restore, cutover,
  screenshot), `production-window/performance-final/`, media verification và
  CMS/video journal trong `production-window/`. Đã hoàn tất 18 lượt đo cuối; số trong checkpoint trước không thay thế số mới.


### Kết quả đo cuối và kế hoạch AC6 — 2026-10-26

18/18 Lighthouse exit0, không cảnh báo tải hoặc HTTP lỗi. Trung vị ba lượt:

| Kịch bản | Điểm | LCP giây | So với 24/10 | So với production 25/10 | TBT ms |
|---|---:|---:|---|---|---:|
| Go chi tiết mobile |49|6,63|chậm33,3%|chậm44,8%|553|
| Go home desktop |80|2,24|nhanh35,1%|chậm27,6%|68|
| Go home mobile |45|8,21|nhanh52,4%|chậm40,8%|830|
| Go tour mobile |61|6,72|chậm45,6%|chậm24,0%|322|
| Group desktop |89|1,88|nhanh15,3%|nhanh6,3%|0|
| Group mobile |67|6,71|chậm40,2%|chậm12,5%|269|

- Byte ảnh so với baseline sạch25/10: Go home mobile giảm66,1%, desktop76,7%,
  tour91,9%. Không tính % byte Go home/tour so với24/10 do baseline có cảnh báo.
- Chỉ Group desktop qua toàn bộ gate tương ứng. Bốn mobile đều dưới2MiB nhưng
  chưa đạt LCP2,5s/TBT200ms. Go desktop có CLS0,18056 ở một lượt; Go home/tour
  mobile tối đa0,3072/0,3054. Không dùng median0 để kết luận CLS đã đạt.
- 34/34 ảnh tải200 và Sharp decode đúng cùng SHA256;21 lỗi AVIF trong log Pillow
  là decoder local không hỗ trợ, giữ nguyên log kèm image-decoder-supplement.json.
- Group mobile lượt đầu chồng khoảng5giây với test của reviewer; giữ dữ liệu và
  ghi giới hạn CPU/network, không rerun chọn điểm. Đây không phải fieldCWV.
- Kế hoạch tiếp theo: (1) profile SSR/DB/cache theo tenant+locale+published, đo
  cold/warm và test invalidation/isolation; (2) giảm JS/hydration/long task đo được;
  (3) tìm node gây CLS, dành sẵn kích thước và yêu cầu cả ba lượt ≤0,1;
  (4) tile Nhật552.439B cần Media DTO công khai được chiếu field tối thiểu,
  lookup đúng site và logging/test fallback; (5) đo lại18 lượt cùng cấu hình.
- Poster Go home mobile chỉ8.181B, đã eager/high-priority; trace có TTFB khoảng
  4,07s và download150ms. Không quy mọi chậm trễ cho ảnh; thời gian trace thực
  không đồng nhất LCP mô phỏng8,21s.
- Delta CMS-query đã lưu held-cms-query.patch rồi revert khỏi worktree, chưa
  triển khai. Không thay đổi quyết định public toàn bộ ảnh editor upload.
- Giữ US/AC6 đang thực hiện, proof toàn US0. Review bù không xóa việc thiếu gate
  trước imagefix. Planned target 2026-11-06 retained; start 2026-10-24.
- Chi tiết: us086-followup-20261025/REPORT.md và
  production-window/performance-final/COMPARISON.md, COMPARISON-PREVIOUS.md,
  comparison.json, comparison-previous.json cùng18report JSON gốc.


### Final review và incident editor tour141 — 2026-10-26

- Claude review cuối KEEP production/HOLD query patch; bổ sung giới hạn:
  baseline Go home24/10 có cảnh báo nên % LCP nhanh hơn không đáng tin;
  baseline sạch25/10 cho thấy home desktop/mobile chậm27,6%/40,8%.
  Go detail/home mobile/tour giảm điểm64→49/57→45/71→61 so với25/10.
  CLS desktop median≈0,0003;34URL ảnh tương ứng30payload hash riêng.
  P3 mới:12URL biến thể lặp cache tag; chưa sửa code production.
- Editor báo path_occupied ở tour141. Read-only05:02:21Z và tab CMS xác minh
  product141 published/latest version702, wrapper null; page347 published đúng
  site2/path/parent208 và chưa tour nào dùng. Version591 từng gắn347,
  version592 trở đi null; chưa đủ bằng chứng quy trách nhiệm writer.
  Nút “Gán wrapper này” cho347 đã có; guard tạo mới đang ngăn ghi đè đúng.
  Chưa sửa dữ liệu khi kiểm tra; xác nhận user đang chờ vì nối published record
  có thể phục hồi hiển thị public. Ghi chú draft141 trước đây không còn hiện hành.
- Runtime sau cleanup canary: image/BUILD/current/previous đúng, DB/Redis ready;
  đĩa còn3,2GiB/93% used. Giữ backup mã hóa và DB restore. Log còn translation
  keys, Server Action x và CSP jsdelivr; chưa xác định nguồn request, không nớiCSP.
- Evidence: production-window/tour141-readonly.log,
  imagefix/final-health.log, claude-final-production-review.md.

### AC6 continuation đã qua review và deploy — 2026-10-26

- Cutover production `bf1cd8eb5a78636d39e8289e0ba2a918ace14d72` lúc
  2026-10-26T07:05:04Z (14:05 ICT); previous còn tồn tại là `ba03d3f`.
  BUILD_ID `BGbikRppAWhiLN0diGwhz`; app image `sha256:230f3fd94c55ae2b1a60525decdbfdc0aa1c9364388a299d8b83f7106b43de82`.
- Đã giảm JS khách ẩn danh bằng lazy AdminBar; memo theo request/parallel read;
  market Media DTO được lọc tenant; hero nhỏ dùng thumbnail; card chọn AVIF;
  dedupe timestamp URL; tách RichText/Form cùng bridge giữ đúng ngữ cảnh.
- Sửa public-media để nhận thumbnail đăng ký trong Payload; lỗi governance
  dùng APIError403, trả thông báo chung/no-store, không che lỗi DB khác.
  WingsGo vẫn public toàn bộ ảnh editor upload; governance Group giữ nguyên.
- Codex review tích hợp + thumbnail + governance đều hoàn tất; Claude final
  SHIP đúng SHA trước cutover. Hai P2 của script rollback đã sửa trước deploy.
  41 test delta/typecheck/build/native ARM64 đạt. Backup mã hóa mới và restore
  PostgreSQL thực tế đủ6sites/6homepages;52/52 migration production đã applied.
- Runtime candidate:9derivative khớp hash/byte file, tenant sai404; original và
  thumbnail Group pending403 generic/no-store; restore fixture200; video206/416.
  Hero thumbnail40.469B, card AVIF90.269B thay original552.439B tại slot nhỏ.
- Auth/preview/exit/logout/token cũ kiểm thật trên clone. RichText ban đầu không
  có dữ liệu Lexical ở bất kỳ itinerary; worker báoPASS rtCount0 bị bác bỏ.
  Root dùng fixture chỉ trong DB clone, chuyển trang CSR thật cùng documentUUID,
  thấy đúng text và context tour69; khôi phục contentNULL có receipt.
- Production readiness DB/Redisup/leadDeliveryconfigured; browser home xác nhận
  BUILD mới, thumbnail loaded và anonymous AdminBar không hiện. Không sửa dữ liệu
  editorial/original media hay schema, không pushGit. Tour141 vẫn chờ quyết định
  riêng, không nối wrapper347 trong lượt này.
- Evidence: `us086-followup-20261025/ac6-next-20261026/REPORT.md`, Codex/Claude
  review, backup-final.log, migrate-status-postgres.log, cutover.log,
  production-identity.log, media-runtime-final-original-results.json,
  richtext-csr-after.json, richtext-fixture-restore.json, auth-bf1-*.json.
- 18Lighthouse tuần tự đang đo tại `ac6-next-20261026/performance-final/`;
  code SHIP không thay thế acceptance. Dedupe runtime chưa đủ attribution;
  không suy tốc độ từ các sample có concurrent load. Chưa đo CLS/blank interval
  khi CSR, chưa thử thiết bị thật/fieldCWV/GSC/ranking/traffic.
- Giữ US/AC6 `in_progress`, proof0, start2026-10-24/target2026-11-06.

### AC6 — bản sửa reduced motion và đo lại ngày 26-10-2026

- Production hiện tại `e8ed1a61cfb91d6d625d516bf4230cf5d50e1c03`, cutover
  2026-10-26T07:43:42Z (14:43 ICT), previous `bf1cd8e` còn tồn tại và có image
  cố định. BUILD_ID `VK3wimgFfnq_SxFGKJBix`.
- Root xác minh transition khởi tạo logo280→56px/header323→81px trong chế độ
  giảm chuyển động gây CLS khoảng0,29. Thay một dòng thành `transition:none`.
  Năm lần tải production mobile giảm chuyển động và một lần bình thường đều
  CLS0, menu mở/Escape đóng; rainbow chỉ quay khi không bật giảm chuyển động.
- Codex/Claude review trước deploy đều SHIP; production/nativeARM64 build exit0.
  Backup mã hóa mới SHA25609ec44ef24f4fcdf909fea332238fb228e8a8e5a3e9a5b03841411859f752435,
  restore PostgreSQL thực tế6sites/6homepages,52/52 migration đã applied.
- Bộ18LH của `bf1cd8e` đã xong: cả6scenario còn OPEN, Groupdesktop LCP3,64s,
  Groupmobile10,77s; không bỏ kết quả xấu. Tổng transfer Go home giảm39,38%
  mobile/36,31%desktop so ba03d3f. Bộ18 riêng trên e8 tại
  `us086-followup-20261025/ac6-next-20261026/performance-e8ed1a6/`.
- Retest172URL trên bf1: content40463→10 (-84,1%), sitemap4042→0, H1lỗi3→0;
  40hash VI/EN giống nhau là redirect cùng finalURL, không phải40trang trùng.
  Còn10content404/4campaign404/16URL chứa hotline cũ. CSSdelta không sửa nội dung.
- Evidence đầy đủ: `us086-followup-20261025/ac6-next-20261026/REPORT.md` và
  `postrelease-e8-review.md`. US/AC6 vẫnin_progress/proof0, giữ ngày đã lên kế
  hoạch2026-10-24→2026-11-06. Tour141 không sửa, không pushGit.

### Kết quả cuối bộ đo e8 — 26-10-2026, 14:57 ICT

- `run-lighthouse.ps1`, `summarize.py`, `compare-history.py` đều exit0,18report
  hợp lệ,0warning/0HTTPerror, cấu hình đóng băng giống baseline. Cả18CLS≤0,1.
- Desktop: Go LCP1,81s/TBT0/CLSmax0,0003; Group1,72s/0/0,0012, đều PASS.
  So ba03, LCP giảm19,4%Go và8,3%Group, không phải %SEO tổng thể.
- Mobile vẫn OPEN: GroupLCP6,96s/TBT814ms; Go home9,01s/335ms;
  tour7,04s/134ms; detail6,54s/575ms. Không đóng AC6.
- Tổng transfer Go home so ba03 giảm39,46%mobile/36,31%desktop;
  toàn bộ lượt mobile dưới2MiB. Giữ đầy đủ5mốc24Oct/25Oct/ba03/bf1/e8 trong
  `performance-e8ed1a6/historical-comparison.json`, kể cả warning baseline24Oct.
- Smoke SEO trên e8:6HTML đúngBUILD/H1/canonical/khôngnoindex;2sitemap XML hợp lệ.
  Không gọi đây là recrawl172URL e8; bộ172URL đã hoàn tất trên bf1, trước CSSdelta.
- Canary chính xác đã xóa; thông tin đăng nhập thử và helper/browser của lượt này
  đã dừng; encryptedbackup/DBrestore/current/previous giữ nguyên. Readinessready,
  free1.152.356.352B/98%used. Cần theo dõi dung lượng trước build kế tiếp.
- Hướng triển khai tiếp có tiêu chí trong REPORT: đo origin/edge/cache/query theo
  request, giảm JS mobile dựa coverage/chunk thực tế, giữ SSRRichText/context,
  tenant/preview isolation; Media tiếp tục Payload/Sharp, WingsGo public-on-upload.
  Không tự thêm worker/schema khi chưa có bằng chứng G-Async trên ARM.

### Dọn file build VPS theo yêu cầu — 26-10-2026

- Đã xóa24mục build/archive/clone-media hết dùng qua allowlist và audit root;
  Claude review đã giải quyết2P2 trước apply. Thu hồi thực2.050.695.168B (1,91GiB),
  trống khoảng2,98GiB,98%→94%used; không cộng trùng các hardlink diễn tập.
- Không restart app. Currente8/previousbf1 và image app/ops mốcba03 giữ nguyên;
  không xóa Dockerimage/volume/DB/backup/media gốc/cache dùng chung.
- Readinessready DB/Redisup/leadconfigured; kiểm browser thật Go/tour và Group home
  đúngBUILD, H1/ảnh render, không browsererror; menu Go mở/Escape đóng.
  Inventorymedia7.962file/1.878.609.435B và12samplehash khớp trước/sau.
- Evidence `us086-followup-20261025/vps-build-cleanup-20261026/REPORT.md`,
  audit-final.json,result.json,cleanup-review.md,health-after.log,ảnh browser.
- Chưa kiểm toàn bộCMS/gửi lead thật; clone muốn diễn tập lại phải dựng mediafixture.
  Giữ US/AC6in_progress/proof0 và mốc kế hoạch2026-10-24 đến2026-11-06.

### Sửa ảnh trang lịch khởi hành — 26-10-2026, 16:01 ICT

- Production be016fe thay e8ed1a6; previous e8, BUILD2cxCV9x7P_7KR0xCfFBxs.
  Nguyên nhân UI lịch chưa render ảnh tour, không có bằng chứng media bị xóa.
- Dùng lại Media/AVIF/responsive/lazy trong card thị trường, DepartureStrip và
  danh sách tương tác; override→hero, picture có chiều cao đúng. Không đổi schema/CMS.
- Component21/21, typecheck/build/package/ARM64 pass; Codex SHIP, Claude KEEP.
  Backup mới khôi phục thật6sites/6homepages;52migration applied, none pending.
- Browser production desktop/mobile412px đúngBUILD, ảnh tải và có chiều cao,
  không tràn ngang mobile; Nhật Bản22rows giữ đúng ảnh/tour/CTA, media mẫu200,
  không pageerror. Japan market/campaign mẫu render đúng. China priority card
  không có ảnh vì đang báo chưa có lịch khởi hành sắp tới, không phải ảnh404.
- Xóa exact canary và .next/node_modules staging mới, giữ pinnedimages/rollback/
  backup/media gốc. Free2657681408B(~2,48GiB),95%used; readiness sau dọn ready.
- Evidence: `us086-followup-20261025/schedule-images-20261026/REPORT.md` và
  `claude-release-review.md`, `production-*.json`, screenshots, cutover/cleanup logs.
- US/AC6 vẫn in_progress/proof0, planned start 2026-10-24 target 2026-11-06.
  Bộ18LH e8 là lịch sử; chưa đo lại Lighthouse trên be016fe, mobileLCP/TBT còn mở.
  Không pushGit, không sửa tour141 hoặc gửi lead thật.

### Đối soát trạng thái dự án và phân loại VPS — 26-10-2026

- Harness có70US:65implemented,3in_progress (US-056,US-077,US-086),2planned
  (US-058,US-079). Implemented là trạng thái triển khai, không tự coi là khách
  hàng đã nghiệm thu. US-056 vẫn chờ production; US-077 còn bước hoàn thiện/QA.
- Live identity: currentbe016fe,previouse8ed1a6,thirdbf1cd8e; cả hai symlink hợp lệ.
  Runtime ready, không thay CMS/schema/tour141. AC6 chưa đóng vì mobileLCP/TBT.
- Rà soát VPS read-only: disk95%, free2622791680B(~2,44GiB). Dockerimages/cache
  là phần ưu tiên; file staging đã giải nén còn ít. Danh mục cụ thể, điều kiện
  và bằng chứng: `ops-status-cleanup-20261026/REPORT.md`, `classification.json`,
  `vps-inventory.json`, `vps-details.json`. Lượt này chưa xóa/restart/deploy.
- Giữ planned start 2026-10-24, target 2026-11-06, US/AC6in_progress/proof0.

### Dọn Docker image/cache theo yêu cầu — 26-10-2026, 19:14 ICT

- Xóa đủ31imagecũ bằngexacttags, khôngforce; giữ6app/opsimage của3release
  be016fe/e8ed1a6/bf1cd8e vàmọiimage đangđược11containerdùng.
- Dọncache cảdefault/builder bằngBuildKitCLI. Sau dọn còn9entryShared/
  nonreclaimable,0Breclaimable; khôngđụngvolume/containerd files trực tiếp.
- Thu hồi filesystem19.500.290.048B(~18,16GiB),trống~20,60GiB;disk95%→54%.
  11containerID/StartedAt/restartCount giữnguyên,6releaseimage/symlink/BUILD
  đúng,readyDBRedisup/leadconfigured,12mediaSHAkhớp. BrowserảnhGo tải200/error0.
- Claude reviewP2resume đãsửa,7casepass;SHIPtrước/KEEPsau. Khôngdeploy/restart/
  CMS/DB/sourcewrites. Rollbackchỉ3release;oldops/composengoàiretentionkhôngchạy.
- Evidence `ops-docker-cleanup-20261026/REPORT.md`,plan/scriptSHAreceipts,
  images/cache/verifyreceipts,review.md,browser-after.png/json.
- Giữ US/AC6in_progress/proof0,planned start 2026-10-24 target 2026-11-06.
  MobileLCP/TBTchưađạt;chưafullLH/CMS/leadtronglượtdọn. KhôngpushGit.
