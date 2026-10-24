(() => {
  const header = document.querySelector('.site-header');
  const brand = header?.querySelector('.site-header__brand');
  const navigation = header?.querySelector('nav[aria-label="Primary navigation"]');
  const box = (element) => {
    if (!element) return null;
    const rectangle = element.getBoundingClientRect();
    return {
      left: Number(rectangle.left.toFixed(2)),
      right: Number(rectangle.right.toFixed(2)),
      width: Number(rectangle.width.toFixed(2)),
      top: Number(rectangle.top.toFixed(2)),
      height: Number(rectangle.height.toFixed(2)),
    };
  };
  const visible = (element) => element.getBoundingClientRect().width > 0;
  const brandBox = box(brand);
  const navBox = box(navigation);
  const primaryVisible = Boolean(navigation && visible(navigation));
  if (!header || !brand || !navigation) throw new Error('Missing header landmarks');
  const navigationChildren = Array.from(navigation.children).filter(visible);
  const contentLeft = Math.min(...navigationChildren.map((element) => element.getBoundingClientRect().left));
  return {
    timestamp: new Date().toISOString(),
    url: location.href,
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    primaryVisible,
    brand: brandBox,
    nav: navBox,
    contentLeft,
    brandNavOverlap: primaryVisible && brandBox && navBox
      ? Math.max(0, Number((brandBox.right - contentLeft).toFixed(2)))
      : 0,
    headerLinks: Array.from(header?.querySelectorAll('a, button') || [])
      .filter(visible)
      .map((element) => ({
        text: element.textContent.trim().replace(/\s+/g, ' '),
        href: element.getAttribute('href'),
        label: element.getAttribute('aria-label'),
        ...box(element),
      })),
  };
})()

