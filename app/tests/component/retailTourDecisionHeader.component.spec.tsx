import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

  it('supports Branch 2 (sold out departure) and Branch 3 (toggle to private tour) cleanly', async () => {
    const futureDepartureDate = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10)
    const dataWithSoldOut: TourResolvedData = {
      departures: [
        {
          availabilityStatus: 'sold-out',
          commerceVerified: true,
          currency: 'VND',
          date: futureDepartureDate,
          departureCity: 'TP.HCM',
          departureDate: futureDepartureDate,
          id: 202,
          price: 18000000,
          priceFrom: 18000000,
          status: 'sold-out',
        },
      ],
      featuredDepartures: [],
      nextDeparture: {
        airline: 'Bamboo Airways',
        availabilityStatus: 'sold-out',
        commerceVerified: true,
        currency: 'VND',
        date: futureDepartureDate,
        departureCity: 'TP.HCM',
        departureDate: futureDepartureDate,
        id: 202,
        priceFrom: 18000000,
        status: 'sold-out',
      },
      sectionOrder: ['hero', 'sticky-cta'],
      sectionVisibility: ['hero', 'sticky-cta'],
      tour: {
        durationDays: 4,
        durationNights: 3,
        id: 60,
        slug: 'singapore-4n3d',
        title: 'Singapore Khám Phá',
      },
      variants: [],
    }

    const { rerender } = render(
      <TourDetailPage
        data={dataWithSoldOut}
        locale="vi"
        presentation="retail"
        siteCode="wings-go"
      />,
    )

    // Branch 2: Sold out departure -> Hero CTA is "Tư vấn đợt khác" with intent=inquiry
    const heroCta = document.querySelector('[data-od-id="tour-decision-primary-cta"]') as HTMLAnchorElement
    expect(heroCta.textContent).toContain('Tư vấn đợt khác')
    const heroCtaUrl = new URL(heroCta.getAttribute('href') || '', 'https://example.com')
    expect(heroCtaUrl.searchParams.get('intent')).toBe('inquiry')
    expect(heroCtaUrl.searchParams.get('departureId')).toBe('202')

    // Sticky CTA also displays "Tư vấn đợt khác" with intent=inquiry
    const stickyCta = document.querySelector('[data-od-id="tour-sticky-primary-cta"]') as HTMLAnchorElement
    expect(stickyCta.textContent).toContain('Tư vấn đợt khác')
    const stickyUrl = new URL(stickyCta.getAttribute('href') || '', 'https://example.com')
    expect(stickyUrl.searchParams.get('intent')).toBe('inquiry')
    expect(stickyUrl.searchParams.get('departureId')).toBe('202')

    // Branch 3: Toggle "Tư vấn lịch riêng"
    const togglePrivateBtn = document.querySelector('[data-od-id="tour-toggle-private-tour"]') as HTMLButtonElement
    expect(togglePrivateBtn).toBeTruthy()
    expect(togglePrivateBtn.textContent).toBe('Tư vấn lịch riêng')

    fireEvent.click(togglePrivateBtn)

    // After clicking toggle, hero updates to Branch 3:
    expect(screen.getByText('Báo giá theo đoàn')).toBeTruthy()
    expect(screen.getAllByText('Liên hệ').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Không áp dụng giá tour ghép cho lịch riêng. Lịch và báo giá theo nhu cầu.')).toBeTruthy()
    expect(screen.getByText('Lịch riêng theo đoàn')).toBeTruthy()

    // Hero CTA now switches to "Tư vấn lịch riêng" with intent=request-quote and NO departureId
    expect(heroCta.textContent).toContain('Tư vấn lịch riêng')
    const privateHeroCtaUrl = new URL(heroCta.getAttribute('href') || '', 'https://example.com')
    expect(privateHeroCtaUrl.searchParams.get('intent')).toBe('request-quote')
    expect(privateHeroCtaUrl.searchParams.has('departureId')).toBe(false)
    expect(privateHeroCtaUrl.searchParams.has('departureDate')).toBe(false)

    // Sticky bar switches to "Lịch riêng theo đoàn • Nhận báo giá" and CTA "Tư vấn lịch riêng"
    const stickyContainer = document.querySelector('.sticky.bottom-2')
    expect(stickyContainer?.textContent).toContain('Lịch riêng theo đoàn • Nhận báo giá')
    expect(stickyCta.textContent).toContain('Tư vấn lịch riêng')
    const privateStickyUrl = new URL(stickyCta.getAttribute('href') || '', 'https://example.com')
    expect(privateStickyUrl.searchParams.get('intent')).toBe('request-quote')
    expect(privateStickyUrl.searchParams.has('departureId')).toBe(false)
    expect(privateStickyUrl.searchParams.has('departureDate')).toBe(false)
  })

  it('Stage 3: renders retail layout with max-w-[1200px], 340px decision rail and functional itinerary accordion toggle', () => {
    const data: TourResolvedData = {
      departures: [],
      featuredDepartures: [],
      nextDeparture: null,
      sectionOrder: ['hero', 'itinerary', 'sticky-cta'],
      sectionVisibility: ['hero', 'itinerary', 'sticky-cta'],
      tour: {
        durationDays: 3,
        durationNights: 2,
        id: 70,
        itineraryDays: [
          { dayNumber: 1, title: 'Ngày 1: Hà Nội - Sapa', summary: 'Khởi hành lên Sapa' },
          { dayNumber: 2, title: 'Ngày 2: Fansipan', summary: 'Chinh phục đỉnh Fansipan' },
          { dayNumber: 3, title: 'Ngày 3: Cát Cát - Hà Nội', summary: 'Tham quan bản Cát Cát' },
        ],
        slug: 'sapa-3n2d',
        title: 'Sapa Hùng Vĩ 3N2D',
      },
      variants: [],
    }

    const { container } = render(
      <TourDetailPage data={data} locale="vi" presentation="retail" siteCode="wings-go" />,
    )

    // 1. Container layout has max-w-[1200px]
    const rootContainer = container.querySelector('[data-tour-presentation="retail"]')
    expect(rootContainer?.className).toContain('max-w-[1200px]')

    // 2. Hero split layout contains minmax(0,1fr)_340px grid for 340px decision rail
    const heroGrid = container.querySelector('.lg\\:grid-cols-\\[minmax\\(0\\,1fr\\)_340px\\]')
    expect(heroGrid).toBeTruthy()

    // 3. Itinerary Accordion and Toggle All button
    const toggleAllBtn = container.querySelector('[data-od-id="tour-itinerary-toggle-all"]') as HTMLButtonElement
    expect(toggleAllBtn).toBeTruthy()
    expect(toggleAllBtn.textContent).toContain('Mở rộng tất cả')

    // Initially day 1 is open, day 2 and day 3 are closed
    const dayDetails = container.querySelectorAll<HTMLDetailsElement>('details.tour-itinerary-day')
    expect(dayDetails.length).toBe(3)
    expect(dayDetails[0].open).toBe(true)
    expect(dayDetails[1].open).toBe(false)
    expect(dayDetails[2].open).toBe(false)

    // Click "Mở rộng tất cả" -> all days open
    fireEvent.click(toggleAllBtn)
    expect(dayDetails[0].open).toBe(true)
    expect(dayDetails[1].open).toBe(true)
    expect(dayDetails[2].open).toBe(true)
    expect(toggleAllBtn.textContent).toContain('Thu gọn tất cả')

    // Click "Thu gọn tất cả" -> all days close
    fireEvent.click(toggleAllBtn)
    expect(dayDetails[0].open).toBe(false)
    expect(dayDetails[1].open).toBe(false)
    expect(dayDetails[2].open).toBe(false)
    expect(toggleAllBtn.textContent).toContain('Mở rộng tất cả')
  })

  it('verifies RetailDecisionRail has no vertical scroller and RetailTourJumpNav desktop layout contract', () => {
    const data: TourResolvedData = {
      departures: [],
      featuredDepartures: [],
      nextDeparture: null,
      sectionOrder: ['hero', 'route', 'itinerary', 'services', 'departures'],
      sectionVisibility: ['hero', 'route', 'itinerary', 'services', 'departures'],
      tour: {
        durationDays: 3,
        durationNights: 2,
        id: 71,
        slug: 'ha-long-cruise',
        title: 'Hạ Long Cruise 3N2D',
      },
      variants: [],
    }

    const { container } = render(
      <TourDetailPage data={data} locale="vi" presentation="retail" siteCode="wings-go" />,
    )

    // 1. Verify RetailDecisionRail does not contain max-height restriction or overflow-y-auto
    const decisionRail = container.querySelector('[data-od-id="decision-rail"]')
    expect(decisionRail).toBeTruthy()
    expect(decisionRail?.innerHTML).not.toContain('max-h-[calc(100dvh-108px)]')
    expect(decisionRail?.innerHTML).not.toContain('overflow-y-auto')

    // 2. Verify RetailTourJumpNav initial in-flow desktop state wraps (2 lines)
    const jumpNav = container.querySelector('[data-od-id="tour-jump-nav"]')
    expect(jumpNav).toBeTruthy()
    const navElement = jumpNav?.querySelector('nav')
    expect(navElement).toBeTruthy()
    expect(navElement?.className).toContain('lg:flex-wrap')
  })
})
