param(
    [string]$Pane = "wP:pD",
    [string]$File = "docs/codex_consultation_us080_release_audit_prompt.md",
    [int]$TimeoutMs = 300000
)

$content = Get-Content -Path $File -Raw -Encoding UTF8
Write-Host "Sending prompt from $File to $Pane (timeout: ${TimeoutMs}ms)..."
& herdr agent prompt $Pane $content --wait --timeout $TimeoutMs
Write-Host "Prompt completed."
