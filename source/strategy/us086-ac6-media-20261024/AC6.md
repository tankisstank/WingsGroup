# AC6 — Tối ưu tốc độ tải, media và quy trình CMS

US-086 / E03, ngày24/10/2026. Đây là **điều kiện triển khai đề xuất**, không
phải proof đã đạt. Giữ một AC6 trong sáu child hiện có; các mã AC6.x dưới đây
là checklist nghiệm thu nội bộ, không tạo thêm US/sub-work item.

## Mục tiêu

Khách thấy nội dung và ảnh rõ sớm; card không tải poster gốc nhiều MB; video
có poster và không tranh tải với nội dung đầu. Editor upload file hợp lệ một
lần, CMS tạo bản web và ngăn lỗi lặp lại khi thay ảnh. Tối ưu vẫn giữ thiết kế,
chất lượng poster, quyền media và site isolation.

Giải pháp kỹ thuật: `CMS-DESIGN.md`; cache/backfill/rollback: `OPERATIONS.md`.
Baseline: `seo-audit-20261024/performance-images/REPORT.md`,18 lượt/6 cấu hình.
Tham vấn Claude và quyết định cập nhật: `claude-review/resolution.md`.

## AC6.1 — Chốt baseline và quy tắc đo trước khi sửa

| URL | Cấu hình | LCP median baseline | Lưu ý |
| --- | --- | ---: | --- |
| https://wingsgroup.vn/ | mobile / desktop | 4,79s / 2,22s | desktop CLS0,173 |
| https://wingsgo.vn/ | mobile / desktop | 17,24s / 3,45s | cảnh báo tải chưa hoàn tất2/3 và3/3 |
| https://wingsgo.vn/tour | mobile | 4,61s | cảnh báo2/3 |
| https://wingsgo.vn/tour/ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-7c | mobile | 4,98s | không cảnh báo |

- Giữ Lighthouse13.5.0, Chrome155 cùng cấu hình baseline: mobile412×823 DPR1,75,
  simulated RTT150ms/1638,4Kbps/CPU4x; desktop1350×940 DPR1, RTT40ms/10240Kbps/
  CPU1x. Nếu công cụ không còn chạy được, lưu nguyên nhân và đo lại cả baseline
  lẫn candidate cùng phiên bản; không so hai phiên bản để nhận cải thiện.
- Trước triển khai lưu build/content revision, URL, máy/mạng, cấu hình và thời
  điểm. Chạy tuần tự ba lượt/nhóm, browser storage reset; trạng thái CDN ghi
  nhận riêng. Browser-cold không được ghi thành CDN-cold nếu chưa purge thật.
- Median tính riêng từng metric từ đủ ba lượt, kèm min/max và toàn bộ warning.
  Lượt warning được giữ; không âm thầm bỏ lượt chậm. Nếu lỗi hạ tầng/công cụ
  có nguyên nhân cụ thể, ghi lý do rồi chạy lại **cả nhóm ba lượt**, giữ nhóm cũ.
- Timeout vì site tải chậm là finding cần sửa, không là lý do loại kết quả.
  Bảng baseline có warning vẫn dùng chẩn đoán, không là proof tải hoàn tất.

## AC6.2 — Ảnh thực sự đúng kích thước, format và vị trí

- Card/thumb/detail Go dùng biến thể từ media quan hệ qua resolver dùng chung;
  không dùng PNG gốc3156×1769/1,87MB cho card nhỏ. `srcset` dùng **width đã
  decode**, `sizes` khớp layout, fallback format được kiểm tra trong browser.
- Test inventory mobile412px và desktop1440px, DPR1 và2; thêm Lighthouse
  DPR1,75. Nhu cầu physical width = CSS width × DPR, ví dụ363×1,75≈635px:
  card cần640, không dùng thumbnail160/320 làm card để giảm byte.
- Chọn bản nhỏ nhất đáp ứng kích thước khi có; khi nguồn nhỏ hơn nhu cầu,
  không upscale hoặc ghi sai descriptor, CMS cảnh báo thiếu độ nét. Giữ ratio
  hoặc crop đã duyệt; poster chữ/giá/điều kiện không bị cắt mất.
- Sáu Group ảnh w640 hiện trả1440px phải có output thực phù hợp. Nếu bỏ đường
  resize theo request để dùng derivative640 đã tạo, chứng minh browser thật
  dùng derivative đó và đường cũ không còn trong HTML/preload; không cần giữ
  một optimizer không được dùng chỉ để URL có chữ w640.
- Kiểm tra response Content-Type, byte, decoded dimensions, currentSrc và
  screenshot sau sửa; tên file, query hoặc HTTP200 riêng lẻ không đủ.

**Budget đề xuất cho bản được chọn tại DPR hỗ trợ**, tính byte file sau giải
mã HTTP (không cộng header), chốt trước code:

| Vai trò | Budget / file | Hành vi |
| --- | ---: | --- |
| Thumbnail | ≤50 KiB | Không dùng ảnh gốc nhiều MB |
| Card / ảnh nội dung | ≤150 KiB | Đủ độ nét/chữ; sizes đúng layout |
| Hero / poster video | ≤250 KiB | Eager nếu trên fold, giữ ratio |
| MP4 trình chiếu mobile / desktop | ≤3 / ≤5 MiB | Chỉ bản phát web; nguồn gốc được giữ riêng |

Đây là budget nội bộ đề xuất, không phải tiêu chuẩn SEO của Google. Ngoại lệ
chất lượng phải ghi mediaID/revision/slot, lý do, người duyệt và điều kiện rà
soát; không dùng ngoại lệ để bỏ giới hạn cho cả collection. Mục tiêu trang
ở AC6.9 không tự được miễn vì một asset có ngoại lệ.

## AC6.3 — Không tải thừa và không dịch chuyển bố cục

- Group không còn tải cả JPEG fallback và AVIF cho cùng ảnh chỉ vì preload
  lệch picture; network cold xác minh request/transfer thực, không chỉ xóa prop.
- Chỉ ảnh hero/candidate đầu được eager/high-priority khi cần. Ecosystem dưới
  fold, carousel slide ẩn và ảnh list phía dưới không preload/high-priority.
- HTML/CSS giữ kích thước ảnh/section trước decode/hydrate. Đối chiếu trace
  section#about, font và resize; ảnh/copy vẫn đúng layout trên mobile/desktop.
- Kiểm tra JS long tasks/hydration và response tài liệu; media tối ưu không
  được dùng làm lý do bỏ finding TBT/CLS/TTFB còn làm trượt AC6.9.

## AC6.4 — Video poster trước, tải có kiểm soát

- Hero mockup và các video presentation cùng đường dùng trường poster,
  desktopVideo/mobileVideo hiện có; admin preview và runtime cùng contract.
  Poster có trong HTML đầu, hiển thị khi JS tắt, autoplay lỗi hoặc media lỗi.
- HTML đầu không gắn URL video tải được. Gate bật nguồn sau DOM ready,
  poster decode và nội dung đầu hiện, hero visible; chờ idle có deadline rõ
  trong code. Không đợi LCP cuối/window.load. Log timestamp gate và request.
- **Không có request body video trước gate**; chỉ nguồn active theo viewport
  được tải. Test viewport switch, tab ẩn, hero ra khỏi viewport và play/pause.
  Không mặc định CSS hidden hoặc preload=none ngăn được tải hai video.
- Reduced motion/SaveData nếu có, bị chặn autoplay và lỗi play(): giữ poster,
  cho chủ động phát/tạm dừng bằng bàn phím; không tự đổi thiết kế video thành
  ảnh tĩnh cố định. Browser thiếu network API vẫn dùng poster-first an toàn.
- MP4 có poster, codec thực phát trên browser mục tiêu, faststart và MIME
  `video/mp4`; file web đạt budget hoặc ngoại lệ được ghi rõ. AC6 chưa hứa CMS
  tự transcode nếu chưa có encoder/công suất; cho dùng bản MP4 đã chuẩn bị.
- Test origin và CDN: GET200, bounded/open-ended/suffix range206 đúng byte,
  Content-Range/Length, range không thể đáp ứng416, seek browser thật. Header
  Accept-Ranges và probe206 CDN2byte hiện có chưa chứng minh origin đúng.

## AC6.5 — CMS ngăn tái phát ở upload/replace/publish

- Upload hợp lệ tạo biến thể qua pipeline hiện có; editor thấy byte, dimensions,
  ready/processing/lỗi, preview theo slot và hướng sửa. Không yêu cầu editor
  tự đặt srcset, quality, fetchpriority hay URL biến thể.
- Server kiểm tra media bắt buộc ở publish theo slot/locale, không chỉ cảnh báo
  UI; draft vẫn lưu được. Technical ready khác quyền publish/rights approval.
- Giữ governance Group đúng sáu biến thể với width thật640/960/1440. Nguồn
  Group mới phải đủ1440px effective width sau crop/orientation; không đủ thì
  draft và chỉ giữ bản cũ nếu còn quyền. Không gắn managedBy Group cho Go.
- **User chốt ảnhGo public-on-upload:** mọi ảnh editor upload thành công và
  derivative của ảnh đều public theo site, không gate duyệt/publish/rights
  riêng, không phụ thuộc trang tham chiếu. Không thêm private/draft schema
  cho ảnhGo. Readiness kỹ thuật không cản public ảnh gốc; Group giữ governance.
- Legacy/originals-only/preview thiếu biến thể có đường xử lý tương thích;
  chỉnh sửa nội dung không liên quan không bị khóa toàn bộ do readiness mới.
- Một upload mới và một replace thật trên staging cho mỗi site chứng minh
  hành vi tự động, không chỉ chứng minh backfill các file cũ.

## AC6.6 — Xử lý nền, replace và retry không gây lỗi dữ liệu

- **G-Async trước code:** đo upload/replace ARM, p50/max và CPU/RAM đỉnh;
  chốt ngưỡng. Đạt thì giữ sync: test concurrent replace, file/metadata nhất
  quán và crash recovery. CAS/lease/pointer/job dưới đây chỉ áp dụng nếu chọn
  async, không buộc xây worker/state để có đối tượng đem test.
- Tái dùng sizes/metadata hiện có; chỉ thêm state/worker khi cần. Nếu dùng
  Payload jobs, phải có task + runner thực, queue media và một worker giới hạn
  tài nguyên ban đầu; không làm lead queue bị chậm do encode.
- Job theo site/media/sourceRevision/hash/profile/crop; file tạm private,
  physical verify rồi conditional commit nguyên tử kiểm tra cả revision và
  quyền hiện tại. Job cũ không ghi status/error mới hoặc làm sống lại publish.
- Test hai replace hoàn tất ngược thứ tự, crop đổi giữa chừng, job trùng,
  unpublish trong lúc xử lý, crash trước/sau pointer switch, disk-full,
  retry/restart và stuck-job recovery. Tối đa ba retries sau lần đầu nếu dùng
  worker; lỗi nguồn không hợp lệ báo ngay. Ghi kết quả, không chỉ test happy path.

## AC6.7 — Quyền media, cache và thu hồi

- ẢnhGo theo policy user public ngay sau upload; kiểm ảnh mới chưa có trang
  tham chiếu và derivative đều đọc được. Tenant có governance/private như
  Group vẫn chặn draft/khác tenant qua original/derivative,
  /media, public-media API, Payload file route hoặc alias storage/CDN. Test
  forged site headers và preview có auth không lọt vào public cache.
- URL generation mới khi bytes/crop/profile thay; giữ file gốc và generation
  lịch sử không đồng nghĩa giữ public authorization. Không merge/xóa theo
  hash xuyên tenant. Route whitelist profile phải đi cùng sizes mới.
- Publish/replace revalidate đúng nơi tham chiếu theo site/locale; revoke chặn
  origin, purge cache liên quan và xử lý response đang chạy có thể refill.
  Test warm cache, purge lỗi/retry và URL cũ; denied no-store, không negative cache.
- Chốt giới hạn thu hồi trước release theo OPERATIONS.md. Nếu không kiểm chứng
  được giới hạn, nội dung cần thu hồi nhanh dùng no-store; không dùng immutable
  dài hạn rồi nhận thu hồi ngay. Không thể thu hồi bytes người ngoài đã tải.

## AC6.8 — Backfill và hồi quy CMS an toàn

- Có dry-run allowlist theo site/mediaID, nơi dùng, disk forecast đỉnh và
  checkpoint; canary trước batch, resume idempotent, concurrency thấp.
- Không thay mediaID/relationship/alt/rights; không xóa file gốc/ảnh cũ.
  Pointer rollback và cache purge thử được, không restore DB toàn bộ mất lead.
- Nếu cần field/size mới: migration additive, generate types, deployed schema
  tương thích app cũ trước app mới. Preflight/readiness đủ rồi mới enforce.
- Test suite phù hợp và browser CMS mobile/desktop VI/EN; smoke đủ sáu tenant
  khi sửa shared component. Không gửi lead, gọi điện hay chat thật khi test.

## AC6.9 — Gate hiệu năng và cách quyết định đạt

**Mục tiêu lab đề xuất để chốt trước triển khai:**

| Chỉ tiêu | Cách nghiệm thu sáu cấu hình |
| --- | --- |
| LCP | Median ba lượt ≤2,5s, công bố min/max; không thay URL/nội dung để né trang chậm |
| CLS | Mỗi lượt ≤0,1; vẫn lưu median/range, không dùng median che một lượt layout lỗi |
| TBT | Median mobile ≤200ms, desktop ≤150ms; không gọi đây là INP |
| Hoàn tất phép đo | Đủ ba lượt không runtimeError hoặc warning tải chậm; nhóm có warning còn là finding, AC6 chưa đạt |
| Payload nội dung đầu mobile | Tập request thiết yếu định nghĩa trước (HTML, CSS/JS/font đầu, logo, ảnh/poster trên fold) ≤2 MiB transfer; từng request phải ghi xong để tính đủ |
| Video | Không có byte video trước gate AC6.4; byte sau gate và toàn phiên công bố riêng |

Tập request thiết yếu được chốt theo build/layout trước đo, tính một lần mỗi
network request thực và ghi cache treatment; không cộng nhiều thẻ dùng chung
URL. Nếu đang tải chưa xong thì payload chỉ là lower bound, chưa đủ proof.
Lưu thêm byte network trong cửa sổ0–5s,0–10s từ navigation và tổng lượt LH để
không che tải chỉ bằng trì hoãn. Bảng budget ảnh dùng byte file, bảng trang
dùng transfer byte; không tráo hai đơn vị.

Chạy ít nhất ba lượt/cấu hình sau sửa, so với baseline và screenshot/trace.
Không lấy điểm Performance≥90 làm tiêu chí thay cho metric. Nếu media đã tốt
nhưng server/JS làm trượt gate, AC6 vẫn mở và ghi residual cause/phương án xử
lý; không nới ngưỡng sau đo chỉ để đánh dấu pass.

Các ngưỡng trên là đề xuất kỹ thuật, **chưa cam kết kết quả hoặc deadline**.
Phải ghi protocol/version/ngưỡng được chốt trước code; thay đổi có lý do và
review độc lập, không xóa kết quả cũ. Field CWV khi đủ dữ liệu: p75 LCP≤2,5s,
INP≤200ms, CLS≤0,1. Chưa có CrUX/GSC ghi N/A, không suy ra field từ lab.

## AC6.10 — Bộ bằng chứng khi đóng AC6

- Before/after đủ18 JSON + summary median/range/warnings/config/build/revision;
  selected image URLs/dimensions/bytes và screenshot mới.
- Upload/replace/publish thật trên staging, lỗi nguồn/worker và test quyền,
  cache, range/video/quality trong AC6.2–8; kết quả suite phù hợp exit0.
- Báo cáo backfill canary/batch và targeted rollback; migration proof nếu có.
- Release consultation xử lý hết finding; production browser/network mới sau
  triển khai theo runbook. Tham vấn kế hoạch không thay release review.
- Checklist AC6.1–10 đã có evidence hoặc ngoại lệ chất lượng hợp lệ; không
  dùng tài liệu đề xuất, queued job hoặc HTTP200 làm proof AC6 đã hoàn thành.
