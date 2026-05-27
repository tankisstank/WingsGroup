import { describe, expect, it } from 'vitest'

import {
  getSiteAliasFromPathname,
  getLocaleFromPathname,
  prefixPathWithSite,
  siteAliasToCodeMap,
} from '@/utilities/sitePaths'

describe('site path utilities', () => {
  it('maps local path prefixes to durable site codes', () => {
    expect(siteAliasToCodeMap.wingstravel).toBe('wings-travel')
    expect(siteAliasToCodeMap.wingsgo).toBe('wings-go')
    expect(siteAliasToCodeMap.wingscare).toBe('wings-care')
    expect(siteAliasToCodeMap.wingsinsurance).toBe('wings-insurance')
  })

  it('detects known site aliases from pathnames', () => {
    expect(getSiteAliasFromPathname('/wingsgo/posts')).toBe('wingsgo')
    expect(getSiteAliasFromPathname('/unknown/posts')).toBeNull()
  })

  it('detects supported locale prefixes with or without a site alias', () => {
    expect(getLocaleFromPathname('/wingsgo/en/posts')).toBe('en')
    expect(getLocaleFromPathname('/vi/posts')).toBe('vi')
    expect(getLocaleFromPathname('/wingsgo/fr/posts')).toBeNull()
  })

  it('prefixes internal links while leaving external links untouched', () => {
    expect(prefixPathWithSite('/contact', 'wingscare')).toBe('/wingscare/contact')
    expect(prefixPathWithSite('/contact', 'wingscare', 'en')).toBe('/wingscare/en/contact')
    expect(prefixPathWithSite('https://example.com/contact', 'wingscare')).toBe(
      'https://example.com/contact',
    )
  })
})
