import { expect, test } from '@playwright/test'

import { e2eBaseURL } from '../helpers/baseURL'
import { getLocalAdminPassword, localAdminCredentials } from '../../src/utilities/adminSeed'

const tourSlug = 'shizuoka-nui-phu-si-tokyo-5n4d'
const builderSectionIDs = [
  'facts',
  'why-choose',
  'route',
  'itinerary',
  'services',
  'departures',
  'faq',
  'related',
  'reviews',
] as const

test.describe('Tour detail builder public contract', () => {
  test('renders only governed sections in governed order', async ({ page, request }) => {
    test.setTimeout(90_000)

    const loginResponse = await request.post(`${e2eBaseURL}/api/users/login`, {
      data: {
        email: localAdminCredentials.email,
        password: getLocalAdminPassword(),
      },
    })
    expect(loginResponse.ok()).toBe(true)

    const tourResponse = await request.get(
      `${e2eBaseURL}/api/tour-products?depth=0&limit=1&where[slug][equals]=${tourSlug}&draft=true`,
    )
    expect(tourResponse.ok()).toBe(true)

    const tourPayload = await tourResponse.json()
    const tour = tourPayload.docs?.[0]

    if (!tour) {
      throw new Error(`Seeded tour product not found for slug ${tourSlug}`)
    }

    const updateResponse = await request.patch(`${e2eBaseURL}/api/tour-products/${tour.id}`, {
      data: {
        sectionOrder: ['hero', 'services', 'departures', 'sticky-cta'],
        sectionVisibility: ['hero', 'services', 'departures', 'sticky-cta'],
      },
    })
    expect(updateResponse.ok()).toBe(true)

    await page.goto(`${e2eBaseURL}/wingsgo/tour/${tourSlug}`)

    const navHrefs = await page
      .getByRole('navigation', { name: 'Mục lục tour' })
      .locator('a[href^="#"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')).filter(Boolean))
    expect(navHrefs).toEqual(['#services', '#departures'])
    await expect(page.locator('a[href="#services"]')).toContainText('Dịch vụ & lưu trú')
    await expect(page.locator('a[href="#departures"]')).toContainText('Lịch khởi hành')

    const renderedSectionIDs = await page.evaluate(
      (allowedIDs) => {
        const allowed = new Set<string>(allowedIDs)
        return Array.from(document.querySelectorAll('section[id]'))
          .map((section) => section.id)
          .filter((id) => allowed.has(id))
      },
      [...builderSectionIDs],
    )

    expect(renderedSectionIDs).toEqual(['services', 'departures'])

    await expect(page.locator('#services')).toBeVisible()
    await expect(page.locator('#departures')).toBeVisible()
    await expect(page.locator('text=So sánh các đợt đi').last()).toBeVisible()
    expect(renderedSectionIDs.includes('facts')).toBe(false)
    expect(renderedSectionIDs.includes('faq')).toBe(false)
    expect(renderedSectionIDs.includes('itinerary')).toBe(false)
  })
})
