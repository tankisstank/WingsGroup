import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  isSafePublicMediaFilename,
  isWingsGroupPublicHost,
  normalizePublicMediaHost,
  publicMediaContentType,
} from '@/utilities/publicMediaDelivery'
import {
  hasValidTrustedSiteContext,
  requestHostCandidates,
} from '@/utilities/siteDomains'

describe('public media delivery boundary', () => {
  it('accepts only flat safe filenames', () => {
    expect(isSafePublicMediaFilename('hero-1440.avif')).toBe(true)
    expect(isSafePublicMediaFilename('hero.jpg')).toBe(true)
    expect(isSafePublicMediaFilename('红叶季🍁富士山下🗻Live｜定格📸.jpg')).toBe(true)
    expect(isSafePublicMediaFilename('서울-남산-에버랜드.jpg')).toBe(true)
    expect(isSafePublicMediaFilename('東京・富士山・秋景色.webp')).toBe(true)
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

  it('looks up ordinary media and generated derivative filenames while retaining governance validation', () => {
    const route = readFileSync(
      path.resolve(process.cwd(), 'src/app/(payload)/api/public-media/[filename]/route.ts'),
      'utf8',
    )
    expect(route).not.toContain("request.headers.get('x-forwarded-host')")
    expect(route).toContain('hasValidTrustedSiteContext(request.headers)')
    expect(route).toContain("governance.managedBy === 'wingsgroup-v3'")
    expect(route).toContain('validateWingsGroupV3PublicMedia(')
    expect(route).toContain('sizes.${name}.filename')
  })

  it('rejects untrusted x-forwarded-host spoofing when host belongs to another tenant', () => {
    const headers = new Headers()
    headers.set('host', 'wingsgo.vn')
    headers.set('x-forwarded-host', 'wingsgroup.vn')

    // requestHostCandidates should strictly prioritize trusted host/x-site-host and ignore x-forwarded-host
    const candidates = requestHostCandidates(headers)
    expect(candidates).toContain('wingsgo.vn')
    expect(candidates).not.toContain('wingsgroup.vn')
  })

  it('verifies that untrusted caller cannot spoof tenant via direct x-site-code header', async () => {
    const headers = new Headers()
    headers.set('x-site-code', 'wings-group') // Attacker tries to pretend to be WingsGroup
    // Without proxy signature HMAC, hasValidTrustedSiteContext must reject
    const isValid = await hasValidTrustedSiteContext(headers)
    expect(isValid).toBe(false)
  })
})
