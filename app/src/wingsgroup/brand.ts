export const WINGSGROUP_BRAND = {
  accent: '#FDB515',
  assets: {
    favicon: '/brand/wingsgroup/wingsgroup-favicon.png',
    logoPrimary: '/brand/wingsgroup/wingsgroup-logo-primary.png',
    logoReverse: '/brand/wingsgroup/wingsgroup-logo-reverse.png',
    mark: '/brand/wingsgroup/wingsgroup-mark.png',
    ogImage: '/brand/wingsgroup/wingsgroup-og-image.png',
  },
  assetContract: {
    dimensions: {
      favicon: [512, 512],
      logoPrimary: [2400, 800],
      logoReverse: [2400, 800],
      mark: [1024, 1024],
      ogImage: [1200, 630],
    },
    doNotCrop: true,
    doNotUpscale: true,
    unit: 'css-px',
  },
  assetIntegrity: {
    favicon: 'c25c45001985214c8f0a70529c8c08e12e682a80b568ae314ffd750714c66a24',
    logoPrimary: '820a953bcaa305558f4533d2760f9ca9c0c0551fc0cc9e45c5e496ba9b170ba6',
    logoReverse: '92578f729b055613b17cad1aff58c84ce12263c26108efb42d3fe0a350a6c447',
    mark: 'f516301771b8a9cb6cbfc5e4c20def287059454e0d1f390298377b066a66a751',
    ogImage: 'ab503a9080d51e0aca22afcf6123e86957cca1864bb8144b9c441cd2ed67b56c',
  },
  displayTitle: 'WingsGroup',
  primary: '#005090',
  source: {
    archive: 'https://quyt-lenovo.taild819fc.ts.net/WingsGroup-web-brand-kit.zip',
    guide: 'https://quyt-lenovo.taild819fc.ts.net/WingsGroup-web-brand-kit/WEB-BRAND-GUIDE.md',
    ownerApprovalDate: '2026-08-23',
  },
  tagline: 'Fly further. Together',
} as const

export const isWingsGroupBrandSite = (siteCode?: null | string): boolean =>
  siteCode === 'wings-group'
