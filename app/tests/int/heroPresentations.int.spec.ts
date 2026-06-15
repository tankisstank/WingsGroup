import {
  defaultHeroPresentation,
  heroPresentationDefinitions,
  heroPresentationOptions,
  resolveHeroPresentation,
} from '@/heros/presentations/registry'
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
    ])
    expect(heroPresentationOptions).toHaveLength(4)
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
})
