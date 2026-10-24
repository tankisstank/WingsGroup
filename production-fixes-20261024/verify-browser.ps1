$ErrorActionPreference = 'Stop'
$browserSession = 'production-fixes-20261024'
$probe = @'
(async () => {
  const card = document.querySelector('.hot-rainbow-card');
  if (!card) throw new Error('No hot tour card found');
  const sample = () => {
    const style = getComputedStyle(card, '::before');
    return {
      angle: style.getPropertyValue('--hot-rainbow-angle'),
      background: style.backgroundImage,
      animation: style.animationName,
      transform: style.transform,
      pointerEvents: style.pointerEvents
    };
  };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const before = sample();
  await new Promise(resolve => setTimeout(resolve, 850));
  const after = sample();
  if (reducedMotion) {
    if (after.animation !== 'none' || before.angle !== after.angle) {
      throw new Error('Reduced-motion preference was not respected');
    }
  } else if (before.angle === after.angle || before.background === after.background) {
    throw new Error('Rainbow border does not visibly change');
  }
  if (after.transform !== 'none' || after.pointerEvents !== 'none') {
    throw new Error('Border moves its rectangle or intercepts clicks');
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) {
    throw new Error('Horizontal overflow');
  }
  return {timestampUTC:new Date().toISOString(),url:location.href,width:innerWidth,reducedMotion,before,after,pass:true};
})()
'@
$encodedProbe = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($probe))
foreach ($width in @(1280, 390)) {
    agent-browser --session $browserSession set viewport $width 950
    if ($LASTEXITCODE -ne 0) { throw 'Cannot set viewport' }
    agent-browser --session $browserSession set media light
    if ($LASTEXITCODE -ne 0) { throw 'Cannot set motion mode' }
    foreach ($route in @('/', '/tour')) {
        agent-browser --session $browserSession open "https://wingsgo.vn$route"
        if ($LASTEXITCODE -ne 0) { throw 'Cannot navigate' }
        agent-browser --session $browserSession eval -b $encodedProbe
        if ($LASTEXITCODE -ne 0) { throw 'Animation verification failed' }
    }
}
agent-browser --session $browserSession screenshot 'production-fixes-20261024/tour-mobile.png'
if ($LASTEXITCODE -ne 0) { throw 'Cannot capture screenshot' }
agent-browser --session $browserSession set media light reduced-motion
if ($LASTEXITCODE -ne 0) { throw 'Cannot set reduced-motion mode' }
agent-browser --session $browserSession eval -b $encodedProbe
if ($LASTEXITCODE -ne 0) { throw 'Reduced-motion verification failed' }
agent-browser --session $browserSession set media light
if ($LASTEXITCODE -ne 0) { throw 'Cannot restore test mode' }
agent-browser --session $browserSession console
agent-browser --session $browserSession errors
