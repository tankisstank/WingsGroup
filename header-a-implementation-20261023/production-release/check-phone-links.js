(() => {
  const phones = [...document.querySelectorAll('a[href^="tel:"]')].map(link => link.getAttribute('href'));
  const mainLinks = phones.filter(href => href === 'tel:0948786775').length;
  const oldLinks = phones.filter(href => href === 'tel:0912910101').length;
  if (oldLinks !== 0 || mainLinks < 3) throw new Error('Inconsistent public hotline');
  return { timestamp:new Date().toISOString(), url:location.href, mainLinks, oldLinks };
})()
