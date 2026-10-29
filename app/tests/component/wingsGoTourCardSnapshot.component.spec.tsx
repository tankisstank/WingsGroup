import { cleanup, render } from '@testing-library/react'
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

const verifiedCard: WingsGoCatalogCard = {
  duration: { days: 5, nights: 4 },
  editorialBadges: [
    { kind: 'hot', label: 'Bán chạy' },
    { kind: 'vip', label: 'VIP' },
  ],
  hasHotEditorialBadge: true,
  href: '/tour/seoul-nami',
  id: 101,
  image: { alt: 'Seoul Nami', url: '/media/seoul.jpg' },
  market: 'korea',
  nextDeparture: {
    airline: 'VJ',
    date: '2026-11-15T00:00:00.000Z',
    daysUntilDeparture: null,
    departureCity: 'Hà Nội',
    promoLabel: 'Giảm 2 triệu',
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

const contactCard: WingsGoCatalogCard = {
  duration: { days: 10, nights: 9 },
  editorialBadges: [],
  hasHotEditorialBadge: false,
  href: '/tour/chau-au-5-nuoc',
  id: 102,
  image: null,
  market: 'other',
  nextDeparture: {
    airline: null,
    date: '2026-12-01T00:00:00.000Z',
    daysUntilDeparture: null,
    departureCity: null,
    promoLabel: null,
  },
  price: {
    kind: 'contact',
    label: 'Liên hệ',
  },
  slug: 'chau-au-5-nuoc',
  summary: 'Tour Châu Âu 5 nước cao cấp.',
  title: 'Tour Châu Âu 5 Nước',
}

describe('WingsGoTourCard grid regression snapshots', () => {
  it('renders verified promo card in VI grid layout and matches snapshot', () => {
    const { container } = render(<WingsGoTourCard card={verifiedCard} locale="vi" />)
    expect(container.firstElementChild?.outerHTML).toMatchSnapshot()
  })

  it('renders contact card in EN grid layout and matches snapshot', () => {
    const { container } = render(<WingsGoTourCard card={contactCard} locale="en" />)
    expect(container.firstElementChild?.outerHTML).toMatchSnapshot()
  })
})
