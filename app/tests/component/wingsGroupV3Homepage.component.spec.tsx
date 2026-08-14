import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WingsGroupEcosystemComponent } from '@/blocks/WingsGroupEcosystem/Component'
import { WingsGroupProofArchiveComponent } from '@/blocks/WingsGroupProofArchive/Component'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { WingsGroupTrustSection } from '@/blocks/WingsGroupTrust/Component'
import { WingsGroupConsultationDialog } from '@/components/WingsGroupV3/ConsultationDialog'
import { WingsGroupEditorialHero } from '@/components/WingsGroupV3/EditorialHero'
import type { Media, Page, WingsGroupEcosystemBlock } from '@/payload-types'

vi.mock('@/components/WingsGroupV3/EditorialRail', () => ({
  WingsGroupEditorialRail: ({ locale }: { locale?: null | string }) => (
    <div data-testid="editorial-rail-locale">{locale}</div>
  ),
}))

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
      provenanceReference: `manifest:media-${id}`,
      rightsEvidence: 'stakeholder-rights-approval',
      rightsState: 'approved',
      sourceArchiveSha256: sha,
      sourceAttachmentId: 'attachment-1',
      sourceFileSha256: sha,
      sourceIdentity: `attachment-1:${sha}`,
      usageScope,
    },
    id,
    site: {
      code: 'wings-group',
      createdAt: '2026-08-14T00:00:00.000Z',
      defaultLocale: 'vi',
      id: 1,
      name: 'WingsGroup',
      primaryDomain: 'wingsgroup.vn',
      supportedLocales: ['vi', 'en'],
      updatedAt: '2026-08-14T00:00:00.000Z',
    },
    updatedAt: '2026-08-14T00:00:00.000Z',
    url: `/media/${id}.png`,
  }) as Media

const profile = (
  brandKey: WingsGroupEcosystemBlock['profiles'][number]['brandKey'],
  brandName: string,
  overrides: Partial<WingsGroupEcosystemBlock['profiles'][number]> = {},
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
  ...overrides,
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
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('WingsGroup v3 public components', () => {
  it('forwards the English locale when RenderBlocks substitutes the governed editorial rail', () => {
    const archive = {
      blockType: 'archive',
      limit: 3,
      populateBy: 'collection',
    } as Page['layout'][number]

    render(<RenderBlocks blocks={[archive]} locale="en" wingsGroupV3Home />)

    expect(screen.getByTestId('editorial-rail-locale').textContent).toBe('en')
  })

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

  it('does not present profile proofState as verified without an approved proof record key', () => {
    render(
      <WingsGroupEcosystemComponent
        blockType="wingsGroupEcosystem"
        profiles={[
          profile('wingsgo', 'WingsGo', {
            proofReferences: [{ key: 'unverified-reference' }],
            proofState: 'approved',
          }),
          profile('wing-side', 'WingSide'),
        ]}
        title="Ecosystem"
      />,
    )

    expect(screen.getByText('Đang cập nhật')).toBeTruthy()
    expect(screen.queryByText('Đã có thông tin được xác minh')).toBeNull()
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

  it('renders the approved legal identity while keeping the three trust gates pending', () => {
    render(<WingsGroupTrustSection locale="vi" />)

    expect(screen.getByRole('heading', { name: 'Minh bạch để bạn an tâm lựa chọn.' })).toBeTruthy()
    expect(screen.getByText('CÔNG TY CỔ PHẦN DU LỊCH ĐÔI CÁNH VIỆT')).toBeTruthy()
    expect(screen.getAllByText('Đang cập nhật')).toHaveLength(3)
    expect(document.querySelector('[data-od-id="trust"]')).toBeTruthy()
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

  it('uses the shared specialist dialog trigger and returns focus after Escape', () => {
    render(
      <>
        <button data-wingsgroup-consultation-trigger="true" type="button">
          Open consultation
        </button>
        <WingsGroupConsultationDialog />
      </>,
    )

    const trigger = screen.getByRole('button', { name: 'Open consultation' })
    const dialog = document.querySelector<HTMLDialogElement>('[data-od-id="consultation-dialog"]')
    expect(dialog).toBeTruthy()
    trigger.focus()
    fireEvent.click(trigger)
    expect(dialog?.hasAttribute('open')).toBe(true)
    expect(screen.getByRole('heading', { name: 'Trao đổi với chuyên viên.' })).toBeTruthy()

    fireEvent.keyDown(dialog!, { key: 'Escape' })
    expect(dialog?.hasAttribute('open')).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })
})
