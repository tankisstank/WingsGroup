import { describe, expect, it } from 'vitest'

import { isRetailTourEnabledSiteCode, retailTourEnabledSiteCodes } from '@/utilities/siteCapabilities'

describe('site capability registry', () => {
  it('keeps the retail-tour capability explicit', () => {
    expect(retailTourEnabledSiteCodes).toEqual(['wings-go'])
    expect(isRetailTourEnabledSiteCode('wings-go')).toBe(true)
    expect(isRetailTourEnabledSiteCode('wings-group')).toBe(false)
    expect(isRetailTourEnabledSiteCode('wings-side')).toBe(false)
  })
})
