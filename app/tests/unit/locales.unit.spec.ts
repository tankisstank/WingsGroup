import { describe, expect, it } from 'vitest'

import {
  adsReadyLocaleCodes,
  copyLocaleCodes,
  getCopyLocale,
  cmsEnabledLocaleCodes,
  getLocaleFallback,
  getPublicLocaleMetadataForSite,
  isCopyLocale,
  isPublicLocale,
  localeMetadataByCode,
  localeSelectOptions,
  publicLocaleCodes,
} from '@/utilities/locales'

describe('locale metadata contract', () => {
  it('enables all target locales in CMS', () => {
    expect(cmsEnabledLocaleCodes).toEqual(['vi', 'en', 'it', 'es', 'pt', 'ja', 'ko', 'fr', 'de'])
    expect(localeSelectOptions.map((locale) => locale.value)).toEqual(cmsEnabledLocaleCodes)
  })

  it('exposes only launch public locales by default', () => {
    expect(publicLocaleCodes).toEqual(['vi', 'en', 'it', 'es', 'pt'])
    expect(adsReadyLocaleCodes).toEqual(['en', 'it', 'es', 'pt'])
    expect(isPublicLocale('ja')).toBe(false)
    expect(isPublicLocale('ko')).toBe(false)
    expect(isPublicLocale('fr')).toBe(false)
    expect(isPublicLocale('de')).toBe(false)
  })

  it('scopes public locale switcher options to the current site', () => {
    expect(getPublicLocaleMetadataForSite(undefined).map((locale) => locale.code)).toEqual([])
    expect(getPublicLocaleMetadataForSite([]).map((locale) => locale.code)).toEqual([])
    expect(getPublicLocaleMetadataForSite(['vi', 'en']).map((locale) => locale.code)).toEqual([
      'vi',
      'en',
    ])
    expect(
      getPublicLocaleMetadataForSite(['en', 'vi', 'it', 'es', 'pt']).map(
        (locale) => locale.code,
      ),
    ).toEqual(['vi', 'en', 'it', 'es', 'pt'])
  })

  it('falls European and wave-two locales back to English copy', () => {
    expect(getLocaleFallback('it')).toBe('en')
    expect(getLocaleFallback('es')).toBe('en')
    expect(getLocaleFallback('pt')).toBe('en')
    expect(getLocaleFallback('ja')).toBe('en')
    expect(localeMetadataByCode.vi.fallbackLocale).toBe('vi')
  })

  it('derives copy locales from fallback metadata instead of direct locale branching', () => {
    expect(copyLocaleCodes).toEqual(['en', 'vi'])
    expect(isCopyLocale('en')).toBe(true)
    expect(isCopyLocale('vi')).toBe(true)
    expect(isCopyLocale('it')).toBe(false)
    expect(getCopyLocale('vi')).toBe('vi')
    expect(getCopyLocale('en')).toBe('en')
    expect(getCopyLocale('it')).toBe('en')
    expect(getCopyLocale('es')).toBe('en')
    expect(getCopyLocale('pt')).toBe('en')
    expect(getCopyLocale('ja')).toBe('en')
    expect(getCopyLocale('unknown')).toBe('en')
  })
})
