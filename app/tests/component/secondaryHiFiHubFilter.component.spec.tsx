import { cleanup, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('@/blocks/Form/Component', () => ({ FormBlock: () => null }))
vi.mock('@/tours/TourEnquiryContextBridge', () => ({ TourEnquiryContextBridge: () => null }))

import { SecondaryHiFiPage } from '@/components/WingsSideHiFi/SecondaryHiFiPage'
import type { WingsSideHiFiPageModel } from '@/utilities/wingsSideHiFiPageModel'

const card = (key: string, id: number) => ({
  duration: { days: 7, nights: 6 },
  hero: { alt: `${key} hero`, url: `/media/${key}.jpg` },
  href: `/en/tour/${key}-tour`,
  id,
  key,
  price: { currency: 'USD', kind: 'from' as const, value: 1000 + id },
  summary: `Published ${key} tour`,
  title: `${key[0]!.toUpperCase()}${key.slice(1)} Tour`,
})

const model = (routeVariant: 'destinations' | 'styles'): WingsSideHiFiPageModel => ({
  enabled: true,
  hero: {},
  homeCuration: {
    destinationTours: ['hanoi', 'halong', 'hoian', 'hue', 'mekong', 'sapa'].map(card),
    featuredJourneys: [],
    issues: [],
    state: 'ready',
    styleTours: ['luxury', 'family', 'culture', 'adventure', 'wellness', 'romance'].map(
      (key, index) => card(key, index + 20),
    ),
  },
  isValid: true,
  issues: [],
  locale: 'en',
  routeContent: null,
  routePath: `/${routeVariant}`,
  routeVariant,
  sections: [],
})

afterEach(cleanup)

describe('WingSide category-first hub filters', () => {
  it('shows only the destination selected by the Home CTA query', () => {
    render(
      <SecondaryHiFiPage
        model={model('destinations')}
        publicPathname="/destinations"
        searchParams={{ destination: 'hanoi' }}
      />,
    )

    expect(screen.getByTestId('destination-filter-status').textContent).toContain('Hanoi')
    const grid = screen.getByTestId('wingsside-hifi-dest-grid')
    expect(within(grid).getAllByRole('link')).toHaveLength(1)
    expect(within(grid).getByText('Hanoi Tour')).toBeTruthy()
    expect(within(grid).queryByText('Sapa Tour')).toBeNull()
    expect(within(grid).getByRole('link').getAttribute('href')).toBe('/en/tour/hanoi-tour')
  })

  it('shows only the travel style selected by the Home CTA query', () => {
    render(
      <SecondaryHiFiPage
        model={model('styles')}
        publicPathname="/styles"
        searchParams={{ style: 'romance' }}
      />,
    )

    expect(screen.getByTestId('style-filter-status').textContent).toContain('Romance')
    const grid = screen.getByTestId('wingsside-hifi-style-grid')
    expect(within(grid).getAllByRole('link')).toHaveLength(1)
    expect(within(grid).getByText('Romance Tour')).toBeTruthy()
    expect(within(grid).queryByText('Business Tour')).toBeNull()
    expect(within(grid).getByRole('link').getAttribute('href')).toBe('/en/tour/romance-tour')
  })
})
