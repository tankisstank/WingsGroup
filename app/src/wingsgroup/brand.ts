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
      logoPrimary: [373, 280],
      logoReverse: [382, 360],
      mark: [512, 447],
      ogImage: [1200, 630],
    },
    canvasPolicy: 'tight-visible-bounds',
    doNotCrop: true,
    doNotUpscale: true,
    preserveTransparentCanvas: true,
    unit: 'css-px',
  },
  assetIntegrity: {
    favicon: 'd6e5553255c54906ca2a114f20cc2ae4295ee86953c225c2e715fdcb8038929e',
    logoPrimary: '02526878d44f36bb443042a90f1717c2f76ed51448b4b602c18b3b53f8cc0855',
    logoReverse: 'd2454deb6daca2d52907b0e11da58066b43dd1f6574968ea34f2ae64a661393f',
    mark: '6ef2946196ea4ae8dbb23d5f444e08d86df6cd20aed5e794b3c4bb39c0a5c4a0',
    ogImage: '0ae007047b161d9224d9be622fadf03e12196fed103d8690dfbbb3149079eecf',
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
