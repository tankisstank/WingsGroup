import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CredentialsCarouselBlock } from '@/blocks/CredentialsCarousel/Component'
import type { CredentialsCarouselBlock as CredentialsCarouselBlockProps } from '@/payload-types'

vi.mock('@/components/Media', () => ({
  Media: ({
    alt,
    resource,
  }: {
    alt?: string
    resource: string | { alt?: string; url?: string }
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt ?? (typeof resource === 'object' ? (resource.alt ?? '') : '')}
      data-testid="credential-media"
      src={typeof resource === 'string' ? resource : resource.url || '/x.jpg'}
    />
  ),
}))

afterEach(() => cleanup())

const media = (label: string) =>
  ({
    alt: label,
    height: 1200,
    id: label,
    url: `/${label}.jpg`,
    width: 900,
  }) as unknown as CredentialsCarouselBlockProps['items'][number]['image']

const item = (
  overrides: Partial<CredentialsCarouselBlockProps['items'][number]> = {},
): CredentialsCarouselBlockProps['items'][number] => ({
  description: 'Published from the original document.',
  id: 'record-1',
  image: media('record-1'),
  issuer: 'Bamboo Airways',
  kind: 'cert',
  label: 'Certificate',
  mark: 'CERT',
  recipient: 'Vietwings Travel',
  recognitionYear: 2025,
  reviewStatus: 'verified',
  title: 'Official Agent Certificate',
  ...overrides,
})

const content: CredentialsCarouselBlockProps = {
  ariaLabel: 'Verified credentials',
  autoplay: true,
  blockType: 'credentialsCarousel',
  description: 'Only currently verified records are published.',
  eyebrow: 'Credentials and awards',
  fullBleed: true,
  intervalMs: 7000,
  items: [
    item(),
    item({
      id: 'record-2',
      image: media('record-2'),
      issuer: 'VietJet Air',
      kind: 'award',
      recipient: 'Golden Flight',
      recognitionYear: 2022,
      title: 'Silver Tour Operator',
    }),
    item({
      id: 'record-3',
      image: media('record-3'),
      issuer: 'All Nippon Airways',
      kind: 'award',
      recipient: '',
      recognitionYear: undefined,
      title: 'Best Growth Agent',
    }),
  ],
  title: 'Trust backed by evidence',
}

describe('CredentialsCarouselBlock Proof Archive', () => {
  it('renders editor-managed section copy, filters, CTA, and active media alt', () => {
    const { container } = render(<CredentialsCarouselBlock {...content} />)

    expect(screen.getByRole('heading', { name: 'Trust backed by evidence' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Plan a private journey' }).getAttribute('href')).toBe(
      '/plan-your-trip',
    )
    expect(screen.getByRole('button', { name: 'All proof' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(
      screen.getByRole('img', {
        name: 'Bamboo Airways airline appointment issued to Vietwings Travel, 2025',
      }),
    ).toBeTruthy()
    expect(container.querySelector('.ws-hifi-creds__copy-pane')?.getAttribute('aria-live')).toBe(
      'polite',
    )
    expect(container.querySelector('.ws-hifi-creds__proof-stage')?.hasAttribute('aria-live')).toBe(
      false,
    )
  })

  it('filters records and preserves the active id when it survives', () => {
    render(<CredentialsCarouselBlock {...content} />)

    fireEvent.click(screen.getByRole('button', { name: 'View document: Silver Tour Operator' }))
    expect(screen.getByText('02 / 03')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Performance awards' }))
    expect(screen.getByText('01 / 02')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Silver Tour Operator' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Airline appointments' }))
    expect(screen.getByText('01 / 01')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Official Agent Certificate' })).toBeTruthy()
  })

  it('wraps previous and next navigation in the filtered list', () => {
    render(<CredentialsCarouselBlock {...content} />)
    fireEvent.click(screen.getByRole('button', { name: 'Airline appointments' }))
    fireEvent.click(screen.getByRole('button', { name: 'Performance awards' }))

    fireEvent.click(screen.getByRole('button', { name: 'Previous credential' }))
    expect(screen.getByRole('heading', { name: 'Best Growth Agent' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Next credential' }))
    expect(screen.getByRole('heading', { name: 'Silver Tour Operator' })).toBeTruthy()
  })

  it('supports arrow navigation and ignores editable targets plus modifier keys', () => {
    const { container } = render(
      <div>
        <input aria-label="outside input" />
        <CredentialsCarouselBlock {...content} />
      </div>,
    )
    const section = screen.getByTestId('wingsside-hifi-creds')

    fireEvent.keyDown(section, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: 'Silver Tour Operator' })).toBeTruthy()

    fireEvent.keyDown(section, { ctrlKey: true, key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: 'Silver Tour Operator' })).toBeTruthy()

    const input = within(container).getByRole('textbox', { name: 'outside input' })
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: 'Silver Tour Operator' })).toBeTruthy()
  })

  it('opens and closes the native dialog by close button and backdrop with focus return', () => {
    render(<CredentialsCarouselBlock {...content} />)
    const opener = screen.getByTestId('credentials-document-button')
    opener.focus()

    fireEvent.click(opener)
    const dialog = screen.getByTestId('credentials-dialog')
    expect(dialog.hasAttribute('open')).toBe(true)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(dialog.hasAttribute('open')).toBe(false)
    expect(document.activeElement).toBe(opener)

    fireEvent.click(opener)
    fireEvent.click(dialog)
    expect(dialog.hasAttribute('open')).toBe(false)

    fireEvent.click(opener)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(dialog.hasAttribute('open')).toBe(false)
    expect(document.activeElement).toBe(opener)
  })

  it('omits unverified, unsupported, missing-image, and id-less rows without copy fallback', () => {
    const reviewOnlyContent: CredentialsCarouselBlockProps = {
      ...content,
      items: [
        item({ id: 'needs-review', reviewStatus: 'needs-review', title: 'Private until reviewed' }),
        item({ id: 'member', kind: 'member', title: 'Association member' }),
        item({ id: 'no-image', image: undefined, title: 'No image' }),
        item({ id: '', title: 'No stable id' }),
      ],
    }
    const { container } = render(<CredentialsCarouselBlock {...reviewOnlyContent} />)

    expect(container.innerHTML).toBe('')
    expect(screen.queryByText('Private until reviewed')).toBeNull()
  })

  it('does not start a timer even when legacy autoplay fields are true', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')

    render(<CredentialsCarouselBlock {...content} />)

    expect(setIntervalSpy).not.toHaveBeenCalled()
    setIntervalSpy.mockRestore()
  })
})
