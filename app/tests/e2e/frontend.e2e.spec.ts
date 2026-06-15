import { expect, test } from '@playwright/test'

import { e2eBaseURL } from '../helpers/baseURL'
import {
  heroPresentationFixturePaths,
  seedPhase1LaunchSmoke,
} from '../helpers/seedPhase1Launch'
import { heroPresentationDefinitions } from '../../src/heros/presentations/registry'

const phase1Routes = [
  {
    path: '/',
    title: /WingsTravel/,
    heading: 'WingsTravel - hệ sinh thái du lịch nhiều line business dưới một lớp trust chung',
  },
  {
    path: '/en',
    title: /WingsTravel/,
    heading: 'WingsTravel - a travel ecosystem with several business lines under one trust layer',
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
  { path: '/wingsside/destinations/ha-noi', title: /Ha Noi/, heading: 'Ha Noi' },
  { path: '/wingsplus', title: /WingsPlus/, heading: 'Hành trình may đo cho nhu cầu giá trị cao' },
  { path: '/wingsplus/nang-luc-dich-vu', title: /Năng lực dịch vụ/, heading: 'Chứng minh năng lực trước khi xin brief' },
  { path: '/wingscare', title: /WingsCare/ },
  { path: '/wingspass', title: /WingsPass/, heading: 'Fast Track rõ giá, rõ sân bay, đặt nhanh' },
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

const extractInternalLinks = (html: string, fromPath: string) =>
  Array.from(html.matchAll(/<a\s+(?:[^>]*?\s+)?href=(['"])(.*?)\1/gi))
    .map((match) => normalizeInternalHref(match[2].replaceAll('&amp;', '&'), fromPath))
    .filter((href): href is string => Boolean(href))

test.describe('Phase 1 public frontend smoke', () => {
  test.beforeAll(async () => {
    await seedPhase1LaunchSmoke()
  })

  for (const route of phase1Routes) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(`${e2eBaseURL}${route.path}`)
      await expect(page).toHaveTitle(route.title)
      if ('heading' in route) {
        await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
      }
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
    })
  }

  test('renders site-specific theme tokens for child sites', async ({ page }) => {
    await page.goto(`${e2eBaseURL}/wingsgo`)

    await expect(page.locator('body')).toHaveAttribute('data-site-theme', 'wings-go')
    await expect(page.locator('body')).toHaveAttribute('data-site-preset', 'retail')
    await expect(page.locator('body')).toHaveAttribute('data-site-layout', 'retail')
    await expect(page.locator('body')).toHaveAttribute('style', /--site-brand:\s*#1D4ED8/i)
    await expect(page.locator('body')).toHaveAttribute('style', /--site-accent:\s*#F97316/i)
  })

  test('keeps key frontend views scannable across desktop and mobile', async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(`${e2eBaseURL}/wingsgo`)

    await expect(page.getByRole('heading', { name: 'Chùm tour outbound giá rõ, lịch rõ' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Xem lịch khởi hành' }).first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()

    let overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflowX).toBe(false)

    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto(`${e2eBaseURL}/wingsgo`)

    const primaryCTA = page.getByRole('link', { name: 'Xem lịch khởi hành' }).first()
    await expect(primaryCTA).toBeVisible()

    const ctaBox = await primaryCTA.boundingBox()
    expect(ctaBox?.y).toBeLessThan(520)

    overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflowX).toBe(false)
  })

  for (const definition of heroPresentationDefinitions) {
    test(`renders hero presentation ${definition.value} across desktop and mobile`, async ({
      page,
    }, testInfo) => {
      const path = heroPresentationFixturePaths[definition.value]

      await page.setViewportSize({ height: 900, width: 1440 })
      await page.goto(`${e2eBaseURL}${path}`)

      const hero = page.locator('[data-hero-presentation]')
      await expect(hero).toHaveAttribute('data-hero-presentation', definition.value)
      await expect(
        page.getByRole('heading', {
          name: 'WingsTravel - hệ sinh thái du lịch nhiều line business dưới một lớp trust chung',
        }),
      ).toBeVisible()

      const primaryCTA = page.getByRole('link', { name: 'Khám phá hệ sinh thái' })
      await expect(primaryCTA).toBeVisible()
      expect((await primaryCTA.boundingBox())?.height).toBeGreaterThanOrEqual(44)

      if (definition.value === 'centered-visual') {
        await expect(hero.locator('.hero-presentation--centered .hero-presentation__visual')).toBeVisible()
      }

      if (definition.value === 'split-visual') {
        await expect(hero.locator('.hero-presentation--split .hero-presentation__visual')).toBeVisible()
      }

      if (definition.value === 'layered-visuals') {
        await expect(hero.locator('.hero-presentation__layer')).toHaveCount(3)
      }

      if (definition.value === 'gradient-mesh') {
        await expect(hero.locator('.hero-presentation__mesh-orb')).toHaveCount(3)
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
        Host: 'wingstravel.vn',
      },
    })
    const careResponse = await request.get(e2eBaseURL, {
      headers: {
        Host: 'wingscare.vn',
      },
    })

    expect(rootResponse.ok()).toBe(true)
    expect(careResponse.ok()).toBe(true)

    const rootHTML = await rootResponse.text()
    const careHTML = await careResponse.text()

    expect(rootHTML).toContain('WingsTravel | Travel Ecosystem')
    expect(rootHTML).toContain('WingsTravel - hệ sinh thái du lịch nhiều line business')
    expect(careHTML).toContain('WingsCare | Care And Support')
    expect(careHTML).toContain('Travel care rõ quyền lợi, rõ hỗ trợ')
  })

  test('loads the seeded campaign landing page for a child site', async ({ page }) => {
    await page.goto(`${e2eBaseURL}/wingsgo/campaign/he-2026-han-quoc`)
    await expect(page).toHaveTitle(/Hè 2026 Hàn Quốc/)
    await expect(page.getByRole('heading', { name: /Hè 2026 Hàn Quốc/i }).first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Campaign')
    await expect(page.getByRole('link', { name: /Xem tour Hàn Quốc/i }).first()).toBeVisible()
  })

  test('exposes sitemap endpoints for launch smoke checks', async ({ page }) => {
    const response = await page.goto(`${e2eBaseURL}/pages-sitemap.xml`)

    expect(response?.ok()).toBe(true)
    await expect(page.locator('body')).toContainText('urlset')
  })

  test('renders parseable JSON-LD for site, page, and breadcrumb schema', async ({ page }) => {
    await page.goto(`${e2eBaseURL}/wingsgo/campaign/he-2026-han-quoc`)

    const graphTypes = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
      scripts.flatMap((script) => {
        const parsed = JSON.parse(script.textContent || '{}')
        const graph = Array.isArray(parsed['@graph']) ? parsed['@graph'] : []

        return graph.map((node) => node['@type'])
      }),
    )

    expect(graphTypes).toEqual(expect.arrayContaining(['Organization', 'WebSite', 'WebPage', 'BreadcrumbList']))
  })

  test('loads a detailed WingsTravel root-site article', async ({ page }) => {
    await page.goto(`${e2eBaseURL}/posts/he-sinh-thai-wingstravel-la-gi`)

    await expect(page).toHaveTitle(/Hệ sinh thái WingsTravel là gì/i)
    await expect(page.getByRole('heading', { name: /Hệ sinh thái WingsTravel là gì/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Tin tức/i }).first()).toBeVisible()
  })

  test('does not render broken internal links across public sites', async ({ request }) => {
    test.setTimeout(180_000)

    const queue: Array<{ depth: number; path: string }> = linkAuditRoutes.map((path) => ({
      depth: 0,
      path,
    }))
    const checked = new Set<string>()
    const failures: string[] = []

    while (queue.length > 0) {
      const batch = queue.splice(0, 12).filter(({ path }) => !checked.has(path))
      batch.forEach(({ path }) => checked.add(path))

      const results = await Promise.all(
        batch.map(async ({ depth, path }) => {
          const response = await request.get(path)
          const html = await response.text()
          const title = html.match(/<title>(.*?)<\/title>/is)?.[1]?.replace(/\s+/g, ' ').trim() || ''

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
