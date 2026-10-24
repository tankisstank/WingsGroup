$ErrorActionPreference = 'Stop'
$session = 'root-us083-cms-release'
$evidenceRoot = 'E:/repo/WingsTravel/docs/reviews/us083-cms-promotion-20261020'
$browserProbe = '({url:location.href,title:document.title,h1:document.querySelector("h1")?.innerText,width:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth,deletedPrices:document.querySelectorAll("del").length,bodyLength:document.body.innerText.length,privacyLinks:Array.from(document.querySelectorAll("a")).filter(link=>link.href.includes("chinh-sach-bao-mat")).map(link=>({text:link.innerText,href:link.getAttribute("href")}))})'
$encodedProbe = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($browserProbe))
$routes = @(
    @{ slug = 'home'; url = 'https://wingsgo.vn/' },
    @{ slug = 'tour'; url = 'https://wingsgo.vn/tour' },
    @{ slug = 'hanquoc'; url = 'https://wingsgo.vn/thi-truong/han-quoc' },
    @{ slug = 'nhatban'; url = 'https://wingsgo.vn/thi-truong/nhat-ban' },
    @{ slug = 'wingsgroup-en'; url = 'https://wingsgroup.vn/en' }
)
$results = @()
foreach ($viewport in @(@{ name = 'desktop'; width = 1440; height = 900 }, @{ name = 'mobile'; width = 390; height = 844 })) {
    & agent-browser --session $session set viewport $viewport.width $viewport.height
    if ($LASTEXITCODE -ne 0) { throw 'Viewport change failed' }
    foreach ($route in $routes) {
        & agent-browser --session $session open $route.url
        if ($LASTEXITCODE -ne 0) { Start-Sleep -Seconds 3 }
        $probeOutput = & agent-browser --session $session eval -b $encodedProbe
        if ($LASTEXITCODE -ne 0) { throw 'DOM probe failed' }
        $probe = ($probeOutput -join "`n") | ConvertFrom-Json
        if ($probe.overflow -or $probe.bodyLength -lt 200 -or -not $probe.h1) { throw "Rendered page invalid: $($route.url)" }
        if ($route.slug -eq 'wingsgroup-en' -and -not @($probe.privacyLinks | Where-Object { $_.href -eq '/en/chinh-sach-bao-mat' }).Count) {
            throw 'English privacy link missing'
        }
        $screenshot = "prod-$($route.slug)-$($viewport.name).png"
        & agent-browser --session $session screenshot "$evidenceRoot/$screenshot"
        if ($LASTEXITCODE -ne 0) { throw 'Screenshot failed' }
        $results += @{ viewport = $viewport.name; screenshot = $screenshot; dom = $probe }
        Write-Output "PASS $($viewport.name) $($route.url) width=$($probe.documentWidth)/$($probe.width)"
    }
}
$errorOutput = & agent-browser --session $session --json errors
$errorResult = ($errorOutput -join "`n") | ConvertFrom-Json
if (-not $errorResult.success -or @($errorResult.data.errors).Count -ne 0) { throw 'Browser page errors present' }
@{ timestamp = (Get-Date).ToUniversalTime().ToString('o'); buildID = 'GHux1OjjppK42suiKM04m'; readOnly = $true; pageErrors = 0; results = $results } | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath "$evidenceRoot/production-browser-proof.json" -Encoding utf8

