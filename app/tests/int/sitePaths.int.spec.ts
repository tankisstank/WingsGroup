import { describe, expect, it } from 'vitest'

import {
  getSiteAliasFromPathname,
  getLocaleFromPathname,
  legacySiteAliasToCodeMap,
  prefixPathWithSite,
  siteAliasToCodeMap,
} from '@/utilities/sitePaths'

describe('site path utilities', () => {
  it('maps local path prefixes to durable site codes', () => {
    expect(siteAliasToCodeMap.wingsgroup).toBe('wings-group')
    expect(siteAliasToCodeMap.wingsgo).toBe('wings-go')
    expect(siteAliasToCodeMap.wingsside).toBe('wings-side')
    expect(siteAliasToCodeMap.wingspass).toBe('wings-pass')
    expect(siteAliasToCodeMap.wingsplus).toBe('wings-plus')
    expect(siteAliasToCodeMap.wingscare).toBe('wings-care')
    expect(legacySiteAliasToCodeMap.wingstravel).toBe('wings-group')
  })

  it('detects known site aliases from pathnames', () => {
    expect(getSiteAliasFromPathname('/wingsgo/posts')).toBe('wingsgo')
    expect(getSiteAliasFromPathname('/wingsside/destinations/ha-noi')).toBe('wingsside')
    expect(getSiteAliasFromPathname('/wingstravel/posts')).toBe('wingstravel')
    expect(getSiteAliasFromPathname('/unknown/posts')).toBeNull()
  })

  it('detects supported locale prefixes with or without a site alias', () => {
    expect(getLocaleFromPathname('/wingsgo/en/posts')).toBe('en')
    expect(getLocaleFromPathname('/wingsside/en/destinations/ha-noi')).toBe('en')
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
