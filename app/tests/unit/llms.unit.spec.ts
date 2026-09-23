import { describe, expect, it } from 'vitest'

import { buildLlmsText } from '@/utilities/llms'

describe('llms text', () => {
  it('uses the approved WingsGroup legal identity only on the WingsGroup host', () => {
    const text = buildLlmsText({
      origin: 'https://wingsgroup.vn',
      settings: {
        siteName: 'WingsGroup',
        supportEmail: 'info@wingsgroup.vn',
        supportPhone: '0912 910 101',
      },
      site: { code: 'wings-group', defaultLocale: 'vi', supportedLocales: ['vi', 'en'] },
    })

    expect(text).toContain('01-2336/2023/TCDL-GP LHQT')
    expect(text).toContain('WingsPass')
    expect(text).toContain('info@wingsgroup.vn')
  })

  it('keeps child-site content and contact details isolated by host', () => {
    const text = buildLlmsText({
      full: true,
      origin: 'https://wingside.vn',
      settings: {
        siteName: 'WingSide',
        supportEmail: 'hello@wingside.vn',
        tagline: 'Tailor-made Vietnam journeys.',
      },
      site: {
        code: 'wing-side',
        defaultLocale: 'en',
        supportedLocales: ['en', 'vi', 'it', 'es', 'pt'],
      },
    })

    expect(text).toContain('# WingSide')
    expect(text).toContain('https://wingside.vn/contact-us')
    expect(text).toContain('hello@wingside.vn')
    expect(text).not.toContain('01-2336/2023/TCDL-GP LHQT')
    expect(text).not.toContain('WingsPass')
  })
})
