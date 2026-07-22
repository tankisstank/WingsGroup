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
      kind: 'cert',
      label: 'Certificate',
      mark: 'CERT',
      title: 'Tourism operating licence',
    },
    {
      description: 'Recognition based on a published award record.',
      kind: 'award',
      label: 'Award',
      mark: 'AWD',
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
})
