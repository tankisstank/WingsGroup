$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$InstalledRustCli = Join-Path $RepoRoot "scripts\\bin\\harness-cli.exe"
$DevRustCli = Join-Path $RepoRoot "sub\\harness-experimental\\target\\release\\harness-cli.exe"
$RustCli = if ($env:HARNESS_RUST_CLI) { $env:HARNESS_RUST_CLI } elseif (Test-Path $InstalledRustCli) { $InstalledRustCli } else { $DevRustCli }

if (-not (Test-Path $RustCli)) {
  throw "Harness CLI not found. Expected at '$InstalledRustCli' or '$DevRustCli'."
}

$env:HARNESS_REPO_ROOT = $RepoRoot
Push-Location $RepoRoot
try {
  & $RustCli @args
} finally {
  Pop-Location
}
