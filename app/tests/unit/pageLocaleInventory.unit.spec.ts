import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  draftMode: vi.fn(),
  getCurrentSite: vi.fn(),
}))

vi.mock('next/headers', () => ({
  draftMode: mocks.draftMode,
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

vi.mock('@/utilities/siteContext', () => ({
  getCurrentSite: mocks.getCurrentSite,
}))

import { queryPublishedPageLocalesByExactPath } from '@/utilities/pageLocaleInventory'

type TestPage = {
  _status?: 'draft' | 'published'
  id: number
  locale: string
  title: string
  pathname: string
  site: number
  slug: string
}

type TestTour = {
  _status?: 'draft' | 'published'
  locale: string
  site: number
  slug: string
  wrapperPage: number
}

const page = (overrides: Partial<TestPage>): TestPage => ({
  _status: 'published',
  id: 1,
  locale: 'en',
  pathname: '/contact-us',
  site: 22,
  slug: 'contact-us',
  title: 'Contact',
  ...overrides,
})

const buildPayload = (pages: TestPage[], tours: TestTour[] = []) => ({
  find: vi.fn(async (args: {
    collection: 'pages' | 'tour-products'
    locale?: string
    where?: { and?: unknown[] }
  }) => {
    const clauses = args.where?.and || []
    const siteClause = clauses.find(
      (clause): clause is { site: { equals: number } } =>
        Boolean(clause && typeof clause === 'object' && 'site' in clause),
    )
    const pathClause = clauses.find(
      (clause): clause is { pathname: { equals: string } } =>
        Boolean(clause && typeof clause === 'object' && 'pathname' in clause),
    )
    const statusClause = clauses.find(
      (clause): clause is { _status: { equals: string } } =>
        Boolean(clause && typeof clause === 'object' && '_status' in clause),
    )
    const slugClause = clauses.find(
      (clause): clause is { slug: { equals: string } } =>
        Boolean(clause && typeof clause === 'object' && 'slug' in clause),
    )

    if (args.collection === 'tour-products') {
      return {
        docs: tours.filter(
          (entry) =>
            entry.locale === args.locale &&
            entry.site === siteClause?.site.equals &&
            entry.slug === slugClause?.slug.equals &&
            (!statusClause || (entry._status || 'published') === statusClause._status.equals),
        ),
      }
    }

    return {
      docs: pages.filter(
        (entry) =>
          entry.locale === args.locale &&
          entry.site === siteClause?.site.equals &&
          entry.pathname === pathClause?.pathname.equals &&
          (!statusClause || entry._status === statusClause._status.equals),
      ),
    }
  }),
})

describe('page locale inventory', () => {
  beforeEach(() => {
    mocks.draftMode.mockResolvedValue({ isEnabled: false })
    mocks.getCurrentSite.mockResolvedValue({
      code: 'wing-side',
      defaultLocale: 'vi',
      id: 22,
      supportedLocales: ['vi', 'en', 'it', 'es', 'pt'],
    })
  })

  it('keeps only exact published same-tenant path locales', async () => {
    const payload = buildPayload([
      page({ locale: 'vi' }),
      page({ locale: 'en' }),
      page({ locale: 'it', pathname: '/other/contact-us' }),
      page({ _status: 'draft', locale: 'es' }),
      page({ locale: 'pt', site: 99 }),
    ])

    await expect(
      queryPublishedPageLocalesByExactPath({
        payload: payload as never,
        requestedPath: '/contact-us',
      }),
    ).resolves.toEqual(['vi', 'en'])

    expect(payload.find).toHaveBeenCalledTimes(5)
    for (const [args] of payload.find.mock.calls) {
      expect(args).toEqual(
        expect.objectContaining({
          draft: false,
          fallbackLocale: false,
          overrideAccess: false,
        }),
      )
      expect(args.where?.and).toContainEqual({ _status: { equals: 'published' } })
    }
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'pages',
        draft: false,
        fallbackLocale: false,
        locale: 'it',
        overrideAccess: false,
        where: expect.objectContaining({
          and: expect.arrayContaining([
            { site: { equals: 22 } },
            { pathname: { equals: '/contact-us' } },
            { _status: { equals: 'published' } },
          ]),
        }),
      }),
    )
    expect(
      JSON.stringify(payload.find.mock.calls.map(([args]) => args.where)),
    ).not.toContain('"slug"')
    expect(
      await queryPublishedPageLocalesByExactPath({
        payload: payload as never,
        requestedPath: '/does-not-exist',
      }),
    ).toEqual([])
  })

  it('keeps draft inventory out of published metadata mode', async () => {
    const payload = buildPayload([page({ _status: 'draft', locale: 'en' })])

    await expect(
      queryPublishedPageLocalesByExactPath({
        payload: payload as never,
        requestedPath: '/contact-us',
      }),
    ).resolves.toEqual([])
  })

  it('does not let draft mode broaden the public hreflang inventory', async () => {
    mocks.draftMode.mockResolvedValue({ isEnabled: true })
    const payload = buildPayload([
      page({ locale: 'vi' }),
      page({ _status: 'draft', locale: 'en' }),
      page({ locale: 'es', site: 99 }),
    ])

    await expect(
      queryPublishedPageLocalesByExactPath({
        payload: payload as never,
        requestedPath: '/contact-us',
      }),
    ).resolves.toEqual(['vi'])

    expect(mocks.draftMode).not.toHaveBeenCalled()
    for (const [args] of payload.find.mock.calls) {
      expect(args).toEqual(
        expect.objectContaining({
          draft: false,
          fallbackLocale: false,
          overrideAccess: false,
        }),
      )
      expect(args.where?.and).toContainEqual({ _status: { equals: 'published' } })
    }
  })

  it('narrows WingSide tour hreflang to locales with matching runtime tour data', async () => {
    const payload = buildPayload(
      [
        page({ id: 101, locale: 'vi', pathname: '/tour/private-hanoi', slug: 'private-hanoi' }),
        page({ id: 101, locale: 'en', pathname: '/tour/private-hanoi', slug: 'private-hanoi' }),
        page({ id: 101, locale: 'it', pathname: '/tour/private-hanoi', slug: 'private-hanoi' }),
        page({ id: 101, locale: 'es', pathname: '/tour/private-hanoi', slug: 'private-hanoi' }),
        page({ id: 101, locale: 'pt', pathname: '/tour/private-hanoi', slug: 'private-hanoi' }),
      ],
      [
        { locale: 'vi', site: 22, slug: 'private-hanoi', wrapperPage: 101 },
        { locale: 'en', site: 22, slug: 'private-hanoi', wrapperPage: 101 },
        { locale: 'it', site: 22, slug: 'private-hanoi', wrapperPage: 999 },
        {
          _status: 'draft',
          locale: 'es',
          site: 22,
          slug: 'private-hanoi',
          wrapperPage: 101,
        },
        { locale: 'pt', site: 99, slug: 'private-hanoi', wrapperPage: 101 },
      ],
    )

    await expect(
      queryPublishedPageLocalesByExactPath({
        payload: payload as never,
        requestedPath: '/tour/private-hanoi',
      }),
    ).resolves.toEqual(['vi', 'en'])

    expect(payload.find).toHaveBeenCalledTimes(10)
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'tour-products',
        depth: 0,
        draft: false,
        fallbackLocale: false,
        locale: 'it',
        overrideAccess: false,
        select: { wrapperPage: true },
        where: expect.objectContaining({
          and: expect.arrayContaining([
            { site: { equals: 22 } },
            { slug: { equals: 'private-hanoi' } },
            { _status: { equals: 'published' } },
          ]),
        }),
      }),
    )
    const queriedCollections = payload.find.mock.calls.map(([args]) => args.collection)
    expect(queriedCollections).not.toContain('tour-departures')
    expect(queriedCollections).not.toContain('departure-variants')
  })
})
