import { chromium } from '@playwright/test'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

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

const baseURL =
  args.get('base-url') ||
  process.env.GO_LIVE_BASE_URL ||
  process.env.PREVIEW_BASE_URL ||
  'http://localhost:3000'
const selectedSite = args.get('site') || process.env.GO_LIVE_SITE || ''
const selectedPath = args.get('path') || process.env.GO_LIVE_PATH || ''
const positiveInteger = (value, fallback, name, minimum = 1) => {
  const parsed = Number(value ?? fallback)
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}.`)
  }
  return parsed
}

const concurrency = positiveInteger(
  args.get('concurrency') || process.env.GO_LIVE_CONCURRENCY,
  4,
  'concurrency',
)
const pageTimeout = positiveInteger(
  args.get('timeout') || process.env.GO_LIVE_PAGE_TIMEOUT,
  45_000,
  'timeout',
  5_000,
)
const resume = args.get('resume') === 'true' || process.env.GO_LIVE_RESUME === 'true'
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const outDir = path.resolve(
  process.cwd(),
  args.get('out') ||
    process.env.GO_LIVE_OUT_DIR ||
    path.join('..', 'output', 'go-live-review', timestamp),
)
const checkpointPath = path.join(outDir, 'review-checkpoint.jsonl')
const checkpointVersion = 3
const forbiddenHostPattern = /(?:localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com)/i
const baseHost = new URL(baseURL).hostname.toLowerCase()
const isLocalBase = forbiddenHostPattern.test(baseHost) || baseHost.endsWith('.local')
const routingMode =
  args.get('routing') || process.env.GO_LIVE_ROUTING || (isLocalBase ? 'path' : 'domain')

if (!['domain', 'path'].includes(routingMode)) {
  throw new Error('routing must be either "domain" or "path".')
}

const modes = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
]

const sites = [
  {
    key: 'wingsgroup',
    label: 'WingsGroup',
    pathPrefix: '',
    publicHosts: ['wingsgroup.vn'],
    siteCode: 'wings-group',
    siteIds: [1],
    themeKey: 'wings-group',
  },
  {
    key: 'wingsgo',
    label: 'WingsGo',
    pathPrefix: '/wingsgo',
    publicHosts: ['wingsgo.vn'],
    siteCode: 'wings-go',
    siteIds: [2],
    themeKey: 'wings-go',
  },
  {
    key: 'wingsside',
    label: 'wingside.vn',
    pathPrefix: '/wingsside',
    publicHosts: ['wingsside.vn'],
    siteCode: 'wing-side',
    siteIds: [3],
    themeKey: 'wings-side',
    requiredRoutes: [{ title: 'Travel Guide', pathname: '/travel-guide', type: 'editorial' }],
  },
  {
    key: 'wingsplus',
    label: 'WingsPlus',
    pathPrefix: '/wingsplus',
    publicHosts: ['wingsplus.vn'],
    siteCode: 'wings-plus',
    siteIds: [4],
    themeKey: 'wings-plus',
  },
  {
    key: 'wingscare',
    label: 'WingsCare',
    pathPrefix: '/wingscare',
    publicHosts: ['wingscare.wingsgroup.vn'],
    siteCode: 'wings-care',
    siteIds: [5],
    themeKey: 'wings-care',
  },
  {
    key: 'wingspass',
    label: 'WingsPass',
    pathPrefix: '/wingspass',
    publicHosts: ['wingspass.wingsgroup.vn'],
    siteCode: 'wings-pass',
    siteIds: [6],
    themeKey: 'wings-pass',
  },
]

const selectedSites = sites.filter((site) => {
  if (selectedSite) return site.key === selectedSite
  if (routingMode === 'domain')
    return site.publicHosts.some((host) => host === baseHost || `www.${host}` === baseHost)
  return true
})

if (selectedSite && selectedSites.length === 0) {
  throw new Error(`Unknown site "${selectedSite}".`)
}

if (routingMode === 'domain' && selectedSites.length !== 1) {
  throw new Error(
    'Domain routing requires --site or a base URL whose hostname matches one configured site.',
  )
}

const checkpointScope = JSON.stringify({
  baseURL: new URL(baseURL).origin,
  routingMode,
  selectedPath: selectedPath || null,
  sites: selectedSites.map((site) => site.key),
  version: checkpointVersion,
})

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
  const controller = new AbortController()
  const timeoutID = setTimeout(() => controller.abort(), pageTimeout)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
    return response.json()
  } finally {
    clearTimeout(timeoutID)
  }
}

const classifyPurpose = (pathname, title = '') => {
  const haystack = `${pathname} ${title}`.toLowerCase()
  if (/campaign|landing|khuyen-mai|he-2026/.test(haystack)) return 'campaign'
  if (/tour|lich-khoi-hanh|thi-truong|packages|destinations|styles|plan-your-trip/.test(haystack))
    return 'travel-product'
  if (/contact|lien-he|tu-van/.test(haystack)) return 'lead-contact'
  if (/policy|chinh-sach|dieu-khoan|tin-cay|legal|testimonials/.test(haystack)) return 'trust'
  if (/posts|tin-tuc|guide|search|travel-guide/.test(haystack)) return 'editorial'
  if (/about|gioi-thieu|ve-/.test(haystack)) return 'brand-trust'
  return pathname === '/' ? 'homepage' : 'content'
}

const expectedContent = {
  campaign: {
    requiredSignals: [
      {
        key: 'primary CTA',
        pattern:
          /(tư vấn|tu van|liên hệ|lien he|đăng ký|dang ky|giữ chỗ|giu cho|nhận báo giá|nhan bao gia|book|inquiry|contact)/i,
      },
      {
        key: 'offer or destination',
        pattern:
          /(tour|hàn quốc|han quoc|nhật bản|nhat ban|trung quốc|trung quoc|vietnam|package|campaign|hè|he 2026)/i,
      },
      {
        key: 'trust or support signal',
        pattern:
          /(hotline|zalo|email|[\w.+-]+@[\w.-]+|\+?\d[\d\s().-]{7,}|uy tín|uy tin|cam kết|cam ket|hỗ trợ|ho tro|testimonial|review|giấy phép|giay phep)/i,
      },
    ],
  },
  'travel-product': {
    requiredSignals: [
      {
        key: 'destination or itinerary',
        pattern:
          /(lịch trình|lich trinh|điểm đến|diem den|tour|package|destination|khởi hành|khoi hanh)/i,
      },
      {
        key: 'conversion CTA',
        pattern: /(tư vấn|tu van|liên hệ|lien he|đặt tour|dat tour|inquiry|contact|book)/i,
      },
      {
        key: 'price or inquiry path',
        pattern:
          /(giá|gia|price|báo giá|bao gia|hotline|zalo|liên hệ|lien he|plan your trip|trip planner|travel brief|tailored proposal|inquiry|customi[sz]ation)/i,
      },
    ],
  },
  'lead-contact': {
    requiredSignals: [
      {
        key: 'contact method',
        pattern: /(hotline|phone|điện thoại|dien thoai|email|zalo|address|địa chỉ|dia chi)/i,
      },
      {
        key: 'lead action',
        pattern: /(gửi|gui|liên hệ|lien he|tư vấn|tu van|submit|send|contact)/i,
      },
    ],
  },
  homepage: {
    requiredSignals: [
      {
        key: 'brand proposition',
        pattern: /(wings|travel|du lịch|du lich|dịch vụ|dich vu|tour|ecosystem|inbound|outbound)/i,
      },
      {
        key: 'primary navigation or CTA',
        pattern: /(tìm hiểu|tim hieu|xem|khám phá|kham pha|liên hệ|lien he|contact|discover)/i,
      },
    ],
  },
  trust: {
    requiredSignals: [
      {
        key: 'policy or reassurance language',
        pattern:
          /(chính sách|chinh sach|điều khoản|dieu khoan|bảo mật|bao mat|cam kết|cam ket|tin cậy|tin cay|legal|privacy|trust|proof|reassurance|support|local coordination)/i,
      },
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
  statuses.reduce(
    (worst, status) => (statusRank[status] > statusRank[worst] ? status : worst),
    'pass',
  )

async function loadInventory() {
  const pagesData = await fetchJSON(`${baseURL}/api/pages?limit=1000&depth=1`)
  const pages = pagesData.docs || []

  return selectedSites
    .map((site) => {
      const routePrefix = routingMode === 'path' ? site.pathPrefix : ''
      const docs = pages
        .filter((doc) => {
          if (doc.site && typeof doc.site === 'object') {
            const code = String(doc.site.code || '').toLowerCase()
            if (code) return code === site.siteCode
          }
          return site.siteIds.includes(Number(relationId(doc.site)))
        })
        .filter((doc) => !doc._status || doc._status === 'published')
        .filter((doc) => !(doc.pathname || '').startsWith('/hero-'))
        .map((doc) => {
          const pathname = normalizePath(doc.pathname || doc.slug || '/')
          const title = localizedText(doc.title, localizedText(doc.meta?.title, `Page ${doc.id}`))
          return {
            id: doc.id,
            title,
            pathname,
            routePath: joinRoute(routePrefix, pathname),
            purpose: classifyPurpose(pathname, title),
            source: 'payload-pages',
            status: doc._status || 'published',
          }
        })

      const seen = new Set(docs.map((doc) => doc.pathname))
      for (const route of [...extraRoutes, ...(site.requiredRoutes || [])]) {
        if (!seen.has(route.pathname)) {
          docs.push({
            ...route,
            id: `${site.key}-${route.pathname}`,
            routePath: joinRoute(routePrefix, route.pathname),
            purpose: classifyPurpose(route.pathname, route.title),
            source: 'app-route',
            status: 'published',
          })
        }
      }

      return {
        ...site,
        pages: docs
          .filter(
            (doc) =>
              !selectedPath ||
              normalizePath(doc.routePath) === normalizePath(selectedPath) ||
              normalizePath(doc.pathname) === normalizePath(selectedPath),
          )
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
    timeout: pageTimeout,
    waitUntil: 'domcontentloaded',
  })

  await page.waitForTimeout(900)
  await page.screenshot({ fullPage: false, path: screenshotPath })

  const metrics = await page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none'
      )
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
    const firstViewportLinks = anchors
      .filter(visible)
      .filter(inFirstViewport)
      .map(textOf)
      .filter(Boolean)
    const firstViewportButtons = buttons
      .filter(visible)
      .filter(inFirstViewport)
      .map(textOf)
      .filter(Boolean)
    const metaDescription =
      document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''
    const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim()
    const brandText = Array.from(document.querySelectorAll('.site-logo-text'))
      .filter(visible)
      .map(textOf)
      .filter(Boolean)

    return {
      title: document.title,
      brandText,
      metaDescription,
      canonical,
      h1: headings.filter((heading) => heading.level === 1).map((heading) => heading.text),
      headings,
      bodyText,
      bodyTextLength: bodyText.length,
      bodyTheme: document.body.getAttribute('data-site-theme') || '',
      bodyPreset: document.body.getAttribute('data-site-preset') || '',
      htmlLang: document.documentElement.lang || '',
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
    responseHeaders: response?.headers() || {},
    ok: response?.ok() || false,
    screenshot: path
      .relative(path.resolve(process.cwd(), '..'), screenshotPath)
      .replaceAll('\\', '/'),
    consoleErrors,
    pageErrors,
    ...metrics,
  }
}

function reviewTechnical(result) {
  const blockers = []
  const warnings = []

  if (!result.ok) blockers.push(`HTTP status is ${result.status || 'unknown'}.`)
  if (result.consoleErrors.length)
    blockers.push(`${result.consoleErrors.length} browser console error(s).`)
  if (result.pageErrors.length) blockers.push(`${result.pageErrors.length} runtime page error(s).`)
  if (result.overflowX)
    blockers.push(`Horizontal overflow: ${result.scrollWidth}px > ${result.clientWidth}px.`)
  if (result.h1.length !== 1) warnings.push(`Expected exactly one H1, found ${result.h1.length}.`)
  if (!result.title || result.title.length < 8)
    warnings.push('Document title is missing or too short.')
  if (!result.metaDescription || result.metaDescription.length < 50)
    warnings.push('Meta description is missing or thin.')
  if (result.metaDescription.length > 170)
    warnings.push('Meta description is longer than the preferred launch range.')
  if (!result.canonical) warnings.push('Canonical URL is missing.')
  if (result.missingAltImages)
    warnings.push(`${result.missingAltImages} visible image(s) have empty alt text.`)

  const normalizeIdentity = (value) => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const expectedIdentity = normalizeIdentity(result.siteLabel)
  const titleIdentity = normalizeIdentity(result.title)
  if (expectedIdentity && !titleIdentity.includes(expectedIdentity)) {
    blockers.push(`Document title does not identify expected site ${result.siteLabel}.`)
  }

  if (result.themeKey && result.bodyTheme !== result.themeKey) {
    blockers.push(
      `Rendered theme ${result.bodyTheme || '(missing)'} does not match ${result.themeKey}.`,
    )
  }

  if (
    expectedIdentity &&
    result.brandText?.length &&
    !result.brandText.some((text) => normalizeIdentity(text).includes(expectedIdentity))
  ) {
    blockers.push(`Visible brand mark does not identify expected site ${result.siteLabel}.`)
  }

  if (forbiddenHostPattern.test(result.canonical || '')) {
    blockers.push('Canonical URL contains a forbidden development host.')
  }

  if (!/^https?:\/\//i.test(result.canonical || '')) {
    warnings.push('Canonical URL is not absolute.')
  } else if (result.publicHosts?.length) {
    try {
      const canonicalHost = new URL(result.canonical).hostname.toLowerCase().replace(/^www\./, '')
      if (!result.publicHosts.includes(canonicalHost)) {
        blockers.push(`Canonical hostname ${canonicalHost} does not belong to ${result.siteLabel}.`)
      }
    } catch {
      blockers.push('Canonical URL is invalid.')
    }
  }

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
    if (
      !/(tư vấn|tu van|liên hệ|lien he|đăng ký|dang ky|giữ chỗ|giu cho|book|contact|inquiry|nhận|nhan|plan your trip|send your brief|start your inquiry)/i.test(
        ctaText,
      )
    ) {
      warnings.push('First viewport does not expose a strong conversion CTA.')
      recommendations.push('Move or rewrite the primary CTA so it is visible before scroll.')
    }
  }

  if (
    ['campaign', 'travel-product'].includes(result.purpose) &&
    !/(hotline|zalo|email|liên hệ|lien he|contact|plan your trip|trip planner|travel brief|tailored proposal|inquiry)/i.test(
      text,
    )
  ) {
    blockers.push('Conversion page does not expose a clear contact or inquiry path.')
  }

  if (
    result.purpose === 'lead-contact' &&
    result.forms === 0 &&
    !/(hotline|zalo|email|tel:|mailto:)/i.test(text)
  ) {
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

const targetURL = (routePath, query = '') => {
  const url = new URL(routePath || '/', baseURL.endsWith('/') ? baseURL : `${baseURL}/`)
  url.search = query
  return url.toString()
}

const fetchTextProbe = async (pathname) => {
  const controller = new AbortController()
  const timeoutID = setTimeout(() => controller.abort(), pageTimeout)
  try {
    const response = await fetch(targetURL(pathname), {
      redirect: 'follow',
      signal: controller.signal,
    })
    const text = await response.text()
    return {
      contentLength: text.length,
      finalURL: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      pathname,
      status: response.status,
      text,
    }
  } catch (error) {
    return {
      contentLength: 0,
      error: error instanceof Error ? error.message : String(error),
      finalURL: targetURL(pathname),
      headers: {},
      pathname,
      status: null,
      text: '',
    }
  } finally {
    clearTimeout(timeoutID)
  }
}

const identitySnapshot = async (browser, url, extraHTTPHeaders = {}) => {
  const context = await browser.newContext({ extraHTTPHeaders })
  const page = await context.newPage()
  page.setDefaultNavigationTimeout(pageTimeout)
  page.setDefaultTimeout(pageTimeout)
  try {
    const response = await page.goto(url, { timeout: pageTimeout, waitUntil: 'domcontentloaded' })
    const identity = await page.evaluate(() => ({
      bodyTheme: document.body.getAttribute('data-site-theme') || '',
      brandText: Array.from(document.querySelectorAll('.site-logo-text'))
        .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() || '')
        .filter(Boolean),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      h1: Array.from(document.querySelectorAll('h1')).map(
        (node) => node.textContent?.replace(/\s+/g, ' ').trim() || '',
      ),
      htmlLang: document.documentElement.lang || '',
      mainText: document.querySelector('main')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      title: document.title,
    }))
    return {
      ...identity,
      contentHash: createHash('sha256').update(identity.mainText).digest('hex'),
      mainText: undefined,
      headers: response?.headers() || {},
      ok: response?.ok() || false,
      status: response?.status() || null,
      url,
    }
  } catch (error) {
    return {
      bodyTheme: '',
      brandText: [],
      canonical: '',
      error: error instanceof Error ? error.message : String(error),
      h1: [],
      headers: {},
      htmlLang: '',
      ok: false,
      status: null,
      title: '',
      url,
    }
  } finally {
    await context.close()
  }
}

const identityFingerprint = (snapshot) =>
  JSON.stringify({
    bodyTheme: snapshot.bodyTheme,
    brandText: snapshot.brandText,
    canonical: snapshot.canonical,
    contentHash: snapshot.contentHash,
    h1: snapshot.h1,
    htmlLang: snapshot.htmlLang,
    title: snapshot.title,
  })

const decodeXMLText = (value) =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')

const extractAdvertisedURLs = (text, pathname) => {
  if (pathname === '/robots.txt') {
    return [...text.matchAll(/^\s*(?:host|sitemap):\s*(https?:\/\/\S+)\s*$/gim)].map(
      (match) => match[1],
    )
  }

  return [...text.matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/gi)]
    .map((match) => decodeXMLText(match[1].trim()))
    .filter((value) => /^https?:\/\//i.test(value))
}

async function inspectSiteProbe(browser, site) {
  const routePrefix = routingMode === 'path' ? site.pathPrefix : ''
  const homepageURL = targetURL(joinRoute(routePrefix, '/'))
  const otherSite = sites.find((candidate) => candidate.key !== site.key)
  const targetPath = joinRoute(routePrefix, '/')
  const otherSiteCode = otherSite?.siteCode || 'invalid-site'
  const otherSiteAlias = otherSite?.key || 'invalid-site'
  const seoPaths = ['/robots.txt', '/sitemap.xml', '/pages-sitemap.xml', '/posts-sitemap.xml']
  const [
    baseline,
    siteQueryInjection,
    siteAliasQueryInjection,
    siteHeaderInjection,
    internalHeaderInjection,
    ...seoEndpoints
  ] = await Promise.all([
    identitySnapshot(browser, homepageURL),
    identitySnapshot(
      browser,
      targetURL(targetPath, new URLSearchParams({ site: otherSiteCode }).toString()),
    ),
    identitySnapshot(
      browser,
      targetURL(targetPath, new URLSearchParams({ siteAlias: otherSiteAlias }).toString()),
    ),
    identitySnapshot(browser, homepageURL, { 'x-site-code': otherSiteCode }),
    identitySnapshot(browser, homepageURL, {
      'x-locale': 'en',
      'x-public-path': otherSite?.pathPrefix || '/invalid-site',
      'x-site-context-source': 'proxy',
      'x-site-host': otherSite?.publicHosts[0] || 'invalid.example.com',
      'x-site-prefix': otherSite?.pathPrefix || '/invalid-site',
    }),
    ...seoPaths.map((pathname) => fetchTextProbe(pathname)),
  ])

  return {
    baseline,
    internalHeaderInjection,
    recordType: 'site-probe',
    seoEndpoints: seoEndpoints.map((endpoint) => ({
      absoluteURLs: extractAdvertisedURLs(endpoint.text, endpoint.pathname),
      containsForbiddenHost: forbiddenHostPattern.test(endpoint.text),
      contentLength: endpoint.contentLength,
      error: endpoint.error,
      finalURL: endpoint.finalURL,
      headers: endpoint.headers,
      pathname: endpoint.pathname,
      status: endpoint.status,
    })),
    siteAliasQueryInjection,
    siteHeaderInjection,
    siteQueryInjection,
    siteKey: site.key,
    siteLabel: site.label,
  }
}

function reviewSiteProbe(probe, site) {
  const blockers = []
  const warnings = []
  const expectedHostnames = site.publicHosts.map((host) => host.replace(/^www\./, ''))

  if (!probe?.baseline?.ok)
    blockers.push(`Homepage identity probe returned HTTP ${probe?.baseline?.status || 'unknown'}.`)
  if (probe?.baseline?.bodyTheme !== site.themeKey) {
    blockers.push(
      `Homepage theme ${probe?.baseline?.bodyTheme || '(missing)'} does not match ${site.themeKey}.`,
    )
  }

  const expectedIdentity = site.label.toLowerCase().replace(/[^a-z0-9]/g, '')
  const titleIdentity = (probe?.baseline?.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!titleIdentity.includes(expectedIdentity))
    blockers.push(`Homepage title does not identify ${site.label}.`)
  const brandIdentities = (probe?.baseline?.brandText || []).map((value) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, ''),
  )
  if (!brandIdentities.some((value) => value.includes(expectedIdentity))) {
    blockers.push(`Homepage visible brand mark does not identify ${site.label}.`)
  }
  if (forbiddenHostPattern.test(probe?.baseline?.canonical || '')) {
    blockers.push('Homepage canonical contains a forbidden development host.')
  } else if (probe?.baseline?.canonical) {
    try {
      const canonicalURL = new URL(probe.baseline.canonical)
      const canonicalHost = canonicalURL.hostname.toLowerCase().replace(/^www\./, '')
      if (!expectedHostnames.includes(canonicalHost)) {
        blockers.push(
          `Homepage canonical hostname ${canonicalHost} does not belong to ${site.label}.`,
        )
      }
      if (canonicalURL.protocol !== 'https:') blockers.push('Homepage canonical is not HTTPS.')
    } catch {
      blockers.push('Homepage canonical is not a valid absolute URL.')
    }
  } else {
    blockers.push('Homepage canonical is missing.')
  }

  for (const endpoint of probe?.seoEndpoints || []) {
    if (endpoint.status !== 200) {
      blockers.push(`${endpoint.pathname} returned HTTP ${endpoint.status || 'unknown'}.`)
    }
    if (
      ['/robots.txt', '/sitemap.xml'].includes(endpoint.pathname) &&
      !(endpoint.absoluteURLs || []).length
    ) {
      blockers.push(`${endpoint.pathname} does not advertise any absolute public URL.`)
    }
    if (routingMode === 'domain') {
      try {
        const finalURL = new URL(endpoint.finalURL)
        const finalHostname = finalURL.hostname.toLowerCase().replace(/^www\./, '')
        if (forbiddenHostPattern.test(finalHostname)) {
          blockers.push(`${endpoint.pathname} redirected to a forbidden development host.`)
        } else if (!expectedHostnames.includes(finalHostname)) {
          blockers.push(`${endpoint.pathname} redirected to cross-site hostname ${finalHostname}.`)
        }
        if (finalURL.protocol !== 'https:')
          blockers.push(`${endpoint.pathname} final URL is not HTTPS.`)
      } catch {
        blockers.push(`${endpoint.pathname} has an invalid final URL.`)
      }
    }
    if (
      endpoint.containsForbiddenHost &&
      !(endpoint.absoluteURLs || []).some((url) => forbiddenHostPattern.test(url))
    ) {
      blockers.push(`${endpoint.pathname} contains a forbidden development-host token.`)
    }
    const forbiddenURLs = []
    const crossSiteURLs = []
    const nonHTTPSURLs = []
    const invalidURLs = []
    for (const urlValue of endpoint.absoluteURLs || []) {
      if (forbiddenHostPattern.test(urlValue)) {
        forbiddenURLs.push(urlValue)
        continue
      }
      try {
        const advertisedURL = new URL(urlValue)
        const hostname = advertisedURL.hostname.toLowerCase().replace(/^www\./, '')
        if (!expectedHostnames.includes(hostname)) crossSiteURLs.push(urlValue)
        if (advertisedURL.protocol !== 'https:') nonHTTPSURLs.push(urlValue)
      } catch {
        invalidURLs.push(urlValue)
      }
    }
    const summarizeURLs = (values) => `${values.length} URL(s); first: ${values[0]}`
    if (forbiddenURLs.length)
      blockers.push(
        `${endpoint.pathname} contains forbidden hosts in ${summarizeURLs(forbiddenURLs)}.`,
      )
    if (crossSiteURLs.length)
      blockers.push(
        `${endpoint.pathname} contains cross-site entries in ${summarizeURLs(crossSiteURLs)}.`,
      )
    if (nonHTTPSURLs.length)
      blockers.push(
        `${endpoint.pathname} contains non-HTTPS entries in ${summarizeURLs(nonHTTPSURLs)}.`,
      )
    if (invalidURLs.length)
      blockers.push(
        `${endpoint.pathname} contains invalid entries in ${summarizeURLs(invalidURLs)}.`,
      )
  }

  const headers = probe?.baseline?.headers || {}
  const requiredHeaders = [
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'cross-origin-opener-policy',
    'cross-origin-resource-policy',
  ]
  const headerFindings = []
  for (const header of requiredHeaders) {
    if (!headers[header]) headerFindings.push(`Security header ${header} is missing.`)
  }
  const csp =
    headers['content-security-policy'] || headers['content-security-policy-report-only'] || ''
  if (!csp) headerFindings.push('Content Security Policy is missing.')
  if (!headers['x-frame-options'] && !/frame-ancestors/i.test(csp)) {
    headerFindings.push('Frame embedding protection is missing.')
  }
  if (
    routingMode === 'domain' &&
    new URL(baseURL).protocol === 'https:' &&
    !headers['strict-transport-security']
  ) {
    headerFindings.push('Security header strict-transport-security is missing.')
  }
  ;(routingMode === 'domain' ? blockers : warnings).push(...headerFindings)

  for (const [name, candidate] of [
    ['site query-string', probe?.siteQueryInjection],
    ['siteAlias query-string', probe?.siteAliasQueryInjection],
    ['x-site-code header', probe?.siteHeaderInjection],
    ['internal-header bundle', probe?.internalHeaderInjection],
  ]) {
    if ([400, 403, 404].includes(candidate?.status)) continue
    if (!candidate?.ok) {
      blockers.push(
        `${name} tenant-injection probe failed with HTTP ${candidate?.status || 'unknown'}.`,
      )
    } else if (identityFingerprint(candidate) !== identityFingerprint(probe.baseline)) {
      blockers.push(`${name} tenant-injection probe changed the rendered site identity.`)
    }
  }

  return {
    blockers: [...new Set(blockers)],
    status: blockers.length ? 'blocked' : warnings.length ? 'pass_with_notes' : 'pass',
    warnings: [...new Set(warnings)],
  }
}

function pageSummary(results) {
  const technicalStatus = worstStatus(...results.map((result) => reviewTechnical(result).status))
  const contentStatus = worstStatus(...results.map((result) => reviewContent(result).status))
  const finalStatus = worstStatus(technicalStatus, contentStatus)

  return { contentStatus, finalStatus, technicalStatus }
}

function deriveSiteDecision({
  complete,
  focused,
  homepageSmokeStatus,
  pageStatus,
  probeReview,
  routing,
  site,
}) {
  const siteAssessmentStatus = worstStatus(
    complete ? 'pass' : 'blocked',
    homepageSmokeStatus,
    pageStatus,
    probeReview.status,
  )
  const eligibleForGoLiveDecision = complete && !focused && routing === 'domain'

  return {
    eligibleForGoLiveDecision,
    homepageSmokeStatus,
    probeReview,
    siteAssessmentStatus,
    siteDecisionStatus: eligibleForGoLiveDecision ? siteAssessmentStatus : 'not_evaluated',
    siteKey: site.key,
    siteLabel: site.label,
  }
}

function buildMarkdown(payload) {
  const findingPriority = (finding) => {
    if (/tenant-injection/i.test(finding)) return 0
    if (/identity|theme|title|canonical/i.test(finding)) return 1
    if (/forbidden/i.test(finding)) return 2
    if (/security header|content security|frame embedding/i.test(finding)) return 3
    if (/cross-site/i.test(finding)) return 4
    return 5
  }
  const lines = []
  lines.push('# WingsGroup Go-live Review Report')
  lines.push('')
  lines.push(`Generated: ${payload.generatedAt}`)
  lines.push(`Base URL: ${payload.baseURL}`)
  lines.push(`Routing: ${payload.routingMode}`)
  lines.push(`Decision scope: ${payload.decisionScope}`)
  lines.push(`Progress: ${payload.completedTasks}/${payload.totalTasks} checks`)
  if (!payload.complete) lines.push('Report state: **partial/checkpointed**')
  for (const warning of payload.checkpointWarnings || []) lines.push(`Checkpoint note: ${warning}`)
  lines.push('')
  lines.push('## Decision Summary')
  lines.push('')
  lines.push(`Automated assessment: **${payload.overallStatus}**`)
  lines.push(`Go-live decision: **${payload.releaseDecision}**`)
  if (payload.releaseDecision === 'not_evaluated') {
    lines.push(
      'A homepage/focused/local smoke is not evidence that the complete production site can go live.',
    )
  }
  lines.push('')
  lines.push(
    '| Site | Homepage smoke | Full-site assessment | Go-live decision | Site-level findings |',
  )
  lines.push('| --- | --- | --- | --- | --- |')
  for (const decision of payload.siteDecisions) {
    const findings = [...decision.probeReview.blockers, ...decision.probeReview.warnings].sort(
      (left, right) => findingPriority(left) - findingPriority(right),
    )
    lines.push(
      `| ${decision.siteLabel} | **${decision.homepageSmokeStatus}** | **${decision.siteAssessmentStatus}** | **${decision.siteDecisionStatus}** | ${findings.length ? findings.slice(0, 8).join('<br>') : 'No site-level issue detected.'} |`,
    )
  }
  lines.push('')
  lines.push('## Site Release Probes')
  lines.push('')
  for (const decision of payload.siteDecisions) {
    const findings = [...decision.probeReview.blockers, ...decision.probeReview.warnings]
    lines.push(`### ${decision.siteLabel}`)
    lines.push('')
    if (!findings.length) lines.push('- No site-level issue detected.')
    for (const finding of findings) lines.push(`- ${finding}`)
    lines.push('')
  }
  lines.push('## Page Evidence')
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
    const summary = findings.length
      ? findings.slice(0, 3).join('<br>')
      : 'No launch blocker detected.'
    lines.push(
      `| ${page.siteLabel} | ${page.title}<br>\`${page.routePath}\` | ${page.purpose} | **${page.summary.finalStatus}** | ${desktop?.ok ? 'OK' : 'Check'}<br>[shot](${desktop?.screenshot || ''}) | ${mobile?.ok ? 'OK' : 'Check'}<br>[shot](${mobile?.screenshot || ''}) | ${summary} |`,
    )
  }

  lines.push('')
  lines.push('## Content Review Notes')
  lines.push('')
  for (const page of payload.pages) {
    const contentFindings = [
      ...new Set(
        page.results.flatMap((result) => [
          ...reviewContent(result).blockers,
          ...reviewContent(result).warnings,
        ]),
      ),
    ]
    if (!contentFindings.length) continue
    lines.push(`### ${page.siteLabel} - ${page.title}`)
    lines.push('')
    for (const finding of contentFindings) lines.push(`- ${finding}`)
    lines.push('')
  }

  lines.push('## Gate Rules')
  lines.push('')
  lines.push(
    '- `blocked`: route/runtime/overflow blocker, or conversion/contact path missing on conversion pages.',
  )
  lines.push(
    '- `needs_fix`: required content signal or first-viewport CTA issue should be fixed before customer go-live.',
  )
  lines.push(
    '- `pass_with_notes`: technical/content warnings remain, but no launch blocker was detected.',
  )
  lines.push('- `pass`: no automated launch issue detected in this pipeline pass.')
  lines.push(
    '- `not_evaluated`: the run was focused, local/path-routed, partial, or otherwise insufficient for a production site decision.',
  )
  lines.push(
    '- A site decision also requires identity, tenant-injection, security-header, robots, and sitemap probes.',
  )
  lines.push('')

  return `${lines.join('\n')}\n`
}

const checkpointKey = (siteKey, routePath, mode) => `${siteKey}|${routePath}|${mode}`

const parseCheckpoint = (content) => {
  const records = new Map()
  const warnings = []
  const lines = content.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (!line) continue
    try {
      const record = JSON.parse(line)
      if (
        !record.checkpointKey ||
        record.checkpointVersion !== checkpointVersion ||
        record.checkpointScope !== checkpointScope
      ) {
        warnings.push(`Ignored incompatible checkpoint line ${index + 1}.`)
        continue
      }
      records.set(record.checkpointKey, record)
    } catch {
      warnings.push(`Ignored malformed checkpoint line ${index + 1}; it will be rerun.`)
    }
  }
  return { records, warnings }
}

async function loadCheckpoint() {
  if (!resume) return { records: new Map(), warnings: [] }

  try {
    const content = await fs.readFile(checkpointPath, 'utf8')
    return parseCheckpoint(content)
  } catch (error) {
    if (error?.code === 'ENOENT') return { records: new Map(), warnings: [] }
    throw error
  }
}

async function atomicWriteFile(filePath, content) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  try {
    await fs.writeFile(temporaryPath, content)
    await fs.rename(temporaryPath, filePath)
  } catch (error) {
    await fs.rm(temporaryPath, { force: true })
    throw error
  }
}

const jsonlAppendQueues = new Map()

async function appendJSONLine(filePath, record) {
  const previous = jsonlAppendQueues.get(filePath) || Promise.resolve()
  const operation = previous
    .catch(() => undefined)
    .then(async () => {
      const handle = await fs.open(filePath, 'a')
      try {
        await handle.write(`${JSON.stringify(record)}\n`)
        await handle.sync()
      } finally {
        await handle.close()
      }
    })
  jsonlAppendQueues.set(filePath, operation)
  try {
    await operation
  } finally {
    if (jsonlAppendQueues.get(filePath) === operation) jsonlAppendQueues.delete(filePath)
  }
}

const appendCheckpointRecord = (record) => appendJSONLine(checkpointPath, record)

async function withTimeout(promise, timeoutMs, label) {
  let timeoutID
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutID = setTimeout(
          () => reject(new Error(`${label} exceeded ${timeoutMs}ms.`)),
          timeoutMs,
        )
      }),
    ])
  } finally {
    clearTimeout(timeoutID)
  }
}

async function runPool(tasks, worker, size, shouldStop = () => false) {
  let nextIndex = 0
  const runners = Array.from({ length: Math.min(size, tasks.length) }, async () => {
    while (nextIndex < tasks.length && !shouldStop()) {
      const task = tasks[nextIndex]
      nextIndex += 1
      await worker(task)
    }
  })
  await Promise.all(runners)
}

async function main() {
  await fs.mkdir(outDir, { recursive: true })
  if (!resume) await atomicWriteFile(checkpointPath, '')
  const inventory = await loadInventory()
  const checkpointData = await loadCheckpoint()
  const checkpoint = checkpointData.records
  const browser = await chromium.launch({ headless: true })
  const pageRecords = new Map()
  const siteProbes = new Map()
  const tasks = []
  let requestedSignal = null
  const requestShutdown = (signal) => {
    requestedSignal = signal
    console.warn(`${signal} received; finishing active checks and writing a partial report.`)
  }
  const signalHandlers = {
    SIGINT: () => requestShutdown('SIGINT'),
    SIGTERM: () => requestShutdown('SIGTERM'),
  }
  process.once('SIGINT', signalHandlers.SIGINT)
  process.once('SIGTERM', signalHandlers.SIGTERM)

  for (const site of inventory) {
    for (const pageInfo of site.pages) {
      const pageKey = `${site.key}|${pageInfo.routePath}`
      pageRecords.set(pageKey, {
        ...pageInfo,
        siteKey: site.key,
        siteLabel: site.label,
        publicHosts: site.publicHosts,
        themeKey: site.themeKey,
        results: [],
      })
      for (const mode of modes) {
        const key = checkpointKey(site.key, pageInfo.routePath, mode.name)
        const cached = checkpoint.get(key)
        if (cached) {
          pageRecords.get(pageKey).results.push(cached)
        } else {
          tasks.push({ key, mode, pageInfo, pageKey, site })
        }
      }
    }

    const siteProbeKey = checkpointKey(site.key, '__site__', 'release-probe')
    const cachedProbe = checkpoint.get(siteProbeKey)
    if (cachedProbe) {
      siteProbes.set(site.key, cachedProbe)
    } else {
      tasks.push({ key: siteProbeKey, site, type: 'site-probe' })
    }
  }

  const totalTasks = [...pageRecords.values()].length * modes.length + inventory.length
  let persistQueue = Promise.resolve()
  const buildPayload = () => {
    const pages = [...pageRecords.values()]
      .filter((page) => page.results.length > 0)
      .map((page) => ({
        ...page,
        results: [...page.results].sort((left, right) => left.mode.localeCompare(right.mode)),
        summary: pageSummary(page.results),
      }))
      .sort((left, right) =>
        `${left.siteKey}|${left.routePath}`.localeCompare(`${right.siteKey}|${right.routePath}`),
      )
    const completedTasks =
      pages.reduce((sum, page) => sum + page.results.length, 0) + siteProbes.size
    const complete = completedTasks === totalTasks
    const siteDecisions = inventory.map((site) => {
      const sitePages = pages.filter((page) => page.siteKey === site.key)
      const homepage = sitePages.find((page) => page.pathname === '/')
      const probe = siteProbes.get(site.key)
      const siteCompletedTasks =
        sitePages.reduce((sum, page) => sum + page.results.length, 0) + (probe ? 1 : 0)
      const siteComplete = siteCompletedTasks === site.pages.length * modes.length + 1
      const homepageComplete = homepage?.results.length === modes.length
      const homepageSmokeStatus = homepageComplete ? homepage.summary.finalStatus : 'blocked'
      const pageStatus = sitePages.length
        ? worstStatus(...sitePages.map((page) => page.summary.finalStatus))
        : 'blocked'
      const probeReview = probe
        ? reviewSiteProbe(probe, site)
        : { blockers: ['Site-level release probe is incomplete.'], status: 'blocked', warnings: [] }
      return deriveSiteDecision({
        complete: siteComplete,
        focused: Boolean(selectedPath),
        homepageSmokeStatus,
        pageStatus,
        probeReview,
        routing: routingMode,
        site,
      })
    })
    const assessedStatuses = siteDecisions.map((decision) => decision.siteAssessmentStatus)
    const overallStatus = !complete
      ? 'blocked'
      : assessedStatuses.length
        ? worstStatus(...assessedStatuses)
        : 'blocked'
    return {
      baseURL,
      checkpointWarnings: checkpointData.warnings,
      complete,
      completedTasks,
      decisionScope: selectedPath
        ? 'focused_page'
        : routingMode === 'domain'
          ? 'site_decision'
          : 'local_smoke',
      generatedAt: new Date().toISOString(),
      overallStatus,
      pages,
      releaseDecision:
        siteDecisions.length > 0 &&
        siteDecisions.every((decision) => decision.eligibleForGoLiveDecision)
          ? worstStatus(...siteDecisions.map((decision) => decision.siteDecisionStatus))
          : 'not_evaluated',
      routingMode,
      siteDecisions,
      siteProbes: [...siteProbes.values()].sort((left, right) =>
        left.siteKey.localeCompare(right.siteKey),
      ),
      totalTasks,
    }
  }
  const persistSnapshot = () => {
    persistQueue = persistQueue.then(async () => {
      const payload = buildPayload()
      await atomicWriteFile(
        path.join(outDir, 'review-results.json'),
        JSON.stringify(payload, null, 2),
      )
      await atomicWriteFile(path.join(outDir, 'review-report.md'), buildMarkdown(payload))
    })
    return persistQueue
  }
  const persistResult = (result, commit) => {
    persistQueue = persistQueue.then(async () => {
      await appendCheckpointRecord(result)
      commit()
      const payload = buildPayload()
      await atomicWriteFile(
        path.join(outDir, 'review-results.json'),
        JSON.stringify(payload, null, 2),
      )
      await atomicWriteFile(path.join(outDir, 'review-report.md'), buildMarkdown(payload))
    })
    return persistQueue
  }

  try {
    await persistSnapshot()
    await runPool(
      tasks,
      async (task) => {
        if (task.type === 'site-probe') {
          console.log(`Probe ${task.site.key} identity, tenant isolation, SEO, and headers`)
          const probe = await inspectSiteProbe(browser, task.site)
          const result = {
            ...probe,
            checkpointKey: task.key,
            checkpointScope,
            checkpointVersion,
          }
          await persistResult(result, () => siteProbes.set(task.site.key, result))
          return
        }

        const { key, mode, pageInfo, pageKey, site } = task
        const context = await browser.newContext({
          isMobile: Boolean(mode.isMobile),
          viewport: { width: mode.width, height: mode.height },
        })
        const page = await context.newPage()
        page.setDefaultNavigationTimeout(pageTimeout)
        page.setDefaultTimeout(pageTimeout)
        const screenshotPath = path.join(
          outDir,
          'screenshots',
          site.key,
          mode.name,
          `${slugify(pageInfo.routePath)}.png`,
        )
        await fs.mkdir(path.dirname(screenshotPath), { recursive: true })
        let result
        try {
          console.log(`Review ${site.key} ${mode.name} ${pageInfo.routePath}`)
          result = await withTimeout(
            inspectPage(
              page,
              {
                ...pageInfo,
                publicHosts: site.publicHosts,
                siteKey: site.key,
                siteLabel: site.label,
                themeKey: site.themeKey,
              },
              mode,
              screenshotPath,
            ),
            pageTimeout,
            `${site.key} ${mode.name} ${pageInfo.routePath}`,
          )
        } catch (error) {
          result = {
            ...pageInfo,
            bodyText: '',
            bodyTextLength: 0,
            bodyTheme: '',
            brandText: [],
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
            responseHeaders: {},
            screenshot: '',
            scrollWidth: mode.width,
            status: null,
            title: '',
            url: `${baseURL}${pageInfo.routePath}`,
            visibleButtons: 0,
            visibleLinks: 0,
          }
        } finally {
          await page.close()
          await context.close()
        }

        result = {
          ...result,
          checkpointKey: key,
          checkpointScope,
          checkpointVersion,
          publicHosts: site.publicHosts,
          recordType: 'page',
          siteKey: site.key,
          siteLabel: site.label,
          themeKey: site.themeKey,
        }
        await persistResult(result, () => pageRecords.get(pageKey).results.push(result))
      },
      concurrency,
      () => Boolean(requestedSignal),
    )
  } finally {
    try {
      await persistQueue
    } finally {
      await browser.close()
      process.removeListener('SIGINT', signalHandlers.SIGINT)
      process.removeListener('SIGTERM', signalHandlers.SIGTERM)
    }
  }

  const payload = buildPayload()
  await persistSnapshot()
  console.log(`Wrote ${path.join(outDir, 'review-report.md')}`)

  if (requestedSignal) {
    process.exitCode = requestedSignal === 'SIGINT' ? 130 : 143
  } else if (!payload.complete || payload.overallStatus === 'blocked') {
    process.exitCode = 2
  } else if (payload.overallStatus === 'needs_fix') {
    process.exitCode = 1
  }
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isMainModule) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

export {
  appendJSONLine,
  checkpointKey,
  checkpointScope,
  checkpointVersion,
  deriveSiteDecision,
  extractAdvertisedURLs,
  identityFingerprint,
  parseCheckpoint,
  positiveInteger,
  reviewSiteProbe,
  runPool,
  withTimeout,
}
