# Phân loại file tạm và test để dọn dẹp an toàn

- Ngày kiểm tra: 2026-10-24
- Phạm vi: `E:\repo\WingsTravel`
- Trạng thái: **đã inventory, phân loại và thực hiện đúng batch xóa được người dùng yêu cầu**.

## 1. Bằng chứng inventory

Lệnh đã chạy:

```powershell
git ls-files --others --exclude-standard
Get-ChildItem -LiteralPath deploy/oracle -Directory -Recurse
rg -n --hidden --glob '!app/node_modules/**' <tên artifact> docs source scripts app
Get-CimInstance Win32_Process
```

Kết quả chính:

| Nhóm | Số file | Dung lượng | Nhận định |
|---|---:|---:|---|
| Toàn bộ untracked | 6,239 | 4,191.60 MiB | Gồm release/evidence và file tạm |
| `deploy/oracle` | 5,653 | 3,366.39 MiB | Chủ yếu snapshot preview, image Docker và release archive |
| `header-a-implementation-20261023` | 125 | 400.39 MiB | Evidence/release US-085; có một ARM64 image |
| `footer-contact-review-20261023` | 92 | 395.92 MiB | Evidence/release US-085; có một ARM64 image |
| `docs/reviews` | 213 | 22.88 MiB | Audit/review, nhiều file được dẫn chiếu |
| `app/artifacts` và script/test mới | 96 | 3.32 MiB | Có source/test phải giữ và một runtime home cần dọn |
| `wingsgo-footer-review-20261023` | 46 | 1.27 MiB | Evidence trực tiếp cho US-081 |

Process check không phát hiện tiến trình build/deploy/runtime đang dùng các thư mục cleanup; chỉ còn CodeGraph server đang đọc workspace.

## 2. Phân loại

### A. Giữ bắt buộc

| Path/nhóm | Lý do |
|---|---|
| `app/src/**`, `app/tests/**`, `app/scripts/**` | Source và test của sản phẩm; không phải file tạm. |
| `harness.db`, `harness.db-wal`, `harness.db-shm` | Harness durable layer; `.gitignore` không có nghĩa là được xóa. |
| `source/**`, `docs/stories/**`, `docs/plane/manifest.json` | Source of truth và tracking; story US-081/085 đang dẫn chiếu evidence. |
| `payload/`, `sub/` | Nested repositories được giữ ngoài commit theo quy ước repo. |
| `wingsgo-footer-review-20261023/**` | Bằng chứng hiện hành của US-081; manifest và validation đang trỏ tới `review.md`. |
| `header-a-implementation-20261023/production-release/**` | Release report, backup/restore, checksum, gate và proof của US-085; `audit.md`/`execplan.md` dẫn chiếu trực tiếp. |
| `footer-contact-review-20261023/production-release/**` | Release footer đã bàn giao; `validation.md`, `overview.md`, `audit.md` dẫn chiếu trực tiếp. |
| `deploy/oracle/us085-20261023/**`, `deploy/oracle/us085-footer-20261023/**` | Bản release production/evidence gần nhất; giữ cho rollback/audit tới khi chốt retention. |
| `deploy/oracle/operations-image.tar` và `deploy/oracle/release-clean.zip` | Asset đóng gói theo runbook; giữ ít nhất một bản hiện hành cho rollback/redeploy. |

### B. Giữ tạm để rollback/audit, sau đó archive hoặc xóa theo retention

| Path/nhóm | Hiện trạng | Điều kiện dọn |
|---|---|---|
| Hai thư mục `*/production-release` của US-085 | Mỗi thư mục khoảng 395–397 MiB, có `operations-image.tar` và toàn bộ proof | Chỉ dọn bản sao nặng sau khi đã lưu release report, checksum, migration/backup proof và người phụ trách xác nhận hết thời hạn rollback. |
| `deploy/oracle/operations-image.tar` | Khoảng 397 MiB, image hiện hành | Giữ một bản duy nhất; chỉ xóa nếu đã có bản immutable ở registry/VPS và đã kiểm tra pull/restore. |
| `deploy/oracle/release-clean.zip` | Khoảng 111 MiB, path được runbook và validation cũ dẫn chiếu | Giữ bản hiện hành hoặc chuyển vào kho release; không xóa đồng thời với image. |
| `deploy/oracle/us085*` | Khoảng 2.66 GiB tổng cộng | Có thể archive ngoài workspace sau khi rollback window kết thúc và checksum đã lưu. |

### C. Ứng viên dọn dẹp sau khi xác nhận tham chiếu

| Path/nhóm | Quy mô/đặc điểm | Mức đề xuất |
|---|---|---|
| `deploy/oracle/cms-preview-0701404-20261022/` | 636.47 MiB; snapshot preview, chứa image/archive lặp | Dọn batch sau khi xác nhận không còn rollback reference. |
| `deploy/oracle/cms-preview-aa1ffc6-20261022/` | 636.32 MiB; snapshot preview, chứa image/archive lặp | Dọn batch sau khi xác nhận không còn rollback reference. |
| `deploy/oracle/cms-preview-e2ac6e4-20261022/` | 636.47 MiB; snapshot preview, chứa image/archive lặp | Dọn batch sau khi xác nhận không còn rollback reference. |
| `deploy/oracle/cms-preview-784f823-20261022/` | 529.93 MiB; snapshot preview, chứa image/archive lặp | Dọn batch sau khi xác nhận không còn rollback reference. |
| `deploy/oracle/cms-save-b63181c-20261022/` | 529.81 MiB; snapshot save/crash | Có `docs/reviews/cms-save-crash-20261022/audit.md` dẫn chiếu thư mục; archive report trước, rồi dọn payload nặng. |
| Root `release-hero-expand-26662a6.tar.gz` | ~4.80 GiB; không có tham chiếu trong `docs/source/scripts/app` | Ứng viên dọn ưu tiên cao, sau retention check. |
| Root `release-clean-26662a6.tar.gz` | ~173.7 MiB; không có tham chiếu trong `docs/source/scripts/app` | Ứng viên dọn sau khi xác nhận không phải rollback asset duy nhất. |
| Root `wingstravel-606dd14.tar.gz` | ~155 MiB; không có tham chiếu trong `docs/source/scripts/app` | Ứng viên dọn sau retention check. |
| `app/artifacts/cms-save-review-home/` | ~83.95 MiB; chứa `.tmp`, copied skills, SQLite/WAL/SHM và config runtime | Ứng viên dọn ưu tiên cao; đây là local runtime state, không phải source/evidence. Không in nội dung SQLite/config. |
| `artifacts/tmp/**/node_modules`, log, lock, SQLite `-wal/-shm`, temp script | Nhiều artifact cũ từ US-044/081/082/083/084 | Dọn theo pattern sau khi giữ lại report/ảnh được dẫn chiếu. |

## 3. Các nhóm không được dọn nhầm

- Không xóa toàn bộ `artifacts/tmp/`: nhiều report trong `docs/reviews` và `docs/stories` đang dẫn tới ảnh/log ở đó.
- Không xóa `app/tests`, kể cả test mới của hotline/footer.
- Không xóa `docs/reviews` chỉ vì là review; đây là bằng chứng audit và có liên kết từ story.
- Không xóa toàn bộ `deploy/oracle`: thư mục hiện chứa cả snapshot cũ lẫn release production cần rollback.
- Không xóa `harness.db` chỉ vì nó bị ignore.

## 4. Batch cleanup đã thực hiện

### Batch 1 — local runtime rác, rủi ro thấp — đã xóa

Đã xóa sau khi kiểm tra không có tiến trình build/deploy/runtime liên quan:

- `app/artifacts/cms-save-review-home/`
- `artifacts/tmp/**/node_modules/`
- `artifacts/tmp/**/*.log`, `*.lock`, `*.sqlite-wal`, `*.sqlite-shm`
- các log, lock, SQLite WAL/SHM trong `artifacts/tmp`.

### Batch 2 — snapshot preview — đã xóa

Đã xóa nguyên 5 thư mục `deploy/oracle/cms-preview-*` và `cms-save-*`. Các thư mục `us085-*` được giữ nguyên.

### Batch 3 — release archive cũ — đã xóa

Đã xóa ba tarball root: `release-clean-26662a6.tar.gz`, `release-hero-expand-26662a6.tar.gz`, `wingstravel-606dd14.tar.gz`. Giữ nguyên `deploy/oracle/operations-image.tar` và `deploy/oracle/release-clean.zip` hiện hành.

## 5. Kết luận

Đã xóa đúng các mục được yêu cầu: 1 local runtime home, 3 `node_modules`, 148 log/lock/WAL/SHM, 5 snapshot Oracle và 3 tarball root. Kiểm tra sau dọn ghi nhận 0 mục mục tiêu còn lại, 0 tracked deletion, và toàn bộ release/evidence cần giữ vẫn tồn tại.

**Không xóa `us085-*`, `wingsgo-footer-review-20261023`, `harness.db`, source/test hoặc release asset hiện hành. Không publish/deploy.**
