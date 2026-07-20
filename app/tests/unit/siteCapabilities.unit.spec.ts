import { describe, expect, it } from 'vitest'

import {
  isConsultativeTourSiteCode,
  isRetailTourEnabledSiteCode,
  isStructuredTourDetailSiteCode,
  retailTourEnabledSiteCodes,
  structuredTourDetailSiteCodes,
} from '@/utilities/siteCapabilities'

describe('site capability registry', () => {
  it('keeps the retail-tour capability explicit', () => {
    expect(retailTourEnabledSiteCodes).toEqual(['wings-go'])
    expect(isRetailTourEnabledSiteCode('wings-go')).toBe(true)
    expect(isRetailTourEnabledSiteCode('wings-group')).toBe(false)
    expect(isRetailTourEnabledSiteCode('wings-side')).toBe(false)
  })

  it('enables structured tour detail for WingsGo retail and Wingside consultative', () => {
    expect(structuredTourDetailSiteCodes).toEqual(['wings-go', 'wings-side'])
    expect(isStructuredTourDetailSiteCode('wings-go')).toBe(true)
    expect(isStructuredTourDetailSiteCode('wings-side')).toBe(true)
    expect(isStructuredTourDetailSiteCode('wings-group')).toBe(false)
    expect(isConsultativeTourSiteCode('wings-side')).toBe(true)
    expect(isConsultativeTourSiteCode('wings-go')).toBe(false)
  })
})
