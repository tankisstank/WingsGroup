import { expect, test } from '@playwright/test'

import { loadMultisiteAuditInventory } from '../helpers/multisiteAuditInventory'
import { resolveHeaderPrimaryAction } from '@/utilities/headerPrimaryActions'

const e2eBaseURL = (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100').replace(/\/$/, '')
const inventory = loadMultisiteAuditInventory()

const requireSite = (siteName: string) => {
  const site = inventory.sites.find((entry) => entry.name === siteName)

  if (!site) {
    throw new Error(`Missing inventory site ${siteName}`)
  }

  return site
}

const getCanonicalHref = (page: import('@playwright/test').Page) =>
  page.locator('link[rel="canonical"]').getAttribute('href')

const getFirstTourProduct = async (request: import('@playwright/test').APIRequestContext) => {
  const response = await request.get(`${e2eBaseURL}/api/tour-products?depth=0&limit=10`)
  expect(response.ok(), 'tour-products API').toBe(true)

  const payload = await response.json()
  const tour = payload.docs?.find((doc: { slug?: string }) => typeof doc.slug === 'string')

  if (!tour?.slug) {
    throw new Error('No seeded tour product found for multisite site-flow regression')
  }

  return tour as { slug: string; title?: null | string }
}

test.describe('Multisite site-type business flows', () => {
  test('WingsGroup keeps umbrella-site policy route, locale-switch href, and contact CTA on its own contract', async ({
    page,
  }) => {
    const site = requireSite('wings-group')
    const nestedPath = site.nestedRouteSamples[site.defaultLocale] || '/chinh-sach-bao-mat'
    const primaryAction = resolveHeaderPrimaryAction(site.themeKey || 'wings-group', site.defaultLocale)

    await page.goto(`${e2eBaseURL}/${site.localAlias}${nestedPath}`, {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.locator('body')).toHaveAttribute('data-site-theme', site.themeKey || 'wings-group')
    await expect(page.locator('html')).toHaveAttribute('lang', site.defaultLocale)
    await expect(getCanonicalHref(page)).resolves.toBe(`${site.canonicalDomain}${nestedPath}`)

    const languageSwitcher = page.getByRole('navigation', { name: /language|ngôn ngữ|lingua/i }).first()
    await expect(languageSwitcher).toBeVisible()
    await expect(languageSwitcher).toHaveAttribute('data-client-ready', 'true')
    await expect(
      languageSwitcher.getByRole('link', { name: 'English' }),
      'WingsGroup locale switch keeps the same policy route',
    ).toHaveAttribute('href', `/${site.localAlias}/en${nestedPath}`)

    const headerCta = page.getByRole('link', { name: primaryAction.label }).first()
    await expect(headerCta).toHaveAttribute('href', `/${site.localAlias}${primaryAction.url}`)
    await headerCta.click()

    await expect(page).toHaveURL(`${e2eBaseURL}/${site.localAlias}${primaryAction.url}`)
    await expect(getCanonicalHref(page)).resolves.toBe(`${site.canonicalDomain}${primaryAction.url}`)
    await expect(page.locator('html')).toHaveAttribute('lang', site.defaultLocale)
  })

  test('WingsGo keeps retail tour detail and reserve flow on its own site contract', async ({
    page,
    request,
  }) => {
    const site = requireSite('wings-go')
    const primaryAction = resolveHeaderPrimaryAction(site.themeKey || 'wings-go', site.defaultLocale)
    const tour = await getFirstTourProduct(request)

    await page.goto(`${e2eBaseURL}/${site.localAlias}/tour/${tour.slug}`, {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.locator('body')).toHaveAttribute('data-site-theme', site.themeKey || 'wings-go')
    await expect(page.locator('html')).toHaveAttribute('lang', site.defaultLocale)
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('link', { name: primaryAction.label }).first()).toHaveAttribute(
      'href',
      new RegExp(`^/${site.localAlias}${primaryAction.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    )

    const reserveLink = page
      .locator(`a[href^="/${site.localAlias}${primaryAction.url}"]`)
      .first()
    await expect(reserveLink, 'WingsGo reserve/contact link').toBeVisible()
    await reserveLink.click()

    await expect(page).toHaveURL(new RegExp(`/${site.localAlias}${primaryAction.url}(?:\\?|$)`))
    await expect(getCanonicalHref(page)).resolves.toBe(`${site.canonicalDomain}${primaryAction.url}`)
    await expect(page.locator('html')).toHaveAttribute('lang', site.defaultLocale)
  })

  test('WingsCare keeps support-to-contact flow scoped to its subdomain contract', async ({
    page,
  }) => {
    const site = requireSite('wings-care')
    const nestedPath = site.nestedRouteSamples[site.defaultLocale] || '/claim-support'
    const primaryAction = resolveHeaderPrimaryAction(site.themeKey || 'wings-care', site.defaultLocale)

    await page.goto(`${e2eBaseURL}/${site.localAlias}${nestedPath}`, {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.locator('body')).toHaveAttribute('data-site-theme', site.themeKey || 'wings-care')
    await expect(getCanonicalHref(page)).resolves.toBe(`${site.canonicalDomain}${nestedPath}`)

    const headerCta = page.getByRole('link', { name: primaryAction.label }).first()
    await expect(headerCta).toHaveAttribute('href', `/${site.localAlias}${primaryAction.url}`)
    await headerCta.click()

    await expect(page).toHaveURL(`${e2eBaseURL}/${site.localAlias}${primaryAction.url}`)
    await expect(getCanonicalHref(page)).resolves.toBe(`${site.canonicalDomain}${primaryAction.url}`)
    await expect(page.getByRole('banner')).toBeVisible()
  })

  test('WingsPass keeps subdomain add-on flow and locale-switch href on the same business route', async ({
    page,
  }) => {
    const site = requireSite('wings-pass')
    const nestedPath = site.nestedRouteSamples[site.defaultLocale] || '/add-on'
    const primaryAction = resolveHeaderPrimaryAction(site.themeKey || 'wings-pass', site.defaultLocale)

    await page.goto(`${e2eBaseURL}/${site.localAlias}${nestedPath}`, {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.locator('body')).toHaveAttribute('data-site-theme', site.themeKey || 'wings-pass')
    await expect(getCanonicalHref(page)).resolves.toBe(`${site.canonicalDomain}${nestedPath}`)
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toContainText(
      primaryAction.url === '/contact' ? 'Liên hệ' : primaryAction.label,
    )
    await expect(page.getByRole('link', { name: /Liên hệ/i }).first()).toHaveAttribute(
      'href',
      `/${site.localAlias}${primaryAction.url}`,
    )

    const languageSwitcher = page.getByRole('navigation', { name: /language|ngôn ngữ|lingua/i }).first()
    await expect(languageSwitcher).toBeVisible()
    await expect(languageSwitcher).toHaveAttribute('data-client-ready', 'true')
    await expect(
      languageSwitcher.getByRole('link', { name: 'English' }),
      'WingsPass business-route locale switch href',
    ).toHaveAttribute('href', `/${site.localAlias}/en${nestedPath}`)
  })

  test('WingsPlus keeps service-site CTA flow on request-proposal without leaking another site contract', async ({
    page,
  }) => {
    const site = requireSite('wings-plus')
    const nestedPath = site.nestedRouteSamples[site.defaultLocale] || '/destinations'
    const primaryAction = resolveHeaderPrimaryAction(site.themeKey || 'wings-plus', site.defaultLocale)

    await page.goto(`${e2eBaseURL}/${site.localAlias}${nestedPath}`, {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.locator('body')).toHaveAttribute('data-site-theme', site.themeKey || 'wings-plus')
    await expect(getCanonicalHref(page)).resolves.toBe(`${site.canonicalDomain}${nestedPath}`)

    const headerCta = page.getByRole('link', { name: primaryAction.label }).first()
    await expect(headerCta).toHaveAttribute('href', `/${site.localAlias}${primaryAction.url}`)
    await headerCta.click()

    await expect(page).toHaveURL(`${e2eBaseURL}/${site.localAlias}${primaryAction.url}`)
    await expect(getCanonicalHref(page)).resolves.toBe(`${site.canonicalDomain}${primaryAction.url}`)
  })
})
