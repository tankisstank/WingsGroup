export const retailTourEnabledSiteCodes = ['wings-go'] as const

export const isRetailTourEnabledSiteCode = (siteCode?: null | string): boolean =>
  Boolean(siteCode && retailTourEnabledSiteCodes.includes(siteCode as (typeof retailTourEnabledSiteCodes)[number]))
