import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({
    children,
    className,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className={className} href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

import { WingsGoTourCard } from '@/tours/WingsGoTourCard'
import type { WingsGoCatalogCard } from '@/tours/wingsGoCatalog'

afterEach(cleanup)

const baseCard: WingsGoCatalogCard = {
  duration: { days: 5, nights: 4 },
  editorialBadges: [],
  hasHotEditorialBadge: false,
  href: '/tour/seoul-nami',
  id: 101,
  image: { alt: 'Seoul Nami', url: '/media/seoul.jpg' },
  market: 'korea',
  nextDeparture: {
    airline: 'VJ',
    date: '2026-11-15T00:00:00.000Z',
    daysUntilDeparture: null,
    departureCity: 'Hà Nội',
    promoLabel: null,
  },
  price: {
    currency: 'VND',
    kind: 'verified',
    originalPrice: 16900000,
    value: 14900000,
  },
  slug: 'seoul-nami',
  summary: 'Hành trình Seoul mùa thu.',
  title: 'Hà Nội - Seoul - Nami',
}

describe('US-092 Phase 3: WingsGoTourCard v2', () => {
  describe('Days until departure badge in info row', () => {
    it('displays "Khởi hành hôm nay" when daysUntilDeparture is 0 in VI', () => {
      const card: WingsGoCatalogCard = {
        ...baseCard,
        nextDeparture: {
          ...baseCard.nextDeparture,
          daysUntilDeparture: 0,
        },
      }
      render(<WingsGoTourCard card={card} locale="vi" />)
      expect(screen.getByText(/Khởi hành hôm nay/)).toBeTruthy()
    })

    it('displays "Departs today" when daysUntilDeparture is 0 in EN', () => {
      const card: WingsGoCatalogCard = {
        ...baseCard,
        href: '/en/tour/seoul-nami',
        nextDeparture: {
          ...baseCard.nextDeparture,
          daysUntilDeparture: 0,
        },
      }
      render(<WingsGoTourCard card={card} locale="en" />)
      expect(screen.getByText(/Departs today/)).toBeTruthy()
    })

    it('displays "Khởi hành sau 3 ngày" when daysUntilDeparture is 3 in VI', () => {
      const card: WingsGoCatalogCard = {
        ...baseCard,
        nextDeparture: {
          ...baseCard.nextDeparture,
          daysUntilDeparture: 3,
        },
      }
      render(<WingsGoTourCard card={card} locale="vi" />)
      expect(screen.getByText(/Khởi hành sau 3 ngày/)).toBeTruthy()
    })

    it('displays "Departs in 3 days" when daysUntilDeparture is 3 in EN', () => {
      const card: WingsGoCatalogCard = {
        ...baseCard,
        href: '/en/tour/seoul-nami',
        nextDeparture: {
          ...baseCard.nextDeparture,
          daysUntilDeparture: 3,
        },
      }
      render(<WingsGoTourCard card={card} locale="en" />)
      expect(screen.getByText(/Departs in 3 days/)).toBeTruthy()
    })

    it('displays "Departs in 1 day" when daysUntilDeparture is 1 in EN', () => {
      const card: WingsGoCatalogCard = {
        ...baseCard,
        href: '/en/tour/seoul-nami',
        nextDeparture: {
          ...baseCard.nextDeparture,
          daysUntilDeparture: 1,
        },
      }
      render(<WingsGoTourCard card={card} locale="en" />)
      expect(screen.getByText(/Departs in 1 day/)).toBeTruthy()
    })

    it('omits days until text when daysUntilDeparture is null', () => {
      render(<WingsGoTourCard card={baseCard} locale="vi" />)
      expect(screen.queryByText(/Khởi hành sau/)).toBeNull()
      expect(screen.queryByText(/Khởi hành hôm nay/)).toBeNull()
      expect(screen.getByText(/15\/11\/2026 • Hà Nội • VJ/)).toBeTruthy()
    })
  })

  describe('Wide layout structure and responsiveness (390px mobile stacking)', () => {
    it('renders wide layout with side-by-side on desktop and vertical stack on mobile', () => {
      const { container } = render(<WingsGoTourCard card={baseCard} layout="wide" locale="vi" />)
      const link = container.querySelector('a')
      expect(link?.className).toContain('flex flex-col md:flex-row h-full')

      // Image container has 390px mobile aspect ratio and desktop width
      const imgContainer = link?.querySelector('div:first-of-type')
      expect(imgContainer?.className).toContain('md:w-2/5')
      expect(imgContainer?.className).toContain('md:shrink-0')
      expect(imgContainer?.className).toContain('aspect-[16/10]')
      expect(imgContainer?.className).toContain('md:aspect-auto')

      // Content container has flex-1 and padding
      const contentContainer = link?.querySelector('div:last-child')
      expect(contentContainer?.className).toContain('flex-1')
      expect(contentContainer?.className).toContain('flex flex-col justify-between')
    })
  })

  describe('Badges overlapping on grid and wide cards', () => {
    const cardWithAllBadges: WingsGoCatalogCard = {
      ...baseCard,
      editorialBadges: [
        { kind: 'hot', label: 'Bán chạy nhất' },
        { kind: 'vip', label: 'VIP' },
        { kind: 'specialized', label: 'Chuyên gia' },
      ],
      hasHotEditorialBadge: true,
      nextDeparture: {
        ...baseCard.nextDeparture,
        promoLabel: 'Giảm 2 triệu',
      },
    }

    it('renders all badges on grid card with single rainbow border and no empty wrappers', () => {
      const { container } = render(<WingsGoTourCard card={cardWithAllBadges} layout="grid" locale="vi" />)
      const article = container.querySelector('article')
      expect(article?.className).toContain('hot-rainbow-card')

      // SR-only label for hot badge
      expect(screen.getByText('Bán chạy nhất')).toBeTruthy()

      // Stickers top-left
      expect(screen.getByText('VIP')).toBeTruthy()
      expect(screen.getByText('Chuyên gia')).toBeTruthy()

      // Promo badge top-right
      expect(screen.getByText('Giảm 2 triệu')).toBeTruthy()

      // Exactly one hot-rainbow-card
      expect(container.querySelectorAll('.hot-rainbow-card')).toHaveLength(1)
    })

    it('renders all badges on wide card with single rainbow border and no empty wrappers', () => {
      const { container } = render(<WingsGoTourCard card={cardWithAllBadges} layout="wide" locale="vi" />)
      const article = container.querySelector('article')
      expect(article?.className).toContain('hot-rainbow-card')

      // Exactly one hot-rainbow-card
      expect(container.querySelectorAll('.hot-rainbow-card')).toHaveLength(1)

      // Both sticker container and promo container present
      expect(container.querySelector('[data-editorial-stickers="true"]')).not.toBeNull()
      expect(screen.getByText('VIP')).toBeTruthy()
      expect(screen.getByText('Giảm 2 triệu')).toBeTruthy()
    })

    it('renders no empty badge wrappers when card has no badges', () => {
      const { container } = render(<WingsGoTourCard card={baseCard} layout="grid" locale="vi" />)
      expect(container.querySelector('[data-editorial-stickers="true"]')).toBeNull()
      expect(container.querySelector('.hot-rainbow-card')).toBeNull()
      expect(container.querySelector('[data-has-hot="true"]')).toBeNull()
    })
  })

  describe('Links straight to card.href without quick view', () => {
    it('points directly to card.href and contains no modal triggers', () => {
      const { container } = render(<WingsGoTourCard card={baseCard} locale="vi" />)
      const link = container.querySelector('a')
      expect(link?.getAttribute('href')).toBe('/tour/seoul-nami')
      expect(container.querySelector('button[aria-haspopup="dialog"]')).toBeNull()
    })

    it('uses /en prefix when locale is en', () => {
      const enCard: WingsGoCatalogCard = {
        ...baseCard,
        href: '/en/tour/seoul-nami',
      }
      const { container } = render(<WingsGoTourCard card={enCard} locale="en" />)
      const link = container.querySelector('a')
      expect(link?.getAttribute('href')).toBe('/en/tour/seoul-nami')
    })
  })
})
