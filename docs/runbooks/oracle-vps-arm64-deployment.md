# Runbook: Hướng dẫn Deploy Production VPS (Oracle Cloud ARM64 / aarch64)

> **Mục tiêu:** Chuẩn hoá quy trình đóng gói và triển khai ứng dụng WingsTravel/WingsGo lên VPS Oracle Cloud (kiến trúc ARM64 Linux), đặc biệt giải quyết triệt để sự khác biệt kiến trúc giữa môi trường build (Windows x64) và runtime production (ARM64 Alpine Musl), tránh lỗi dung lượng ổ đĩa và lỗi thiếu thư viện native C++.

---

## 1. Bản chất sự cố và Bài học kinh nghiệm

| Vấn đề | Hiện tượng | Nguyên nhân gốc rễ | Giải pháp chuẩn hoá |
|---|---|---|---|
| **Dung lượng đĩa VPS (Disk Full)** | Docker build báo lỗi `no space left on device` trên VPS | Thư mục `public/media` nặng 4.6GB được nén cùng tarball đẩy lên VPS khiến `docker build` tạo layer vượt quá dung lượng ổ đĩa (~45GB). | **Tuyệt đối không đóng gói `public/media` vào release**. Trên VPS, thư mục media được Docker Compose mount bind trực tiếp từ volume chung `/home/ubuntu/wings-travel/shared/data/media`. Gói release sạch chỉ nặng ~45MB. |
| **Kiến trúc ARM64 vs Windows x64** | Container crash khi start: `Cannot find module '@libsql/linux-arm64-musl'`, `Could not load the "sharp" module using the linuxmusl-arm64 runtime` | Máy dev build trên Windows x64 nên `pnpm` chỉ tải binary native cho Windows (`sharp-win32-x64`, `@libsql/win32-x64-msvc`). Khi giải nén standalone lên VPS Linux ARM64, thiếu các file `.node` tương ứng. | Sử dụng script `deploy/oracle/generate-symlinks.js` và `relink.sh` tự động tải các gói native tarball cho Linux ARM64 Musl từ npm registry (`sharp-linuxmusl-arm64`, `sharp-libvips-linuxmusl-arm64`, `linux-arm64-musl`) và link vào `node_modules`. |
| **Thư viện động C++ (libvips)** | `Error loading shared library libvips-cpp.so.8.16.1: No such file or directory` | Binary của `sharp` phụ thuộc `libvips-cpp.so`, nhưng đường dẫn thư viện nằm trong `node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@.../lib`, Alpine Linux không tự tìm thấy nếu không cấu hình `LD_LIBRARY_PATH`. | Trong `Dockerfile.standalone`, khai báo biến môi trường:<br>`ENV LD_LIBRARY_PATH /app/node_modules/.pnpm/@img+sharp-libvips-linuxmusl-arm64@1.1.0/node_modules/@img/sharp-libvips-linuxmusl-arm64/lib:$LD_LIBRARY_PATH` |
| **Symlink pnpm trên Windows** | Lỗi `MODULE_NOT_FOUND` do Windows Zip làm đứt gãy symlink của `pnpm` | Quá trình zip trên Windows thường biến các symlink thành file hoặc thư mục rỗng. | `deploy/oracle/generate-symlinks.js` quét toàn bộ symlink của bản build standalone và sinh script `relink.sh` để tái tạo 100% symlink chính xác trên Linux. |

---

## 2. Cấu trúc công cụ chuẩn bị sẵn trong repo

Thư mục [`deploy/oracle/`](file:///E:/repo/WingsTravel/deploy/oracle):
- [`Dockerfile.standalone`](file:///E:/repo/WingsTravel/deploy/oracle/Dockerfile.standalone): Dockerfile tối giản chạy trực tiếp bundle standalone trên nền `node:22.17.0-alpine`, tự động thiết lập `LD_LIBRARY_PATH` và quyền user `nextjs`.
- [`generate-symlinks.js`](file:///E:/repo/WingsTravel/deploy/oracle/generate-symlinks.js): Script Node.js tự động quét standalone bundle trên Windows, sinh file shell script `relink.sh` chứa lệnh tải binary ARM64 và tái tạo toàn bộ symlink trên Linux.
- [`package-release.ps1`](file:///E:/repo/WingsTravel/deploy/oracle/package-release.ps1): Script đóng gói tự động một bước.

---

## 3. Quy trình Đóng gói & Triển khai chuẩn (Step-by-Step)

### Bước 1: Build standalone trên máy dev (Windows)
Từ thư mục `app/`:
```powershell
pnpm run build
```
Đảm bảo thư mục `app/.next/standalone` được tạo đầy đủ.

### Bước 2: Sinh script tái tạo symlink và kéo binary ARM64
Từ thư mục gốc repo:
```powershell
node deploy/oracle/generate-symlinks.js
```
Lệnh này sẽ tạo file `deploy/oracle/relink.sh`.

### Bước 3: Đóng gói Release sạch (Loại trừ media)
Chạy script PowerShell đóng gói:
```powershell
powershell -ExecutionPolicy Bypass -File deploy/oracle/package-release.ps1
```
*(File zip đầu ra `deploy/oracle/release-clean.zip` chỉ nặng ~45MB).*

### Bước 4: Upload lên VPS qua SCP
```powershell
$VPS_KEY = "C:\Users\VIETD\Downloads\ssh-key-2026-06-04.key"
$VPS_IP = "168.110.212.116"

# Tạo thư mục release mới theo mã commit / timestamp
$RELEASE_NAME = "release-" + (git rev-parse --short HEAD)
ssh -i $VPS_KEY ubuntu@$VPS_IP "mkdir -p /home/ubuntu/wings-travel/releases/$RELEASE_NAME"

# Upload release zip và các file hỗ trợ
scp -i $VPS_KEY deploy/oracle/release-clean.zip deploy/oracle/Dockerfile.standalone deploy/oracle/relink.sh app/docker-compose.production.yml ubuntu@$VPS_IP:/home/ubuntu/wings-travel/releases/$RELEASE_NAME/
```

### Bước 5: Giải nén và Build Docker Image trên VPS
```bash
# Thao tác trên VPS (hoặc chạy qua SSH)
cd /home/ubuntu/wings-travel/releases/$RELEASE_NAME
unzip -q release-clean.zip && rm release-clean.zip
sed -i 's/\r$//' relink.sh
mkdir -p public/media

# Build Docker image
docker build -f Dockerfile.standalone -t wingstravel-app:latest -t app-app:latest .
```

### Bước 6: Chuyển symlink Current & Recreate Container
```bash
ln -sfn /home/ubuntu/wings-travel/releases/$RELEASE_NAME /home/ubuntu/wings-travel/current
cd /home/ubuntu/wings-travel/current
docker compose -f docker-compose.production.yml -p wingstravel --env-file /home/ubuntu/wings-travel/shared/.env up -d --no-deps --no-build --pull never --force-recreate app
```

### Bước 7: Kiểm tra Health Check & Xác nhận UI
```bash
# Kiểm tra healthcheck
curl -s http://127.0.0.1:3000/api/health/ready
# Kết quả mong muốn: {"checks":{"database":"up","leadDelivery":"configured","redis":"up"},"status":"ready"}
```

Sau đó sử dụng `agent-browser open https://wingsgo.vn` để chụp màn hình và đo đạc visual.
