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

Build thêm operations image ARM64 từ cùng source candidate. Image này giữ source,
dependencies và migration để chạy Payload CLI; nó tách biệt với standalone app
image và không cần chạy lại Next build. Chỉ tiếp tục nếu Docker Buildx hoàn tất
và image revision gắn đúng commit của candidate:

```powershell
$RELEASE_SHA = (git rev-parse HEAD).Trim()
$RELEASE_NAME = "release-" + (git rev-parse --short HEAD)
$OPS_TAG = "wingstravel-ops:$RELEASE_NAME"
$RELEASE_SHA | Set-Content "$env:TEMP\wingstravel-release-sha.txt" -NoNewline
docker buildx build --platform linux/arm64 --build-arg WINGSTRAVEL_RELEASE_SHA=$RELEASE_SHA --tag $OPS_TAG --output type=docker,dest=deploy/oracle/operations-image.tar -f deploy/oracle/Dockerfile.operations app
```

### Bước 4: Upload lên VPS qua SCP
```powershell
$VPS_KEY = "C:\Users\VIETD\Downloads\ssh-key-2026-06-04.key"
$VPS_IP = "168.110.212.116"

# Tạo thư mục release mới theo mã commit / timestamp
$RELEASE_NAME = "release-" + (git rev-parse --short HEAD)
ssh -i $VPS_KEY ubuntu@$VPS_IP "mkdir -p /home/ubuntu/wings-travel/releases/$RELEASE_NAME"

# Upload release zip, operations image và các file hỗ trợ
scp -i $VPS_KEY deploy/oracle/release-clean.zip deploy/oracle/operations-image.tar deploy/oracle/Dockerfile.standalone deploy/oracle/relink.sh app/docker-compose.production.yml ubuntu@$VPS_IP:/home/ubuntu/wings-travel/releases/$RELEASE_NAME/
scp -i $VPS_KEY "$env:TEMP\wingstravel-release-sha.txt" ubuntu@${VPS_IP}:/home/ubuntu/wings-travel/releases/$RELEASE_NAME/release-sha.txt
```

### Bước 5: Giải nén và Build Docker Image trên VPS
```bash
# Thao tác trên VPS (hoặc chạy qua SSH)
set -eu
cd /home/ubuntu/wings-travel/releases/$RELEASE_NAME
unzip -q release-clean.zip && rm release-clean.zip
sed -i 's/\r$//' relink.sh
mkdir -p public/media

# Build Docker image
docker build -f Dockerfile.standalone -t wingstravel-app:latest -t app-app:latest .
sudo docker image inspect --format='{{.Id}}' wingstravel-app:latest > APP_IMAGE_ID

# Load and bind the candidate's immutable operations image
sudo docker load -i operations-image.tar
RELEASE_SHA="$(tr -d '\r\n' < release-sha.txt)"
OPS_IMAGE_ID="$(sudo docker image inspect --format='{{.Id}}' "wingstravel-ops:$RELEASE_NAME")"
test "$(sudo docker image inspect --format='{{index .Config.Labels "org.opencontainers.image.revision"}}' "$OPS_IMAGE_ID")" = "$RELEASE_SHA"
printf '%s\n' "$OPS_IMAGE_ID" > OPS_IMAGE_ID
rm operations-image.tar
```

### Bước 6: Backup và áp dụng migration trước cutover

Không chuyển symlink hoặc recreate app trước khi hoàn tất bước này. Candidate
phải có một operations image ARM64 bất biến, build từ đúng source/release
candidate và chứa migration đã đăng ký trong `app/src/migrations/index.ts`.
Ghi digest SHA-256 image vào `OPS_IMAGE_ID` trong thư mục release; không dùng
image `latest` hoặc image của release khác. Cách tạo và xác minh operations
image phải theo mẫu immutable tools image trong
[`wingsgroup-v3-production-media.md`](wingsgroup-v3-production-media.md).

Trước khi ghi schema, cần có backup PostgreSQL mã hóa và bằng chứng restore
thử nghiệm thành công cho cùng database production, gắn với release candidate.
Nếu thiếu một trong hai bằng chứng, dừng tại đây.

Chạy hai lệnh dưới đây trên VPS bằng protected environment file; không in nội
dung file môi trường hoặc credentials ra terminal/log:

```bash
cd /home/ubuntu/wings-travel/releases/$RELEASE_NAME
OPS_IMAGE_ID="$(tr -d '\r\n' < OPS_IMAGE_ID)"
case "$OPS_IMAGE_ID" in
  sha256:*) ;;
  *) echo 'OPS_IMAGE_ID must be an immutable sha256 digest' >&2; exit 1 ;;
esac

sudo docker run --rm \
  --network wingstravel_default \
  --env-file /home/ubuntu/wings-travel/shared/.env \
  -e NODE_ENV=production \
  -e PAYLOAD_DB_PUSH=false \
  "$OPS_IMAGE_ID" \
  pnpm payload migrate

sudo docker run --rm \
  --network wingstravel_default \
  --env-file /home/ubuntu/wings-travel/shared/.env \
  -e NODE_ENV=production \
  -e PAYLOAD_DB_PUSH=false \
  "$OPS_IMAGE_ID" \
  pnpm payload migrate:status
```

Chỉ tiếp tục khi output xác nhận migration của candidate đã applied và không
còn migration pending. Nếu command lỗi, trạng thái không rõ, image digest không
khớp candidate, hoặc backup/restore evidence không hợp lệ, dừng và giữ nguyên
release đang chạy. Migration rollback có thể xóa dữ liệu badge; khi rollback
ứng dụng, ưu tiên khôi phục image cũ và giữ schema additive.

### Bước 7: Chuyển symlink Current & Recreate Container

Ghi nhận release và image đang chạy trước khi chuyển. `previous` phải trỏ đến
release tồn tại, có cả app image và ops image phục vụ rollback. Không dùng một
symlink `previous` cũ làm nguồn xác định rollback. Không xóa release/image được
`current`, `previous`, `PREVIOUS_RELEASE` hoặc `PREVIOUS_IMAGE_ID` tham chiếu.

```bash
set -eu
base=/home/ubuntu/wings-travel
candidate="$base/releases/$RELEASE_NAME"
previous_release="$(readlink -e "$base/current")"
previous_image="$(sudo docker inspect wingstravel-app-1 --format '{{.Image}}')"
test -d "$candidate"
test "$(readlink -e "$candidate")" = "$candidate"
test "$previous_release" != "$candidate"
test "$(dirname "$previous_release")" = "$base/releases"
test -f "$previous_release/docker-compose.production.yml"
test "$previous_image" = "$(tr -d '\r\n' < "$previous_release/APP_IMAGE_ID")"
candidate_image="$(tr -d '\r\n' < "$candidate/APP_IMAGE_ID")"
previous_ops="$(tr -d '\r\n' < "$previous_release/OPS_IMAGE_ID")"
for image in "$previous_image" "$candidate_image" "$previous_ops"; do
  case "$image" in sha256:*) ;; *) exit 1 ;; esac
  test "$(sudo docker image inspect --format '{{.Id}}' "$image")" = "$image"
done
printf '%s\n' "$previous_release" > "$candidate/PREVIOUS_RELEASE"
printf '%s\n' "$previous_image" > "$candidate/PREVIOUS_IMAGE_ID"
printf 'services:\n  app:\n    image: %s\n' "$candidate_image" > "$candidate/pinned-compose.yml"
printf 'services:\n  app:\n    image: %s\n' "$previous_image" > "$candidate/rollback-compose.yml"

# Replace symlinks atomically; never leave an unlink/create gap.
point_link() {
  test -L "$1" || test ! -e "$1"
  ln -s "$2" "$1.$RELEASE_NAME.$$"
  mv -Tf "$1.$RELEASE_NAME.$$" "$1"
}
activate() {
  sudo docker compose -f "$1/docker-compose.production.yml" -f "$2" \
    -p wingstravel --env-file "$base/shared/.env" \
    up -d --no-deps --no-build --pull never --force-recreate app
}
cutover_started=false
restore_on_failure() {
  status=$?
  trap - EXIT HUP INT TERM
  if test "$status" -ne 0 && test "$cutover_started" = true; then
    point_link "$base/current" "$previous_release"
    if ! activate "$previous_release" "$candidate/rollback-compose.yml"; then
      echo 'Rollback activation failed: manual recovery required.' >&2
      exit 1
    fi
    test "$(sudo docker inspect wingstravel-app-1 --format '{{.Image}}')" = "$previous_image"
    echo 'Restored previous release and immutable image; verify readiness.' >&2
  fi
  exit "$status"
}
trap restore_on_failure EXIT
trap 'exit 1' HUP INT TERM
point_link "$base/previous" "$previous_release"
cutover_started=true
point_link "$base/current" "$candidate"
activate "$candidate" "$candidate/pinned-compose.yml"
ready=false
for attempt in $(seq 1 25); do
  if curl -fsS http://127.0.0.1:3000/api/health/ready > "$candidate/active-ready.json"; then
    if python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); assert d["status"]=="ready"; assert d["checks"]["database"]==d["checks"]["redis"]=="up"; assert d["checks"]["leadDelivery"]=="configured"' "$candidate/active-ready.json"; then
      ready=true
      break
    fi
  fi
  sleep 2
done
test "$ready" = true
test "$(sudo docker inspect wingstravel-app-1 --format '{{.Image}}')" = "$candidate_image"
test "$(readlink -e "$base/previous")" = "$previous_release"
cutover_started=false
trap - EXIT HUP INT TERM
```

### Bước 8: Kiểm tra Health Check & Xác nhận UI
```bash
# Kiểm tra healthcheck
curl -s http://127.0.0.1:3000/api/health/ready
# Kết quả mong muốn: {"checks":{"database":"up","leadDelivery":"configured","redis":"up"},"status":"ready"}
```

Sau đó sử dụng `agent-browser open https://wingsgo.vn` để chụp màn hình và đo đạc visual.

Kiểm tra thêm `readlink -e /home/ubuntu/wings-travel/previous` khớp với
`current/PREVIOUS_RELEASE`. Nếu readiness hoặc xác minh image thất bại, dùng
`PREVIOUS_RELEASE` và image bất biến trong `PREVIOUS_IMAGE_ID` để rollback;
không suy đoán image bằng tag `latest`. Giữ nguyên schema additive.
