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
  hasMore,
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
})
