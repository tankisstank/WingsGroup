import {
  defaultHeroPresentation,
  heroPresentationDefinitions,
  heroPresentationOptions,
  resolveHeroPresentation,
} from '@/heros/presentations/registry'
import {
  heroPresentationPresetSeeds,
  siteHeroPresentationAssignments,
} from '@/utilities/heroPresentationSeed'
import { describe, expect, it } from 'vitest'

describe('hero presentation registry', () => {
  it('registers unique CMS options with a render component', () => {
    const keys = heroPresentationDefinitions.map(({ value }) => value)

    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual([
      'centered-visual',
      'split-visual',
      'layered-visuals',
      'gradient-mesh',
      'planner-split',
      'cinematic-carousel',
      'video-background',
    ])
    expect(heroPresentationOptions).toHaveLength(7)
  })

  it('resolves explicit presentation keys and legacy fallbacks', () => {
    expect(resolveHeroPresentation('gradient-mesh', 'standard')).toBe('gradient-mesh')
    expect(resolveHeroPresentation(undefined, 'standard')).toBe(defaultHeroPresentation)
    expect(resolveHeroPresentation(undefined, 'retail-departures')).toBe('split-visual')
    expect(resolveHeroPresentation('unknown-style', 'planner')).toBe('split-visual')
  })

  it('derives CMS options from the same definitions', () => {
    expect(heroPresentationOptions).toEqual(
      heroPresentationDefinitions.map(({ label, value }) => ({ label, value })),
    )
  })

  it('registers unique seeded presets and valid site assignments', () => {
    const presetKeys = heroPresentationPresetSeeds.map((preset) => preset.key)

    expect(new Set(presetKeys).size).toBe(presetKeys.length)
    expect(heroPresentationPresetSeeds.map((preset) => preset.baseTemplate)).toEqual(
      expect.arrayContaining(['planner-split', 'cinematic-carousel', 'video-background']),
    )

    for (const assignment of Object.values(siteHeroPresentationAssignments)) {
      expect(presetKeys).toContain(assignment.presetKey)
    }
  })
})
