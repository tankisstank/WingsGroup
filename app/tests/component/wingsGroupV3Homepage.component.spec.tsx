import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WingsGroupEcosystemComponent } from '@/blocks/WingsGroupEcosystem/Component'
import { WingsGroupCapabilitySection } from '@/blocks/WingsGroupCapability/Component'
import { WingsGroupCorporateSection } from '@/blocks/WingsGroupCorporate/Component'
import { WingsGroupProofArchiveComponent } from '@/blocks/WingsGroupProofArchive/Component'
import { RenderBlocks } from '@/blocks/RenderBlocks'
import { WingsGroupTrustSection } from '@/blocks/WingsGroupTrust/Component'
import { WingsGroupConsultationDialog } from '@/components/WingsGroupV3/ConsultationDialog'
import { WingsGroupEditorialHero } from '@/components/WingsGroupV3/EditorialHero'
import { JourneyInquiryGrid } from '@/components/WingsGroupV3/JourneyInquiryGrid'
import { WingsGroupTestimonialsSection } from '@/components/WingsGroupV3/TestimonialsSection'
import type { Media, Page, WingsGroupEcosystemBlock } from '@/payload-types'

const navigationMock = vi.hoisted(() => ({ push: vi.fn() }))
const siteLocaleMock = vi.hoisted(() => ({ value: 'vi' as 'en' | 'vi' }))

vi.mock('next/navigation', () => ({
  useRouter: () => navigationMock,
}))

vi.mock('@/providers/SitePath', () => ({
  useSitePublicLocale: () => siteLocaleMock.value,
  useSitePublicPathname: () => (siteLocaleMock.value === 'en' ? '/en/' : '/'),
}))

vi.mock('@/utilities/useSitePath', () => ({
  useSitePath: () => (path: string) => (siteLocaleMock.value === 'en' ? `/en${path}` : path),
}))

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
  siteLocaleMock.value = 'vi'
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

  it('stacks the consultation eyebrow above the journey heading', () => {
    render(<JourneyInquiryGrid />)

    const eyebrow = screen.getByText('Tư vấn theo nhu cầu')
    const heading = screen.getByRole('heading', {
      name: 'Bạn đang chuẩn bị cho hành trình nào?',
    })

    expect(eyebrow.parentElement).toBe(heading.parentElement)
    expect(
      eyebrow.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('stacks the testimonials eyebrow above the client heading', () => {
    render(<WingsGroupTestimonialsSection locale="vi" />)

    const eyebrow = screen.getByText('ĐÁNH GIÁ & PHẢN HỒI THỰC TẾ')
    const heading = screen.getByRole('heading', { name: 'Khách hàng nói gì về WingsGroup?' })

    expect(eyebrow.parentElement).toBe(heading.parentElement)
    expect(
      eyebrow.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('forwards the English locale and legal identity to the home trust block', () => {
    const infoStrip = {
      blockType: 'infoStrip',
      description: 'Trust block fixture',
      title: 'Trust',
    } as Page['layout'][number]

    render(
      <RenderBlocks
        blocks={[infoStrip]}
        locale="en"
        wingsGroupLegalIdentity={{ internationalName: 'VIETWINGS.,JSC' }}
        wingsGroupV3
        wingsGroupV3Home
        wingsGroupV3Route="home"
      />,
    )

    expect(screen.getByText('Company information')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Choose with more confidence.' })).toBeTruthy()
    expect(screen.getByText('VIETWINGS.,JSC')).toBeTruthy()
    expect(screen.getByRole('link', { name: /View the corporate and legal profile/ })).toBeTruthy()
    expect(screen.queryByText('Thông tin doanh nghiệp')).toBeNull()
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
    expect(screen.queryByText('Đang cập nhật')).toBeNull()
    expect(
      screen.getByRole('link', { name: /Trao đổi với chuyên viên/ }).getAttribute('href'),
    ).toBe('/lien-he#contact-form')

    const wingSideTab = screen.getByRole('tab', { name: /WingSide/ })
    fireEvent.click(wingSideTab)
    expect(screen.getByRole('heading', { name: 'WingSide', level: 3 })).toBeTruthy()
    expect(screen.getByAltText('WingSide editorial scene')).toBeTruthy()
    expect(screen.getAllByText('WingSide service profile')).toHaveLength(2)
    expect(
      screen.getByRole('link', { name: /Trao đổi với chuyên viên/ }).getAttribute('href'),
    ).toBe('/lien-he#contact-form')
  })

  it('renders the English explorer rail and service presentation as a parallel locale', () => {
    render(
      <WingsGroupEcosystemComponent
        blockType="wingsGroupEcosystem"
        locale="en"
        profiles={[profile('wingsgo', 'WingsGo')]}
        title="One ecosystem. Five ways to move forward."
      />,
    )

    expect(screen.getByText('OUTBOUND TRAVEL')).toBeTruthy()
    expect(screen.getByText('Go further, prepared.')).toBeTruthy()
    expect(screen.getByRole('tab', { name: /Explore/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Speak with a WingsGroup specialist' })).toBeTruthy()
    expect(screen.queryByText('Being updated')).toBeNull()
    expect(screen.queryByText(/publication review|endpoint|Service feedback/i)).toBeNull()
    expect(screen.queryByText('Đang cập nhật')).toBeNull()
  })

  it('keeps the governed explorer in canonical five-profile order', () => {
    render(
      <WingsGroupEcosystemComponent
        blockType="wingsGroupEcosystem"
        locale="vi"
        profiles={[
          profile('wingscare', 'WingsCare'),
          profile('wingsplus', 'WingsPlus'),
          profile('wingsgo', 'WingsGo'),
          profile('wingspass', 'WingsPass'),
          profile('wing-side', 'WingSide'),
        ]}
        title="Một hệ sinh thái. Năm cách đồng hành."
      />,
    )

    expect(screen.getByTestId('wingsgroup-ecosystem').dataset.profileCount).toBe('5')
    expect(screen.getAllByRole('tab').map((tab) => tab.querySelector('b')?.textContent)).toEqual([
      'WingsGo',
      'WingSide',
      'WingsPass',
      'WingsPlus',
      'WingsCare',
    ])
    expect(screen.getAllByText('WingsGo service profile')).toHaveLength(2)
  })

  it('renders capability as five contact-fallback service rows instead of generic cards', () => {
    render(
      <WingsGroupCapabilitySection
        description="Mỗi thương hiệu tập trung vào một hành trình phục vụ rõ ràng."
        eyebrow="Năng lực"
        items={[
          { description: 'one', title: 'one' },
          { description: 'two', title: 'two' },
          { description: 'three', title: 'three' },
          { description: 'four', title: 'four' },
        ]}
        locale="vi"
        title="Dịch vụ được tổ chức theo nhu cầu"
      />,
    )

    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(screen.getByRole('heading', { name: 'WingsCare', level: 3 })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /Trao đổi nhu cầu/ })).toHaveLength(5)
    expect(
      screen
        .getAllByRole('link')
        .every((link) => link.getAttribute('href') === '/lien-he#contact-form'),
    ).toBe(true)
  })

  it('renders only the approved corporate relationship wording and identity', () => {
    render(<WingsGroupCorporateSection locale="vi" />)

    expect(screen.getByTestId('wingsgroup-corporate').dataset.relationshipStatement).toBe(
      'governed',
    )
    expect(
      screen.getByText(
        'WingsGroup là thương hiệu phát triển mới trong cùng hệ sinh thái tổ chức với VietWings và Đôi Cánh Việt. Hệ sinh thái tiếp tục phát triển các thương hiệu WingsGo, WingSide, WingsCare và các dịch vụ liên quan.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('CÔNG TY CỔ PHẦN DU LỊCH ĐÔI CÁNH VIỆT')).toBeTruthy()
    expect(screen.queryByText(/đối tác chiến lược|hàng đầu|phục vụ hàng triệu/i)).toBeNull()
  })

  it('uses the approved Vietnamese representative label without legal-representative wording', () => {
    render(<WingsGroupCorporateSection locale="vi" />)

    expect(screen.getByText('Người đại diện')).toBeTruthy()
    expect(screen.queryByText(/Người đại diện pháp luật/i)).toBeNull()
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

    expect(screen.queryByText('Đang cập nhật')).toBeNull()
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

    expect(screen.getAllByText('Đang cập nhật')).toHaveLength(4)
    expect(screen.getAllByTestId('wingsgroup-proof-record')).toHaveLength(4)
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

  it('renders approved business figures in both locales without changing proof-gate state', () => {
    const items = [
      {
        description: 'Số liệu do WingsGroup cung cấp.',
        label: 'Khách hàng cá nhân đồng hành',
        value: '10.000+',
      },
      {
        description: 'Figures supplied by WingsGroup.',
        label: 'Individual travellers served',
        value: '10,000+',
      },
    ] as never

    const { rerender } = render(<WingsGroupTrustSection items={items} locale="vi" />)
    expect(screen.getByText('10.000+')).toBeTruthy()
    expect(screen.getByText('Khách hàng cá nhân đồng hành')).toBeTruthy()
    expect(screen.getAllByText('Đang cập nhật')).toHaveLength(3)

    rerender(<WingsGroupTrustSection items={items} locale="en" />)
    expect(screen.getByText('10,000+')).toBeTruthy()
    expect(screen.getByText('Individual travellers served')).toBeTruthy()
    expect(screen.getAllByText('Being updated')).toHaveLength(3)
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

  it('keeps a deterministic, non-blank English hero fallback until media is approved', () => {
    siteLocaleMock.value = 'en'
    render(
      <WingsGroupEditorialHero
        behaviorMode="override"
        behaviorOverrides={{ autoplay: false }}
        links={[]}
        presentation="cinematic-carousel"
        resolvedLocale="en"
        richText={null}
        slides={[]}
        type="highImpact"
      />,
    )

    expect(screen.getByText('WingsGroup image pending governed publication.')).toBeTruthy()
    expect(document.querySelector('[data-media-state="safe-fallback"]')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('keeps the ecosystem stage readable when governed media is unavailable', () => {
    render(
      <WingsGroupEcosystemComponent
        blockType="wingsGroupEcosystem"
        locale="en"
        profiles={[profile('wingsgo', 'WingsGo', { stageMedia: null as never })]}
        title="Choose a service team"
      />,
    )

    expect(
      screen.getByText('A governed service image will appear here when available.'),
    ).toBeTruthy()
    expect(document.querySelector('[data-media-state="safe-fallback"]')).toBeTruthy()
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

  it('routes to the governed contact form without rendering unavailable channels', () => {
    render(<WingsGroupConsultationDialog />)

    const trigger = screen.getByRole('button', { name: 'Trao đổi với chuyên viên' })
    fireEvent.click(trigger)
    expect(screen.queryByText('Chờ cập nhật')).toBeNull()
    expect(
      screen.queryByRole('button', { name: /Zalo|WhatsApp|Messenger|Chuyên viên gọi lại/ }),
    ).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Để lại nhu cầu/ }))

    expect(navigationMock.push).toHaveBeenCalledWith('/lien-he#contact-form')
    expect(window.sessionStorage.getItem('wingsgroup-contact-focus')).toBe('contact-form')
    expect(document.querySelector('[data-od-id="consultation-dialog"] a[href]')).toBeNull()
  })

  it('localizes the consultation dialog and preserves the English contact path', () => {
    siteLocaleMock.value = 'en'
    render(<WingsGroupConsultationDialog />)

    fireEvent.click(screen.getByRole('button', { name: 'Speak with a specialist' }))
    expect(screen.getByRole('heading', { name: 'Speak with a specialist.' })).toBeTruthy()
    expect(screen.getByText(/Share what you need\./)).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Share your plans/ })).toBeTruthy()
    expect(screen.queryByText('Being updated')).toBeNull()
    expect(screen.queryByText(/External channels|Zalo|WhatsApp|Messenger/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /^Share your plans/ }))
    expect(navigationMock.push).toHaveBeenCalledWith('/en/lien-he#contact-form')
  })
})
