import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WingsGoScheduleTourList } from '@/tours/WingsGoScheduleTourList'
import { WingsGoScheduleAssurance } from '@/tours/WingsGoScheduleAssurance'
import { WingsGoScheduleDateList } from '@/tours/WingsGoScheduleDateList'
import { WingsGoScheduleBrowser } from '@/tours/WingsGoScheduleBrowser'
import type {
  WingsGoScheduleRow as ScheduleRowType,
  WingsGoScheduleTour,
  WingsGoScheduleSnapshot,
  ScheduleFilters,
} from '@/tours/wingsGoScheduleModel'

afterEach(cleanup)

const createMockTour = (overrides?: Partial<WingsGoScheduleTour>): WingsGoScheduleTour => ({
  id: 'tour-1',
  slug: 'seoul-nami-everland',
  href: '/tour/seoul-nami-everland',
  title: 'Hà Nội – Seoul – Nami – Everland',
  routeTitle: 'Hà Nội – Seoul – Nami – Everland 5N4Đ',
  market: 'korea',
  durationLabel: '5N4Đ',
  media: { url: '/media/seoul.jpg', alt: 'Seoul' },
  badges: [],
  hasHot: false,
  ...overrides,
})

const createMockRow = (overrides?: Partial<ScheduleRowType>): ScheduleRowType => ({
  id: 'dep-1',
  tourId: 'tour-1',
  departureDay: '2026-11-15',
  returnDay: '2026-11-19',
  monthKey: '2026-11',
  daysUntilDeparture: 16,
  departureCityCode: 'HAN',
  airline: { key: 'VJ', label: 'Vietjet Air' },
  availability: 'open',
  availabilityLabel: 'Mở bán',
  price: { value: 15900000, currency: 'VND', original: null },
  promoLabel: null,
  urgencyLabel: null,
  canHoldSeat: true,
  ctaLabel: 'Giữ chỗ',
  ctaHref: '/dat-cho?id=dep-1',
  isFeatured: false,
  searchText: 'ha noi seoul nami everland korea han quoc vietjet air',
  ...overrides,
})

describe('US-093 Phase 4 Component Tests', () => {
  describe('WingsGoScheduleTourList', () => {
    it('groups multiple departure rows by tour and links each date chip to row.ctaHref', () => {
      const tour = createMockTour()
      const row1 = createMockRow({ id: 'dep-1', departureDay: '2026-11-10', ctaHref: '/dat-cho?id=dep-1' })
      const row2 = createMockRow({ id: 'dep-2', departureDay: '2026-11-20', ctaHref: '/dat-cho?id=dep-2' })

      render(
        <WingsGoScheduleTourList
          rows={[row1, row2]}
          tours={{ [tour.id]: tour }}
        />,
      )

      expect(screen.getByText('Hà Nội – Seoul – Nami – Everland 5N4Đ')).toBeTruthy()
      const chip1 = screen.getByRole('link', { name: /10\/11\/2026/ })
      const chip2 = screen.getByRole('link', { name: /20\/11\/2026/ })
      expect(chip1.getAttribute('href')).toBe('/dat-cho?id=dep-1')
      expect(chip2.getAttribute('href')).toBe('/dat-cho?id=dep-2')
    })

    it('implements D8 hydration contract: first 6 chips visible, remaining chips hidden after enhance, expanded on toggle', () => {
      const tour = createMockTour()
      const rows: ScheduleRowType[] = []
      for (let i = 1; i <= 8; i++) {
        const day = `2026-11-${String(i).padStart(2, '0')}`
        rows.push(
          createMockRow({
            id: `dep-${i}`,
            departureDay: day,
            ctaHref: `/dat-cho?id=dep-${i}`,
          }),
        )
      }

      const { container } = render(
        <WingsGoScheduleTourList
          rows={rows}
          tours={{ [tour.id]: tour }}
        />,
      )

      // First 6 chips should not be hidden
      const chipLinks = container.querySelectorAll('.wingsgo-schedule-date-chip')
      expect(chipLinks.length).toBe(8)
      expect(chipLinks[0].hasAttribute('hidden')).toBe(false)
      expect(chipLinks[5].hasAttribute('hidden')).toBe(false)

      // Chips index 6 and 7 should be hidden after client enhancement
      expect(chipLinks[6].hasAttribute('hidden')).toBe(true)
      expect(chipLinks[7].hasAttribute('hidden')).toBe(true)

      // "+2 ngày khác" button should be rendered
      const moreBtn = screen.getByRole('button', { name: /\+2/ })
      expect(moreBtn.getAttribute('aria-expanded')).toBe('false')

      // Click to expand
      fireEvent.click(moreBtn)
      expect(chipLinks[6].hasAttribute('hidden')).toBe(false)
      expect(chipLinks[7].hasAttribute('hidden')).toBe(false)
      expect(moreBtn.getAttribute('aria-expanded')).toBe('true')
      expect(screen.getByText('Thu gọn')).toBeTruthy()
    })

    it('calculates priceFrom with USD-only tour by selecting lowest USD row where canHoldSeat is true', () => {
      const tour = createMockTour()
      const row1 = createMockRow({
        id: 'dep-1',
        price: { value: 800, currency: 'USD', original: null },
        canHoldSeat: true,
      })
      const row2 = createMockRow({
        id: 'dep-2',
        price: { value: 650, currency: 'USD', original: null },
        canHoldSeat: true,
      })
      const row3 = createMockRow({
        id: 'dep-3',
        price: { value: 500, currency: 'USD', original: null },
        canHoldSeat: false, // Cannot hold seat, should be ignored for priceFrom
      })

      render(
        <WingsGoScheduleTourList
          rows={[row1, row2, row3]}
          tours={{ [tour.id]: tour }}
        />,
      )

      expect(screen.getAllByText(/650/).length).toBeGreaterThanOrEqual(1)
    })

    it('prioritizes lowest VND price over USD price when both are present', () => {
      const tour = createMockTour()
      const rowUSD = createMockRow({
        id: 'dep-1',
        price: { value: 400, currency: 'USD', original: null },
        canHoldSeat: true,
      })
      const rowVND = createMockRow({
        id: 'dep-2',
        price: { value: 12500000, currency: 'VND', original: null },
        canHoldSeat: true,
      })

      render(
        <WingsGoScheduleTourList
          rows={[rowUSD, rowVND]}
          tours={{ [tour.id]: tour }}
        />,
      )

      // Should display VND price
      expect(screen.getByText(/12\.500\.000/)).toBeTruthy()
    })

    it('displays Liên hệ báo giá when tour has no rows with canHoldSeat true', () => {
      const tour = createMockTour()
      const rowSoldOut = createMockRow({
        id: 'dep-1',
        canHoldSeat: false,
        availability: 'sold-out',
        availabilityLabel: 'Đã kín',
      })

      render(
        <WingsGoScheduleTourList
          rows={[rowSoldOut]}
          tours={{ [tour.id]: tour }}
        />,
      )

      expect(screen.getByText('Liên hệ báo giá')).toBeTruthy()
    })

    it('preserves promo and original price of the exact chosen row', () => {
      const tour = createMockTour()
      const rowCheapest = createMockRow({
        id: 'dep-1',
        price: { value: 9900000, currency: 'VND', original: 12900000 },
        promoLabel: 'Giảm 3 triệu',
        urgencyLabel: 'Giá chớp nhoáng',
        canHoldSeat: true,
      })
      const rowExpensive = createMockRow({
        id: 'dep-2',
        price: { value: 15900000, currency: 'VND', original: null },
        promoLabel: 'Khác',
        canHoldSeat: true,
      })

      render(
        <WingsGoScheduleTourList
          rows={[rowCheapest, rowExpensive]}
          tours={{ [tour.id]: tour }}
        />,
      )

      expect(screen.getByText('Giảm 3 triệu')).toBeTruthy()
      expect(screen.getByText('Giá chớp nhoáng')).toBeTruthy()
      expect(screen.getByText(/12\.900\.000/)).toBeTruthy()
      expect(screen.getByText(/9\.900\.000/)).toBeTruthy()
    })

    it('renders hot-rainbow-card on tour card with sr-only label, and editorial stickers', () => {
      const tourHot = createMockTour({
        id: 'tour-hot',
        hasHot: true,
        badges: [
          { kind: 'hot', label: 'Tour hot' },
          { kind: 'vip', label: 'VIP' },
        ],
      })
      const row = createMockRow({ tourId: 'tour-hot' })

      const { container } = render(
        <WingsGoScheduleTourList
          rows={[row]}
          tours={{ [tourHot.id]: tourHot }}
        />,
      )

      const card = container.querySelector('.wingsgo-schedule-tour-card')
      expect(card?.classList.contains('hot-rainbow-card')).toBe(true)
      expect(screen.getByText('VIP')).toBeTruthy()
      const srOnly = card?.querySelector('.sr-only')
      expect(srOnly?.textContent).toBe('Tour hot')
    })

    it('O1: displays normalized routeTitle and sets title attribute to full title', () => {
      const tour = createMockTour({
        title: 'TOUR HÀN QUỐC 5N4Đ: SEOUL - NAMI - EVERLAND',
        routeTitle: 'Seoul · Nami · Everland',
      })
      const row = createMockRow({ tourId: tour.id })
      render(
        <WingsGoScheduleTourList
          rows={[row]}
          tours={{ [tour.id]: tour }}
        />,
      )
      expect(screen.getByText('Seoul · Nami · Everland')).toBeTruthy()
      const link = screen.getByRole('link', { name: /Seoul · Nami · Everland/ })
      expect(link.getAttribute('title')).toBe('TOUR HÀN QUỐC 5N4Đ: SEOUL - NAMI - EVERLAND')
    })

    it('O2: switches to fallback placeholder when tour image fails to load', () => {
      const tour = createMockTour({
        media: { url: '/media/broken.jpg', alt: 'Seoul' },
      })
      const row = createMockRow({ tourId: tour.id })
      render(
        <WingsGoScheduleTourList
          rows={[row]}
          tours={{ [tour.id]: tour }}
        />,
      )
      const img = screen.getByAltText('Seoul')
      expect(img).toBeTruthy()

      // Trigger error
      fireEvent.error(img)

      expect(screen.getByText('Ảnh tour đang cập nhật')).toBeTruthy()
      expect(screen.queryByAltText('Seoul')).toBeNull()
    })

    it('R9: date chips and more dates button have min-h-[44px]', () => {
      const tour = createMockTour()
      const rows = Array.from({ length: 8 }, (_, i) =>
        createMockRow({
          id: `dep-${i + 1}`,
          departureDay: `2026-11-${String(i + 10).padStart(2, '0')}`,
        }),
      )
      const { container } = render(
        <WingsGoScheduleTourList
          rows={rows}
          tours={{ [tour.id]: tour }}
        />,
      )
      const dateChip = container.querySelector('.wingsgo-schedule-date-chip')
      expect(dateChip?.className).toContain('min-h-[44px]')

      const moreBtn = container.querySelector('.wingsgo-schedule-more-dates-btn')
      expect(moreBtn?.className).toContain('min-h-[44px]')
    })
  })

  describe('WingsGoScheduleAssurance', () => {
    it('renders 3 numbered steps, contact CTA to /lien-he, hotline and Zalo', () => {
      const hotlines = [
        {
          raw: '0948786775',
          normalized: '0948786775',
          href: 'tel:0948786775',
          label: 'Hotline tư vấn',
        },
      ]
      const zaloCTA = {
        href: 'https://zalo.me/wingsgo',
        label: 'Zalo OA WingsGo',
      }

      render(
        <WingsGoScheduleAssurance
          hotlines={hotlines}
          locale="vi"
          zaloCTA={zaloCTA}
        />,
      )

      expect(screen.getByText('Trước khi giữ chỗ')).toBeTruthy()
      expect(screen.getByText(/Lịch để chọn/)).toBeTruthy()
      expect(screen.getByText('01')).toBeTruthy()
      expect(screen.getByText('02')).toBeTruthy()
      expect(screen.getByText('03')).toBeTruthy()

      const ctaLink = screen.getByRole('link', { name: 'Trao đổi với chuyên viên' })
      expect(ctaLink.getAttribute('href')).toBe('/lien-he')

      expect(screen.getByRole('link', { name: /0948 786 775/ })).toBeTruthy()
      expect(screen.getByRole('link', { name: /Zalo OA WingsGo/ })).toBeTruthy()
    })

    it('handles absence of hotlines and Zalo gracefully without crashing', () => {
      render(
        <WingsGoScheduleAssurance
          hotlines={[]}
          locale="vi"
          zaloCTA={null}
        />,
      )

      expect(screen.getByText('Trước khi giữ chỗ')).toBeTruthy()
      expect(screen.queryByRole('link', { name: /Gọi/ })).toBeNull()
      expect(screen.queryByRole('link', { name: /Zalo/ })).toBeNull()
    })

    it('renders 100% English without any Vietnamese words when locale is en', () => {
      const hotlines = [
        {
          raw: '0948786775',
          normalized: '0948786775',
          href: 'tel:0948786775',
        },
      ]

      const { container } = render(
        <WingsGoScheduleAssurance
          hotlines={hotlines}
          locale="en"
          zaloCTA={{ href: 'https://zalo.me/test', label: 'Zalo OA' }}
        />,
      )

      const text = container.textContent || ''
      expect(text).toContain('Before holding a seat')
      expect(text).toContain('Talk to a specialist')
      expect(text).toContain('Call 0948 786 775')
      expect(text).not.toContain('Trước khi')
      expect(text).not.toContain('chuyên viên')
      expect(text).not.toContain('đặt cọc')
      expect(text).not.toContain('khởi hành')
    })
  })

  describe('Phase 3 Small Fixes', () => {
    it('Fix 3.1: Month title does not duplicate year (shows Tháng 11/2026 once, no trailing year)', () => {
      const tour = createMockTour()
      const row = createMockRow({ monthKey: '2026-11' })

      const { container } = render(
        <WingsGoScheduleDateList
          rows={[row]}
          sort="date"
          tours={{ [tour.id]: tour }}
        />,
      )

      const heading = container.querySelector('h3')
      expect(heading?.textContent?.trim()).toBe('Tháng 11/2026')
      expect(heading?.textContent).not.toContain('2026 2026')
    })

    it('Fix 3.2: Chip Tất cả counts total when dropping market filter', () => {
      const koreaTour = createMockTour({ id: 't-korea', market: 'korea' })
      const japanTour = createMockTour({ id: 't-japan', market: 'japan' })

      const rowKorea = createMockRow({ id: 'dep-1', tourId: 't-korea' })
      const rowJapan = createMockRow({ id: 'dep-2', tourId: 't-japan' })

      const snapshot: WingsGoScheduleSnapshot = {
        locale: 'vi',
        todayDay: '2026-10-30',
        tours: {
          't-korea': koreaTour,
          't-japan': japanTour,
        },
        rows: [rowKorea, rowJapan],
        months: ['2026-11'],
        markets: [
          { value: 'korea', label: 'Hàn Quốc' },
          { value: 'japan', label: 'Nhật Bản' },
        ],
        airlines: [{ key: 'VJ', label: 'Vietjet Air' }],
        marketCards: [],
        chartBackdrop: null,
        stats: {
          openCount: 2,
          tourCount: 2,
          pricedCount: 2,
          nearestDay: '2026-11-15',
          yearRange: { from: 2026, to: 2026 },
          sharedDepartureCity: 'HAN',
          verifiedDay: '2026-10-30',
        },
        initialFilters: { sort: 'date', view: 'date', market: 'korea' },
      }

      render(<WingsGoScheduleBrowser snapshot={snapshot} />)

      // When filtered by market=korea, only 1 row is displayed in results
      expect(screen.getByText(/1 đợt khởi hành/)).toBeTruthy()

      // But the "Tất cả" chip in filter bar should show (2) because dropping market gives 2 rows
      const allBtn = screen.getByRole('button', { name: /Tất cả/ })
      expect(allBtn.textContent).toContain('(2)')
    })

    it('Fix 3.3: popstate restores filter state in browser', () => {
      const tour = createMockTour()
      const row = createMockRow()

      const snapshot: WingsGoScheduleSnapshot = {
        locale: 'vi',
        todayDay: '2026-10-30',
        tours: { [tour.id]: tour },
        rows: [row],
        months: ['2026-11'],
        markets: [{ value: 'korea', label: 'Hàn Quốc' }],
        airlines: [{ key: 'VJ', label: 'Vietjet Air' }],
        marketCards: [],
        chartBackdrop: null,
        stats: {
          openCount: 1,
          tourCount: 1,
          pricedCount: 1,
          nearestDay: '2026-11-15',
          yearRange: { from: 2026, to: 2026 },
          sharedDepartureCity: 'HAN',
          verifiedDay: '2026-10-30',
        },
        initialFilters: { sort: 'date', view: 'date' },
      }

      render(<WingsGoScheduleBrowser snapshot={snapshot} />)

      // Simulate popstate with ?status=sold-out wrapped in act
      act(() => {
        history.pushState(null, '', '/lich-khoi-hanh?status=sold-out')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })

      // The status chip should appear in the result line
      expect(screen.getAllByRole('button', { name: /Bỏ lọc Đã kín/ }).length).toBeGreaterThanOrEqual(1)
    })
  })
})
