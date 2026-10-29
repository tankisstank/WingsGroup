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

const data = (ids: number[], hasMore = true): WingsGoCatalogData => ({
  all: ids.map(makeCard),
  featured: [],
  filtersActive: false,
  hasMore,
  markets: [],
  upcoming: [],
  nextOffset: ids.length,
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
    render(<WingsGoTourCatalogClient initial={data([1, 2], true)} initialFilters={{}} locale="en" />)

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

    // Select options
    expect(screen.getByRole('option', { name: 'South Korea' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Japan' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'China' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Earliest departure' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Price: low to high' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Tour name' })).toBeTruthy()

    // Buttons and card labels
    expect(screen.getByRole('button', { name: 'Load 6 more tours' })).toBeTruthy()
    expect(screen.getAllByText('View tour →')).toHaveLength(2)
    expect(screen.getAllByText('From')).toHaveLength(2)
    expect(screen.getAllByText('Next departure')).toHaveLength(2)
  })

  it('renders English empty-state message when filters match zero tours', async () => {
    render(
      <WingsGoTourCatalogClient
        initial={{ all: [], featured: [], filtersActive: false, hasMore: false, markets: [], nextOffset: 0, upcoming: [] }}
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
          markets: [],
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
})
