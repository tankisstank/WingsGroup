import {
  createLayoutPresetData,
  getLayoutPresetDefinition,
  isLayoutPresetKey,
  layoutPresetDefinitions,
} from '@/utilities/layoutPresets'
import {
  comparisonPresentationDefinitions,
  ctaPresentationDefinitions,
  faqPresentationDefinitions,
  featurePresentationDefinitions,
  pricingPresentationDefinitions,
  statsPresentationDefinitions,
  testimonialPresentationDefinitions,
} from '@/blocks/presentations'
import { describe, expect, it } from 'vitest'

const registeredBlockTypes = new Set([
  'archive',
  'comparison',
  'content',
  'cta',
  'faq',
  'featureGrid',
  'formBlock',
  'infoStrip',
  'mediaBlock',
  'pricingTable',
  'stats',
  'testimonial',
])

describe('layout preset registry', () => {
  it('registers twelve unique code-owned presets', () => {
    const keys = layoutPresetDefinitions.map(({ key }) => key)

    expect(keys).toHaveLength(12)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.every(isLayoutPresetKey)).toBe(true)
  })

  it('creates valid block snapshots for every preset', () => {
    for (const preset of layoutPresetDefinitions) {
      const data = createLayoutPresetData(preset.key, {
        formID: 1,
        summary: 'Mô tả kiểm thử',
        title: `Trang ${preset.label}`,
      })

      expect(data.hero).toBeTruthy()
      expect(data.layout.length).toBeGreaterThan(2)
      expect(
        data.layout.every((block) => registeredBlockTypes.has(String(block.blockType))),
      ).toBe(true)
    }
  })

  it('falls back to the first governed preset for unknown input', () => {
    expect(getLayoutPresetDefinition('unknown').key).toBe('homepage-editorial')
  })
})

describe('block presentation registry', () => {
  it.each([
    ['features', featurePresentationDefinitions, 8],
    ['CTA', ctaPresentationDefinitions, 8],
    ['FAQ', faqPresentationDefinitions, 5],
    ['pricing', pricingPresentationDefinitions, 6],
    ['stats', statsPresentationDefinitions, 7],
    ['testimonials', testimonialPresentationDefinitions, 8],
    ['comparison', comparisonPresentationDefinitions, 3],
  ])('keeps %s presentation keys unique', (_name, definitions, expectedCount) => {
    const values = definitions.map(({ value }) => value)

    expect(values).toHaveLength(expectedCount)
    expect(new Set(values).size).toBe(values.length)
  })
})

