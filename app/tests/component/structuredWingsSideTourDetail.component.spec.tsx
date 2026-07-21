import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TourDetailPage } from '@/tours/StructuredPages'
import type { TourResolvedData } from '@/tours/types'

vi.mock('@/components/Media', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  Media: () => <img alt="Journey media" />,
}))

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))

const data: TourResolvedData = {
  departures: [],
  featuredDepartures: [],
  nextDeparture: null,
  sectionOrder: ['hero', 'facts', 'route', 'itinerary', 'services', 'related', 'sticky-cta'],
  sectionVisibility: ['hero', 'facts', 'route', 'itinerary', 'services', 'related', 'sticky-cta'],
  tour: {
    durationDays: 6,
    durationNights: 5,
    excludes: [{ label: 'International flights' }],
    gallery: [{ id: 2, url: '/media/2.jpg' }, { id: 3, url: '/media/3.jpg' }],
    id: 491,
    includes: [{ label: 'Private local guide' }],
    itineraryDays: [{ dayNumber: 1, summary: 'Arrive in Hanoi.', title: 'Hanoi arrival' }],
    market: 'northern vietnam',
    slug: 'best-of-northern-vietnam',
    summary: 'A private North Vietnam route shaped around the guest.',
    title: 'Best of Northern Vietnam',
  },
  variants: [],
}

afterEach(cleanup)

describe('consultative TourDetailPage contract', () => {
  it('fills the official hi-fi sections even when legacy visibility omits them', () => {
    render(<TourDetailPage data={data} locale="en" presentation="consultative" siteCode="wings-side" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Best of Northern Vietnam' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: "Places you'll move through" })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Private pricing posture' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Request consultation' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Other itineraries near this need' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Start your enquiry' }).getAttribute('href')).toContain(
      'source=tour-detail-enquiry',
    )
    expect(screen.queryByText(/Giữ chỗ|Tour outbound|Xem lịch khởi hành/i)).toBeNull()
  })
})
