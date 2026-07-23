import { describe, expect, it } from 'vitest'

import {
  resolveSiteInquiryContactPath,
  siteInquiryContactPaths,
} from '@/utilities/siteContactPaths'

describe('site inquiry contact paths', () => {
  it('keeps explicit site-aware contact destinations', () => {
    expect(siteInquiryContactPaths).toEqual({
      'wings-care': '/contact',
      'wings-go': '/lien-he',
      'wings-group': '/lien-he',
      'wings-pass': '/contact',
      'wings-plus': '/request-proposal',
      'wing-side': '/contact-us',
    })
  })

  it('falls back to the default inquiry path for unknown sites', () => {
    expect(resolveSiteInquiryContactPath('wing-side')).toBe('/contact-us')
    expect(resolveSiteInquiryContactPath('wings-go')).toBe('/lien-he')
    expect(resolveSiteInquiryContactPath('unknown-site')).toBe('/lien-he')
    expect(resolveSiteInquiryContactPath()).toBe('/lien-he')
  })
})
