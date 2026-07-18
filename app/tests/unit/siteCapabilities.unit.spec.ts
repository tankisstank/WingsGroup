import { describe, expect, it } from 'vitest'

import {
  isRetailTourEnabledSiteCode,
  isStructuredTourDetailEnabledSiteCode,
  retailTourEnabledSiteCodes,
  structuredTourDetailEnabledSiteCodes,
} from '@/utilities/siteCapabilities'

describe('site capability registry', () => {
  it('keeps the retail-tour capability explicit', () => {
    expect(retailTourEnabledSiteCodes).toEqual(['wings-go'])
    expect(isRetailTourEnabledSiteCode('wings-go')).toBe(true)
    expect(isRetailTourEnabledSiteCode('wings-group')).toBe(false)
    expect(isRetailTourEnabledSiteCode('wings-side')).toBe(false)
  })

  it('separates structured detail from the WingsGo-only retail capability', () => {
    expect(structuredTourDetailEnabledSiteCodes).toEqual(['wings-go', 'wings-side'])
    expect(isStructuredTourDetailEnabledSiteCode('wings-go')).toBe(true)
    expect(isStructuredTourDetailEnabledSiteCode('wings-side')).toBe(true)
    expect(isStructuredTourDetailEnabledSiteCode('wings-plus')).toBe(false)
    expect(isRetailTourEnabledSiteCode('wings-side')).toBe(false)
  })
})
