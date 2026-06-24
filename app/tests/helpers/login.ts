import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { e2eBaseURL } from './baseURL'

export interface LoginOptions {
  page: Page
  serverURL?: string
  user: {
    email: string
    password: string
  }
}

/**
 * Logs the user into the admin panel via the login page.
 */
export async function login({
  page,
  serverURL = e2eBaseURL,
  user,
}: LoginOptions): Promise<void> {
  await page.goto(`${serverURL}/admin/login`)

  await page.fill('#field-email', user.email)
  await page.fill('#field-password', user.password)
  await page.click('button[type="submit"]')

  await page.waitForURL(`${serverURL}/admin`)

  await expect(
    page.getByRole('heading', { level: 1, name: /Bảng điều hành CMS|Dashboard/ }),
  ).toBeVisible()
}
