# Tham vấn độc lập US-086 / AC6: kế hoạch media bền vững trong CMS

## Khuyến nghị

**Đồng ý hướng P2, nhưng nên thu gọn và tách theo các mốc quyết định.** Dùng lại Media, Payload/Sharp, renderer và route `/media` là đúng. Tuy vậy, AC6.6 và AC6.7 hiện viết như thể đã chọn xử lý bất đồng bộ, có con trỏ generation và giữ generation cũ. Code hiện tại không có các khái niệm đó. Chính các cơ chế này mới tạo ra phần lớn rủi ro race, crash và revoke cần test.

Code cho thấy một đường ngắn hơn nhiều:

- Mọi upload, của mọi site, đã sinh sẵn 6 bản WebP/AVIF 640/960/1440 (`app/src/collections/Media.ts:214-220`).
- Route public đã cho phép đọc các bản này với media của mọi site (`app/src/app/(payload)/api/public-media/[filename]/route.ts:104-110`).

Vì vậy, đợt sửa đầu cho Go chủ yếu là sửa renderer và backfill. Phần lớn không cần schema mới, worker hay generation pointer.

Kế hoạch này **chưa sẵn sàng production** và tôi không xác nhận code hiện tại đạt yêu cầu.

---

## Các finding

### P1

**P1-A. AC6.6 bắt buộc test race của luồng bất đồng bộ dù chưa quyết định có dùng job hay không**

- **Vị trí:** AC6.md §AC6.6 (đoạn "Test hai replace hoàn tất ngược thứ tự…, crash trước/sau pointer switch…") và CMS-DESIGN.md §3 (desired/active generation).
- **Code hiện tại:**
  - Sharp tạo các bản resize ngay trong request upload/update của Payload.
  - Chưa có media task. `payload.config.ts:277-281` chỉ có 3 task về lead.
  - Chưa có pointer hay generation. `getMediaUrl(url, updatedAt)` chỉ thêm query.
- **Rủi ro:**
  - Nhóm phải xây CAS, lease và retained generations chỉ để có thứ đem đi test. Đây là overengineering.
  - Hoặc AC6 không bao giờ đóng được, vì không có pointer switch nào để test.
- **Sửa nhỏ nhất:** Thêm mốc quyết định **G-Async**:
  - Trước tiên đo thời gian upload/replace thật trên ARM staging khi sinh 13 size, gồm 3 AVIF (tối đa 1440), với file PNG ~3 MB và 3156px.
  - Nếu không timeout và ở dưới ngưỡng chốt trước, giữ xử lý đồng bộ. Khi đó AC6.6 chỉ cần:
    - hai replace đồng thời cho ra một kết quả nhất quán, kiểu last-writer-wins và khớp metadata của size;
    - crash giữa ghi file và commit DB chỉ để lại file orphan, không làm hỏng record.
  - Chỉ khi chuyển sang job thì mới bật đủ các yêu cầu revision/CAS/lease/retry.
- **Bằng chứng cần có:** Log thời gian upload/replace (p50/max), RAM/CPU đỉnh và quyết định G-Async được ghi trước khi viết code.

**P1-B. AC6.7 phụ thuộc ngầm vào một schema mới cho Go**

- **Vị trí:** AC6.md §AC6.7 ("Anonymous không đọc được draft/private…"), AC6.5 ("Go có eligibility public riêng") và OPERATIONS.md §5.
- **Code đã xác minh:**
  - Media không phải nhóm Group được phục vụ chỉ cần đúng site và đúng filename. Route không kiểm tra publication hay rights. Nó dùng `overrideAccess: true` và chỉ có nhánh `managedBy === 'wingsgroup-v3'` (`route.ts:115-128`).
  - Collection Media không có trạng thái draft/private cho media ngoài Group.
  - Vì vậy, chữ "draft/private của Go" hiện không có trong dữ liệu. Muốn test được phải có field mới, hoặc phải dò ngược media đang được nội dung đã publish tham chiếu.
- **Rủi ro:**
  - AC6 vô tình kéo theo một mô hình publication mới cho toàn bộ media của 6 tenant, gồm schema, migration và backfill trạng thái.
  - Hoặc AC6 bị đóng mà requirement này không có nghĩa thật.
  - Đây là **giả thuyết rủi ro**, không phải lộ dữ liệu đã quan sát. Tôi không có bằng chứng media nhạy cảm của Go đang bị đọc.
- **Sửa nhỏ nhất:** Thêm mốc **G-Eligibility** với 2 lựa chọn:
  - (a) Ghi nhận chính thức rằng "media Go được public theo site khi upload" là rủi ro chấp nhận. AC6 chỉ yêu cầu **không mở rộng** phạm vi lộ: derivative chỉ đọc được khi parent đã đọc được theo cùng quy tắc, và không có loại filename mới. Kèm test cross-site và forged header.
  - (b) Tách mô hình publication cho media Go thành quyết định kiến trúc riêng, có migration review.
  - Đợt đầu của AC6 nên dùng (a).
- **Bằng chứng cần có:** Quyết định được ghi lại, cùng negative test cross-site và forged `x-site-code`/Host trên cả route mới và cũ.

**P1-C. Mục tiêu trang ở AC6.9 phụ thuộc vào việc không có trong kế hoạch: TTFB và JS**

- **Vị trí:** AC6.md §AC6.9 (LCP ≤2,5s mobile, TBT mobile ≤200ms); REPORT.md §P2 cho thấy document response của Go ~1,74s, TBT Group mobile 742ms.
- **Rủi ro:** Với RTT 150ms, CPU 4x và gần 1,7s chờ tài liệu, ngưỡng LCP 2,5s mobile của Go gần như không đạt được chỉ bằng sửa media. TBT 742ms của Group cũng không liên quan media. CMS-DESIGN và OPERATIONS không có hạng mục nào cho cache HTML/ISR của Go hay hydration của Group. AC6 có nguy cơ mở vô thời hạn, hoặc bị áp lực nới ngưỡng.
- **Sửa nhỏ nhất:** Giữ một AC nhưng chia trạng thái checklist:
  - **Media gate** (AC6.2–6.4, theo từng asset) có thể đạt độc lập.
  - **Page gate** (AC6.9) cần có hạng mục chẩn đoán TTFB/JS kèm owner, nằm trong AC6.3.
  - Ghi rõ rằng sửa TTFB hoặc cache HTML là một thay đổi rủi ro riêng, cần execution review.
  - Không đổi ngưỡng.
- **Bằng chứng cần có:** Trace tách redirect/CDN/origin cho tài liệu Go, và danh sách long task của Group trước khi viết code.

**P1-D. Media Group cũ có thể không đạt quy tắc "nguồn ≥1440"**

- **Vị trí:** CMS-DESIGN.md §3 và AC6.5 ("Nguồn Group mới phải đủ 1440px effective width"); REPORT.md §P1 ghi hero/ecosystem Group có JPEG gốc **1086×1448**.
- **Rủi ro:**
  - Nguồn rộng 1086px thì không thể có bản 1440 thật. Bản đang verified có thể đã bị upscale, hoặc có width thật khác 1440 mà vẫn được ghi là 1440. Điểm này **chưa kiểm**: tôi chưa decode file 1440 của hero.
  - Quy tắc mới có thể khóa replace/re-publish của chính hero đang chạy.
  - Ngược lại, `validateMediaGovernance` chỉ so key `format:width` trong metadata (`fields/wingsGroupV3.ts:146-158`), không decode file. Vì thế quy tắc này không thật sự được bảo đảm.
- **Sửa nhỏ nhất:**
  - Inventory chỉ đọc mọi media Group đã publish: so width nguồn với width decode của từng bản 640/960/1440.
  - Chốt cách xử lý legacy (giữ nguyên tới lần replace kế tiếp), trước khi bật enforce.
- **Bằng chứng cần có:** Bảng mediaID → source W×H → width decode thật của 6 bản.

### P2

**P2-A. Srcset dùng width lấy từ tên size thay vì width thật**

- **Vị trí:** `components/Media/ImageMedia/index.tsx:45-62`. Hàm `getGeneratedDerivativeEntries` dùng `Number(match[1])` từ tên size, không dùng `sizes.*.width`.
- **Đã xác minh:** Đây đúng là lỗi mà AC6.2 mô tả. Nếu Payload không upscale nguồn nhỏ, size có thể thiếu hoặc nhỏ hơn danh nghĩa, khiến descriptor sai.
- **Chưa kiểm:** Hành vi mặc định `withoutEnlargement` của Payload 3.84.1.
- **Sửa nhỏ nhất:** Resolver đọc `width` thật từ map sizes; loại entry null; gộp các width trùng.
- **Bằng chứng cần có:** Unit test với nguồn 320px, nguồn portrait và nguồn bị xoay orientation.

**P2-B. "Dùng lại sizes hiện có" quá rộng**

- **Vị trí:** CMS-DESIGN.md §2, dòng `Media.ts`.
- **Đã xác minh:**
  - Các size `thumbnail/small/medium/large/xlarge/og` không có `formatOptions` (`Media.ts:182-213`). Vì vậy poster PNG sẽ sinh ra bản PNG 300–1920px, rất dễ vượt budget.
  - Route không whitelist các tên size này (`route.ts:104-110`), nên đi qua `/media` sẽ trả 404.
- **Sửa nhỏ nhất:**
  - Ghi rõ trong design: ảnh public chỉ dùng 6 bản `wingsgroup-v3-*` WebP/AVIF. Các bản này thực chất dùng chung cho mọi site; đổi tên chỉ khi có migration.
  - Thumb 62 CSS px × DPR 2 ≈ 124px vẫn dùng được bản 640 AVIF (~42 KB trong mẫu, dưới budget 50 KiB). Vì vậy hoãn profile 160/320 cho tới khi có số đo cần thiết.
- **Bằng chứng cần có:** Inventory byte của bản 640 AVIF/WebP cho các poster Go nặng nhất.

**P2-C. Preload JPEG Group: đã thấy nguyên nhân khả dĩ, cần ghi vào checklist**

- **Vị trí:** `ImageMedia/index.tsx:162-175`. `NextImage` nhận `priority` cùng `src` là ảnh gốc, nằm trong `<picture>` có `<source>` AVIF/WebP.
- **Đánh giá:** Next tự sinh preload cho `src`. Đây là JPEG/ảnh gốc, lệch với AVIF mà `picture` chọn. Lỗi này khớp với initiator `link` ghi trong REPORT. Ngoài ra `EcosystemExplorer.tsx:215` đặt `priority={activeIndex === 0}` cho section dưới fold.
- **Sửa nhỏ nhất:** Khi đã có `responsiveSources`, không dùng `priority`/preload của `NextImage`. Chỉ đặt `fetchPriority="high"` cho `img` của hero, và bỏ priority ở Ecosystem.
- **Bằng chứng cần có:** Network cold không còn request JPEG có initiator `link`.

**P2-D. Video: code hiện tại có hai lỗi cụ thể mà AC6.4 chưa nêu**

- **Vị trí:** `heros/presentations/index.tsx:539-565` và các mockup ở `:600`, `:674`, `:738`.
- **Đã xác minh:**
  - (1) `onError` gắn trên `<video>`, nhưng lỗi tải của `<source>` phát trên phần tử `<source>`, không lên `<video>`. Vì vậy `setFailed` có thể không bao giờ chạy khi 404 hoặc lỗi mạng (theo hành vi HTML spec; chưa test browser).
  - (2) `aria-hidden="true"` trên video. Nút phát/tạm dừng truy cập bằng bàn phím mà AC6.4 yêu cầu phải nằm ngoài phần tử này.
  - (3) Hai `<video autoPlay>` có source đều render cùng lúc. Lỗi tải kép đã được biết, đúng như AC nói.
  - (4) Các mockup dùng field `media` đơn, không dùng nhóm `video.*`. Muốn có poster thì **phải sửa dữ liệu CMS production** của hero Go home. Đây là một thay đổi nội dung có rollback, chưa có trong OPERATIONS §6.
- **Sửa nhỏ nhất:**
  - Thêm vào AC6.4: bắt lỗi trên `<source>` hoặc kiểm tra `video.error`/`networkState`; có control nằm ngoài `aria-hidden`.
  - Thêm vào OPERATIONS: bước chuyển hero mockup sang `video.*`, có dry-run và rollback.
- **Bằng chứng cần có:** Test làm hỏng URL source để chứng minh poster vẫn hiển thị; test bàn phím.

**P2-E. Range/MIME: AC6.4 đúng hướng, cần thêm trình duyệt WebKit**

- **Đã xác minh:**
  - `publicMediaContentType` không có `mp4`, nên trả `application/octet-stream`.
  - Route luôn stream 200 toàn file nhưng vẫn khai `Accept-Ranges: bytes` (`route.ts:139-147`).
- **Rủi ro:** Chrome chấp nhận 200. Safari/iOS đòi 206 cho video. Nếu cache miss hoặc vừa purge, origin trả 200 thì video có thể không phát trên iOS. Đây là giả thuyết, chưa test.
- **Sửa nhỏ nhất:** Ma trận test của AC6.4 phải có WebKit/iOS Safari với cache bypass. Tránh chỉ test Chrome.

**P2-F. Cache hiện tại chưa phù hợp giới hạn thu hồi đề xuất**

- **Đã xác minh:** Mọi media public, kể cả Group governed, đang có `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400` (`route.ts:144`).
- **Rủi ro:** Nếu CDN tôn trọng SWR, cửa sổ thu hồi khi không purge có thể kéo dài khoảng 1h + 24h. CDN có tôn trọng hay không là **giả thuyết**, chưa xác minh với Cloudflare.
- **Sửa nhỏ nhất:**
  - Ghi trạng thái code hiện tại này vào OPERATIONS §5.
  - Bỏ SWR, hoặc dùng TTL ngắn, cho media governed **trước** khi bàn đến URL immutable.
- **Bằng chứng cần có:** Probe warm cache sau unpublish trên staging hoặc CDN.

**P2-G. Số liệu của AC6.9 có thể bị "chơi"**

- **Tập request thiết yếu do người đo tự chọn.** Cần định nghĩa bằng quy tắc, ví dụ "mọi request bắt đầu trước LCP hoặc trước video gate". Không nên là danh sách viết tay.
- **Tắt video khi đo.** Cấm phát hiện UA, headless hay Lighthouse để bỏ video, và test điều đó.
- **Poster làm phần tử LCP.** Poster mờ hoặc chất lượng thấp sẽ cho LCP đẹp. Cần mốc so sánh chất lượng thị giác với poster gốc.
- **Video sau gate có thể làm phép đo không hoàn tất.** Nếu gate kích hoạt trong cửa sổ đo, video tải sau gate có thể giữ mạng bận và gây cảnh báo "tải chưa hoàn tất". Tiêu chí "đủ ba lượt không warning" có thể mâu thuẫn với một gate đúng thiết kế. Nên chốt trước cách tính, không xử lý sau khi đã biết kết quả.

**P2-H. Kiểm publish theo slot ảnh hưởng rộng**

- **Vị trí:** AC6.5 yêu cầu server kiểm media bắt buộc theo slot/locale. Việc này chạm hook của pages, tours, site-settings và blocks, trên cả 6 tenant.
- **Sửa nhỏ nhất:** Đợt đầu chỉ áp cho các slot AC6 thực sự sửa: poster hero video và ảnh card/detail tour. Các slot khác chỉ cảnh báo.

### P3

- CMS-DESIGN.md đánh số mục 1–5 rồi nhảy sang §8. OPERATIONS.md bắt đầu ở §5. Tham chiếu chéo dễ nhầm, nên đánh số lại.
- Admin preview theo slot và cảnh báo crop chữ (CMS-DESIGN §3, phần trải nghiệm biên tập): nên hoãn sang sau đợt đầu. Đợt đầu chỉ cần cột byte, kích thước, có/thiếu derivative trong list, cộng lỗi rõ ràng từ server. Admin upload của Payload vốn đã hiển thị các size.

**Các mảng còn lại:** Không có finding mới về baseline/protocol AC6.1, backfill AC6.8 hay bộ evidence AC6.10 trong phạm vi review, ngoài những ý đã nêu trong P2-G.

---

## Thứ tự triển khai đề xuất

1. **G0 – Chốt và kiểm kê (chỉ đọc, chưa code)**
   - Chốt protocol, quy tắc tập request thiết yếu và cách tính video sau gate.
   - Inventory media đang dùng ở 6 URL: size nào có hoặc null, width/byte thật, media import originals-only.
   - Inventory Group cho P1-D.
   - Trace TTFB Go và long task Group.
2. **Đợt 1 – Sửa renderer, không đổi schema**
   - Resolver dùng width thật và bật `picture` cho media Go có derivative.
   - Sửa preload và priority của Ecosystem.
   - Sửa mapper card/detail Go.
   - Truy nguồn URL `_next/image?w=640` của Group. Tôi chưa xác định component nào sinh ra URL này.
3. **Đợt 1b – Video và route**
   - Route thêm MIME mp4 và Range 206/416.
   - Chỉ một video active, gate phía client, poster, bắt lỗi trên `<source>`, control bàn phím.
   - Chuyển nội dung hero Go sang `video.*`, có rollback.
   - Dùng MP4 đã chuẩn bị sẵn.
4. **Gate A** – Đo đủ 18 lượt. Đánh giá media gate và page gate riêng.
5. **Đợt 2 – Backfill** sinh lại size cho media thiếu derivative: dry-run, canary, resume.
6. **G-Async và G-Eligibility** – Quyết định dựa trên số đo. Chỉ khi cần mới mở execution packet có schema, CAS và worker.
7. **Đợt 3**
   - Kiểm readiness khi publish cho các slot đã sửa.
   - Thêm cột admin.
   - Đổi cache header và giới hạn thu hồi.
   - Chẩn đoán và sửa TTFB/JS theo P1-C.
8. **Hoãn tới khi có số đo:** profile 160/320, retained generation và pointer, transcode, preview theo slot, resize theo request (P3), DAM.

Toàn bộ vẫn là 1 US và 6 child, không thêm child.

## Các quyết định chưa giải quyết

1. Mô hình eligibility cho Go: chấp nhận public theo site, hay làm schema publication.
2. Ngưỡng thời gian upload đồng bộ để quyết định G-Async.
3. Cách xử lý media Group cũ có nguồn rộng dưới 1440px.
4. Giới hạn thu hồi cụ thể và giá trị cache header.
5. Người chuẩn bị MP4 web 3 MiB / 5 MiB, ai duyệt chất lượng, và ai sửa nội dung hero.
6. Owner và phạm vi việc sửa TTFB Go và TBT Group trong AC6.

## Đã xem và chưa kiểm chứng

**Đã đọc:**

- Tài liệu: AC6.md, CMS-DESIGN.md, OPERATIONS.md, review-resolution.md, US-086.md, REPORT.md.
- Code:
  - `route.ts` (public-media)
  - `publicMediaDelivery.ts`
  - `Media.ts` (đoạn 100–228)
  - `wingsGroupV3.ts` (đoạn 21–27, 120–215)
  - `ImageMedia/index.tsx`
  - `heros/presentations/index.tsx`: chỉ grep, đọc đoạn 536–566
  - `heros/config.ts`: chỉ grep
  - `siteScope.ts` (đoạn 159–233)
  - `payload.config.ts` (đoạn 255–283)
  - `proxy.ts` (đoạn 220–253), để xác nhận `/media` được rewrite sang `/api/public-media`
  - `EcosystemExplorer.tsx`: chỉ grep `priority`

**Chưa kiểm chứng:**

- Hành vi `withoutEnlargement` của Payload 3.84.1.
- Width thật của bản 1440 trên hero Group.
- Component nào sinh `_next/image?w=640`.
- Cloudflare có tôn trọng SWR hay không, và hành vi Range khi cache miss.
- Hành vi trên Safari/iOS.
- Thời gian encode trên ARM.

Tôi không chạy test, build, migration, không truy cập VPS/CDN và không đo live. Các rủi ro gắn nhãn "giả thuyết" chưa có bằng chứng lộ dữ liệu thực tế.

CLAUDE_AC6_REVIEW_COMPLETE
