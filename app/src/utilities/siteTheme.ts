import type React from 'react'

import {
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
    body: 'var(--font-wingsside-body), var(--font-geist-sans)',
    heading: 'var(--font-wingsside-heading), Georgia, serif',
  },
  modern: {
    body: 'var(--font-geist-sans)',
    heading: 'var(--font-geist-sans)',
  },
  premium: {
    body: 'var(--font-wingsside-body), var(--font-geist-sans)',
    heading: 'var(--font-wingsside-heading), Georgia, serif',
  },
  retail: {
    body: 'var(--font-wingsgo-body), var(--font-geist-sans)',
    heading: 'var(--font-wingsgo-heading), var(--font-geist-sans)',
  },
  system: {
    body: 'var(--font-geist-sans)',
    heading: 'var(--font-geist-sans)',
  },
}

const getFontPresetTokens = (fontPreset?: string | null) => {
  return fontPresetMap[fontPreset || 'system'] || fontPresetMap.system
}

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

export const getSiteThemeTokens = (settings?: null | ThemeSettingsLike): SiteThemeTokens => {
  const themeKey = normalizeThemeKey(settings?.branding?.themeKey || 'wings-travel')
  const themePresetKey = normalizeThemePresetKey(themeKey)
  const presetTokens = resolveThemePresetTokens(themeKey, settings?.branding?.themePreset)
  const brandColor =
    settings?.branding?.brandColor || presetTokens.brandColor || defaultThemePresetByKey[themePresetKey].brandColor
  const accentColor =
    settings?.branding?.accentColor || presetTokens.accentColor || defaultThemePresetByKey[themePresetKey].accentColor
  const surfaceColor = settings?.branding?.surfaceColor || presetTokens.surfaceColor
  const surfaceStrongColor = settings?.branding?.surfaceStrongColor || presetTokens.surfaceStrongColor
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
    settings?.branding?.themePreset && typeof settings.branding.themePreset === 'object' && 'key' in settings.branding.themePreset
      ? String(settings.branding.themePreset.key || themePresetKey)
      : themePresetKey

  return {
    accentColor,
    brandColor,
    buttonStyle,
    layoutStyle,
    style: {
      '--section-space': spacingTokens.large,
      '--section-space-sm': spacingTokens.small,
      '--site-accent': accentColor,
      '--site-background-style': backgroundStyle,
      '--site-border': `color-mix(in oklch, ${accentColor} 24%, var(--border))`,
      '--site-brand': brandColor,
      '--site-brand-contrast': '#ffffff',
      '--site-button-style': buttonStyle,
      '--site-font-body': fontTokens.body,
      '--site-font-heading': fontTokens.heading,
      '--site-layout': layoutStyle,
      '--site-radius': radiusValue,
      '--site-shadow': `0 24px 80px color-mix(in oklch, ${brandColor} 16%, transparent)`,
      '--site-surface': surfaceColor,
      '--site-surface-strong': surfaceStrongColor,
      '--site-theme-key': themeKey,
      '--site-theme-preset': resolvedPresetKey,
    } as React.CSSProperties,
    themeKey,
    themeName: settings?.siteName || 'WingsTravel',
    themePreset: resolvedPresetKey,
  }
}
