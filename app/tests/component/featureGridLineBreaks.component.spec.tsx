import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FeatureGridBlock } from '@/blocks/FeatureGrid/Component'

vi.mock('@/components/Link', () => ({
  CMSLink: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/Media', () => ({ Media: () => null }))
afterEach(cleanup)

describe('Feature Grid description line breaks', () => {
  it.each(['icon-grid', 'accordion', 'tabs'] as const)('preserves editor text in %s', presentation => {
    const descriptions = ['Company Trip\nDòng hai\n\nDòng bốn', 'MICE một dòng', 'Private Tour\nDòng hai', 'Wellness\n' + 'chữdài'.repeat(50)]
    const { container } = render(<FeatureGridBlock
      blockType="featureGrid"
      title="Dịch vụ WingsPlus"
      presentation={presentation}
      items={descriptions.map((description, index) => ({ title: 'Dịch vụ ' + index, description }))}
    />)
    const paragraphs = container.querySelectorAll('.site-feature-card > p')
    expect(paragraphs.length).toBe(4)
    paragraphs.forEach((paragraph, index) => {
      expect(paragraph.textContent).toBe(descriptions[index])
      expect(paragraph.classList.contains('whitespace-pre-line')).toBe(true)
      expect(paragraph.classList.contains('break-words')).toBe(true)
    })
    const details = container.querySelectorAll('details p')
    expect(details.length).toBe(presentation === 'icon-grid' ? 0 : 4)
    details.forEach((paragraph, index) => {
      expect(paragraph.textContent).toBe(descriptions[index])
      expect(paragraph.classList.contains('whitespace-pre-line')).toBe(true)
      expect(paragraph.classList.contains('break-words')).toBe(true)
    })
  })
})
