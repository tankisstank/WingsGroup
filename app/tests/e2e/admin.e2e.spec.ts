import { expect, test, type BrowserContext, type Page } from '@playwright/test'
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

const consoleEndpoints = {
  leadsCount: '/api/form-submissions?depth=0&limit=0',
  mediaCount: '/api/media?depth=0&limit=0',
  me: '/api/users/me',
  pageDrafts: '/api/pages?depth=0&limit=0&where[_status][equals]=draft',
  pagesCount: '/api/pages?depth=0&limit=0',
  postDrafts: '/api/posts?depth=0&limit=0&where[_status][equals]=draft',
  postsCount: '/api/posts?depth=0&limit=0',
  recentLeads: '/api/form-submissions?depth=1&limit=5&sort=-createdAt',
  recentPages: '/api/pages?depth=0&limit=5&sort=-updatedAt',
  sites: '/api/sites?depth=0&limit=20&sort=name',
} as const

const operationalRoutes = [
  '/admin/page-wizard',
  '/admin/site-review',
  '/admin/theme',
  '/admin/collections/pages',
  '/admin/collections/posts',
  '/admin/collections/categories',
  '/admin/collections/tour-products',
  '/admin/collections/departure-variants',
  '/admin/collections/tour-departures',
  '/admin/collections/tour-campaigns',
  '/admin/collections/media',
  '/admin/collections/forms',
  '/admin/collections/form-submissions',
  '/admin/collections/imports',
  '/admin/collections/exports',
  '/admin/collections/sites',
  '/admin/collections/theme-presets',
  '/admin/collections/hero-presentation-presets',
  '/admin/collections/site-settings',
  '/admin/collections/users',
  '/admin/collections/redirects',
  '/admin/collections/search',
  '/admin/globals/header',
  '/admin/globals/footer',
] as const

const responsiveWidths = [360, 390, 430, 600, 768, 820, 1024, 1366, 1440, 1920] as const
const mobileWidths = new Set<number>([360, 390, 430, 600])
const tabletWidths = new Set<number>([768, 820, 1024])
const triageRoutes = [
  '/admin/console',
  '/admin/site-review',
  '/admin/collections/form-submissions',
] as const

const getDecodedEndpoint = (url: string) => {
  const parsedURL = new URL(url)

  return decodeURIComponent(`${parsedURL.pathname}${parsedURL.search}`)
}

const assertNoHorizontalOverflow = async (targetPage: Page) => {
  const dimensions = await targetPage.evaluate(() => ({
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
  }))

  expect(dimensions.documentScrollWidth).toBeLessThanOrEqual(dimensions.documentClientWidth + 1)
  expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(dimensions.bodyClientWidth + 1)
}

test.describe('Admin Panel', () => {
  test.describe.configure({ mode: 'serial' })

  let context: BrowserContext
  let page: Page
  let roleScope: RoleScopeSeed
  let heroPresentationFixtureIDs: Awaited<ReturnType<typeof seedHeroPresentationSmoke>>

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(90_000)

    await seedTestUser()
    roleScope = await seedRoleScopedUsers()
    heroPresentationFixtureIDs = await seedHeroPresentationSmoke({
      destroyPayloadAfterSeed: false,
    })

    context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    try {
      await context?.close()
    } finally {
      try {
        await cleanupRoleScopedUsers()
      } finally {
        await cleanupTestUser()
      }
    }
  })

  test('can navigate to dashboard', async () => {
    await page.goto(`${e2eBaseURL}/admin`)
    await expect(page).toHaveURL(`${e2eBaseURL}/admin`)
    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'finexy-soft')
    await expect(page.locator('html')).toHaveClass(/wings-admin-theme-finexy/)
    await expect(page.getByRole('heading', { level: 1, name: 'Bảng điều hành CMS' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Console vận hành' }).first()).toBeVisible()
    await expect(
      page.locator('#wings-group-metrics-0').getByRole('link', { name: 'Tạo trang nhanh' }),
    ).toBeVisible()
    await expect(
      page.locator('#wings-group-metrics-0').getByRole('link', { name: 'Lead gửi về' }),
    ).toBeVisible()
    await expect(
      page.locator('#wings-group-metrics-0').getByRole('link', { name: /Trang \d+/ }),
    ).toBeVisible()
  })

  test('can switch CMS backend themes with URL parameter and persist selection', async () => {
    await page.goto(`${e2eBaseURL}/admin?adminTheme=finexy-soft`)
    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'finexy-soft')
    await expect(page.locator('html')).toHaveClass(/wings-admin-theme-finexy/)
    expect(await page.evaluate(() => window.localStorage.getItem('wings-admin-theme'))).toBe(
      'finexy-soft',
    )

    await page.goto(`${e2eBaseURL}/admin?adminTheme=ats-compact`)
    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'ats-compact')
    await expect(page.locator('html')).toHaveClass(/wings-admin-theme-ats/)
    expect(await page.evaluate(() => window.localStorage.getItem('wings-admin-theme'))).toBe(
      'ats-compact',
    )

    await page.goto(`${e2eBaseURL}/admin/console`)
    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'ats-compact')
    await expect(page.locator('html')).toHaveClass(/wings-admin-theme-ats/)

    await page.goto(`${e2eBaseURL}/admin?adminTheme=not-a-theme`)
    await expect(page.locator('html')).toHaveAttribute('data-admin-theme', 'finexy-soft')
    await expect(page.locator('html')).toHaveClass(/wings-admin-theme-finexy/)
  })

  test('can open operator console', async () => {
    await page.goto(`${e2eBaseURL}/admin/console`)
    await expect(page.getByRole('heading', { name: 'Console vận hành' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tạo trang nhanh' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Xem tổng lead' })).toBeVisible()
    await expect(page.getByText('Phạm vi: Tất cả site được phân quyền')).toBeVisible()
    await expect(page.getByText('Locale nội dung: Tất cả locale')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nâng cao' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Trang nháp', exact: true }).first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Bài viết nháp', exact: true }).first(),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tổng lead', exact: true }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Search', exact: true })).toHaveAttribute(
      'href',
      '/admin/collections/search',
    )

    const unsupportedClaims =
      /approval queue|chờ duyệt|bình luận|phân công|dry[- ]run|diff|rollback|khôi phục|import luôn tạo bản nháp/i
    await expect(page.locator('.cms-console')).not.toContainText(unsupportedClaims)
    await expect(page.getByRole('button', { name: unsupportedClaims })).toHaveCount(0)
    await expect(page.getByRole('link', { name: unsupportedClaims })).toHaveCount(0)
  })

  test('renders Console transport states and retries only the failed endpoint', async () => {
    const statePage = await context.newPage()
    const requestCounts = new Map<string, number>()
    let allowPagesCountSuccess = false
    const mockedBodies: Record<string, unknown> = {
      [consoleEndpoints.leadsCount]: { totalDocs: 3 },
      [consoleEndpoints.mediaCount]: { totalDocs: 8 },
      [consoleEndpoints.me]: { user: { role: 'super-admin' } },
      [consoleEndpoints.pageDrafts]: { totalDocs: 0 },
      [consoleEndpoints.postDrafts]: { totalDocs: 2 },
      [consoleEndpoints.postsCount]: { totalDocs: 12 },
      [consoleEndpoints.recentPages]: {
        docs: [
          {
            id: 'retained-page',
            title: 'Retained successful panel',
            updatedAt: '2026-08-05T01:00:00.000Z',
          },
        ],
      },
      [consoleEndpoints.sites]: { docs: [] },
    }

    try {
      await statePage.route('**/api/**', async (route) => {
        const endpoint = getDecodedEndpoint(route.request().url())

        if (!Object.prototype.hasOwnProperty.call(mockedBodies, endpoint)) {
          if (endpoint === consoleEndpoints.pagesCount) {
            requestCounts.set(endpoint, (requestCounts.get(endpoint) ?? 0) + 1)
            await route.fulfill({
              contentType: 'application/json',
              body: JSON.stringify(allowPagesCountSuccess ? { totalDocs: 7 } : {}),
              status: allowPagesCountSuccess ? 200 : 500,
            })
            return
          }

          if (endpoint === consoleEndpoints.recentLeads) {
            requestCounts.set(endpoint, (requestCounts.get(endpoint) ?? 0) + 1)
            await route.fulfill({
              contentType: 'application/json',
              body: JSON.stringify({}),
              status: 403,
            })
            return
          }

          await route.continue()
          return
        }

        requestCounts.set(endpoint, (requestCounts.get(endpoint) ?? 0) + 1)
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(mockedBodies[endpoint]),
          status: 200,
        })
      })

      await statePage.goto(`${e2eBaseURL}/admin/console`)
      await expect(statePage.getByText('Chưa có site được gán.')).toBeVisible()
      await expect(statePage.getByText('Không có quyền xem lead gần đây.')).toBeVisible()
      await expect(statePage.getByText('Retained successful panel')).toBeVisible()

      const pagesMetric = statePage.locator('article').filter({
        has: statePage.getByRole('link', { name: 'Trang', exact: true }),
      })
      const postsMetric = statePage.locator('article').filter({
        has: statePage.getByRole('link', { name: 'Bài viết', exact: true }),
      })
      await expect(pagesMetric.getByText('Không thể tải dữ liệu.')).toBeVisible()
      await expect(postsMetric.getByText('12', { exact: true })).toBeVisible()

      const countsBeforeRetry = new Map(requestCounts)
      allowPagesCountSuccess = true
      await pagesMetric.getByRole('button', { name: 'Tải lại Trang' }).click()

      await expect(pagesMetric.getByText('7', { exact: true })).toBeVisible()
      await expect(postsMetric.getByText('12', { exact: true })).toBeVisible()
      await expect(statePage.getByText('Retained successful panel')).toBeVisible()
      expect(requestCounts.get(consoleEndpoints.pagesCount)).toBe(
        (countsBeforeRetry.get(consoleEndpoints.pagesCount) ?? 0) + 1,
      )

      for (const [endpoint, count] of countsBeforeRetry) {
        if (endpoint !== consoleEndpoints.pagesCount) {
          expect(requestCounts.get(endpoint)).toBe(count)
        }
      }
    } finally {
      await statePage.close()
    }
  })

  test('can review theme manager without leaking preset ids', async () => {
    await page.goto(`${e2eBaseURL}/admin/theme`)
    await expect(page.getByRole('heading', { name: 'Theme Manager' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Site context' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Colors' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Typography, shape & layout' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Hero presentation' })).toBeVisible()
    await expect(page.locator('.theme-manager__hero-preview')).toBeVisible()
    await expect
      .poll(async () => page.locator('.theme-manager__preset-card').count())
      .toBeGreaterThanOrEqual(heroPresentationDefinitions.length)
    await expect(page.locator('.theme-manager__usage-grid')).toContainText('Page kế thừa hero site')
    await expect(page.locator('.theme-manager__requirement-list')).toBeVisible()
    await expect(page.locator('.theme-manager__preview-head strong')).not.toHaveText(/^\d+$/)
    await expect(page.getByLabel('Brand color picker')).toBeVisible()
    await expect(page.getByText(/Preview (live|chưa lưu)/)).toBeVisible()
  })

  test('can preview and pick colors while creating a theme preset', async () => {
    test.setTimeout(90_000)

    await page.goto(`${e2eBaseURL}/admin/collections/theme-presets/create`)

    await expect(
      page.getByRole('heading', { name: /\[Untitled\]|\[Chưa có tiêu đề\]/ }),
    ).toBeVisible()
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

  test('can preview a hero presentation preset while creating it', async () => {
    test.setTimeout(90_000)

    await page.goto(`${e2eBaseURL}/admin/collections/hero-presentation-presets/create`)

    await expect(
      page.getByRole('heading', { name: /\[Untitled\]|\[Chưa có tiêu đề\]/ }),
    ).toBeVisible()
    await expect(page.getByText('Preview hero preset')).toBeVisible()
    await expect(page.locator('.hero-presentation-preset-preview')).toBeVisible()

    await page.getByLabel('Tên presentation', { exact: false }).fill('Carousel Audit Preview')
    await page.getByLabel('Mã hệ thống', { exact: false }).fill('carousel-audit-preview')
    await page.locator('#field-baseTemplate').getByRole('combobox').click()
    await page.getByRole('option', { name: 'Cinematic carousel' }).click()

    await expect(page.locator('.hero-presentation-preset-preview')).toContainText(
      'Carousel Audit Preview',
    )
    await expect(page.locator('.hero-presentation-preset-preview__visual')).toContainText('Slide 1')
    await expect(page.locator('.hero-presentation-preset-preview__meta').nth(1)).toContainText(
      'Autoplay',
    )
  })

  test('can create a draft page from a governed layout preset', async () => {
    test.setTimeout(90_000)

    const uniqueSlug = `campaign-launch-e2e-${Date.now()}`

    await page.goto(`${e2eBaseURL}/admin/page-wizard`)
    await expect(page.getByRole('heading', { name: 'Tạo trang nhanh' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: /locale|ngôn ngữ/i })).toHaveCount(0)
    // The preset buttons are present in SSR markup. Waiting for the async site
    // list proves the client has hydrated before exercising React state.
    await expect(page.getByRole('combobox', { name: 'Site' })).not.toHaveValue('')
    const campaignPreset = page.getByRole('button', { name: /Campaign launch/ })
    await campaignPreset.click()
    await expect(campaignPreset).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.page-wizard__preset-summary').getByText('Hero mesh')).toBeVisible()
    await page.getByRole('button', { name: 'Tiếp tục' }).click()

    await page.getByPlaceholder('Ví dụ: Tour Nhật Bản mùa thu').fill('Campaign Launch E2E')
    await page.getByPlaceholder('tour-nhat-ban-mua-thu').fill(uniqueSlug)
    await page
      .getByPlaceholder('Viết 1-2 câu giúp người đọc hiểu trang này dùng để làm gì.')
      .fill('Draft created from the campaign launch layout preset.')
    await page.getByRole('button', { name: 'Kiểm tra' }).click()
    await expect(page.getByText('Campaign launch', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Hero mesh • Bento benefits • Stats • Social proof • Form • CTA'),
    ).toBeVisible()
    const createRequestPromise = page.waitForRequest(
      (request) =>
        request.method() === 'POST' && new URL(request.url()).pathname === '/api/page-wizard',
    )
    await page.getByRole('button', { name: 'Tạo trang nháp' }).click()
    const createRequest = await createRequestPromise
    const createBody = createRequest.postDataJSON() as Record<string, unknown>
    expect(createBody).not.toHaveProperty('locale')

    await page.waitForURL(/\/admin\/collections\/pages\/[a-zA-Z0-9-_]+/, { timeout: 30_000 })
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
    expect(createdPage._status).toBe('draft')
    expect(createdPage.title).toBe('Campaign Launch E2E')
    expect(createdPage.layout.map((block: { blockType: string }) => block.blockType)).toEqual(
      expect.arrayContaining(['featureGrid', 'stats', 'testimonial', 'formBlock', 'cta']),
    )
  })

  test('keeps Site Review read-only without unsupported workflow controls', async () => {
    await page.goto(`${e2eBaseURL}/admin/site-review`)
    await expect(page.getByRole('heading', { level: 1, name: 'Site review' })).toBeVisible()
    await expect(
      page.getByText(/chỉ gồm site, page và post mà tài khoản hiện tại được quyền đọc/i),
    ).toBeVisible()

    const unsupportedControl =
      /approve|approval|duyệt|comment|bình luận|assign|phân công|diff|so sánh|publish|xuất bản|rollback|khôi phục/i
    await expect(page.getByRole('button', { name: unsupportedControl })).toHaveCount(0)
    await expect(page.getByRole('link', { name: unsupportedControl })).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('all US-059 operational routes resolve to real Payload surfaces', async () => {
    test.setTimeout(240_000)

    expect(operationalRoutes).toHaveLength(24)
    const routes = ['/admin', '/admin/console', ...operationalRoutes]
    expect(new Set(routes).size).toBe(26)

    const routePage = await context.newPage()
    const pageErrors: string[] = []
    routePage.on('pageerror', (error) => pageErrors.push(error.message))

    try {
      for (const route of routes) {
        const response = await routePage.goto(`${e2eBaseURL}${route}`, {
          waitUntil: 'domcontentloaded',
        })

        expect(response?.status(), route).toBeLessThan(400)
        expect(new URL(routePage.url()).pathname, route).toBe(route)
        await expect(routePage.getByRole('heading', { level: 1 }).first(), route).toBeVisible({
          timeout: 30_000,
        })
        await expect(routePage.locator('body'), route).not.toContainText(
          /Application error|Unhandled Runtime Error|Internal Server Error|Something went wrong/i,
        )
      }

      expect(pageErrors).toEqual([])
    } finally {
      await routePage.close()
    }
  })

  test('Console skip link moves focus to main and keyboard focus is visible', async () => {
    await page.goto(`${e2eBaseURL}/admin/console`)

    const skipLink = page.getByRole('link', { name: 'Bỏ qua đến nội dung Console' })
    await skipLink.focus()
    await expect(skipLink).toBeFocused()
    expect(
      await skipLink.evaluate((element) => {
        const style = window.getComputedStyle(element)
        return style.outlineStyle !== 'none' || style.boxShadow !== 'none'
      }),
    ).toBe(true)

    await page.keyboard.press('Enter')
    await expect(page.locator('#cms-console-main')).toBeFocused()

    const primaryAction = page.getByRole('link', { name: 'Tạo trang nháp', exact: true }).first()
    await primaryAction.focus()
    await expect(primaryAction).toBeFocused()
    expect(
      await primaryAction.evaluate((element) => {
        const style = window.getComputedStyle(element)
        return style.outlineStyle !== 'none' || style.boxShadow !== 'none'
      }),
    ).toBe(true)

    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('admin surfaces do not overflow and preserve responsive triage navigation', async () => {
    test.setTimeout(300_000)

    for (const width of responsiveWidths) {
      await page.setViewportSize({ height: 900, width })

      for (const route of ['/admin', '/admin/console'] as const) {
        await page.goto(`${e2eBaseURL}${route}`)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
        await assertNoHorizontalOverflow(page)
      }

      await page.goto(`${e2eBaseURL}/admin`)
      const triageLinks = page.locator('.wings-admin-nav-intro__links > a')

      if (tabletWidths.has(width)) {
        await expect(triageLinks).toHaveCount(3)

        for (const link of await triageLinks.all()) {
          await expect(link.locator('span').last()).toBeVisible()
          const box = await link.boundingBox()
          expect(box?.height).toBeGreaterThanOrEqual(44)
          expect(box?.width).toBeGreaterThanOrEqual(44)
        }
      }

      if (mobileWidths.has(width)) {
        await expect(triageLinks).toHaveCount(3)
        const hrefs = await triageLinks.evaluateAll((links) =>
          links.map((link) => link.getAttribute('href')),
        )
        const labels = await triageLinks.evaluateAll((links) =>
          links.map((link) => link.getAttribute('aria-label')),
        )
        expect(hrefs).toEqual(triageRoutes)
        expect(labels).toEqual(['Console vận hành', 'Rà soát site', 'Lead gửi về'])
      }
    }
  })

  test('can navigate to list view', async () => {
    await page.goto(`${e2eBaseURL}/admin/collections/users`)
    await expect(page).toHaveURL(`${e2eBaseURL}/admin/collections/users`)
    const listViewArtifact = page
      .getByRole('heading', { level: 1, name: /Users|Người dùng/ })
      .first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto(`${e2eBaseURL}/admin/collections/pages/create`)
    await expect(page).toHaveURL(/\/admin\/collections\/pages\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="title"]')
    await expect(editViewArtifact).toBeVisible()
  })

  test('can switch a governed page hero between override and inherited presentation', async () => {
    test.setTimeout(90_000)

    await page.goto(
      `${e2eBaseURL}/admin/collections/pages/${heroPresentationFixtureIDs['centered-visual']}`,
    )

    const heroGuide = page.locator('.hero-presentation-guide')
    await expect(heroGuide.getByText('Preview cấu trúc hero')).toBeVisible()
    await expect(heroGuide.getByText('Nguồn áp dụng: page')).toBeVisible()
    await expect(heroGuide.getByText('Business behavior:')).toBeVisible()
    await expect(page.locator('#field-hero__media').getByText('Ảnh hero chính')).toBeVisible()
    await page.locator('#field-hero__presentationMode').getByRole('combobox').click()
    await page.getByRole('option', { name: 'Kế thừa từ site' }).click()
    await expect(heroGuide.getByText(/Nguồn áp dụng: (site|site chưa resolve)/)).toBeVisible()
    await expect(heroGuide.getByText(/Page có thể/)).toBeVisible()
  })

  test('site manager can read only assigned site settings through authenticated API', async ({
    request,
  }) => {
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

    try {
      await login({ page: editorPage, user: scopedUsers.editor })
      await editorPage.goto(`${e2eBaseURL}/admin/console`)

      await expect(editorPage.getByRole('heading', { name: 'Console vận hành' })).toBeVisible()
      await expect(editorPage.getByRole('link', { name: 'Tạo trang nhanh' })).toBeVisible()
      await expect(editorPage.getByRole('link', { name: 'Nhập dữ liệu' })).toHaveCount(0)
      await expect(editorPage.getByRole('link', { name: 'Xuất dữ liệu' })).toHaveCount(0)
      await expect(editorPage.getByRole('link', { name: 'Quản lý theme' })).toHaveCount(0)
      await expect(editorPage.getByRole('heading', { name: 'Nâng cao' })).toHaveCount(0)
    } finally {
      await context.close()
    }
  })

  test('site manager sees assigned scope and permitted shortcuts', async ({ browser }) => {
    const context = await browser.newContext()
    const managerPage = await context.newPage()

    try {
      await login({ page: managerPage, user: scopedUsers.siteManager })
      await managerPage.goto(`${e2eBaseURL}/admin/console`)
      await expect(managerPage.getByRole('heading', { name: 'Console vận hành' })).toBeVisible()
      const assignedSites = managerPage.locator('.cms-console__site-list')
      await expect(assignedSites.getByText('WingsGo', { exact: true })).toBeVisible()
      await expect(assignedSites.getByText('WingsCare', { exact: true })).toHaveCount(0)
      await expect(managerPage.getByRole('link', { name: 'Nhập dữ liệu' }).first()).toBeVisible()
      await expect(managerPage.getByRole('link', { name: 'Xuất dữ liệu' }).first()).toBeVisible()
      await expect(managerPage.getByRole('link', { name: 'Quản lý theme' })).toBeVisible()
      await expect(managerPage.getByRole('heading', { name: 'Nâng cao' })).toHaveCount(0)

      await managerPage.goto(`${e2eBaseURL}/admin/collections/form-submissions`)
      await expect(managerPage.getByText('Lead sẽ tự xuất hiện')).toBeVisible()
    } finally {
      await context.close()
    }
  })
})
