import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TourDetailPage } from '@/tours/StructuredPages'
import type { TourResolvedData } from '@/tours/types'

vi.mock('@/components/Media', () => ({
  Media: ({ alt, className, resource }: { alt?: string; className?: string; resource?: any }) => (
    <img
      alt={alt || resource?.alt || 'Tour media'}
      className={className}
      src={resource?.url || 'https://images.unsplash.com/photo-1517154421773-0529f29ea451'}
    />
  ),
}))

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

describe('US-027 Slice 4: Departure Matrix Sync & Sticky Conversion Bar component tests', () => {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const futureDate2 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

  const sampleTourData: TourResolvedData = {
    departures: [
      {
        id: 501,
        departureDate: futureDate,
        airline: 'Vietnam Airlines',
        flightNumber: 'VN414',
        priceFrom: 16990000,
        originalPrice: 18990000,
        currency: 'VND',
        availabilityStatus: 'open',
        availabilityBadge: 'Còn 6 chỗ',
        urgencyLabel: 'Giữ giá tốt',
        commerceVerified: true,
      },
      {
        id: 502,
        departureDate: futureDate2,
        airline: 'Korean Air',
        flightNumber: 'KE484',
        priceFrom: 17990000,
        currency: 'VND',
        availabilityStatus: 'sold-out',
        availabilityBadge: 'Hết chỗ',
        commerceVerified: true,
      },
    ],
    featuredDepartures: [],
    variants: [],
    nextDeparture: {
      id: 501,
      departureDate: futureDate,
      date: futureDate,
      airline: 'Vietnam Airlines',
      flightNumber: 'VN414',
      priceFrom: 16990000,
      currency: 'VND',
      availabilityStatus: 'open',
      commerceVerified: true,
      ctaLabelOverride: 'Giữ chỗ ngay',
    },
    sectionOrder: ['hero', 'departures', 'sticky-cta'],
    sectionVisibility: ['hero', 'departures', 'sticky-cta'],
    tour: {
      id: 101,
      title: 'Hành Trình Khám Phá Seoul - Nami - Everland 5N4Đ',
      slug: 'seoul-nami-everland-5n4d',
      durationDays: 5,
      durationNights: 4,
      bcfg: {
        ctaStyle: 'hold-seat',
      },
    },
  }

  it('renders departure table with accurate dates, prices, status badges and CTA links', () => {
    const { container } = render(
      <TourDetailPage data={sampleTourData} locale="vi" siteCode="wingsgo" />,
    )

    const departureRows = container.querySelectorAll('[data-od-id="tour-departure-row"]')
    expect(departureRows.length).toBe(2)

    // First departure: Available with Vietnam Airlines
    const firstRow = departureRows[0]
    expect(firstRow.querySelector('[data-od-id="tour-departure-airline"]')?.textContent).toContain('Vietnam Airlines')
    expect(firstRow.querySelector('[data-od-id="tour-departure-airline"]')?.textContent).toContain('VN414')
    expect(firstRow.querySelector('[data-od-id="tour-departure-price"]')?.textContent).toContain('16.990.000')
    expect(firstRow.querySelector('[data-od-id="tour-departure-status"]')?.textContent).toContain('Còn 6 chỗ')

    const firstCta = firstRow.querySelector('[data-od-id="tour-departure-cta"]') as HTMLAnchorElement
    expect(firstCta?.textContent).toContain('Giữ chỗ ngay')
    expect(firstCta?.getAttribute('href')).toContain('departureId=501')
    expect(firstCta?.getAttribute('href')).toContain('intent=hold-seat')
    expect(firstCta?.getAttribute('href')).toContain('source=tour-detail-departures')

    // Second departure: Sold out with Korean Air
    const secondRow = departureRows[1]
    expect(secondRow.querySelector('[data-od-id="tour-departure-airline"]')?.textContent).toContain('Korean Air')
    expect(secondRow.querySelector('[data-od-id="tour-departure-status"]')?.textContent).toContain('Hết chỗ')
    const secondCta = secondRow.querySelector('[data-od-id="tour-departure-cta"]') as HTMLAnchorElement
    expect(secondCta?.textContent).toContain('Gửi yêu cầu')
    expect(secondCta?.getAttribute('href')).toContain('departureId=502')
    expect(secondCta?.getAttribute('href')).toContain('intent=inquiry')
  })

  it('syncs sticky booking CTA with nextDeparture metadata and enforces minimum touch targets (>= 44px)', () => {
    const { container } = render(
      <TourDetailPage data={sampleTourData} locale="vi" siteCode="wingsgo" />,
    )

    const stickyPrimaryCta = container.querySelector('[data-od-id="tour-sticky-primary-cta"]') as HTMLAnchorElement
    expect(stickyPrimaryCta).toBeTruthy()
    // Verify touch target class
    expect(stickyPrimaryCta.className).toContain('min-h-11')
    // Verify inquiry link parameters
    const href = stickyPrimaryCta.getAttribute('href')
    expect(href).toContain('tourId=101')
    expect(href).toContain('departureId=501')
    expect(href).toContain('intent=hold-seat')
    expect(href).toContain('source=tour-detail-sticky')

    const stickySecondaryCta = container.querySelector('[data-od-id="tour-sticky-secondary-cta"]') as HTMLAnchorElement
    expect(stickySecondaryCta).toBeTruthy()
    expect(stickySecondaryCta.className).toContain('min-h-11')
    expect(stickySecondaryCta.getAttribute('href')).toContain('/lich-khoi-hanh')
  })

  it('falls back sticky CTA and subtitle when nextDeparture is unverified or expired', () => {
    const unverifiedData: TourResolvedData = {
      ...sampleTourData,
      nextDeparture: {
        ...sampleTourData.nextDeparture,
        commerceVerified: false,
      },
    }

    const { container } = render(
      <TourDetailPage data={unverifiedData} locale="vi" siteCode="wingsgo" />,
    )

    const stickyPrimaryCta = container.querySelector('[data-od-id="tour-sticky-primary-cta"]') as HTMLAnchorElement
    expect(stickyPrimaryCta).toBeTruthy()
    // When unverified, cannot hold seat; must fallback to inquiry
    expect(stickyPrimaryCta.getAttribute('href')).toContain('intent=inquiry')
    // Unverified claims should not present date/price in subtitle
    expect(container.textContent).toContain('Chưa có lịch mới • Nhận tư vấn trực tiếp')
  })

  it('falls back sticky CTA to inquiry when nextDeparture is sold-out', () => {
    const soldOutData: TourResolvedData = {
      ...sampleTourData,
      nextDeparture: {
        ...sampleTourData.nextDeparture,
        availabilityStatus: 'sold-out',
        commerceVerified: true,
      },
    }

    const { container } = render(
      <TourDetailPage data={soldOutData} locale="vi" siteCode="wingsgo" />,
    )

    const stickyPrimaryCta = container.querySelector('[data-od-id="tour-sticky-primary-cta"]') as HTMLAnchorElement
    expect(stickyPrimaryCta).toBeTruthy()
    expect(stickyPrimaryCta.textContent).toContain('Gửi yêu cầu đợt này')
    expect(stickyPrimaryCta.getAttribute('href')).toContain('intent=inquiry')
  })

  it('handles tour without future departures honestly without fake availability badges or hold-seat intent', () => {
    const pastOrEmptyTourData: TourResolvedData = {
      ...sampleTourData,
      departures: [],
      nextDeparture: null,
    }

    const { container } = render(
      <TourDetailPage data={pastOrEmptyTourData} locale="vi" siteCode="wingsgo" />,
    )

    const stickyPrimaryCta = container.querySelector('[data-od-id="tour-sticky-primary-cta"]') as HTMLAnchorElement
    expect(stickyPrimaryCta).toBeTruthy()
    expect(stickyPrimaryCta.textContent).toContain('Nhận tư vấn lịch mới')
    const href = stickyPrimaryCta.getAttribute('href')
    expect(href).not.toContain('departureId=')
    expect(href).toContain('intent=inquiry')

    // Departure section should display honest empty state
    expect(container.textContent).toContain('Hiện chưa có lịch khởi hành mở bán mới')
  })
})
