(async () => {
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const header = document.querySelector('header.site-header');
  if (!header) {
    throw new Error('Header missing');
  }
  const visible = (element) => element && element.getBoundingClientRect().width > 0;
  const rect = (element) => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
  };
  const primary = header.querySelector('nav[aria-label="Primary navigation"]');
  const desktop = visible(primary);
  const brand = header.querySelector('.site-header__brand');
  const zone = header.querySelector(desktop
    ? 'nav[aria-label="Primary navigation"] .wingsgroup-contact-zone'
    : '.wingsgroup-contact-zone--mobile');
  const call = zone?.querySelector('.wingsgroup-call-link');
  const toggle = zone?.querySelector('button');
  if (!zone || !call || !toggle) {
    throw new Error('Expected approved split call controls');
  }
  const navLinks = Array.from(primary.querySelectorAll('.site-header__primary-link'));
  const language = primary.querySelector('.site-language-switcher');
  const languageLabels = Array.from(language?.querySelectorAll('a') || []).map((link) => ({
    text: link.textContent.trim(),
    after: getComputedStyle(link, '::after').content,
  }));
  const languageLabelsCorrect = languageLabels.map((label) => label.text).join('|') === 'VI|EN'
    && languageLabels.every((label) => ['none', 'normal', '""'].includes(label.after));
  const hamburger = header.querySelector('button[aria-controls="mobile-primary-navigation"]');
  const groups = desktop ? [brand, ...navLinks, zone, language] : [brand, zone, hamburger];
  const boxes = groups.map(rect);
  const collisions = [];
  for (let index = 1; index < boxes.length; index += 1) {
    if (boxes[index - 1].right > boxes[index].left + 0.5) {
      collisions.push({ leftGroup: index - 1, rightGroup: index, overlap: boxes[index - 1].right - boxes[index].left });
    }
  }
  const clippedGroups = boxes.filter((box) => box.left < -0.5 || box.right > innerWidth + 0.5);
  const targets = (desktop ? [call, toggle] : [call, toggle, hamburger]).map(rect);
  const targetsFit = targets.every((box) => box.width >= 44 && box.height >= 44);
  const primaryLinksCount = navLinks.length;
  if (toggle.getAttribute('aria-expanded') !== 'true') {
    toggle.click();
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const popup = document.getElementById(toggle.getAttribute('aria-controls'));
  const popupBox = popup ? rect(popup) : null;
  const channels = popup ? Array.from(popup.querySelectorAll('a')).map((link) => ({
    text: link.textContent.replace(/\s+/g, ' ').trim(),
    href: link.getAttribute('href'),
  })) : [];
  const popupFits = popupBox && popupBox.left >= 0 && popupBox.right <= innerWidth + 0.5
    && popupBox.top >= 0 && popupBox.bottom <= innerHeight + 0.5;
  toggle.click();
  return {
    timestamp: new Date().toISOString(),
    url: location.href,
    locale: document.documentElement.lang,
    width: innerWidth,
    desktop,
    primaryLinksCount,
    mainHref: call.getAttribute('href'),
    callLabel: call.getAttribute('aria-label'),
    collisions,
    clippedGroups,
    overflow: document.documentElement.scrollWidth > innerWidth,
    groups: boxes,
    popupFits,
    popupBox,
    channels,
    targetSize: rect(toggle),
    languageLabels,
    languageLabelsCorrect,
    targets,
    targetsFit,
    passed: collisions.length === 0 && clippedGroups.length === 0 && popupFits
      && document.documentElement.scrollWidth <= innerWidth
      && call.getAttribute('href') === 'tel:0948786775'
      && targetsFit && languageLabelsCorrect && (!desktop || primaryLinksCount === 6),
  };
})()
