import { describe, expect, it } from 'vitest'

import { domainCandidates, normalizeHost, requestHostCandidates } from '@/utilities/siteDomains'

describe('site domain utilities', () => {
  it('normalizes direct and forwarded hosts', () => {
    expect(normalizeHost('WingsSide.vn:443')).toBe('wingsside.vn')
    expect(normalizeHost('https://www.wingsside.vn/path')).toBe('www.wingsside.vn')
    expect(normalizeHost('wingsside.vn, internal:3000')).toBe('wingsside.vn')
  })

  it('maps local seed domains to production domain variants', () => {
    expect(domainCandidates('wingsside.local')).toEqual(
      expect.arrayContaining([
        'wingsside.local',
        'www.wingsside.local',
        'wingsside.vn',
        'www.wingsside.vn',
      ]),
    )
  })

  it('prefers the forwarded public host while retaining host fallbacks', () => {
    const headers = new Headers({
      host: 'app:3000',
      'x-forwarded-host': 'wingsside.vn',
    })

    expect(requestHostCandidates(headers)).toEqual(
      expect.arrayContaining(['wingsside.vn', 'www.wingsside.vn', 'app', 'www.app']),
    )
  })
})
