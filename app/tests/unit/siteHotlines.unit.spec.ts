import { describe, expect, it } from 'vitest'

import type { SiteSetting } from '@/payload-types'
import {
  formatHotlineDisplay,
  resolveSiteHotlines,
  WINGSGO_DEFAULT_HOTLINES,
} from '@/utilities/siteHotlines'

const siteSettings = (values: Record<string, unknown>) => values as unknown as SiteSetting
const phoneNumbers = (values: ReturnType<typeof resolveSiteHotlines>) =>
  values.map((hotline) => hotline.normalized)

describe('US-081 site hotline resolution', () => {
  it('provides the three WingsGo numbers when settings are unavailable', () => {
    const hotlines = resolveSiteHotlines(null, 'wings-go')

    expect(phoneNumbers(hotlines)).toEqual([
      '0912910101',
      '0915250101',
      '0915260101',
    ])
    expect(phoneNumbers(hotlines)).toEqual(WINGSGO_DEFAULT_HOTLINES)
    expect(hotlines.map((hotline) => hotline.href)).toEqual([
      'tel:0912910101',
      'tel:0915250101',
      'tel:0915260101',
    ])
  })

  it('supports legacy settings without the additionalHotlines field', () => {
    const hotlines = resolveSiteHotlines(
      siteSettings({ supportPhone: '0912 910 101' }),
      'wings-go',
    )

    expect(phoneNumbers(hotlines)).toEqual(WINGSGO_DEFAULT_HOTLINES)
  })

  it.each([[], null])('respects an explicitly empty supplementary list: %j', (additionalHotlines) => {
    const hotlines = resolveSiteHotlines(
      siteSettings({ additionalHotlines, supportPhone: '0912910101' }),
      'wings-go',
    )

    expect(phoneNumbers(hotlines)).toEqual(['0912910101'])
  })

  it('keeps the configured main number before legacy WingsGo supplementary defaults', () => {
    const hotlines = resolveSiteHotlines(
      siteSettings({ supportPhone: '0919000000' }),
      'wings-go',
    )

    expect(phoneNumbers(hotlines)).toEqual(['0919000000', '0915250101', '0915260101'])
  })

  it('deduplicates equivalent Vietnamese numbers and preserves CMS order and labels', () => {
    const hotlines = resolveSiteHotlines(
      siteSettings({
        additionalHotlines: [
          { phoneNumber: '+84 912 910 101' },
          { label: 'Tư vấn tour 3', phoneNumber: '0915.260.101' },
          { label: 'Tư vấn tour 2', phoneNumber: '(+84) 915 250 101' },
          { phoneNumber: '0915-260-101' },
        ],
        supportPhone: '0912 910 101',
      }),
      'wings-go',
    )

    expect(phoneNumbers(hotlines)).toEqual(['0912910101', '0915260101', '0915250101'])
    expect(hotlines[1].label).toBe('Tư vấn tour 3')
    expect(hotlines[2].href).toBe('tel:0915250101')
  })

  it('does not reintroduce defaults after an editor deletes one of the extra numbers', () => {
    const hotlines = resolveSiteHotlines(
      siteSettings({
        additionalHotlines: [{ phoneNumber: '0915260101' }],
        supportPhone: '0912910101',
      }),
      'wings-go',
    )

    expect(phoneNumbers(hotlines)).toEqual(['0912910101', '0915260101'])
  })

  it('rejects malformed phone values without turning their digits into call links', () => {
    const hotlines = resolveSiteHotlines(
      siteSettings({
        additionalHotlines: [
          { phoneNumber: 'javascript:0915250101' },
          { phoneNumber: 'call 0915250101' },
          { phoneNumber: '0912+910101' },
          { phoneNumber: '0912' },
          { phoneNumber: '0915260101' },
        ],
        supportPhone: '0912910101',
      }),
      'wings-go',
    )

    expect(phoneNumbers(hotlines)).toEqual(['0912910101', '0915260101'])
  })

  it('uses the WingsGo main fallback for invalid legacy values', () => {
    const hotlines = resolveSiteHotlines(
      siteSettings({ additionalHotlines: [], supportPhone: 'invalid' }),
      'wings-go',
    )

    expect(phoneNumbers(hotlines)).toEqual(['0912910101'])
  })

  it('does not leak WingsGo defaults into another tenant or an unspecified tenant', () => {
    expect(resolveSiteHotlines(null, 'wing-side')).toEqual([])
    expect(resolveSiteHotlines(null, 'wings-group')).toEqual([])
    expect(resolveSiteHotlines(null)).toEqual([])

    const hotlines = resolveSiteHotlines(
      siteSettings({ additionalHotlines: [], supportPhone: '+33 1 23 45 67 89' }),
      'wing-side',
    )

    expect(phoneNumbers(hotlines)).toEqual(['+33123456789'])
    expect(hotlines[0].href).toBe('tel:+33123456789')
  })

  it('renders valid international numbers accepted by CMS on WingsGo', () => {
    const hotlines = resolveSiteHotlines(
      siteSettings({
        additionalHotlines: [{ label: 'International support', phoneNumber: '+33 1 23 45 67 89' }],
        supportPhone: '0912910101',
      }),
      'wings-go',
    )

    expect(phoneNumbers(hotlines)).toEqual(['0912910101', '+33123456789'])
    expect(hotlines[1].href).toBe('tel:+33123456789')
  })

  it('formats Vietnamese numbers without losing their initial zero', () => {
    expect(formatHotlineDisplay('0912910101')).toBe('0912 910 101')
    expect(formatHotlineDisplay('0915250101')).toBe('0915 250 101')
    expect(formatHotlineDisplay('0915260101')).toBe('0915 260 101')
  })
})
