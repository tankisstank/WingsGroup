import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const argumentValue = (name, fallback) => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  return inline ? inline.slice(name.length + 1) : fallback
}

const baseUrl = argumentValue('--base-url', 'http://127.0.0.1:3105').replace(/\/+$/, '')
const outDir = path.resolve(
  argumentValue('--out-dir', path.join(process.cwd(), 'artifacts', 'wp4r-browser')),
)
const targetTour = '/tour/best-of-northern-vietnam-hanoi-ninh-binh-sapa-halong-6-days'
const routes = [
  ['home', '/'],
  ['plan', '/plan-your-trip'],
  ['destinations', '/destinations'],
  ['styles', '/styles'],
  ['packages', '/packages'],
  ['guide', '/travel-guide'],
  ['about', '/about-us'],
  ['contact', '/contact-us'],
  ['tour-detail', targetTour],
]
const viewports = [
  [320, 844],
  [390, 844],
  [430, 900],
  [768, 900],
  [1024, 900],
  [1440, 900],
]

fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []

try {
  for (const [routeName, routePath] of routes) {
    for (const [width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height } })
      const page = await context.newPage()
      const consoleErrors = []
      const failedResponses = []
      const pageErrors = []
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text())
      })
      page.on('pageerror', (error) => pageErrors.push(error.message))
      page.on('response', (response) => {
        if (response.status() >= 400 && response.url().startsWith(baseUrl)) {
          failedResponses.push({ status: response.status(), url: response.url() })
        }
      })
      await page.addInitScript(() => sessionStorage.removeItem('wingside-promo-dismissed'))
      const response = await page.goto(`${baseUrl}${routePath}`, {
        timeout: 60_000,
        waitUntil: 'domcontentloaded',
      })
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
      const signals = await page.evaluate(() => {
        const related = [...document.querySelectorAll('[data-od-id^="related-tour-"]')]
        return {
          duplicateIds:
            [...document.querySelectorAll('[id]')].length -
            new Set([...document.querySelectorAll('[id]')].map((element) => element.id)).size,
          forms: document.forms.length,
          markers: document.querySelectorAll('[data-od-id]').length,
          mobileConsultPosition: getComputedStyle(
            document.querySelector('[data-od-id="tour-mobile-consult"]') || document.body,
          ).position,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          pageError: document.body.innerText.includes('Application error'),
          relatedTours: related.filter((card) =>
            card.querySelector('a')?.getAttribute('href')?.startsWith('/tour/'),
          ).length,
        }
      })
      if (width === 390 || width === 1440) {
        await page.screenshot({
          fullPage: false,
          path: path.join(outDir, `${routeName}-${width}.png`),
        })
      }
      results.push({
        consoleErrors,
        failedResponses,
        height,
        pageErrors,
        path: routePath,
        route: routeName,
        signals,
        status: response?.status() || 0,
        width,
      })
      await context.close()
    }
  }
} finally {
  await browser.close()
}

const failures = results.filter((result) => {
  const isTour = result.route === 'tour-detail'
  const expectedForms = ['home', 'plan', 'contact', 'tour-detail'].includes(result.route) ? 1 : 0
  return (
    result.status !== 200 ||
    result.consoleErrors.length > 0 ||
    result.failedResponses.length > 0 ||
    result.pageErrors.length > 0 ||
    result.signals.duplicateIds !== 0 ||
    result.signals.forms !== expectedForms ||
    result.signals.markers === 0 ||
    result.signals.overflow ||
    result.signals.pageError ||
    (isTour &&
      (result.signals.markers !== 45 ||
        result.signals.relatedTours !== 3 ||
        (result.width <= 768 && result.signals.mobileConsultPosition !== 'fixed')))
  )
})
const report = {
  baseUrl,
  failures,
  generatedAt: new Date().toISOString(),
  results,
  summary: {
    checks: results.length,
    failed: failures.length,
    passed: results.length - failures.length,
    screenshots: routes.length * 2,
  },
}
fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report.summary))
if (failures.length) process.exitCode = 1
