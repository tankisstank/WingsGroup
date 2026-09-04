import type { Validate } from 'payload'

export const themeKeyOptions = [
  { label: 'WingsGroup', value: 'wings-group' },
  { label: 'WingsGo', value: 'wings-go' },
  { label: 'WingSide', value: 'wings-side' },
  { label: 'WingsPlus', value: 'wings-plus' },
  { label: 'WingsCare', value: 'wings-care' },
  { label: 'WingsPass', value: 'wings-pass' },
  { label: 'Tùy chỉnh (Custom)', value: 'custom' },
] as const

export const backgroundStyleOptions = [
  { label: 'Nền trơn (Plain)', value: 'plain' },
  { label: 'Chuyển sắc nhẹ (Soft gradient)', value: 'soft-gradient' },
  { label: 'Biên tập (Editorial)', value: 'editorial' },
  { label: 'Tiện ích (Utility)', value: 'utility' },
] as const

export const radiusOptions = [
  { label: 'Nhỏ (Small)', value: 'sm' },
  { label: 'Vừa (Medium)', value: 'md' },
  { label: 'Lớn (Large)', value: 'lg' },
  { label: 'Rất lớn (Extra large)', value: 'xl' },
] as const

export const spacingScaleOptions = [
  { label: 'Gọn (Compact)', value: 'compact' },
  { label: 'Tiêu chuẩn (Standard)', value: 'standard' },
  { label: 'Thoáng (Airy)', value: 'airy' },
] as const

export const fontPresetOptions = [
  { label: 'Hệ thống (System)', value: 'system' },
  { label: 'Hiện đại (Modern)', value: 'modern' },
  { label: 'Bán lẻ (Retail)', value: 'retail' },
  { label: 'Biên tập (Editorial)', value: 'editorial' },
  { label: 'Cao cấp (Premium)', value: 'premium' },
] as const

export const buttonStyleOptions = [
  { label: 'Đặc (Solid)', value: 'solid' },
  { label: 'Mềm (Soft)', value: 'soft' },
  { label: 'Viền (Outline)', value: 'outline' },
  { label: 'Dạng viên (Pill)', value: 'pill' },
] as const

export const layoutStyleOptions = [
  { label: 'Doanh nghiệp (Corporate)', value: 'corporate' },
  { label: 'Bán lẻ (Retail)', value: 'retail' },
  { label: 'Biên tập (Editorial)', value: 'editorial' },
  { label: 'Tiện ích (Utility)', value: 'utility' },
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
  { label: 'Giao diện doanh nghiệp (Corporate)', value: 'corporate' },
  { label: 'Giao diện bán lẻ (Retail)', value: 'retail' },
  { label: 'Giao diện cao cấp (Premium)', value: 'premium' },
  { label: 'Giao diện tiện ích (Utility)', value: 'utility' },
  { label: 'Giao diện chăm sóc (Care)', value: 'care' },
  { label: 'Giao diện tùy chỉnh (Custom)', value: 'custom' },
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
