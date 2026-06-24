import {
  defaultHeroBehavior,
  normalizeHeroBehavior,
  validateHeroPreset,
} from '@/heros/presentations/registry'
import { resolveHeroPresentationConfig } from '@/heros/presentations/resolver'
import { describe, expect, it } from 'vitest'

const sitePreset = {
  baseTemplate: 'planner-split' as const,
  behavior: {
    autoplay: false,
    intervalMs: 8000,
  },
  key: 'travel-planner-split',
}

describe('hero presentation resolver', () => {
  it('keeps legacy page presentation when no inheritance mode was selected', () => {
    const result = resolveHeroPresentationConfig({
      hero: {
        presentation: 'split-visual',
        variant: 'planner',
      },
      siteDefaults: {
        presentationPreset: sitePreset,
        variant: 'planner',
      },
    })

    expect(result.key).toBe('split-visual')
    expect(result.source).toBe('legacy')
  })

  it('inherits the site preset when the page requests inheritance', () => {
    const result = resolveHeroPresentationConfig({
      hero: {
        presentationMode: 'inherit',
      },
      siteDefaults: {
        presentationPreset: sitePreset,
        variant: 'planner',
      },
    })

    expect(result.key).toBe('planner-split')
    expect(result.presetKey).toBe('travel-planner-split')
    expect(result.source).toBe('site')
    expect(result.behavior.autoplay).toBe(false)
  })

  it('allows a page preset and governed behavior override', () => {
    const result = resolveHeroPresentationConfig({
      hero: {
        behaviorMode: 'override',
        behaviorOverrides: {
          autoplay: true,
          intervalMs: 100,
          transitionMs: 9000,
        },
        presentationMode: 'override',
        presentationPreset: {
          baseTemplate: 'cinematic-carousel',
          key: 'campaign-carousel',
        },
      },
      siteDefaults: {
        presentationPreset: sitePreset,
      },
    })

    expect(result.key).toBe('cinematic-carousel')
    expect(result.source).toBe('page')
    expect(result.behavior.intervalMs).toBe(3000)
    expect(result.behavior.transitionMs).toBe(2000)
  })

  it('normalizes null and invalid behavior values', () => {
    expect(
      normalizeHeroBehavior({
        autoplay: null,
        intervalMs: null,
        transition: null,
      }),
    ).toEqual(defaultHeroBehavior)
  })

  it('rejects presets whose base template is not registered', () => {
    expect(validateHeroPreset({ baseTemplate: 'unknown' as never })).toBeTypeOf('string')
  })
})
