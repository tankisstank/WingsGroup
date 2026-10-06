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

describe('US-027 Slice 2: TourDecisionHeader retail component rendering & honesty', () => {
  it('renders 3-photo collage layout when gallery has >= 3 images, displays honest facts & genuine departure CTA', () => {
    // Dynamic future departure date relative to current time
    const futureDepartureDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    const [fYear, fMonth, fDay] = futureDepartureDate.split('-')
    const formattedFutureDate = `${fDay}/${fMonth}/${fYear}`

    const dataWithGalleryAndDeparture: TourResolvedData = {
      departures: [
        {
          availabilityStatus: 'open',
          commerceVerified: true,
          currency: 'VND',
          date: futureDepartureDate,
          departureDate: futureDepartureDate,
          id: 101,
          price: 15990000,
          priceFrom: 15990000,
          seatsAvailable: 8,
          status: 'open',
        },
      ],
      featuredDepartures: [],
      nextDeparture: {
        airline: 'Vietnam Airlines',
        availabilityStatus: 'open',
        commerceVerified: true,
        currency: 'VND',
        date: futureDepartureDate,
        departureCity: 'Hà Nội',
        departureDate: futureDepartureDate,
        flightNumber: 'VN414',
        id: 101,
        priceFrom: 15990000,
        seatsAvailable: 8,
        status: 'open',
      },
      sectionOrder: ['hero'],
      sectionVisibility: ['hero'],
      tour: {
        destinationSummary: 'Seoul - Nami - Everland',
        durationDays: 5,
        durationNights: 4,
        factSummary: {
          hotelSummary: 'Khách sạn 4 sao trung tâm',
          mealsSummary: 'Ăn theo chương trình (bữa đặc sản lẩu nấm & gà hầm sâm)',
          routeSummary: 'Seoul - Nami - Everland',
        },
        gallery: [
          { id: 1, url: '/media/seoul-1.jpg' },
          { id: 2, url: '/media/nami-2.jpg' },
          { id: 3, url: '/media/everland-3.jpg' },
        ],
        id: 77,
        itineraryDays: [
          { dayNumber: 1, title: 'Hà Nội - Seoul' },
          { dayNumber: 2, title: 'Seoul - Đảo Nami' },
        ],
        market: 'Đông Á',
        slug: 'seoul-nami-everland-5n4d',
        summary: 'Trải nghiệm mùa hoa & tuyết trắng xứ Hàn với lịch trình tinh gọn.',
        title: 'Hàn Quốc Mùa Hoa: Seoul – Nami – Everland',
        tourCode: 'WG-KR05',
      },
      variants: [],
    }

    render(
      <TourDetailPage
        data={dataWithGalleryAndDeparture}
        locale="vi"
        presentation="retail"
        siteCode="wings-go"
      />,
    )

    // 1. Verify Top Meta Bar
    expect(screen.getByText(/WG-KR05/)).toBeTruthy()
    expect(screen.getByText(/5 ngày \/ 4 đêm/)).toBeTruthy()
    expect(screen.getByText(/Khởi hành:\s*Hà Nội/)).toBeTruthy()
    expect(screen.getByText(/Bay Vietnam Airlines \(VN414\)/)).toBeTruthy()

    // 2. Verify 3-Photo Collage Layout (data-od-id="tour-gallery-collage") has exactly 3 images
    const collage = document.querySelector('[data-od-id="tour-gallery-collage"]')
    expect(collage).toBeTruthy()
    expect(collage?.querySelectorAll('img')).toHaveLength(3)
    expect(document.querySelector('[data-od-id="tour-hero-fallback"]')).toBeNull()

    // 3. Verify Route Chips
    const routeChips = document.querySelector('[data-od-id="tour-route-chips"]')
    expect(routeChips).toBeTruthy()
    expect(routeChips?.textContent).toContain('Seoul')
    expect(routeChips?.textContent).toContain('Nami')

    // 4. Verify Sticky Decision Box Facts (Chỉ render khi có dữ liệu thật)
    expect(screen.getByText(/15\.990\.000/)).toBeTruthy()
    expect(screen.getByText(new RegExp(formattedFutureDate))).toBeTruthy()
    expect(screen.getByText(/Mở bán/)).toBeTruthy()
    expect(screen.getByText(/Khách sạn 4 sao trung tâm/)).toBeTruthy()
    expect(screen.getByText(/Ăn theo chương trình/)).toBeTruthy()

    // 5. Verify No Fake Claims or Demo Badges
    expect(document.body.textContent).not.toContain('99.2%')
    expect(document.body.textContent).not.toContain('Tỷ lệ visa')

    // 6. Verify Primary CTA href with exact parsed parameters
    const primaryCta = document.querySelector('[data-od-id="tour-decision-primary-cta"]') as HTMLAnchorElement
    expect(primaryCta).toBeTruthy()
    expect(primaryCta.textContent).toContain('Giữ chỗ ngay')
    const ctaUrl = new URL(primaryCta.getAttribute('href') || '', 'https://example.com')
    expect(ctaUrl.pathname).toBe('/lien-he')
    expect(ctaUrl.searchParams.get('intent')).toBe('hold-seat')
    expect(ctaUrl.searchParams.get('departureId')).toBe('101')
    expect(ctaUrl.searchParams.get('departureDate')).toBe(futureDepartureDate)
    expect(ctaUrl.searchParams.get('tour')).toBe('seoul-nami-everland-5n4d')
    expect(ctaUrl.searchParams.get('tourId')).toBe('77')
    expect(ctaUrl.searchParams.get('source')).toBe('tour-detail-hero')
  })

  it('renders single fallback hero layout when gallery has < 3 images, and honest inquiry CTA when no upcoming departures', () => {
    const dataWithoutUpcomingDepartures: TourResolvedData = {
      departures: [],
      featuredDepartures: [],
      nextDeparture: null,
      sectionOrder: ['hero'],
      sectionVisibility: ['hero'],
      tour: {
        destinationSummary: 'Đài Bắc - Đài Trung',
        durationDays: 4,
        durationNights: 3,
        gallery: [
          { id: 1, url: '/media/taipei-1.jpg' },
        ],
        heroMedia: { id: 1, url: '/media/taipei-1.jpg' },
        id: 88,
        market: 'Đài Loan',
        slug: 'dai-loan-tron-vi-4n3d',
        summary: 'Khám phá Đài Loan cổ kính và hiện đại.',
        title: 'Đài Loan Trọn Vị 4N3Đ',
        tourCode: 'WG-TW04',
      },
      variants: [],
    }

    render(
      <TourDetailPage
        data={dataWithoutUpcomingDepartures}
        locale="vi"
        presentation="retail"
        siteCode="wings-go"
      />,
    )

    // 1. Verify Fallback Hero Frame (since < 3 gallery images) has exactly 1 image
    const fallbackHero = document.querySelector('[data-od-id="tour-hero-fallback"]')
    expect(fallbackHero).toBeTruthy()
    expect(fallbackHero?.querySelectorAll('img')).toHaveLength(1)
    expect(document.querySelector('[data-od-id="tour-gallery-collage"]')).toBeNull()

    // 2. Verify Honest Upcoming Departure Message
    expect(screen.getByText(/Chưa có lịch mới/)).toBeTruthy()
    expect(screen.getByText(/Liên hệ/)).toBeTruthy()
    expect(screen.queryByText(/Còn chỗ/)).toBeNull()
    expect(screen.queryByText(/Đảm bảo khởi hành/)).toBeNull()

    // 3. Verify Honest Inquiry CTA: NO fake departureId or date
    const primaryCta = document.querySelector('[data-od-id="tour-decision-primary-cta"]') as HTMLAnchorElement
    expect(primaryCta).toBeTruthy()
    expect(primaryCta.textContent).toContain('Nhận tư vấn lịch mới')
    const ctaUrl = new URL(primaryCta.getAttribute('href') || '', 'https://example.com')
    expect(ctaUrl.pathname).toBe('/lien-he')
    expect(ctaUrl.searchParams.get('intent')).toBe('inquiry')
    expect(ctaUrl.searchParams.get('tour')).toBe('dai-loan-tron-vi-4n3d')
    expect(ctaUrl.searchParams.get('tourId')).toBe('88')
    expect(ctaUrl.searchParams.get('source')).toBe('tour-detail-hero')
    expect(ctaUrl.searchParams.has('departureId')).toBe(false)
    expect(ctaUrl.searchParams.has('departureDate')).toBe(false)
  })

  it('renders honest inquiry CTA when nextDeparture exists but has a past date (UTC date guard)', () => {
    // Past date (yesterday)
    const pastDepartureDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const dataWithPastDeparture: TourResolvedData = {
      departures: [
        {
          availabilityStatus: 'open',
          currency: 'VND',
          date: pastDepartureDate,
          departureDate: pastDepartureDate,
          id: 99,
          price: 12000000,
          priceFrom: 12000000,
          seatsAvailable: 5,
          status: 'open',
        },
      ],
      featuredDepartures: [],
      nextDeparture: {
        airline: 'Thai Airways',
        availabilityStatus: 'open',
        currency: 'VND',
        date: pastDepartureDate,
        departureCity: 'Hà Nội',
        departureDate: pastDepartureDate,
        flightNumber: 'TG561',
        id: 99,
        priceFrom: 12000000,
        seatsAvailable: 5,
        status: 'open',
      },
      sectionOrder: ['hero', 'sticky-cta'],
      sectionVisibility: ['hero', 'sticky-cta'],
      tour: {
        destinationSummary: 'Bangkok - Pattaya',
        durationDays: 5,
        durationNights: 4,
        id: 55,
        market: 'Đông Nam Á',
        slug: 'thai-lan-5n4d',
        summary: 'Tour Thái Lan khởi hành tuần qua.',
        title: 'Thái Lan Bangkok - Pattaya',
        tourCode: 'WG-TH05',
      },
      variants: [],
    }

    render(
      <TourDetailPage
        data={dataWithPastDeparture}
        locale="vi"
        presentation="retail"
        siteCode="wings-go"
      />,
    )

    // 1. Decision Box: Must NOT display past price or past departure date/airline/city
    expect(screen.getByText(/Liên hệ/)).toBeTruthy()
    expect(screen.queryByText(/12\.000\.000/)).toBeNull()
    expect(screen.getAllByText(/Chưa có lịch mới/).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/Hà Nội/)).toBeNull()
    expect(screen.queryByText(/Thai Airways/)).toBeNull()
    expect(screen.queryByText(/TG561/)).toBeNull()

    // 2. Decision Box Primary CTA: Should NOT offer "Giữ chỗ ngay" for an expired past departure
    const primaryCta = document.querySelector('[data-od-id="tour-decision-primary-cta"]') as HTMLAnchorElement
    expect(primaryCta).toBeTruthy()
    expect(primaryCta.textContent).toContain('Nhận tư vấn lịch mới')
    const ctaUrl = new URL(primaryCta.getAttribute('href') || '', 'https://example.com')
    expect(ctaUrl.pathname).toBe('/lien-he')
    expect(ctaUrl.searchParams.get('intent')).toBe('inquiry')
    expect(ctaUrl.searchParams.has('departureId')).toBe(false)
    expect(ctaUrl.searchParams.has('departureDate')).toBe(false)

    // 3. Sticky Bar: Must NOT show past price, date, or airline
    const stickyContainer = document.querySelector('.sticky.bottom-2')
    expect(stickyContainer?.textContent).toContain('Chưa có lịch mới')
    expect(stickyContainer?.textContent).not.toContain('12.000.000')
    expect(stickyContainer?.textContent).not.toContain('Thai Airways')

    // 4. Sticky Bar Primary CTA: Must ALSO be honest, using inquiry mode and no expired departure ID
    const stickyCta = document.querySelector('[data-od-id="tour-sticky-primary-cta"]') as HTMLAnchorElement
    expect(stickyCta).toBeTruthy()
    expect(stickyCta.textContent).toContain('Nhận tư vấn lịch mới')
    const stickyUrl = new URL(stickyCta.getAttribute('href') || '', 'https://example.com')
    expect(stickyUrl.pathname).toBe('/lien-he')
    expect(stickyUrl.searchParams.get('intent')).toBe('inquiry')
    expect(stickyUrl.searchParams.has('departureId')).toBe(false)
    expect(stickyUrl.searchParams.has('departureDate')).toBe(false)
  })
})
