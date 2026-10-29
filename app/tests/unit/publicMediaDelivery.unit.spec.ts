import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  isSafePublicMediaFilename,
  isWingsGroupPublicHost,
  normalizePublicMediaHost,
  parseSingleByteRange,
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
    expect(isSafePublicMediaFilename('video.mp4')).toBe(true)
    expect(isSafePublicMediaFilename('video.webm')).toBe(true)
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

  it('returns stable content types for served image and video formats', () => {
    expect(publicMediaContentType('hero-640.avif')).toBe('image/avif')
    expect(publicMediaContentType('hero-640.webp')).toBe('image/webp')
    expect(publicMediaContentType('hero.jpg')).toBe('image/jpeg')
    expect(publicMediaContentType('hero.jpeg')).toBe('image/jpeg')
    expect(publicMediaContentType('hero.png')).toBe('image/png')
    expect(publicMediaContentType('vector.svg')).toBe('image/svg+xml')
    expect(publicMediaContentType('animation.gif')).toBe('image/gif')
    expect(publicMediaContentType('background.mp4')).toBe('video/mp4')
    expect(publicMediaContentType('clip.webm')).toBe('video/webm')
    expect(publicMediaContentType('hero.unknown')).toBe('application/octet-stream')
  })

  describe('HTTP single byte range parsing (RFC 9110)', () => {
    const fileSize = 1000

    it('parses standard closed range', () => {
      const result = parseSingleByteRange('bytes=0-499', fileSize)
      expect(result).toEqual({
        type: 'range',
        range: { start: 0, end: 499 },
      })
    })

    it('clamps closed range end to fileSize - 1 when end exceeds fileSize', () => {
      const result = parseSingleByteRange('bytes=500-2000', fileSize)
      expect(result).toEqual({
        type: 'range',
        range: { start: 500, end: 999 },
      })
    })

    it('parses open range to the end of the file', () => {
      const result = parseSingleByteRange('bytes=500-', fileSize)
      expect(result).toEqual({
        type: 'range',
        range: { start: 500, end: 999 },
      })
    })

    it('parses suffix range for the last N bytes', () => {
      const result = parseSingleByteRange('bytes=-200', fileSize)
      expect(result).toEqual({
        type: 'range',
        range: { start: 800, end: 999 },
      })
    })

    it('handles suffix range larger than file by returning whole file range', () => {
      const result = parseSingleByteRange('bytes=-2000', fileSize)
      expect(result).toEqual({
        type: 'range',
        range: { start: 0, end: 999 },
      })
    })

    it('rejects unsatisfiable range where start exceeds file size', () => {
      const result = parseSingleByteRange('bytes=1000-1500', fileSize)
      expect(result).toEqual({ type: 'unsatisfiable' })
    })

    it('rejects unsatisfiable range where start is greater than end', () => {
      const result = parseSingleByteRange('bytes=500-200', fileSize)
      expect(result).toEqual({ type: 'unsatisfiable' })
    })

    it('rejects any range when file size is 0', () => {
      expect(parseSingleByteRange('bytes=0-0', 0)).toEqual({ type: 'unsatisfiable' })
      expect(parseSingleByteRange('bytes=0-', 0)).toEqual({ type: 'unsatisfiable' })
      expect(parseSingleByteRange('bytes=-10', 0)).toEqual({ type: 'unsatisfiable' })
    })

    it('ignores invalid range headers and falls back to full content', () => {
      expect(parseSingleByteRange(null, fileSize)).toEqual({ type: 'ignore' })
      expect(parseSingleByteRange('', fileSize)).toEqual({ type: 'ignore' })
      expect(parseSingleByteRange('items=0-10', fileSize)).toEqual({ type: 'ignore' })
      expect(parseSingleByteRange('bytes=abc-def', fileSize)).toEqual({ type: 'ignore' })
      expect(parseSingleByteRange('bytes=---', fileSize)).toEqual({ type: 'ignore' })
    })

    it('ignores multipart range headers to serve full file per RFC 9110', () => {
      const result = parseSingleByteRange('bytes=0-100, 200-300', fileSize)
      expect(result).toEqual({ type: 'ignore' })
    })
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
    expect(route).toContain('parseSingleByteRange(rangeHeader, fileStats.size)')
    expect(route).toContain("status: 206")
    expect(route).toContain("status: 416")
    expect(route).toContain("'Content-Range': `bytes */${fileStats.size}`")
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
