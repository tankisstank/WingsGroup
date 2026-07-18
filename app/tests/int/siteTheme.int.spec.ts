import { getSiteThemeTokens } from '@/utilities/siteTheme'
import { wingsSideInboundThemePresetKey } from '@/utilities/themeSeed'
import { defaultThemePresetByKey, type ThemePresetTokens } from '@/utilities/themeTokens'
import { describe, expect, it } from 'vitest'

describe('site theme tokens', () => {
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

    expect(getSiteThemeTokens(settings)).toEqual({
      accentColor: '#C09030',
      brandColor: '#104030',
      buttonStyle: 'pill',
      layoutStyle: 'editorial',
      style: {
        '--section-space': 'clamp(4.5rem, 9vw, 8rem)',
        '--section-space-sm': 'clamp(2.5rem, 5vw, 4.5rem)',
        '--site-accent': '#C09030',
        '--site-background': '#F8F5EE',
        '--site-background-style': 'editorial',
        '--site-border': '#D8D2C4',
        '--site-brand': '#104030',
        '--site-brand-contrast': '#ffffff',
        '--site-button-style': 'pill',
        '--site-font-body': 'var(--font-editorial-body), var(--font-geist-sans)',
        '--site-font-heading': 'var(--font-editorial-heading), Georgia, serif',
        '--site-foreground': '#162523',
        '--site-gold': '#C9A75C',
        '--site-layout': 'editorial',
        '--site-muted': '#5D6B67',
        '--site-promo-ink': '#0A0A0A',
        '--site-promo-red': '#D62D2D',
        '--site-radius': '1.25rem',
        '--site-shadow': '0 24px 80px color-mix(in oklch, #104030 16%, transparent)',
        '--site-surface': '#FFFDF8',
        '--site-surface-strong': '#EFE8DA',
        '--site-theme-key': 'wings-side',
        '--site-theme-preset': 'wings-side-editorial',
        '--site-wine': '#7F1D3B',
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
      accentColor: '#C9A75C',
      brandColor: '#0F3D3E',
      buttonStyle: 'pill',
      layoutStyle: 'editorial',
      style: {
        '--section-space': 'clamp(4.5rem, 9vw, 8rem)',
        '--section-space-sm': 'clamp(2.5rem, 5vw, 4.5rem)',
        '--site-accent': '#C9A75C',
        '--site-background-style': 'editorial',
        '--site-border': '#D8D2C4',
        '--site-brand': '#0F3D3E',
        '--site-font-body': 'var(--font-editorial-body), var(--font-geist-sans)',
        '--site-font-heading': 'var(--font-editorial-heading), Georgia, serif',
        '--site-radius': '1.25rem',
        '--site-surface': '#FFFDF8',
        '--site-surface-strong': '#EFE8DA',
        '--site-theme-preset': wingsSideInboundThemePresetKey,
      },
      themeKey: 'wings-side',
      themeName: 'WingsSide',
      themePreset: wingsSideInboundThemePresetKey,
    })
  })
})
