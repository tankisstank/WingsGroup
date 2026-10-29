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

import { WingsGoUpcomingStrip } from '@/tours/WingsGoUpcomingStrip'
import type { WingsGoCatalogCard } from '@/tours/wingsGoCatalog'

afterEach(cleanup)

const makeUpcomingCard = (id: number, days: number | null): WingsGoCatalogCard => ({
  duration: { days: 5, nights: 4 },
  editorialBadges: [],
  hasHotEditorialBadge: false,
  href: `/tour/tour-${id}`,
  id,
  image: null,
  market: 'korea',
  nextDeparture: {
    airline: 'VN',
    date: '2026-11-15T00:00:00.000Z',
    daysUntilDeparture: days,
    departureCity: 'Hà Nội',
    promoLabel: null,
  },
  price: {
    currency: 'VND',
    kind: 'verified',
    originalPrice: 16900000,
    value: 14900000,
  },
  slug: `tour-${id}`,
  summary: '',
  title: `Tour Sắp Cất Cánh ${id}`,
})

describe('US-092 Phase 4: WingsGoUpcomingStrip', () => {
  it('renders nothing when cards is empty or null (no heading, no wrapper)', () => {
    const { container: emptyContainer } = render(
      <WingsGoUpcomingStrip cards={[]} locale="vi" />,
    )
    expect(emptyContainer.firstElementChild).toBeNull()

    const { container: nullContainer } = render(
      <WingsGoUpcomingStrip cards={undefined} locale="vi" />,
    )
    expect(nullContainer.firstElementChild).toBeNull()
  })

  it('renders upcoming strip with section header, days until departure badges, dates, and prices in VI', () => {
    const cards = [
      makeUpcomingCard(1, 0), // Today
      makeUpcomingCard(2, 3), // In 3 days
    ]

    render(<WingsGoUpcomingStrip cards={cards} locale="vi" />)

    // Heading and kicker
    expect(screen.getByText('Lịch khởi hành cận ngày')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Sắp cất cánh' })).toBeTruthy()

    // Days until departure badges
    expect(screen.getByText('Khởi hành hôm nay')).toBeTruthy()
    expect(screen.getByText('Khởi hành sau 3 ngày')).toBeTruthy()

    // Departure date & airline
    expect(screen.getAllByText(/15\/11\/2026/)).toHaveLength(2)
    expect(screen.getAllByText(/Hà Nội • VN/)).toHaveLength(2)

    // Price from label
    expect(screen.getAllByText('Giá từ')).toHaveLength(2)
  })

  it('renders all upcoming strip copy in English when locale is en without Vietnamese text', () => {
    const VIETNAMESE_CHAR_REGEX =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

    const enCards = [
      {
        ...makeUpcomingCard(1, 0),
        href: '/en/tour/tour-1',
        nextDeparture: {
          airline: 'VN',
          date: '2026-11-15T00:00:00.000Z',
          daysUntilDeparture: 0,
          departureCity: 'Hanoi',
          promoLabel: null,
        },
        title: 'Seoul Autumn 1',
      },
      {
        ...makeUpcomingCard(2, 1),
        href: '/en/tour/tour-2',
        nextDeparture: {
          airline: 'JL',
          date: '2026-11-16T00:00:00.000Z',
          daysUntilDeparture: 1,
          departureCity: 'Ho Chi Minh City',
          promoLabel: null,
        },
        title: 'Tokyo Spring 2',
      },
    ]

    const { container } = render(<WingsGoUpcomingStrip cards={enCards} locale="en" />)

    expect(screen.getByText('Imminent departures')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Departing soon' })).toBeTruthy()
    expect(screen.getByText('Departs today')).toBeTruthy()
    expect(screen.getByText('Departs in 1 day')).toBeTruthy()
    expect(screen.getAllByText('From')).toHaveLength(2)

    // Assert no Vietnamese characters in EN
    const textElements = container.querySelectorAll('h2, h3, p, span, a')
    for (const el of textElements) {
      expect(el.textContent || '').not.toMatch(VIETNAMESE_CHAR_REGEX)
    }
  })

  it('provides horizontal scroll strip classes on mobile and grid classes on desktop', () => {
    const cards = [makeUpcomingCard(1, 5)]
    const { container } = render(<WingsGoUpcomingStrip cards={cards} locale="vi" />)

    const region = container.querySelector('[role="region"]')
    expect(region?.className).toContain('overflow-x-auto')
    expect(region?.className).toContain('snap-x')
    expect(region?.className).toContain('snap-mandatory')
    expect(region?.className).toContain('md:grid')

    const article = container.querySelector('article')
    expect(article?.className).toContain('snap-start')
    expect(article?.className).toContain('w-[280px]')
    expect(article?.className).toContain('md:w-auto')
    expect(article?.className).toContain('motion-reduce:transition-none')

    const link = container.querySelector('a')
    expect(link?.className).toContain('focus-visible:ring-2')
    expect(link?.getAttribute('href')).toBe('/tour/tour-1')
  })
})
