import { describe, expect, it } from 'vitest'

import {
  getWingsGoCatalogCopy,
  resolveWingsGoCopyLocale,
  WINGSGO_CATALOG_COPY,
} from '@/tours/wingsGoCatalogCopy'

describe('wingsGoCatalogCopy', () => {
  it('returns the VI copy when locale is undefined or null', () => {
    expect(getWingsGoCatalogCopy(undefined)).toBe(WINGSGO_CATALOG_COPY.vi)
    expect(getWingsGoCatalogCopy(null)).toBe(WINGSGO_CATALOG_COPY.vi)
    expect(getWingsGoCatalogCopy('')).toBe(WINGSGO_CATALOG_COPY.vi)
  })

  it('resolves copy locale to vi when omitted and preserves getCopyLocale for real locales', () => {
    expect(resolveWingsGoCopyLocale(undefined)).toBe('vi')
    expect(resolveWingsGoCopyLocale(null)).toBe('vi')
    expect(resolveWingsGoCopyLocale('')).toBe('vi')
    expect(resolveWingsGoCopyLocale('vi')).toBe('vi')
    expect(resolveWingsGoCopyLocale('en')).toBe('en')
  })

  it('returns the EN copy when locale is en', () => {
    expect(getWingsGoCatalogCopy('en')).toBe(WINGSGO_CATALOG_COPY.en)
    expect(getWingsGoCatalogCopy('en').contactPriceLabel).toBe('Contact us for latest pricing')
    expect(getWingsGoCatalogCopy('vi').contactPriceLabel).toBe('Liên hệ để nhận giá mới nhất')
  })
})
