import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const args = new Map()
for (let index = 2; index < process.argv.length; index += 1) {
  const token = process.argv[index]
  if (!token.startsWith('--')) continue
  const [key, inlineValue] = token.slice(2).split('=')
  const nextValue = process.argv[index + 1]
  const value = inlineValue ?? (nextValue && !nextValue.startsWith('--') ? nextValue : 'true')
  if (inlineValue === undefined && nextValue && !nextValue.startsWith('--')) index += 1
  args.set(key, value)
}

const baseURL = args.get('base-url') || process.env.GO_LIVE_BASE_URL || process.env.PREVIEW_BASE_URL || 'http://localhost:3000'
const selectedSite = args.get('site') || process.env.GO_LIVE_SITE || ''
const selectedPath = args.get('path') || process.env.GO_LIVE_PATH || ''
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const outDir = path.resolve(
  process.cwd(),
  args.get('out') || process.env.GO_LIVE_OUT_DIR || path.join('..', 'output', 'go-live-review', timestamp),
)

const modes = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
]

const sites = [
  { key: 'wingsgroup', label: 'WingsGroup', pathPrefix: '', siteIds: [1] },
  { key: 'wingsgo', label: 'WingsGo', pathPrefix: '/wingsgo', siteIds: [2] },
  { key: 'wingsside', label: 'WingsSide', pathPrefix: '/wingsside', siteIds: [3] },
  { key: 'wingsplus', label: 'WingsPlus', pathPrefix: '/wingsplus', siteIds: [4] },
  { key: 'wingscare', label: 'WingsCare', pathPrefix: '/wingscare', siteIds: [5] },
  { key: 'wingspass', label: 'WingsPass', pathPrefix: '/wingspass', siteIds: [6] },
]

const extraRoutes = [
  { title: 'Posts index', pathname: '/posts', type: 'system' },
  { title: 'Search', pathname: '/search', type: 'system' },
]

const slugify = (value) =>
  value
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'home'

const normalizePath = (value) => {
  if (!value || value === '/') return '/'
  return `/${value}`.replace(/\/+/g, '/').replace(/\/$/, '')
}

const joinRoute = (prefix, pathname) => {
  const nextPrefix = normalizePath(prefix || '/')
  const nextPath = normalizePath(pathname)

  if (nextPrefix === '/') return nextPath
  return `${nextPrefix}${nextPath === '/' ? '' : nextPath}`.replace(/\/+/g, '/')
}

const relationId = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value.id ?? null
  return value
}

const localizedText = (value, fallback = '') => {
  if (typeof value === 'string') return value.trim() || fallback
  if (value && typeof value === 'object') {
    for (const key of ['vi', 'en']) {
      if (typeof value[key] === 'string' && value[key].trim()) return value[key].trim()
    }
  }
  return fallback
}

const fetchJSON = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return response.json()
}

const classifyPurpose = (pathname, title = '') => {
  const haystack = `${pathname} ${title}`.toLowerCase()
  if (/campaign|landing|khuyen-mai|he-2026/.test(haystack)) return 'campaign'
  if (/tour|lich-khoi-hanh|thi-truong|packages|destinations|styles|plan-your-trip/.test(haystack)) return 'travel-product'
  if (/contact|lien-he|tu-van/.test(haystack)) return 'lead-contact'
  if (/policy|chinh-sach|dieu-khoan|tin-cay|legal|testimonials/.test(haystack)) return 'trust'
  if (/posts|tin-tuc|guide|search|travel-guide/.test(haystack)) return 'editorial'
  if (/about|gioi-thieu|ve-/.test(haystack)) return 'brand-trust'
  return pathname === '/' ? 'homepage' : 'content'
}

const expectedContent = {
  campaign: {
    requiredSignals: [
      { key: 'primary CTA', pattern: /(tư vấn|tu van|liên hệ|lien he|đăng ký|dang ky|giữ chỗ|giu cho|nhận báo giá|nhan bao gia|book|inquiry|contact)/i },
      { key: 'offer or destination', pattern: /(tour|hàn quốc|han quoc|nhật bản|nhat ban|trung quốc|trung quoc|vietnam|package|campaign|hè|he 2026)/i },
      { key: 'trust or support signal', pattern: /(hotline|zalo|email|[\w.+-]+@[\w.-]+|\+?\d[\d\s().-]{7,}|uy tín|uy tin|cam kết|cam ket|hỗ trợ|ho tro|testimonial|review|giấy phép|giay phep)/i },
    ],
  },
  'travel-product': {
    requiredSignals: [
      { key: 'destination or itinerary', pattern: /(lịch trình|lich trinh|điểm đến|diem den|tour|package|destination|khởi hành|khoi hanh)/i },
      { key: 'conversion CTA', pattern: /(tư vấn|tu van|liên hệ|lien he|đặt tour|dat tour|inquiry|contact|book)/i },
      { key: 'price or inquiry path', pattern: /(giá|gia|price|báo giá|bao gia|hotline|zalo|liên hệ|lien he)/i },
    ],
  },
  'lead-contact': {
    requiredSignals: [
      { key: 'contact method', pattern: /(hotline|phone|điện thoại|dien thoai|email|zalo|address|địa chỉ|dia chi)/i },
      { key: 'lead action', pattern: /(gửi|gui|liên hệ|lien he|tư vấn|tu van|submit|send|contact)/i },
    ],
  },
  homepage: {
    requiredSignals: [
      { key: 'brand proposition', pattern: /(wings|travel|du lịch|du lich|dịch vụ|dich vu|tour|ecosystem|inbound|outbound)/i },
      { key: 'primary navigation or CTA', pattern: /(tìm hiểu|tim hieu|xem|khám phá|kham pha|liên hệ|lien he|contact|discover)/i },
    ],
  },
  trust: {
    requiredSignals: [
      { key: 'policy or reassurance language', pattern: /(chính sách|chinh sach|điều khoản|dieu khoan|bảo mật|bao mat|cam kết|cam ket|tin cậy|tin cay|legal|privacy)/i },
    ],
  },
}

const statusRank = {
  pass: 0,
  pass_with_notes: 1,
  needs_fix: 2,
  blocked: 3,
}

const worstStatus = (...statuses) =>
  statuses.reduce((worst, status) => (statusRank[status] > statusRank[worst] ? status : worst), 'pass')

async function loadInventory() {
  const pagesData = await fetchJSON(`${baseURL}/api/pages?limit=1000&depth=1`)
  const pages = pagesData.docs || []

  return sites
    .filter((site) => !selectedSite || site.key === selectedSite)
    .map((site) => {
      const docs = pages
        .filter((doc) => site.siteIds.includes(Number(relationId(doc.site))))
        .filter((doc) => !doc._status || doc._status === 'published')
        .filter((doc) => !(doc.pathname || '').startsWith('/hero-'))
        .map((doc) => {
          const pathname = normalizePath(doc.pathname || doc.slug || '/')
          const title = localizedText(doc.title, localizedText(doc.meta?.title, `Page ${doc.id}`))
          return {
            id: doc.id,
            title,
            pathname,
            routePath: joinRoute(site.pathPrefix, pathname),
            purpose: classifyPurpose(pathname, title),
            source: 'payload-pages',
            status: doc._status || 'published',
          }
        })

      const seen = new Set(docs.map((doc) => doc.pathname))
      for (const route of extraRoutes) {
        if (!seen.has(route.pathname)) {
          docs.push({
            ...route,
            id: `${site.key}-${route.pathname}`,
            routePath: joinRoute(site.pathPrefix, route.pathname),
            purpose: classifyPurpose(route.pathname, route.title),
            source: 'app-route',
            status: 'published',
          })
        }
      }

      return {
        ...site,
        pages: docs
          .filter((doc) => !selectedPath || normalizePath(doc.routePath) === normalizePath(selectedPath) || normalizePath(doc.pathname) === normalizePath(selectedPath))
          .sort((left, right) => left.routePath.localeCompare(right.routePath, 'vi')),
      }
    })
    .filter((site) => site.pages.length > 0)
}

async function inspectPage(page, target, mode, screenshotPath) {
  const consoleErrors = []
  const pageErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  const response = await page.goto(`${baseURL}${target.routePath}`, {
    timeout: 30_000,
    waitUntil: 'domcontentloaded',
  })

  await page.waitForTimeout(900)
  await page.screenshot({ fullPage: false, path: screenshotPath })

  const metrics = await page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }
    const textOf = (el) => el.textContent?.replace(/\s+/g, ' ').trim() || ''
    const inFirstViewport = (el) => el.getBoundingClientRect().top < window.innerHeight
    const anchors = Array.from(document.querySelectorAll('a'))
    const buttons = Array.from(document.querySelectorAll('button'))
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((heading) => ({
      level: Number(heading.tagName.slice(1)),
      text: textOf(heading),
    }))
    const images = Array.from(document.querySelectorAll('img')).map((image) => ({
      alt: image.getAttribute('alt') || '',
      src: image.currentSrc || image.getAttribute('src') || '',
      visible: visible(image),
    }))
    const firstViewportLinks = anchors.filter(visible).filter(inFirstViewport).map(textOf).filter(Boolean)
    const firstViewportButtons = buttons.filter(visible).filter(inFirstViewport).map(textOf).filter(Boolean)
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''
    const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim()

    return {
      title: document.title,
      metaDescription,
      canonical,
      h1: headings.filter((heading) => heading.level === 1).map((heading) => heading.text),
      headings,
      bodyText,
      bodyTextLength: bodyText.length,
      bodyTheme: document.body.getAttribute('data-site-theme') || '',
      bodyPreset: document.body.getAttribute('data-site-preset') || '',
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      documentHeight: document.documentElement.scrollHeight,
      visibleLinks: anchors.filter(visible).length,
      visibleButtons: buttons.filter(visible).length,
      firstViewportCTA: [...firstViewportLinks, ...firstViewportButtons].slice(0, 12),
      forms: document.querySelectorAll('form').length,
      missingAltImages: images.filter((image) => image.visible && !image.alt.trim()).length,
      imageCount: images.filter((image) => image.visible).length,
      jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
    }
  })

  return {
    ...target,
    mode: mode.name,
    url: `${baseURL}${target.routePath}`,
    status: response?.status() || null,
    ok: response?.ok() || false,
    screenshot: path.relative(path.resolve(process.cwd(), '..'), screenshotPath).replaceAll('\\', '/'),
    consoleErrors,
    pageErrors,
    ...metrics,
  }
}

function reviewTechnical(result) {
  const blockers = []
  const warnings = []

  if (!result.ok) blockers.push(`HTTP status is ${result.status || 'unknown'}.`)
  if (result.consoleErrors.length) blockers.push(`${result.consoleErrors.length} browser console error(s).`)
  if (result.pageErrors.length) blockers.push(`${result.pageErrors.length} runtime page error(s).`)
  if (result.overflowX) blockers.push(`Horizontal overflow: ${result.scrollWidth}px > ${result.clientWidth}px.`)
  if (result.h1.length !== 1) warnings.push(`Expected exactly one H1, found ${result.h1.length}.`)
  if (!result.title || result.title.length < 8) warnings.push('Document title is missing or too short.')
  if (!result.metaDescription || result.metaDescription.length < 50) warnings.push('Meta description is missing or thin.')
  if (result.metaDescription.length > 170) warnings.push('Meta description is longer than the preferred launch range.')
  if (!result.canonical) warnings.push('Canonical URL is missing.')
  if (result.missingAltImages) warnings.push(`${result.missingAltImages} visible image(s) have empty alt text.`)

  return {
    blockers,
    status: blockers.length ? 'blocked' : warnings.length ? 'pass_with_notes' : 'pass',
    warnings,
  }
}

function reviewContent(result) {
  const blockers = []
  const warnings = []
  const recommendations = []
  const text = result.bodyText || ''
  const expected = expectedContent[result.purpose]

  if (result.source !== 'system' && result.bodyTextLength < 600) {
    warnings.push('Rendered text is thin for a launch page.')
  }

  if (expected) {
    for (const signal of expected.requiredSignals) {
      if (!signal.pattern.test(text)) {
        warnings.push(`Missing expected content signal: ${signal.key}.`)
      }
    }
  }

  if (['campaign', 'travel-product', 'lead-contact'].includes(result.purpose)) {
    const ctaText = result.firstViewportCTA.join(' ')
    if (!/(tư vấn|tu van|liên hệ|lien he|đăng ký|dang ky|giữ chỗ|giu cho|book|contact|inquiry|nhận|nhan)/i.test(ctaText)) {
      warnings.push('First viewport does not expose a strong conversion CTA.')
      recommendations.push('Move or rewrite the primary CTA so it is visible before scroll.')
    }
  }

  if (['campaign', 'travel-product'].includes(result.purpose) && !/(hotline|zalo|email|liên hệ|lien he|contact)/i.test(text)) {
    blockers.push('Conversion page does not expose a clear contact or inquiry path.')
  }

  if (result.purpose === 'lead-contact' && result.forms === 0 && !/(hotline|zalo|email|tel:|mailto:)/i.test(text)) {
    blockers.push('Contact page has no form or clear direct contact method.')
  }

  if (result.purpose === 'trust' && result.bodyTextLength < 1000) {
    warnings.push('Trust/legal page may be too thin for customer-facing launch.')
  }

  if (recommendations.length === 0 && warnings.length > 0) {
    recommendations.push('Review copy against page goal and fill missing launch-critical details.')
  }

  return {
    blockers,
    recommendations,
    status: blockers.length ? 'blocked' : warnings.length ? 'needs_fix' : 'pass',
    warnings,
  }
}

function pageSummary(results) {
  const technicalStatus = worstStatus(...results.map((result) => reviewTechnical(result).status))
  const contentStatus = worstStatus(...results.map((result) => reviewContent(result).status))
  const finalStatus = worstStatus(technicalStatus, contentStatus)

  return { contentStatus, finalStatus, technicalStatus }
}

function buildMarkdown(payload) {
  const lines = []
  lines.push('# WingsGroup Go-live Review Report')
  lines.push('')
  lines.push(`Generated: ${payload.generatedAt}`)
  lines.push(`Base URL: ${payload.baseURL}`)
  lines.push('')
  lines.push('## Decision Summary')
  lines.push('')
  lines.push(`Overall status: **${payload.overallStatus}**`)
  lines.push('')
  lines.push('| Site | Page | Purpose | Status | Desktop | Mobile | Main findings |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- |')

  for (const page of payload.pages) {
    const desktop = page.results.find((result) => result.mode === 'desktop')
    const mobile = page.results.find((result) => result.mode === 'mobile')
    const findings = [
      ...new Set(
        page.results.flatMap((result) => [
          ...reviewTechnical(result).blockers,
          ...reviewTechnical(result).warnings,
          ...reviewContent(result).blockers,
          ...reviewContent(result).warnings,
        ]),
      ),
    ]
      const summary = findings.length ? findings.slice(0, 3).join('<br>') : 'No launch blocker detected.'
    lines.push(
      `| ${page.siteLabel} | ${page.title}<br>\`${page.routePath}\` | ${page.purpose} | **${page.summary.finalStatus}** | ${desktop?.ok ? 'OK' : 'Check'}<br>[shot](${desktop?.screenshot || ''}) | ${mobile?.ok ? 'OK' : 'Check'}<br>[shot](${mobile?.screenshot || ''}) | ${summary} |`,
    )
  }

  lines.push('')
  lines.push('## Content Review Notes')
  lines.push('')
  for (const page of payload.pages) {
    const contentFindings = [
      ...new Set(page.results.flatMap((result) => [...reviewContent(result).blockers, ...reviewContent(result).warnings])),
    ]
    if (!contentFindings.length) continue
    lines.push(`### ${page.siteLabel} - ${page.title}`)
    lines.push('')
    for (const finding of contentFindings) lines.push(`- ${finding}`)
    lines.push('')
  }

  lines.push('## Gate Rules')
  lines.push('')
  lines.push('- `blocked`: route/runtime/overflow blocker, or conversion/contact path missing on conversion pages.')
  lines.push('- `needs_fix`: required content signal or first-viewport CTA issue should be fixed before customer go-live.')
  lines.push('- `pass_with_notes`: technical/content warnings remain, but no launch blocker was detected.')
  lines.push('- `pass`: no automated launch issue detected in this pipeline pass.')
  lines.push('')

  return `${lines.join('\n')}\n`
}

async function main() {
  await fs.mkdir(outDir, { recursive: true })
  const inventory = await loadInventory()
  const browser = await chromium.launch({ headless: true })
  const pages = []

  for (const site of inventory) {
    for (const pageInfo of site.pages) {
      const results = []
      for (const mode of modes) {
        const context = await browser.newContext({
          isMobile: Boolean(mode.isMobile),
          viewport: { width: mode.width, height: mode.height },
        })
        const page = await context.newPage()
        const screenshotPath = path.join(outDir, 'screenshots', site.key, mode.name, `${slugify(pageInfo.routePath)}.png`)
        await fs.mkdir(path.dirname(screenshotPath), { recursive: true })
        try {
          console.log(`Review ${site.key} ${mode.name} ${pageInfo.routePath}`)
          results.push(await inspectPage(page, pageInfo, mode, screenshotPath))
        } catch (error) {
          results.push({
            ...pageInfo,
            bodyText: '',
            bodyTextLength: 0,
            canonical: '',
            clientWidth: mode.width,
            consoleErrors: [],
            firstViewportCTA: [],
            h1: [],
            imageCount: 0,
            jsonLdCount: 0,
            metaDescription: '',
            missingAltImages: 0,
            mode: mode.name,
            ok: false,
            overflowX: false,
            pageErrors: [error instanceof Error ? error.message : String(error)],
            screenshot: '',
            scrollWidth: mode.width,
            status: null,
            title: '',
            url: `${baseURL}${pageInfo.routePath}`,
            visibleButtons: 0,
            visibleLinks: 0,
          })
        } finally {
          await page.close()
          await context.close()
        }
      }

      pages.push({
        ...pageInfo,
        siteKey: site.key,
        siteLabel: site.label,
        summary: pageSummary(results),
        results,
      })
    }
  }

  await browser.close()

  const overallStatus = worstStatus(...pages.map((page) => page.summary.finalStatus))
  const payload = {
    baseURL,
    generatedAt: new Date().toISOString(),
    overallStatus,
    pages,
  }

  await fs.writeFile(path.join(outDir, 'review-results.json'), JSON.stringify(payload, null, 2))
  await fs.writeFile(path.join(outDir, 'review-report.md'), buildMarkdown(payload))
  console.log(`Wrote ${path.join(outDir, 'review-report.md')}`)

  if (overallStatus === 'blocked') {
    process.exitCode = 2
  } else if (overallStatus === 'needs_fix') {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
