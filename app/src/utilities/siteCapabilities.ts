export const retailTourEnabledSiteCodes = ['wings-go'] as const

/** Sites that render structured /tour/:slug TourDetailPage. */
export const structuredTourDetailSiteCodes = ['wings-go', 'wing-side'] as const

/** Alias used by US-046 feature branch. */
export const structuredTourDetailEnabledSiteCodes = structuredTourDetailSiteCodes

/** Private / consultative inbound — no retail hold-seat / departure matrix UX. */
export const consultativeTourSiteCodes = ['wing-side'] as const

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

/** Alias for US-046 naming. */
export const isStructuredTourDetailEnabledSiteCode = isStructuredTourDetailSiteCode

export const isConsultativeTourSiteCode = (siteCode?: null | string): boolean =>
  Boolean(
    siteCode &&
    consultativeTourSiteCodes.includes(siteCode as (typeof consultativeTourSiteCodes)[number]),
  )
