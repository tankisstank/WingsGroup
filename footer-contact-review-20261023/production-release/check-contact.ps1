$ErrorActionPreference = 'Stop'
$directory = Split-Path -Parent $MyInvocation.MyCommand.Path
$browserExecutable = Join-Path (Split-Path (Get-Command agent-browser).Source) 'node_modules/agent-browser/bin/agent-browser-win32-x64.exe'

function Invoke-Browser {
    param([string[]]$Arguments)
    $output = & $browserExecutable --session footer-candidate @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Browser failed: $($Arguments -join ' ')" }
    return $output
}

function Read-Observation {
    param([string]$Source)
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Source))
    return (Invoke-Browser @('eval', '-b', $encoded)) | ConvertFrom-Json
}

$results = @()
foreach ($locale in @('vi', 'en')) {
    $path = if ($locale -eq 'en') { '/en/lien-he' } else { '/lien-he' }
    $null = Invoke-Browser @('open', "https://wingsgroup.vn$path")
    $null = Invoke-Browser @('set', 'viewport', '320', '900')
    $null = Invoke-Browser @('wait', '--fn', 'document.readyState === "complete" && Boolean(document.querySelector("[data-client-ready=true]"))')
    $null = Invoke-Browser @('focus', '.wingsgroup-contact-zone--mobile button')
    $null = Invoke-Browser @('press', 'Enter')
    $null = Invoke-Browser @('press', 'Tab')
    $before = Read-Observation @'
(() => {
  const toggle = document.querySelector('.wingsgroup-contact-zone--mobile button');
  const popup = document.getElementById(toggle.getAttribute('aria-controls'));
  return {
    open: toggle.getAttribute('aria-expanded') === 'true',
    focusInside: popup?.contains(document.activeElement) === true,
    links: Array.from(popup?.querySelectorAll('a') || []).map(link => ({href:link.getAttribute('href'),label:link.textContent.trim()}))
  };
})()
'@
    $null = Invoke-Browser @('press', 'Escape')
    $after = Read-Observation @'
(() => {
  const toggle = document.querySelector('.wingsgroup-contact-zone--mobile button');
  return {
    closed: toggle.getAttribute('aria-expanded') === 'false',
    focusRestored: document.activeElement === toggle
  };
})()
'@
    $form = Read-Observation @'
(async () => {
  const locale = document.documentElement.lang === 'en' ? 'en' : 'vi';
  const response = await fetch('/api/lead-submissions?locale=' + locale);
  const body = await response.json();
  const form = document.querySelector('#contact-form form');
  return {
    timestamp: new Date().toISOString(),
    url: location.href,
    configStatus: response.status,
    configKeys: Object.keys(body),
    available: body.available,
    enabled: body.enabled,
    hasForm: Boolean(form),
    consentCheckboxes: form?.querySelectorAll('[role="checkbox"], input[type="checkbox"]').length || 0,
    inputs: Array.from(form?.querySelectorAll('input, textarea, select') || []).map(field => ({name:field.name,type:field.type,required:field.required})),
    privacyLinks: Array.from(form?.querySelectorAll('a') || []).map(link => link.getAttribute('href'))
  };
})()
'@
    $passed = $before.open -and $before.focusInside -and $after.closed -and $after.focusRestored -and
        'tel:0915250101' -in $before.links.href -and 'tel:0915260101' -in $before.links.href -and
        @($before.links | Where-Object { $_.href -like '*zalo.me*' }).Count -eq 1 -and
        @($before.links | Where-Object { $_.href -like '*lien-he#contact-form*' }).Count -eq 1 -and
        $form.configStatus -eq 200 -and $form.available -and $form.enabled -and $form.hasForm -and
        $form.consentCheckboxes -eq 1 -and
        @($form.privacyLinks | Where-Object { $_ -like '*chinh-sach-bao-mat*' }).Count -ge 1
    $results += [pscustomobject]@{locale=$locale;before=$before;after=$after;form=$form;passed=[bool]$passed}
}
$report = [pscustomobject]@{
    timestamp = [DateTime]::UtcNow.ToString('o')
    passed = @($results | Where-Object { -not $_.passed }).Count -eq 0
    results = $results
}
$report | ConvertTo-Json -Depth 9 | Set-Content (Join-Path $directory 'contact-flow-results.json') -Encoding utf8
$report | ConvertTo-Json -Depth 9
if (-not $report.passed) { exit 1 }
