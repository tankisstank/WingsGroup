export const retailTourEnabledSiteCodes = ['wings-go'] as const

/** Sites that render structured /tour/:slug TourDetailPage. */
export const structuredTourDetailSiteCodes = ['wings-go', 'wings-side'] as const

/** Private / consultative inbound — no retail hold-seat / departure matrix UX. */
export const consultativeTourSiteCodes = ['wings-side'] as const

export const isRetailTourEnabledSiteCode = (siteCode?: null | string): boolean =>
  Boolean(
    siteCode &&
      retailTourEnabledSiteCodes.includes(siteCode as (typeof retailTourEnabledSiteCodes)[number]),
  )

export const isStructuredTourDetailSiteCode = (siteCode?: null | string): boolean =>
  Boolean(
    siteCode &&
      structuredTourDetailSiteCodes.includes(
        siteCode as (typeof structuredTourDetailSiteCodes)[number],
      ),
  )

export const isConsultativeTourSiteCode = (siteCode?: null | string): boolean =>
  Boolean(
    siteCode &&
      consultativeTourSiteCodes.includes(siteCode as (typeof consultativeTourSiteCodes)[number]),
  )
