(async () => {
  const frames = Array.from(document.querySelectorAll('iframe'));
  const viewport = document.getElementById('viewport');
  const results = [];
  let assertions = 0;
  const assert = (condition, message) => {
    assertions += 1;
    if (!condition) {
      throw new Error(message);
    }
  };
  const nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const waitForFrames = async () => {
    const started = Date.now();
    while (!frames.every((frame) => frame.dataset.ready === 'true')) {
      if (Date.now() - started > 5000) {
        throw new Error('Preview frames did not become ready');
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await nextPaint();
  };
  const visible = (element) => element.getBoundingClientRect().width > 0;

  for (const locale of ['vi', 'en']) {
    document.querySelector(`[data-language="${locale}"]`).click();
    await waitForFrames();
    for (const width of [1440, 1280, 1200, 1024, 390, 320]) {
      viewport.value = String(width);
      viewport.dispatchEvent(new Event('change'));
      await nextPaint();
      for (const frame of frames) {
        const frameDocument = frame.contentDocument;
        const context = `${frame.id} ${locale} ${width}`;
        const logo = frameDocument.querySelector('.brand img');
        assert(logo.complete && logo.naturalWidth > 0, context + ': logo must load');
        assert(frameDocument.documentElement.lang === locale, context + ': wrong locale');
        assert(frameDocument.documentElement.scrollWidth <= width, context + ': horizontal overflow');
        const groups = Array.from(frameDocument.querySelector('.header-inner').children).filter(visible);
        for (let index = 1; index < groups.length; index += 1) {
          const previous = groups[index - 1].getBoundingClientRect();
          const current = groups[index].getBoundingClientRect();
          assert(current.left >= previous.right + 7, context + ': header groups collide');
        }
        const navigation = frameDocument.querySelector('.desktop-nav');
        if (width >= 1200) {
          const firstLink = navigation.querySelector('a').getBoundingClientRect();
          const brand = frameDocument.querySelector('.brand').getBoundingClientRect();
          assert(firstLink.left - brand.right >= 16, context + ': navigation overlaps brand');
          assert(frameDocument.body.scrollHeight <= frame.contentWindow.innerHeight, context + ': unwanted vertical scroll');
        } else {
          assert(!visible(navigation), context + ': desktop menu should be collapsed');
          const menuButton = frameDocument.querySelector('[data-drawer]');
          menuButton.click();
          assert(!frameDocument.getElementById('mobile-drawer').hidden, context + ': drawer did not open');
          frameDocument.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          assert(frameDocument.getElementById('mobile-drawer').hidden, context + ': drawer did not close');
          assert(frameDocument.activeElement === menuButton, context + ': drawer focus not restored');
        }
        results.push({ option: frame.id, locale, width, groups: groups.length, passed: true });
      }
      document.getElementById('show-channels').click();
      await nextPaint();
      const unifiedDocument = frames[0].contentDocument;
      const popupID = width < 1200 ? 'mobile-channels' : 'desktop-channels';
      const popup = unifiedDocument.getElementById(popupID);
      assert(!popup.hidden, `A ${locale} ${width}: contact popup did not open`);
      const popupBox = popup.getBoundingClientRect();
      assert(popupBox.left >= 0 && popupBox.right <= width + 1, `A ${locale} ${width}: popup outside screen`);
      assert(popupBox.bottom <= frames[0].contentWindow.innerHeight, `A ${locale} ${width}: popup clipped`);
      assert(popup.querySelectorAll('a').length === 4, 'A: expected 2 secondary hotlines, Zalo and inquiry');
      const dialog = frames[1].contentDocument.querySelector('dialog');
      assert(dialog.open, `B ${locale} ${width}: consultation dialog did not open`);
      const dialogHeading = dialog.querySelector('h2').getBoundingClientRect();
      const dialogClose = dialog.querySelector('[data-close]').getBoundingClientRect();
      assert(dialogHeading.right + 10 <= dialogClose.left, `B ${locale} ${width}: title overlaps close button`);
      assert(dialog.querySelectorAll('a').length === 5, 'B: expected Zalo, 3 hotlines and inquiry');
      popup.querySelector('[data-simulate="zalo"]').click();
      assert(!document.getElementById('toast').hidden, 'Mock Zalo click did not give feedback');
      frames[1].contentDocument.querySelector('[data-close]').click();
      assert(!dialog.open, 'B: close button did not dismiss dialog');
    }
  }
  document.querySelector('[data-language="vi"]').click();
  await waitForFrames();
  viewport.value = '1280';
  viewport.dispatchEvent(new Event('change'));
  document.getElementById('toast').hidden = true;
  await nextPaint();
  return { status: 'PASS', assertions, cases: results.length, timestamp: new Date().toISOString(), results };
})()
