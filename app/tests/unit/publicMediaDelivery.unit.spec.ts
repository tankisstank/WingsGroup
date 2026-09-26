import { describe, expect, it } from 'vitest'

import {
  isSafePublicMediaFilename,
  isWingsGroupPublicHost,
  normalizePublicMediaHost,
  publicMediaContentType,
} from '@/utilities/publicMediaDelivery'

describe('public media delivery boundary', () => {
  it('accepts only flat safe filenames', () => {
    expect(isSafePublicMediaFilename('hero-1440.avif')).toBe(true)
    expect(isSafePublicMediaFilename('hero.jpg')).toBe(true)
    expect(isSafePublicMediaFilename('../hero.jpg')).toBe(false)
    expect(isSafePublicMediaFilename('nested/hero.jpg')).toBe(false)
    expect(isSafePublicMediaFilename('')).toBe(false)
  })

  it('allows only the configured WingsGroup public host', () => {
    expect(normalizePublicMediaHost('WingsGroup.vn:443')).toBe('wingsgroup.vn')
    expect(isWingsGroupPublicHost('wingsgroup.vn', 'wingsgroup.vn')).toBe(true)
    expect(isWingsGroupPublicHost('www.wingsgroup.vn', 'wingsgroup.vn')).toBe(true)
    expect(isWingsGroupPublicHost('wingsgo.vn', 'wingsgroup.vn')).toBe(false)
  })

  it('returns stable content types for served image formats', () => {
    expect(publicMediaContentType('hero-640.avif')).toBe('image/avif')
    expect(publicMediaContentType('hero-640.webp')).toBe('image/webp')
    expect(publicMediaContentType('hero.jpg')).toBe('image/jpeg')
    expect(publicMediaContentType('hero.unknown')).toBe('application/octet-stream')
  })
})
