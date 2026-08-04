import { expect, test, type Page } from '@playwright/test'

import { e2eBaseURL } from '../helpers/baseURL'
import { wingSideJourneyFixtureManifest } from '../fixtures/wingssideJourneyFixtureManifest'
import {
  destinationLabels,
  getWingSideJourneysCopy,
  styleLabels,
  wingSideJourneyLocales,
  type WingSideJourneyLocale,
} from '@/tours/journeysCopy'

type ViewportCase = { height: number; label: string; width: number }
type QueryTriple = {
  destination: string
  duration: string
  style: string
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

const waitForDiscoveryHydration = async (page: Page) =>
  expect(page.getByTestId('wingsside-journeys')).toHaveAttribute('data-client-ready', 'true')

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
        page.getByTestId('journeys-hero').getByRole('heading', { level: 1 }),
      ).toBeVisible()
      await expectCanonical(page, canonicalFor(locale))
      await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/i)
    }
  })

  test('renders the bounded synthetic discovery catalog', async ({ page }) => {
    await page.goto(localPath('en', '/journeys'), { waitUntil: 'domcontentloaded' })
    await waitForDiscoveryHydration(page)

    expect(await parseCount(page), 'synthetic discovery catalog count').toBe(
      wingSideJourneyFixtureManifest.catalog.tourCount,
    )
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
        await expect(
          page.getByTestId('wingsside-journeys').locator('a[href*="/contact-us" ]').first(),
        ).toBeVisible()
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
  }) => {
    test.setTimeout(240_000)

    const exact = wingSideJourneyFixtureManifest.queryCases.exact.query
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
    const detailLink = firstCard.locator('.ws-journeys-card__detail')
    await expect(detailLink).toHaveAttribute(
      'href',
      new RegExp(
        `source=journeys.*destination=${exact.destination}.*style=${exact.style}.*duration=${exact.duration}`,
      ),
    )
    await detailLink.click()
    await expect(page).toHaveURL(
      new RegExp(
        `/wingsside/tour/.+source=journeys.*destination=${exact.destination}.*style=${exact.style}.*duration=${exact.duration}`,
      ),
      { timeout: 60_000 },
    )

    const detailRequest = page
      .locator('a[href*="/contact-us" ][href*="source=tour-detail" ]')
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
    await expect(page.getByText('Contact form is not linked in Payload yet.')).toBeVisible()
    await expect(
      page.getByText(`${exact.destination} · ${exact.style} · ${exact.duration}`, { exact: false }),
    ).toBeVisible()

    await page.goto(exactURL, { waitUntil: 'domcontentloaded' })
    await page.locator('.ws-journeys-card__detail').first().click()
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
  }) => {
    test.setTimeout(180_000)

    const zeroResult = wingSideJourneyFixtureManifest.queryCases.zeroResult.query
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

  test('shows a true zero result and transparent recovery actions', async ({ page }) => {
    test.setTimeout(180_000)

    const zeroResult = {
      ...wingSideJourneyFixtureManifest.queryCases.zeroResult.query,
      q: 'zz-no-result',
      type: 'group' as const,
    }
    const zeroResultParams = `q=${encodeURIComponent(zeroResult.q)}&type=${zeroResult.type}&${orderedParams(zeroResult)}`
    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto(`${localPath('en', '/journeys')}?${zeroResultParams}`, {
      waitUntil: 'domcontentloaded',
    })

    expect(await parseCount(page), 'strict AND result count').toBe(0)
    await expect(page.getByTestId('journeys-empty')).toContainText(
      'No exact match yet — but we can design it.',
    )

    const planHref = `${localHref('en', '/plan-your-trip')}?intent=inquiry&source=journeys&${zeroResultParams}`
    const removeStyleHref = `${localHref('en', '/journeys')}?q=${encodeURIComponent(zeroResult.q)}&type=${zeroResult.type}&destination=${zeroResult.destination}&duration=${zeroResult.duration}`
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
    await page.goto(
      `${localPath('en', '/plan-your-trip')}?q=route&type=private&${orderedParams(zeroResult)}`,
      { waitUntil: 'domcontentloaded' },
    )
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
