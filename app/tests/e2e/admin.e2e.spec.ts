import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'
import {
  cleanupRoleScopedUsers,
  scopedUsers,
  seedRoleScopedUsers,
  type RoleScopeSeed,
} from '../helpers/seedRoleUsers'

test.describe('Admin Panel', () => {
  let page: Page
  let roleScope: RoleScopeSeed

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    roleScope = await seedRoleScopedUsers()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupRoleScopedUsers()
    await cleanupTestUser()
  })

  test('can navigate to dashboard', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL('http://localhost:3000/admin')
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bảng điều hành CMS' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Console vận hành' }).first()).toBeVisible()
    await expect(page.locator('#wings-travel-metrics-0').getByRole('link', { name: 'Tạo trang nhanh' })).toBeVisible()
    await expect(page.locator('#wings-travel-metrics-0').getByRole('link', { name: 'Lead gửi về' })).toBeVisible()
    await expect(page.locator('#wings-travel-metrics-0').getByRole('link', { name: /Trang \d+/ })).toBeVisible()
  })

  test('can open operator console', async () => {
    await page.goto('http://localhost:3000/admin/console')
    await expect(page.getByRole('heading', { name: 'Console vận hành' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tạo trang nhanh' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Xem lead mới' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nâng cao' })).toBeVisible()
  })

  test('can open quick page wizard', async () => {
    await page.goto('http://localhost:3000/admin/page-wizard')
    await expect(page.getByRole('heading', { name: 'Tạo trang nhanh' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Landing page chiến dịch/ })).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users')
    await expect(page).toHaveURL('http://localhost:3000/admin/collections/users')
    const listViewArtifact = page.locator('h1', { hasText: 'Người dùng' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto('http://localhost:3000/admin/collections/pages/create')
    await expect(page).toHaveURL(/\/admin\/collections\/pages\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="title"]')
    await expect(editViewArtifact).toBeVisible()
  })

  test('site manager can read only assigned site settings through authenticated API', async ({ request }) => {
    const auth = await request.post('http://localhost:3000/api/users/login', {
      data: scopedUsers.siteManager,
    })
    expect(auth.ok()).toBe(true)

    const ownSiteSettings = await request.get(
      `http://localhost:3000/api/site-settings?depth=0&where[site][equals]=${roleScope.wingsGoSiteID}`,
    )
    expect(ownSiteSettings.ok()).toBe(true)
    expect((await ownSiteSettings.json()).docs).toHaveLength(1)

    const otherSiteSettings = await request.get(
      `http://localhost:3000/api/site-settings?depth=0&where[site][equals]=${roleScope.wingsCareSiteID}`,
    )
    expect(otherSiteSettings.ok()).toBe(true)
    expect((await otherSiteSettings.json()).docs).toHaveLength(0)
  })

  test('editor cannot create site settings through authenticated API', async ({ request }) => {
    const auth = await request.post('http://localhost:3000/api/users/login', {
      data: scopedUsers.editor,
    })
    expect(auth.ok()).toBe(true)

    const createSettings = await request.post('http://localhost:3000/api/site-settings', {
      data: {
        site: roleScope.wingsGoSiteID,
        siteName: 'Unauthorized Editor Settings',
      },
    })

    expect(createSettings.status()).toBe(403)
  })

  test('editor console hides data exchange and advanced admin links', async ({ browser }) => {
    const context = await browser.newContext()
    const editorPage = await context.newPage()

    await login({ page: editorPage, user: scopedUsers.editor })
    await editorPage.goto('http://localhost:3000/admin/console')

    await expect(editorPage.getByRole('heading', { name: 'Console vận hành' })).toBeVisible()
    await expect(editorPage.getByRole('link', { name: 'Tạo trang nhanh' })).toBeVisible()
    await expect(editorPage.getByRole('link', { name: 'Nhập dữ liệu' })).toHaveCount(0)
    await expect(editorPage.getByRole('link', { name: 'Xuất dữ liệu' })).toHaveCount(0)
    await expect(editorPage.getByRole('heading', { name: 'Nâng cao' })).toHaveCount(0)

    await context.close()
  })

  test('site manager sees guided import and lead guidance', async ({ browser }) => {
    const context = await browser.newContext()
    const managerPage = await context.newPage()

    await login({ page: managerPage, user: scopedUsers.siteManager })
    await managerPage.goto('http://localhost:3000/admin/console')
    await expect(managerPage.getByRole('link', { name: 'Nhập dữ liệu' }).first()).toBeVisible()
    await expect(managerPage.getByRole('heading', { name: 'Nâng cao' })).toHaveCount(0)

    await managerPage.goto('http://localhost:3000/admin/collections/form-submissions')
    await expect(managerPage.getByText('Lead sẽ tự xuất hiện')).toBeVisible()

    await context.close()
  })
})
