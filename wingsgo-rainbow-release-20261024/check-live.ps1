$ErrorActionPreference = 'Stop'
$taskRoot = 'E:/repo/WingsTravel/wingsgo-rainbow-release-20261024'
$taskScript = [IO.File]::ReadAllText("$taskRoot/check-border.js").Trim().TrimEnd(';')
$taskEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($taskScript))
foreach ($taskWidth in @(1280, 390)) {
    foreach ($taskRoute in @('/tour', '/', '/thi-truong/nhat-ban')) {
        & agent-browser --session rainbow-release set viewport $taskWidth 900
        & agent-browser --session rainbow-release set media light
        & agent-browser --session rainbow-release open "https://wingsgo.vn$taskRoute"
        if ($LASTEXITCODE -ne 0) { throw 'Navigation failed' }
        & agent-browser --session rainbow-release eval -b $taskEncoded
        if ($LASTEXITCODE -ne 0) { throw 'Border check failed' }
        if ($taskRoute -eq '/tour') {
            & agent-browser --session rainbow-release screenshot "$taskRoot/live-tour-$taskWidth.png"
        }
    }
}
& agent-browser --session rainbow-release open 'https://wingsgo.vn/tour'
& agent-browser --session rainbow-release set media light reduced-motion
& agent-browser --session rainbow-release eval -b $taskEncoded
if ($LASTEXITCODE -ne 0) { throw 'Reduced motion failed' }
& agent-browser --session rainbow-release errors
& agent-browser --session rainbow-release set media light
Write-Output "Live browser checks passed $(Get-Date -Format o)"
