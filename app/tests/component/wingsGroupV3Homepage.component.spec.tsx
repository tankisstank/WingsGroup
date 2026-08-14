import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WingsGroupEcosystemComponent } from '@/blocks/WingsGroupEcosystem/Component'
import { WingsGroupProofArchiveComponent } from '@/blocks/WingsGroupProofArchive/Component'
import { WingsGroupEditorialHero } from '@/components/WingsGroupV3/EditorialHero'
import type { Media, WingsGroupEcosystemBlock } from '@/payload-types'

vi.mock('@/components/Media', () => ({
  Media: ({ resource }: { resource?: { alt?: string; url?: string } }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={resource?.alt || ''} src={resource?.url || ''} />
  ),
}))

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/Link', () => ({
  CMSLink: ({ className, label, url }: { className?: string; label?: string; url?: string }) => (
    <a className={className} href={url}>
      {label}
    </a>
  ),
}))

vi.mock('@/components/RichText', () => ({
  default: () => <h1>Thoughtful journeys, one connected team</h1>,
}))

vi.mock('@/providers/HeaderTheme', () => ({
  useHeaderTheme: () => ({ setHeaderTheme: vi.fn() }),
}))

const sha = 'a'.repeat(64)
const media = (id: number, alt: string, usageScope?: 'editorial-service'): Media =>
  ({
    alt,
    createdAt: '2026-08-14T00:00:00.000Z',
    governance: {
      derivativeState: 'verified',
      managedBy: 'wingsgroup-v3',
      publicationState: 'published',
      responsiveDerivatives: [
        { format: 'webp', sha256: sha, url: 'https://cdn.example/a.webp', width: 1280 },
        { format: 'avif', sha256: sha, url: 'https://cdn.example/a.avif', width: 1280 },
      ],
      rightsState: 'approved',
      usageScope,
    },
    id,
    site: 1,
    updatedAt: '2026-08-14T00:00:00.000Z',
    url: `/media/${id}.png`,
  }) as Media

const profile = (
  brandKey: WingsGroupEcosystemBlock['profiles'][number]['brandKey'],
  brandName: string,
): WingsGroupEcosystemBlock['profiles'][number] => ({
  brandKey,
  brandName,
  cta: {
    label: `Tư vấn ${brandName}`,
    state: 'contact-fallback',
  },
  description: `${brandName} service profile`,
  proofState: 'pending',
  serviceScope: [{ label: 'Travel planning' }],
  stageMedia: media(brandKey === 'wingsgo' ? 1 : 2, `${brandName} editorial scene`),
})

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    }),
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('WingsGroup v3 public components', () => {
  it('keeps the ecosystem profile, stage, scope, proof state and CTA synchronized', () => {
    render(
      <WingsGroupEcosystemComponent
        blockType="wingsGroupEcosystem"
        locale="vi"
        profiles={[profile('wingsgo', 'WingsGo'), profile('wing-side', 'WingSide')]}
        title="Một hệ sinh thái, nhiều nhu cầu"
      />,
    )

    expect(screen.getByRole('heading', { name: 'WingsGo', level: 3 })).toBeTruthy()
    expect(screen.getByAltText('WingsGo editorial scene')).toBeTruthy()
    expect(screen.getByText('Đang cập nhật')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Tư vấn WingsGo/ }).getAttribute('href')).toBe(
      '/lien-he#contact-form',
    )

    const wingSideTab = screen.getByRole('tab', { name: /WingSide/ })
    fireEvent.click(wingSideTab)
    expect(screen.getByRole('heading', { name: 'WingSide', level: 3 })).toBeTruthy()
    expect(screen.getByAltText('WingSide editorial scene')).toBeTruthy()
    expect(screen.getByText('WingSide service profile')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Tư vấn WingSide/ }).getAttribute('href')).toBe(
      '/lien-he#contact-form',
    )
  })

  it('supports roving tab focus with arrow, Home and End keys', () => {
    render(
      <WingsGroupEcosystemComponent
        blockType="wingsGroupEcosystem"
        profiles={[profile('wingsgo', 'WingsGo'), profile('wing-side', 'WingSide')]}
        title="Ecosystem"
      />,
    )

    const wingsGo = screen.getByRole('tab', { name: /WingsGo/ })
    const wingSide = screen.getByRole('tab', { name: /WingSide/ })
    wingsGo.focus()
    fireEvent.keyDown(wingsGo, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(wingSide)
    expect(wingSide.getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(wingSide, { key: 'Home' })
    expect(document.activeElement).toBe(wingsGo)
  })

  it('renders a neutral pending Proof Archive without unapproved claims or media', () => {
    render(
      <WingsGroupProofArchiveComponent
        blockType="wingsGroupProofArchive"
        locale="vi"
        records={[
          {
            key: 'private-record',
            kind: 'award',
            media: media(3, 'Unapproved award', 'editorial-service'),
            permissionState: 'pending',
            publicationState: 'pending',
            title: 'Unapproved partner award',
          },
        ]}
        title="Proof Archive"
      />,
    )

    expect(screen.getByText('Đang cập nhật')).toBeTruthy()
    expect(screen.queryByText('Unapproved partner award')).toBeNull()
    expect(screen.queryByAltText('Unapproved award')).toBeNull()
    expect(screen.queryByText(/rating/i)).toBeNull()
  })

  it('pauses hero autoplay after manual navigation and keeps both CTAs internal', () => {
    vi.useFakeTimers()
    render(
      <WingsGroupEditorialHero
        behaviorMode="override"
        behaviorOverrides={{ autoplay: true, intervalMs: 3000, showArrows: true, showDots: true }}
        links={[
          { link: { label: 'Discover', type: 'custom', url: '#ecosystem' } },
          { link: { label: 'Consult', type: 'custom', url: 'https://unapproved.example' } },
        ]}
        presentation="cinematic-carousel"
        resolvedLocale="en"
        richText={{ root: {} } as never}
        slides={[
          { media: media(10, 'First story'), title: 'First story' },
          { media: media(11, 'Second story'), title: 'Second story' },
        ]}
        type="highImpact"
      />,
    )

    expect(screen.getByRole('link', { name: 'Discover' }).getAttribute('href')).toBe('#ecosystem')
    expect(screen.getByRole('link', { name: 'Request a consultation' }).getAttribute('href')).toBe(
      '/lien-he#contact-form',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next hero story' }))
    expect(screen.getByAltText('Second story')).toBeTruthy()
    act(() => vi.advanceTimersByTime(9000))
    expect(screen.getByAltText('Second story')).toBeTruthy()
  })
})
