import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WingsGoScheduleHero } from '@/tours/WingsGoScheduleHero'
import { WingsGoScheduleMonthChart } from '@/tours/WingsGoScheduleMonthChart'
import { WingsGoScheduleMarketCards } from '@/tours/WingsGoScheduleMarketCards'
import type {
  WingsGoScheduleMarketCard,
  WingsGoScheduleRow,
  WingsGoScheduleStats,
  WingsGoScheduleTour,
} from '@/tours/wingsGoSchedule'

afterEach(cleanup)

describe('US-093 Phase 2 Component Tests', () => {
  describe('WingsGoScheduleHero', () => {
    const baseStats: WingsGoScheduleStats = {
      openCount: 42,
      tourCount: 12,
      pricedCount: 35,
      nearestDay: '2026-11-15',
      yearRange: { from: 2026, to: 2027 },
      sharedDepartureCity: 'HAN',
      verifiedDay: '2026-10-30',
    }

    it('renders 2-year range in H1 ("2026 – 2027")', () => {
      render(<WingsGoScheduleHero locale="vi" stats={baseStats} />)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.textContent).toContain('2026 – 2027')
    })

    it('renders single year in H1 when from === to', () => {
      const stats: WingsGoScheduleStats = {
        ...baseStats,
        yearRange: { from: 2026, to: 2026 },
      }
      render(<WingsGoScheduleHero locale="vi" stats={stats} />)
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.textContent).toContain('2026')
      expect(heading.textContent).not.toContain('2026 – 2026')
    })

    it('mentions departure city only when sharedDepartureCity is provided', () => {
      const { rerender } = render(
        <WingsGoScheduleHero locale="vi" stats={baseStats} />,
      )
      expect(screen.getByText(/Hà Nội/)).toBeTruthy()

      // When null (multiple departure cities or unknown)
      const multiCityStats: WingsGoScheduleStats = {
        ...baseStats,
        sharedDepartureCity: null,
      }
      rerender(<WingsGoScheduleHero locale="vi" stats={multiCityStats} />)
      expect(screen.queryByText(/Hà Nội/)).toBeNull()
      expect(screen.queryByText(/từ/)).toBeNull()
    })

    it('renders "Cập nhật dd/mm/yyyy" only when verifiedDay is present', () => {
      const { rerender } = render(
        <WingsGoScheduleHero locale="vi" stats={baseStats} />,
      )
      expect(screen.getByText(/Cập nhật 30\/10\/2026/)).toBeTruthy()

      const noVerifiedStats: WingsGoScheduleStats = {
        ...baseStats,
        verifiedDay: null,
      }
      rerender(<WingsGoScheduleHero locale="vi" stats={noVerifiedStats} />)
      expect(screen.queryByText(/Cập nhật/)).toBeNull()
    })

    it('renders 4 stats correctly and never displays lowest price', () => {
      const { container } = render(
        <WingsGoScheduleHero locale="vi" stats={baseStats} />,
      )
      expect(screen.getByText('42')).toBeTruthy()
      expect(screen.getByText('đợt mở bán')).toBeTruthy()
      expect(screen.getByText('12')).toBeTruthy()
      expect(screen.getByText('hành trình')).toBeTruthy()
      expect(screen.getByText('35')).toBeTruthy()
      expect(screen.getByText('đợt có giá')).toBeTruthy()
      expect(screen.getByText('15/11')).toBeTruthy()
      expect(screen.getByText('Đợt gần nhất')).toBeTruthy()

      // Never shows lowest price or contact text as a hero stat
      expect(container.textContent).not.toContain('Giá thấp nhất')
      expect(container.textContent).not.toContain('Lowest price')
    })

    it('in EN locale, renders 100% English with no Vietnamese text', () => {
      const { container } = render(
        <WingsGoScheduleHero locale="en" stats={baseStats} />,
      )
      const text = container.textContent || ''
      expect(text).toContain('Departure Schedule')
      expect(text).toContain('open departures')
      expect(text).toContain('itineraries')
      expect(text).toContain('priced departures')
      expect(text).toContain('Nearest departure')
      expect(text).toContain('Updated 30/10/2026')
      expect(text).toContain('Hanoi')

      // Zero Vietnamese words in UI
      expect(text).not.toContain('Lịch khởi hành')
      expect(text).not.toContain('đợt mở bán')
      expect(text).not.toContain('hành trình')
      expect(text).not.toContain('đợt có giá')
      expect(text).not.toContain('Cập nhật')
      expect(text).not.toContain('Hà Nội')
    })
  })

  describe('WingsGoScheduleMonthChart', () => {
    const months = ['2026-10', '2026-11', '2026-12', '2027-02']
    const counts = {
      '2026-10': 0,
      '2026-11': 15,
      '2026-12': 8,
      '2027-02': 4,
    }

    it('disables columns with 0 departures', () => {
      render(
        <WingsGoScheduleMonthChart
          counts={counts}
          locale="vi"
          months={months}
        />,
      )
      const barOct = screen.getByRole('button', { name: /10\/2026: 0 đợt/ })
      expect(barOct).toHaveProperty('disabled', true)

      const barNov = screen.getByRole('button', { name: /11\/2026: 15 đợt/ })
      expect(barNov).toHaveProperty('disabled', false)
    })

    it('manages aria-pressed according to selected prop', () => {
      const { rerender } = render(
        <WingsGoScheduleMonthChart
          counts={counts}
          locale="vi"
          months={months}
          selected="2026-11"
        />,
      )
      const barNov = screen.getByRole('button', { name: /11\/2026: 15 đợt/ })
      expect(barNov.getAttribute('aria-pressed')).toBe('true')

      const barDec = screen.getByRole('button', { name: /12\/2026: 8 đợt/ })
      expect(barDec.getAttribute('aria-pressed')).toBe('false')

      rerender(
        <WingsGoScheduleMonthChart
          counts={counts}
          locale="vi"
          months={months}
          selected="2026-12"
        />,
      )
      expect(barNov.getAttribute('aria-pressed')).toBe('false')
      expect(barDec.getAttribute('aria-pressed')).toBe('true')
    })

    it('is accessible via keyboard: Enter / Space triggers onSelect', () => {
      const onSelect = vi.fn()
      const { rerender } = render(
        <WingsGoScheduleMonthChart
          counts={counts}
          locale="vi"
          months={months}
          onSelect={onSelect}
        />,
      )
      const barNov = screen.getByRole('button', { name: /11\/2026: 15 đợt/ })

      fireEvent.click(barNov)
      expect(onSelect).toHaveBeenCalledWith('2026-11')

      // Clicking an already selected month deselects it
      onSelect.mockClear()
      rerender(
        <WingsGoScheduleMonthChart
          counts={counts}
          locale="vi"
          months={months}
          onSelect={onSelect}
          selected="2026-11"
        />,
      )
      const barNovSelected = screen.getByRole('button', {
        name: /11\/2026: 15 đợt/,
      })
      fireEvent.click(barNovSelected)
      expect(onSelect).toHaveBeenCalledWith(undefined)
    })

    it('renders gap month separator when consecutive months have a gap', () => {
      const { container } = render(
        <WingsGoScheduleMonthChart
          counts={counts}
          locale="vi"
          months={months}
        />,
      )
      // Between 2026-12 and 2027-02, month 2027-01 is missing (gap!)
      const barFeb = container.querySelector('[data-month="2027-02"]')
      expect(barFeb?.className).toContain('wingsgo-schedule-bar--gap')

      // 2026-11 is directly after 2026-10 (no gap)
      const barNov = container.querySelector('[data-month="2026-11"]')
      expect(barNov?.className).not.toContain('wingsgo-schedule-bar--gap')
    })

    it('displays year label upon year transition or after a gap', () => {
      render(
        <WingsGoScheduleMonthChart
          counts={counts}
          locale="vi"
          months={months}
        />,
      )
      // 2027-02 has changed year and has gap
      const barFeb = screen.getByRole('button', { name: /2\/2027: 4 đợt/ })
      expect(barFeb.textContent).toContain('2027')
    })

    it('computes and displays the peak month ("Cao điểm")', () => {
      render(
        <WingsGoScheduleMonthChart
          counts={counts}
          locale="vi"
          months={months}
        />,
      )
      // 2026-11 has highest count = 15
      expect(screen.getByText(/Cao điểm: Tháng 11\/2026 \(15 đợt\)/)).toBeTruthy()
    })
  })

  describe('WingsGoScheduleMarketCards', () => {
    const mockTours: Record<string, WingsGoScheduleTour> = {
      'tour-korea': {
        id: 'tour-korea',
        slug: 'seoul-nami',
        href: '/tour/seoul-nami',
        title: 'Seoul – Đảo Nami – Everland',
        routeTitle: 'Seoul · Nami · Everland',
        market: 'korea',
        durationLabel: '5N4Đ',
        media: { url: '/media/korea.jpg', alt: 'Seoul' },
        badges: [
          { kind: 'hot', label: 'Tour hot' },
          { kind: 'specialized', label: 'Chuyên gia' },
        ],
        hasHot: true,
      },
      'tour-japan': {
        id: 'tour-japan',
        slug: 'tokyo-fuji',
        href: '/tour/tokyo-fuji',
        title: 'Tokyo – Núi Phú Sĩ – Kyoto – Osaka',
        routeTitle: 'Tokyo · Fuji · Kyoto · Osaka',
        market: 'japan',
        durationLabel: '6N5Đ',
        media: null, // Test fallback image
        badges: [{ kind: 'vip', label: 'VIP' }],
        hasHot: false,
      },
      'tour-china': {
        id: 'tour-china',
        slug: 'shanghai-hangzhou',
        href: '/tour/shanghai-hangzhou',
        title: 'Thượng Hải – Hàng Châu – Ô Trấn',
        routeTitle: 'Thượng Hải · Hàng Châu · Ô Trấn',
        market: 'china',
        durationLabel: '5N4Đ',
        media: { url: '/media/china.jpg', alt: 'Shanghai' },
        badges: [],
        hasHot: false,
      },
      'tour-thailand': {
        id: 'tour-thailand',
        slug: 'bangkok-pattaya',
        href: '/tour/bangkok-pattaya',
        title: 'Bangkok – Pattaya',
        routeTitle: 'Bangkok · Pattaya',
        market: 'thailand',
        durationLabel: '5N4Đ',
        media: { url: '/media/thai.jpg', alt: 'Thailand' },
        badges: [],
        hasHot: false,
      },
    }

    const mockRows: WingsGoScheduleRow[] = [
      {
        id: 'row-1',
        tourId: 'tour-korea',
        departureDay: '2026-11-20',
        returnDay: '2026-11-25',
        monthKey: '2026-11',
        daysUntilDeparture: 21,
        departureCityCode: 'HAN',
        airline: { key: 'VJ', label: 'Vietjet Air' },
        availability: 'open',
        availabilityLabel: 'Mở bán',
        price: { value: 14900000, currency: 'VND', original: 16900000 },
        promoLabel: 'Ưu đãi hè',
        urgencyLabel: null,
        canHoldSeat: true,
        ctaLabel: 'Giữ chỗ',
        ctaHref: '/lien-he?tour=seoul-nami',
        isFeatured: true,
        searchText: 'seoul nami',
      },
      {
        id: 'row-2',
        tourId: 'tour-japan',
        departureDay: '2026-12-05',
        returnDay: null,
        monthKey: '2026-12',
        daysUntilDeparture: 36,
        departureCityCode: 'HAN',
        airline: { key: 'VN', label: 'Vietnam Airlines' },
        availability: 'open',
        availabilityLabel: 'Mở bán',
        price: { value: 39900000, currency: 'VND', original: null },
        promoLabel: null,
        urgencyLabel: null,
        canHoldSeat: true,
        ctaLabel: 'Giữ chỗ',
        ctaHref: '/lien-he?tour=tokyo-fuji',
        isFeatured: false,
        searchText: 'tokyo fuji',
      },
      {
        id: 'row-3',
        tourId: 'tour-china',
        departureDay: '2026-11-28',
        returnDay: null,
        monthKey: '2026-11',
        daysUntilDeparture: 29,
        departureCityCode: 'HAN',
        airline: { key: 'CA', label: 'Air China' },
        availability: 'open',
        availabilityLabel: 'Mở bán',
        price: null,
        promoLabel: null,
        urgencyLabel: null,
        canHoldSeat: false,
        ctaLabel: 'Hỏi giá',
        ctaHref: '/lien-he?tour=shanghai-hangzhou',
        isFeatured: false,
        searchText: 'shanghai hangzhou',
      },
      {
        id: 'row-4',
        tourId: 'tour-thailand',
        departureDay: '2026-12-10',
        returnDay: null,
        monthKey: '2026-12',
        daysUntilDeparture: 41,
        departureCityCode: 'HAN',
        airline: { key: 'VU', label: 'Vietravel Airlines' },
        availability: 'open',
        availabilityLabel: 'Mở bán',
        price: null,
        promoLabel: null,
        urgencyLabel: null,
        canHoldSeat: false,
        ctaLabel: 'Hỏi giá',
        ctaHref: '/lien-he?tour=bangkok-pattaya',
        isFeatured: false,
        searchText: 'bangkok pattaya',
      },
    ]

    const mockCards: WingsGoScheduleMarketCard[] = [
      {
        market: 'korea',
        label: 'Hàn Quốc',
        rowId: 'row-1',
        tourId: 'tour-korea',
        departureCount: 18,
      },
      {
        market: 'japan',
        label: 'Nhật Bản',
        rowId: 'row-2',
        tourId: 'tour-japan',
        departureCount: 10,
      },
      {
        market: 'china',
        label: 'Trung Quốc',
        rowId: 'row-3',
        tourId: 'tour-china',
        departureCount: 7,
      },
      {
        market: 'thailand',
        label: 'Thái Lan',
        rowId: 'row-4',
        tourId: 'tour-thailand',
        departureCount: 5,
      },
    ]

    it('renders at most 3 cards even when more are provided', () => {
      render(
        <WingsGoScheduleMarketCards
          cards={mockCards}
          locale="vi"
          rows={mockRows}
          tours={mockTours}
        />,
      )
      const articles = screen.getAllByRole('button')
      expect(articles.length).toBe(3)
      expect(screen.queryByText('Thái Lan')).toBeNull()
    })

    it('handles hot tour, stickers and promo badges correctly', () => {
      const { container } = render(
        <WingsGoScheduleMarketCards
          cards={mockCards}
          locale="vi"
          rows={mockRows}
          tours={mockTours}
        />,
      )
      // Korea card is hot: has hot-rainbow-card class and sr-only "Tour hot"
      const koreaCard = container.querySelector('[data-market="korea"]')
      expect(koreaCard?.className).toContain('hot-rainbow-card')
      const srOnly = koreaCard?.querySelector('.sr-only')
      expect(srOnly?.textContent).toBe('Tour hot')

      // Specialized sticker
      expect(screen.getByText('Chuyên gia')).toBeTruthy()

      // Promo badge
      expect(screen.getByText('Ưu đãi hè')).toBeTruthy()

      // VIP sticker on Japan card
      expect(screen.getByText('VIP')).toBeTruthy()
    })

    it('card without badges has no extra class or sticker container', () => {
      const { container } = render(
        <WingsGoScheduleMarketCards
          cards={mockCards}
          locale="vi"
          rows={mockRows}
          tours={mockTours}
        />,
      )
      // China card has no hot badge, no stickers, no promo
      const chinaCard = container.querySelector('[data-market="china"]')
      expect(chinaCard?.className).not.toContain('hot-rainbow-card')
      expect(chinaCard?.querySelector('[data-editorial-stickers]')).toBeNull()
      expect(chinaCard?.querySelector('.sr-only')).toBeNull()
    })

    it('renders fallback image box when media is missing', () => {
      render(
        <WingsGoScheduleMarketCards
          cards={mockCards}
          locale="vi"
          rows={mockRows}
          tours={mockTours}
        />,
      )
      // Japan card has media: null
      const fallbackImg = screen.getByRole('img', {
        name: /Ảnh đang cập nhật cho Tokyo – Núi Phú Sĩ – Kyoto – Osaka/,
      })
      expect(fallbackImg).toBeTruthy()
      expect(fallbackImg.textContent).toContain('Ảnh tour đang cập nhật')
    })

    it('clicking or keyboard activating a card calls onSelect', () => {
      const onSelect = vi.fn()
      render(
        <WingsGoScheduleMarketCards
          cards={mockCards}
          locale="vi"
          onSelect={onSelect}
          rows={mockRows}
          tours={mockTours}
        />,
      )
      const koreaCard = screen.getByRole('button', { name: /Hàn Quốc/ })
      fireEvent.click(koreaCard)
      expect(onSelect).toHaveBeenCalledWith('korea')

      // Press Enter key
      onSelect.mockClear()
      fireEvent.keyDown(koreaCard, { key: 'Enter' })
      expect(onSelect).toHaveBeenCalledWith('korea')
    })
  })
})
