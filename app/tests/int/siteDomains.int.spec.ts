import { describe, expect, it } from 'vitest'

import {
  createTrustedSiteContextHeaders,
  domainCandidates,
  internalSiteContextHeaderNames,
  normalizeHost,
  requestHostCandidates,
} from '@/utilities/siteDomains'

describe('site domain utilities', () => {
  it('normalizes direct and forwarded hosts', () => {
    expect(normalizeHost('WingSide.vn:443')).toBe('wingside.vn')
    expect(normalizeHost('https://www.wingside.vn/path')).toBe('www.wingside.vn')
    expect(normalizeHost('wingside.vn, internal:3000')).toBe('wingside.vn')
  })

  it('maps local seed domains to production domain variants', () => {
    expect(domainCandidates('wingsside.local')).toEqual(
      expect.arrayContaining([
        'wingsside.local',
        'www.wingsside.local',
        'wingside.vn',
        'www.wingside.vn',
      ]),
    )
    expect(domainCandidates('wingspass.local')).toEqual(
      expect.arrayContaining(['wingspass.local', 'wingspass.wingsgroup.vn']),
    )
    expect(domainCandidates('wingscare.local')).toEqual(
      expect.arrayContaining(['wingscare.local', 'wingscare.wingsgroup.vn']),
    )
  })

  it('ignores an untrusted forwarded host', () => {
    const headers = new Headers({
      host: 'app:3000',
      'x-forwarded-host': 'wingside.vn',
    })

    expect(requestHostCandidates(headers)).toEqual(expect.arrayContaining(['app', 'www.app']))
    expect(requestHostCandidates(headers)).not.toContain('wingside.vn')
  })

  it('accepts the host normalized by trusted frontend proxy context', () => {
    const headers = new Headers({
      host: 'app:3000',
      'x-forwarded-host': 'attacker.example',
      'x-site-context-source': 'proxy',
      'x-site-host': 'wingside.vn',
    })

    expect(requestHostCandidates(headers)).toEqual(
      expect.arrayContaining(['wingside.vn', 'www.wingside.vn', 'app', 'www.app']),
    )
    expect(requestHostCandidates(headers)).not.toContain('attacker.example')
  })

  it('strips spoofed tenant headers before creating trusted proxy context', () => {
    const incoming = new Headers({
      'x-locale': 'vi',
      'x-public-path': '/spoofed',
      'x-site-code': 'wings-care',
      'x-site-context-source': 'proxy',
      'x-site-host': 'wingscare.wingsgroup.vn',
      'x-site-prefix': '/wingscare',
    })

    const trusted = createTrustedSiteContextHeaders(incoming, {
      host: 'wingsgo.vn',
      locale: 'en',
      publicPath: '/wingsgo/en/tours',
      siteCode: 'wings-go',
      sitePrefix: '/wingsgo/en',
    })

    expect(trusted.get('x-site-context-source')).toBe('proxy')
    expect(trusted.get('x-site-host')).toBe('wingsgo.vn')
    expect(trusted.get('x-site-code')).toBe('wings-go')
    expect(trusted.get('x-site-prefix')).toBe('/wingsgo/en')
    expect(trusted.get('x-locale')).toBe('en')
    expect(trusted.get('x-public-path')).toBe('/wingsgo/en/tours')
    expect(internalSiteContextHeaderNames).toContain('x-site-code')
  })

  it('does not preserve optional spoofed values when the trusted context omits them', () => {
    const trusted = createTrustedSiteContextHeaders(
      new Headers({ 'x-site-code': 'wings-care', 'x-site-prefix': '/wingscare' }),
      {
        host: 'localhost',
        publicPath: '/',
      },
    )

    expect(trusted.get('x-site-code')).toBeNull()
    expect(trusted.get('x-site-prefix')).toBeNull()
  })
})
