$ErrorActionPreference = 'Stop'
$reviewDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$routes = @('/wingsgroup', '/wingsgroup/en', '/wingsgroup/lien-he', '/wingsgroup/en/lien-he')
$widths = @(320, 390, 768, 1280)
$results = @()
$measurement = @'
(() => {
  const footer = document.querySelector('footer.site-footer');
  const direct = document.querySelector('[data-testid="wingsgroup-direct-contacts"]');
  const contactPage = location.pathname.endsWith('/lien-he');
  const english = location.pathname.includes('/en');
  const phoneLinks = [...footer.querySelectorAll('a[href^="tel:"]')];
  const emails = [...footer.querySelectorAll('a[href^="mailto:"]')];
  const primary = document.querySelector('.site-header--wingsgroup-v3 a[href^="tel:"]');
  const directLinks = direct ? [...direct.querySelectorAll('a')] : [];
  const expectedLabel = english ? 'Call now: 0948 786 775' : 'G\u1ecdi ngay: 0948 786 775';
  const directPassed = !contactPage || (
    directLinks.length === 1 && directLinks[0].getAttribute('href') === 'tel:0948786775' &&
    directLinks[0].textContent.trim() === expectedLabel &&
    directLinks[0].getBoundingClientRect().height >= 44 &&
    Boolean(document.querySelector('#contact-form form'))
  );
  const passed = phoneLinks.length === 1 && emails.length === 1 &&
    phoneLinks[0].getAttribute('href') === 'tel:0948786775' &&
    phoneLinks[0].getBoundingClientRect().height >= 44 &&
    getComputedStyle(phoneLinks[0]).alignItems === 'center' &&
    emails[0].getAttribute('href') === 'mailto:info@wingsgroup.vn' &&
    !footer.querySelector('a[href*="zalo.me"], [data-wingsgroup-consultation-trigger]') &&
    !footer.textContent.includes('0915 250 101') &&
    !footer.textContent.includes('sales@wingsgroup.vn') &&
    document.documentElement.scrollWidth <= innerWidth &&
    primary?.getAttribute('href') === 'tel:0948786775' && directPassed;
  return {
    path: location.pathname,
    width: innerWidth,
    passed,
    directPassed,
    footerPhoneLinks: phoneLinks.map(link => link.getAttribute('href')),
    footerPhoneHeight: phoneLinks[0]?.getBoundingClientRect().height,
    footerEmailLinks: emails.map(link => link.getAttribute('href')),
    directText: direct?.innerText,
    directLinks: directLinks.map(link => ({
      href: link.getAttribute('href'),
      label: link.textContent.trim(),
      height: link.getBoundingClientRect().height
    })),
    hasForm: Boolean(document.querySelector('#contact-form form')),
    scrollWidth: document.documentElement.scrollWidth
  };
})()
'@
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($measurement))
foreach ($route in $routes) {
    agent-browser --session footer-local open "http://localhost:3000$route" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Navigation failed: $route" }
    agent-browser --session footer-local wait --load networkidle | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Page not ready: $route" }
    foreach ($width in $widths) {
        agent-browser --session footer-local set viewport $width 900 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Viewport failed: $width" }
        $measurementOutput = agent-browser --session footer-local eval -b $encoded
        if ($LASTEXITCODE -ne 0) { throw "Measurement failed: $route / $width" }
        $results += $measurementOutput | ConvertFrom-Json
    }
    Write-Output "Checked $route at four widths."
}
$failures = @($results | Where-Object { -not $_.passed })
[pscustomobject]@{
    timestamp = [DateTime]::UtcNow.ToString('o')
    cases = $results.Count
    failures = $failures.Count
    results = $results
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $reviewDirectory 'browser-results.json') -Encoding utf8
Write-Output "Cases: $($results.Count); failures: $($failures.Count)"
if ($failures.Count -gt 0) { exit 1 }
