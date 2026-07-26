import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page, TestInfo } from '@playwright/test'

import { e2eBaseURL } from '../helpers/baseURL'
import { heroPresentationFixturePaths, seedPhase1LaunchSmoke } from '../helpers/seedPhase1Launch'
import { heroPresentationDefinitions } from '../../src/heros/presentations/registry'
import { isSupportedLocale } from '../../src/utilities/locales'

const phase1Routes = [
  {
    path: '/',
    title: /WingsGroup/,
    heading: 'WingsGroup - hệ sinh thái du lịch nhiều line business dưới một lớp tin cậy chung',
  },
  {
    path: '/en',
    title: /WingsGroup/,
    heading: 'WingsGroup - a travel ecosystem with several business lines under one trust layer',
  },
  {
    path: '/he-sinh-thai',
    title: /Hệ sinh thái WingsGroup/,
    heading: 'Một hệ sinh thái, nhiều hành trình chuyên biệt',
  },
  {
    path: '/nang-luc-dich-vu',
    title: /Năng lực dịch vụ/,
    heading: 'Một doanh nghiệp, nhiều lớp năng lực dịch vụ',
  },
  {
    path: '/tin-tuc',
    title: /Tin tức/,
    heading: 'Tin tức, bài giải thích và lớp editorial chung của hệ',
  },
  { path: '/wingsgo', title: /WingsGo/, heading: 'WingsGo' },
  { path: '/wingsgo/thi-truong/han-quoc', title: /Tour Hàn Quốc/, heading: 'Tour Hàn Quốc' },
  { path: '/wingsside', title: /WingsSide/, heading: 'Tailor-made Vietnam journeys' },
  { path: '/wingsside/destinations/ha-noi', title: /Hanoi/, heading: 'Hanoi' },
  { path: '/wingsplus', title: /WingsPlus/ },
  { path: '/wingscare', title: /WingsCare/ },
  { path: '/wingspass', title: /WingsPass/ },
  { path: '/wingsside/en', title: /WingsSide/, heading: 'Tailor-made Vietnam journeys' },
] as const

const linkAuditRoutes = [
  '/',
  '/tin-tuc',
  '/posts',
  '/search',
  '/wingsgo',
  '/wingsgo/posts',
  '/wingsgo/search',
  '/wingsside',
  '/wingsside/en',
  '/wingsside/it',
  '/wingsside/es',
  '/wingsside/pt',
  '/wingsside/posts',
  '/wingsside/search',
  '/wingspass',
  '/wingspass/search',
  '/wingscare',
  '/wingscare/search',
  '/wingsplus',
  '/wingsplus/case-studies',
  '/wingsplus/nang-luc-dich-vu',
  '/wingsplus/search',
] as const

const wingsSidePublicAdLocales = ['en', 'it', 'es', 'pt'] as const
const cmsOnlyLocales = ['ja', 'ko', 'fr', 'de'] as const
const wingsSideCorePages = [
  {
    heading: 'Tailor-made Vietnam journeys',
    path: '/wingsside',
    title: /WingsSide/,
  },
  {
    heading: 'Explore Vietnam by destination',
    path: '/wingsside/destinations',
    title: /Destinations/,
  },
  {
    heading: 'Travel styles help guests self-qualify the right route',
    path: '/wingsside/styles',
    title: /Travel styles/,
  },
  {
    heading: 'Sample itineraries show possibility, not rigid product grids',
    path: '/wingsside/packages',
    title: /Vietnam packages/,
  },
  {
    heading: 'Plan your Vietnam journey with a local team',
    path: '/wingsside/plan-your-trip',
    title: /Plan your trip/,
  },
  {
    heading: 'Tell us what kind of Vietnam journey you want to build',
    path: '/wingsside/contact-us',
    title: /Contact/,
  },
] as const

const ignoredInternalPath = (path: string) =>
  path.startsWith('/admin') ||
  path.startsWith('/api/') ||
  path.startsWith('/_next') ||
  /\.(png|jpe?g|webp|gif|svg|ico|css|js|json|xml|txt|map)$/i.test(path)

const normalizeInternalHref = (href: string, fromPath: string) => {
  if (
    !href ||
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('javascript:')
  ) {
    return null
  }

  const base = new URL(e2eBaseURL)
  const url = new URL(href, new URL(fromPath, base))

  if (url.origin !== base.origin) {
    return null
  }

  const path = url.pathname.replace(/\/+$/, '') || '/'

  if (ignoredInternalPath(path)) {
    return null
  }

  return `${path}${url.search}`
}

const countPrimaryNavRows = (page: Page) =>
  page
    .locator('.site-header__nav > nav[aria-label="Primary navigation"] > *')
    .evaluateAll((elements) => {
      const visibleTops = elements
        .filter((element) => getComputedStyle(element).display !== 'none')
        .map((element) => element.getBoundingClientRect().top)

      if (visibleTops.length === 0) return 0

      const topSpread = Math.max(...visibleTops) - Math.min(...visibleTops)

      return topSpread <= 8 ? 1 : new Set(visibleTops.map((top) => Math.round(top))).size
    })

const getContrastAgainstWhiteText = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const match = getComputedStyle(element)
      .backgroundColor.match(/[\d.]+/g)
      ?.map(Number)
    if (!match || match.length < 3) return 0

    const alpha = match[3] ?? 1
    const composited = match.slice(0, 3).map((channel) => channel * alpha + 255 * (1 - alpha))
    const luminance = composited
      .map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.04045
          ? normalized / 12.92
          : Math.pow((normalized + 0.055) / 1.055, 2.4)
      })
      .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0)

    return 1.05 / (luminance + 0.05)
  })

const extractInternalLinks = (html: string, fromPath: string) =>
  Array.from(html.matchAll(/<a\s+(?:[^>]*?\s+)?href=(['"])(.*?)\1/gi))
    .map((match) => normalizeInternalHref(match[2].replaceAll('&amp;', '&'), fromPath))
    .filter((href): href is string => Boolean(href))

const getRouteTenantAlias = (path: string) => path.split('/').filter(Boolean)[0] || ''

const getRouteLocale = (path: string) => {
  const segments = path.split('/').filter(Boolean)
  const offset = segments[0] === 'wingsside' ? 1 : 0
  const candidate = segments[offset]

  return ['vi', 'en', 'it', 'es', 'pt'].includes(candidate || '') ? candidate : 'vi'
}

const localizeWingsSideRoute = (pathname: string, locale: 'en' | 'es' | 'it' | 'pt' | 'vi') => {
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`
  const prefix = locale === 'vi' ? '/wingsside' : `/wingsside/${locale}`

  return `${prefix}${normalizedPathname === '/' ? '' : normalizedPathname}`.replace(/\/+/g, '/')
}

const loadWingSideTourDetailAuditRoutes = async (
  request: APIRequestContext,
  testInfo: TestInfo,
): Promise<string[]> => {
  const response = await request.get('/api/tour-products?limit=100&depth=1')
  if (!response.ok()) {
    await testInfo.attach('wingsside-tour-detail-inventory-unavailable', {
      body: `GET /api/tour-products failed with ${response.status()}`,
      contentType: 'text/plain',
    })
    return []
  }

  const payload = (await response.json()) as {
    docs?: Array<{
      _status?: string
      site?: { code?: string } | number | string
      slug?: string
      wrapperPage?: { pathname?: string; site?: { code?: string } | number | string } | null
    }>
  }
  const tourPaths = new Set<string>()

  for (const doc of payload.docs || []) {
    const siteCode =
      typeof doc.site === 'object'
        ? doc.site?.code
        : typeof doc.wrapperPage?.site === 'object'
          ? doc.wrapperPage.site?.code
          : undefined
    if (siteCode !== 'wing-side' || doc._status === 'draft') continue

    const pathname = doc.wrapperPage?.pathname || (doc.slug ? `/tour/${doc.slug}` : null)
    if (!pathname?.startsWith('/tour/')) continue

    for (const locale of ['vi', 'en', 'it', 'es', 'pt'] as const) {
      tourPaths.add(localizeWingsSideRoute(pathname, locale))
    }
  }

  const routes = [...tourPaths].sort().slice(0, 22 * 5)
  await testInfo.attach('wingsside-tour-detail-inventory-routes', {
    body: JSON.stringify({ routeCount: routes.length, routes }, null, 2),
    contentType: 'application/json',
  })

  return routes
}

test.describe('Phase 1 public frontend smoke', () => {
  test.beforeAll(async () => {
    if (process.env.PLAYWRIGHT_SKIP_PHASE1_SEED === 'true') return

    await seedPhase1LaunchSmoke()
  })

  for (const route of phase1Routes) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(`${e2eBaseURL}${route.path}`)
      await expect(page).toHaveTitle(route.title)
      if ('heading' in route) {
        await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
      }
      await expect(page.getByRole('banner')).toBeVisible()
    })
  }

  test('renders WingsPlus primary navigation in Vietnamese and English', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1600 })

    await page.goto(`${e2eBaseURL}/wingsplus`)
    const viNavigation = page.getByRole('navigation', { name: 'Primary navigation' })
    await expect(viNavigation.getByRole('link', { name: 'Trang chủ' })).toBeVisible()
    await expect(viNavigation.getByRole('link', { name: 'Tour riêng' })).toBeVisible()
    await expect(viNavigation.getByRole('link', { name: 'MICE' })).toBeVisible()
    await expect(viNavigation.getByRole('link', { name: 'Thị trường đặc biệt' })).toBeVisible()
    await expect(viNavigation.getByRole('link', { name: 'Điểm đến' })).toBeVisible()
    await expect(viNavigation.getByRole('link', { name: 'Gửi yêu cầu' }).first()).toBeVisible()

    await page.goto(`${e2eBaseURL}/wingsplus/en`)
    const enNavigation = page.getByRole('navigation', { name: 'Primary navigation' })
    await expect(enNavigation.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(enNavigation.getByRole('link', { name: 'Private Tours' })).toBeVisible()
    await expect(enNavigation.getByRole('link', { name: 'MICE' })).toBeVisible()
    await expect(enNavigation.getByRole('link', { name: 'Special Markets' })).toBeVisible()
    await expect(enNavigation.getByRole('link', { name: 'Destinations' })).toBeVisible()
    await expect(
      enNavigation.getByRole('link', { exact: true, name: 'Request Proposal' }),
    ).toBeVisible()
  })

  test('renders site-specific theme tokens for child sites', async ({ page }) => {
    await page.goto(`${e2eBaseURL}/wingsgo`)

    await expect(page.locator('body')).toHaveAttribute('data-site-theme', 'wings-go')
    await expect(page.locator('body')).toHaveAttribute('data-site-preset', 'retail')
    await expect(page.locator('body')).toHaveAttribute('data-site-layout', 'retail')
    await expect(page.locator('body')).toHaveAttribute('style', /--site-brand:\s*#1D4ED8/i)
    await expect(page.locator('body')).toHaveAttribute('style', /--site-accent:\s*#F97316/i)

    await page.goto(`${e2eBaseURL}/wingsside`)

    await expect(page.locator('body')).toHaveAttribute('data-site-theme', 'custom')
    await expect(page.locator('body')).toHaveAttribute(
      'data-site-preset',
      'wings-side-editorial-inbound-v2',
    )
    await expect(page.locator('body')).toHaveAttribute('data-site-layout', 'editorial')
    await expect(page.locator('body')).toHaveAttribute('style', /--site-brand:\s*#005090/i)
    await expect(page.locator('body')).toHaveAttribute('style', /--site-accent:\s*#104030/i)
  })

  test('serves WingsSide public ad locales with governed localized chrome', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 })

    const searchHeadingByLocale = {
      en: 'Search tours, destinations, and campaigns quickly',
      es: 'Busca con rapidez tours, destinos y campañas',
      it: 'Cerca rapidamente tour, destinazioni e campagne',
      pt: 'Pesquise rapidamente tours, destinos e campanhas',
    } as const
    const planCtaByLocale = {
      en: 'Plan trip',
      es: 'Planifica',
      it: 'Pianifica',
      pt: 'Planear',
    } as const

    for (const locale of wingsSidePublicAdLocales) {
      await page.goto(`${e2eBaseURL}/wingsside/${locale}/search`)

      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(
        page.getByRole('heading', {
          name: searchHeadingByLocale[locale],
        }),
      ).toBeVisible()
      await expect(page.getByText('Tìm nhanh tour, điểm đến và chiến dịch')).toHaveCount(0)
      // Bar B hi-fi nav drops Search primacy; Plan trip CTA remains the chrome primary.
      await expect(
        page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', {
          name: 'Search',
        }),
      ).toHaveCount(0)
      await expect(page.locator('.site-header-cta').first()).toContainText(planCtaByLocale[locale])
    }
  })

  test('renders the WingSide hi-fi Home carousel and routes the planner form', async ({ page }) => {
    test.setTimeout(60_000)

    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(`${e2eBaseURL}/wingsside`)

    const home = page.getByTestId('wingsside-hifi-home')
    const hero = page.getByTestId('wingsside-hifi-home-hero-carousel')
    await expect(home).toBeVisible()
    await expect(hero).toHaveAttribute('aria-roledescription', 'carousel')
    await expect(hero.locator('.home-hero-slide')).toHaveCount(5)

    for (const width of [1440, 1280]) {
      await page.setViewportSize({ height: 900, width })
      const majorControls = hero.getByRole('button', { name: /Previous highlight|Next highlight/ })
      await expect(majorControls.first()).toBeVisible()
      for (const control of await majorControls.all()) {
        const box = await control.boundingBox()
        expect(box?.height).toBeGreaterThanOrEqual(44)
        expect(box?.width).toBeGreaterThanOrEqual(44)
      }
    }

    const planner = page.getByTestId('wingsside-hifi-home-planner')
    await expect(planner).toHaveAttribute('data-client-ready', 'true')
    await expect(planner.getByLabel('Destination hub')).toBeVisible()
    await expect(planner.getByLabel('Duration')).toBeVisible()

    const destinationSelect = planner.locator('select[name="destination"]')
    const durationSelect = planner.locator('select[name="duration"]')
    await destinationSelect.selectOption('hue-hoi-an')
    await durationSelect.selectOption('8-10-days')
    await expect(destinationSelect).toHaveValue('hue-hoi-an')
    await expect(durationSelect).toHaveValue('8-10-days')
    await planner.getByRole('button', { name: /Plan trip/i }).click()
    await expect(page).toHaveURL(
      /\/wingsside\/plan-your-trip\?destination=hue-hoi-an&duration=8-10-days/,
    )

    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto(`${e2eBaseURL}/wingsside`)
    const mobileHero = page.getByTestId('wingsside-hifi-home-hero-carousel')
    await expect(mobileHero).toHaveAttribute('aria-roledescription', 'carousel')
    await expect(
      page.getByRole('heading', { name: 'Tailor-made Vietnam journeys' }).first(),
    ).toBeVisible()
    const mobilePlanner = page.getByTestId('wingsside-hifi-home-planner')
    await expect(mobilePlanner.getByLabel('Destination hub')).toBeVisible()
    await expect(mobilePlanner.getByLabel('Duration')).toBeVisible()
    await expect(mobilePlanner.getByRole('button', { name: /Plan trip/i })).toBeVisible()
    await expect(mobileHero.getByRole('button', { name: 'Previous highlight' })).toBeVisible()
    await expect(mobileHero.getByRole('button', { name: 'Next highlight' })).toBeVisible()
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflowX).toBe(false)
  })

  test('styles the WingSide Specials chip across normalized Home routes and breakpoints', async ({
    page,
  }) => {
    test.setTimeout(180_000)

    /** Specials self-hides while #home-planner intersects the viewport — scroll past it to assert chrome. */
    const revealSpecialsPastPlanner = async () => {
      await page.locator('#home-planner').waitFor({ state: 'attached', timeout: 20_000 })
      await page.evaluate(() => {
        const planner = document.getElementById('home-planner')
        if (!planner) {
          window.scrollTo(0, Math.max(0, document.body.scrollHeight * 0.65))
          return
        }
        const top = planner.getBoundingClientRect().top + window.scrollY
        window.scrollTo(0, top + planner.offsetHeight + 240)
      })
      await page.waitForTimeout(350)
      // Retry once if observer has not flipped yet.
      if (
        !(await page
          .getByTestId('wingsside-specials')
          .isVisible()
          .catch(() => false))
      ) {
        await page.evaluate(() => window.scrollBy(0, 600))
        await page.waitForTimeout(350)
      }
      await expect(page.getByTestId('wingsside-specials')).toBeVisible({ timeout: 10_000 })
    }

    for (const path of ['/wingsside', '/wingsside/en', '/wingsside/it']) {
      await page.setViewportSize({ height: 900, width: 768 })
      await page.goto(`${e2eBaseURL}${path}`, { waitUntil: 'domcontentloaded' })

      const body = page.locator('body')
      await expect(body).toHaveAttribute('data-site-code', 'wing-side')
      await expect(body).toHaveAttribute('data-theme-key', 'custom')
      await expect(body).toHaveAttribute('data-public-route', '/')
      await expect(page.locator('.site-header-cta').first()).toHaveAttribute(
        'href',
        /\/wingsside\/(?:en\/|it\/)?plan-your-trip$/,
      )
      await expect(page.locator('a[href*="lien-he"]')).toHaveCount(0)

      await revealSpecialsPastPlanner()
      const promo = page.getByTestId('wingsside-specials')
      await expect(promo).toBeVisible()
      await expect(promo).toHaveCSS('position', 'fixed')
      await expect(promo).toHaveCSS('width', '268px')
      await expect(promo).toHaveCSS('border-top-width', '2px')
      await expect(promo).toHaveCSS('border-top-color', 'rgb(214, 45, 45)')
      await expect(promo).toHaveCSS('background-color', 'rgb(10, 10, 10)')
      await expect(promo).not.toHaveCSS('background-image', 'none')
    }

    for (const width of [768, 1024, 1280, 1440]) {
      await page.setViewportSize({ height: 900, width })
      await page.goto(`${e2eBaseURL}/wingsside/en`, { waitUntil: 'domcontentloaded' })
      await revealSpecialsPastPlanner()

      const promo = page.getByTestId('wingsside-specials')
      await expect(promo).toBeVisible()
      const controls = page.locator('.home-hero-controls button:visible')
      const promoBox = await promo.boundingBox()
      const controlBoxes = await controls.evaluateAll((buttons) =>
        buttons.map((button) => {
          const box = button.getBoundingClientRect()
          return {
            bottom: box.bottom,
            left: box.left,
            right: box.right,
            top: box.top,
          }
        }),
      )
      const plannerBox = await page.getByTestId('wingsside-hifi-home-planner').boundingBox()
      const bannerBox = await page.getByRole('banner').boundingBox()
      const plannerInteractiveBoxes = await page
        .getByTestId('wingsside-hifi-home-planner')
        .locator('a:visible, button:visible, input:visible, select:visible, textarea:visible')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const box = element.getBoundingClientRect()
            return { bottom: box.bottom, left: box.left, right: box.right, top: box.top }
          }),
        )
      const headerInteractiveBoxes = await page
        .getByRole('banner')
        .locator('a:visible, button:visible, input:visible, select:visible, textarea:visible')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const box = element.getBoundingClientRect()
            return { bottom: box.bottom, left: box.left, right: box.right, top: box.top }
          }),
        )
      const heroCopyBoxes = await page
        .locator(
          [
            '.hero-presentation__hifi-title:visible',
            '.hero-presentation__hifi-lede:visible',
            '.hero-presentation__hifi-copy a:visible',
            '.hero-presentation__slide[data-active="true"] h1:visible',
            '.hero-presentation__slide[data-active="true"] h2:visible',
            '.hero-presentation__slide[data-active="true"] p:visible',
            '.hero-presentation__slide[data-active="true"] a:visible',
            '.site-hero__badge:visible',
            '.site-hero__richtext h1:visible',
            '.site-hero__richtext h2:visible',
            '.site-hero__richtext p:visible',
            '.site-hero__actions a:visible',
            '.site-hero__actions button:visible',
            '.site-hero__postcards a:visible',
            '.site-hero__postcards button:visible',
            '.ws-hifi-home-hero__copy h1:visible',
            '.ws-hifi-home-hero__copy p:visible',
            '.ws-hifi-home-hero__copy a:visible',
          ].join(', '),
        )
        .evaluateAll((elements) =>
          elements.map((element) => {
            const box = element.getBoundingClientRect()
            return { bottom: box.bottom, left: box.left, right: box.right, top: box.top }
          }),
        )
      const overlapsPromo = (box: { bottom: number; left: number; right: number; top: number }) =>
        Boolean(
          promoBox &&
          box.right > promoBox.x &&
          box.left < promoBox.x + promoBox.width &&
          box.bottom > promoBox.y &&
          box.top < promoBox.y + promoBox.height,
        )

      await test.info().attach(`wingsside-specials-layout-${width}`, {
        body: JSON.stringify(
          {
            bannerBox,
            controlBoxes,
            headerInteractiveBoxes,
            heroCopyBoxes,
            plannerBox,
            plannerInteractiveBoxes,
            promoBox,
          },
          null,
          2,
        ),
        contentType: 'application/json',
      })
      await test.info().attach(`wingsside-specials-home-${width}`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: 'image/png',
      })
      expect(bannerBox).not.toBeNull()
      expect(promoBox).not.toBeNull()
      expect((promoBox?.y ?? 0) + (promoBox?.height ?? 0)).toBeCloseTo(
        (page.viewportSize()?.height ?? 0) - 20,
        0,
      )
      expect((promoBox?.x ?? 0) + (promoBox?.width ?? 0)).toBeCloseTo(width - 20, 0)
      // Dot indicators stay small; enforce 44px only on major carousel chrome.
      const majorControlBoxes = await page
        .locator('.home-hero-nav:visible')
        .evaluateAll((buttons) =>
          buttons.map((button) => {
            const box = button.getBoundingClientRect()
            return { bottom: box.bottom, left: box.left, right: box.right, top: box.top }
          }),
        )
      expect(majorControlBoxes.every((box) => box.right - box.left >= 44)).toBe(true)
      expect(controlBoxes.filter(overlapsPromo)).toEqual([])
      expect(plannerInteractiveBoxes.filter(overlapsPromo)).toEqual([])
      expect(headerInteractiveBoxes.filter(overlapsPromo)).toEqual([])
      expect(heroCopyBoxes.filter(overlapsPromo)).toEqual([])
      // Bar B hifi-split stacks media controls above the planner band (not floating overlay).
      // Only enforce control↔planner clearance for the legacy overlay hero.
      const isHiFiSplit = (await page.getByTestId('wingsside-hifi-home').count()) > 0
      if (!isHiFiSplit) {
        expect(
          controlBoxes.filter(
            (control) =>
              plannerBox &&
              control.right > plannerBox.x &&
              control.left < plannerBox.x + plannerBox.width &&
              control.bottom > plannerBox.y &&
              control.top < plannerBox.y + plannerBox.height,
          ),
        ).toEqual([])
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ),
      ).toBe(false)

      const next = page.getByRole('button', { name: 'Next highlight' })
      await next.evaluate((el: HTMLButtonElement) => el.click())
      await expect(page.locator('.home-hero-slide[data-active="true"]')).toHaveCount(1)
      await expect(page.locator('.home-hero-dot[aria-selected="true"]')).toHaveCount(1)
    }

    for (const width of [768, 1024, 1280, 1440]) {
      await page.setViewportSize({ height: 900, width })
      await page.goto(`${e2eBaseURL}/wingsside/en`, { waitUntil: 'domcontentloaded' })
      await revealSpecialsPastPlanner()

      const promoBox = await page.getByTestId('wingsside-specials').boundingBox()
      const bannerBox = await page.getByRole('banner').boundingBox()
      const genericHeroCopyBoxes = await page
        .locator(
          [
            '.hero-presentation h1:visible',
            '.hero-presentation h2:visible',
            '.hero-presentation p:visible',
            '.hero-presentation a:visible',
            '.site-hero__badge:visible',
            '.site-hero__richtext h1:visible',
            '.site-hero__richtext h2:visible',
            '.site-hero__richtext p:visible',
            '.site-hero__actions a:visible',
            '.site-hero__actions button:visible',
            '.site-hero__postcards a:visible',
            '.site-hero__postcards button:visible',
            '.ws-hifi-home-hero__copy h1:visible',
            '.ws-hifi-home-hero__copy p:visible',
            '.ws-hifi-home-hero__copy a:visible',
          ].join(', '),
        )
        .evaluateAll((elements) =>
          elements.map((element) => {
            const box = element.getBoundingClientRect()
            return { bottom: box.bottom, left: box.left, right: box.right, top: box.top }
          }),
        )
      const overlapsPromo = (box: { bottom: number; left: number; right: number; top: number }) =>
        Boolean(
          promoBox &&
          box.right > promoBox.x &&
          box.left < promoBox.x + promoBox.width &&
          box.bottom > promoBox.y &&
          box.top < promoBox.y + promoBox.height,
        )
      expect(promoBox).not.toBeNull()
      expect(bannerBox).not.toBeNull()
      expect((promoBox?.y ?? 0) + (promoBox?.height ?? 0)).toBeCloseTo(
        (page.viewportSize()?.height ?? 0) - 20,
        0,
      )
      expect((promoBox?.x ?? 0) + (promoBox?.width ?? 0)).toBeCloseTo(width - 20, 0)
      expect(genericHeroCopyBoxes.filter(overlapsPromo)).toEqual([])
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ),
      ).toBe(false)
      await test.info().attach(`wingsside-specials-generic-branch-${width}`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: 'image/png',
      })
      await test.info().attach(`wingsside-specials-generic-layout-${width}`, {
        body: JSON.stringify({ bannerBox, genericHeroCopyBoxes, promoBox }, null, 2),
        contentType: 'application/json',
      })
    }

    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(`${e2eBaseURL}/wingsside/en`, { waitUntil: 'domcontentloaded' })
    // Planner occupies the first screen; Specials is intentionally hidden until scrolled past.
    await revealSpecialsPastPlanner()
    await expect(page.getByTestId('wingsside-specials')).toBeVisible()

    const promoCTA = page.getByRole('link', { name: 'Go to hot tours and packages' })
    const promoCTABox = await promoCTA.boundingBox()
    expect(promoCTABox?.height).toBeGreaterThanOrEqual(44)
    expect(promoCTABox?.width).toBeGreaterThanOrEqual(44)
    const promoClose = page.getByRole('button', { name: 'Dismiss specials' })
    await promoClose.focus()
    await promoClose.press('Tab')
    await expect(promoCTA).toBeFocused()
    await Promise.all([page.waitForURL(/\/wingsside\/en\/packages$/), promoCTA.press('Enter')])

    await page.setViewportSize({ height: 900, width: 767 })
    await page.goto(`${e2eBaseURL}/wingsside/en`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('wingsside-specials')).toBeHidden()

    for (const path of [
      '/wingsside/packages',
      '/wingsside/en/packages',
      '/wingsside/it/packages',
    ]) {
      await page.setViewportSize({ height: 900, width: 1280 })
      await page.goto(`${e2eBaseURL}${path}`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('body')).toHaveAttribute('data-site-code', 'wing-side')
      await expect(page.locator('body')).toHaveAttribute('data-theme-key', 'custom')
      await expect(page.locator('body')).toHaveAttribute('data-public-route', '/packages')
      await expect(page.getByTestId('wingsside-specials')).toHaveCount(0)
      // Bar B packages body is hi-fi inventory (CMS media layout suppressed).
      await expect(page.locator('article[data-hifi-body="true"]')).toBeVisible()
      await expect(page.getByTestId('wingsside-hifi-inventory')).toBeVisible()
      await expect(page.locator('.layout-media--contained')).toHaveCount(0)
    }
  })

  test('renders WingsSide governed inbound composer blocks', async ({ page }) => {
    test.setTimeout(60_000)

    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(`${e2eBaseURL}/wingsside`)

    // Bar B single composition owner: inventory body, CMS layout suppressed (forms only).
    await expect(page.locator('article[data-hifi-composer="true"]')).toBeVisible()
    await expect(page.getByTestId('wingsside-hifi-inventory')).toBeVisible()
    await expect(page.locator('[data-od-id="home-why"]')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Local design. Flexible planning. Real matching.' }),
    ).toBeVisible()
    await expect(page.locator('[data-od-id="home-sla"]')).toBeVisible()
    await expect(page.getByTestId('wingsside-hifi-trust')).toContainText(/Reply SLA|SLA/i)
    await expect(page.locator('[data-od-id="home-dest"]')).toBeVisible()
    await expect(page.locator('[data-od-id="home-dest"] .ws-hifi-kicker')).toContainText(
      /Destination hub/i,
    )
    await expect(page.locator('[data-od-id="home-styles"]')).toBeVisible()
    await expect(page.locator('[data-od-id="home-styles"] .ws-hifi-kicker')).toContainText(
      /Travel styles/i,
    )
    await expect(page.locator('[data-od-id="home-sample-journeys"]')).toBeVisible()
    await expect(page.getByTestId('wingsside-hifi-home-journeys')).toContainText(
      /From \$2,190|Indicative/i,
    )
    await expect(page.locator('[data-od-id="home-notes"]')).toBeVisible()
    await expect(page.getByTestId('wingsside-hifi-notes')).toContainText(
      /Pace & inclusions|Traveler notes/i,
    )
    await expect(page.locator('[data-od-id="home-close"]')).toBeVisible()
    await expect(page.locator('[data-od-id="home-close"] a[href="#home-planner"]')).toBeVisible()
    await expect(page.locator('[data-od-id="home-close"] a[href*="contact-us"]')).toBeVisible()
    await expect(page.locator('.hero-presentation__hifi-title')).toHaveJSProperty('tagName', 'H1')
    await expect(page.locator('[data-block-presentation="bento"]')).toHaveCount(0)

    const destinationCard = page.getByTestId('wingsside-hifi-home-dest').getByRole('link').first()
    await expect(destinationCard).toHaveAttribute(
      'href',
      /\/wingsside\/(?:en\/)?destinations(?:\/ha-noi)?$/,
    )
    await expect(
      page.getByTestId('wingsside-hifi-home-journeys').getByRole('link').first(),
    ).toHaveAttribute('href', /\/wingsside\/(?:en\/)?packages\/vietnam-highlights$/)
    await expect(page.getByTestId('wingsside-hifi-home-related')).toBeVisible()
    await expect(
      page.locator('[data-od-id="home-creds"], [data-testid="wingsside-hifi-creds"]').first(),
    ).toBeVisible()
    await expect(page.locator('.ws-hifi-creds--full-bleed')).toBeVisible()
    await expect(page.locator('#home-planner')).toBeVisible()
    await expect(
      page.locator('.hero-presentation__hifi-copy a[href="#home-planner"]').first(),
    ).toBeVisible()
    await expect(page.getByTestId('wingsside-hifi-footer')).toBeVisible()

    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto(`${e2eBaseURL}/wingsside`)
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflowX).toBe(false)
  })

  test('runs the homepage WingSide process board without layout shift', async ({ page }) => {
    test.setTimeout(60_000)

    for (const width of [1440, 390]) {
      await page.setViewportSize({ height: 900, width })
      await page.goto(`${e2eBaseURL}/wingsside`, { waitUntil: 'domcontentloaded' })

      const board = page.getByTestId('wingside-home-process-board')
      const stage = page.getByTestId('wingside-home-process-stage')
      const tabs = board.getByRole('tab')
      await expect(tabs).toHaveCount(4)
      await expect(page.locator('[data-od-id="home-pillars"]')).toBeVisible()
      await expect(page.locator('[data-od-id="home-process-cta"]')).toHaveAttribute(
        'href',
        '#home-planner',
      )

      const initialHeights = await page.evaluate(() => {
        const boardElement = document.querySelector('[data-testid="wingside-home-process-board"]')
        const stageElement = document.querySelector('[data-testid="wingside-home-process-stage"]')
        return {
          board: boardElement?.getBoundingClientRect().height,
          stage: stageElement?.getBoundingClientRect().height,
        }
      })

      await tabs.nth(1).click()
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
      await expect(page.locator('[role="tabpanel"][data-active="true"]')).toContainText(
        /place \+ pace|pace/i,
      )

      await tabs.nth(1).press('ArrowRight')
      await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true')
      await tabs.nth(2).press('End')
      await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true')
      await tabs.nth(3).press('Home')
      await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')

      const finalHeights = await page.evaluate(() => {
        const boardElement = document.querySelector('[data-testid="wingside-home-process-board"]')
        const stageElement = document.querySelector('[data-testid="wingside-home-process-stage"]')
        return {
          board: boardElement?.getBoundingClientRect().height,
          stage: stageElement?.getBoundingClientRect().height,
        }
      })

      expect(finalHeights.stage).toBe(initialHeights.stage)
      expect(finalHeights.board).toBe(initialHeights.board)
      expect(await board.boundingBox()).not.toBeNull()
      expect(await stage.boundingBox()).not.toBeNull()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
      ).toBe(false)
    }
  })

  test('renders WingsSide inbound core content pages on desktop and mobile', async ({ page }) => {
    test.setTimeout(120_000)

    for (const route of wingsSideCorePages) {
      await page.setViewportSize({ height: 900, width: 1440 })
      await page.goto(`${e2eBaseURL}${route.path}`, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveTitle(route.title)
      await expect(page.getByRole('banner')).toBeVisible()
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
      await expect(
        page.getByText(
          /WingsSide inbound hero|Vietnam destination cover|Vietnam travel styles image|Vietnam sample itineraries image|Planning cue/,
        ),
      ).toHaveCount(0)

      if (route.path === '/wingsside/plan-your-trip' || route.path === '/wingsside/contact-us') {
        if (route.path === '/wingsside/plan-your-trip') {
          // Inventory plan-steps may replace CMS form title; form may still render when present.
          await expect(page.locator('[data-od-id="plan-steps"], form').first()).toBeVisible()
        } else {
          // Bar B contact inventory + optional form — one governed heading is enough.
          const contactHeadings = page.getByRole('heading', { name: route.heading })
          await expect(contactHeadings.first()).toBeVisible()
          expect(await contactHeadings.count()).toBeGreaterThanOrEqual(1)
        }
        await expect(page.getByText('Gửi yêu cầu, nhận tư vấn đúng nhu cầu')).toHaveCount(0)
      }

      let overflowX = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflowX).toBe(false)

      await page.setViewportSize({ height: 844, width: 390 })
      await page.goto(`${e2eBaseURL}${route.path}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
      overflowX = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflowX).toBe(false)
    }
  })

  test('renders WingsSide hi-fi 8-page nav IA and language switcher', async ({ page }) => {
    test.setTimeout(120_000)

    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(`${e2eBaseURL}/wingsside/en`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)

    const primaryNav = page.getByRole('navigation', { name: 'Primary navigation' })
    for (const label of [
      'Home',
      'Destinations',
      'Styles',
      'Packages',
      'Guide',
      'About',
      'Contact',
    ]) {
      await expect(primaryNav.getByRole('link', { name: label })).toBeVisible()
    }
    await expect(primaryNav.getByRole('link', { name: 'Plan trip' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Plan Vietnam' })).toHaveCount(0)
    await expect(primaryNav.getByRole('link', { name: 'Search' })).toHaveCount(0)

    const languageSwitcher = page.getByRole('navigation', { name: 'Language switcher' }).first()
    await expect(languageSwitcher.getByRole('link', { name: 'English' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(languageSwitcher.getByRole('link', { name: 'Italiano' })).toHaveAttribute(
      'href',
      /\/wingsside\/it$/,
    )
    await languageSwitcher.getByRole('link', { name: 'Italiano' }).click()
    await page.waitForURL(/\/wingsside\/it$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'it')
    await expect(
      page.getByRole('heading', { name: 'Viaggi su misura in Vietnam' }).first(),
    ).toBeVisible()

    await page.goto(`${e2eBaseURL}/wingsside/en`, { waitUntil: 'domcontentloaded' })
    await expect(languageSwitcher.getByText('日本語')).toHaveCount(0)
    await expect(languageSwitcher.getByText('한국어')).toHaveCount(0)

    const localizedHeaderCopy = [
      { cta: 'Pianifica', locale: 'it', destLabel: 'Destinazioni' },
      { cta: 'Planifica', locale: 'es', destLabel: 'Destinos' },
      { cta: 'Planear', locale: 'pt', destLabel: 'Destinos' },
    ] as const

    for (const { cta, locale, destLabel } of localizedHeaderCopy) {
      await page.goto(`${e2eBaseURL}/wingsside/${locale}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('link', { name: cta }).first()).toBeVisible()
      await expect(
        page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', {
          name: destLabel,
        }),
      ).toBeVisible()
    }

    await page.setViewportSize({ height: 900, width: 1280 })
    await page.goto(`${e2eBaseURL}/wingsside/it`, { waitUntil: 'domcontentloaded' })
    await expect.poll(() => countPrimaryNavRows(page)).toBe(1)

    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto(`${e2eBaseURL}/wingsside/en`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)
    await page.getByRole('button', { name: 'Open navigation' }).click()
    const mobileNavigation = page.getByRole('navigation', { name: 'Mobile primary navigation' })
    await expect(mobileNavigation).toBeVisible()
    await expect(mobileNavigation.getByRole('link', { name: 'Packages' })).toBeVisible()
    await expect(mobileNavigation.getByRole('link', { name: 'Guide' })).toBeVisible()
    await expect(mobileNavigation.getByRole('link', { name: 'Contact' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Language switcher' }).last()).toBeVisible()

    await page.locator('main').click({ position: { x: 4, y: 4 } })
    await expect(page.getByRole('navigation', { name: 'Mobile primary navigation' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page
      .getByRole('navigation', { name: 'Mobile primary navigation' })
      .getByRole('link', { name: 'Destinations' })
      .click()
    await expect(page).toHaveURL(/\/wingsside\/en\/destinations$/)
    await expect(page.getByRole('navigation', { name: 'Mobile primary navigation' })).toHaveCount(0)

    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(`${e2eBaseURL}/wingsgo`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Plan Vietnam' })).toHaveCount(0)
    await expect.poll(() => countPrimaryNavRows(page)).toBe(1)
    const wingsGoOverflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(wingsGoOverflowX).toBe(false)
  })

  test('renders WingsSide localized root pages with real core content', async ({ page }) => {
    // Body strings follow Bar B inventory i18n; planner panel remains CMS/HighImpact locale copy.
    const localizedRootCopy = {
      es: {
        ctaSection: '¿Listo para dar forma a un viaje privado?',
        headerCta: 'Planifica',
        inventoryWhy: 'Diseño local. Planificación flexible. Emparejamiento real.',
        destTitle: 'Adónde puede ir tu ruta',
        stylesTitle: 'Cómo te gusta viajar',
        journeysTitle: '¿Qué historia de Vietnam te atrae primero?',
        plannerAria: 'Inicio de planificación de viaje',
        plannerDestination: 'Destino',
        plannerDuration: 'Duración',
        plannerTitle: 'Planifica un viaje privado a Vietnam',
        plannerCta: /Planifica/,
        heading: 'Viajes a Vietnam hechos a medida',
      },
      it: {
        ctaSection: 'Pronto a dare forma a un viaggio privato?',
        headerCta: 'Pianifica',
        inventoryWhy: 'Design locale. Pianificazione flessibile. Matching reale.',
        destTitle: 'Dove può andare il tuo percorso',
        stylesTitle: 'Come vuoi viaggiare',
        journeysTitle: 'Quale storia del Vietnam ti attira per prima?',
        plannerAria: 'Inizio pianificazione viaggio',
        plannerDestination: 'Destinazione',
        plannerDuration: 'Durata',
        plannerTitle: 'Pianifica un viaggio privato in Vietnam',
        plannerCta: /Pianifica/,
        heading: 'Viaggi su misura in Vietnam',
      },
      pt: {
        ctaSection: 'Pronto para moldar uma viagem privada?',
        headerCta: 'Planear',
        inventoryWhy: 'Design local. Planeamento flexível. Emparelhamento real.',
        destTitle: 'Para onde a sua rota pode ir',
        stylesTitle: 'Como gosta de viajar',
        journeysTitle: 'Que história do Vietname o atrai primeiro?',
        plannerAria: 'Início do planeamento da viagem',
        plannerDestination: 'Destino',
        plannerDuration: 'Duração',
        plannerTitle: 'Planear uma viagem privada ao Vietname',
        plannerCta: /Planear/,
        heading: 'Viagens ao Vietname feitas à medida',
      },
    } as const

    for (const [locale, copy] of Object.entries(localizedRootCopy)) {
      await page.goto(`${e2eBaseURL}/wingsside/${locale}`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page.getByRole('heading', { level: 1, name: copy.heading })).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.heading }).first()).toBeVisible()
      await expect(page.locator('.site-header-cta').first()).toContainText(copy.headerCta)
      await expect(page.getByRole('heading', { name: copy.inventoryWhy }).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.destTitle }).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.stylesTitle }).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.journeysTitle }).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.ctaSection }).first()).toBeVisible()
      await expect(page.getByTestId('wingsside-hifi-inventory')).toBeVisible()
      const planner = page.getByRole('complementary', { name: copy.plannerAria })
      await expect(planner.getByText(copy.plannerTitle)).toBeVisible()
      await expect(planner.getByLabel(copy.plannerDestination)).toBeVisible()
      await expect(planner.getByLabel(copy.plannerDuration)).toBeVisible()
      await expect(planner.getByRole('button', { name: copy.plannerCta })).toBeVisible()
      await expect(planner.getByText('Plan a private Vietnam journey')).toHaveCount(0)
      await expect(page.getByText('WingsSide inbound hero')).toHaveCount(0)

      const footerLink = page.locator('.site-footer .theme-nav-link').first()
      await expect(footerLink).toHaveCSS('color', 'rgb(5, 40, 41)')
      await expect(footerLink).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    }
  })

  test('renders WingsSide localized routes without placeholder shells after locale backfill', async ({
    page,
  }) => {
    await page.goto(`${e2eBaseURL}/wingsside/vi`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Hành trình Việt Nam thiết kế riêng' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Lên kế hoạch' }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Trang$/ }).first()).toHaveCount(0)

    await page.goto(`${e2eBaseURL}/wingsside/es/destinations/ha-noi`, {
      waitUntil: 'domcontentloaded',
    })
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expect(page.getByRole('heading', { level: 1, name: 'Hanói' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Planifica tu viaje' }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Page$/ }).first()).toHaveCount(0)
  })

  test('renders localized WingsSide content across page patterns after backfill', async ({
    page,
  }) => {
    const scenarios = [
      {
        forbidden: 'Inbound Vietnam needs trust, not retail noise',
        heading: 'Khách quốc tế cần niềm tin, không cần những lời chào bán ồn ào',
        locale: 'vi',
        path: '/wingsside/vi/about-us',
      },
      {
        forbidden: 'Luxury journeys focus on curated stays',
        heading: 'Lusso',
        locale: 'it',
        path: '/wingsside/it/styles/luxury',
      },
      {
        forbidden: 'A multi-region first-time framework',
        heading: 'Vietnam esencial',
        locale: 'es',
        path: '/wingsside/es/packages/vietnam-highlights',
      },
      {
        forbidden: 'Mekong adds river rhythm',
        heading: 'Mekong',
        locale: 'pt',
        path: '/wingsside/pt/destinations/mekong',
      },
    ] as const

    for (const scenario of scenarios) {
      await page.goto(`${e2eBaseURL}${scenario.path}`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('html')).toHaveAttribute('lang', scenario.locale)
      await expect(
        page.getByRole('heading', { level: 1, name: scenario.heading }).first(),
      ).toBeVisible()
      await expect(page.getByText(scenario.forbidden)).toHaveCount(0)
      await expect(page.getByRole('heading', { name: /^Page$|^Trang$/ }).first()).toHaveCount(0)
    }
  })

  test('keeps WingsSide language switcher hrefs stable on localized nested routes', async ({
    page,
  }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text())
      }
    })

    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(`${e2eBaseURL}/wingsside/en/search`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)

    const languageSwitcher = page.getByRole('navigation', { name: 'Language switcher' }).first()
    await expect(languageSwitcher.getByRole('link', { name: 'English' })).toHaveAttribute(
      'href',
      /\/wingsside\/en\/search$/,
    )
    await expect(languageSwitcher.getByRole('link', { name: 'Tiếng Việt' })).toHaveAttribute(
      'href',
      /\/wingsside\/vi\/search$/,
    )
    await expect(languageSwitcher.getByRole('link', { name: 'Italiano' })).toHaveAttribute(
      'href',
      /\/wingsside\/it\/search$/,
    )
    expect(consoleErrors.join('\n')).not.toMatch(/hydration|did not match|server rendered/i)

    await page.goto(`${e2eBaseURL}/wingsside/en/search?q=hanoi#results`, {
      waitUntil: 'domcontentloaded',
    })
    const hydratedSwitcher = page.getByRole('navigation', { name: 'Language switcher' }).first()
    await expect(hydratedSwitcher).toHaveAttribute('data-client-ready', 'true')
    await hydratedSwitcher.getByRole('link', { name: 'Italiano' }).click()
    await expect(page).toHaveURL(/\/wingsside\/it\/search\?q=hanoi#results$/)
  })

  test('keeps CMS-only locales out of public sitemaps', async ({ request }) => {
    const sitemapPaths = ['/pages-sitemap.xml', '/posts-sitemap.xml'] as const

    for (const sitemapPath of sitemapPaths) {
      const response = await request.get(`${e2eBaseURL}${sitemapPath}`, {
        headers: {
          host: 'wingside.vn',
        },
      })
      expect(response.ok()).toBe(true)

      const xml = await response.text()
      const sitemapURLs = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g)).map(
        (match) => new URL(match[1]),
      )
      const localeSegments = new Set(
        sitemapURLs
          .map((url) => url.pathname.split('/').filter(Boolean)[0])
          .filter((segment): segment is string => isSupportedLocale(segment)),
      )

      expect(Array.from(localeSegments)).toEqual(
        expect.arrayContaining([...wingsSidePublicAdLocales]),
      )
      expect(
        sitemapURLs.some((url) => {
          const firstSegment = url.pathname.split('/').filter(Boolean)[0]
          return !firstSegment || !isSupportedLocale(firstSegment)
        }),
      ).toBe(true)

      for (const locale of cmsOnlyLocales) {
        expect(localeSegments.has(locale)).toBe(false)
      }
    }
  })

  test('keeps key frontend views scannable across desktop and mobile', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(`${e2eBaseURL}/wingsgo`)

    await expect(
      page.getByRole('heading', { name: 'Chùm tour outbound giá rõ, lịch rõ' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Xem lịch khởi hành' }).first()).toBeVisible()
    await expect(page.getByRole('banner')).toBeVisible()

    let overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflowX).toBe(false)

    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto(`${e2eBaseURL}/wingsgo`)

    const primaryCTA = page.getByRole('link', { name: 'Xem lịch khởi hành' }).first()
    await expect(primaryCTA).toBeVisible()

    const ctaBox = await primaryCTA.boundingBox()
    expect(ctaBox?.y).toBeLessThan(520)

    overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflowX).toBe(false)
  })

  for (const definition of heroPresentationDefinitions) {
    test(`renders hero presentation ${definition.value} across desktop and mobile`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(90_000)
      const path = heroPresentationFixturePaths[definition.value]

      await page.setViewportSize({ height: 900, width: 1440 })
      await page.goto(`${e2eBaseURL}${path}`)

      const hero = page.locator('[data-hero-presentation]')
      await expect(hero).toHaveAttribute('data-hero-presentation', definition.value)
      if (definition.value === 'cinematic-carousel') {
        const carousel = hero.locator('[aria-roledescription="carousel"]')
        await expect(carousel).toHaveAttribute('data-client-ready', 'true')
        await carousel.getByRole('button', { name: 'Go to slide 1' }).click()
        await expect(
          hero
            .locator('.hero-presentation__slide[data-active="true"]')
            .getByRole('heading', { name: 'Journey 1' }),
        ).toBeVisible()
      } else {
        await expect(
          page.getByRole('heading', {
            name: 'WingsGroup - hệ sinh thái du lịch nhiều line business dưới một lớp tin cậy chung',
          }),
        ).toBeVisible()
      }

      if (definition.value === 'video-background') {
        const secondaryCTA = hero.getByRole('link', { name: 'Liên hệ tư vấn' })
        await expect(secondaryCTA).toBeVisible()
        await expect(secondaryCTA).toHaveCSS('color', 'rgb(255, 255, 255)')
        expect(
          await getContrastAgainstWhiteText(
            page,
            '[data-hero-presentation="video-background"] .site-hero__actions li:nth-child(2) a',
          ),
        ).toBeGreaterThanOrEqual(4.5)
      }

      const primaryCTA = page.getByRole('link', { name: 'Khám phá hệ sinh thái' }).first()
      if (await primaryCTA.isVisible().catch(() => false)) {
        expect((await primaryCTA.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      }

      if (definition.value === 'centered-visual') {
        await expect(
          hero.locator('.hero-presentation--centered .hero-presentation__visual'),
        ).toBeVisible()
      }

      if (definition.value === 'split-visual') {
        await expect(
          hero.locator('.hero-presentation--split .hero-presentation__visual'),
        ).toBeVisible()
      }

      if (definition.value === 'layered-visuals') {
        await expect(hero.locator('.hero-presentation__layer')).toHaveCount(3)
      }

      if (definition.value === 'gradient-mesh') {
        await expect(hero.locator('.hero-presentation__mesh-orb')).toHaveCount(3)
      }

      if (definition.value === 'planner-split') {
        await expect(hero.locator('.hero-presentation--planner-split')).toBeVisible()
      }

      if (definition.value === 'cinematic-carousel') {
        const carousel = hero.locator('[aria-roledescription="carousel"]')
        await expect(carousel).toBeVisible()
        const carouselSlides = hero.locator('.hero-presentation__slide')
        await expect(carouselSlides).toHaveCount(3)
        await hero.hover()
        // Pin a deterministic starting slide and pause autoplay before testing
        // relative navigation; otherwise the interval can advance between the
        // DOM read and the click on a slow full-suite run.
        await carousel.getByRole('button', { name: 'Go to slide 1' }).click()
        await expect(carouselSlides.nth(0)).toHaveAttribute('data-active', 'true')
        await carousel.getByRole('button', { name: 'Next slide' }).click()
        await expect(carouselSlides.nth(1)).toHaveAttribute('data-active', 'true')
      }

      if (definition.value === 'video-background') {
        await expect(hero.locator('.hero-presentation--video')).toBeVisible()
        await expect(hero.locator('.hero-presentation__video-poster img')).toBeVisible()
      }

      await testInfo.attach(`${definition.value}-desktop`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: 'image/png',
      })

      await page.setViewportSize({ height: 844, width: 390 })
      await page.goto(`${e2eBaseURL}${path}`)

      const overflowX = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(overflowX).toBe(false)
      await expect(page.locator('[data-hero-presentation]')).toHaveAttribute(
        'data-hero-presentation',
        definition.value,
      )

      await testInfo.attach(`${definition.value}-mobile`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: 'image/png',
      })
    })
  }

  test('resolves the correct site from production hostnames', async ({ request }) => {
    const rootResponse = await request.get(e2eBaseURL, {
      headers: {
        Host: 'wingsgroup.vn',
      },
    })
    const careResponse = await request.get(e2eBaseURL, {
      headers: {
        Host: 'wingscare.wingsgroup.vn',
      },
    })
    const sideResponse = await request.get(e2eBaseURL, {
      headers: {
        Host: 'wingside.vn',
      },
    })
    const passResponse = await request.get(e2eBaseURL, {
      headers: {
        Host: 'wingspass.wingsgroup.vn',
      },
    })
    const forwardedSideResponse = await request.get(e2eBaseURL, {
      headers: {
        Host: 'internal:3000',
        'X-Forwarded-Host': 'wingside.vn',
      },
    })

    expect(rootResponse.ok()).toBe(true)
    expect(careResponse.ok()).toBe(true)
    expect(sideResponse.ok()).toBe(true)
    expect(passResponse.ok()).toBe(true)
    // Direct clients cannot select a tenant through X-Forwarded-Host. The
    // deployment edge must normalize the effective Host before forwarding.
    expect(forwardedSideResponse.status()).toBe(404)

    const rootHTML = await rootResponse.text()
    const careHTML = await careResponse.text()
    const sideHTML = await sideResponse.text()
    const passHTML = await passResponse.text()
    const forwardedSideHTML = await forwardedSideResponse.text()

    expect(rootHTML).toContain('WingsGroup | Travel Ecosystem')
    expect(rootHTML).toContain('WingsGroup - hệ sinh thái du lịch nhiều line business')
    expect(careHTML).toContain('WingsCare | Care And Support')
    expect(careHTML).toContain('Travel care rõ quyền lợi, rõ hỗ trợ')
    expect(sideHTML).toContain('WingsSide | Tailor-made Vietnam journeys')
    expect(sideHTML).toContain('data-site-theme="custom"')
    expect(sideHTML).toContain('https://wingside.vn')
    expect(passHTML).toContain('WingsPass')
    expect(passHTML).toContain('data-site-theme="wings-pass"')
    expect(passHTML).toContain('https://wingspass.wingsgroup.vn')
    expect(forwardedSideHTML).not.toContain('WingsSide | Tailor-made Vietnam journeys')
    expect(forwardedSideHTML).not.toContain('data-site-theme="custom"')
  })

  test('WingsSide inherits its governed site hero presentation', async ({ page }) => {
    await page.goto(`${e2eBaseURL}/wingsside`)

    const hero = page.locator('[data-hero-presentation]')
    await expect(hero).toHaveAttribute('data-hero-template', 'cinematic-carousel')
    await expect(hero).toHaveAttribute('data-hero-preset', 'wingsside-inbound-cinematic-search')
    await expect(hero).toHaveAttribute('data-hero-source', 'site')
  })

  test('loads the seeded campaign landing page for a child site', async ({ page }) => {
    await page.goto(`${e2eBaseURL}/wingsgo/campaign/he-2026-han-quoc`)
    await expect(page).toHaveTitle(/Hè 2026 Hàn Quốc/)
    await expect(page.getByRole('heading', { name: /Hè 2026 Hàn Quốc/i }).first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText(
      'Tour theo mùa',
    )
    await expect(page.getByRole('link', { name: 'Xem tour' }).first()).toBeVisible()
  })

  test('exposes sitemap endpoints for launch smoke checks', async ({ page }) => {
    const response = await page.goto(`${e2eBaseURL}/pages-sitemap.xml`)

    expect(response?.ok()).toBe(true)
    await expect(page.locator('body')).toContainText('urlset')
  })

  test('renders parseable JSON-LD for site, page, and breadcrumb schema', async ({ page }) => {
    await page.goto(`${e2eBaseURL}/wingsgo/campaign/he-2026-han-quoc`)

    const graphTypes = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) =>
        scripts.flatMap((script) => {
          const parsed = JSON.parse(script.textContent || '{}')
          const graph = Array.isArray(parsed['@graph']) ? parsed['@graph'] : []

          return graph.map((node) => node['@type'])
        }),
      )

    expect(graphTypes).toEqual(
      expect.arrayContaining(['Organization', 'WebSite', 'WebPage', 'BreadcrumbList']),
    )
  })

  test('loads a detailed WingsGroup root-site article', async ({ page }) => {
    await page.goto(`${e2eBaseURL}/posts/he-sinh-thai-wingsgroup-la-gi`)

    await expect(page).toHaveTitle(/Hệ sinh thái WingsGroup là gì/i)
    await expect(
      page.getByRole('heading', { name: /Hệ sinh thái WingsGroup là gì/i }).first(),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /Tin tức/i }).first()).toBeVisible()
  })

  test('does not render broken internal links across public sites', async ({ request }, testInfo) => {
    test.setTimeout(600_000)

    const tourDetailRoutes = await loadWingSideTourDetailAuditRoutes(request, testInfo)
    const queue: Array<{ depth: number; path: string }> = [
      ...linkAuditRoutes,
      ...tourDetailRoutes,
    ].map((path) => ({
      depth: 0,
      path,
    }))
    const checked = new Set<string>()
    const failures: string[] = []

    while (queue.length > 0) {
      // Compile cold SSR routes one at a time. Even a three-request burst can
      // exhaust the Windows Next dev server during the full browser suite,
      // producing infrastructure 500s instead of meaningful link findings.
      const batch = queue.splice(0, 1).filter(({ path }) => !checked.has(path))
      batch.forEach(({ path }) => checked.add(path))

      const results = await Promise.all(
        batch.map(async ({ depth, path }) => {
          const response = await request.get(path)
          const finalURL = new URL(response.url())
          const expectedURL = new URL(path, e2eBaseURL)
          const html = await response.text()
          const title =
            html
              .match(/<title>(.*?)<\/title>/is)?.[1]
              ?.replace(/\s+/g, ' ')
              .trim() || ''

          return { depth, expectedURL, finalURL, html, path, response, title }
        }),
      )

      for (const { depth, expectedURL, finalURL, html, path, response, title } of results) {
        if (finalURL.origin !== expectedURL.origin) {
          failures.push(`${path} -> redirected off-origin to ${finalURL.href}`)
          continue
        }

        if (getRouteTenantAlias(finalURL.pathname) !== getRouteTenantAlias(path)) {
          failures.push(`${path} -> tenant drift to ${finalURL.pathname}`)
          continue
        }

        if (
          getRouteTenantAlias(path) === 'wingsside' &&
          getRouteLocale(finalURL.pathname) !== getRouteLocale(path)
        ) {
          failures.push(`${path} -> locale drift to ${finalURL.pathname}`)
          continue
        }

        if (!response.ok() || /404|This page could not be found|Không tìm thấy/i.test(title)) {
          failures.push(`${path} -> ${response.status()} ${title}`)
          continue
        }

        if (depth === 0) {
          for (const href of extractInternalLinks(html, path)) {
            if (!checked.has(href) && !queue.some((item) => item.path === href)) {
              queue.push({ depth: 1, path: href })
            }
          }
        }
      }
    }

    expect(failures).toEqual([])
  })
})
