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

function Invoke-Evaluation {
    param([string]$Source)
    $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Source))
    return Invoke-Browser @('eval', '-b', $encoded)
}

$results = @()
foreach ($case in @(
    @{ route = '/ve-wingsgroup'; locale = 'vi'; width = '320'; zone = '.wingsgroup-contact-zone--mobile' },
    @{ route = '/en/ve-wingsgroup'; locale = 'en'; width = '1280'; zone = 'nav[aria-label="Primary navigation"] .wingsgroup-contact-zone' }
)) {
    $null = Invoke-Browser @('open', "https://wingsgroup.vn$($case.route)")
    $null = Invoke-Browser @('set', 'viewport', $case.width, '900')
    $null = Invoke-Browser @('wait', '--fn', 'document.querySelector(''[data-client-ready="true"]'') !== null')
    $null = Invoke-Evaluation 'sessionStorage.setItem("wingsgroup-inquiry-context", "outbound")'
    $null = Invoke-Browser @('click', "$($case.zone) button")
    $null = Invoke-Browser @('click', "$($case.zone) a.wingsgroup-channel[href$='#contact-form']")
    $expectedURL = "https://wingsgroup.vn$($case.route.Replace('/ve-wingsgroup', '/lien-he'))#contact-form"
    $readyCondition = "location.href === '$expectedURL' && document.readyState === 'complete' && document.activeElement?.getAttribute('name') === 'full-name'"
    $null = Invoke-Browser @('wait', '--fn', $readyCondition)
    $observation = (Invoke-Evaluation @'
(() => {
    const form = document.getElementById('contact-form');
    return {
        timestamp: new Date().toISOString(),
        url: location.href,
        locale: document.documentElement.lang,
        dialogOpen: document.querySelector('dialog[open]') !== null,
        focusInForm: form?.contains(document.activeElement) === true,
        focusedName: document.activeElement?.getAttribute('name'),
        focusKey: sessionStorage.getItem('wingsgroup-contact-focus'),
        inquiryContext: sessionStorage.getItem('wingsgroup-inquiry-context')
    };
})()
'@) | ConvertFrom-Json
    $passed = $observation.url -eq $expectedURL -and $observation.locale -eq $case.locale -and
        -not $observation.dialogOpen -and $observation.focusInForm -and $observation.focusedName -eq 'full-name' -and
        $null -eq $observation.focusKey -and $observation.inquiryContext -eq 'outbound'
    $observation | Add-Member -NotePropertyName passed -NotePropertyValue ([bool]$passed)
    $results += $observation
    $null = Invoke-Evaluation 'sessionStorage.removeItem("wingsgroup-inquiry-context")'
}
$results | ConvertTo-Json -Depth 6 | Tee-Object -FilePath (Join-Path $reviewDirectory 'inquiry-results.json')
if (@($results | Where-Object { -not $_.passed }).Count -gt 0) {
    exit 1
}

