$ErrorActionPreference = 'Stop'
$session = 'root-us083-promotion-final'
$evidenceRoot = 'E:/repo/WingsTravel/docs/reviews/us083-promotion-visual-search-20261020/market-followup'
$browserProbe = @'
({url:location.href,title:document.title,h1:document.querySelector('h1')?.innerText,width:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth,bodyLength:document.body.innerText.length,discounts:Array.from(document.querySelectorAll('del')).map(node=>({original:node.innerText,sale:node.nextElementSibling?.textContent,color:node.nextElementSibling?getComputedStyle(node.nextElementSibling).color:null})),numericBadge:Array.from(document.querySelectorAll('span[class*="bg-gradient-to-r"]')).some(node=>/^\d[\d\s.,-]*$/.test(node.innerText.trim())),privacyLinks:Array.from(document.querySelectorAll('a')).filter(link=>link.href.includes('chinh-sach-bao-mat')).map(link=>({text:link.innerText,href:link.getAttribute('href')}))})
'@
$encodedProbe = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($browserProbe))
$routes = @(
    @{slug='home';url='https://wingsgo.vn/';discount=$true},
    @{slug='tour';url='https://wingsgo.vn/tour';discount=$true},
    @{slug='detail-119';url='https://wingsgo.vn/tour/tour-6n5d-osaka-kobe-kyoto-nui-phu-si-tokyo-kix-nrt';discount=$true},
    @{slug='hanquoc';url='https://wingsgo.vn/thi-truong/han-quoc';discount=$false},
    @{slug='nhatban';url='https://wingsgo.vn/thi-truong/nhat-ban';discount=$true},
    @{slug='wingsgroup-en';url='https://wingsgroup.vn/en';discount=$false}
)
$results = @()
foreach ($viewport in @(@{name='desktop';width=1440;height=900},@{name='mobile';width=390;height=844})) {
    & agent-browser --session $session set viewport $viewport.width $viewport.height
    if ($LASTEXITCODE -ne 0) { throw 'Viewport change failed' }
    foreach ($route in $routes) {
        & agent-browser --session $session open $route.url
        if ($LASTEXITCODE -ne 0) { & agent-browser --session $session wait --load domcontentloaded }
        $probeOutput = & agent-browser --session $session eval -b $encodedProbe
        if ($LASTEXITCODE -ne 0) { throw 'DOM probe failed' }
        $probe = ($probeOutput -join "`n") | ConvertFrom-Json
        if (([uri]$probe.url).AbsolutePath -ne ([uri]$route.url).AbsolutePath -or ([uri]$probe.url).Host -ne ([uri]$route.url).Host) { throw "Unexpected URL: $($probe.url)" }
        if ($probe.overflow -or $probe.bodyLength -lt 200 -or -not $probe.h1 -or $probe.numericBadge) { throw "Rendered page invalid: $($route.url)" }
        if ($route.discount -and @($probe.discounts).Count -eq 0) { throw "Discount missing: $($route.url)" }
        if ($route.slug -eq 'wingsgroup-en' -and -not @($probe.privacyLinks | Where-Object {$_.href -eq '/en/chinh-sach-bao-mat'}).Count) { throw 'English privacy link missing' }
        $screenshot = "prod-$($route.slug)-$($viewport.name).png"
        & agent-browser --session $session screenshot "$evidenceRoot/$screenshot"
        if ($LASTEXITCODE -ne 0) { throw 'Screenshot failed' }
        $results += @{viewport=$viewport.name;screenshot=$screenshot;dom=$probe}
        Write-Output "PASS $($viewport.name) $($route.url) width=$($probe.documentWidth)/$($probe.width) discounts=$(@($probe.discounts).Count)"
    }
}
$errorOutput = & agent-browser --session $session --json errors
$errorResult = ($errorOutput -join "`n") | ConvertFrom-Json
if (-not $errorResult.success -or @($errorResult.data.errors).Count -ne 0) { throw 'Browser page errors present' }
@{timestamp=(Get-Date).ToUniversalTime().ToString('o');buildID=(Get-Content "$PSScriptRoot/expected-build-id.txt" -Raw).Trim();readOnly=$true;pageErrors=0;results=$results} | ConvertTo-Json -Depth 8 | Set-Content "$evidenceRoot/production-browser-proof.json" -Encoding utf8

