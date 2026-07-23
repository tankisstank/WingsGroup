import type { Validate } from 'payload'

export const themeKeyOptions = [
  { label: 'WingsGroup', value: 'wings-group' },
  { label: 'WingsGo', value: 'wings-go' },
  { label: 'WingsSide', value: 'wings-side' },
  { label: 'WingsPlus', value: 'wings-plus' },
  { label: 'WingsCare', value: 'wings-care' },
  { label: 'WingsPass', value: 'wings-pass' },
  { label: 'Custom', value: 'custom' },
] as const

export const backgroundStyleOptions = [
  { label: 'Plain', value: 'plain' },
  { label: 'Soft gradient', value: 'soft-gradient' },
  { label: 'Editorial', value: 'editorial' },
  { label: 'Utility', value: 'utility' },
] as const

export const radiusOptions = [
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
  { label: 'Extra large', value: 'xl' },
] as const

export const spacingScaleOptions = [
  { label: 'Compact', value: 'compact' },
  { label: 'Standard', value: 'standard' },
  { label: 'Airy', value: 'airy' },
] as const

export const fontPresetOptions = [
  { label: 'System', value: 'system' },
  { label: 'Modern', value: 'modern' },
  { label: 'Retail', value: 'retail' },
  { label: 'Editorial', value: 'editorial' },
  { label: 'Premium', value: 'premium' },
] as const

export const buttonStyleOptions = [
  { label: 'Solid', value: 'solid' },
  { label: 'Soft', value: 'soft' },
  { label: 'Outline', value: 'outline' },
  { label: 'Pill', value: 'pill' },
] as const

export const layoutStyleOptions = [
  { label: 'Corporate', value: 'corporate' },
  { label: 'Retail', value: 'retail' },
  { label: 'Editorial', value: 'editorial' },
  { label: 'Utility', value: 'utility' },
] as const

export type ThemeKey = (typeof themeKeyOptions)[number]['value']
export type BackgroundStyle = (typeof backgroundStyleOptions)[number]['value']
export type RadiusScale = (typeof radiusOptions)[number]['value']
export type SpacingScale = (typeof spacingScaleOptions)[number]['value']
export type FontPreset = (typeof fontPresetOptions)[number]['value']
export type ButtonStyle = (typeof buttonStyleOptions)[number]['value']
export type LayoutStyle = (typeof layoutStyleOptions)[number]['value']
export const defaultThemeKey = 'wings-group' as const

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const validateHexColor: Validate<string | null | undefined> = (value) => {
  if (!value) {
    return true
  }

  return hexColorPattern.test(value) || 'Use a hex color value such as #0F766E.'
}

export const asSelectOptions = <T extends string>(
  options: readonly { label: string; value: T }[],
): { label: string; value: T }[] => options as unknown as { label: string; value: T }[]

export const themePresetKeyOptions = [
  { label: 'Corporate', value: 'corporate' },
  { label: 'Retail', value: 'retail' },
  { label: 'Premium', value: 'premium' },
  { label: 'Utility', value: 'utility' },
  { label: 'Care', value: 'care' },
  { label: 'Custom', value: 'custom' },
] as const

export type ThemePresetKey = (typeof themePresetKeyOptions)[number]['value']

export type ThemePresetTokens = {
  accentColor: string
  backgroundStyle: BackgroundStyle
  brandColor: string
  buttonStyle: ButtonStyle
  fontPreset: FontPreset
  layoutStyle: LayoutStyle
  radius: RadiusScale
  spacingScale: SpacingScale
  surfaceColor: string
  surfaceStrongColor: string
}

export type ThemePresetRecord = {
  key?: string | null
  tokens?: Partial<ThemePresetTokens> | null
} | null | undefined

export type ThemePresetRelationLike = number | string | ThemePresetRecord

export type ThemeSettingsLike = {
  branding?: {
    accentColor?: string | null
    backgroundStyle?: BackgroundStyle | null
    brandColor?: string | null
    buttonStyle?: ButtonStyle | null
    fontPreset?: FontPreset | null
    layoutStyle?: LayoutStyle | null
    radius?: RadiusScale | null
    spacingScale?: SpacingScale | null
    surfaceColor?: string | null
    surfaceStrongColor?: string | null
    themeKey?: string | null
    themePreset?: ThemePresetRelationLike
  } | null
  siteName?: string | null
}

const themeKeyToPresetKey: Record<string, ThemePresetKey> = {
  'wings-care': 'care',
  'wings-go': 'retail',
  'wings-group': 'corporate',
  'wings-pass': 'utility',
  'wings-plus': 'premium',
  'wings-side': 'premium',
}

export const defaultThemePresetByKey: Record<ThemePresetKey, ThemePresetTokens> = {
  corporate: {
    accentColor: '#F59E0B',
    backgroundStyle: 'soft-gradient',
    brandColor: '#0F172A',
    buttonStyle: 'solid',
    fontPreset: 'system',
    layoutStyle: 'corporate',
    radius: 'lg',
    spacingScale: 'standard',
    surfaceColor: '#F8FAFC',
    surfaceStrongColor: '#E2E8F0',
  },
  retail: {
    accentColor: '#EA580C',
    backgroundStyle: 'soft-gradient',
    brandColor: '#0284C7',
    buttonStyle: 'solid',
    fontPreset: 'retail',
    layoutStyle: 'retail',
    radius: 'md',
    spacingScale: 'compact',
    surfaceColor: '#F0F9FF',
    surfaceStrongColor: '#DFF6FF',
  },
  premium: {
    accentColor: '#B45309',
    backgroundStyle: 'editorial',
    brandColor: '#0F766E',
    buttonStyle: 'soft',
    fontPreset: 'premium',
    layoutStyle: 'editorial',
    radius: 'xl',
    spacingScale: 'airy',
    surfaceColor: '#FFFAF0',
    surfaceStrongColor: '#FDE68A',
  },
  utility: {
    accentColor: '#0EA5E9',
    backgroundStyle: 'utility',
    brandColor: '#0B4F6C',
    buttonStyle: 'outline',
    fontPreset: 'modern',
    layoutStyle: 'utility',
    radius: 'md',
    spacingScale: 'compact',
    surfaceColor: '#F8FAFC',
    surfaceStrongColor: '#E2E8F0',
  },
  care: {
    accentColor: '#D97706',
    backgroundStyle: 'plain',
    brandColor: '#15803D',
    buttonStyle: 'soft',
    fontPreset: 'system',
    layoutStyle: 'corporate',
    radius: 'lg',
    spacingScale: 'standard',
    surfaceColor: '#F0FDF4',
    surfaceStrongColor: '#DCFCE7',
  },
  custom: {
    accentColor: '#F59E0B',
    backgroundStyle: 'plain',
    brandColor: '#0F172A',
    buttonStyle: 'solid',
    fontPreset: 'system',
    layoutStyle: 'corporate',
    radius: 'lg',
    spacingScale: 'standard',
    surfaceColor: '#F8FAFC',
    surfaceStrongColor: '#E2E8F0',
  },
}

export const normalizeThemePresetKey = (themeKey?: string | null): ThemePresetKey => {
  if (!themeKey) {
    return 'corporate'
  }

  if (themeKey in defaultThemePresetByKey) {
    return themeKey as ThemePresetKey
  }

  return themeKeyToPresetKey[themeKey] || 'corporate'
}

export const normalizeThemeKey = (themeKey?: string | null): ThemeKey => {
  if (!themeKey) {
    return defaultThemeKey
  }

  if (themeKeyOptions.some((option) => option.value === themeKey)) {
    return themeKey as ThemeKey
  }

  return 'custom'
}

export const resolveThemePresetTokens = (
  themeKey?: string | null,
  preset?: ThemePresetRelationLike,
): ThemePresetTokens => {
  const presetRecord = typeof preset === 'object' ? preset : null
  const presetKey =
    presetRecord?.key && presetRecord.key in defaultThemePresetByKey
      ? (presetRecord.key as ThemePresetKey)
      : normalizeThemePresetKey(themeKey)
  const baseTokens = defaultThemePresetByKey[presetKey]
  const customTokens = presetRecord?.tokens || {}

  return {
    ...baseTokens,
    ...customTokens,
  }
}
