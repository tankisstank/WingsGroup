export const retailTourEnabledSiteCodes = ['wings-go'] as const
export const structuredTourDetailEnabledSiteCodes = ['wings-go', 'wings-side'] as const

export const isRetailTourEnabledSiteCode = (siteCode?: null | string): boolean =>
  Boolean(siteCode && retailTourEnabledSiteCodes.includes(siteCode as (typeof retailTourEnabledSiteCodes)[number]))

export const isStructuredTourDetailEnabledSiteCode = (siteCode?: null | string): boolean =>
  Boolean(
    siteCode &&
      structuredTourDetailEnabledSiteCodes.includes(
        siteCode as (typeof structuredTourDetailEnabledSiteCodes)[number],
      ),
  )
