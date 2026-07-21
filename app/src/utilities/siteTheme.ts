import type React from 'react'

import {
  defaultThemeKey,
  defaultThemePresetByKey,
  normalizeThemeKey,
  normalizeThemePresetKey,
  resolveThemePresetTokens,
  type ThemeSettingsLike,
} from './themeTokens'

const radiusMap: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  lg: '1.25rem',
  md: '0.875rem',
  sm: '0.625rem',
  xl: '1.5rem',
}

const spacingMap: Record<'compact' | 'standard' | 'airy', { large: string; small: string }> = {
  airy: {
    large: 'clamp(4.5rem, 9vw, 8rem)',
    small: 'clamp(2.5rem, 5vw, 4.5rem)',
  },
  compact: {
    large: 'clamp(2.75rem, 5vw, 4.25rem)',
    small: 'clamp(1.5rem, 3.5vw, 2.75rem)',
  },
  standard: {
    large: 'clamp(4rem, 8vw, 7rem)',
    small: 'clamp(2rem, 5vw, 4rem)',
  },
}

const fontPresetMap: Record<string, { body: string; heading: string }> = {
  editorial: {
    body: 'var(--font-editorial-body), var(--font-geist-sans)',
    heading: 'var(--font-editorial-heading), Georgia, serif',
  },
  modern: {
    body: 'var(--font-geist-sans)',
    heading: 'var(--font-geist-sans)',
  },
  premium: {
    body: 'var(--font-editorial-body), var(--font-geist-sans)',
    heading: 'var(--font-editorial-heading), Georgia, serif',
  },
  retail: {
    body: 'var(--font-retail-body), var(--font-geist-sans)',
    heading: 'var(--font-retail-heading), var(--font-geist-sans)',
  },
  system: {
    body: 'var(--font-geist-sans)',
    heading: 'var(--font-geist-sans)',
  },
}

const getFontPresetTokens = (fontPreset?: string | null) => {
  return fontPresetMap[fontPreset || 'system'] || fontPresetMap.system
}

/**
 * Locked Open Design hi-fi tokens (`wingside-hifi-fix-8pages.html`).
 * Cool paper + structure blue + wing green accent; book-gold CTA only
 * (white label on darker gold for AA contrast).
 */
export const wingsSideHiFiTokens = {
  accent: '#104030',
  background: '#F3F6F9',
  border: '#E2E6ED',
  brand: '#005090',
  brandHover: '#0A65AD',
  brandSoft: '#E8F1F8',
  ctaFg: '#FFFFFF',
  foreground: '#1B2430',
  gold: '#B87A14',
  maxWidth: '70rem',
  muted: '#667085',
  navHeight: '72px',
  promoInk: '#0A0A0A',
  promoRed: '#D62D2D',
  radius: '1.25rem',
  radiusSm: '0.75rem',
  surface: '#FFFFFF',
  surfaceStrong: '#EEF2F6',
  wine: '#8B2E28',
} as const

export type SiteThemeTokens = {
  accentColor: string
  brandColor: string
  buttonStyle: string
  layoutStyle: string
  style: React.CSSProperties
  themeKey: string
  themeName: string
  themePreset: string
}

type SiteThemeContext = {
  siteCode?: null | string
}

export const getSiteThemeTokens = (
  settings?: null | ThemeSettingsLike,
  context: SiteThemeContext = {},
): SiteThemeTokens => {
  const themeKey = normalizeThemeKey(settings?.branding?.themeKey || defaultThemeKey)
  const themePresetKey = normalizeThemePresetKey(themeKey)
  const presetTokens = resolveThemePresetTokens(themeKey, settings?.branding?.themePreset)
  const brandColor =
    settings?.branding?.brandColor ||
    presetTokens.brandColor ||
    defaultThemePresetByKey[themePresetKey].brandColor
  const accentColor =
    settings?.branding?.accentColor ||
    presetTokens.accentColor ||
    defaultThemePresetByKey[themePresetKey].accentColor
  const surfaceColor = settings?.branding?.surfaceColor || presetTokens.surfaceColor
  const surfaceStrongColor =
    settings?.branding?.surfaceStrongColor || presetTokens.surfaceStrongColor
  const backgroundStyle = settings?.branding?.backgroundStyle || presetTokens.backgroundStyle
  const radius = settings?.branding?.radius || presetTokens.radius
  const spacingScale = settings?.branding?.spacingScale || presetTokens.spacingScale
  const fontPreset = settings?.branding?.fontPreset || presetTokens.fontPreset
  const buttonStyle = settings?.branding?.buttonStyle || presetTokens.buttonStyle
  const layoutStyle = settings?.branding?.layoutStyle || presetTokens.layoutStyle
  const fontTokens = getFontPresetTokens(fontPreset)
  const radiusValue = radiusMap[radius] || radiusMap.lg
  const spacingTokens = spacingMap[spacingScale] || spacingMap.standard
  const resolvedPresetKey =
    settings?.branding?.themePreset &&
    typeof settings.branding.themePreset === 'object' &&
    'key' in settings.branding.themePreset
      ? String(settings.branding.themePreset.key || themePresetKey)
      : themePresetKey
  const isWingsSide = context.siteCode
    ? context.siteCode === 'wings-side'
    : themeKey === 'wings-side'
  const resolvedBrandColor = isWingsSide ? wingsSideHiFiTokens.brand : brandColor
  const resolvedAccentColor = isWingsSide ? wingsSideHiFiTokens.accent : accentColor
  const wingsSideSemanticTokens = isWingsSide
    ? {
        '--section-space': 'clamp(1.65rem, 3.8vw, 2.75rem)',
        '--section-space-sm': 'clamp(1.1rem, 2.8vw, 1.75rem)',
        '--site-accent': wingsSideHiFiTokens.accent,
        '--site-background': wingsSideHiFiTokens.background,
        '--site-border': wingsSideHiFiTokens.border,
        '--site-brand': wingsSideHiFiTokens.brand,
        '--site-brand-hover': wingsSideHiFiTokens.brandHover,
        '--site-brand-soft': wingsSideHiFiTokens.brandSoft,
        '--site-cta': wingsSideHiFiTokens.gold,
        '--site-cta-fg': wingsSideHiFiTokens.ctaFg,
        '--site-foreground': wingsSideHiFiTokens.foreground,
        '--site-gold': wingsSideHiFiTokens.gold,
        '--site-max': wingsSideHiFiTokens.maxWidth,
        '--site-muted': wingsSideHiFiTokens.muted,
        '--site-nav-h': wingsSideHiFiTokens.navHeight,
        '--site-promo-ink': wingsSideHiFiTokens.promoInk,
        '--site-promo-red': wingsSideHiFiTokens.promoRed,
        '--site-radius': wingsSideHiFiTokens.radius,
        '--site-radius-sm': wingsSideHiFiTokens.radiusSm,
        '--site-shadow': `0 24px 80px color-mix(in oklch, ${wingsSideHiFiTokens.brand} 16%, transparent)`,
        '--site-shadow-sm': `0 8px 28px color-mix(in oklch, ${wingsSideHiFiTokens.brand} 10%, transparent)`,
        '--site-surface': wingsSideHiFiTokens.surface,
        '--site-surface-strong': wingsSideHiFiTokens.surfaceStrong,
        '--site-wine': wingsSideHiFiTokens.wine,
      }
    : {}

  return {
    accentColor: resolvedAccentColor,
    brandColor: resolvedBrandColor,
    buttonStyle,
    layoutStyle,
    style: {
      '--section-space': spacingTokens.large,
      '--section-space-sm': spacingTokens.small,
      '--site-accent': resolvedAccentColor,
      '--site-background-style': backgroundStyle,
      '--site-border': `color-mix(in oklch, ${resolvedAccentColor} 24%, var(--border))`,
      '--site-brand': resolvedBrandColor,
      '--site-brand-contrast': '#ffffff',
      '--site-button-style': buttonStyle,
      '--site-font-body': fontTokens.body,
      '--site-font-heading': fontTokens.heading,
      '--site-layout': layoutStyle,
      '--site-radius': radiusValue,
      '--site-shadow': `0 24px 80px color-mix(in oklch, ${resolvedBrandColor} 16%, transparent)`,
      '--site-surface': isWingsSide ? wingsSideHiFiTokens.surface : surfaceColor,
      '--site-surface-strong': isWingsSide
        ? wingsSideHiFiTokens.surfaceStrong
        : surfaceStrongColor,
      '--site-theme-key': themeKey,
      '--site-theme-preset': resolvedPresetKey,
      ...wingsSideSemanticTokens,
    } as unknown as React.CSSProperties,
    themeKey,
    themeName: settings?.siteName || 'WingsGroup',
    themePreset: resolvedPresetKey,
  }
}
