import type { Payload, PayloadRequest } from 'payload'

import { defaultThemePresetByKey, type ThemePresetKey, type ThemePresetTokens } from './themeTokens'

export type SiteThemeAssignment = {
  heroVariant: 'planner' | 'retail-departures' | 'standard' | 'utility'
  themePreset: ThemePresetKey
}

export const siteThemeAssignments: Record<string, SiteThemeAssignment> = {
  'wings-care': { heroVariant: 'standard', themePreset: 'care' },
  'wings-go': { heroVariant: 'retail-departures', themePreset: 'retail' },
  'wings-pass': { heroVariant: 'utility', themePreset: 'utility' },
  'wings-plus': { heroVariant: 'standard', themePreset: 'premium' },
  'wings-side': { heroVariant: 'planner', themePreset: 'premium' },
  'wings-travel': { heroVariant: 'standard', themePreset: 'corporate' },
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
    description: 'Umbrella WingsTravel brand foundation for ecosystem pages.',
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

export async function ensureThemePresetSeeds(
  payload: Payload,
  req: PayloadRequest,
): Promise<Record<ThemePresetKey, number>> {
  const presetIDs = {} as Record<ThemePresetKey, number>

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

  return presetIDs
}
