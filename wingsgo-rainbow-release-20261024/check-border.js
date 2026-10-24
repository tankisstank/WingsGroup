(async () => {
  const cards = Array.from(document.querySelectorAll('.hot-rainbow-card'));
  if (!cards.length) {
    throw new Error('No hot cards on this route');
  }
  const card = cards[0];
  const read = () => {
    const style = getComputedStyle(card, '::before');
    return {
      angle: style.getPropertyValue('--hot-rainbow-angle'),
      background: style.backgroundImage,
      transform: style.transform,
      animation: style.animationName,
      duration: style.animationDuration,
      pointerEvents: style.pointerEvents,
      radius: style.borderRadius,
      mask: style.maskComposite,
    };
  };
  const before = read();
  await new Promise((resolve) => setTimeout(resolve, 700));
  const after = read();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (before.transform !== 'none' || after.transform !== 'none') {
    throw new Error('Card border geometry rotates');
  }
  if (after.pointerEvents !== 'none') {
    throw new Error('Border intercepts clicks');
  }
  if (reduced) {
    if (after.animation !== 'none') {
      throw new Error('Reduced motion animation remains active');
    }
  } else if (after.animation !== 'hotRainbowSpin' || before.angle === after.angle) {
    throw new Error('Rainbow angle does not advance');
  }
  const rect = card.getBoundingClientRect();
  const link = card.querySelector('a');
  if (!link || !link.getAttribute('href')) {
    throw new Error('Missing tour link');
  }
  link.focus();
  if (document.activeElement !== link) {
    throw new Error('Tour link cannot receive focus');
  }
  return {
    url: location.href,
    viewport: innerWidth,
    hotCount: cards.length,
    reduced,
    before,
    after,
    card: {width: rect.width, height: rect.height},
    overflow: document.documentElement.scrollWidth > innerWidth,
    href: link.getAttribute('href'),
    focus: true,
    passed: true,
  };
})();
