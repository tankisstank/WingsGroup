import { cleanup, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RelatedPages } from '@/components/RelatedPages'
import { WingSideTourDetailPage } from '@/tours/WingSideTourDetailPage'
import type { TourResolvedData } from '@/tours/types'

vi.mock('@/components/Media', () => ({
  Media: ({ alt, priority }: { alt?: string; priority?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt || ''} data-priority={priority ? 'true' : 'false'} />
  ),
}))

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

const media = (id: number, alt: string) => ({ alt, id, url: `/media/${id}.jpg` })
const tourData: TourResolvedData = {
  departures: [],
  featuredDepartures: [],
  nextDeparture: null,
  sectionOrder: [],
  sectionVisibility: [],
  tour: {
    durationDays: 5,
    durationNights: 4,
    excludes: [{ label: 'International flights' }],
    gallery: [media(2, 'Beach sunset'), media(3, 'Island coast')],
    heroMedia: media(1, 'Phu Quoc private journey'),
    id: 498,
    includes: [{ label: 'Private local guide' }],
    itineraryDays: [{ accommodation: 'Boutique resort', dayNumber: 1, meals: 'Breakfast', route: 'Ho Chi Minh City → Phu Quoc', summary: 'Arrive and settle in.', title: 'Island arrival' }],
    slug: 'romantic-getaway',
    summary: 'A private island journey. Sales must confirm final price and departure availability before publishing.',
    title: 'Romantic Getaway',
    market: 'vietnam',
  },
  variants: [],
}

afterEach(cleanup)

describe('WingSideTourDetailPage', () => {
  it('renders complete consultative sections without retail or importer leakage', () => {
    render(
      <>
        <WingSideTourDetailPage data={tourData} locale="en" />
        <RelatedPages locale="en" pages={[{ pathname: '/destinations', slug: 'destinations', title: 'Destinations' }]} />
      </>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Romantic Getaway' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Journey gallery' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Journey overview' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Day-by-day itinerary' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Included' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Not included' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /on request · reply within 24h/i })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Related journeys' })).toBeTruthy()
    const consultationLinks = screen.getAllByRole('link', { name: /request consultation/i })
    expect(
      consultationLinks.every(
        (link) =>
          link.getAttribute('href') ===
          '/contact-us?intent=inquiry&source=tour-detail&tour=romantic-getaway&tourId=498',
      ),
    ).toBe(true)
    const contactLinks = screen.getAllByRole('link', { name: /^contact us$/i })
    expect(contactLinks.length).toBeGreaterThanOrEqual(2)
    expect(
      contactLinks.every(
        (link) =>
          link.getAttribute('href') ===
          '/contact-us?intent=contact&source=tour-detail-contact&tour=romantic-getaway&tourId=498',
      ),
    ).toBe(true)
    expect(screen.getAllByText(/price on request/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/Imported from BestPrice|Sales must confirm/i)).toBeNull()
    expect(screen.queryByText(/Giữ chỗ|Tour outbound|Xem lịch khởi hành/i)).toBeNull()
    expect(screen.getByText('Vietnam')).toBeTruthy()
    for (const section of document.querySelectorAll('section[aria-labelledby]')) {
      expect(document.getElementById(section.getAttribute('aria-labelledby')!)).toBeTruthy()
    }
    expect(within(screen.getByRole('heading', { name: 'Journey gallery' }).closest('section')!).getAllByRole('img')).toHaveLength(2)
  })

  it('does not render empty gallery, route, itinerary, or service blocks', () => {
    const sparse = { ...tourData, tour: { ...tourData.tour, durationDays: 0, durationNights: 0, excludes: [], gallery: [], heroMedia: null, includes: [], itineraryDays: [], routeViz: null } }
    render(<WingSideTourDetailPage data={sparse} locale="en" />)

    expect(screen.queryByRole('heading', { name: 'Journey gallery' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Journey overview' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Day-by-day itinerary' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Included' })).toBeNull()
    expect(screen.getByRole('heading', { name: /on request · reply within 24h/i })).toBeTruthy()
    expect(screen.queryByText('Duration')).toBeNull()
    expect(document.querySelector('.wingsside-tour-hero > div')?.className).not.toContain(
      'lg:grid-cols-[1.08fr_0.92fr]',
    )
  })

  it('renders mixed currencies only on departures with an honest price source', () => {
    const available = {
      ...tourData,
      departures: [
        { currency: 'USD', departureDate: '2026-08-01', id: 10 },
        { currency: 'EUR', departureDate: '2026-08-02', id: 11, priceFrom: 1200 },
        { currency: 'GBP', departureDate: '2026-08-03', id: 12, priceFrom: 1300 },
      ],
      tour: { ...tourData.tour, currency: null, priceFrom: null },
    }
    render(<WingSideTourDetailPage data={available} locale="en" />)

    expect(screen.queryByText(/1 August 2026/)).toBeNull()
    expect(screen.getByText(/2 August 2026/)).toBeTruthy()
    expect(screen.getByText(/3 August 2026/)).toBeTruthy()
    expect(screen.getAllByText('€1,200').length).toBeGreaterThan(0)
    expect(screen.getByText('£1,300')).toBeTruthy()
  })
})
