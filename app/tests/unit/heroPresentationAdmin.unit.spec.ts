import { describe, expect, it } from 'vitest'

import {
  evaluateHeroPresentationRequirements,
  getHeroPresentationAdminMeta,
} from '@/heros/presentations/admin'

describe('hero presentation admin helpers', () => {
  it('describes gradient mesh as no-media preset', () => {
    const meta = getHeroPresentationAdminMeta('gradient-mesh')
    const requirements = evaluateHeroPresentationRequirements({
      key: 'gradient-mesh',
    })

    expect(meta?.businessFit).toContain('standard')
    expect(requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'no-media',
          status: 'ready',
        }),
      ]),
    )
  })

  it('flags carousel presets with fewer than two populated slides', () => {
    const requirements = evaluateHeroPresentationRequirements({
      key: 'cinematic-carousel',
      slides: [{ media: 1 }],
    })

    expect(requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'slides',
          status: 'missing',
        }),
      ]),
    )
  })

  it('requires video poster and recommends desktop video for video background', () => {
    const requirements = evaluateHeroPresentationRequirements({
      key: 'video-background',
      video: {},
    })

    expect(requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'video-poster',
          status: 'missing',
        }),
        expect.objectContaining({
          key: 'video-desktop',
          status: 'recommended-missing',
        }),
      ]),
    )
  })

  it('warns when planner split is not paired with planner behavior', () => {
    const requirements = evaluateHeroPresentationRequirements({
      key: 'planner-split',
      variant: 'standard',
      visualMedia: 10,
    })

    expect(requirements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'planner-behavior',
          status: 'recommended-missing',
        }),
      ]),
    )
  })
})
