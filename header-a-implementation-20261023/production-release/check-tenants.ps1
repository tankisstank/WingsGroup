$ErrorActionPreference = 'Stop'
$directory = Split-Path -Parent $MyInvocation.MyCommand.Path
$results = @()
foreach ($url in @('https://wingsgo.vn/','https://wingsgo.vn/en','https://wingside.vn/','https://wingside.vn/en')) {
    $null = agent-browser --session us085-tenants open $url
    if ($LASTEXITCODE -ne 0) { throw "Navigation failed: $url" }
    foreach ($width in @(390,1280)) {
        $null = agent-browser --session us085-tenants set viewport $width 900
        if ($LASTEXITCODE -ne 0) { throw 'Viewport failed' }
        $source = @'
(() => {
  const header = document.querySelector('header.site-header');
  const phones = Array.from(header?.querySelectorAll('a[href^="tel:"]') || []).map(link => ({ href:link.getAttribute('href'), label:link.getAttribute('aria-label') }));
  const wingsGroupControls = header?.querySelectorAll('.wingsgroup-contact-zone').length || 0;
  return {timestamp:new Date().toISOString(),url:location.href,site:document.body.dataset.siteCode,locale:document.documentElement.lang,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,phones,wingsGroupControls};
})()
'@
        $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($source))
        $item = agent-browser --session us085-tenants eval -b $encoded | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0) { throw 'Measurement failed' }
        $passed = -not $item.overflow -and $item.wingsGroupControls -eq 0 -and
            $item.site -in @('wings-go','wing-side') -and
            @($item.phones | Where-Object { $_.href -eq 'tel:0948786775' }).Count -eq 0
        if ($item.site -eq 'wings-go' -and $width -eq 390) {
            $expectedPrefix = if ($item.locale -eq 'en') { 'Call WingsGo' } else { 'Gọi hotline WingsGo' }
            $passed = $passed -and @($item.phones | Where-Object { $_.label -like "$expectedPrefix*" }).Count -ge 1
        }
        $item | Add-Member -NotePropertyName passed -NotePropertyValue ([bool]$passed)
        $results += $item
    }
}
$results | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $directory 'tenant-browser-results.json') -Encoding utf8
$failed = @($results | Where-Object { -not $_.passed })
Write-Output "Tenant checks: $($results.Count); failures: $($failed.Count)"
if ($failed.Count) { exit 1 }
