import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({
  replaceDocumentLocation: vi.fn((href: string) => {
    window.history.replaceState(null, '', href)
  }),
}))

const restoreKey = 'wingsside:journeys:navigation-restore'
const router = { refresh: vi.fn(), replace: vi.fn() }
let params = new URLSearchParams('destination=hanoi&style=culture&duration=8-14&utm_source=pm')

vi.mock('next/navigation', () => ({
  usePathname: () => '/journeys',
  useRouter: () => router,
  useSearchParams: () => params,
}))
vi.mock('@/utilities/fullDocumentNavigation', () => navigation)
vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

import { WingSideJourneysClient } from '@/app/(frontend)/journeys/WingSideJourneysClient'
import type { DiscoveryContext } from '@/tours/discoveryCore'

const context = (overrides: Partial<DiscoveryContext> = {}): DiscoveryContext => ({
  query: { destination: 'hanoi', duration: '8-14', style: 'culture', unknownValueCount: 0 },
  result: {
    appliedQuery: { destination: 'hanoi', duration: '8-14', style: 'culture' },
    items: [
      {
        currency: 'USD',
        destinationTags: ['hanoi'],
        duration: { days: 6, nights: 5 },
        hero: { alt: 'Hanoi hero', url: '/media/hanoi.jpg' },
        href: '/tour/private-hanoi',
        id: 10,
        price: { currency: 'USD', kind: 'from', value: 1290 },
        priceFrom: 1290,
        slug: 'private-hanoi',
        summary: 'A real published journey.',
        title: 'Private Hanoi',
        travelStyles: ['culture'],
      },
    ],
    relaxed: null,
    total: 1,
    unknownValueCount: 0,
  },
  seo: { canonicalPath: '/journeys', robots: 'noindex,follow' },
  ...overrides,
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  router.replace.mockReset()
  router.refresh.mockReset()
  navigation.replaceDocumentLocation.mockReset()
  navigation.replaceDocumentLocation.mockImplementation((href: string) => {
    window.history.replaceState(null, '', href)
  })
  window.sessionStorage.clear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  params = new URLSearchParams('destination=hanoi&style=culture&duration=8-14&utm_source=pm')
  window.history.replaceState(
    null,
    '',
    '/wingsside/journeys?destination=hanoi&style=culture&duration=8-14&utm_source=pm',
  )
})

describe('WingSideJourneysClient', () => {
  it('renders typed cards with safe detail, plan and contact context links', () => {
    render(<WingSideJourneysClient context={context()} locale="en" />)

    const card = screen.getByRole('article', { name: /private hanoi/i })
    expect(
      within(card)
        .getByRole('link', { name: /private hanoi/i })
        .getAttribute('href'),
    ).toBe('/tour/private-hanoi?source=journeys&destination=hanoi&style=culture&duration=8-14')
    expect(screen.getByRole('link', { name: 'Plan trip' }).getAttribute('href')).toBe(
      '/plan-your-trip?intent=inquiry&source=journeys&destination=hanoi&style=culture&duration=8-14',
    )
    expect(screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')).toBe(
      '/contact-us?intent=contact&source=journeys&destination=hanoi&style=culture&duration=8-14',
    )
    expect(within(card).getByRole('img').getAttribute('src')).toBe('/media/hanoi.jpg')
    expect(within(card).getByText('6 days / 5 nights')).toBeTruthy()
    expect(within(card).getByText('Tailor-made quote')).toBeTruthy()
    expect(within(card).getByText('Designed around your dates and service level.')).toBeTruthy()
    expect(card.textContent).not.toMatch(/book now|available seats|instant booking/i)
  })

  it('renders localized honest on-request price state without availability claims', () => {
    render(
      <WingSideJourneysClient
        context={context({
          result: {
            ...context().result,
            items: [
              {
                ...context().result.items[0]!,
                currency: null,
                price: { kind: 'on-request' },
                priceFrom: 0,
              },
            ],
          },
        })}
        locale="es"
      />,
    )

    const card = screen.getByRole('article', { name: /private hanoi/i })
    expect(within(card).getByText('Presupuesto a medida')).toBeTruthy()
    expect(card.textContent).not.toMatch(/\$0|USD 0|Desde\s+0/)
    expect(card.textContent).not.toMatch(/book now|available seats|instant booking/i)
  })

  it('offers departures for fresh hybrid inventory without exposing direct booking', () => {
    render(
      <WingSideJourneysClient
        context={context({
          result: {
            ...context().result,
            items: [
              {
                ...context().result.items[0]!,
                commerce: {
                  availability: 'Guaranteed departure',
                  canBook: false,
                  departureDate: '2026-12-23',
                  price: { currency: 'USD', kind: 'from', value: 741 },
                },
                title: 'Hybrid Northern Vietnam',
                tourType: 'hybrid',
              },
            ],
          },
        })}
        locale="en"
      />,
    )

    const card = screen.getByRole('article', { name: /hybrid northern vietnam/i })
    expect(within(card).getByText('Small group / Private')).toBeTruthy()
    expect(within(card).getByText('View departures')).toBeTruthy()
    expect(card.textContent).toMatch(/741/)
    expect(card.textContent).toContain('Tailor-made quote')
    expect(card.textContent).not.toMatch(/\bbook\b|instant booking|available seats/i)
  })

  it('degrades expired group inventory to the contact availability posture', () => {
    render(
      <WingSideJourneysClient
        context={context({
          result: {
            ...context().result,
            items: [
              {
                ...context().result.items[0]!,
                currency: null,
                price: { kind: 'on-request' },
                priceFrom: null,
                title: 'Group Northern Vietnam',
                tourType: 'group',
              },
            ],
          },
        })}
        locale="en"
      />,
    )

    const card = screen.getByRole('article', { name: /group northern vietnam/i })
    expect(within(card).getByText('Schedule on request')).toBeTruthy()
    expect(within(card).getByText('Check availability')).toBeTruthy()
    const contact = within(card).getByRole('link', { name: /check availability/i })
    expect(contact.getAttribute('href')).toContain('/contact-us?')
    expect(contact.getAttribute('href')).toContain('intent=contact')
    expect(contact.getAttribute('href')).toContain('tourId=')
    expect(contact.getAttribute('href')).toContain('tour=')
    expect(card.textContent).not.toMatch(/\bbook\b|guaranteed departure|available seats/i)
  })

  it('degrades expired hybrid inventory to a private/contact quote posture', () => {
    render(
      <WingSideJourneysClient
        context={context({
          result: {
            ...context().result,
            items: [
              {
                ...context().result.items[0]!,
                currency: null,
                price: { kind: 'on-request' },
                priceFrom: null,
                title: 'Hybrid Northern Vietnam',
                tourType: 'hybrid',
              },
            ],
          },
        })}
        locale="en"
      />,
    )

    const card = screen.getByRole('article', { name: /hybrid northern vietnam/i })
    expect(within(card).getByText('Request quote')).toBeTruthy()
    const contact = within(card).getByRole('link', { name: /request quote/i })
    expect(contact.getAttribute('href')).toContain('/contact-us?')
    expect(contact.getAttribute('href')).toContain('intent=request-quote')
    expect(card.textContent).toContain('Dates and availability are confirmed with the team.')
    expect(card.textContent).toContain('Designed around your dates and service level.')
    expect(card.textContent).not.toMatch(/\bbook\b|guaranteed departure|available seats/i)
  })

  it('announces invalid values without raw values', () => {
    render(
      <WingSideJourneysClient
        context={context({
          query: { destination: 'hanoi', unknownValueCount: 2 },
          result: {
            ...context().result,
            appliedQuery: { destination: 'hanoi' },
            relaxed: null,
            unknownValueCount: 2,
          },
        })}
        locale="vi"
      />,
    )

    const notice = screen.getByTestId('journeys-notice').textContent || ''
    expect(notice).toContain('Một số giá trị lọc')
    expect(notice).not.toContain('raw-secret')
  })

  it('renders a true zero-result state with transparent recovery choices', () => {
    render(
      <WingSideJourneysClient
        context={context({
          query: {
            destination: 'sapa',
            duration: '8-14',
            style: 'business',
            unknownValueCount: 0,
          },
          result: {
            appliedQuery: { destination: 'sapa', duration: '8-14', style: 'business' },
            items: [],
            relaxed: null,
            total: 0,
            unknownValueCount: 0,
          },
        })}
        locale="en"
      />,
    )

    const empty = screen.getByTestId('journeys-empty')
    expect(within(empty).getByRole('heading').textContent).toBe(
      'No exact match yet — but we can design it.',
    )
    expect(within(empty).getByRole('link', { name: 'Share this brief' }).getAttribute('href')).toBe(
      '/plan-your-trip?intent=inquiry&source=journeys&destination=sapa&style=business&duration=8-14',
    )
    expect(within(empty).getByRole('link', { name: 'Remove Business' }).getAttribute('href')).toBe(
      '/journeys?destination=sapa&duration=8-14',
    )
    expect(
      within(empty).getByRole('link', { name: 'View all journeys' }).getAttribute('href'),
    ).toBe('/journeys')
    expect(screen.getByTestId('journeys-active-filters').textContent).toContain('Business')
    expect(screen.getByTestId('journeys-active-filters').textContent).toContain('Sa Pa')
    expect(screen.getByTestId('journeys-active-filters').textContent).toContain('8-14 days')
    expect(screen.queryByRole('link', { name: /private hanoi/i })).toBeNull()
  })

  it('keeps the remaining brief when style is removed and makes private CTAs explicit', () => {
    render(
      <WingSideJourneysClient
        context={context({
          query: {
            destination: 'hanoi',
            duration: '15-plus',
            q: 'quiet',
            style: 'business',
            type: 'group',
            unknownValueCount: 0,
          },
          result: {
            appliedQuery: {
              destination: 'hanoi',
              duration: '15-plus',
              q: 'quiet',
              style: 'business',
              type: 'group',
            },
            items: [],
            relaxed: null,
            total: 0,
            unknownValueCount: 0,
          },
        })}
        locale="en"
      />,
    )

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Find your Vietnam journey',
    )
    expect(screen.getByRole('link', { name: 'Remove Business' }).getAttribute('href')).toBe(
      '/journeys?q=quiet&type=group&destination=hanoi&duration=15-plus',
    )
    for (const link of screen.getAllByRole('link', { name: 'Design a private tour' })) {
      expect(link.getAttribute('href')).toBe(
        '/plan-your-trip?intent=request-quote&source=journeys&q=quiet&type=private&destination=hanoi&style=business&duration=15-plus',
      )
    }
  })

  it('uses an in-app transition for shareable public URL state and retains focus', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 128 })
    render(<WingSideJourneysClient context={context()} locale="en" />)
    screen.getByLabelText('Duration').focus()

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '1-7' } })

    const href = '/wing-side/journeys?destination=hanoi&style=culture&duration=1-7'
    expect(router.replace).toHaveBeenCalledWith(href, { scroll: false })
    expect(navigation.replaceDocumentLocation).not.toHaveBeenCalled()
    expect(router.refresh).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(restoreKey)).toBeNull()
    expect(document.activeElement).toBe(screen.getByLabelText('Duration'))
  })

  it('updates locale-aware public URL state from the rewritten internal pathname', () => {
    window.history.replaceState(
      null,
      '',
      '/wingsside/vi/journeys?destination=hanoi&style=culture&duration=8-14',
    )
    params = new URLSearchParams('destination=hanoi&style=culture&duration=8-14')

    render(<WingSideJourneysClient context={context()} locale="vi" />)
    screen.getByLabelText('Điểm đến').focus()

    fireEvent.change(screen.getByLabelText('Điểm đến'), { target: { value: 'hue' } })

    const href = '/wing-side/vi/journeys?destination=hue&style=culture&duration=8-14'
    expect(router.replace).toHaveBeenCalledWith(href, { scroll: false })
    expect(navigation.replaceDocumentLocation).not.toHaveBeenCalled()
    expect(router.refresh).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByLabelText('Điểm đến'))
  })

  it('keeps prior filters when destination, style and duration change sequentially', () => {
    window.history.replaceState(null, '', '/wingsside/journeys?utm_source=pm')
    params = new URLSearchParams('utm_source=pm')

    render(
      <WingSideJourneysClient
        context={context({
          query: { unknownValueCount: 1 },
          result: {
            ...context().result,
            appliedQuery: {},
            unknownValueCount: 1,
          },
        })}
        locale="en"
      />,
    )

    fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'hanoi' } })
    fireEvent.change(screen.getByLabelText('Style'), { target: { value: 'family' } })
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '15-plus' } })

    expect(router.replace).toHaveBeenNthCalledWith(1, '/wing-side/journeys?destination=hanoi', {
      scroll: false,
    })
    expect(router.replace).toHaveBeenNthCalledWith(
      2,
      '/wing-side/journeys?destination=hanoi&style=family',
      { scroll: false },
    )
    expect(router.replace).toHaveBeenNthCalledWith(
      3,
      '/wing-side/journeys?destination=hanoi&style=family&duration=15-plus',
      { scroll: false },
    )
    expect(navigation.replaceDocumentLocation).not.toHaveBeenCalled()
    expect(router.refresh).not.toHaveBeenCalled()
  })

  it('shows eight recommended cards first and loads more without weakening server filters', () => {
    const items = Array.from({ length: 10 }, (_, index) => ({
      ...context().result.items[0]!,
      duration: { days: 10 - index, nights: 9 - index },
      href: `/tour/journey-${index + 1}`,
      id: index + 1,
      slug: `journey-${index + 1}`,
      summary: index === 9 ? 'A quiet Mekong route.' : `Published journey ${index + 1}.`,
      title: index === 9 ? 'Mekong Slow Days' : `Journey ${index + 1}`,
    }))

    render(
      <WingSideJourneysClient
        context={context({ result: { ...context().result, items, total: items.length } })}
        locale="en"
      />,
    )

    expect(screen.getAllByRole('link', { name: /journey|mekong/i })).toHaveLength(8)
    expect(
      screen.getByRole('heading', { name: /10 journeys for Hanoi · Culture · 8-14 days/ }),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Load more journeys' }))
    expect(screen.getAllByRole('link', { name: /journey|mekong/i })).toHaveLength(10)

    expect(screen.getByRole('searchbox', { name: 'Search journeys' }).getAttribute('name')).toBe(
      'q',
    )
  })

  it('sorts the current strict result set by duration without changing query state', () => {
    const items = [
      {
        ...context().result.items[0]!,
        duration: { days: 9, nights: 8 },
        id: 1,
        title: 'Long route',
      },
      {
        ...context().result.items[0]!,
        duration: { days: 3, nights: 2 },
        id: 2,
        title: 'Short route',
      },
    ]
    render(
      <WingSideJourneysClient
        context={context({ result: { ...context().result, items, total: items.length } })}
        locale="en"
      />,
    )

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort' }), {
      target: { value: 'duration' },
    })

    const cards = screen.getAllByRole('link', { name: /route/i })
    expect(cards[0]?.textContent).toContain('Short route')
    expect(cards[1]?.textContent).toContain('Long route')
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('restores the changed filter focus and scroll after document navigation', () => {
    const href = '/wingsside/journeys?destination=hanoi&style=family&duration=15-plus'
    window.history.replaceState(null, '', href)
    window.sessionStorage.setItem(
      restoreKey,
      JSON.stringify({ focusName: 'style', href, scrollY: 246 }),
    )

    render(<WingSideJourneysClient context={context()} locale="en" />)

    expect(document.activeElement).toBe(screen.getByLabelText('Style'))
    expect(window.scrollTo).toHaveBeenCalledWith(0, 246)
    expect(window.sessionStorage.getItem(restoreKey)).toBeNull()
    expect(navigation.replaceDocumentLocation).not.toHaveBeenCalled()
  })
})
