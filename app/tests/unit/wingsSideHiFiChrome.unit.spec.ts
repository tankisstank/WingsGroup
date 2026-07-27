import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { getWingsSideHiFiCta, getWingsSideHiFiNavItems } from '@/utilities/wingsSideHiFiNav'
import { wingsSideHiFiTokens } from '@/utilities/siteTheme'
import { WINGSSIDE_HIFI_COMPOSER_ROUTES } from '@/utilities/wingsSideHiFiComposer'

describe('WingSide hi-fi chrome foundation contracts', () => {
  it('locks 72px nav height and gold CTA tokens', () => {
    expect(wingsSideHiFiTokens.navHeight).toBe('72px')
    expect(wingsSideHiFiTokens.gold).toBe('#B87A14')
    expect(wingsSideHiFiTokens.brand).toBe('#005090')
  })

  it('owns only wing-side hub routes (not WingsGo)', () => {
    expect(WINGSSIDE_HIFI_COMPOSER_ROUTES).not.toContain('/tour/')
    for (const locale of ['en', 'vi', 'it', 'es', 'pt'] as const) {
      const nav = getWingsSideHiFiNavItems(locale)
      expect(nav).toHaveLength(8)
      expect(nav.map((item) => item.href)).toEqual([
        '/',
        '/destinations',
        '/styles',
        '/journeys',
        '/packages',
        '/travel-guide',
        '/about-us',
        '/contact-us',
      ])
      const cta = getWingsSideHiFiCta(locale)
      expect(cta.url).toBe('/plan-your-trip')
      expect(cta.label.length).toBeGreaterThan(0)
    }
  })

  it('does not leak Search into WingSide primary nav', () => {
    for (const locale of ['en', 'vi', 'it', 'es', 'pt'] as const) {
      const labels = getWingsSideHiFiNavItems(locale).map((item) => item.label.toLowerCase())
      expect(labels.some((label) => label.includes('search') || label.includes('tìm'))).toBe(false)
    }
  })

  it('scopes hifi primary-nav display:flex to desktop min-width 1280px only', () => {
    const cssPath = path.resolve(process.cwd(), 'src/app/(frontend)/globals.css')
    const css = readFileSync(cssPath, 'utf8')
    const desktopMedia = css.indexOf('@media (min-width: 1280px)')
    expect(desktopMedia).toBeGreaterThan(-1)
    const ruleMarker =
      /\.site-header__nav\[data-hifi-nav='true'\]\s*>\s*nav\[aria-label='Primary navigation'\]/
    const ruleIndex = css.search(ruleMarker)
    expect(ruleIndex).toBeGreaterThan(desktopMedia)
    // No earlier unscoped copy of the same selector before the media query.
    const beforeMedia = css.slice(0, desktopMedia)
    expect(ruleMarker.test(beforeMedia)).toBe(false)
  })
})
