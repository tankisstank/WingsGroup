import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { e2eBaseURL } from '../helpers/baseURL'
import { type DiscoveryDurationCode } from '@/tours/discoveryCore'
import {
  destinationLabels,
  getWingSideJourneysCopy,
  styleLabels,
  wingSideJourneyLocales,
  type WingSideJourneyLocale,
} from '@/tours/journeysCopy'
import {
  tourDestinationOptions,
  tourTravelStyleOptions,
  type TourDestinationKey,
  type TourTravelStyleKey,
} from '@/tours/taxonomy'

type ViewportCase = { height: number; label: string; width: number }
type QueryTriple = {
  destination: TourDestinationKey
  duration: DiscoveryDurationCode
  style: TourTravelStyleKey
}
type TourAPIRecord = {
  _status?: null | string
  destinationTags?: null | string[]
  durationDays?: null | number
  slug?: null | string
  title?: null | string
  travelStyles?: null | string[]
}

const origin = e2eBaseURL.replace(/\/$/, '')
const publicOrigin = 'https://wingside.vn'
const viewports: ViewportCase[] = [
  { height: 900, label: 'desktop 1440', width: 1440 },
  { height: 844, label: 'mobile 390', width: 390 },
]
const rawLeak = 'raw-secret-xss'
const bannedBookingClaims =
  /\b(book now|direct booking|instant booking|live availability|reserve online|available seats)\b/i

const localPrefix = (locale: WingSideJourneyLocale) =>
  locale === 'en' ? '/wingsside' : `/wingsside/${locale}`

const localPath = (locale: WingSideJourneyLocale, path: string) =>
  `${origin}${localHref(locale, path)}`

const localHref = (locale: WingSideJourneyLocale, path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${localPrefix(locale)}${normalizedPath === '/' ? '' : normalizedPath}`.replace(
    /\/+/g,
    '/',
  )
}

const canonicalFor = (locale: WingSideJourneyLocale, path = '/journeys') =>
  `${publicOrigin}${locale === 'en' ? '' : `/${locale}`}${path}`

const orderedParams = (query: QueryTriple) =>
  `destination=${query.destination}&style=${query.style}&duration=${query.duration}`

const expectCanonical = async (page: Page, href: string) => {
  const canonicalLinks = page.locator('link[rel="canonical"]')
  await expect(canonicalLinks.first()).toHaveAttribute('href', href)
  const canonicalHrefs = await canonicalLinks.evaluateAll((links) =>
    links.map((link) => link.getAttribute('href')),
  )
  expect(new Set(canonicalHrefs)).toEqual(new Set([href]))
}

const expectNoindex = async (page: Page) => {
  await expect(page.locator('meta[name="robots"][content*="noindex" i]')).toHaveCount(1)
}

const parseCount = async (page: Page) => {
  const text = (await page.locator('#journeys-results-title').innerText()).trim()
  const match = text.match(/\d+/)
  return match ? Number(match[0]) : 0
}

const waitForDiscoveryHydration = async (page: Page) => {
  await page.waitForFunction(() => {
    const select = document.querySelector<HTMLSelectElement>('select[name="destination"]')
    if (!select) return false
    const reactPropsKey = Object.keys(select).find((key) => key.startsWith('__reactProps$'))
    return Boolean(
      reactPropsKey &&
        typeof (select as unknown as Record<string, { onChange?: unknown }>)[reactPropsKey]
          ?.onChange === 'function',
    )
  })
}

const knownDestination = (value: string): value is TourDestinationKey =>
  tourDestinationOptions.some((option) => option.value === value)

const knownStyle = (value: string): value is TourTravelStyleKey =>
  tourTravelStyleOptions.some((option) => option.value === value)

const durationBucket = (days: number): DiscoveryDurationCode =>
  days <= 7 ? '1-7' : days <= 14 ? '8-14' : '15-plus'

const fetchWingSideTourSlugsFromSitemap = async (request: APIRequestContext) => {
  const response = await request.get(`${origin}/pages-sitemap.xml`, {
    headers: { host: 'wingside.vn' },
    timeout: 30_000,
  })
  expect(response.ok(), 'WingSide sitemap').toBe(true)
  const sitemap = await response.text()
  const slugs = new Set<string>()

  for (const [, loc] of sitemap.matchAll(/<loc>(.*?)<\/loc>/giu)) {
    const url = new URL(loc)
    const segments = url.pathname.split('/').filter(Boolean)
    const first = segments[0]
    if (wingSideJourneyLocales.includes(first as WingSideJourneyLocale)) segments.shift()
    if (segments[0] === 'tour' && segments[1]) slugs.add(segments[1])
  }

  expect(slugs.size, 'WingSide sitemap tour fixture slugs').toBeGreaterThan(0)
  return slugs
}

const fetchWingSideTours = async (request: APIRequestContext) => {
  const sitemapSlugs = await fetchWingSideTourSlugsFromSitemap(request)
  const response = await request.get(
    `${origin}/api/tour-products?depth=2&limit=100&locale=en&fallback-locale=false&where[_status][equals]=published`,
    { headers: { host: 'wingside.vn' }, timeout: 30_000 },
  )
  expect(response.ok(), 'published tour-products fixture API').toBe(true)
  const payload = (await response.json()) as { docs?: TourAPIRecord[] }

  return (payload.docs || [])
    .filter((tour) => typeof tour.slug === 'string' && sitemapSlugs.has(tour.slug))
    .filter(
      (tour) =>
        (tour._status == null || tour._status === 'published') &&
        typeof tour.title === 'string' &&
        typeof tour.durationDays === 'number',
    )
    .sort((left, right) => {
      const durationDelta = (left.durationDays || 0) - (right.durationDays || 0)
      if (durationDelta !== 0) return durationDelta
      return String(left.slug).localeCompare(String(right.slug), 'en', { numeric: true })
    })
}

const findExactQuery = (tours: TourAPIRecord[]): QueryTriple => {
  for (const tour of tours) {
    const destination = (tour.destinationTags || []).find(knownDestination)
    const style = (tour.travelStyles || []).find(knownStyle)
    if (destination && style && typeof tour.durationDays === 'number') {
      return { destination, duration: durationBucket(tour.durationDays), style }
    }
  }
  throw new Error(
    'US-054 E2E fixture blocker: no published WingSide sitemap tour has destination, style and duration data.',
  )
}

const findZeroResultQuery = (tours: TourAPIRecord[]): QueryTriple => {
  const byDestination = new Map<TourDestinationKey, Set<TourTravelStyleKey>>()
  for (const tour of tours) {
    for (const destination of (tour.destinationTags || []).filter(knownDestination)) {
      const set = byDestination.get(destination) || new Set<TourTravelStyleKey>()
      for (const style of (tour.travelStyles || []).filter(knownStyle)) set.add(style)
      byDestination.set(destination, set)
    }
  }

  for (const destination of tourDestinationOptions.map(({ value }) => value)) {
    const styles = byDestination.get(destination)
    if (!styles?.size) continue
    const missingStyle = tourTravelStyleOptions.find(({ value }) => !styles.has(value))?.value
    if (missingStyle) return { destination, duration: '8-14', style: missingStyle }
  }

  throw new Error(
    'US-054 E2E fixture blocker: seeded WingSide sitemap tours do not expose a destination with a missing style for zero-result recovery.',
  )
}

test.describe('WingSide guided journey discovery', () => {
  test('routes only WingSide tenant and keeps base discovery indexable', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000)

    const wrongTenant = await request.get(`${origin}/wingsgo/journeys`, { timeout: 30_000 })
    expect(wrongTenant.status(), 'non-WingSide tenant /journeys').toBe(404)

    const sitemap = await request.get(`${origin}/pages-sitemap.xml`, {
      headers: { host: 'wingside.vn' },
      timeout: 30_000,
    })
    expect(sitemap.ok(), 'WingSide sitemap').toBe(true)
    const sitemapBody = await sitemap.text()
    for (const locale of wingSideJourneyLocales) {
      expect(sitemapBody, `${locale} /journeys sitemap URL`).toContain(
        `<loc>${canonicalFor(locale)}</loc>`,
      )
    }
    expect(sitemapBody).not.toContain('?destination=')
    expect(sitemapBody).not.toContain('?style=')
    expect(sitemapBody).not.toContain('?duration=')

    for (const locale of wingSideJourneyLocales) {
      await page.goto(localPath(locale, '/journeys'), { waitUntil: 'domcontentloaded' })
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page.getByTestId('wingsside-journeys')).toBeVisible()
      await expect(
        page.getByRole('heading', { name: getWingSideJourneysCopy(locale).title }),
      ).toBeVisible()
      await expectCanonical(page, canonicalFor(locale))
      await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/i)
    }
  })

  test('renders localized filters at desktop and mobile sizes without booking claims', async ({
    page,
  }) => {
    test.setTimeout(240_000)

    for (const viewport of viewports) {
      await page.setViewportSize({ height: viewport.height, width: viewport.width })
      for (const locale of wingSideJourneyLocales) {
        const copy = getWingSideJourneysCopy(locale)
        await page.goto(localPath(locale, '/journeys'), { waitUntil: 'domcontentloaded' })

        await expect(
          page.getByLabel(copy.destination),
          `${viewport.label} ${locale} destination`,
        ).toBeVisible()
        await expect(page.getByLabel(copy.style), `${viewport.label} ${locale} style`).toBeVisible()
        await expect(
          page.getByLabel(copy.duration, { exact: true }),
          `${viewport.label} ${locale} duration`,
        ).toBeVisible()
        await expect(
          page.getByRole('option', { name: destinationLabels[locale].hanoi }),
          `${viewport.label} ${locale} destination label`,
        ).toBeAttached()
        await expect(
          page.getByRole('option', { name: styleLabels[locale].culture }),
          `${viewport.label} ${locale} style label`,
        ).toBeAttached()
        await expect(page.getByRole('link', { name: copy.plan }).first()).toBeVisible()
        await expect(page.getByRole('link', { name: copy.contact }).first()).toBeVisible()
        const firstPriceState = page.locator('.ws-journeys-card__price').first()
        if ((await firstPriceState.count()) > 0) {
          await expect(firstPriceState).toBeVisible()
        }
        await expect(page.locator('body')).not.toContainText(bannedBookingClaims)
      }
    }
  })

  test('restores exact shareable filters, preserves focus, and returns from detail with context', async ({
    page,
    request,
  }) => {
    test.setTimeout(240_000)

    const exact = findExactQuery(await fetchWingSideTours(request))
    const copy = getWingSideJourneysCopy('en')
    const exactURL = `${localPath('en', '/journeys')}?${orderedParams(exact)}`

    await page.goto(localPath('en', '/journeys'), { waitUntil: 'domcontentloaded' })
    await waitForDiscoveryHydration(page)
    await page.getByLabel(copy.destination).selectOption(exact.destination)
    await expect(page).toHaveURL(new RegExp(`destination=${exact.destination}`), {
      timeout: 60_000,
    })
    await waitForDiscoveryHydration(page)
    await page.getByLabel(copy.style).selectOption(exact.style)
    await expect(page).toHaveURL(new RegExp(`style=${exact.style}`), { timeout: 60_000 })
    await waitForDiscoveryHydration(page)

    const duration = page.getByLabel(copy.duration, { exact: true })
    await duration.focus()
    await duration.selectOption(exact.duration)
    await expect(page).toHaveURL(exactURL, { timeout: 60_000 })
    await expect(duration).toBeFocused()
    await expectCanonical(page, canonicalFor('en'))
    await expectNoindex(page)
    expect(await parseCount(page), 'exact filtered result count').toBeGreaterThan(0)
    await expect(page.locator('[data-testid="journeys-notice"]')).toHaveCount(0)

    const firstCard = page.locator('.ws-journeys-card').first()
    await expect(firstCard.locator('.ws-journeys-card__price')).toContainText(
      /from|schedule on request|tailor-made quote/i,
    )
    await expect(firstCard).toHaveAttribute(
      'href',
      new RegExp(
        `source=journeys.*destination=${exact.destination}.*style=${exact.style}.*duration=${exact.duration}`,
      ),
    )
    await firstCard.click()
    await expect(page).toHaveURL(
      new RegExp(
        `/wingsside/tour/.+source=journeys.*destination=${exact.destination}.*style=${exact.style}.*duration=${exact.duration}`,
      ),
      { timeout: 60_000 },
    )

    const detailRequest = page
      .getByRole('link', {
        name: /request consultation|yeu cau tu van|richiedi|solicita|pedido/i,
      })
      .first()
    await expect(detailRequest).toHaveAttribute(
      'href',
      new RegExp(
        `source=tour-detail.*destination=${exact.destination}.*style=${exact.style}.*duration=${exact.duration}`,
      ),
    )
    await detailRequest.click()
    await expect(page).toHaveURL(
      new RegExp(
        `/wingsside/contact-us\\?intent=inquiry.*destination=${exact.destination}.*style=${exact.style}.*duration=${exact.duration}`,
      ),
      { timeout: 60_000 },
    )
    await expect(page.locator('textarea[name="message"]')).toHaveValue('')
    const contactForm = page.locator('form').filter({
      has: page.locator('textarea[name="message"]'),
    })
    await expect(contactForm).toHaveAttribute('data-ws-enquiry-context', /"discovery"/)
    const contactContext = JSON.parse(
      (await contactForm.getAttribute('data-ws-enquiry-context')) || '{}',
    )
    expect(contactContext.discovery).toMatchObject(exact)

    await page.goto(exactURL, { waitUntil: 'domcontentloaded' })
    await page.locator('.ws-journeys-card').first().click()
    await expect(page).toHaveURL(/\/wingsside\/tour\/.+source=journeys/, {
      timeout: 60_000,
    })
    await page.goBack({ waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(exactURL)
    await expect(page.getByLabel(copy.destination)).toHaveValue(exact.destination)
    await expect(page.getByLabel(copy.style)).toHaveValue(exact.style)
    await expect(page.getByLabel(copy.duration, { exact: true })).toHaveValue(exact.duration)
  })

  test('drops invalid values without raw leakage and keeps filtered URLs noindex canonical-to-base', async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000)

    const zeroResult = findZeroResultQuery(await fetchWingSideTours(request))
    const invalidURL = `${localPath('en', '/journeys')}?debug=${rawLeak}&destination=${rawLeak}&destination=${zeroResult.destination}&style=${rawLeak}&duration=99`

    await page.goto(invalidURL, { waitUntil: 'domcontentloaded' })
    await expectCanonical(page, canonicalFor('en'))
    await expectNoindex(page)
    await expect(page.getByTestId('journeys-notice')).toContainText(
      getWingSideJourneysCopy('en').invalidNotice,
    )
    await expect(page.getByLabel('Destination')).toHaveValue(zeroResult.destination)
    await expect(page.getByLabel('Style')).toHaveValue('')
    await expect(page.getByLabel('Duration', { exact: true })).toHaveValue('')
    await expect(page.locator('body')).not.toContainText(rawLeak)

    const hrefs = await page
      .locator('a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') || ''))
    for (const href of hrefs) {
      expect(href, `raw value leaked into href: ${href}`).not.toContain(rawLeak)
      expect(href, `unrelated debug key leaked into href: ${href}`).not.toContain('debug=')
    }
  })

  test('shows a true zero result and transparent recovery actions', async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000)

    const zeroResult = findZeroResultQuery(await fetchWingSideTours(request))
    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto(`${localPath('en', '/journeys')}?${orderedParams(zeroResult)}`, {
      waitUntil: 'domcontentloaded',
    })

    expect(await parseCount(page), 'strict AND result count').toBe(0)
    await expect(page.getByTestId('journeys-empty')).toContainText(
      'No exact match yet — but we can design it.',
    )

    const planHref = `${localHref('en', '/plan-your-trip')}?intent=inquiry&source=journeys&${orderedParams(zeroResult)}`
    const removeStyleHref = `${localHref('en', '/journeys')}?destination=${zeroResult.destination}&duration=${zeroResult.duration}`
    const journeys = page.getByTestId('wingsside-journeys')
    await expect(journeys.getByRole('link', { name: 'Share this brief' })).toHaveAttribute(
      'href',
      planHref,
    )
    await expect(
      journeys.getByRole('link', { name: `Remove ${styleLabels.en[zeroResult.style]}` }),
    ).toHaveAttribute('href', removeStyleHref)
    await expect(journeys.getByRole('link', { name: 'View all journeys' })).toHaveAttribute(
      'href',
      localHref('en', '/journeys'),
    )

    await journeys.getByRole('link', { name: 'Share this brief' }).click()
    await expect(page).toHaveURL(`${origin}${planHref}`, { timeout: 60_000 })
    await page.goto(`${localPath('en', '/plan-your-trip')}?q=route&type=private&${orderedParams(zeroResult)}`, { waitUntil: 'domcontentloaded' })
    const message = page.locator('textarea[name="message"]')
    await expect(message).toHaveValue('')
    await message.fill('Visitor-authored request.')
    await expect(message).toHaveValue('Visitor-authored request.')
    const planForm = page.locator('.ws-hifi-plan-form form')
    await expect(planForm).toHaveAttribute('data-ws-enquiry-context', /"discovery"/)
    const context = await planForm.evaluate((form) =>
      JSON.parse((form as HTMLFormElement).dataset.wsEnquiryContext || '{}'),
    )
    expect(context.discovery).toMatchObject({
      destination: zeroResult.destination,
      duration: zeroResult.duration,
      q: 'route',
      style: zeroResult.style,
      type: 'private',
    })
  })
})
