import type { Payload, PayloadRequest } from 'payload'

import { defaultThemePresetByKey, type ThemePresetKey, type ThemePresetTokens } from './themeTokens'

export const wingsSideInboundThemePresetKey = 'wings-side-editorial-inbound-v2' as const

export type SiteThemeAssignment = {
  heroVariant: 'planner' | 'retail-departures' | 'standard' | 'utility'
  themePreset: ThemePresetKey | typeof wingsSideInboundThemePresetKey | 'wings-side-classic' | 'wings-side-editorial'
}

export const siteThemeAssignments: Record<string, SiteThemeAssignment> = {
  'wings-care': { heroVariant: 'standard', themePreset: 'care' },
  'wings-go': { heroVariant: 'retail-departures', themePreset: 'retail' },
  'wings-pass': { heroVariant: 'utility', themePreset: 'utility' },
  'wings-plus': { heroVariant: 'standard', themePreset: 'premium' },
  'wings-side': { heroVariant: 'planner', themePreset: wingsSideInboundThemePresetKey },
  'wings-group': { heroVariant: 'standard', themePreset: 'corporate' },
}

export const themePresetSeedCatalog: Record<
  ThemePresetKey,
  {
    description: string
    isActive: boolean
    name: string
    tokens: ThemePresetTokens
  }
> = {
  care: {
    description: 'Trust-first support, insurance, and care-oriented visual system.',
    isActive: true,
    name: 'Care',
    tokens: defaultThemePresetByKey.care,
  },
  corporate: {
    description: 'Umbrella WingsGroup brand foundation for ecosystem pages.',
    isActive: true,
    name: 'Corporate',
    tokens: defaultThemePresetByKey.corporate,
  },
  custom: {
    description: 'Fallback preset for controlled custom site overrides.',
    isActive: false,
    name: 'Custom',
    tokens: defaultThemePresetByKey.custom,
  },
  premium: {
    description: 'Consultative premium visual system for inbound, MICE, and high-value programs.',
    isActive: true,
    name: 'Premium',
    tokens: defaultThemePresetByKey.premium,
  },
  retail: {
    description: 'Retail travel browsing visual system for tour schedules, prices, and campaigns.',
    isActive: true,
    name: 'Retail',
    tokens: defaultThemePresetByKey.retail,
  },
  utility: {
    description: 'Utility-first visual system for airport service, pricing, and quick booking flows.',
    isActive: true,
    name: 'Utility',
    tokens: defaultThemePresetByKey.utility,
  },
}

const customThemePresetSeedCatalog: Array<{
  description: string
  isActive: boolean
  key: string
  name: string
  tokens: ThemePresetTokens
}> = [
  {
    description:
      'Current WingsSide premium look preserved as a rollback-safe preset.',
    isActive: true,
    key: 'wings-side-classic',
    name: 'WingsSide Classic',
    tokens: {
      ...defaultThemePresetByKey.premium,
      accentColor: '#EA580C',
      brandColor: '#0C4A6E',
    },
  },
  {
    description:
      'Editorial premium travel preset for WingsSide using the site brand palette instead of the reference brand colors.',
    isActive: true,
    key: 'wings-side-editorial',
    name: 'WingsSide Editorial',
    tokens: {
      ...defaultThemePresetByKey.premium,
      accentColor: '#C09030',
      backgroundStyle: 'editorial',
      brandColor: '#104030',
      buttonStyle: 'pill',
      fontPreset: 'editorial',
      radius: 'lg',
      surfaceColor: '#F6F2E8',
      surfaceStrongColor: '#E8DECB',
    },
  },
  {
    description:
      'Inbound editorial launch preset for WingsSide: warm paper surfaces, Deep Teal identity, Mustard Gold CTA, and Terracotta editorial accents.',
    isActive: true,
    key: wingsSideInboundThemePresetKey,
    name: 'WingsSide Editorial Inbound v2',
    tokens: {
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
    },
  },
]

export async function ensureThemePresetSeeds(
  payload: Payload,
  req: PayloadRequest,
): Promise<Record<string, number>> {
  const presetIDs: Record<string, number> = {}

  for (const [key, preset] of Object.entries(themePresetSeedCatalog) as Array<
    [ThemePresetKey, (typeof themePresetSeedCatalog)[ThemePresetKey]]
  >) {
    const existing = await payload.find({
      collection: 'theme-presets',
      depth: 0,
      limit: 1,
      pagination: false,
      req,
      where: {
        key: {
          equals: key,
        },
      },
    })

    const data = {
      description: preset.description,
      isActive: preset.isActive,
      key,
      name: preset.name,
      tokens: preset.tokens,
    }

    const doc =
      existing.docs[0] ||
      (await payload.create({
        collection: 'theme-presets',
        data,
        req,
      }))

    if (existing.docs[0]) {
      await payload.update({
        collection: 'theme-presets',
        data,
        id: doc.id,
        req,
      })
    }

    presetIDs[key] = Number(doc.id)
  }

  for (const preset of customThemePresetSeedCatalog) {
    const existing = await payload.find({
      collection: 'theme-presets',
      depth: 0,
      limit: 1,
      pagination: false,
      req,
      where: {
        key: {
          equals: preset.key,
        },
      },
    })

    const data = {
      description: preset.description,
      isActive: preset.isActive,
      key: preset.key,
      name: preset.name,
      tokens: preset.tokens,
    }

    const doc =
      existing.docs[0] ||
      (await payload.create({
        collection: 'theme-presets',
        data,
        req,
      }))

    if (existing.docs[0]) {
      await payload.update({
        collection: 'theme-presets',
        data,
        id: doc.id,
        req,
      })
    }

    presetIDs[preset.key] = Number(doc.id)
  }

  return presetIDs
}
