import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WingsGoCatalogCard, WingsGoCatalogData } from '@/tours/wingsGoCatalog'
import { WingsGoTourCatalogClient } from '@/tours/WingsGoTourCatalogClient'

const replace = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/tour',
  useRouter: () => ({ replace }),
}))

const makeCard = (id: number): WingsGoCatalogCard => ({
  duration: { days: 5, nights: 4 },
  href: `/tour/tour-${id}`,
  id,
  image: null,
  market: 'korea',
  nextDeparture: {
    airline: null,
    date: `2026-${String(id + 1).padStart(2, '0')}-01T00:00:00.000Z`,
    departureCity: null,
  },
  price: { kind: 'contact', label: 'Liên hệ' },
  slug: `tour-${id}`,
  summary: '',
  title: `Tour ${id}`,
})

const data = (
  ids: number[],
  hasMore = true,
  nextCursor: string | null = null,
): WingsGoCatalogData => ({
  all: ids.map(makeCard),
  featured: [],
  filtersActive: false,
  hasMore,
  hero: [],
  markets: [],
  nextCursor,
  nextOffset: ids.length,
  upcoming: [],
})

class TestIntersectionObserver {
  static instances: TestIntersectionObserver[] = []
  callback: IntersectionObserverCallback

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    TestIntersectionObserver.instances.push(this)
  }

  disconnect() {}
  observe() {}
  unobserve() {}
}

describe('WingsGoTourCatalogClient', () => {
  beforeEach(() => {
    cleanup()
    replace.mockReset()
    TestIntersectionObserver.instances = []
    vi.stubGlobal('IntersectionObserver', TestIntersectionObserver)
    vi.stubGlobal('fetch', vi.fn())
  })

  it('loads an exact six-card batch through the observer and removes duplicate IDs', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(data([6, 6, 7, 8, 9, 10], false)), { status: 200 }),
    )
    render(<WingsGoTourCatalogClient initial={data([1, 2, 3, 4, 5, 6])} initialFilters={{}} />)

    await waitFor(() => expect(TestIntersectionObserver.instances.length).toBeGreaterThan(0))
    fireEvent.click(screen.getAllByRole('button', { name: 'Tải thêm 6 tour' })[0]!)

    await waitFor(() => expect(screen.getByText('Tour 10')).toBeTruthy())
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(10)
    expect(screen.getByText('Đã hiển thị hết tour phù hợp.')).toBeTruthy()
  })

  it('shows retry and resets displayed pagination when URL filters change', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(new Response(JSON.stringify(data([8], false)), { status: 200 }))

    const view = render(<WingsGoTourCatalogClient initial={data([1, 2])} initialFilters={{}} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Tải thêm 6 tour' })[0]!)
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(screen.getByText('Tour 8')).toBeTruthy())

    view.rerender(
      <WingsGoTourCatalogClient initial={data([3], false)} initialFilters={{ market: 'japan' }} />,
    )
    await waitFor(() => {
      expect(screen.getByText('Tour 3')).toBeTruthy()
      expect(screen.queryByText('Tour 1')).toBeNull()
    })
  })

  it('does not append an in-flight response from the previous filter generation', async () => {
    let resolvePreviousRequest: ((response: Response) => void) | undefined
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreviousRequest = resolve
        }),
    )

    const view = render(<WingsGoTourCatalogClient initial={data([1], true)} initialFilters={{}} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Tải thêm 6 tour' })[0]!)

    view.rerender(
      <WingsGoTourCatalogClient initial={data([3], false)} initialFilters={{ market: 'japan' }} />,
    )
    await waitFor(() => expect(screen.getByText('Tour 3')).toBeTruthy())

    resolvePreviousRequest?.(new Response(JSON.stringify(data([9], false)), { status: 200 }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText('Tour 9')).toBeNull()
  })

  it('renders WingsGoTourCard with dynamic promo badge and duration', async () => {
    const { WingsGoTourCard } = await import('@/tours/WingsGoTourCard')
    const card: WingsGoCatalogCard = {
      ...makeCard(101),
      nextDeparture: {
        airline: 'VN',
        date: '2026-11-20T00:00:00.000Z',
        departureCity: 'Hà Nội',
        promoLabel: 'Khuyến mại 2 triệu',
      },
      summary: 'Khám phá mùa thu vàng',
      title: 'Hà Nội - Seoul - Everland',
    }

    render(<WingsGoTourCard card={card} locale="vi" />)

    expect(screen.getByText('Khuyến mại 2 triệu')).toBeTruthy()
    expect(screen.getByText('Hà Nội - Seoul - Everland')).toBeTruthy()
    expect(screen.getByText('Khám phá mùa thu vàng')).toBeTruthy()
    expect(screen.getByText('Xem tour →')).toBeTruthy()
  })

  it('renders all catalog sections, filters, and cards in English when locale is en', async () => {
    const initialWithMarkets: WingsGoCatalogData = {
      ...data([1, 2], true),
      markets: [
        { count: 1, image: null, lowestPrice: null, market: 'korea' },
        { count: 1, image: null, lowestPrice: null, market: 'japan' },
        { count: 1, image: null, lowestPrice: null, market: 'china' },
      ],
    }
    render(<WingsGoTourCatalogClient initial={initialWithMarkets} initialFilters={{}} locale="en" />)

    // Featured section
    expect(screen.getByText('Quick picks')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Featured tours' })).toBeTruthy()

    // Catalog section
    expect(screen.getByText('WingsGo catalog')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'All tours' })).toBeTruthy()

    // Filter controls
    expect(screen.getByRole('group', { name: 'Tour catalog filters' })).toBeTruthy()
    expect(screen.getByText('Market')).toBeTruthy()
    expect(screen.getByText('Sort by')).toBeTruthy()
    expect(screen.getByText('Min duration (days)')).toBeTruthy()
    expect(screen.getByText('Max duration (days)')).toBeTruthy()
    expect(screen.getByText('Price from (VND)')).toBeTruthy()
    expect(screen.getByText('Price to (VND)')).toBeTruthy()

    // Chips and select options
    expect(screen.getByRole('button', { name: 'All' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'South Korea' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Japan' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'China' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'All seasons' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'All months' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Earliest departure' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Price: low to high' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tour name' })).toBeTruthy()

    // Buttons and card labels
    expect(screen.getByRole('button', { name: 'Load 6 more tours' })).toBeTruthy()
    expect(screen.getAllByText('View tour →')).toHaveLength(2)
    expect(screen.getAllByText('From')).toHaveLength(5) // 2 tour cards + 3 market tiles
    expect(screen.getAllByText('Next departure')).toHaveLength(2)
  })

  it('renders English empty-state message when filters match zero tours', async () => {
    render(
      <WingsGoTourCatalogClient
        initial={{
          all: [],
          featured: [],
          filtersActive: false,
          hasMore: false,
          hero: [],
          markets: [],
          nextCursor: null,
          nextOffset: 0,
          upcoming: [],
        }}
        initialFilters={{ market: 'china' }}
        locale="en"
      />,
    )

    expect(screen.getByText('No tours match your filters.')).toBeTruthy()
    expect(screen.getByText('No eligible tours to display right now.')).toBeTruthy()
  })

  it('hides the featured tours section when filtersActive is true', () => {
    const featuredCard = makeCard(99)
    const allCard = makeCard(1)
    render(
      <WingsGoTourCatalogClient
        initial={{
          all: [allCard],
          featured: [featuredCard],
          filtersActive: true,
          hasMore: false,
          hero: [],
          markets: [],
          nextCursor: null,
          nextOffset: 1,
          upcoming: [],
        }}
        initialFilters={{ market: 'korea' }}
        locale="vi"
      />,
    )

    expect(screen.queryByRole('heading', { level: 2, name: 'Tour nổi bật' })).toBeNull()
    expect(screen.queryByText('Lựa chọn nhanh')).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Tất cả tour' })).toBeTruthy()
    expect(screen.getByText('Tour 1')).toBeTruthy()
    expect(screen.queryByText('Tour 99')).toBeNull()
  })

  it('sends cursor on load-more when available without exclude query param', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(data([7, 8], false, null)), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const initialData: WingsGoCatalogData = {
      all: [makeCard(1), makeCard(2), makeCard(3), makeCard(4), makeCard(5), makeCard(6)],
      featured: [makeCard(10), makeCard(20)],
      filtersActive: false,
      hasMore: true,
      hero: [],
      markets: [],
      nextCursor: 'cursor_token_123',
      nextOffset: 6,
      upcoming: [],
    }

    render(<WingsGoTourCatalogClient initial={initialData} initialFilters={{}} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Tải thêm 6 tour' })[0]!)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('cursor=cursor_token_123')
    expect(calledUrl).not.toContain('exclude=')
  })

  it('renders slots #4-#6 only in "Tour nổi bật" when hero has slots #1-#3', () => {
    const heroCards = [makeCard(1), makeCard(2), makeCard(3)]
    const featuredCards = [
      makeCard(1),
      makeCard(2),
      makeCard(3),
      makeCard(4),
      makeCard(5),
      makeCard(6),
    ]
    const allCards = [makeCard(7), makeCard(8)]

    const { container } = render(
      <WingsGoTourCatalogClient
        initial={{
          all: allCards,
          featured: featuredCards,
          filtersActive: false,
          hasMore: false,
          hero: heroCards,
          markets: [],
          nextCursor: null,
          nextOffset: 2,
          upcoming: [],
        }}
        initialFilters={{}}
        locale="vi"
      />,
    )

    const featuredSection = container.querySelector('section[aria-labelledby="wingsgo-featured-tours"]')
    expect(featuredSection).not.toBeNull()

    // Featured section shows only slots #4, #5, #6
    expect(featuredSection?.textContent).toContain('Tour 4')
    expect(featuredSection?.textContent).toContain('Tour 5')
    expect(featuredSection?.textContent).toContain('Tour 6')
    expect(featuredSection?.textContent).not.toContain('Tour 1')
    expect(featuredSection?.textContent).not.toContain('Tour 2')
    expect(featuredSection?.textContent).not.toContain('Tour 3')
  })

  it('hides the featured section with no empty message when remaining featured slice is empty', () => {
    const heroCards = [makeCard(1), makeCard(2), makeCard(3)]
    const featuredCards = [makeCard(1), makeCard(2), makeCard(3)]

    const { container } = render(
      <WingsGoTourCatalogClient
        initial={{
          all: [makeCard(4)],
          featured: featuredCards,
          filtersActive: false,
          hasMore: false,
          hero: heroCards,
          markets: [],
          nextCursor: null,
          nextOffset: 1,
          upcoming: [],
        }}
        initialFilters={{}}
        locale="vi"
      />,
    )

    expect(container.querySelector('section[aria-labelledby="wingsgo-featured-tours"]')).toBeNull()
    expect(screen.queryByText('Hiện chưa có tour đủ điều kiện hiển thị.')).toBeNull()
  })

  it('ensures no card appears in both hero, featured, or all', () => {
    const heroCards = [makeCard(1), makeCard(2), makeCard(3)]
    const featuredCards = [
      makeCard(1),
      makeCard(2),
      makeCard(3),
      makeCard(4),
      makeCard(5),
      makeCard(6),
    ]
    const allCards = [makeCard(7), makeCard(8), makeCard(9)]

    const heroIDs = new Set(heroCards.map((c) => c.id))
    const remainingFeaturedIDs = new Set(featuredCards.slice(heroCards.length).map((c) => c.id))
    const allIDs = new Set(allCards.map((c) => c.id))

    for (const id of remainingFeaturedIDs) {
      expect(heroIDs.has(id)).toBe(false)
    }
    for (const id of allIDs) {
      expect(heroIDs.has(id)).toBe(false)
      expect(remainingFeaturedIDs.has(id)).toBe(false)
    }
  })

  it('handles rapid chip removal without race condition and removes both filters', async () => {
    // Simulate window.location.search having both filters
    delete (window as unknown as { location?: unknown }).location
    ;(window as unknown as { location: { search: string } }).location = {
      search: '?market=korea&season=autumn',
    }

    render(
      <WingsGoTourCatalogClient
        initial={{
          ...data([1], false),
          filtersActive: true,
        }}
        initialFilters={{ market: 'korea', season: 'autumn' }}
        locale="vi"
      />,
    )

    // Two active filter chips are rendered
    const removeMarketBtn = screen.getByRole('button', { name: 'Xóa bộ lọc: Hàn Quốc' })
    const removeSeasonBtn = screen.getByRole('button', { name: 'Xóa bộ lọc: Mùa thu (T9 - T11)' })
    expect(removeMarketBtn).toBeTruthy()
    expect(removeSeasonBtn).toBeTruthy()

    // Like Next, a settled replace() updates the URL.
    replace.mockImplementation((url: string) => {
      ;(window as unknown as { location: { search: string } }).location.search = url.includes('?')
        ? url.slice(url.indexOf('?'))
        : ''
    })

    // Rapid sequential clicks
    fireEvent.click(removeMarketBtn)
    fireEvent.click(removeSeasonBtn)

    // The final replace call must have NEITHER market NOR season
    expect(replace).toHaveBeenCalled()
    const lastCall = replace.mock.calls[replace.mock.calls.length - 1]
    expect(lastCall[0]).not.toContain('market=')
    expect(lastCall[0]).not.toContain('season=')
  })

  it('builds the next chip change from the URL once the previous transition has settled', () => {
    delete (window as unknown as { location?: unknown }).location
    ;(window as unknown as { location: { search: string } }).location = {
      search: '?market=korea',
    }
    replace.mockImplementation(() => {})

    render(
      <WingsGoTourCatalogClient
        initial={{ ...data([1], false), filtersActive: true }}
        initialFilters={{ market: 'korea' }}
        locale="vi"
      />,
    )

    // A chip action that does not change the URL leaves no stale pending params behind.
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc: Hàn Quốc' }))

    // The hero quick search then navigates elsewhere.
    ;(window as unknown as { location: { search: string } }).location.search = '?departureMonth=2026-12'

    fireEvent.click(screen.getAllByRole('button', { name: /Mùa xuân/ })[0])
    const lastCall = replace.mock.calls[replace.mock.calls.length - 1]
    expect(lastCall[0]).toContain('season=spring')
    expect(lastCall[0]).toContain('departureMonth=2026-12')
    expect(lastCall[0]).not.toContain('market=')
  })

  it('labels range chips neutrally so an upper bound is not called a minimum', () => {
    render(
      <WingsGoTourCatalogClient
        initial={{ ...data([1], false), filtersActive: true }}
        initialFilters={{ durationMax: 6, priceMax: 1000 }}
        locale="vi"
      />,
    )
    expect(screen.getByText(/Ngân sách: ≤ 1\.000 VND/)).toBeTruthy()
    expect(screen.getByText(/Số ngày: ≤ 6 ngày/)).toBeTruthy()
  })

  it('renders empty state with recovery buttons and budget explanation only when price filter is active', () => {
    // 1. Without price filter (e.g. market only)
    const { rerender } = render(
      <WingsGoTourCatalogClient
        initial={{
          all: [],
          featured: [],
          filtersActive: true,
          hasMore: false,
          hero: [],
          markets: [],
          nextCursor: null,
          nextOffset: 0,
          upcoming: [],
        }}
        initialFilters={{ market: 'china' }}
        locale="vi"
      />,
    )

    expect(screen.getByText('Không có tour phù hợp bộ lọc.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Xóa bộ lọc' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Bỏ lọc ngân sách' })).toBeNull()
    expect(
      screen.queryByText('Các tour có giá "Liên hệ" không tham gia vào bộ lọc ngân sách.'),
    ).toBeNull()

    // 2. With price filter active
    rerender(
      <WingsGoTourCatalogClient
        initial={{
          all: [],
          featured: [],
          filtersActive: true,
          hasMore: false,
          hero: [],
          markets: [],
          nextCursor: null,
          nextOffset: 0,
          upcoming: [],
        }}
        initialFilters={{ priceMin: 20000000 }}
        locale="vi"
      />,
    )

    expect(screen.getByText('Không có tour phù hợp bộ lọc.')).toBeTruthy()
    expect(
      screen.getByText('Các tour có giá "Liên hệ" không tham gia vào bộ lọc ngân sách.'),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Xóa bộ lọc' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Bỏ lọc ngân sách' })).toBeTruthy()

    // Clicking "Bỏ lọc ngân sách" calls replace
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ lọc ngân sách' }))
    expect(replace).toHaveBeenCalled()
  })

  it('guarantees no Vietnamese characters in English locale for chips, labels, and empty state', () => {
    const VIETNAMESE_CHAR_REGEX =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

    const initialWithMarkets: WingsGoCatalogData = {
      ...data([], false),
      filtersActive: true,
      markets: [
        { count: 1, image: null, lowestPrice: null, market: 'korea' },
        { count: 1, image: null, lowestPrice: null, market: 'japan' },
      ],
    }

    const { container } = render(
      <WingsGoTourCatalogClient
        initial={initialWithMarkets}
        initialFilters={{ market: 'korea', priceMin: 10000000 }}
        locale="en"
      />,
    )

    // Check all buttons, spans, paragraphs, options
    const textElements = container.querySelectorAll(
      'button, label, select, option, p, h1, h2, h3, span',
    )
    for (const el of textElements) {
      const text = el.textContent || ''
      expect(text).not.toMatch(VIETNAMESE_CHAR_REGEX)
    }
  })
})
