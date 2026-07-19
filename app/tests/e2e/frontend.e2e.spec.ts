import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

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
    title: /Hệ sinh thái dịch vụ/,
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

const getHeroControlOverlaps = (page: Page) =>
  page.locator('[data-hero-presentation="cinematic-carousel"]').evaluate((hero) => {
    const controlButtons = Array.from(
      hero.querySelectorAll<HTMLElement>('.hero-presentation__carousel-controls button'),
    )
    const primaryCallsToAction = Array.from(
      hero.querySelectorAll<HTMLElement>(
        '.hero-presentation__slide[data-active="true"] a, .site-hero__planner-submit',
      ),
    ).filter((element) => {
      const style = getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })

    return controlButtons.flatMap((control) => {
      const controlBox = control.getBoundingClientRect()

      return primaryCallsToAction
        .filter((cta) => {
          const ctaBox = cta.getBoundingClientRect()
          return !(
            controlBox.right <= ctaBox.left ||
            controlBox.left >= ctaBox.right ||
            controlBox.bottom <= ctaBox.top ||
            controlBox.top >= ctaBox.bottom
          )
        })
        .map((cta) => ({ control: control.getAttribute('aria-label'), cta: cta.textContent?.trim() }))
    })
  })

const getContrastAgainstWhiteText = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const match = getComputedStyle(element).backgroundColor.match(/[\d.]+/g)?.map(Number)
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

    await expect(page.locator('body')).toHaveAttribute('data-site-theme', 'wings-side')
    await expect(page.locator('body')).toHaveAttribute(
      'data-site-preset',
      'wings-side-editorial-inbound-v2',
    )
    await expect(page.locator('body')).toHaveAttribute('data-site-layout', 'editorial')
    await expect(page.locator('body')).toHaveAttribute('style', /--site-brand:\s*#0F3D3E/i)
    await expect(page.locator('body')).toHaveAttribute('style', /--site-accent:\s*#C9A75C/i)
  })

  test('serves WingsSide public ad locales with governed localized chrome', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 })

    const searchLabelByLocale = {
      en: 'Search',
      es: 'Buscar',
      it: 'Cerca',
      pt: 'Pesquisar',
    } as const
    const searchHeadingByLocale = {
      en: 'Search tours, destinations, and campaigns quickly',
      es: 'Busca con rapidez tours, destinos y campañas',
      it: 'Cerca rapidamente tour, destinazioni e campagne',
      pt: 'Pesquise rapidamente tours, destinos e campanhas',
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
      await expect(
        page.getByRole('link', { name: searchLabelByLocale[locale] }).first(),
      ).toBeVisible()
    }
  })

  test('renders WingsSide cinematic planner hero and routes the planner form', async ({ page }) => {
    test.setTimeout(60_000)

    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(`${e2eBaseURL}/wingsside`)

    const hero = page.locator('[data-hero-presentation]')
    await expect(hero).toHaveAttribute('data-hero-presentation', 'cinematic-carousel')
    await expect(hero).toHaveAttribute('data-hero-preset', 'wingsside-inbound-cinematic-search')
    await expect(hero.locator('.hero-presentation__slide')).toHaveCount(3)
    await expect(
      hero.locator('.hero-presentation__slide-media[data-ken-burns="active"]').first(),
    ).toBeVisible()

    for (const width of [1440, 1280]) {
      await page.setViewportSize({ height: 900, width })
      await expect(hero.locator('.hero-presentation__carousel-controls button').first()).toBeVisible()
      for (const control of await hero.locator('.hero-presentation__carousel-controls button').all()) {
        const box = await control.boundingBox()
        expect(box?.height).toBeGreaterThanOrEqual(44)
        expect(box?.width).toBeGreaterThanOrEqual(44)
      }
      expect(await getHeroControlOverlaps(page)).toEqual([])
    }

    const planner = page.getByRole('complementary', { name: 'Trip planning starter' })
    await expect(planner.getByLabel('Destination')).toBeVisible()
    await expect(planner.getByLabel('Duration')).toBeVisible()

    await planner.getByLabel('Destination').selectOption('hue-hoi-an')
    await planner.getByLabel('Duration').selectOption('8-10-days')
    await planner.getByRole('button', { name: 'Plan your trip' }).click()
    await expect(page).toHaveURL(
      /\/wingsside\/plan-your-trip\?destination=hue-hoi-an&duration=8-10-days/,
    )

    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto(`${e2eBaseURL}/wingsside`)
    const mobileHero = page.locator('[data-hero-presentation="cinematic-carousel"]')
    await expect(mobileHero.locator('[aria-roledescription="carousel"]')).toHaveAttribute(
      'data-client-ready',
      'true',
    )
    await mobileHero.getByRole('button', { name: 'Go to slide 1' }).click()
    await expect(
      mobileHero
        .locator('.hero-presentation__slide[data-active="true"]')
        .getByRole('heading', { name: 'Tailor-made Vietnam journeys' }),
    ).toBeVisible()
    await expect(
      mobileHero.getByText(
        'Private, flexible, locally designed experiences built through destination discovery, travel style guidance, and consultative planning.',
      ),
    ).toBeVisible()
    await expect(
      page.getByRole('complementary', { name: 'Trip planning starter' }),
    ).toBeHidden()

    await mobileHero.getByRole('button', { name: 'Go to slide 2' }).click()
    const mobilePlanner = page.getByRole('complementary', { name: 'Trip planning starter' })
    await expect(mobilePlanner.getByLabel('Destination')).toBeVisible()
    await expect(mobilePlanner.getByLabel('Duration')).toBeVisible()
    await expect(mobilePlanner.getByRole('button', { name: 'Plan your trip' })).toBeVisible()
    await expect(mobileHero.getByRole('button', { name: 'Previous slide' })).toBeVisible()
    await expect(mobileHero.getByRole('button', { name: 'Next slide' })).toBeVisible()
    expect(await getHeroControlOverlaps(page)).toEqual([])
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflowX).toBe(false)
  })

  test('renders WingsSide governed inbound composer blocks', async ({ page }) => {
    test.setTimeout(60_000)

    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(`${e2eBaseURL}/wingsside`)

    await expect(page.locator('[data-block-presentation="bento"]').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Why travel with WingsSide' })).toBeVisible()

    const stats = page.locator('[data-block-presentation="logo-proof"]')
    await expect(stats).toBeVisible()
    await expect(stats.locator('[data-count-up]').first()).toBeVisible()
    await expect(page.getByText('Sample route frameworks')).toBeVisible()

    await expect(page.locator('[data-block-presentation="alternating"]').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Vietnam Highlights/ })).toHaveAttribute(
      'href',
      /\/wingsside\/(?:en\/)?packages\/vietnam-highlights$/,
    )

    const carousel = page.getByRole('region', { name: 'Traveler notes for planning' })
    await expect(carousel).toHaveAttribute('aria-roledescription', 'carousel')
    await expect(page.getByRole('group', { name: '1 of 8' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pause traveler notes carousel' })).toBeVisible()
    await expect(carousel.getByText('United Kingdom')).toBeVisible()
    await expect(carousel.getByText('02 Jul 2026')).toBeVisible()
    await expect(carousel.locator('.layout-testimonial__rating')).toHaveCount(0)

    const destinationCard = page.getByRole('link', { name: /Hanoi:/ }).first()
    await expect(destinationCard).toHaveAttribute(
      'href',
      /\/wingsside\/(?:en\/)?destinations\/ha-noi$/,
    )

    const relatedCard = page.locator('.site-related-pages__item').first().getByRole('link')
    await expect(relatedCard).toHaveClass(/site-related-pages__link/)

    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto(`${e2eBaseURL}/wingsside`)
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflowX).toBe(false)
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
          await expect(page.getByRole('heading', { name: 'Share your travel brief' })).toBeVisible()
        } else {
          const contactHeadings = page.getByRole('heading', { name: route.heading })
          await expect(contactHeadings).toHaveCount(2)
          await expect(contactHeadings.last()).toBeVisible()
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

  test('renders WingsSide inbound header mega menu and language switcher', async ({ page }) => {
    test.setTimeout(120_000)

    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(`${e2eBaseURL}/wingsside/en`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)

    const megaTrigger = page.getByRole('button', { name: 'Plan Vietnam' })
    await expect(megaTrigger).toHaveAttribute('aria-expanded', 'false')
    await megaTrigger.click()
    await expect(megaTrigger).toHaveAttribute('aria-expanded', 'true')
    const megaPanel = page.getByRole('region', { name: 'Plan Vietnam' })
    const highlightsLink = megaPanel.getByRole('link', { name: /Vietnam highlights/i })
    await expect(highlightsLink).toBeVisible()
    await highlightsLink.focus()
    await page.keyboard.press('Escape')
    await expect(megaTrigger).toHaveAttribute('aria-expanded', 'false')
    await megaTrigger.click()
    await expect(megaTrigger).toHaveAttribute('aria-expanded', 'true')
    await page.mouse.click(24, 24)
    await expect(megaTrigger).toHaveAttribute('aria-expanded', 'false')
    await megaTrigger.click()
    await expect(megaTrigger).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('link', { name: 'Search' }).first().focus()
    await expect(megaTrigger).toHaveAttribute('aria-expanded', 'false')
    await megaTrigger.click()
    await expect(megaTrigger).toHaveAttribute('aria-expanded', 'true')
    await megaTrigger.press('Escape')
    await expect(megaTrigger).toHaveAttribute('aria-expanded', 'false')

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
      {
        cta: 'Pianifica il viaggio',
        locale: 'it',
        menuItem: /Vietnam essenziale/i,
        trigger: 'Pianifica il Vietnam',
      },
      {
        cta: 'Planifica tu viaje',
        locale: 'es',
        menuItem: /Vietnam esencial/i,
        trigger: 'Planifica Vietnam',
      },
      {
        cta: 'Planear a viagem',
        locale: 'pt',
        menuItem: /Vietname essencial/i,
        trigger: 'Planear o Vietname',
      },
    ] as const

    for (const { cta, locale, menuItem, trigger } of localizedHeaderCopy) {
      await page.goto(`${e2eBaseURL}/wingsside/${locale}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('link', { name: cta }).first()).toBeVisible()
      const localizedMegaTrigger = page.getByRole('button', { name: trigger })
      await expect
        .poll(async () => {
          if ((await localizedMegaTrigger.getAttribute('aria-expanded')) !== 'true') {
            await localizedMegaTrigger.click()
          }

          return localizedMegaTrigger.getAttribute('aria-expanded')
        })
        .toBe('true')
      await expect(
        page.getByRole('region', { name: trigger }).getByRole('link', { name: menuItem }),
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
    await expect(page.getByText('Plan Vietnam').last()).toBeVisible()
    await expect(mobileNavigation.getByRole('link', { name: 'Vietnam highlights' })).toBeVisible()
    await expect(mobileNavigation.getByRole('link', { name: 'Central heritage' })).toBeVisible()
    await expect(mobileNavigation.getByRole('link', { name: 'Adventure' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Language switcher' }).last()).toBeVisible()

    await page.locator('main').click({ position: { x: 4, y: 4 } })
    await expect(page.getByRole('navigation', { name: 'Mobile primary navigation' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page
      .getByRole('navigation', { name: 'Mobile primary navigation' })
      .getByRole('link', { name: 'All destinations' })
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
    const localizedRootCopy = {
      es: {
        ctaSection: '¿Listo para dar forma a tu viaje a Vietnam?',
        cta: 'Planifica tu viaje',
        destinations: 'Guía de destinos',
        plannerAria: 'Inicio de planificación de viaje',
        plannerDestination: 'Destino',
        plannerDuration: 'Duración',
        plannerTitle: 'Planifica un viaje privado a Vietnam',
        heading: 'Viajes a Vietnam hechos a medida',
        notes: 'Notas de viaje para planificar',
        packages: 'Itinerarios de ejemplo',
        styles: 'Estilos de viaje',
        why: 'Por qué viajar con WingsSide',
      },
      it: {
        ctaSection: 'Pronto a dare forma al tuo viaggio in Vietnam?',
        cta: 'Pianifica il viaggio',
        destinations: 'Guida alle destinazioni',
        plannerAria: 'Inizio pianificazione viaggio',
        plannerDestination: 'Destinazione',
        plannerDuration: 'Durata',
        plannerTitle: 'Pianifica un viaggio privato in Vietnam',
        heading: 'Viaggi su misura in Vietnam',
        notes: 'Note di viaggio per pianificare',
        packages: 'Itinerari di esempio',
        styles: 'Stili di viaggio',
        why: 'Perché viaggiare con WingsSide',
      },
      pt: {
        ctaSection: 'Pronto para dar forma à sua viagem ao Vietname?',
        cta: 'Planear a viagem',
        destinations: 'Guia de destinos',
        plannerAria: 'Início do planeamento da viagem',
        plannerDestination: 'Destino',
        plannerDuration: 'Duração',
        plannerTitle: 'Planear uma viagem privada ao Vietname',
        heading: 'Viagens ao Vietname feitas à medida',
        notes: 'Notas de viagem para planear',
        packages: 'Itinerários de exemplo',
        styles: 'Estilos de viagem',
        why: 'Porque viajar com a WingsSide',
      },
    } as const

    for (const [locale, copy] of Object.entries(localizedRootCopy)) {
      await page.goto(`${e2eBaseURL}/wingsside/${locale}`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page.getByRole('heading', { level: 1, name: copy.heading })).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.heading }).first()).toBeVisible()
      await expect(page.getByRole('link', { name: copy.cta }).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.why }).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.destinations }).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.styles }).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.packages }).first()).toBeVisible()
      await expect(page.getByRole('region', { name: copy.notes })).toBeVisible()
      await expect(page.getByRole('heading', { name: copy.ctaSection }).first()).toBeVisible()
      const planner = page.getByRole('complementary', { name: copy.plannerAria })
      await expect(planner.getByText(copy.plannerTitle)).toBeVisible()
      await expect(planner.getByLabel(copy.plannerDestination)).toBeVisible()
      await expect(planner.getByLabel(copy.plannerDuration)).toBeVisible()
      await expect(planner.getByRole('button', { name: copy.cta })).toBeVisible()
      await expect(planner.getByText('Plan a private Vietnam journey')).toHaveCount(0)
      await expect(planner.getByText('Choose a destination')).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Plan your trip' })).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Destinations' })).toHaveCount(0)
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
    expect(sideHTML).toContain('data-site-theme="wings-side"')
    expect(sideHTML).toContain('https://wingside.vn')
    expect(passHTML).toContain('WingsPass')
    expect(passHTML).toContain('data-site-theme="wings-pass"')
    expect(passHTML).toContain('https://wingspass.wingsgroup.vn')
    expect(forwardedSideHTML).not.toContain('WingsSide | Tailor-made Vietnam journeys')
    expect(forwardedSideHTML).not.toContain('data-site-theme="wings-side"')
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

  test('does not render broken internal links across public sites', async ({ request }) => {
    test.setTimeout(600_000)

    const queue: Array<{ depth: number; path: string }> = linkAuditRoutes.map((path) => ({
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
          const html = await response.text()
          const title =
            html
              .match(/<title>(.*?)<\/title>/is)?.[1]
              ?.replace(/\s+/g, ' ')
              .trim() || ''

          return { depth, html, path, response, title }
        }),
      )

      for (const { depth, html, path, response, title } of results) {
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
