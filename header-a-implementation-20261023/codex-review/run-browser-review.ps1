$ErrorActionPreference = 'Stop'
$reviewDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$measureSource = Get-Content -LiteralPath (Join-Path $reviewDirectory 'measure-header.js') -Raw
$measureEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($measureSource))
$routes = @('/wingsgroup', '/wingsgroup/en', '/wingsgroup/ve-wingsgroup', '/wingsgroup/en/ve-wingsgroup')
$widths = @(320, 375, 390, 768, 1024, 1199, 1200, 1279, 1280, 1440, 1536)
$results = @()

foreach ($route in $routes) {
    $navigation = agent-browser --session us085-codex-review open "http://localhost:3000$route"
    if ($LASTEXITCODE -ne 0) {
        throw "Browser navigation failed: $route"
    }
    foreach ($width in $widths) {
        $viewportResult = agent-browser --session us085-codex-review set viewport $width 900
        if ($LASTEXITCODE -ne 0) {
            throw "Browser viewport failed: $width"
        }
        $measurement = agent-browser --session us085-codex-review eval -b $measureEncoded
        if ($LASTEXITCODE -ne 0) {
            throw "DOM measurement failed: $route at $width"
        }
        $results += $measurement | ConvertFrom-Json
    }
    Write-Output "Measured $route at $($widths.Count) widths."
}

$failures = @($results | Where-Object { -not $_.passed })
$englishMobileMixedLabels = @($results | Where-Object {
    $_.locale -eq 'en' -and -not $_.desktop -and
    ($_.channels.text -join ' ') -match 'Tư vấn tour|Hỗ trợ dịch vụ'
})
$report = [pscustomobject]@{
    timestamp = [DateTime]::UtcNow.ToString('o')
    totalCases = $results.Count
    layoutFailures = $failures.Count
    englishMobileMixedLabelCases = $englishMobileMixedLabels.Count
    results = $results
}
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $reviewDirectory 'browser-measurements.json') -Encoding utf8
Write-Output "Cases: $($results.Count); layout failures: $($failures.Count); English mobile mixed label cases: $($englishMobileMixedLabels.Count)."
if ($failures.Count -gt 0) {
    exit 1
}
