import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WingsGroupGallerySection } from '@/blocks/WingsGroupGallery/Component'
import type { Media } from '@/payload-types'

vi.mock('@/components/Media', () => ({
  Media: ({ alt, imgClassName }: { alt?: string; imgClassName?: string }) => (
    <span aria-label={alt} className={imgClassName} role="img" />
  ),
}))

const media = { id: 1 } as Media

describe('WingsGroupGallerySection', () => {
  it('hides an empty gallery and items disabled by the editor', () => {
    const { rerender } = render(
      <WingsGroupGallerySection blockType="wingsGroupGallery" items={[]} title="Gallery" />,
    )
    expect(screen.queryByTestId('wingsgroup-gallery')).toBeNull()

    rerender(
      <WingsGroupGallerySection
        blockType="wingsGroupGallery"
        items={[
          {
            alt: 'Hidden image',
            category: 'activity',
            id: 'hidden',
            media,
            mediaType: 'photo',
            title: 'Hidden item',
            visible: false,
          },
        ]}
        title="Gallery"
      />,
    )
    expect(screen.queryByTestId('wingsgroup-gallery')).toBeNull()
  })

  it('shows localized category and illustration labels with the editor alt text', () => {
    render(
      <WingsGroupGallerySection
        blockType="wingsGroupGallery"
        items={[
          {
            alt: 'Illustrative airline image',
            category: 'airline',
            caption: 'Illustration only',
            id: 'airline',
            illustrative: true,
            media,
            mediaType: 'logo',
            title: 'Air travel',
            visible: true,
          },
          {
            alt: 'Hidden image',
            category: 'activity',
            id: 'hidden',
            media,
            mediaType: 'photo',
            title: 'Hidden item',
            visible: false,
          },
        ]}
        locale="en"
        title="Achievements and partners"
      />,
    )

    expect(
      screen.getByRole('heading', { level: 2, name: 'Achievements and partners' }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Air travel' })).toBeTruthy()
    expect(screen.getByText('Airlines')).toBeTruthy()
    expect(screen.getByText('Illustration')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Illustrative airline image' })).toBeTruthy()
    expect(screen.queryByText('Hidden item')).toBeNull()
  })
})
