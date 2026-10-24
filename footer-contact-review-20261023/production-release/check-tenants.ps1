$ErrorActionPreference = 'Stop'
$directory = Split-Path -Parent $MyInvocation.MyCommand.Path
$browserExecutable = Join-Path (Split-Path (Get-Command agent-browser).Source) 'node_modules/agent-browser/bin/agent-browser-win32-x64.exe'
$results = @()
foreach ($url in @('https://wingsgo.vn/','https://wingsgo.vn/en','https://wingside.vn/','https://wingside.vn/en')) {
    $null = & $browserExecutable --session footer-candidate open $url
    $navigationExit = $LASTEXITCODE
    $null = & $browserExecutable --session footer-candidate wait --fn 'document.readyState === "complete" && Boolean(document.querySelector("footer.site-footer"))'
    if ($LASTEXITCODE -ne 0) { throw "Footer did not become ready: $url" }
    $readinessSource = '({ url:location.href, ready:document.readyState, locale:document.documentElement.lang, footer:!!document.querySelector("footer.site-footer") })'
    $readinessEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($readinessSource))
    $readiness = & $browserExecutable --session footer-candidate eval -b $readinessEncoded | ConvertFrom-Json
    $expectedDestination = $readiness.url.TrimEnd('/') -eq $url.TrimEnd('/') -or
        ($url -eq 'https://wingside.vn/en' -and $readiness.url -eq 'https://wingside.vn/' -and $readiness.locale -eq 'en')
    if ($LASTEXITCODE -ne 0 -or -not $expectedDestination -or
        $readiness.ready -ne 'complete' -or -not $readiness.footer) {
        throw "Destination not ready: $url (navigation exit $navigationExit)"
    }
    foreach ($width in @(390,1280)) {
        $null = & $browserExecutable --session footer-candidate set viewport $width 900
        if ($LASTEXITCODE -ne 0) { throw 'Viewport failed' }
        $source = @'
(() => {
  const header = document.querySelector('header.site-header');
  const phones = Array.from(header?.querySelectorAll('a[href^="tel:"]') || []).map(link => ({ href:link.getAttribute('href'), label:link.getAttribute('aria-label') }));
  const wingsGroupControls = header?.querySelectorAll('.wingsgroup-contact-zone').length || 0;
  const footer = document.querySelector('footer.site-footer');
  const footerPhones = Array.from(footer?.querySelectorAll('a[href^="tel:"]') || []).map(link => link.getAttribute('href'));
  const footerZalo = Boolean(footer?.querySelector('a[href*="zalo.me"]'));
  return {timestamp:new Date().toISOString(),url:location.href,site:document.body.dataset.siteCode,locale:document.documentElement.lang,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,phones,wingsGroupControls,footerPhones,footerZalo};
})()
'@
        $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($source))
        $item = & $browserExecutable --session footer-candidate eval -b $encoded | ConvertFrom-Json
        if ($LASTEXITCODE -ne 0) { throw 'Measurement failed' }
        $passed = -not $item.overflow -and $item.wingsGroupControls -eq 0 -and
            $item.site -in @('wings-go','wing-side') -and
            @($item.phones | Where-Object { $_.href -eq 'tel:0948786775' }).Count -eq 0 -and
            $item.footerPhones.Count -ge 1 -and
            'tel:0948786775' -notin $item.footerPhones
        if ($item.site -eq 'wings-go') {
            $passed = $passed -and $item.footerZalo -and
                @($item.footerPhones | Select-Object -Unique).Count -eq 3 -and
                'tel:0912910101' -in $item.footerPhones -and
                'tel:0915250101' -in $item.footerPhones -and
                'tel:0915260101' -in $item.footerPhones
        } else {
            $passed = $passed -and $item.footerPhones.Count -eq 2 -and
                @($item.footerPhones | Select-Object -Unique).Count -eq 1 -and
                'tel:0912910101' -in $item.footerPhones
        }
        if ($item.site -eq 'wings-go' -and $width -eq 390) {
            $expectedPrefix = if ($item.locale -eq 'en') { 'Call WingsGo' } else { 'Gọi hotline WingsGo' }
            $passed = $passed -and @($item.phones | Where-Object { $_.label -like "$expectedPrefix*" }).Count -ge 1
        }
        $item | Add-Member -NotePropertyName passed -NotePropertyValue ([bool]$passed)
        $item | Add-Member -NotePropertyName navigationExit -NotePropertyValue $navigationExit
        $results += $item
        $results | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $directory 'tenant-browser-results.json') -Encoding utf8
    }
    Write-Output "Checked $url -> $($readiness.url)"
}
$results | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $directory 'tenant-browser-results.json') -Encoding utf8
$failed = @($results | Where-Object { -not $_.passed })
Write-Output "Tenant checks: $($results.Count); failures: $($failed.Count)"
if ($failed.Count) { exit 1 }
