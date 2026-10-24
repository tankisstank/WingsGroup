# Production maintenance và kiểm tra WingsGo — 24/10/2026

## Đã thực hiện trên VPS

Người dùng cho phép dọn các mục ưu tiên của báo cáo `vps-cleanup-audit-20261024/report.md` và xử lý dứt điểm symlink `previous`.

1. **Build cache:** chạy `docker builder prune --all --force` sau khi kiểm tra không có tiến trình Docker build/management đang chạy. Docker báo thu hồi **4,048 GB**. Build cache private/reclaimable sau dọn là **0 byte**; còn 1,266 GB shared.
2. **Pip cache:** xóa đúng `/root/.cache/pip`, đã xác minh là thư mục thật và đường dẫn chuẩn. Dung lượng trước dọn **162.803.712 byte**; không thấy tiến trình cài package Python đang chạy.
3. **Bốn volume rỗng:** kiểm tra lại từng tên, local driver không có options, mountpoint chính xác, thư mục dữ liệu không có entry và không gắn bất kỳ container nào, rồi dùng `docker volume rm` không force. Đã xóa `app_postgres_data`, `app_redis_data`, `wingstravel-rollback-probe_postgres_data`, `wingstravel-rollback-probe_redis_data`.
4. **Symlink `previous`:** đọc rollback từ metadata của current; xác minh release tồn tại và cả app/ops image vẫn có; thay thế symlink nguyên tử bằng `os.replace`. Target cũ bị hỏng là `release-capability-en-20261016-143523`; target mới là **`release-us081-wingsgo-16ff60a`**. `current` giữ nguyên `release-rainbow-643a40d`.

Dung lượng trống tăng từ **1.180.839.936** lên **4.759.638.016 byte** ngay sau dọn: tăng thực tế **3.578.798.080 byte (~3,58 GB)**. Đây là số đo filesystem; không cộng số liệu logic cache của Docker để suy ra dung lượng trống thực tế. Tỷ lệ sử dụng giảm từ **98% xuống 90%**.

Không xóa image, release, archive, import, backup, media hoặc database. Không dừng 5 container công cụ lịch sử. Không restart ứng dụng hay dịch vụ dữ liệu; không migrate hoặc sửa CMS.

## Ngăn tái diễn symlink hỏng

Runbook `docs/runbooks/oracle-vps-arm64-deployment.md` được sửa để:

- Dừng ngay khi build thất bại và ghi `APP_IMAGE_ID` từ image build thành công.
- Kiểm tra current release khớp image container đang chạy trước khi ghi metadata rollback.
- Giữ release/app image/ops image được tham chiếu, không suy luận rollback từ `latest`.
- Cập nhật nguyên tử cả `previous` và `current`.
- Dùng compose override với image ID bất biến; lỗi cutover hoặc signal thì khôi phục current và app image trước đó.
- Chỉ xác nhận cutover sau khi readiness và image identity đều đúng.

Rà soát Codex độc lập phát hiện hai P2: ghép sai release/image sau cutover lỗi, và ghi nhầm image cũ sau build lỗi. Cả hai đã sửa, review cuối xác nhận **P1/P2/P3 còn lại: 0**. Các biên bản: `codex-review.md`, `codex-followup.md`, `codex-final.md`.

Chạy chính block shell từ runbook trong container local cô lập, không network và không Docker socket: **6/6 trường hợp đạt** — thành công; compose lỗi; readiness lỗi; image sai; cặp current/image sai; build lỗi. Các nhánh lỗi trả exit khác 0 theo dự kiến và khôi phục/giữ trạng thái đã xác định. Docker, curl và Python validation được mô phỏng; đây không phải thử gây lỗi trên production. Lệnh kiểm tra tổng exit **0**:

```powershell
docker run --rm --platform linux/amd64 --network none --env ISOLATED_RUNBOOK_TEST=true --mount 'type=bind,source=E:/repo/WingsTravel/production-fixes-20261024,target=/checks,readonly' --mount 'type=bind,source=E:/repo/WingsTravel/docs/runbooks,target=/runbooks,readonly' 'node:22.17.0-alpine@sha256:56a687b4d23e7a6cb49114924f5e257fcfbd33ad1f28f5c67aea9365996f2819' node /checks/verify-runbook.mjs
```

## Viền bảy màu đứng yên: xác định nguyên nhân

Kiểm tra trực tiếp trong **Edge, profile thật của người dùng**, tại trang chủ và `/tour`:

- `matchMedia('(prefers-reduced-motion: reduce)').matches` trả **true**.
- Pseudo-element của hot card có `animation: none`, góc `0deg`.
- CSS production có rule giảm chuyển động tắt animation theo lựa chọn trình duyệt/hệ thống.

Trên phiên Chromium kiểm thử, đặt chế độ chuyển động bình thường thì viền hoạt động: animation `hotRainbowSpin 5s linear infinite`, góc và màu gradient thay đổi theo thời gian; khung card không quay và không chặn click.

`verify-browser.ps1` chạy thực với `agent-browser`: **4/4** trường hợp trang chủ và `/tour`, rộng **1280/390 px**, đều xác minh góc lẫn gradient thay đổi qua 850 ms, không overflow, transform none và pointer-events none. Trường hợp giảm chuyển động **1/1** xác minh góc giữ nguyên và animation none. Exit **0**, console/error collection không có thông báo trong phiên sạch. Có ảnh mobile/desktop và video `rainbow-live.webm` ghi chuyển động bình thường.

Không thay CSS đã triển khai vì không có bằng chứng lỗi animation trong chế độ chuyển động bình thường. Không tự đổi thiết lập trợ năng toàn máy hoặc extension của người dùng. Muốn xem viền xoay trong Edge:

- Trên Windows 11: Settings → Accessibility → Visual effects → **Animation effects: On**; tải lại trang.
- Nếu đang giả lập trong DevTools: Rendering → Emulate CSS media feature `prefers-reduced-motion` → **no-preference**.

Nguồn tham chiếu: MDN `prefers-reduced-motion`, Microsoft Learn `Simulate reduced motion`. Kiểm tra chứng minh giá trị media preference đang có hiệu lực; chưa khẳng định chính xác toggle hệ thống hay DevTools nào tạo ra giá trị đó.

## Các thông báo console được báo

- **Permissions-Policy:** GET thực trên public `/`, `/tour`, `/en/tour` đều HTTP 200 và header chỉ gồm `camera=(), geolocation=(), microphone=(), payment=(), usb=()`. GET tại origin cũng khớp. Không có `run-ad-auction`, `join-ad-interest-group`, `private-aggregation`, `attribution-reporting` trong header app hoặc public đã kiểm. Không tái hiện bốn warning trên trang tải mới trong Edge/phiên kiểm thử sạch; chưa kết luận chắc chắn nguồn warning trước đó. Nếu tab cũ còn báo, mở DevTools rồi reload và xem URL response phát sinh warning.
- **`content.js`:** log thực có nguồn `chrome-extension://mhmlkckkafjpdbeggdhcicfediihdmck/content.js`, xác định là extension của trình duyệt. Không sửa/xóa extension.
- **Lazy image intervention:** thông báo nói trình duyệt trì hoãn load event của ảnh lazy, không phải exception của ứng dụng. Không loại bỏ lazy loading chỉ để giấu thông báo này. Việc xác minh viền dựa trên computed style và màu gradient, không dựa vào image load event.

## Bằng chứng và lệnh production

Các script được pipe qua SSH vào `sudo python3 -`, không upload script vào thư mục chạy của ứng dụng. Tất cả exit **0**:

- `cleanup-priority.py` → `cleanup.log`: cache, disk delta, container/image references/current không thay đổi.
- `repair-previous.py` → `repair-previous.json`: target trước/sau, rollback app và ops image.
- `remove-empty-volumes.py` → `empty-volumes.log`: kiểm tra trước và xác nhận sau mỗi volume.
- `post-cleanup-health.txt`, `final-production-state.json`: readiness database/Redis up, leadDelivery configured, runtime image bất biến, restart **0**, cả bốn image app/ops current/rollback tồn tại, volume production còn nguyên.
- `browser-verification.log`, `public-headers.json`, `edge-observations.json`: UI, header và Edge thực.
- `runbook-verification.log`: 6/6 tình huống cô lập; `git diff --check`: exit 0.

## Đồng bộ tiến độ

Đã cập nhật bằng chứng US-084 trong Harness và validation của story. Plane preview
và sync work items có lọc US-084 đều exit 0: patchedCount **1**, missingCount **0**.
API readback lúc 16:39:34+07 xác nhận WingsGo/E07/US-084, trạng thái Đã bàn giao,
owner c0508g, start 20/10 và target 24/10/2026, missingDates **0**,
genericChildNames **0**; story hiện không có child task. Plane plan không hỗ trợ
Initiatives; quan hệ Project/Epic/US đã được xác minh. Không đổi cấu trúc hay trang
Plane. Biên bản: `plane-preview.log`, `plane-sync.log`, `plane-verification.json`.

## Phạm vi chưa kiểm và rủi ro

Không chạy full application suite, Safari/Firefox, luồng gửi lead thật, restore drill mới hoặc thử crash/cutover trên production; không có code app/schema mới trong đợt này. Chưa xác định được response đã tạo bốn Permissions-Policy warning trước đó. Bỏ qua các tài nguyên nhóm cần duyệt trong báo cáo kiểm kê. Disk còn khoảng 4,76 GB, vẫn cần theo dõi tăng trưởng media/log và các đợt build.
