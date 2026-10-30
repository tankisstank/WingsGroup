# Script tự động đóng gói release gọn nhẹ cho VPS Oracle Cloud ARM64
$ErrorActionPreference = "Stop"

Write-Host ">>> 1. Sinh relink.sh chứa binary ARM64 và pnpm symlinks..." -ForegroundColor Cyan
node deploy/oracle/generate-symlinks.js
if ($LASTEXITCODE -ne 0) {
    throw "generate-symlinks.js failed with exit code $LASTEXITCODE"
}

Write-Host ">>> 2. Chuẩn bị thư mục tạm để đóng gói..." -ForegroundColor Cyan
$tempDir = "deploy/oracle/temp-release"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy standalone .next, node_modules, server.js, package.json
node deploy/oracle/copy-release-tree.cjs .next
if ($LASTEXITCODE -ne 0) { throw "Failed to copy standalone .next" }
node deploy/oracle/copy-release-tree.cjs node_modules
if ($LASTEXITCODE -ne 0) { throw "Failed to copy standalone node_modules" }
Copy-Item "app/.next/standalone/server.js" "$tempDir/server.js"
Copy-Item "app/.next/standalone/package.json" "$tempDir/package.json"
Copy-Item "deploy/oracle/relink.sh" "$tempDir/relink.sh"
Copy-Item "deploy/oracle/verify-sharp-arm64.cjs" "$tempDir/verify-sharp-arm64.cjs"

# Copy public static assets (loại trừ public/media)
New-Item -ItemType Directory -Path "$tempDir/public" | Out-Null
Copy-Item -Recurse "app/public/brand" "$tempDir/public/brand"
Copy-Item -Recurse "app/public/fonts" "$tempDir/public/fonts"
Copy-Item -Recurse "app/public/samples" "$tempDir/public/samples"
Copy-Item -Recurse "app/public/wingsside-hifi" "$tempDir/public/wingsside-hifi"
Copy-Item "app/public/favicon.ico" "$tempDir/public/favicon.ico"
Copy-Item "app/public/favicon.svg" "$tempDir/public/favicon.svg"
Copy-Item "app/public/website-template-OG.webp" "$tempDir/public/website-template-OG.webp"

Write-Host ">>> 3. Nén file release-clean.zip..." -ForegroundColor Cyan
$zipFile = "deploy/oracle/release-clean.zip"
if (Test-Path $zipFile) { Remove-Item -Force $zipFile }
if (Get-Command tar.exe -ErrorAction SilentlyContinue) {
    & tar.exe -a -c -f $zipFile -C $tempDir .
} else {
    Compress-Archive -Path "$tempDir/*" -DestinationPath $zipFile -CompressionLevel Fastest
}

# Dọn dẹp thư mục tạm
Remove-Item -Recurse -Force $tempDir

$sizeMB = [math]::Round((Get-Item $zipFile).Length / 1MB, 2)
Write-Host ">>> Hoàn tất! File release tạo tại: $zipFile ($sizeMB MB)" -ForegroundColor Green
