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
import { seedHeroPresentationSmoke } from '../helpers/seedPhase1Launch'
import { heroPresentationDefinitions } from '../../src/heros/presentations/registry'

test.describe('Admin Panel', () => {
  let page: Page
  let roleScope: RoleScopeSeed
  let heroPresentationFixtureIDs: Awaited<ReturnType<typeof seedHeroPresentationSmoke>>

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(90_000)

    await seedTestUser()
    roleScope = await seedRoleScopedUsers()
    heroPresentationFixtureIDs = await seedHeroPresentationSmoke()

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
    await expect(
      page.getByRole('heading', { level: 1, name: 'Bảng điều hành CMS' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Console vận hành' }).first()).toBeVisible()
    await expect(page.locator('#wings-group-metrics-0').getByRole('link', { name: 'Tạo trang nhanh' })).toBeVisible()
    await expect(page.locator('#wings-group-metrics-0').getByRole('link', { name: 'Lead gửi về' })).toBeVisible()
    await expect(page.locator('#wings-group-metrics-0').getByRole('link', { name: /Trang \d+/ })).toBeVisible()
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
    await expect(page.getByRole('heading', { name: 'Hero presentation' })).toBeVisible()
    await expect(page.locator('.theme-manager__hero-preview')).toBeVisible()
    await expect(page.locator('.theme-manager__hero-preview')).toContainText(
      'Trải nghiệm WingsGroup theo từng thị trường',
    )
    await expect(page.locator('.theme-manager__hero-preview-notes')).toBeVisible()
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

  test('can create a draft page from a governed layout preset', async () => {
    const uniqueSlug = `campaign-launch-e2e-${Date.now()}`

    await page.goto(`${e2eBaseURL}/admin/page-wizard`)
    await expect(page.getByRole('heading', { name: 'Tạo trang nhanh' })).toBeVisible()
    await page.getByRole('button', { name: /Campaign launch/ }).click()
    await expect(page.locator('.page-wizard__preset-summary').getByText('Hero mesh')).toBeVisible()
    await page.getByRole('button', { name: 'Tiếp tục' }).click()

    await page.getByPlaceholder('Ví dụ: Tour Nhật Bản mùa thu').fill('Campaign Launch E2E')
    await page.getByPlaceholder('tour-nhat-ban-mua-thu').fill(uniqueSlug)
    await page
      .getByPlaceholder('Viết 1-2 câu giúp người đọc hiểu trang này dùng để làm gì.')
      .fill('Draft created from the campaign launch layout preset.')
    await page.getByRole('button', { name: 'Kiểm tra' }).click()
    await expect(page.getByText('Campaign launch', { exact: true })).toBeVisible()
    await expect(page.getByText('Hero mesh • Bento benefits • Stats • Social proof • Form • CTA')).toBeVisible()
    await page.getByRole('button', { name: 'Tạo trang nháp' }).click()

    await expect(page).toHaveURL(/\/admin\/collections\/pages\/[a-zA-Z0-9-_]+/)
    const pageID = page.url().split('/').pop()
    expect(pageID).toBeTruthy()

    const createdPage = await page.evaluate(async (id) => {
      const response = await fetch(`/api/pages/${id}?depth=0&draft=true`, {
        credentials: 'include',
      })

      return response.json()
    }, pageID)

    expect(createdPage.layoutPresetKey).toBe('campaign-launch')
    expect(createdPage.layout.map((block: { blockType: string }) => block.blockType)).toEqual(
      expect.arrayContaining(['featureGrid', 'stats', 'testimonial', 'formBlock', 'cta']),
    )
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

  test('can select a governed high-impact hero presentation', async () => {
    await page.goto(
      `${e2eBaseURL}/admin/collections/pages/${heroPresentationFixtureIDs['centered-visual']}`,
    )

    const presentationControl = page.locator(
      '#field-hero__presentation input[role="combobox"], #field-hero__presentation[role="combobox"]',
    )
    await expect(presentationControl).toBeVisible()
    await presentationControl.click()

    for (const definition of heroPresentationDefinitions) {
      await expect(page.getByRole('option', { name: definition.label })).toBeVisible()
    }

    await page.getByRole('option', { name: 'Style 3 - Layered visuals' }).click()
    const heroGuide = page.locator('.hero-presentation-guide')
    await expect(heroGuide.getByText('Preview cấu trúc hero')).toBeVisible()
    await expect(heroGuide.getByRole('listitem').filter({ hasText: 'Ảnh hero chính' })).toBeVisible()
    await expect(page.locator('#field-hero__media').getByText('Ảnh hero chính')).toBeVisible()
    await expect(page.getByText('Visual bổ sung', { exact: true })).toBeVisible()
    await expect(page.getByText('Slides', { exact: true })).toBeVisible()
    await expect(page.getByText('Video hero', { exact: true })).toBeVisible()
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
