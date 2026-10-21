import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TourMarketPage } from '@/tours/StructuredPages'
import type { TourCardViewModel } from '@/tours/types'

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))
vi.mock('@/blocks/Form/Component', () => ({ FormBlock: () => null }))
vi.mock('@/components/Media', () => ({ Media: () => null }))

afterEach(cleanup)

const makeMarketTour = (overrides?: Partial<TourCardViewModel>): TourCardViewModel => ({
  departureCount: 3,
  hasFutureDepartures: true,
  id: 101,
  lowestPrice: 8888888, // Deliberately different from departure price to verify no mixing
  market: 'japan',
  nextDeparture: {
    airline: 'Japan Airlines',
    availabilityStatus: 'open',
    commerceVerified: true,
    currency: 'VND',
    departureDate: '2030-04-15T00:00:00.000Z',
    originalPrice: 28000000,
    priceFrom: 23500000,
    promoLabel: 'Hoa anh đào 2030',
  },
  slug: 'tokyo-kyoto-osaka',
  summary: 'Hành trình ngắm hoa anh đào qua Tokyo, Kyoto và Osaka.',
  title: 'Cung đường vàng Nhật Bản',
  ...overrides,
})

describe('TourMarketPage Promotion & Pricing Component Tests', () => {
  it('renders verified future departure promotion with original del before red sale price and image badge', () => {
    const tour = makeMarketTour()
    const { container } = render(
      <TourMarketPage departures={[]} locale="vi" marketKey="japan" tours={[tour]} />,
    )

    // Image-overlay promo badge
    expect(screen.getByText('Hoa anh đào 2030')).toBeTruthy()

    // Original price in <del> before red sale price
    const delEl = container.querySelector('del')
    expect(delEl).not.toBeNull()
    expect(delEl?.textContent).toContain('28.000.000')

    const saleSpan = container.querySelector('.text-red-600')
    expect(saleSpan).not.toBeNull()
    expect(saleSpan?.textContent).toContain('23.500.000')

    // Verify DOM order: <del> must precede sale price
    const parent = delEl?.parentElement
    const children = Array.from(parent?.children || [])
    expect(children.indexOf(delEl as Element)).toBeLessThan(children.indexOf(saleSpan as Element))

    // Ensure lowestPrice (8.888.888) is NOT mixed or displayed
    expect(screen.queryByText('8.888.888')).toBeNull()
    expect(screen.getByText('Giá theo đợt')).toBeTruthy()
  })

  it('renders English market page with "Selected departure" label and promo prices', () => {
    const tour = makeMarketTour()
    const { container } = render(
      <TourMarketPage departures={[]} locale="en" marketKey="japan" tours={[tour]} />,
    )

    expect(screen.getByText('Hoa anh đào 2030')).toBeTruthy()
    expect(screen.getByText('Selected departure')).toBeTruthy()

    const delEl = container.querySelector('del')
    expect(delEl).not.toBeNull()
    expect(delEl?.textContent).toContain('28.000.000')

    const saleSpan = container.querySelector('.text-red-600')
    expect(saleSpan?.textContent).toContain('23.500.000')
  })

  it('suppresses promo badge when promoLabel is numeric-only but keeps valid discount', () => {
    const tour = makeMarketTour({
      nextDeparture: {
        ...makeMarketTour().nextDeparture,
        promoLabel: '28000000', // numeric-only should be rejected by isDisplayablePromoLabel
      },
    })
    const { container } = render(
      <TourMarketPage departures={[]} locale="vi" marketKey="japan" tours={[tour]} />,
    )

    // Badge with raw numeric string is not displayed
    expect(screen.queryByText('28000000')).toBeNull()

    // Discount price is still rendered correctly
    expect(container.querySelector('del')?.textContent).toContain('28.000.000')
    expect(container.querySelector('.text-red-600')?.textContent).toContain('23.500.000')
  })

  it('omits <del> and red styling when originalPrice <= priceFrom', () => {
    const tour = makeMarketTour({
      nextDeparture: {
        ...makeMarketTour().nextDeparture,
        originalPrice: 23500000, // equal to priceFrom
        priceFrom: 23500000,
      },
    })
    const { container } = render(
      <TourMarketPage departures={[]} locale="vi" marketKey="japan" tours={[tour]} />,
    )

    expect(container.querySelector('del')).toBeNull()
    expect(container.querySelector('.text-red-600')).toBeNull()
    expect(container.textContent).toContain('23.500.000')
  })

  it('falls back to contact label and hides promo badge when departure is unverified', () => {
    const tour = makeMarketTour({
      nextDeparture: {
        ...makeMarketTour().nextDeparture,
        commerceVerified: false,
      },
    })
    const { container } = render(
      <TourMarketPage departures={[]} locale="vi" marketKey="japan" tours={[tour]} />,
    )

    expect(container.querySelector('del')).toBeNull()
    expect(container.querySelector('.text-red-600')).toBeNull()
    expect(screen.queryByText('Hoa anh đào 2030')).toBeNull()
    expect(container.textContent).toContain('Liên hệ')
  })

  it('falls back to contact label and hides promo badge when departure is sold-out', () => {
    const tour = makeMarketTour({
      nextDeparture: {
        ...makeMarketTour().nextDeparture,
        availabilityStatus: 'sold-out',
      },
    })
    const { container } = render(
      <TourMarketPage departures={[]} locale="vi" marketKey="japan" tours={[tour]} />,
    )

    expect(container.querySelector('del')).toBeNull()
    expect(container.querySelector('.text-red-600')).toBeNull()
    expect(screen.queryByText('Hoa anh đào 2030')).toBeNull()
    expect(container.textContent).toContain('Liên hệ')
  })

  it('falls back to contact label and hides promo badge when departure date is in the past', () => {
    const tour = makeMarketTour({
      nextDeparture: {
        ...makeMarketTour().nextDeparture,
        departureDate: '2020-05-01T00:00:00.000Z', // past date
      },
    })
    const { container } = render(
      <TourMarketPage departures={[]} locale="vi" marketKey="japan" tours={[tour]} />,
    )

    expect(container.querySelector('del')).toBeNull()
    expect(container.querySelector('.text-red-600')).toBeNull()
    expect(screen.queryByText('Hoa anh đào 2030')).toBeNull()
    expect(container.textContent).toContain('Liên hệ')
  })

  it('falls back to contact label when priceFrom is zero, negative, or currency is missing', () => {
    const tour = makeMarketTour({
      nextDeparture: {
        ...makeMarketTour().nextDeparture,
        priceFrom: 0,
      },
    })
    const { container } = render(
      <TourMarketPage departures={[]} locale="vi" marketKey="japan" tours={[tour]} />,
    )

    expect(container.querySelector('del')).toBeNull()
    expect(container.querySelector('.text-red-600')).toBeNull()
    expect(screen.queryByText('Hoa anh đào 2030')).toBeNull()
    expect(container.textContent).toContain('Liên hệ')
  })

  it('falls back to contact label in English when nextDeparture is null', () => {
    const tour = makeMarketTour({ nextDeparture: null })
    const { container } = render(
      <TourMarketPage departures={[]} locale="en" marketKey="japan" tours={[tour]} />,
    )

    expect(container.querySelector('del')).toBeNull()
    expect(container.querySelector('.text-red-600')).toBeNull()
    expect(container.textContent).toContain('Contact us')
  })
})
