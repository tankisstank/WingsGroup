import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.env.PREVIEW_BASE_URL || 'http://localhost:3000'
const outDir = path.resolve(process.cwd(), '..', 'output', 'ui-preview-2026-06-17')
const statePath = path.join(outDir, 'preview-results.partial.json')

const modes = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
]

const sites = [
  {
    key: 'wingsgroup',
    label: 'wingsgroup.vn',
    host: 'wingsgroup.vn',
    pathPrefix: '',
    siteId: 1,
    note: 'Current local hostname resolution renders the WingsGroup umbrella site for wingsgroup.vn.',
  },
  { key: 'wingsgo', label: 'wingsgo.vn', host: 'wingsgo.vn', pathPrefix: '/wingsgo', siteId: 2 },
  { key: 'wingsside', label: 'wingside.vn', host: 'wingside.vn', pathPrefix: '/wingsside', siteId: 3 },
]

const extraPublicRoutes = {
  wingsgroup: [
    { title: 'Posts index', pathname: '/posts', source: 'app-route' },
    { title: 'Search', pathname: '/search', source: 'app-route' },
  ],
  wingsgo: [
    { title: 'Posts index', pathname: '/posts', source: 'app-route' },
    { title: 'Search', pathname: '/search', source: 'app-route' },
  ],
  wingsside: [
    { title: 'Posts index', pathname: '/posts', source: 'app-route' },
    { title: 'Search', pathname: '/search', source: 'app-route' },
  ],
}

const cmsRoutes = [
  { title: 'CMS dashboard', pathname: '/admin', source: 'cms' },
  { title: 'Console vận hành', pathname: '/admin/console', source: 'cms' },
  { title: 'Rà soát site/page', pathname: '/admin/site-review', source: 'cms' },
  { title: 'Tạo trang nhanh', pathname: '/admin/page-wizard', source: 'cms' },
  { title: 'Theme Manager', pathname: '/admin/theme', source: 'cms' },
]

const ignoredPublicPath = (doc) => doc.pathname?.startsWith('/hero-')

const slugify = (value) =>
  value
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'home'

const fetchJSON = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${response.status()} ${response.statusText}: ${url}`)
  }
  return response.json()
}

async function loadPages() {
  const data = await fetchJSON(`${baseURL}/api/pages?limit=200&depth=0`)
  const docs = data.docs || []

  return sites.map((site) => {
    const pageDocs = docs
      .filter((doc) => doc.site === site.siteId && doc._status === 'published')
      .filter((doc) => !ignoredPublicPath(doc))
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        pathname: doc.pathname || '/',
        source: 'payload-pages',
      }))
      .sort((a, b) => a.pathname.localeCompare(b.pathname))

    const seen = new Set(pageDocs.map((doc) => doc.pathname))
    for (const route of extraPublicRoutes[site.key] || []) {
      if (!seen.has(route.pathname)) pageDocs.push(route)
    }

    return { ...site, pages: pageDocs }
  })
}

async function loginCMS(page) {
  const users = [
    { email: 'local-admin@wingsgroup.test', password: 'test' },
    { email: 'dev@payloadcms.com', password: 'test' },
    { email: 'dev@payloadcms.com', password: 'password' },
  ]

  for (const user of users) {
    await page.goto(`${baseURL}/admin/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#field-email').fill(user.email)
    await page.locator('#field-password').fill(user.password)
    await page.locator('button[type="submit"]').click()
    try {
      await page.waitForURL(/\/admin(?:\/)?$/, { timeout: 8000 })
      return user.email
    } catch {
      // Try the next known local credential.
    }
  }

  throw new Error('Unable to login to CMS with known local credentials.')
}

async function inspectPage(page, target, screenshotPath) {
  const consoleErrors = []
  const pageErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const routePath = `${target.pathPrefix || ''}${target.pathname === '/' ? '' : target.pathname}` || '/'
  const response = await page.goto(`${baseURL}${routePath}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })

  await page.waitForTimeout(1200)

  await page.screenshot({ fullPage: false, path: screenshotPath })

  const metrics = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'))
    const buttons = Array.from(document.querySelectorAll('button'))
    const visible = (el) => {
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }
    const textOf = (el) => el.textContent?.replace(/\s+/g, ' ').trim()
    const inFirstViewport = (el) => el.getBoundingClientRect().top < window.innerHeight
    const isChromeCTA = (el) =>
      Boolean(el.closest('header, nav, [aria-label="Primary navigation"], [aria-label="Mobile primary navigation"]'))
    const firstViewportAnchors = anchors.filter(visible).filter(inFirstViewport)

    return {
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      bodyTheme: document.body.getAttribute('data-site-theme') || '',
      bodyPreset: document.body.getAttribute('data-site-preset') || '',
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      visibleLinkCount: anchors.filter(visible).length,
      visibleButtonCount: buttons.filter(visible).length,
      primaryNavVisible: Boolean(document.querySelector('nav[aria-label="Primary navigation"]')),
      firstViewportCTA: firstViewportAnchors
        .map(textOf)
        .filter(Boolean)
        .slice(0, 8),
      firstViewportContentCTA: firstViewportAnchors
        .filter((anchor) => !isChromeCTA(anchor))
        .map(textOf)
        .filter(Boolean)
        .slice(0, 8),
    }
  })

  return {
    ...target,
    routePath,
    url: `${baseURL}${routePath}`,
    status: response?.status() || null,
    ok: response?.ok() || false,
    screenshot: path.relative(path.resolve(process.cwd(), '..'), screenshotPath).replaceAll('\\', '/'),
    consoleErrors,
    pageErrors,
    ...metrics,
  }
}

function pagePurpose(siteKey, pathname) {
  if (siteKey === 'cms') {
    if (pathname === '/admin') return 'Dashboard định hướng thao tác CMS.'
    if (pathname === '/admin/console') return 'Console vận hành cho operator.'
    if (pathname === '/admin/site-review') return 'Rà soát site/page bằng preview trong CMS.'
    if (pathname === '/admin/page-wizard') return 'Tạo page nhanh theo preset được quản trị.'
    if (pathname === '/admin/theme') return 'Quản lý theme multisite.'
    return 'Màn hình quản trị CMS.'
  }

  if (pathname === '/') return 'Homepage định vị brand và điều hướng nhu cầu chính.'
  if (/contact|lien-he/.test(pathname)) return 'Lead/contact conversion.'
  if (/campaign/.test(pathname)) return 'Landing/campaign conversion.'
  if (/tour|thi-truong|lich-khoi-hanh/.test(pathname)) return 'Khám phá và chọn tour outbound.'
  if (/destinations|packages|styles|plan-your-trip/.test(pathname)) return 'Khám phá inbound và gửi inquiry.'
  if (/policy|chinh-sach|dieu-khoan|tin-cay/.test(pathname)) return 'Trust/legal reassurance.'
  if (/posts|tin-tuc|travel-guide|search/.test(pathname)) return 'Editorial/discovery.'
  if (/about|gioi-thieu|ve-/.test(pathname)) return 'Brand trust and capability.'
  return 'Public content page.'
}

function recommendationFor(result, siteKey) {
  const notes = []
  if (!result.ok) notes.push(`Fix response status ${result.status}.`)
  if (result.overflowX) notes.push(`Remove horizontal overflow (${result.scrollWidth}px > ${result.clientWidth}px).`)
  if (!result.h1) notes.push('Add or expose one clear H1 for scanning and SEO.')
  if ((result.consoleErrors || []).length) notes.push(`Investigate ${result.consoleErrors.length} browser console error(s).`)
  if (result.source !== 'cms' && !result.primaryNavVisible) notes.push('Ensure primary navigation is visible/accessible.')
  if (result.source !== 'cms' && /contact|lien-he|campaign|tour|plan-your-trip/.test(result.pathname) && (result.firstViewportContentCTA || []).length < 2) {
    notes.push('Strengthen first-viewport CTA visibility for conversion intent.')
  }
  if (siteKey === 'wingsgroup' && result.pathname === '/') {
    notes.push('Decide whether wingsgroup.vn should remain WingsGroup umbrella or receive separate WingsGroup branding/content.')
  }
  return notes.length ? notes.join(' ') : 'No blocking UI issue detected in automated pass; review screenshot for visual polish.'
}

function buildMarkdown({ generatedAt, publicResults, cmsResults, pagesBySite, loginUser }) {
  const lines = []
  lines.push('# WingsGroup UI Preview Report')
  lines.push('')
  lines.push(`Generated: ${generatedAt}`)
  lines.push(`Base URL: ${baseURL}`)
  lines.push(`CMS login used: ${loginUser}`)
  lines.push('')
  lines.push('## Scope')
  lines.push('')
  lines.push('- Previewed `wingsgroup.vn`, `wingsgo.vn`, `wingside.vn` on the local Next/Payload server. Public screenshots use the repo-approved local path-prefix model: `/`, `/wingsgo`, and `/wingsside`.')
  lines.push('- Previewed each selected public page in desktop `1440x1000` and mobile `390x844`.')
  lines.push('- Previewed CMS dashboard, operator console, site review, page wizard, and theme manager in desktop/mobile.')
  lines.push('- Excluded published `/hero-*` presentation test pages from wingsgroup/WingsGroup because they are component demo pages, not production navigation pages.')
  lines.push('')

  for (const site of pagesBySite) {
    lines.push(`## ${site.label}`)
    lines.push('')
    if (site.note) lines.push(`Note: ${site.note}`)
    lines.push('')
    lines.push('| Page | Purpose | Desktop | Mobile | Key recommendation |')
    lines.push('| --- | --- | --- | --- | --- |')
    for (const page of site.pages) {
      const desktop = publicResults.find((item) => item.siteKey === site.key && item.pathname === page.pathname && item.mode === 'desktop')
      const mobile = publicResults.find((item) => item.siteKey === site.key && item.pathname === page.pathname && item.mode === 'mobile')
      const rec = recommendationFor(mobile || desktop || page, site.key)
      lines.push(
        `| ${page.title}<br>\`${page.pathname}\` | ${pagePurpose(site.key, page.pathname)} | ${desktop?.ok ? 'OK' : 'Check'} ${desktop?.overflowX ? 'overflow' : ''}<br>[shot](${desktop?.screenshot || ''}) | ${mobile?.ok ? 'OK' : 'Check'} ${mobile?.overflowX ? 'overflow' : ''}<br>[shot](${mobile?.screenshot || ''}) | ${rec} |`,
      )
    }
    lines.push('')
  }

  lines.push('## CMS Console')
  lines.push('')
  lines.push('| Page | Purpose | Desktop | Mobile | Key recommendation |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const route of cmsRoutes) {
    const desktop = cmsResults.find((item) => item.pathname === route.pathname && item.mode === 'desktop')
    const mobile = cmsResults.find((item) => item.pathname === route.pathname && item.mode === 'mobile')
    const rec = recommendationFor(mobile || desktop || route, 'cms')
    lines.push(
      `| ${route.title}<br>\`${route.pathname}\` | ${pagePurpose('cms', route.pathname)} | ${desktop?.ok ? 'OK' : 'Check'} ${desktop?.overflowX ? 'overflow' : ''}<br>[shot](${desktop?.screenshot || ''}) | ${mobile?.ok ? 'OK' : 'Check'} ${mobile?.overflowX ? 'overflow' : ''}<br>[shot](${mobile?.screenshot || ''}) | ${rec} |`,
    )
  }
  lines.push('')

  const issues = [...publicResults, ...cmsResults].filter((item) => !item.ok || item.overflowX || item.consoleErrors.length || item.pageErrors.length)
  lines.push('## Automated Findings')
  lines.push('')
  if (!issues.length) {
    lines.push('No response, horizontal overflow, browser console, or page runtime blockers detected in the automated pass.')
  } else {
    for (const issue of issues) {
      lines.push(`- ${issue.siteKey || 'cms'} ${issue.mode} \`${issue.pathname}\`: status ${issue.status}, overflowX=${issue.overflowX}, consoleErrors=${issue.consoleErrors.length}, pageErrors=${issue.pageErrors.length}.`)
    }
  }
  lines.push('')

  lines.push('## Next UI/UX Optimization Priorities')
  lines.push('')
  lines.push('1. Clarify `wingsgroup.vn`: currently it renders the WingsGroup umbrella experience. If WingsGroup is a distinct corporate brand, create separate site settings/page content before visual optimization.')
  lines.push('2. For WingsGo conversion pages, prioritize first-screen CTA hierarchy, price/schedule scan density, and tour comparison affordances.')
  lines.push('3. For WingsSide pages, prioritize inquiry path clarity, destination/package cross-links, and stronger trust proof above long editorial sections.')
  lines.push('4. For CMS, tune mobile only for emergency/quick edits; desktop should remain the primary operator workflow.')
  lines.push('')

  return `${lines.join('\n')}\n`
}

async function main() {
  await fs.mkdir(outDir, { recursive: true })
  console.log(`Loading Payload pages from ${baseURL}`)

  const pagesBySite = await loadPages()
  console.log(`Loaded ${pagesBySite.reduce((sum, site) => sum + site.pages.length, 0)} public pages`)
  const browser = await chromium.launch({ headless: true })

  const publicResults = []
  for (const site of pagesBySite) {
    for (const mode of modes) {
      console.log(`Preview ${site.label} ${mode.name}`)
      const context = await browser.newContext({
        viewport: { width: mode.width, height: mode.height },
        isMobile: Boolean(mode.isMobile),
      })

      for (const pageInfo of site.pages) {
        const page = await context.newPage()
        const screenshotPath = path.join(outDir, site.key, mode.name, `${slugify(pageInfo.pathname)}.png`)
        await fs.mkdir(path.dirname(screenshotPath), { recursive: true })
        try {
          const result = await inspectPage(page, { ...pageInfo, pathPrefix: site.pathPrefix }, screenshotPath)
          publicResults.push({ ...result, siteKey: site.key, siteLabel: site.label, mode: mode.name, host: site.host })
          console.log(`  ok ${mode.name} ${site.key} ${pageInfo.pathname}`)
        } catch (error) {
          publicResults.push({
            ...pageInfo,
            siteKey: site.key,
            siteLabel: site.label,
            mode: mode.name,
            host: site.host,
            ok: false,
            status: null,
            overflowX: false,
            consoleErrors: [],
            pageErrors: [error instanceof Error ? error.message : String(error)],
            screenshot: '',
          })
          console.log(`  fail ${mode.name} ${site.key} ${pageInfo.pathname}: ${error instanceof Error ? error.message : String(error)}`)
        }
        await fs.writeFile(statePath, JSON.stringify({ pagesBySite, publicResults, cmsResults: [] }, null, 2))
        await page.close()
      }
      await context.close()
    }
  }

  const cmsResults = []
  let loginUser = 'not logged in'
  for (const mode of modes) {
    console.log(`Preview CMS ${mode.name}`)
    const context = await browser.newContext({
      viewport: { width: mode.width, height: mode.height },
      isMobile: Boolean(mode.isMobile),
    })
    const loginPage = await context.newPage()
    loginUser = await loginCMS(loginPage)
    await loginPage.close()

    for (const route of cmsRoutes) {
      const page = await context.newPage()
      const screenshotPath = path.join(outDir, 'cms', mode.name, `${slugify(route.pathname)}.png`)
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true })
      try {
        const result = await inspectPage(page, route, screenshotPath)
        cmsResults.push({ ...result, siteKey: 'cms', siteLabel: 'CMS', mode: mode.name })
        console.log(`  ok ${mode.name} cms ${route.pathname}`)
      } catch (error) {
        cmsResults.push({
          ...route,
          siteKey: 'cms',
          siteLabel: 'CMS',
          mode: mode.name,
          ok: false,
          status: null,
          overflowX: false,
          consoleErrors: [],
          pageErrors: [error instanceof Error ? error.message : String(error)],
          screenshot: '',
        })
        console.log(`  fail ${mode.name} cms ${route.pathname}: ${error instanceof Error ? error.message : String(error)}`)
      }
      await fs.writeFile(statePath, JSON.stringify({ pagesBySite, publicResults, cmsResults, loginUser }, null, 2))
      await page.close()
    }
    await context.close()
  }

  await browser.close()

  const generatedAt = new Date().toISOString()
  const payload = { generatedAt, baseURL, pagesBySite, publicResults, cmsResults, loginUser }
  await fs.writeFile(path.join(outDir, 'preview-results.json'), JSON.stringify(payload, null, 2))
  await fs.writeFile(path.join(outDir, 'preview-report.md'), buildMarkdown(payload))

  console.log(`Wrote ${path.join(outDir, 'preview-report.md')}`)
  console.log(`Screenshots: ${outDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
