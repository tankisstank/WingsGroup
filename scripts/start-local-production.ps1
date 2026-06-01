param(
  [string]$DatabaseUrl = "file:E:/tmp/wings-payload.db",
  [string]$PayloadSecret = "wingstravel-local-secret-2026",
  [string]$PublicServerUrl = "http://localhost:3000",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$appRoot = Join-Path $repoRoot "app"
$standaloneRoot = Join-Path $appRoot ".next\standalone"
$standaloneNext = Join-Path $standaloneRoot ".next"
$standalonePublic = Join-Path $standaloneRoot "public"
$staticSource = Join-Path $appRoot ".next\static"
$staticTarget = Join-Path $standaloneNext "static"
$publicSource = Join-Path $appRoot "public"
$serverEntry = Join-Path $standaloneRoot "server.js"

if (-not $SkipBuild) {
  Push-Location $appRoot
  try {
    pnpm run build
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $serverEntry)) {
  throw "Standalone server was not found at $serverEntry. Run without -SkipBuild first."
}

New-Item -ItemType Directory -Force -Path $standaloneNext | Out-Null

if (Test-Path $staticTarget) {
  Remove-Item -LiteralPath $staticTarget -Recurse -Force
}
Copy-Item -LiteralPath $staticSource -Destination $staticTarget -Recurse -Force

if (Test-Path $standalonePublic) {
  Remove-Item -LiteralPath $standalonePublic -Recurse -Force
}
Copy-Item -LiteralPath $publicSource -Destination $standalonePublic -Recurse -Force

$env:DATABASE_URL = $DatabaseUrl
$env:PAYLOAD_SECRET = $PayloadSecret
$env:NEXT_PUBLIC_SERVER_URL = $PublicServerUrl

Push-Location $standaloneRoot
try {
  node server.js
} finally {
  Pop-Location
}
