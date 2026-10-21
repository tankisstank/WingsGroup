import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WingsGoTourCard } from '@/tours/WingsGoTourCard'
import { TourMarketPage } from '@/tours/StructuredPages'
import type { WingsGoCatalogCard } from '@/tours/wingsGoCatalog'
import type { TourCardViewModel } from '@/tours/types'

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))
vi.mock('@/blocks/Form/Component', () => ({ FormBlock: () => null }))
vi.mock('@/components/Media', () => ({ Media: () => null }))

afterEach(cleanup)

const makeCatalogCard = (overrides?: Partial<WingsGoCatalogCard>): WingsGoCatalogCard => ({
  duration: { days: 5, nights: 4 },
  href: '/tour/seoul-autumn',
  id: 101,
  image: { alt: 'Seoul', url: '/media/seoul.jpg' },
  market: 'korea',
  nextDeparture: {
    airline: 'Vietnam Airlines',
    date: '2026-11-15T00:00:00.000Z',
    departureCity: 'Hà Nội',
    promoLabel: null,
  },
  price: {
    currency: 'VND',
    kind: 'verified',
    originalPrice: 15000000,
    value: 12500000,
  },
  slug: 'seoul-autumn',
  summary: 'Khám phá Seoul mùa thu vàng.',
  title: 'Hành trình Seoul mùa lá đỏ',
  ...overrides,
})

const makeMarketTour = (overrides?: Partial<TourCardViewModel>): TourCardViewModel => ({
  departureCount: 2,
  hasFutureDepartures: true,
  id: 201,
  lowestPrice: 12500000,
  market: 'korea',
  nextDeparture: {
    airline: 'Vietnam Airlines',
    availabilityStatus: 'open',
    commerceVerified: true,
    currency: 'VND',
    departureDate: '2026-11-15T00:00:00.000Z',
    originalPrice: 15000000,
    priceFrom: 12500000,
    promoLabel: null,
  },
  slug: 'seoul-autumn',
  summary: 'Khám phá Seoul mùa thu vàng.',
  title: 'Hành trình Seoul mùa lá đỏ',
  ...overrides,
})

describe('US-084 WingsGoTourCard Editorial Badges Component Tests', () => {
  it('renders clean baseline layout when card has no editorial badges', () => {
    const card = makeCatalogCard({
      editorialBadges: [],
      hasHotEditorialBadge: false,
    })
    const { container } = render(<WingsGoTourCard card={card} locale="vi" />)

    const article = container.querySelector('article')
    expect(article?.className).not.toContain('hot-rainbow-card')
    expect(article?.getAttribute('data-has-hot')).toBeNull()
    expect(container.querySelector('[data-editorial-stickers]')).toBeNull()
  })

  it('renders exact hot 2px rainbow conic-gradient outer border with accessible text when card has hot badge', () => {
    const card = makeCatalogCard({
      editorialBadges: [{ kind: 'hot', label: 'Tour hot' }],
      hasHotEditorialBadge: true,
    })
    const { container } = render(<WingsGoTourCard card={card} locale="vi" />)

    const article = container.querySelector('article')
    expect(article?.className).toContain('hot-rainbow-card')
    expect(article?.getAttribute('data-has-hot')).toBe('true')

    // Screen reader accessible label for hot badge
    const srOnly = container.querySelector('.sr-only')
    expect(srOnly?.textContent).toBe('Tour hot')

    // No sticker container rendered when only hot is present
    expect(container.querySelector('[data-editorial-stickers]')).toBeNull()
  })

  it('renders specialized sticker at top-left with dark styling and normal card border', () => {
    const card = makeCatalogCard({
      editorialBadges: [{ kind: 'specialized', label: 'Specialize' }],
      hasHotEditorialBadge: false,
    })
    const { container } = render(<WingsGoTourCard card={card} locale="vi" />)

    const article = container.querySelector('article')
    expect(article?.className).not.toContain('hot-rainbow-card')

    const stickersContainer = container.querySelector('[data-editorial-stickers]')
    expect(stickersContainer).not.toBeNull()
    const overlay = stickersContainer?.closest('.inset-x-3')
    expect(overlay?.className).toContain('top-3')
    expect(overlay?.className).toContain('justify-between')

    expect(screen.getByText('Specialize')).toBeTruthy()
  })

  it('renders vip sticker at top-left with gold styling and normal card border', () => {
    const card = makeCatalogCard({
      editorialBadges: [{ kind: 'vip', label: 'VIP' }],
      hasHotEditorialBadge: false,
    })
    const { container } = render(<WingsGoTourCard card={card} locale="vi" />)

    const stickersContainer = container.querySelector('[data-editorial-stickers]')
    expect(stickersContainer).not.toBeNull()

    const vipBadge = screen.getByText('VIP')
    expect(vipBadge).toBeTruthy()
    expect(vipBadge.className).toContain('from-amber-400')
  })

  it('renders hot rainbow border and top-left stickers together in data order', () => {
    const card = makeCatalogCard({
      editorialBadges: [
        { kind: 'hot', label: 'Tour hot' },
        { kind: 'specialized', label: 'Specialize' },
        { kind: 'vip', label: 'VIP' },
      ],
      hasHotEditorialBadge: true,
    })
    const { container } = render(<WingsGoTourCard card={card} locale="vi" />)

    // Has rainbow border
    const article = container.querySelector('article')
    expect(article?.className).toContain('hot-rainbow-card')

    // Has accessible hot text
    expect(container.querySelector('.sr-only')?.textContent).toBe('Tour hot')

    // Has both stickers in top-left
    const stickersContainer = container.querySelector('[data-editorial-stickers]')
    expect(stickersContainer).not.toBeNull()
    const stickers = stickersContainer?.querySelectorAll('span')
    expect(stickers?.length).toBe(2)
    expect(stickers?.[0]?.textContent).toBe('Specialize')
    expect(stickers?.[1]?.textContent).toBe('VIP')
  })

  it('guarantees separation and prevents collision between editorial stickers (top-left) and promoLabel (top-right)', () => {
    const card = makeCatalogCard({
      editorialBadges: [
        { kind: 'specialized', label: 'Specialize' },
        { kind: 'vip', label: 'VIP' },
      ],
      hasHotEditorialBadge: false,
      nextDeparture: {
        ...makeCatalogCard().nextDeparture,
        promoLabel: 'Giảm 2.500.000đ',
      },
    })
    const { container } = render(<WingsGoTourCard card={card} locale="vi" />)

    // Shared anti-collision overlay
    const stickersContainer = container.querySelector('[data-editorial-stickers]')
    expect(stickersContainer).not.toBeNull()
    const overlay = stickersContainer?.closest('.inset-x-3')
    expect(overlay?.className).toContain('justify-between')
    expect(overlay?.className).toContain('gap-2')
    expect(stickersContainer?.className).toContain('max-w-[calc(100%-110px)]')

    // Right promo badge
    const promoText = screen.getByText('Giảm 2.500.000đ')
    expect(promoText).toBeTruthy()
    const promoWrapper = promoText.closest('span.flex')
    expect(promoWrapper?.className).toContain('justify-end')
  })

  it('truncates long labels to protect mobile and card layout from overflow', () => {
    const longText = 'Tour chuyên biệt khám phá mùa thu Đông Bắc Á cao cấp 2026'
    const card = makeCatalogCard({
      editorialBadges: [{ kind: 'specialized', label: longText }],
      hasHotEditorialBadge: false,
    })
    const { container } = render(<WingsGoTourCard card={card} locale="vi" />)

    const sticker = screen.getByText(longText)
    expect(sticker).toBeTruthy()
    expect(sticker.className).toContain('truncate')
    expect(sticker.className).toContain('max-w-full')
  })
})

describe('US-084 TourMarketPage Editorial Badges Component Tests', () => {
  it('renders hot rainbow border and top-left stickers on market routes from shared DTO', () => {
    const tour = makeMarketTour({
      editorialBadges: [
        { kind: 'hot', label: 'Tour hot' },
        { kind: 'vip', label: 'VIP' },
      ],
      hasHotEditorialBadge: true,
      nextDeparture: {
        ...makeMarketTour().nextDeparture,
        promoLabel: 'Mùa thu vàng',
      },
    })
    const { container } = render(
      <TourMarketPage departures={[]} locale="vi" marketKey="korea" tours={[tour]} />,
    )

    // Hot rainbow card outer border
    const article = container.querySelector('article')
    expect(article?.className).toContain('hot-rainbow-card')
    expect(article?.getAttribute('data-has-hot')).toBe('true')

    // Accessible hot text
    expect(container.querySelector('.sr-only')?.textContent).toBe('Tour hot')

    // Top-left VIP sticker
    const sticker = screen.getByText('VIP')
    expect(sticker).toBeTruthy()
    const stickerContainer = sticker.closest('[data-editorial-stickers]')
    const overlay = stickerContainer?.closest('.inset-x-3')
    expect(overlay?.className).toContain('top-3')

    // Top-right commercial promo
    const promo = screen.getByText('Mùa thu vàng')
    expect(promo).toBeTruthy()
    const promoContainer = promo.closest('div.flex')
    expect(promoContainer?.className).toContain('justify-end')
  })

  it('renders market card without hot border or stickers when no editorial badges exist', () => {
    const tour = makeMarketTour({
      editorialBadges: [],
      hasHotEditorialBadge: false,
    })
    const { container } = render(
      <TourMarketPage departures={[]} locale="vi" marketKey="korea" tours={[tour]} />,
    )

    const article = container.querySelector('article')
    expect(article?.className).not.toContain('hot-rainbow-card')
    expect(container.querySelector('[data-editorial-stickers]')).toBeNull()
  })
})
