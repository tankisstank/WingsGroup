import type { SiteSetting } from '@/payload-types'

import { getSiteThemeTokens } from '@/utilities/siteTheme'
import { describe, expect, it } from 'vitest'

describe('site theme tokens', () => {
  it('falls back to WingsTravel defaults when no site settings exist', () => {
    expect(getSiteThemeTokens()).toEqual({
      accentColor: '#F59E0B',
      brandColor: '#0F172A',
      style: {
        '--site-accent': '#F59E0B',
        '--site-brand': '#0F172A',
      },
      themeName: 'WingsTravel',
    })
  })

  it('uses site-specific brand and accent colors from site settings', () => {
    const settings = {
      siteName: 'WingsGo',
      branding: {
        brandColor: '#1D4ED8',
        accentColor: '#F97316',
      },
    } as SiteSetting

    expect(getSiteThemeTokens(settings)).toEqual({
      accentColor: '#F97316',
      brandColor: '#1D4ED8',
      style: {
        '--site-accent': '#F97316',
        '--site-brand': '#1D4ED8',
      },
      themeName: 'WingsGo',
    })
  })
})
