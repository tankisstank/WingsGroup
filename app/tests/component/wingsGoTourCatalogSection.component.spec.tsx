import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'

const mocks = vi.hoisted(() => ({
  getPayload: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))

import { WingsGoTourCatalogSection } from '@/tours/WingsGoTourCatalogSection'
import type { WingsGoCatalogPage } from '@/tours/wingsGoCatalog'

describe('WingsGoTourCatalogSection SSR', () => {
  const site = { code: 'wings-go', id: 7 } as never
  const page: WingsGoCatalogPage = {
    id: 10,
    pathname: '/tour',
    site: 7,
    wingsGoTourCatalog: {
      enabled: true,
      featuredTours: [1, 2, 3, 4, 5, 6],
    },
  }

  beforeEach(() => {
    mocks.getPayload.mockReset()
  })

  const setupInventory = () => {
    // 14 products: 6 featured (1-6) and 8 remaining (7-14), so `all` has >6 cards
    const productsDocs = Array.from({ length: 14 }, (_, i) => ({
      _status: 'published',
      durationDays: 5,
      durationNights: 4,
      id: i + 1,
      market: 'korea',
      site: 7,
      slug: `tour-${i + 1}`,
      title: `Tour ${i + 1}`,
      wrapperPage: (i + 1) * 10,
    }))
    const wrappersDocs = Array.from({ length: 14 }, (_, i) => ({
      _status: 'published',
      id: (i + 1) * 10,
      pathname: `/tour/tour-${i + 1}`,
      site: 7,
    }))
    const departuresDocs = Array.from({ length: 14 }, (_, i) => ({
      _status: 'published',
      availabilityStatus: 'open',
      commerceVerified: true,
      currency: 'VND',
      departureDate: `2026-11-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      id: 1000 + i + 1,
      priceFrom: 10000000 + (i + 1) * 100000,
      site: 7,
      tourProduct: i + 1,
    }))

    const mockFind = vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'pages') return { docs: wrappersDocs }
      if (collection === 'tour-products') return { docs: productsDocs }
      if (collection === 'tour-departures') return { docs: departuresDocs }
      if (collection === 'tour-curations') return { docs: [] }
      return { docs: [] }
    })

    mocks.getPayload.mockResolvedValue({ find: mockFind })
  }

  it('SSR delivers non-null initial.nextCursor and initial.hero with slots #1-#3 when >6 all cards exist', async () => {
    setupInventory()

    const element = await WingsGoTourCatalogSection({
      locale: 'vi',
      page,
      searchParams: {},
      site,
    })

    expect(React.isValidElement(element)).toBe(true)
    const children = React.Children.toArray((element as React.ReactElement<{ children: React.ReactNode }>).props.children)
    expect(children).toHaveLength(3)

    const [heroElement, upcomingElement, clientElement] = children as [
      React.ReactElement<{ cards: unknown[]; filtersActive: boolean }>,
      React.ReactElement<{ cards?: unknown[]; locale?: string }>,
      React.ReactElement<{ initial: { all: unknown[]; hero: unknown[]; nextCursor: string | null; filtersActive: boolean } }>,
    ]

    // Hero receives slots #1-#3
    expect(heroElement.props.cards).toHaveLength(3)
    expect(heroElement.props.filtersActive).toBe(false)

    // Upcoming strip receives upcoming cards (Phase 4)
    expect(upcomingElement.props.cards).toBeDefined()

    // Client initial receives nextCursor because 8 remaining > 6 batch limit
    expect(clientElement.props.initial.nextCursor).toBeTruthy()
    expect(typeof clientElement.props.initial.nextCursor).toBe('string')
    expect(clientElement.props.initial.hero).toHaveLength(3)
    expect(clientElement.props.initial.all).toHaveLength(6)
    expect(clientElement.props.initial.filtersActive).toBe(false)
  })

  it('SSR sets initial.hero to empty array when filters are active', async () => {
    setupInventory()

    const element = await WingsGoTourCatalogSection({
      locale: 'vi',
      page,
      searchParams: { market: 'korea' },
      site,
    })

    const children = React.Children.toArray((element as React.ReactElement<{ children: React.ReactNode }>).props.children)
    expect(children).toHaveLength(3)

    const [heroElement, upcomingElement, clientElement] = children as [
      React.ReactElement<{ cards: unknown[]; filtersActive: boolean }>,
      React.ReactElement<{ cards?: unknown[]; locale?: string }>,
      React.ReactElement<{ initial: { hero: unknown[]; upcoming: unknown[]; filtersActive: boolean } }>,
    ]

    expect(heroElement.props.cards).toHaveLength(0)
    expect(heroElement.props.filtersActive).toBe(true)
    expect(upcomingElement.props.cards).toEqual([])
    expect(clientElement.props.initial.hero).toEqual([])
    expect(clientElement.props.initial.upcoming).toEqual([])
    expect(clientElement.props.initial.filtersActive).toBe(true)
  })
})
