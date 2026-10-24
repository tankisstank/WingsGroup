$ErrorActionPreference = 'Stop'
$binary = 'C:\Users\VIETD\AppData\Roaming\npm\node_modules\agent-browser\bin\agent-browser-win32-x64.exe'
$results = [System.Collections.Generic.List[object]]::new()

function Browser {
  param([string[]]$Arguments)
  $output = & $binary --session wingsgo-footer-fix @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw ($output -join "`n") }
  return ($output -join "`n")
}

function Evaluate {
  param([string]$Code)
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Code))
  return (Browser @('eval', '-b', $encoded) | ConvertFrom-Json)
}

function Assert {
  param([bool]$Condition, [string]$Message)
  if (!$Condition) { throw $Message }
}

$inspect = @'
(() => {
  const footer = document.querySelector('footer.site-footer');
  const call = footer.querySelector('.wingsgo-footer__phone');
  const trigger = document.querySelector('button[aria-controls="site-contact-dialog"]');
  return {
    site: document.body.dataset.siteCode,
    language: document.documentElement.lang,
    theme: document.documentElement.dataset.theme,
    phones: [...footer.querySelectorAll('a[href^="tel:"]')].map(link => link.getAttribute('href')),
    emails: [...footer.querySelectorAll('a[href^="mailto:"]')].map(link => link.getAttribute('href')),
    selectors: footer.querySelectorAll('[role="combobox"],select').length,
    zalo: [...footer.querySelectorAll('a')].filter(link => /zalo\.me/.test(link.href)).length,
    duplicateAdvice: /Nhận tư vấn Tour|Get tour advice/i.test(footer.innerText),
    callLabel: call.textContent.trim(),
    callHeight: call.getBoundingClientRect().height,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    triggerHidden: trigger.hidden && getComputedStyle(trigger).display === 'none',
    oldPhones: [...document.querySelectorAll('a[href^="tel:"]')].filter(link => /0912910101/.test(link.href)).length,
    addresses: footer.querySelector('address')?.textContent,
  };
})()
'@

foreach ($path in @('/', '/en', '/lien-he', '/en/lien-he')) {
  foreach ($width in @(320, 390, 768, 1280)) {
    Browser @('set', 'viewport', "$width", '900') | Out-Null
    Browser @('open', "http://127.0.0.1:3193$path") | Out-Null
    Browser @('wait', '--fn', "document.body.dataset.siteCode === 'wings-go' && !!document.querySelector('footer.site-footer')") | Out-Null
    Evaluate 'window.scrollTo(0, document.body.scrollHeight)' | Out-Null
    Browser @('wait', '--fn', "document.querySelector('button[aria-controls=site-contact-dialog]').hidden === true") | Out-Null
    $proof = Evaluate $inspect
    Assert ($proof.site -eq 'wings-go') 'Wrong tenant'
    $expectedLanguage = if ($path.StartsWith('/en')) { 'en' } else { 'vi' }
    Assert ($proof.language -eq $expectedLanguage) 'Wrong language'
    Assert ($proof.phones.Count -eq 1 -and $proof.phones[0] -eq 'tel:0948786775') 'Footer phone contract failed'
    Assert ($proof.emails.Count -eq 1) 'Footer must have one email'
    Assert ($proof.selectors -eq 0 -and $proof.theme -eq 'light') 'Theme contract failed'
    Assert ($proof.zalo -eq 0 -and !$proof.duplicateAdvice) 'Duplicate footer contacts remain'
    Assert ($proof.callHeight -ge 44) 'Call tap target too small'
    Assert ($proof.overflow -le 1) 'Horizontal page overflow'
    Assert $proof.triggerHidden 'FAB still visible at footer'
    Assert ($proof.oldPhones -eq 0) 'Old main phone remains on this page'
    Assert (![string]::IsNullOrWhiteSpace($proof.addresses)) 'Legal addresses lost'
    $results.Add([ordered]@{ path = $path; width = $width; proof = $proof })
    if (($path -eq '/' -and $width -eq 1280) -or ($path -eq '/en' -and $width -eq 320)) {
      $name = if ($path -eq '/') { 'footer-vi-desktop.png' } else { 'footer-en-mobile.png' }
      Browser @('screenshot', (Join-Path $PSScriptRoot $name)) | Out-Null
    }
    Evaluate 'window.scrollTo(0, 0)' | Out-Null
    Browser @('wait', '--fn', "document.querySelector('button[aria-controls=site-contact-dialog]').hidden === false") | Out-Null
    Write-Output "PASS $path ${width}px"
  }
}

Evaluate "localStorage.setItem('payload-theme', 'dark')" | Out-Null
Browser @('reload') | Out-Null
Browser @('wait', '--fn', "document.documentElement.dataset.theme === 'light'") | Out-Null
$serverTheme = Evaluate @'
fetch(location.href).then(response => response.text()).then(html => new DOMParser().parseFromString(html, 'text/html').documentElement.getAttribute('data-theme') === 'light')
'@
Assert $serverTheme 'SSR does not force light'

Browser @('snapshot', '-i') | Out-File (Join-Path $PSScriptRoot 'before-dialog.txt') -Encoding utf8
Browser @('click', 'button[aria-controls="site-contact-dialog"]') | Out-Null
Browser @('wait', '--fn', "!!document.querySelector('#site-contact-dialog')") | Out-Null
Evaluate 'window.scrollTo(0, document.body.scrollHeight)' | Out-Null
Browser @('wait', '--fn', "document.querySelector('footer').getBoundingClientRect().top < innerHeight") | Out-Null
Assert (Evaluate "!!document.querySelector('#site-contact-dialog')") 'Open dialog disappeared at footer'
Browser @('press', 'Escape') | Out-Null
Browser @('wait', '--fn', "!document.querySelector('#site-contact-dialog') && document.activeElement.matches('.wingsgo-footer__phone')") | Out-Null
Write-Output 'PASS SSR/light preference, dialog scroll retention, Escape and focus restoration'

foreach ($site in @(@{port=3194;code='wings-group'}, @{port=3195;code='wing-side'})) {
  foreach ($width in @(390, 1280)) {
    Browser @('set', 'viewport', "$width", '900') | Out-Null
    Browser @('open', "http://127.0.0.1:$($site.port)/") | Out-Null
    Browser @('wait', '--fn', "document.body.dataset.siteCode === '$($site.code)' && !!document.querySelector('footer')") | Out-Null
    $proof = Evaluate @'
({site:document.body.dataset.siteCode,htmlTheme:document.documentElement.dataset.theme,phones:[...document.querySelectorAll('footer a[href^="tel:"]')].map(link=>link.getAttribute('href')),wingGoPhone:!!document.querySelector('footer .wingsgo-footer__phone')})
'@
    Assert ($proof.site -eq $site.code -and !$proof.wingGoPhone) 'Tenant footer isolation failed'
    $results.Add([ordered]@{ site=$site.code; width=$width; proof=$proof })
    Write-Output "PASS $($site.code) ${width}px tenant isolation"
  }
}

$errors = Browser @('errors', '--json') | ConvertFrom-Json
Assert ($errors.data.errors.Count -eq 0) "Browser exceptions: $($errors | ConvertTo-Json -Depth 8)"
[ordered]@{ checkedAt=(Get-Date -Format o); cases=$results; browserErrors=$errors; ssrLight=$serverTheme; interaction='PASS: FAB hide/show, open dialog preserved, Escape focuses footer call' } | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $PSScriptRoot 'browser-results.json') -Encoding utf8
Write-Output "PASS $($results.Count) responsive cases; no browser exceptions"
