import { expect, test } from '@playwright/test'

import { seedPhase1LaunchSmoke } from '../helpers/seedPhase1Launch'

const phase1Routes = [
  { path: '/', title: /WingsTravel/, heading: 'WingsTravel' },
  { path: '/wingsgo', title: /WingsGo/, heading: 'WingsGo' },
  { path: '/wingscare', title: /WingsCare/, heading: 'WingsCare' },
  { path: '/wingsinsurance', title: /WingsInsurance/, heading: 'WingsInsurance' },
  { path: '/wingsgo/en', title: /WingsGo/, heading: 'WingsGo' },
] as const

test.describe('Phase 1 public frontend smoke', () => {
  test.beforeAll(async () => {
    await seedPhase1LaunchSmoke()
  })

  for (const route of phase1Routes) {
    test(`loads ${route.path}`, async ({ page }) => {
      await page.goto(`http://localhost:3000${route.path}`)
      await expect(page).toHaveTitle(route.title)
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
    })
  }

  test('loads the seeded campaign landing page for a child site', async ({ page }) => {
    await page.goto('http://localhost:3000/wingsgo/campaign')
    await expect(page).toHaveTitle(/Campaign/)
    await expect(page.getByRole('heading', { name: /Campaign Landing/ }).first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Campaign')
    await expect(page.getByRole('link', { name: /Contact/i }).first()).toBeVisible()
  })

  test('exposes sitemap endpoints for launch smoke checks', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/pages-sitemap.xml')

    expect(response?.ok()).toBe(true)
    await expect(page.locator('body')).toContainText('urlset')
  })
})
