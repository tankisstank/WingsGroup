import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WingsGoScheduleRow } from '@/tours/WingsGoScheduleRow'
import { WingsGoScheduleDateList } from '@/tours/WingsGoScheduleDateList'
import { WingsGoScheduleEmpty } from '@/tours/WingsGoScheduleEmpty'
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

describe('US-093 Phase 3 Component Tests', () => {
  describe('WingsGoScheduleRow', () => {
    it('renders open availability status and Giữ chỗ CTA', () => {
      const row = createMockRow({ availability: 'open', availabilityLabel: 'Mở bán', canHoldSeat: true })
      render(<WingsGoScheduleRow row={row} tour={createMockTour()} />)

      expect(screen.getByText('Mở bán')).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Giữ chỗ' })).toBeTruthy()
    })

    it('renders limited availability status and urgencyLabel', () => {
      const row = createMockRow({
        availability: 'limited',
        availabilityLabel: 'Sắp hết chỗ',
        urgencyLabel: 'Còn 3 chỗ',
      })
      render(<WingsGoScheduleRow row={row} tour={createMockTour()} />)

      expect(screen.getByText('Sắp hết chỗ')).toBeTruthy()
      expect(screen.getByText('Còn 3 chỗ')).toBeTruthy()
    })

    it('renders sold-out status with Hỏi giá CTA and no hold seat', () => {
      const row = createMockRow({
        availability: 'sold-out',
        availabilityLabel: 'Đã kín',
        ctaLabel: 'Hỏi giá',
        canHoldSeat: false,
      })
      render(<WingsGoScheduleRow row={row} tour={createMockTour()} />)

      expect(screen.getByText('Đã kín')).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Hỏi giá' })).toBeTruthy()
    })

    it('renders quote status for unverified or unpriced departures', () => {
      const row = createMockRow({
        availability: 'quote',
        availabilityLabel: 'Chờ báo giá',
        price: null,
        ctaLabel: 'Hỏi giá',
        canHoldSeat: false,
      })
      render(<WingsGoScheduleRow row={row} tour={createMockTour()} />)

      expect(screen.getByText('Chờ báo giá')).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Hỏi giá' })).toBeTruthy()
    })

    it('renders discounted price with <del> tag and PromotionBadge', () => {
      const row = createMockRow({
        price: { value: 14500000, currency: 'VND', original: 16900000 },
        promoLabel: 'Giảm 2.4 triệu',
      })
      const { container } = render(<WingsGoScheduleRow row={row} tour={createMockTour()} />)

      const del = container.querySelector('del')
      expect(del).toBeTruthy()
      expect(screen.getByText('Giảm 2.4 triệu')).toBeTruthy()
    })

    it('renders Q3 static hot badge "Tour hot" and DOES NOT have rainbow card border', () => {
      const tour = createMockTour({ hasHot: true, badges: [{ kind: 'hot', label: 'Tour hot' }] })
      const row = createMockRow()
      const { container } = render(<WingsGoScheduleRow row={row} tour={tour} />)

      const badge = screen.getByText('Tour hot')
      expect(badge).toBeTruthy()
      expect(container.querySelector('.hot-rainbow-card')).toBeNull()
    })

    it('renders return date "Về dd/mm" only when returnDay is present', () => {
      const rowWithReturn = createMockRow({ returnDay: '2026-11-20' })
      const { rerender } = render(<WingsGoScheduleRow row={rowWithReturn} tour={createMockTour()} />)
      expect(screen.getByText(/Về 20\/11/)).toBeTruthy()

      const rowNoReturn = createMockRow({ returnDay: null })
      rerender(<WingsGoScheduleRow row={rowNoReturn} tour={createMockTour()} />)
      expect(screen.queryByText(/Về/)).toBeNull()
    })

    it('R2: showFullDate renders month and year visibly in the stub', () => {
      const row1 = createMockRow({ id: 'dep-a', departureDay: '2026-11-15' })
      const row2 = createMockRow({ id: 'dep-b', departureDay: '2027-08-15' })
      render(
        <div>
          <WingsGoScheduleRow row={row1} showFullDate={true} tour={createMockTour()} />
          <WingsGoScheduleRow row={row2} showFullDate={true} tour={createMockTour()} />
        </div>,
      )
      expect(screen.getByText('11/2026')).toBeTruthy()
      expect(screen.getByText('08/2027')).toBeTruthy()
    })

    it('R3: does NOT default to HAN when departureCityCode is null', () => {
      const rowNoCity = createMockRow({ departureCityCode: null })
      const { container } = render(
        <WingsGoScheduleRow row={rowNoCity} tour={createMockTour()} />,
      )
      expect(container.textContent).not.toContain('HAN')
    })

    it('R10: applies line-through and muted styling to price on sold-out row', () => {
      const soldOutRow = createMockRow({
        availability: 'sold-out',
        availabilityLabel: 'Đã kín',
        price: { value: 15900000, currency: 'VND', original: null },
      })
      const { container } = render(
        <WingsGoScheduleRow row={soldOutRow} tour={createMockTour()} />,
      )
      const priceWrapper = container.querySelector('.line-through')
      expect(priceWrapper).toBeTruthy()
      expect(priceWrapper?.className).toContain('line-through')
      expect(priceWrapper?.className).toContain('text-muted-foreground/90')
    })

    it('O1: displays routeTitle on Row and sets title attribute to full title when different', () => {
      const tour = createMockTour({
        title: 'TOUR HÀN QUỐC 5N4Đ: SEOUL - NAMI - EVERLAND',
        routeTitle: 'Seoul · Nami · Everland',
      })
      const row = createMockRow({ tourId: tour.id })
      render(<WingsGoScheduleRow row={row} tour={tour} />)

      expect(screen.getByText('Seoul · Nami · Everland')).toBeTruthy()
      const link = screen.getByRole('link', { name: 'Seoul · Nami · Everland' })
      expect(link.getAttribute('title')).toBe('TOUR HÀN QUỐC 5N4Đ: SEOUL - NAMI - EVERLAND')
    })

    it('O1: uses tourFallbackTitle and never falls back to searchText when tour is missing', () => {
      const row = createMockRow({ searchText: 'some-raw-slug-keywords' })
      render(<WingsGoScheduleRow row={row} tour={undefined} />)

      expect(screen.getByText('Tour WingsGo')).toBeTruthy()
      expect(screen.queryByText('some-raw-slug-keywords')).toBeNull()
    })
  })

  describe('WingsGoScheduleDateList (D8 Hydration Contract)', () => {
    it('renders all rows on initial render and applies hidden after enhancement for index >= 8', () => {
      const tours = { 'tour-1': createMockTour() }
      const rows: ScheduleRowType[] = Array.from({ length: 12 }, (_, i) =>
        createMockRow({
          id: `dep-${i + 1}`,
          departureDay: `2026-11-${String(i + 1).padStart(2, '0')}`,
          monthKey: '2026-11',
        }),
      )

      const { container } = render(
        <WingsGoScheduleDateList locale="vi" rows={rows} sort="date" tours={tours} />,
      )

      // In JSDOM / React test-library, useEffect runs on render (enhanced = true)
      // The first 8 rows (0..7) are not hidden; rows 8..11 (indices 8..11) are hidden
      const articles = container.querySelectorAll('article[data-od-id^="departure-"]')
      expect(articles.length).toBe(12)

      // Rows 0-7: hidden is false
      for (let i = 0; i < 8; i++) {
        expect(articles[i].hasAttribute('hidden')).toBe(false)
      }
      // Rows 8-11: hidden is true
      for (let i = 8; i < 12; i++) {
        expect(articles[i].hasAttribute('hidden')).toBe(true)
      }

      // "Xem thêm 4 đợt" button is present
      const moreBtn = screen.getByRole('button', { name: /Xem thêm 4 đợt/ })
      expect(moreBtn).toBeTruthy()
      expect(moreBtn.getAttribute('aria-expanded')).toBe('false')

      // Clicking "Xem thêm" expands rows (removes hidden)
      fireEvent.click(moreBtn)
      expect(moreBtn.getAttribute('aria-expanded')).toBe('true')
      expect(screen.getByRole('button', { name: /Thu gọn/ })).toBeTruthy()

      for (let i = 8; i < 12; i++) {
        expect(articles[i].hasAttribute('hidden')).toBe(false)
      }
    })

    it('does not group by month and renders flat rows when sort="price"', () => {
      const tours = { 'tour-1': createMockTour() }
      const rows: ScheduleRowType[] = [
        createMockRow({ id: 'dep-1', monthKey: '2026-11', price: { value: 12000000, currency: 'VND', original: null } }),
        createMockRow({ id: 'dep-2', monthKey: '2026-12', price: { value: 15000000, currency: 'VND', original: null } }),
        createMockRow({ id: 'dep-3', monthKey: '2027-01', price: null }),
      ]

      const { container } = render(
        <WingsGoScheduleDateList locale="vi" rows={rows} sort="price" tours={tours} />,
      )

      // No month group headings
      expect(container.querySelectorAll('.wingsgo-schedule-month-group').length).toBe(0)
      const articles = container.querySelectorAll('article[data-od-id^="departure-"]')
      expect(articles.length).toBe(3)
    })
  })

  describe('WingsGoScheduleEmpty', () => {
    it('renders empty snapshot state when totalDeparturesCount === 0', () => {
      render(
        <WingsGoScheduleEmpty
          activeFilters={{ sort: 'date', view: 'date' }}
          totalDeparturesCount={0}
        />,
      )

      expect(screen.getByText('Chưa có đợt khởi hành')).toBeTruthy()
      expect(screen.getByRole('link', { name: /Nhận tư vấn từ chuyên viên/ })).toBeTruthy()
    })

    it('renders filtered empty state with relaxation buttons showing departure counts', () => {
      const tours = { 'tour-1': createMockTour({ market: 'korea' }) }
      const rows: ScheduleRowType[] = [
        createMockRow({ id: 'dep-1', monthKey: '2026-11', tourId: 'tour-1' }),
        createMockRow({ id: 'dep-2', monthKey: '2026-11', tourId: 'tour-1' }),
      ]

      const activeFilters: ScheduleFilters = {
        market: 'korea',
        month: '2026-12', // No rows match 2026-12
        sort: 'date',
        view: 'date',
      }

      const onClearFilter = vi.fn()

      render(
        <WingsGoScheduleEmpty
          activeFilters={activeFilters}
          locale="vi"
          onClearFilter={onClearFilter}
          rows={rows}
          totalDeparturesCount={2}
          tours={tours}
        />,
      )

      expect(screen.getByText('Không có đợt khởi hành phù hợp')).toBeTruthy()

      // Removing month filter would yield 2 departures
      const relaxBtn = screen.getByRole('button', { name: /Bỏ lọc Tháng 12\/2026 \(2 đợt\)/ })
      expect(relaxBtn).toBeTruthy()

      fireEvent.click(relaxBtn)
      expect(onClearFilter).toHaveBeenCalledWith('month')
    })
  })

  describe('WingsGoScheduleBrowser integration', () => {
    const baseSnapshot: WingsGoScheduleSnapshot = {
      locale: 'vi',
      todayDay: '2026-10-30',
      tours: {
        'tour-1': createMockTour({ id: 'tour-1', market: 'korea', title: 'Tour Hàn Quốc Seoul', routeTitle: 'Tour Hàn Quốc Seoul' }),
        'tour-2': createMockTour({ id: 'tour-2', market: 'japan', title: 'Tour Nhật Bản Tokyo', routeTitle: 'Tour Nhật Bản Tokyo' }),
      },
      rows: [
        createMockRow({ id: 'dep-1', tourId: 'tour-1', monthKey: '2026-11', departureDay: '2026-11-10', price: { value: 15000000, currency: 'VND', original: null } }),
        createMockRow({ id: 'dep-2', tourId: 'tour-1', monthKey: '2026-11', departureDay: '2026-11-20', price: { value: 18000000, currency: 'VND', original: null } }),
        createMockRow({ id: 'dep-3', tourId: 'tour-2', monthKey: '2026-12', departureDay: '2026-12-05', price: { value: 25000000, currency: 'VND', original: null } }),
      ],
      months: ['2026-11', '2026-12'],
      markets: [
        { value: 'korea', label: 'Hàn Quốc' },
        { value: 'japan', label: 'Nhật Bản' },
      ],
      airlines: [{ key: 'VJ', label: 'Vietjet Air' }],
      marketCards: [
        { market: 'korea', label: 'Hàn Quốc', rowId: 'dep-1', tourId: 'tour-1', departureCount: 2 },
      ],
      stats: {
        openCount: 3,
        tourCount: 2,
        pricedCount: 3,
        nearestDay: '2026-11-10',
        yearRange: { from: 2026, to: 2026 },
        sharedDepartureCity: 'HAN',
        verifiedDay: '2026-10-30',
      },
      initialFilters: {
        sort: 'date',
        view: 'date',
      },
    }

    it('initial filters from initialFilters are applied on first render', () => {
      const snapshot: WingsGoScheduleSnapshot = {
        ...baseSnapshot,
        initialFilters: {
          market: 'japan',
          sort: 'date',
          view: 'date',
        },
      }

      const { container } = render(<WingsGoScheduleBrowser snapshot={snapshot} />)

      // Only Japan departure (dep-3) should be rendered
      const articles = container.querySelectorAll('article[data-od-id^="departure-"]')
      expect(articles.length).toBe(1)
      expect(articles[0].getAttribute('data-od-id')).toBe('departure-dep-3')
    })

    it('clicking month column in MonthChart filters list and clicking again deselects it', () => {
      const { container } = render(<WingsGoScheduleBrowser snapshot={baseSnapshot} />)

      // Initially all 3 departures rendered
      expect(container.querySelectorAll('article[data-od-id^="departure-"]').length).toBe(3)

      // Click month 2026-11 bar
      const barNov = container.querySelector('button[data-od-id="month-bar-2026-11"]')
      expect(barNov).toBeTruthy()
      fireEvent.click(barNov!)

      // Filtered to 2 departures in Nov
      expect(container.querySelectorAll('article[data-od-id^="departure-"]').length).toBe(2)

      // Click 2026-11 again: deselects filter, back to 3 departures
      fireEvent.click(barNov!)
      expect(container.querySelectorAll('article[data-od-id^="departure-"]').length).toBe(3)
    })

    it('EN locale does not have VI text in UI', () => {
      const enSnapshot: WingsGoScheduleSnapshot = {
        ...baseSnapshot,
        locale: 'en',
        rows: baseSnapshot.rows.map((r) => ({
          ...r,
          ctaLabel: 'Hold seat',
          availabilityLabel: 'Open',
        })),
      }

      render(<WingsGoScheduleBrowser snapshot={enSnapshot} />)

      // Checking that key VI strings are not present in the rendered UI
      expect(screen.queryByText('Tất cả hãng bay')).toBeNull()
      expect(screen.queryByText('Mọi tình trạng')).toBeNull()
      expect(screen.queryByText('Ngày gần nhất')).toBeNull()
      expect(screen.queryByText('Xem tour')).toBeNull()
      expect(screen.queryAllByText('Giữ chỗ').length).toBe(0)

      // Checking that EN strings are present
      expect(screen.getByText('All airlines')).toBeTruthy()
      expect(screen.getByText('All availability')).toBeTruthy()
      expect(screen.getByText('Nearest date')).toBeTruthy()
      expect(screen.getAllByText('View tour').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Hold seat').length).toBeGreaterThan(0)
    })

    it('R5: preserves URL hash during filter updates', () => {
      window.location.hash = '#results'
      const pushSpy = vi.spyOn(window.history, 'pushState')

      const { container } = render(<WingsGoScheduleBrowser snapshot={baseSnapshot} />)
      const barNov = container.querySelector('button[data-od-id="month-bar-2026-11"]')
      fireEvent.click(barNov!)

      expect(pushSpy).toHaveBeenCalled()
      const lastCall = pushSpy.mock.calls[pushSpy.mock.calls.length - 1]
      expect(lastCall[2]).toContain('#results')
      pushSpy.mockRestore()
    })

    it('R5: popstate with repeated query parameters drops repeated filter matching SSR', async () => {
      render(<WingsGoScheduleBrowser snapshot={baseSnapshot} />)

      // Simulate popstate event with repeated market param ?market=korea&market=japan
      await act(async () => {
        window.history.pushState(null, '', '/lich-khoi-hanh?market=korea&market=japan')
        window.dispatchEvent(new PopStateEvent('popstate'))
      })

      // Both Korea and Japan rows should remain rendered (market filter dropped)
      expect(screen.getAllByText(/Tour Hàn Quốc Seoul/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Tour Nhật Bản Tokyo/).length).toBeGreaterThan(0)
    })

    it('R8: search clear button has accessible name Clear search in EN', () => {
      const enSnapshot: WingsGoScheduleSnapshot = {
        ...baseSnapshot,
        locale: 'en',
      }
      render(<WingsGoScheduleBrowser snapshot={enSnapshot} />)
      const searchInput = screen.getByRole('searchbox')
      fireEvent.change(searchInput, { target: { value: 'Seoul' } })

      const clearBtn = screen.getByRole('button', { name: 'Clear search' })
      expect(clearBtn).toBeTruthy()
    })

    it('S3: renders mobile filter button with aria-expanded and toggles mobile filter panel', () => {
      const { container } = render(<WingsGoScheduleBrowser snapshot={baseSnapshot} />)
      const filterBtn = container.querySelector('[data-od-id="mobile-filter-button"]') as HTMLButtonElement
      expect(filterBtn).toBeTruthy()
      expect(filterBtn.getAttribute('aria-expanded')).toBe('false')
      expect(filterBtn.getAttribute('aria-controls')).toBe('mobile-filter-panel')

      const panel = container.querySelector('#mobile-filter-panel')
      expect(panel).toBeTruthy()
      expect(panel?.className).toContain('hidden')

      fireEvent.click(filterBtn)
      expect(filterBtn.getAttribute('aria-expanded')).toBe('true')
      expect(panel?.className).not.toContain('hidden')

      fireEvent.click(filterBtn)
      expect(filterBtn.getAttribute('aria-expanded')).toBe('false')
    })

    it('S3: shows active filter count badge when airline or status or sort filter is active', () => {
      const { container } = render(<WingsGoScheduleBrowser snapshot={baseSnapshot} />)
      const filterBtn = container.querySelector('[data-od-id="mobile-filter-button"]') as HTMLButtonElement

      // Initially 0 active filters
      expect(filterBtn.textContent).toContain('Bộ lọc')
      expect(filterBtn.querySelector('.rounded-full')).toBeNull()

      // Change airline filter
      const airlineSelect = container.querySelector('#f-airline') as HTMLSelectElement
      fireEvent.change(airlineSelect, { target: { value: 'VJ' } })

      const badge = filterBtn.querySelector('.rounded-full')
      expect(badge).toBeTruthy()
      expect(badge?.textContent).toBe('1')
    })
  })
})
