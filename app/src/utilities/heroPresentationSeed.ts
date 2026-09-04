import type { Payload, PayloadRequest } from 'payload'

import type { HeroBehaviorInput, HeroPresentationKey } from '@/heros/presentations/types'

type HeroPresentationPresetSeed = {
  baseTemplate: HeroPresentationKey
  behavior?: HeroBehaviorInput
  description: string
  key: string
  name: string
  slots?: {
    showBadge?: boolean
    showBusinessPanel?: boolean
    showPostcards?: boolean
  }
  visual?: {
    contentAlign?: 'center' | 'left' | 'right'
    contentPosition?: 'center' | 'left' | 'right'
    mediaFit?: 'contain' | 'cover'
    overlayStrength?: 'none' | 'soft' | 'strong'
  }
}

export const heroPresentationPresetSeeds: readonly HeroPresentationPresetSeed[] = [
  {
    baseTemplate: 'centered-visual',
    description: 'Stable centered visual presentation preserved for existing corporate pages.',
    key: 'centered-classic',
    name: 'Centered Classic',
  },
  {
    baseTemplate: 'split-visual',
    description: 'Shared split layout for utility and business-panel heroes.',
    key: 'split-classic',
    name: 'Split Classic',
  },
  {
    baseTemplate: 'layered-visuals',
    description: 'Three-layer visual composition for editorial campaigns.',
    key: 'layered-classic',
    name: 'Layered Visuals',
  },
  {
    baseTemplate: 'gradient-mesh',
    description: 'Animated mesh presentation using site theme tokens.',
    key: 'gradient-mesh-classic',
    name: 'Gradient Mesh',
  },
  {
    baseTemplate: 'planner-split',
    description: 'Consultative travel planner layout with a dominant visual and planning panel.',
    key: 'travel-planner-split',
    name: 'Travel Planner Split',
    slots: {
      showBadge: true,
      showBusinessPanel: true,
      showPostcards: true,
    },
    visual: {
      contentAlign: 'left',
      contentPosition: 'left',
      mediaFit: 'cover',
      overlayStrength: 'soft',
    },
  },
  {
    baseTemplate: 'cinematic-carousel',
    behavior: {
      autoplay: true,
      intervalMs: 6000,
      loop: true,
      pauseOnHover: true,
      showArrows: true,
      showDots: true,
      transition: 'crossfade',
      transitionMs: 700,
    },
    description: 'Accessible multi-image carousel with governed timing and controls.',
    key: 'cinematic-crossfade',
    name: 'Cinematic Crossfade',
    visual: {
      contentAlign: 'left',
      contentPosition: 'left',
      mediaFit: 'cover',
      overlayStrength: 'strong',
    },
  },
  {
    baseTemplate: 'cinematic-carousel',
    behavior: {
      autoplay: true,
      intervalMs: 6500,
      loop: true,
      pauseOnHover: true,
      showArrows: true,
      showDots: true,
      transition: 'crossfade',
      transitionMs: 800,
    },
    description:
      'WingSide inbound homepage carousel with image-only atmosphere and planner search widget.',
    key: 'wingsside-inbound-cinematic-search',
    name: 'WingSide Inbound Cinematic Search',
    slots: {
      showBadge: true,
      showBusinessPanel: true,
      showPostcards: false,
    },
    visual: {
      contentAlign: 'left',
      contentPosition: 'left',
      mediaFit: 'cover',
      overlayStrength: 'strong',
    },
  },
  {
    baseTemplate: 'video-background',
    description: 'Muted background video with required poster and reduced-motion fallback.',
    key: 'cinematic-video',
    name: 'Cinematic Video',
    visual: {
      contentAlign: 'left',
      contentPosition: 'left',
      mediaFit: 'cover',
      overlayStrength: 'strong',
    },
  },
] as const

export const siteHeroPresentationAssignments: Record<
  string,
  { presetKey: string; variant: 'planner' | 'retail-departures' | 'standard' | 'utility' }
> = {
  'wings-care': { presetKey: 'centered-classic', variant: 'standard' },
  'wings-go': { presetKey: 'split-classic', variant: 'retail-departures' },
  'wings-group': { presetKey: 'centered-classic', variant: 'standard' },
  'wings-pass': { presetKey: 'split-classic', variant: 'utility' },
  'wings-plus': { presetKey: 'centered-classic', variant: 'standard' },
  'wing-side': { presetKey: 'wingsside-inbound-cinematic-search', variant: 'planner' },
}

export async function ensureHeroPresentationPresetSeeds(
  payload: Payload,
  req: PayloadRequest,
): Promise<Record<string, number>> {
  const presetIDs: Record<string, number> = {}

  for (const preset of heroPresentationPresetSeeds) {
    const existing = await payload.find({
      collection: 'hero-presentation-presets',
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
      ...preset,
      isActive: true,
    }
    const doc = existing.docs[0]
      ? await payload.update({
          collection: 'hero-presentation-presets',
          data,
          id: existing.docs[0].id,
          req,
        })
      : await payload.create({
          collection: 'hero-presentation-presets',
          data,
          req,
        })

    presetIDs[preset.key] = Number(doc.id)
  }

  return presetIDs
}
