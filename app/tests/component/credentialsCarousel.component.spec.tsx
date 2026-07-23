import { fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { CredentialsCarouselBlock } from '@/blocks/CredentialsCarousel/Component'
import type { CredentialsCarouselBlock as CredentialsCarouselBlockProps } from '@/payload-types'

vi.mock('@/components/Media', () => ({
  Media: ({ resource }: { resource: { alt?: string } }) => (
    <span aria-label={resource.alt || ''} data-testid="credential-media" role="img" />
  ),
}))

const content: CredentialsCarouselBlockProps = {
  ariaLabel: 'Verified credentials',
  autoplay: false,
  blockType: 'credentialsCarousel',
  description: 'Only currently verified records are published.',
  eyebrow: 'Credentials and awards',
  fullBleed: true,
  intervalMs: 7000,
  items: [
    {
      description: 'Licence verified for the current period.',
      image: {
        alt: 'Tourism licence seal',
      } as CredentialsCarouselBlockProps['items'][number]['image'],
      issuer: 'Tourism authority',
      kind: 'cert',
      label: 'Certificate',
      mark: 'CERT',
      recipient: 'WingSide',
      reviewStatus: 'verified',
      title: 'Tourism operating licence',
    },
    {
      description: 'Recognition based on a published award record.',
      kind: 'award',
      issuer: 'Travel association',
      label: 'Award',
      mark: 'AWD',
      recipient: 'WingSide',
      reviewStatus: 'verified',
      title: 'Travel service award',
    },
  ],
  title: 'Trust backed by evidence',
}

describe('CredentialsCarouselBlock', () => {
  it('renders editor-managed section copy, media and fallback marks', () => {
    render(<CredentialsCarouselBlock {...content} />)

    expect(screen.getByRole('heading', { name: 'Trust backed by evidence' })).toBeTruthy()
    expect(screen.getByText('Only currently verified records are published.')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Tourism licence seal' })).toBeTruthy()
    expect(screen.getByText('AWD')).toBeTruthy()
  })

  it('moves between editor-managed slides using accessible controls', () => {
    const { container } = render(<CredentialsCarouselBlock {...content} />)
    const slides = container.querySelectorAll<HTMLElement>('.ws-hifi-creds__slide')

    expect(slides[0]?.dataset.active).toBe('true')
    fireEvent.click(within(container).getByRole('button', { name: /next/i }))
    expect(slides[1]?.dataset.active).toBe('true')
  })

  it('omits records awaiting review and uses a compact counter for a long catalog', () => {
    const verified = content.items[0]!
    const longContent: CredentialsCarouselBlockProps = {
      ...content,
      items: [
        ...Array.from({ length: 13 }, (_, index) => ({
          ...verified,
          id: `verified-${index}`,
          mark: `V${index}`,
          title: `Verified award ${index + 1}`,
        })),
        {
          ...verified,
          id: 'needs-review',
          mark: 'REVIEW',
          reviewStatus: 'needs-review',
          title: 'Unverified award',
        },
      ],
    }
    const { container } = render(<CredentialsCarouselBlock {...longContent} />)

    expect(container.querySelectorAll('.ws-hifi-creds__slide')).toHaveLength(13)
    expect(screen.queryByText('Unverified award')).toBeNull()
    expect(screen.getByText('01 / 13')).toBeTruthy()
    expect(container.querySelector('.ws-hifi-creds__dots')).toBeNull()
  })

  it('does not fall back to sample credentials when every CMS item needs review', () => {
    const needsReview = content.items[0]!
    const reviewOnlyContent: CredentialsCarouselBlockProps = {
      ...content,
      items: [
        {
          ...needsReview,
          id: 'needs-review-only',
          reviewStatus: 'needs-review',
          title: 'Private until reviewed',
        },
      ],
    }
    const { container } = render(<CredentialsCarouselBlock {...reviewOnlyContent} />)

    expect(container.innerHTML).toBe('')
    expect(screen.queryByText('Private until reviewed')).toBeNull()
  })
})
