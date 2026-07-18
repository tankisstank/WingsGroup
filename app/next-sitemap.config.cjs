/** @type {import('next-sitemap').IConfig} */
module.exports = {
  // Runtime routes own robots.txt and all sitemap output because one build serves many hosts.
  // Keep the legacy postbuild command harmless until package scripts can be removed separately.
  siteUrl: 'https://wingsgroup.vn',
  outDir: '.next/legacy-next-sitemap-disabled',
  generateIndexSitemap: false,
  generateRobotsTxt: false,
  exclude: ['/*'],
}
