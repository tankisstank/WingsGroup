$ErrorActionPreference = 'Stop'
$reviewDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$session = 'us085-production'

function Invoke-Browser {
    param([string[]]$BrowserArguments)
    $output = & agent-browser --session $session @BrowserArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Browser failed: $($BrowserArguments -join ' ')"
    }
    return $output
}

function Read-Observation {
    param([string]$Source)
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Source))
    return (Invoke-Browser @('eval', '-b', $encoded)) | ConvertFrom-Json
}

$results = @()
foreach ($route in @('/', '/en')) {
    $null = Invoke-Browser @('open', "https://wingsgroup.vn$route")
    $null = Invoke-Browser @('set', 'viewport', '320', '900')
    $null = Invoke-Browser @('wait', '--fn', 'document.querySelector(''[data-client-ready="true"]'') !== null')
    $null = Invoke-Browser @('focus', '.wingsgroup-contact-zone--mobile button')
    $null = Invoke-Browser @('press', 'Enter')
    $null = Invoke-Browser @('press', 'Tab')
    $popupBefore = Read-Observation @'
(() => {
    const toggle = document.querySelector('.wingsgroup-contact-zone--mobile button');
    const popup = document.getElementById(toggle.getAttribute('aria-controls'));
    return { open: toggle.getAttribute('aria-expanded') === 'true', focusInside: popup?.contains(document.activeElement) === true };
})()
'@
    $null = Invoke-Browser @('press', 'Escape')
    $popupAfter = Read-Observation @'
(() => {
    const toggle = document.querySelector('.wingsgroup-contact-zone--mobile button');
    return { closed: toggle.getAttribute('aria-expanded') === 'false', focusRestored: document.activeElement === toggle };
})()
'@
    $null = Invoke-Browser @('focus', 'button[aria-controls="mobile-primary-navigation"]')
    $null = Invoke-Browser @('press', 'Enter')
    $null = Invoke-Browser @('press', 'Tab')
    $drawerBefore = Read-Observation @'
(() => {
    const toggle = document.querySelector('button[aria-controls="mobile-primary-navigation"]');
    const drawer = document.getElementById('mobile-primary-navigation');
    return { open: toggle.getAttribute('aria-expanded') === 'true', focusInside: drawer?.contains(document.activeElement) === true };
})()
'@
    $null = Invoke-Browser @('press', 'Escape')
    $drawerAfter = Read-Observation @'
(() => {
    const toggle = document.querySelector('button[aria-controls="mobile-primary-navigation"]');
    return { closed: toggle.getAttribute('aria-expanded') === 'false', focusRestored: document.activeElement === toggle };
})()
'@
    $passed = $popupBefore.open -and $popupBefore.focusInside -and $popupAfter.closed -and $popupAfter.focusRestored -and
        $drawerBefore.open -and $drawerBefore.focusInside -and $drawerAfter.closed -and $drawerAfter.focusRestored
    $results += [pscustomobject]@{
        route = $route
        popupBefore = $popupBefore
        popupAfter = $popupAfter
        drawerBefore = $drawerBefore
        drawerAfter = $drawerAfter
        passed = [bool]$passed
    }
}
$report = [pscustomobject]@{
    timestamp = [DateTime]::UtcNow.ToString('o')
    passed = @($results | Where-Object { -not $_.passed }).Count -eq 0
    results = $results
}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $reviewDirectory 'keyboard-results.json') -Encoding utf8
$report | ConvertTo-Json -Depth 8
if (-not $report.passed) {
    exit 1
}

