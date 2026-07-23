import { expect, test } from '@playwright/test'

const readIdentity = async (page: import('@playwright/test').Page) => ({
  canonical: await page.locator('link[rel="canonical"]').getAttribute('href'),
  siteTheme: await page.locator('body').getAttribute('data-site-theme'),
  title: await page.title(),
})

test.describe('public tenant isolation', () => {
  test('site and siteAlias query parameters cannot change tenant identity', async ({ page }) => {
    await page.goto('/wingsgo')
    const baseline = await readIdentity(page)

    await page.goto('/wingsgo?site=wings-care&siteAlias=wingscare&locale=it')
    await expect.poll(() => readIdentity(page)).toEqual(baseline)
  })

  test('spoofed internal headers cannot change tenant identity', async ({ browser, baseURL }) => {
    const normalContext = await browser.newContext({ baseURL })
    const normalPage = await normalContext.newPage()
    await normalPage.goto('/wingsgo')
    const baseline = await readIdentity(normalPage)
    await normalContext.close()

    const spoofedContext = await browser.newContext({
      baseURL,
      extraHTTPHeaders: {
        'x-site-code': 'wings-care',
        'x-site-context-source': 'proxy',
        'x-site-host': 'wingscare.wingsgroup.vn',
        'x-site-prefix': '/wingscare',
      },
    })
    const spoofedPage = await spoofedContext.newPage()
    await spoofedPage.goto('/wingsgo')
    expect(await readIdentity(spoofedPage)).toEqual(baseline)
    await spoofedContext.close()
  })

  test('the destructive seed HTTP surface stays unavailable', async ({ request }) => {
    const response = await request.post('/next/seed')

    expect(response.status()).toBe(404)
  })
})
