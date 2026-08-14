/**
 * One-off Playwright audit for Wingside tour detail (local).
 * Usage (from app/): node scripts/audit-tour-detail-playwright.mjs
 */
import { chromium, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../output/us046/playwright-tour-audit')
const url =
  process.env.AUDIT_URL ||
  'http://127.0.0.1:3010/wing-side/tour/best-of-northern-vietnam-hanoi-ninh-binh-sapa-halong-6-days'

fs.mkdirSync(outDir, { recursive: true })

async function collectSignals(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || ''
    const html = document.documentElement?.outerHTML || ''
    const links = [...document.querySelectorAll('a[href]')].map((a) => ({
      href: a.getAttribute('href') || '',
      text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
    }))
    const primaryCandidates = links.filter((l) =>
      /request consultation|^\s*consult\s*$|yêu cầu tư vấn/i.test(l.text),
    )
    const contactCandidates = links.filter((l) => /^contact us$|^liên hệ$/i.test(l.text))
    // Prefer tour conversion CTA (not header "Plan trip" site-header-cta).
    const primary =
      document.querySelector('a.tour-cta-primary[href*="intent=inquiry"]') ||
      document.querySelector('a.tour-cta-primary') ||
      document.querySelector(
        'a[href*="intent=inquiry"][href*="tour-detail-hero"], a[href*="intent=inquiry"][href*="tour-detail-sticky"]',
      )
    let primaryBox = null
    if (primary) {
      primary.scrollIntoView({ block: 'center', inline: 'nearest' })
      const r = primary.getBoundingClientRect()
      primaryBox = { height: Math.round(r.height), width: Math.round(r.width) }
    }

    const h1 = document.querySelector('h1')?.textContent?.trim() || null

    return {
      h1,
      hasConsultativeClass: Boolean(
        document.querySelector(
          '[data-tour-presentation="consultative"], .tour-detail--consultative',
        ),
      ),
      hasPrivateJourney: /private journey/i.test(text),
      hasTailorMade: /tailor-made journey/i.test(text),
      hasOldHero: Boolean(document.querySelector('.wingsside-tour-hero')),
      hasDecisionRail: Boolean(document.querySelector('.tour-decision-rail')),
      itineraryDayCount: document.querySelectorAll('.tour-itinerary-day').length,
      detailsCount: document.querySelectorAll(
        '#itinerary details, .tour-itinerary-accordion details',
      ).length,
      hasJumpNav: Boolean(
        document.querySelector(
          'nav[aria-label*="Tour" i], nav[aria-label*="section" i], nav[aria-label*="Mục lục" i]',
        ),
      ),
      textHasPriceOnRequest: /price on request/i.test(text),
      textHas24h: /24h|24 h|within 24/i.test(text),
      textHasHoldSeat: /hold-seat|giữ chỗ/i.test(text),
      htmlHasHoldSeat: /hold-seat/i.test(html),
      lienHe: links.some((l) => /\/lien-he(\?|$)/i.test(l.href)),
      contactUs: links.some((l) => /contact-us/i.test(l.href)),
      inquiryHrefs: primaryCandidates.map((l) => l.href),
      contactHrefs: contactCandidates.map((l) => l.href),
      inquiryIntentCount: links.filter((l) => /intent=inquiry/i.test(l.href)).length,
      contactIntentCount: links.filter((l) => /intent=contact/i.test(l.href)).length,
      primaryBox,
      deadContactSpan: Boolean(
        [...document.querySelectorAll('span')].some(
          (el) => /^contact us$/i.test((el.textContent || '').trim()) && !el.closest('a'),
        ),
      ),
    }
  })
}

function evaluateLocks(status, signals, consoleErrors, pageErrors) {
  const results = []
  const push = (id, pass, evidence) => results.push({ id, pass, evidence })

  push('status-200', status === 200, `status=${status}`)
  push(
    'consultative-presentation',
    signals.hasConsultativeClass,
    `hasConsultativeClass=${signals.hasConsultativeClass}`,
  )
  push(
    'hi-fi-not-legacy',
    signals.hasPrivateJourney && !signals.hasOldHero && !signals.hasTailorMade,
    `privateJourney=${signals.hasPrivateJourney} oldHero=${signals.hasOldHero} tailorMade=${signals.hasTailorMade}`,
  )
  push(
    'dual-cta-consult',
    signals.inquiryHrefs.length > 0 || signals.inquiryIntentCount > 0,
    `inquiryLinks=${signals.inquiryHrefs.length} intentCount=${signals.inquiryIntentCount}`,
  )
  push(
    'dual-cta-contact-link',
    signals.contactHrefs.length > 0 && !signals.deadContactSpan,
    `contactLinks=${signals.contactHrefs.length} deadSpan=${signals.deadContactSpan}`,
  )
  push(
    'intent-inquiry',
    signals.inquiryIntentCount > 0,
    `count=${signals.inquiryIntentCount}`,
  )
  push(
    'intent-contact',
    signals.contactIntentCount > 0,
    `count=${signals.contactIntentCount}`,
  )
  push(
    'no-hold-seat',
    !signals.htmlHasHoldSeat && !signals.textHasHoldSeat,
    `html=${signals.htmlHasHoldSeat} text=${signals.textHasHoldSeat}`,
  )
  push(
    'price-on-request-24h',
    signals.textHasPriceOnRequest && signals.textHas24h,
    `priceOnRequest=${signals.textHasPriceOnRequest} has24h=${signals.textHas24h}`,
  )
  push('decision-rail', signals.hasDecisionRail, `rail=${signals.hasDecisionRail}`)
  push(
    'itinerary-accordion',
    signals.itineraryDayCount > 0 || signals.detailsCount > 0,
    `days=${signals.itineraryDayCount} details=${signals.detailsCount}`,
  )
  push('jump-nav', signals.hasJumpNav, `jumpNav=${signals.hasJumpNav}`)
  push(
    'contact-us-path',
    signals.contactUs && !signals.lienHe,
    `contactUs=${signals.contactUs} lienHe=${signals.lienHe}`,
  )
  push(
    'no-console-errors',
    consoleErrors.length === 0 && pageErrors.length === 0,
    `consoleErrors=${consoleErrors.length} pageErrors=${pageErrors.length}`,
  )
  push(
    'cta-min-height-44',
    Boolean(signals.primaryBox && signals.primaryBox.height >= 44),
    `primaryBox=${JSON.stringify(signals.primaryBox)}`,
  )

  return results
}

async function runViewport(browser, label, contextOptions) {
  const context = await browser.newContext({ ...contextOptions, ignoreHTTPSErrors: true })
  const page = await context.newPage()
  const consoleMessages = []
  const pageErrors = []

  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() })
  })
  page.on('pageerror', (err) => {
    pageErrors.push(String(err?.message || err))
  })

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
  await page.waitForTimeout(1000)

  const status = response?.status() ?? 0
  const title = await page.title()
  const signals = await collectSignals(page)

  const shotPath = path.join(outDir, `${label}.png`)
  await page.screenshot({ path: shotPath, fullPage: true })

  // mobile sticky / fold
  const foldPath = path.join(outDir, `${label}-viewport.png`)
  await page.screenshot({ path: foldPath, fullPage: false })

  // Ignore known CSP Report-Only browser noise (not app runtime failures).
  const consoleErrors = consoleMessages.filter(
    (m) =>
      m.type === 'error' &&
      !/upgrade-insecure-requests.*report-only/i.test(m.text) &&
      !/Content Security Policy directive 'upgrade-insecure-requests'/i.test(m.text),
  )
  const locks = evaluateLocks(status, signals, consoleErrors, pageErrors)

  await context.close()

  return {
    label,
    url,
    status,
    title,
    signals,
    locks,
    consoleMessages: consoleMessages.slice(0, 40),
    consoleErrors,
    pageErrors,
    screenshots: { full: shotPath, viewport: foldPath },
  }
}

const browser = await chromium.launch({ headless: true })
const results = []

try {
  results.push(
    await runViewport(browser, 'desktop-1440', {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    }),
  )
  results.push(
    await runViewport(browser, 'mobile-390', {
      ...devices['iPhone 13'],
    }),
  )
} finally {
  await browser.close()
}

const passCount = results.reduce(
  (n, r) => n + r.locks.filter((l) => l.pass).length,
  0,
)
const failCount = results.reduce(
  (n, r) => n + r.locks.filter((l) => !l.pass).length,
  0,
)

const report = {
  generatedAt: new Date().toISOString(),
  url,
  outDir,
  summary: { passCount, failCount, viewports: results.map((r) => r.label) },
  results,
}

const jsonPath = path.join(outDir, 'report.json')
const mdPath = path.join(outDir, 'report.md')
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8')

const md = []
md.push('# Playwright tour detail audit')
md.push('')
md.push(`- URL: ${url}`)
md.push(`- Generated: ${report.generatedAt}`)
md.push(`- Pass checks: **${passCount}** · Fail checks: **${failCount}**`)
md.push('')

for (const r of results) {
  md.push(`## ${r.label}`)
  md.push('')
  md.push(`- status: ${r.status}`)
  md.push(`- title: ${r.title}`)
  md.push(`- h1: ${r.signals.h1}`)
  md.push(`- screenshots: \`${path.basename(r.screenshots.full)}\`, \`${path.basename(r.screenshots.viewport)}\``)
  md.push('')
  md.push('| Check | Result | Evidence |')
  md.push('|-------|--------|----------|')
  for (const lock of r.locks) {
    md.push(`| ${lock.id} | ${lock.pass ? 'PASS' : 'FAIL'} | ${lock.evidence.replace(/\|/g, '\\|')} |`)
  }
  md.push('')
  if (r.consoleErrors.length || r.pageErrors.length) {
    md.push('### Errors')
    for (const e of r.consoleErrors) md.push(`- console: ${e.text}`)
    for (const e of r.pageErrors) md.push(`- pageerror: ${e}`)
    md.push('')
  }
  md.push('### Key signals')
  md.push('```json')
  md.push(JSON.stringify(r.signals, null, 2))
  md.push('```')
  md.push('')
}

fs.writeFileSync(mdPath, md.join('\n'), 'utf8')

console.log(JSON.stringify({ jsonPath, mdPath, passCount, failCount }, null, 2))
process.exit(failCount > 0 ? 1 : 0)
