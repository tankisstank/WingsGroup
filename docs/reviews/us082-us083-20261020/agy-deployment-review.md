# Biên bản Rà soát Kịch bản Triển khai & Nghiệm thu Kích hoạt Production (US-082 & US-083)

**Thời điểm hoàn tất:** 20/10/2026 - 18:53 (UTC+7)  
**Phạm vi rà soát:** [`review/prepare-production.sh`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/review/prepare-production.sh), [`review/build-production-candidate.sh`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/review/build-production-candidate.sh), [`review/activate-production.sh`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/review/activate-production.sh)  
**Trạng thái kích hoạt:** 🟢 **ACTIVATION SUCCEEDED (Exit Code 0)**  
**Phân định quyền sở hữu:** Root sở hữu toàn quyền thực thi triển khai, kích hoạt server và dọn dẹp môi trường VPS. Worker thực hiện rà soát độc lập, bảo đảm không can thiệp mã nguồn hay môi trường production.

---

## 1. Kết luận Độc lập & Đánh giá Blockers

> [!IMPORTANT]
> **KẾT LUẬN: ZERO UNRESOLVED BLOCKERS - TOÀN BỘ TIÊU CHÍ KỸ THUẬT ĐẠT 100%.**  
> Bản phát hành `release-us082-us083-20261020-114500` (Image: `sha256:fec07a9405c1a82afec0f7aa39340e21519a0ad58d429a9d2e1f8131057679ef`) đã được kích hoạt thành công trên VPS Oracle Cloud ARM64 với mã thoát `0`.  
> Phản hồi readiness trả về `status: "ready"`, `checks.database: "up"`, `checks.redis: "up"`, `checks.leadDelivery: "configured"`.

---

## 2. Chi tiết Đánh giá Kịch bản Triển khai & Các Điểm Hiệu chỉnh Thực tế

### A. Cơ chế Giải nén Non-interactive & Khóa Bảo vệ `BUILD_ID`
- **Sự cố thực tế ban đầu:** Lệnh `unzip` trên VPS phát sinh prompt tương tác hỏi ghi đè do file `relink.sh` vừa được upload rời vừa nằm sẵn trong file nén `release-clean.zip`.
- **Hiệu chỉnh chuẩn hoá:**
  ```bash
  if test -e server.js; then
    test "$(cat .next/BUILD_ID)" = LxVduuw1SbZJxMRFOjuCa
  fi
  unzip -oq release-clean.zip < /dev/null
  ```
  - Cờ `-oq` kết hợp chuyển hướng `< /dev/null` đảm bảo quá trình giải nén hoàn toàn tự động, ghi đè an toàn không bao giờ treo tiến trình.
  - Kiểm tra `BUILD_ID` khớp chính xác giá trị kỳ vọng `LxVduuw1SbZJxMRFOjuCa` trước khi nạp lại mã nguồn.

### B. Khắc phục Lỗi Probe Cục bộ qua `process.env.HOSTNAME`
- **Nguyên nhân cốt lõi:** Next.js standalone trong container Docker liên kết mạng theo container `HOSTNAME` (được ghi nhận trong `/etc/hosts` tương ứng IP container). Lệnh `fetch("http://127.0.0.1:3000/...")` bên trong `docker exec` bị từ chối kết nối, dù probe từ VPS host qua cổng map `127.0.0.1:3104` phản hồi `200 ready`.
- **Hiệu chỉnh chuẩn hoá:**
  ```javascript
  fetch("http://" + (process.env.HOSTNAME || "127.0.0.1") + ":3000/api/health/ready")
  ```
  Được cập nhật đồng bộ trong cả kịch bản candidate test và health check kích hoạt của `activate-production.sh`.

### C. Xác thực Bằng chứng Backup Pin & Rollback Guard
- **Image Pin US-081:** Trước khi build, `prepare-production.sh` đã tag image đang chạy của US-081 (`sha256:e34ceef1bd9c42a93ed07f2068282a6405a2d08922e120976d6c98530dbff994`) vào `wingstravel-app:rollback-$release`.
- **Bằng chứng Kiểm định:** File [`review/production-backup-verified.log`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/review/production-backup-verified.log) xác nhận:
  - Bản dump PostgreSQL `release-us082-us083-20261020-114500.dump` (4,585,823 bytes) đã được giải mã đầy đủ toàn bộ archive qua `pg_restore --file=/dev/null` (không chỉ kiểm tra mục lục TOC bằng `--list`), xác nhận tính toàn vẹn 100% của bản backup (PASS).
  - Lệnh `docker image inspect "wingstravel-app:rollback-$release"` trong `activate-production.sh` đã vượt qua kiểm tra an toàn trước khi chuyển đổi symlink.

### D. Cô lập Cổng Candidate & Kiểm định Native ARM64
- **Cô lập Cổng 3104:** Container candidate được khởi chạy với cờ `--publish 127.0.0.1:3104:3000` và `--no-deps`, bảo đảm không can thiệp cổng 3000 hay làm gián đoạn container US-081 đang phục vụ traffic người dùng.
- **Bằng chứng Kiểm định Native ARM64:** File [`review/production-candidate-verified.log`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/review/production-candidate-verified.log) ghi nhận:
  - Khởi tạo thành công `libsql` in-memory: `{ native_ok: 1 }`.
  - Khởi tạo thành công render buffer `sharp/libvips`: `90 bytes`.
  - Cả hai bài kiểm tra native C++ trên kiến trúc Linux ARM64 Musl đều đạt trước khi tiến hành chuyển symlink.

### E. An toàn Cơ sở Dữ liệu & Mạng Redis
- **Zero DB Migration:** Cả US-082 và US-083 đều không thêm migration mới; không có bất kỳ lệnh DDL nào được chạy trên database production.
- **Zero Redis Flush:** Việc Redis production nằm trên mạng riêng `wingstravel` và ghi nhận đúng `0 curation keys` tại thời điểm kích hoạt ([`review/production-redis-scope.log`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/review/production-redis-scope.log)) là quan sát triển khai có giới hạn (bounded deployment observation), KHÔNG PHẢI bằng chứng loại trừ triệt để mọi rủi ro quét wildcard liên môi trường trong tương lai. Nếu cơ sở dữ liệu Redis trở thành môi trường dùng chung (shared DB), bắt buộc phải có tiền tố namespace chặt chẽ (prefixed key isolation) và cơ chế purge theo danh mục chính xác, tuyệt đối không quét flush hàng loạt.

---

## 3. Nhật ký Xác nhận Kích hoạt (Activation Evidence Summary)

| Hạng mục | Giá trị Xác nhận | Bằng chứng Nguồn |
| :--- | :--- | :--- |
| **Release Tag** | `release-us082-us083-20261020-114500` | [`production-activation.log`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/review/production-activation.log) |
| **Image Hash Kích hoạt** | `sha256:fec07a9405c1a82afec0f7aa39340e21519a0ad58d429a9d2e1f8131057679ef` | [`production-activation.log`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/review/production-activation.log) |
| **Trạng thái Healthcheck** | `status: "ready"`, `database: "up"`, `redis: "up"`, `leadDelivery: "configured"` | [`production-activation.log`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/review/production-activation.log) |
| **Symlink Production** | `/home/ubuntu/wings-travel/current` -> `.../release-us082-us083-20261020-114500` | [`production-activation.log`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/review/production-activation.log) |
| **Thời gian Kích hoạt** | `2026-10-20T11:52:46+00:00` | [`production-activation.log`](file:///E:/repo/WingsTravel/artifacts/tmp/us082-us083-gates-20261020/review/production-activation.log) |

---

## 4. Kỷ luật Vận hành Tuân thủ
- **Mã nguồn:** Toàn bộ product source code và test suites giữ nguyên trạng thái đóng băng; Worker không thực hiện bất kỳ sửa đổi hay ghi đè nào lên mã nguồn hoặc server production.
- **Quyền Phát hành & Nghiệm thu:** Kích hoạt production đã hoàn tất (Activation complete); các release gates tổng thể cuối cùng (browser visual verification, Harness tracking, Plane sync) tiếp tục thuộc quyền sở hữu của Root cho đến khi được ghi nhận chính thức.
