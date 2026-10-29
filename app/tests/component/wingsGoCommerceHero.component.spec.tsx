import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({
    children,
    className,
    href,
  }: {
    children: React.ReactNode
    className?: string
    href?: string
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}))

import {
  WingsGoCommerceHero,
  WingsGoHeroLargeCard,
} from '@/heros/WingsGoCommerceHero'
import type { WingsGoCatalogCard } from '@/tours/wingsGoCatalog'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const makeCard = (overrides?: Partial<WingsGoCatalogCard>): WingsGoCatalogCard => ({
  duration: { days: 5, nights: 4 },
  editorialBadges: [],
  hasHotEditorialBadge: false,
  href: '/tour/seoul-nami',
  id: 1,
  image: { alt: 'Seoul', url: '/media/seoul.jpg' },
  market: 'korea',
  nextDeparture: {
    airline: 'VJ',
    date: '2026-11-15T00:00:00.000Z',
    daysUntilDeparture: 17,
    departureCity: 'Hà Nội',
    promoLabel: null,
  },
  price: { currency: 'VND', kind: 'verified', originalPrice: 16900000, value: 14900000 },
  slug: 'seoul-nami',
  summary: 'Hành trình Seoul Nami 5N4D mùa thu.',
  title: 'Hà Nội - Seoul - Nami',
  ...overrides,
})

describe('WingsGoCommerceHero', () => {
  it('renders slot #1 with hot, sticker, and promo badges together', () => {
    const cardWithBadges = makeCard({
      editorialBadges: [
        { kind: 'hot', label: 'Tour bán chạy' },
        { kind: 'vip', label: 'Dịch vụ VIP' },
        { kind: 'specialized', label: 'Chuyên gia' },
      ],
      hasHotEditorialBadge: true,
      nextDeparture: {
        airline: 'VN',
        date: '2026-11-20T00:00:00.000Z',
        daysUntilDeparture: 22,
        departureCity: 'Hà Nội',
        promoLabel: 'Giảm 2 triệu',
      },
    })

    const { container } = render(
      <WingsGoCommerceHero
        cards={[cardWithBadges, makeCard({ id: 2 }), makeCard({ id: 3 })]}
        filtersActive={false}
        locale="vi"
      />,
    )

    const slot1 = container.querySelector('article[data-has-hot="true"]')
    expect(slot1).not.toBeNull()
    expect(slot1?.classList.contains('hot-rainbow-card')).toBe(true)

    const stickersContainer = slot1?.querySelector('[data-editorial-stickers="true"]')
    expect(stickersContainer).not.toBeNull()
    expect(stickersContainer?.textContent).toContain('Dịch vụ VIP')
    expect(stickersContainer?.textContent).toContain('Chuyên gia')

    expect(slot1?.textContent).toContain('Giảm 2 triệu')
    expect(slot1?.textContent).toContain('Khởi hành sau 22 ngày')
  })

  it('renders card without badges with no badge classes or empty wrappers', () => {
    const cardWithoutBadges = makeCard({
      editorialBadges: [],
      hasHotEditorialBadge: false,
      nextDeparture: {
        airline: null,
        date: '2026-12-01T00:00:00.000Z',
        daysUntilDeparture: null,
        departureCity: null,
        promoLabel: null,
      },
    })

    const { container } = render(
      <WingsGoCommerceHero
        cards={[cardWithoutBadges]}
        filtersActive={false}
        locale="vi"
      />,
    )

    const slot1 = container.querySelector('article')
    expect(slot1).not.toBeNull()
    expect(slot1?.getAttribute('data-has-hot')).toBeNull()
    expect(slot1?.classList.contains('hot-rainbow-card')).toBe(false)
    expect(slot1?.querySelector('[data-editorial-stickers="true"]')).toBeNull()
    expect(slot1?.querySelector('.lucide-flame')).toBeNull()
  })

  it('renders EN copy with no Vietnamese strings and verified /en links', () => {
    const card = makeCard({
      href: '/en/tour/seoul-nami',
      nextDeparture: {
        airline: 'VJ',
        date: '2026-11-15T00:00:00.000Z',
        daysUntilDeparture: 5,
        departureCity: 'Hanoi',
        promoLabel: null,
      },
    })

    const { container } = render(
      <WingsGoCommerceHero
        cards={[card, makeCard({ href: '/en/tour/tokyo', id: 2 })]}
        filtersActive={false}
        locale="en"
      />,
    )

    expect(screen.getByRole('form', { name: 'Quick tour search' })).toBeTruthy()
    const text = container.textContent || ''
    expect(text).toContain('Explore the World with WingsGo')
    expect(text).toContain('All destinations')
    expect(text).toContain('Departure month')
    expect(text).toContain('Search tours')
    expect(text).toContain('Trending tours')
    expect(text).toContain('Departs in 5 days')

    // No Vietnamese strings in UI copy
    expect(text).not.toContain('Khám phá')
    expect(text).not.toContain('Tìm kiếm tour')
    expect(text).not.toContain('Tất cả điểm đến')
    expect(text).not.toContain('Tháng khởi hành')
    expect(text).not.toContain('Tìm tour')
    expect(text).not.toContain('Tour đang được quan tâm')
    expect(text).not.toContain('Khởi hành sau')

    // All tour links have /en prefix
    const links = Array.from(container.querySelectorAll('a'))
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^\/en\//)
    }
  })

  it('localizes contact-price label for non-verified price in VI and EN', () => {
    const contactCardVI = makeCard({
      price: { kind: 'contact', label: 'Liên hệ để nhận giá mới nhất' },
    })

    const { container: containerVI } = render(
      <WingsGoHeroLargeCard card={contactCardVI} locale="vi" />,
    )
    expect(containerVI.textContent).toContain('Liên hệ để nhận giá mới nhất')

    cleanup()

    const contactCardEN = makeCard({
      price: { kind: 'contact', label: 'Liên hệ để nhận giá mới nhất' },
    })
    const { container: containerEN } = render(
      <WingsGoHeroLargeCard card={contactCardEN} locale="en" />,
    )
    expect(containerEN.textContent).toContain('Contact us for latest pricing')
  })

  it('filtersActive=true renders only title and search bar with no cards or wrappers', () => {
    const { container } = render(
      <WingsGoCommerceHero
        cards={[makeCard({ id: 1 }), makeCard({ id: 2 })]}
        filtersActive={true}
        locale="vi"
      />,
    )

    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
    expect(screen.getByRole('form')).toBeTruthy()
    expect(container.querySelector('article')).toBeNull()
    expect(container.querySelector('.site-departure-stack')).toBeNull()
  })

  it('quick search submit calls router.push with expected params, { scroll: false }, and never calls scrollIntoView', () => {
    const scrollIntoViewMock = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock

    render(
      <WingsGoCommerceHero
        cards={[makeCard()]}
        filtersActive={false}
        initialFilters={{ sort: 'price' }}
        locale="vi"
      />,
    )

    const form = screen.getByRole('form')
    const marketSelect = screen.getByLabelText('Điểm đến') as HTMLSelectElement
    const monthSelect = screen.getByLabelText('Tháng khởi hành') as HTMLSelectElement
    const seasonSelect = screen.getByLabelText('Mùa') as HTMLSelectElement

    fireEvent.change(marketSelect, { target: { value: 'korea' } })
    fireEvent.change(monthSelect, { target: { value: '2026-11' } })
    fireEvent.change(seasonSelect, { target: { value: 'autumn' } })

    fireEvent.submit(form)

    expect(mockPush).toHaveBeenCalledTimes(1)
    const [targetUrl, options] = mockPush.mock.calls[0]
    expect(options).toEqual({ scroll: false })
    expect(scrollIntoViewMock).not.toHaveBeenCalled()

    const parsed = new URL(targetUrl, 'http://localhost')
    expect(parsed.pathname).toBe('/tour')
    expect(parsed.searchParams.get('market')).toBe('korea')
    expect(parsed.searchParams.get('departureMonth')).toBe('2026-11')
    expect(parsed.searchParams.get('season')).toBe('autumn')
    expect(parsed.searchParams.get('cursor')).toBeNull()
    expect(parsed.searchParams.get('offset')).toBeNull()
  })
})
