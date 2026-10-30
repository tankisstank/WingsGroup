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

  it('renders ticket stubs with the VN business day, route, days badge and short price in VI', () => {
    const cards = [
      makeUpcomingCard(1, 0), // Today
      makeUpcomingCard(2, 3), // In 3 days
    ]

    const { container } = render(<WingsGoUpcomingStrip cards={cards} locale="vi" />)

    expect(screen.getByText('Lịch khởi hành gần nhất')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Sắp cất cánh' })).toBeTruthy()
    expect(container.querySelector('h2 em')?.textContent).toBe('cất cánh')

    expect(screen.getByText('Khởi hành hôm nay')).toBeTruthy()
    expect(screen.getByText('Khởi hành sau 3 ngày')).toBeTruthy()

    const tickets = container.querySelectorAll('a.wingsgo-ticket')
    expect(tickets).toHaveLength(2)
    const stub = tickets[0].querySelector('.wingsgo-ticket__stub')
    expect(stub?.textContent).toBe('15Th11Chủ nhật')
    expect(tickets[0].textContent).toContain('HAN')
    expect(tickets[0].textContent).toContain('Tour Sắp Cất Cánh 1')
    expect(tickets[0].textContent).toContain('Hàn Quốc · 5N4Đ')
    expect(tickets[0].textContent).toContain('14,9 triệu')
    expect(tickets[0].getAttribute('href')).toBe('/tour/tour-1')
  })

  it('puts a 17:00Z departure on the next Vietnam calendar day', () => {
    const card = makeUpcomingCard(1, 4)
    card.nextDeparture.date = '2026-11-23T17:00:00.000Z'
    const { container } = render(<WingsGoUpcomingStrip cards={[card]} locale="vi" />)
    expect(container.querySelector('.wingsgo-ticket__day')?.textContent).toBe('24')
  })

  it('shows the contact label when the tour has no verified price', () => {
    const card = { ...makeUpcomingCard(1, 4), price: { kind: 'contact' as const, label: 'x' } }
    render(<WingsGoUpcomingStrip cards={[card]} locale="vi" />)
    expect(screen.getByText('Liên hệ nhận giá')).toBeTruthy()
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

    expect(screen.getByText('Next departures')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Departing soon' })).toBeTruthy()
    expect(screen.getByText('Departs today')).toBeTruthy()
    expect(screen.getByText('Departs in 1 day')).toBeTruthy()
    expect(container.textContent).toContain('SGN')
    expect(container.textContent).toContain('NovSun')
    expect(container.textContent).toContain('VND 14.9M')

    const textElements = container.querySelectorAll('h2, h3, p, span, a, button')
    for (const el of textElements) {
      expect(el.textContent || '').not.toMatch(VIETNAMESE_CHAR_REGEX)
      expect(el.getAttribute('aria-label') || '').not.toMatch(VIETNAMESE_CHAR_REGEX)
    }
  })

  it('is a keyboard-scrollable board with prev/next buttons and no auto-scroll', () => {
    const cards = [makeUpcomingCard(1, 5)]
    const { container } = render(<WingsGoUpcomingStrip cards={cards} locale="vi" />)

    const region = container.querySelector('[role="region"]')
    expect(region?.className).toContain('wingsgo-board')
    expect(region?.getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('button', { name: 'Xem đoàn trước' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Xem đoàn tiếp theo' })).toBeTruthy()
    expect(container.querySelector('a.wingsgo-ticket')?.getAttribute('href')).toBe('/tour/tour-1')
  })
})
