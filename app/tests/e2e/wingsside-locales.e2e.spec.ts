import { expect, test, type Locator, type Page } from '@playwright/test'

const e2eBaseURL = (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100').replace(/\/$/, '')

const localAliasUrl = (locale: 'en' | 'it', path: string) =>
  `${e2eBaseURL}/wing-side/${locale}${path}`

const activateLocaleLink = async (page: Page, scope: Locator | Page, label: RegExp | string) => {
  const link = scope.getByRole('link', { name: label }).first()
  await link.click()
}

test.describe('WingsSide locale continuity', () => {
  test('permanently redirects the legacy alias to the canonical locale path', async ({ request }) => {
    const legacyPath = '/wingsside/it/search?q=hanoi'
    const canonicalPath = '/wing-side/it/search?q=hanoi'
    const redirect = await request.get(`${e2eBaseURL}${legacyPath}`, { maxRedirects: 0 })

    expect(redirect.status()).toBe(308)
    expect(redirect.headers().location).toBe(`${e2eBaseURL}${canonicalPath}`)

    const followed = await request.get(`${e2eBaseURL}${legacyPath}`)
    expect(followed.status()).toBe(200)
    expect(followed.url()).toBe(`${e2eBaseURL}${canonicalPath}`)
  })

  test('keeps unprefixed English and /vi Vietnamese self-canonical', async ({ page }) => {
    await page.goto(`${e2eBaseURL}/wing-side`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://wingside.vn',
    )

    await page.goto(`${e2eBaseURL}/wing-side/vi`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://wingside.vn/vi',
    )
  })

  test('keeps the selected locale through switch, footer navigation, back, and refresh on the local alias flow', async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1440 })
    await page.goto(localAliasUrl('en', '/search?q=hanoi#results'), {
      waitUntil: 'domcontentloaded',
    })

    const languageSwitcher = page.getByRole('navigation', { name: 'Language switcher' }).first()
    await expect(languageSwitcher).toBeVisible()
    await expect(languageSwitcher).toHaveAttribute('data-client-ready', 'true')
    await expect(languageSwitcher.getByRole('link', { name: 'Italiano' })).toHaveAttribute(
      'href',
      '/wing-side/it/search?q=hanoi#results',
    )

    await activateLocaleLink(page, page, 'Italiano')
    await expect(page).toHaveURL(`${e2eBaseURL}/wing-side/it/search?q=hanoi#results`)
    await expect(page.locator('html')).toHaveAttribute('lang', 'it')
    await expect(
      page.getByRole('navigation', { name: 'Navigazione del piè di pagina' }),
    ).toBeVisible()

    const footerNavigation = page.getByRole('navigation', { name: 'Navigazione del piè di pagina' })
    await footerNavigation.getByRole('link', { name: 'Destinazioni' }).click()
    await expect(page).toHaveURL(`${e2eBaseURL}/wing-side/it/destinations`)
    await expect(page.locator('html')).toHaveAttribute('lang', 'it')

    await page.goBack({ waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(`${e2eBaseURL}/wing-side/it/search?q=hanoi#results`)
    await expect(page.locator('html')).toHaveAttribute('lang', 'it')

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(`${e2eBaseURL}/wing-side/it/search?q=hanoi#results`)
    await expect(page.locator('html')).toHaveAttribute('lang', 'it')
  })
})
