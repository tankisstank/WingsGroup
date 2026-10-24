param(
    [string]$BaseUrl = 'https://wingsgroup.vn',
    [string]$Session = 'us085-production',
    [string]$ExpectedPhone = '0948786775',
    [string]$ReportName = 'browser-measurements.json',
    [int[]]$Widths = @(320, 375, 390, 768, 1024, 1199, 1200, 1279, 1280, 1440, 1536),
    [string[]]$Routes = @('', '/en', '/ve-wingsgroup', '/en/ve-wingsgroup')
)
$ErrorActionPreference = 'Stop'
$reviewDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$measureSource = Get-Content -LiteralPath (Join-Path $reviewDirectory 'measure-header.js') -Raw
$measureSource = $measureSource.Replace("tel:0948786775", "tel:$ExpectedPhone")
$measureEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($measureSource))
$results = @()
foreach ($route in $Routes) {
    $navigation = agent-browser --session $Session open "$BaseUrl$route"
    if ($LASTEXITCODE -ne 0) { throw "Browser navigation failed: $route" }
    foreach ($width in $Widths) {
        $viewportResult = agent-browser --session $Session set viewport $width 900
        if ($LASTEXITCODE -ne 0) { throw "Browser viewport failed: $width" }
        $measurement = agent-browser --session $Session eval -b $measureEncoded
        if ($LASTEXITCODE -ne 0) { throw "DOM measurement failed: $route at $width" }
        $results += $measurement | ConvertFrom-Json
    }
    Write-Output "Measured $route at $($Widths.Count) widths."
}
$failures = @($results | Where-Object { -not $_.passed })
$mixedLabels = @($results | Where-Object {
    $_.locale -eq 'en' -and -not $_.desktop -and
    ($_.channels.text -join ' ') -match 'Tư vấn tour|Hỗ trợ dịch vụ'
})
$report = [pscustomobject]@{
    timestamp = [DateTime]::UtcNow.ToString('o')
    totalCases = $results.Count
    layoutFailures = $failures.Count
    englishMobileMixedLabelCases = $mixedLabels.Count
    results = $results
}
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $reviewDirectory $ReportName) -Encoding utf8
Write-Output "Cases: $($results.Count); failures: $($failures.Count); mixed labels: $($mixedLabels.Count)."
if ($failures.Count -gt 0 -or $mixedLabels.Count -gt 0) { exit 1 }
