import { expect, test } from '@playwright/test'

import { e2eBaseURL } from '../helpers/baseURL'

const enabled = process.env.WINGSSIDE_FULL_TOUR_LOCALE_GATE === 'true'
const publicOrigin = 'https://wingside.vn'
const locales = ['en', 'vi', 'it', 'es', 'pt'] as const
const viewportWidths = [390, 1440] as const
const stableRoles = [
  { marker: 'why-featured', role: 'local-design' },
  { marker: 'why-flexible', role: 'flexible-planning' },
  { marker: 'why-style', role: 'style-matching' },
  { marker: 'why-care', role: 'collaborative-care' },
] as const

const homePath = (locale: (typeof locales)[number]) =>
  locale === 'en' ? '/' : `/${locale}`

const expectedTourPathPattern = (locale: (typeof locales)[number]) =>
  locale === 'en'
    ? /^\/tour\/[^/]+$/u
    : new RegExp(`^/${locale}/tour/[^/]+$`, 'u')

const localWingSideOrigin = () => {
  const target = new URL(e2eBaseURL)
  expect(target.protocol).toBe('http:')
  expect(target.hostname).toBe('127.0.0.1')
  expect(target.port).not.toBe('')
  return `http://wingside.vn:${target.port}`
}

test.describe('WingSide Why Travel real-tour locale matrix', () => {
  test.skip(!enabled, 'Enable only inside the reviewed applied catalog lifecycle window')

  test('connects all four Why Travel roles to eligible real tours across five locales and two widths', async ({
    browser,
    request,
  }) => {
    test.setTimeout(900_000)
    const sitemapResponse = await request.get(`${e2eBaseURL}/pages-sitemap.xml`, {
      headers: { host: 'wingside.vn' },
    })
    expect(sitemapResponse.status()).toBe(200)
    const sitemap = await sitemapResponse.text()
    const eligibleTourPaths = new Set(
      Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/giu), ([, value]) => value)
        .filter((value): value is string => Boolean(value))
        .map((value) => new URL(value))
        .filter((value) => value.origin === publicOrigin && value.pathname.includes('/tour/'))
        .map((value) => value.pathname),
    )
    expect(eligibleTourPaths.size).toBe(110)

    for (const width of viewportWidths) {
      for (const locale of locales) {
        const context = await browser.newContext({
          baseURL: localWingSideOrigin(),
          viewport: { height: 1000, width },
        })
        const page = await context.newPage()
        const response = await page.goto(homePath(locale), {
          waitUntil: 'domcontentloaded',
        })
        expect(response?.status(), `${locale} ${width}px Home`).toBe(200)
        await expect(page.locator('[data-od-id="home-why"]')).toBeVisible()
        await expect(page.locator('[data-od-id^="why-"]')).toHaveCount(4)

        const rolePaths = new Map<string, string>()
        for (const { marker, role } of stableRoles) {
          const roleRoot = page.locator(`[data-od-id="${marker}"]`)
          await expect(roleRoot, `${locale} ${width}px ${role}`).toHaveCount(1)
          await expect(roleRoot, `${locale} ${width}px ${role}`).toBeVisible()
          const roleLink = page.locator(
            `[data-od-id="${marker}"][href], [data-od-id="${marker}"] a[href]`,
          )
          await expect(roleLink, `${locale} ${width}px ${role} link`).toHaveCount(1)
          const href = await roleLink.getAttribute('href')
          expect(href, `${locale} ${width}px ${role} href`).toBeTruthy()
          const publicURL = new URL(href!, publicOrigin)
          expect(publicURL.origin, `${locale} ${width}px ${role} origin`).toBe(
            publicOrigin,
          )
          expect(
            publicURL.pathname,
            `${locale} ${width}px ${role} locale path`,
          ).toMatch(expectedTourPathPattern(locale))
          expect(
            eligibleTourPaths.has(publicURL.pathname),
            `${locale} ${width}px ${role} eligible sitemap tour`,
          ).toBe(true)
          rolePaths.set(role, publicURL.pathname)
        }

        expect(rolePaths.size).toBe(4)
        expect(new Set(rolePaths.values()).size).toBe(4)
        expect(
          [...rolePaths.values()].some(
            (pathname) =>
              pathname === '/' ||
              pathname.includes('/tours/') ||
              !pathname.includes('/tour/'),
          ),
        ).toBe(false)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          `${locale} ${width}px Home horizontal overflow`,
        ).toBe(true)

        for (const [role, pathname] of rolePaths) {
          const detailPage = await context.newPage()
          const detailResponse = await detailPage.goto(pathname, {
            waitUntil: 'domcontentloaded',
          })
          expect(detailResponse?.status(), `${locale} ${width}px ${role} detail`).toBe(
            200,
          )
          await expect(detailPage.locator('html')).toHaveAttribute('lang', locale)
          await expect(detailPage.locator('link[rel="canonical"]')).toHaveAttribute(
            'href',
            `${publicOrigin}${pathname}`,
          )
          await detailPage.close()
        }

        await context.close()
      }
    }
  })
})
