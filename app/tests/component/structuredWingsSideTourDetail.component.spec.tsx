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
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/blocks/Form/Component', () => ({
  FormBlock: ({ formOdId, submitOdId }: { formOdId?: string; submitOdId?: string }) => (
    <form data-od-id={formOdId}>
      <textarea name="message" />
      <button data-od-id={submitOdId} type="submit">
        Submit
      </button>
    </form>
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
    gallery: [
      { id: 2, url: '/media/2.jpg' },
      { id: 3, url: '/media/3.jpg' },
    ],
    id: 491,
    includes: [{ label: 'Private local guide' }],
    itineraryDays: [{ dayNumber: 1, summary: 'Arrive in Hanoi.', title: 'Hanoi arrival' }],
    market: 'northern vietnam',
    relatedTours: [
      { id: 492, slug: 'north-vietnam-discovery', title: 'North Vietnam Discovery' },
      { id: 493, slug: 'hanoi-and-halong', title: 'Hanoi and Halong' },
      { id: 494, slug: 'northern-highlands', title: 'Northern Highlands' },
    ],
    slug: 'best-of-northern-vietnam',
    summary: 'A private North Vietnam route shaped around the guest.',
    title: 'Best of Northern Vietnam',
  },
  variants: [],
}

afterEach(cleanup)

describe('consultative TourDetailPage contract', () => {
  it('renders one CMS enquiry form with stable form and submit markers', () => {
    render(
      <TourDetailPage
        data={data}
        enquiryForm={{ id: 20, fields: [], title: 'Tour enquiry' } as never}
        locale="en"
        presentation="consultative"
        siteCode="wing-side"
      />,
    )

    expect(document.forms).toHaveLength(1)
    expect(document.querySelectorAll('[data-od-id="tour-enquiry-form"]')).toHaveLength(1)
    expect(document.querySelectorAll('[data-od-id="tour-enquiry-submit"]')).toHaveLength(1)
  })

  it('fills the official hi-fi sections even when legacy visibility omits them', () => {
    render(
      <TourDetailPage data={data} locale="en" presentation="consultative" siteCode="wing-side" />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Best of Northern Vietnam' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: "Places you'll move through" })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'A private quote for your dates' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Request consultation' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Other itineraries near this need' })).toBeTruthy()
    expect(
      screen
        .getAllByRole('link', { name: 'Request consultation' })
        .some((link) => link.getAttribute('href')?.includes('source=tour-detail-enquiry')),
    ).toBe(true)
    const emptySurcharge = document.querySelector('[data-od-id="tour-surcharge"]')
    expect(emptySurcharge).toBeTruthy()
    expect(emptySurcharge?.hasAttribute('hidden')).toBe(true)
    expect(screen.queryByText(/Giữ chỗ|Tour outbound|Xem lịch khởi hành/i)).toBeNull()
  })

  it.each([
    ['missing currency', { currency: null, priceFrom: 1200 }],
    ['unsupported currency', { currency: 'ABC', priceFrom: 1200 }],
    ['pseudo currency', { currency: 'XXX', priceFrom: 1200 }],
    ['EUR currency', { currency: 'EUR', priceFrom: 1200 }],
    ['GBP currency', { currency: 'GBP', priceFrom: 1200 }],
    ['zero price', { currency: 'USD', priceFrom: 0 }],
    ['negative price', { currency: 'USD', priceFrom: -1 }],
    ['nonfinite price', { currency: 'USD', priceFrom: Number.POSITIVE_INFINITY }],
  ])('fails closed for %s in routed consultative detail', (_label, nextDeparture) => {
    render(
      <TourDetailPage
        data={{
          ...data,
          nextDeparture,
          tour: {
            ...data.tour,
            currency: 'VND',
            priceFrom: null,
          },
        }}
        locale="en"
        presentation="consultative"
        siteCode="wing-side"
      />,
    )

    expect(screen.getAllByText('Price on request').length).toBeGreaterThan(0)
    expect(screen.getAllByText('On request · reply within 24h').length).toBeGreaterThan(0)
  })

  it('renders governed prices from the routed consultative detail', () => {
    render(
      <TourDetailPage
        data={{
          ...data,
          nextDeparture: { currency: 'USD', priceFrom: 1200 },
        }}
        locale="en"
        presentation="consultative"
        siteCode="wing-side"
      />,
    )

    expect(screen.getAllByText('From').length).toBeGreaterThan(0)
    expect(screen.queryByText('Price on request')).toBeNull()
  })

  it.each([
    [
      'it',
      'Un preventivo privato per le tue date',
      '6 giorni / 5 notti',
      'Richiedi una consulenza',
    ],
    ['es', 'Una propuesta privada para tus fechas', '6 días / 5 noches', 'Solicitar asesoría'],
    ['pt', 'Uma proposta privativa para suas datas', '6 dias / 5 noites', 'Solicitar consultoria'],
  ] as const)(
    'renders native consultative chrome for %s',
    (locale, priceTitle, duration, request) => {
      render(
        <TourDetailPage
          data={data}
          locale={locale}
          presentation="consultative"
          siteCode="wing-side"
        />,
      )

      expect(screen.getByRole('heading', { name: priceTitle })).toBeTruthy()
      expect(screen.getAllByText(duration).length).toBeGreaterThan(0)
      expect(screen.getAllByRole('link', { name: request }).length).toBeGreaterThan(0)
      expect(screen.queryByText('Yêu cầu tư vấn')).toBeNull()
    },
  )

  it('renders sanitized route and service truth without exposing import provenance', () => {
    const polluted: TourResolvedData = {
      ...data,
      tour: {
        ...data.tour,
        excludes: [],
        factSummary: {
          operatorNote: 'Imported from BestPrice Travel raw crawl for WingSide editorial review.',
          routeSummary: 'vietnam-tours',
        },
        includes: [
          { label: 'Private local guide' },
          { label: 'International flights to or from Vietnam with taxes' },
          { label: 'Vietnam Visa' },
          { label: 'Peak season surcharge & compulsory dinner at the hotel' },
        ],
        itineraryDays: [
          { dayNumber: 1, route: 'Hanoi - Sapa', summary: 'Arrive.', title: 'Hanoi arrival' },
          { dayNumber: 2, route: 'Fansipan - Halong', summary: 'Travel.', title: 'North route' },
        ],
        slug: 'hanoi-ninh-binh-sapa-halong-6-days',
        summary: 'A memorable experience.Socialize with local hosts.',
      },
    }

    render(
      <TourDetailPage
        data={polluted}
        locale="en"
        presentation="consultative"
        siteCode="wing-side"
      />,
    )

    expect(
      screen.getAllByText('Hanoi → Ninh Binh → Sapa → Fansipan → Halong').length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Private local guide')).toBeTruthy()
    expect(screen.getByText('International flights to or from Vietnam with taxes')).toBeTruthy()
    expect(screen.getByText('Vietnam Visa')).toBeTruthy()
    expect(screen.getByText('Peak season surcharge & compulsory dinner at the hotel')).toBeTruthy()
    expect(screen.queryByText(/Imported from BestPrice/i)).toBeNull()
    expect(screen.queryByText('vietnam-tours')).toBeNull()
    expect(screen.getByText('Socialize with local hosts.')).toBeTruthy()
    expect(screen.queryByText(/experience\.Socialize/)).toBeNull()
  })
})
