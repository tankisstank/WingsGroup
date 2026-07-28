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

    const card = screen.getByRole('link', { name: /private hanoi/i })
    expect(card.getAttribute('href')).toBe(
      '/tour/private-hanoi?source=journeys&destination=hanoi&style=culture&duration=8-14',
    )
    expect(screen.getByRole('link', { name: 'Plan trip' }).getAttribute('href')).toBe(
      '/plan-your-trip?intent=inquiry&source=journeys&destination=hanoi&style=culture&duration=8-14',
    )
    expect(screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')).toBe(
      '/contact-us?intent=contact&source=journeys&destination=hanoi&style=culture&duration=8-14',
    )
    expect(within(card).getByRole('img').getAttribute('src')).toBe('/media/hanoi.jpg')
    expect(within(card).getByText('6 days / 5 nights')).toBeTruthy()
    expect(within(card).getByText('From $1,290')).toBeTruthy()
    expect(within(card).getByText('Final price is confirmed before any hold.')).toBeTruthy()
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

    const card = screen.getByRole('link', { name: /private hanoi/i })
    expect(within(card).getByText('Precio bajo solicitud')).toBeTruthy()
    expect(
      within(card).getByText('El precio final se confirma antes de cualquier reserva.'),
    ).toBeTruthy()
    expect(card.textContent).not.toMatch(/\$0|USD 0|Desde\s+0/)
    expect(card.textContent).not.toMatch(/book now|available seats|instant booking/i)
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
    expect(
      within(empty).getByRole('link', { name: 'Remove Business' }).getAttribute('href'),
    ).toBe('/journeys?destination=sapa&duration=8-14')
    expect(
      within(empty).getByRole('link', { name: 'View all journeys' }).getAttribute('href'),
    ).toBe('/journeys')
    expect(screen.getByTestId('journeys-active-filters').textContent).toContain('Business')
    expect(screen.getByTestId('journeys-active-filters').textContent).toContain('Sa Pa')
    expect(screen.getByTestId('journeys-active-filters').textContent).toContain('8-14 days')
    expect(screen.queryByRole('link', { name: /private hanoi/i })).toBeNull()
  })

  it('uses full-document replace for shareable public URL state', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 128 })
    render(<WingSideJourneysClient context={context()} locale="en" />)
    screen.getByLabelText('Duration').focus()

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '1-7' } })

    const href = '/wingsside/journeys?destination=hanoi&style=culture&duration=1-7'
    expect(navigation.replaceDocumentLocation).toHaveBeenCalledWith(href)
    expect(router.replace).not.toHaveBeenCalled()
    expect(router.refresh).not.toHaveBeenCalled()
    expect(JSON.parse(window.sessionStorage.getItem(restoreKey) || '{}')).toEqual({
      focusName: 'duration',
      href,
      scrollY: 128,
    })
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

    const href = '/wingsside/vi/journeys?destination=hue&style=culture&duration=8-14'
    expect(navigation.replaceDocumentLocation).toHaveBeenCalledWith(href)
    expect(router.replace).not.toHaveBeenCalled()
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

    expect(navigation.replaceDocumentLocation).toHaveBeenNthCalledWith(
      1,
      '/wingsside/journeys?destination=hanoi',
    )
    expect(navigation.replaceDocumentLocation).toHaveBeenNthCalledWith(
      2,
      '/wingsside/journeys?destination=hanoi&style=family',
    )
    expect(navigation.replaceDocumentLocation).toHaveBeenNthCalledWith(
      3,
      '/wingsside/journeys?destination=hanoi&style=family&duration=15-plus',
    )
    expect(router.replace).not.toHaveBeenCalled()
    expect(router.refresh).not.toHaveBeenCalled()
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
