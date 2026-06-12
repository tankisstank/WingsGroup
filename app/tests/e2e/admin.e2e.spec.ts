import { test, expect, Page } from '@playwright/test'
import { e2eBaseURL } from '../helpers/baseURL'
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

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(90_000)

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
    await page.goto(`${e2eBaseURL}/admin`)
    await expect(page).toHaveURL(`${e2eBaseURL}/admin`)
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bảng điều hành CMS' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Console vận hành' }).first()).toBeVisible()
    await expect(page.locator('#wings-travel-metrics-0').getByRole('link', { name: 'Tạo trang nhanh' })).toBeVisible()
    await expect(page.locator('#wings-travel-metrics-0').getByRole('link', { name: 'Lead gửi về' })).toBeVisible()
    await expect(page.locator('#wings-travel-metrics-0').getByRole('link', { name: /Trang \d+/ })).toBeVisible()
  })

  test('can open operator console', async () => {
    await page.goto(`${e2eBaseURL}/admin/console`)
    await expect(page.getByRole('heading', { name: 'Console vận hành' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tạo trang nhanh' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Xem lead mới' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nâng cao' })).toBeVisible()
  })

  test('can review theme manager without leaking preset ids', async () => {
    await page.goto(`${e2eBaseURL}/admin/theme`)
    await expect(page.getByRole('heading', { name: 'Theme Manager' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Colors' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Typography, shape & layout' })).toBeVisible()
    await expect(page.locator('.theme-manager__preview-head strong')).not.toHaveText(/^\d+$/)
    await expect(page.getByLabel('Brand color picker')).toBeVisible()
    await expect(page.getByText(/Preview (live|chưa lưu)/)).toBeVisible()
  })

  test('can preview and pick colors while creating a theme preset', async () => {
    test.setTimeout(90_000)

    await page.goto(`${e2eBaseURL}/admin/collections/theme-presets/create`)

    await expect(page.getByRole('heading', { name: /\[Untitled\]|\[Chưa có tiêu đề\]/ })).toBeVisible()
    await expect(page.getByText('Preview giao diện')).toBeVisible()
    await expect(page.locator('.theme-preset-preview')).toBeVisible()

    const colorPickers = page.locator('input[type="color"]')
    await expect(colorPickers).toHaveCount(4)
    await expect(page.getByLabel('Màu chính picker')).toBeVisible()
    await expect(page.getByLabel('Màu nhấn picker')).toBeVisible()

    await page.getByLabel('Tên giao diện', { exact: false }).fill('Preview Test')
    await page.getByLabel('Mã hệ thống', { exact: false }).fill('preview-test')
    await page.locator('.theme-preset-color-field__text').first().fill('#123456')

    await expect(page.locator('.theme-preset-preview')).toContainText('Preview Test')
    await expect(page.locator('.theme-preset-preview__meta')).toContainText('#123456')
  })

  test('can open quick page wizard', async () => {
    await page.goto(`${e2eBaseURL}/admin/page-wizard`)
    await expect(page.getByRole('heading', { name: 'Tạo trang nhanh' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Landing page chiến dịch/ })).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto(`${e2eBaseURL}/admin/collections/users`)
    await expect(page).toHaveURL(`${e2eBaseURL}/admin/collections/users`)
    const listViewArtifact = page.getByRole('heading', { level: 1, name: /Users|Người dùng/ }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto(`${e2eBaseURL}/admin/collections/pages/create`)
    await expect(page).toHaveURL(/\/admin\/collections\/pages\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="title"]')
    await expect(editViewArtifact).toBeVisible()
  })

  test('site manager can read only assigned site settings through authenticated API', async ({ request }) => {
    const auth = await request.post(`${e2eBaseURL}/api/users/login`, {
      data: scopedUsers.siteManager,
    })
    expect(auth.ok()).toBe(true)

    const ownSiteSettings = await request.get(
      `${e2eBaseURL}/api/site-settings?depth=0&where[site][equals]=${roleScope.wingsGoSiteID}`,
    )
    expect(ownSiteSettings.ok()).toBe(true)
    expect((await ownSiteSettings.json()).docs).toHaveLength(1)

    const otherSiteSettings = await request.get(
      `${e2eBaseURL}/api/site-settings?depth=0&where[site][equals]=${roleScope.wingsCareSiteID}`,
    )
    expect(otherSiteSettings.ok()).toBe(true)
    expect((await otherSiteSettings.json()).docs).toHaveLength(0)
  })

  test('editor cannot create site settings through authenticated API', async ({ request }) => {
    const auth = await request.post(`${e2eBaseURL}/api/users/login`, {
      data: scopedUsers.editor,
    })
    expect(auth.ok()).toBe(true)

    const createSettings = await request.post(`${e2eBaseURL}/api/site-settings`, {
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
    await editorPage.goto(`${e2eBaseURL}/admin/console`)

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
    await managerPage.goto(`${e2eBaseURL}/admin/console`)
    await expect(managerPage.getByRole('link', { name: 'Nhập dữ liệu' }).first()).toBeVisible()
    await expect(managerPage.getByRole('heading', { name: 'Nâng cao' })).toHaveCount(0)

    await managerPage.goto(`${e2eBaseURL}/admin/collections/form-submissions`)
    await expect(managerPage.getByText('Lead sẽ tự xuất hiện')).toBeVisible()

    await context.close()
  })
})
