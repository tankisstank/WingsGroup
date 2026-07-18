import { describe, expect, it } from 'vitest'

import {
  buildLocaleSwitchHref,
  getSiteAliasFromPathname,
  getLocaleFromPathname,
  legacySiteAliasToCodeMap,
  prefixPathWithSite,
  publicLocaleCodes,
  siteAliasToCodeMap,
  supportedLocaleCodes,
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
    expect(getLocaleFromPathname('/wingsside/it/destinations/ha-noi')).toBe('it')
    expect(getLocaleFromPathname('/vi/posts')).toBe('vi')
    expect(getLocaleFromPathname('/wingsgo/fr/posts')).toBe('fr')
    expect(getLocaleFromPathname('/wingsgo/unknown/posts')).toBeNull()
  })

  it('keeps CMS-enabled locales separate from public-enabled locales', () => {
    expect(supportedLocaleCodes).toEqual(['vi', 'en', 'it', 'es', 'pt', 'ja', 'ko', 'fr', 'de'])
    expect(publicLocaleCodes).toEqual(['vi', 'en', 'it', 'es', 'pt'])
  })

  it('prefixes internal links while leaving external links untouched', () => {
    expect(prefixPathWithSite('/contact', 'wingscare')).toBe('/wingscare/contact')
    expect(prefixPathWithSite('/contact', 'wingscare', 'en')).toBe('/wingscare/en/contact')
    expect(prefixPathWithSite('/contact?topic=visa#team', 'wingscare', 'en')).toBe(
      '/wingscare/en/contact?topic=visa#team',
    )
    expect(prefixPathWithSite('/es/destinations', 'wingsside', 'es')).toBe(
      '/wingsside/es/destinations',
    )
    expect(prefixPathWithSite('https://example.com/contact', 'wingscare')).toBe(
      'https://example.com/contact',
    )
    expect(prefixPathWithSite('mailto:hello@example.com', 'wingscare', 'en')).toBe(
      'mailto:hello@example.com',
    )
    expect(prefixPathWithSite('#pricing', 'wingscare', 'en')).toBe('#pricing')
  })

  it('keeps the current page path when switching public locales', () => {
    expect(buildLocaleSwitchHref('/wingsside/en/destinations/ha-noi', 'es')).toBe(
      '/wingsside/es/destinations/ha-noi',
    )
    expect(buildLocaleSwitchHref('/wingsside/en/search?q=hanoi#results', 'it')).toBe(
      '/wingsside/it/search?q=hanoi#results',
    )
    expect(buildLocaleSwitchHref('/wingsside/destinations/ha-noi', 'pt')).toBe(
      '/wingsside/pt/destinations/ha-noi',
    )
    expect(buildLocaleSwitchHref('/en/search', 'it')).toBe('/it/search')
    expect(buildLocaleSwitchHref('/', 'vi')).toBe('/vi')
  })
})
