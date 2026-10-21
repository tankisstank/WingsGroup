import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TourMarketPage } from '@/tours/StructuredPages'
import type { DepartureCardViewModel } from '@/tours/types'

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))
vi.mock('@/blocks/Form/Component', () => ({ FormBlock: () => null }))
vi.mock('@/components/Media', () => ({ Media: () => null }))

afterEach(cleanup)

describe('market departure call to action', () => {
  it('keeps the hold-seat intent for a verified sellable future departure', () => {
    const departure = {
      id: 81,
      currency: 'VND',
      departureDate: '2030-01-01',
      commerceVerified: true,
      availabilityStatus: 'open',
      priceFrom: 12_000_000,
      tourProduct: { id: 33, slug: 'seoul', title: 'Seoul', market: 'korea' },
    } as DepartureCardViewModel
    render(<TourMarketPage departures={[departure]} locale="en" marketKey="korea" tours={[]} />)
    expect(screen.getByRole('link', { name: 'Hold a seat' }).getAttribute('href')).toContain('intent=hold-seat')
  })

  it.each([
    { commerceVerified: false, availabilityStatus: 'available', priceFrom: null },
    { commerceVerified: true, availabilityStatus: 'sold-out', priceFrom: 12_000_000 },
    { commerceVerified: true, availabilityStatus: 'available', priceFrom: 0 },
  ])('uses inquiry for an unsellable departure: %j', (state) => {
    const departure = {
      id: 81,
      currency: 'VND',
      departureDate: '2030-01-01',
      tourProduct: { id: 33, slug: 'seoul', title: 'Seoul', market: 'korea' },
      ctaLabelOverride: 'Hold now',
      ...state,
    } as DepartureCardViewModel
    render(<TourMarketPage departures={[departure]} locale="en" marketKey="korea" tours={[]} />)
    const link = screen.getByRole('link', { name: 'Request consultation' })
    expect(link.getAttribute('href')).toContain('intent=inquiry')
    expect(screen.queryByRole('link', { name: 'Hold now' })).toBeNull()
  })
})
