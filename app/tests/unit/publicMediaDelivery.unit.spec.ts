import { readFileSync } from 'node:fs'
import path from 'node:path'

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
    expect(isSafePublicMediaFilename('红叶季🍁富士山下🗻Live｜定格📸.jpg')).toBe(true)
    expect(isSafePublicMediaFilename('../hero.jpg')).toBe(false)
    expect(isSafePublicMediaFilename('nested/hero.jpg')).toBe(false)
    expect(isSafePublicMediaFilename('hero\u0001.jpg')).toBe(false)
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

  it('looks up ordinary media and generated derivative filenames while retaining the WingsGroup gate', () => {
    const route = readFileSync(
      path.resolve(process.cwd(), 'src/app/(payload)/api/public-media/[filename]/route.ts'),
      'utf8',
    )
    expect(route).toContain("site.code === 'wings-group'")
    expect(route).toContain('governance.publicationState')
    expect(route).toContain('sizes.${name}.filename')
  })
})
