import { describe, expect, it } from 'vitest'

import { domainCandidates, normalizeHost, requestHostCandidates } from '@/utilities/siteDomains'

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

  it('prefers the forwarded public host while retaining host fallbacks', () => {
    const headers = new Headers({
      host: 'app:3000',
      'x-forwarded-host': 'wingside.vn',
    })

    expect(requestHostCandidates(headers)).toEqual(
      expect.arrayContaining(['wingside.vn', 'www.wingside.vn', 'app', 'www.app']),
    )
  })
})
