import {
  getMissingPhase1LandingPageBlocks,
  isPhase1LandingPagePattern,
  phase1LandingPageRequiredBlocks,
} from '@/utilities/landingPagePattern'
import { describe, expect, it } from 'vitest'

describe('phase 1 landing page pattern', () => {
  it('requires content, media, CTA, and form blocks', () => {
    expect(phase1LandingPageRequiredBlocks).toEqual([
      'content',
      'mediaBlock',
      'cta',
      'formBlock',
    ])
  })

  it('accepts the reusable campaign landing page structure', () => {
    expect(
      isPhase1LandingPagePattern([
        { blockType: 'content' },
        { blockType: 'mediaBlock' },
        { blockType: 'cta' },
        { blockType: 'formBlock' },
      ]),
    ).toBe(true)
  })

  it('reports missing blocks for incomplete landing pages', () => {
    expect(getMissingPhase1LandingPageBlocks([{ blockType: 'content' }])).toEqual([
      'mediaBlock',
      'cta',
      'formBlock',
    ])
  })
})
