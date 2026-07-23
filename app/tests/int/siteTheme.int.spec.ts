import { getSiteThemeTokens } from '@/utilities/siteTheme'
import { wingsSideInboundThemePresetKey } from '@/utilities/themeSeed'
import { defaultThemePresetByKey, type ThemePresetTokens } from '@/utilities/themeTokens'
import { describe, expect, it } from 'vitest'

describe('site theme tokens', () => {
  it('exposes the full WingSide hi-fi semantic token bridge used by the 8-page product CSS', () => {
    const style = getSiteThemeTokens(
      { branding: { themeKey: 'wings-side' }, siteName: 'WingsSide' },
      { siteCode: 'wing-side' },
    ).style as Record<string, string>

    for (const key of [
      '--site-background',
      '--site-surface',
      '--site-foreground',
      '--site-muted',
      '--site-border',
      '--site-gold',
      '--site-cta',
      '--site-cta-fg',
      '--site-wine',
      '--site-brand-soft',
      '--site-max',
      '--site-nav-h',
      '--site-promo-ink',
      '--site-promo-red',
    ]) {
      expect(style[key]).toBeTruthy()
    }

    // Gold/brown is for CTA moments; spacing is tightened to hi-fi section cadence.
    expect(style['--site-cta']).toBe(style['--site-gold'])
    expect(style['--section-space']).toContain('1.65rem')
  })

  it('bridges WingSide semantic tokens by site identity even when its CMS theme is custom', () => {
    const customThemeSettings = {
      branding: {
        accentColor: '#AA8844',
        brandColor: '#123F3E',
        themeKey: 'custom',
      },
      siteName: 'WingSide custom theme',
    }

    const wingsside = getSiteThemeTokens(customThemeSettings, { siteCode: 'wing-side' })
    expect(wingsside.brandColor).toBe('#005090')
    expect(wingsside.accentColor).toBe('#104030')
    expect(wingsside.style).toMatchObject({
      '--section-space': 'clamp(1.65rem, 3.8vw, 2.75rem)',
      '--section-space-sm': 'clamp(1.1rem, 2.8vw, 1.75rem)',
      '--site-accent': '#104030',
      '--site-background': '#F3F6F9',
      '--site-border': '#E2E6ED',
      '--site-brand': '#005090',
      '--site-brand-soft': '#E8F1F8',
      '--site-cta': '#B87A14',
      '--site-cta-fg': '#FFFFFF',
      '--site-foreground': '#1B2430',
      '--site-gold': '#B87A14',
      '--site-max': '70rem',
      '--site-muted': '#667085',
      '--site-nav-h': '72px',
      '--site-promo-ink': '#0A0A0A',
      '--site-promo-red': '#D62D2D',
      '--site-radius': '1.25rem',
      '--site-radius-sm': '0.75rem',
      '--site-surface': '#FFFFFF',
      '--site-surface-strong': '#EEF2F6',
      '--site-wine': '#8B2E28',
    })

    expect(
      getSiteThemeTokens(customThemeSettings, { siteCode: 'wings-plus' }).style,
    ).not.toHaveProperty('--site-promo-red')
  })

  it('falls back to WingsGroup defaults when no site settings exist', () => {
    expect(getSiteThemeTokens()).toEqual({
      accentColor: '#F59E0B',
      brandColor: '#0F172A',
      buttonStyle: 'solid',
      layoutStyle: 'corporate',
      style: {
        '--section-space': 'clamp(4rem, 8vw, 7rem)',
        '--section-space-sm': 'clamp(2rem, 5vw, 4rem)',
        '--site-accent': '#F59E0B',
        '--site-background-style': 'soft-gradient',
        '--site-border': 'color-mix(in oklch, #F59E0B 24%, var(--border))',
        '--site-brand': '#0F172A',
        '--site-brand-contrast': '#ffffff',
        '--site-button-style': 'solid',
        '--site-font-body': 'var(--font-geist-sans)',
        '--site-font-heading': 'var(--font-geist-sans)',
        '--site-layout': 'corporate',
        '--site-radius': '1.25rem',
        '--site-shadow': '0 24px 80px color-mix(in oklch, #0F172A 16%, transparent)',
        '--site-surface': '#F8FAFC',
        '--site-surface-strong': '#E2E8F0',
        '--site-theme-key': 'wings-group',
        '--site-theme-preset': 'corporate',
      },
      themeKey: 'wings-group',
      themeName: 'WingsGroup',
      themePreset: 'corporate',
    })
  })

  it('uses site-specific brand and accent colors from site settings and preset defaults', () => {
    const settings = {
      branding: {
        themeKey: 'wings-go',
        themePreset: { key: 'retail', tokens: defaultThemePresetByKey.retail },
        brandColor: '#1D4ED8',
        accentColor: '#F97316',
      },
      siteName: 'WingsGo',
    }

    expect(getSiteThemeTokens(settings)).toEqual({
      accentColor: '#F97316',
      brandColor: '#1D4ED8',
      buttonStyle: 'solid',
      layoutStyle: 'retail',
      style: {
        '--section-space': 'clamp(2.75rem, 5vw, 4.25rem)',
        '--section-space-sm': 'clamp(1.5rem, 3.5vw, 2.75rem)',
        '--site-accent': '#F97316',
        '--site-background-style': 'soft-gradient',
        '--site-border': 'color-mix(in oklch, #F97316 24%, var(--border))',
        '--site-brand': '#1D4ED8',
        '--site-brand-contrast': '#ffffff',
        '--site-button-style': 'solid',
        '--site-font-body': 'var(--font-retail-body), var(--font-geist-sans)',
        '--site-font-heading': 'var(--font-retail-heading), var(--font-geist-sans)',
        '--site-layout': 'retail',
        '--site-radius': '0.875rem',
        '--site-shadow': '0 24px 80px color-mix(in oklch, #1D4ED8 16%, transparent)',
        '--site-surface': '#F0F9FF',
        '--site-surface-strong': '#DFF6FF',
        '--site-theme-key': 'wings-go',
        '--site-theme-preset': 'retail',
      },
      themeKey: 'wings-go',
      themeName: 'WingsGo',
      themePreset: 'retail',
    })
  })

  it('supports custom preset records while keeping the original premium preset available for rollback', () => {
    const editorialTokens: ThemePresetTokens = {
      ...defaultThemePresetByKey.premium,
      accentColor: '#C09030',
      brandColor: '#104030',
      buttonStyle: 'pill',
      fontPreset: 'editorial',
      radius: 'lg',
      surfaceColor: '#F6F2E8',
      surfaceStrongColor: '#E8DECB',
    }

    const settings = {
      branding: {
        themeKey: 'wings-side',
        themePreset: {
          key: 'wings-side-editorial',
          tokens: editorialTokens,
        },
      },
      siteName: 'WingsSide',
    }

    // Hi-fi token bridge wins for brand/surface/CTA even when CMS preset is editorial teal.
    expect(getSiteThemeTokens(settings)).toMatchObject({
      accentColor: '#104030',
      brandColor: '#005090',
      buttonStyle: 'pill',
      layoutStyle: 'editorial',
      style: {
        '--section-space': 'clamp(1.65rem, 3.8vw, 2.75rem)',
        '--section-space-sm': 'clamp(1.1rem, 2.8vw, 1.75rem)',
        '--site-accent': '#104030',
        '--site-background': '#F3F6F9',
        '--site-background-style': 'editorial',
        '--site-border': '#E2E6ED',
        '--site-brand': '#005090',
        '--site-brand-contrast': '#ffffff',
        '--site-brand-soft': '#E8F1F8',
        '--site-button-style': 'pill',
        '--site-cta': '#B87A14',
        '--site-cta-fg': '#FFFFFF',
        '--site-font-body': 'var(--font-editorial-body), var(--font-geist-sans)',
        '--site-font-heading': 'var(--font-editorial-heading), Georgia, serif',
        '--site-foreground': '#1B2430',
        '--site-gold': '#B87A14',
        '--site-layout': 'editorial',
        '--site-max': '70rem',
        '--site-muted': '#667085',
        '--site-nav-h': '72px',
        '--site-promo-ink': '#0A0A0A',
        '--site-promo-red': '#D62D2D',
        '--site-radius': '1.25rem',
        '--site-radius-sm': '0.75rem',
        '--site-surface': '#FFFFFF',
        '--site-surface-strong': '#EEF2F6',
        '--site-theme-key': 'wings-side',
        '--site-theme-preset': 'wings-side-editorial',
        '--site-wine': '#8B2E28',
      },
      themeKey: 'wings-side',
      themeName: 'WingsSide',
      themePreset: 'wings-side-editorial',
    })
  })

  it('resolves the WingsSide inbound v2 editorial launch palette', () => {
    const inboundTokens: ThemePresetTokens = {
      ...defaultThemePresetByKey.premium,
      accentColor: '#C9A75C',
      backgroundStyle: 'editorial',
      brandColor: '#0F3D3E',
      buttonStyle: 'pill',
      fontPreset: 'editorial',
      layoutStyle: 'editorial',
      radius: 'lg',
      spacingScale: 'airy',
      surfaceColor: '#F8F5EE',
      surfaceStrongColor: '#E9E1D0',
    }

    const settings = {
      branding: {
        themeKey: 'wings-side',
        themePreset: {
          key: wingsSideInboundThemePresetKey,
          tokens: inboundTokens,
        },
      },
      siteName: 'WingsSide',
    }

    expect(getSiteThemeTokens(settings)).toMatchObject({
      accentColor: '#104030',
      brandColor: '#005090',
      buttonStyle: 'pill',
      layoutStyle: 'editorial',
      style: {
        '--section-space': 'clamp(1.65rem, 3.8vw, 2.75rem)',
        '--section-space-sm': 'clamp(1.1rem, 2.8vw, 1.75rem)',
        '--site-accent': '#104030',
        '--site-background': '#F3F6F9',
        '--site-background-style': 'editorial',
        '--site-border': '#E2E6ED',
        '--site-brand': '#005090',
        '--site-cta': '#B87A14',
        '--site-cta-fg': '#FFFFFF',
        '--site-font-body': 'var(--font-editorial-body), var(--font-geist-sans)',
        '--site-font-heading': 'var(--font-editorial-heading), Georgia, serif',
        '--site-gold': '#B87A14',
        '--site-max': '70rem',
        '--site-nav-h': '72px',
        '--site-radius': '1.25rem',
        '--site-surface': '#FFFFFF',
        '--site-surface-strong': '#EEF2F6',
        '--site-theme-preset': wingsSideInboundThemePresetKey,
      },
      themeKey: 'wings-side',
      themeName: 'WingsSide',
      themePreset: wingsSideInboundThemePresetKey,
    })
  })
})
