import { expect, test } from '@playwright/test'

import { loadMultisiteAuditInventory } from '../helpers/multisiteAuditInventory'
import { loadMultisiteBaselineMatrix } from '../helpers/multisiteBaselineMatrix'
import { prefixPathWithSite, type SupportedLocaleCode } from '@/utilities/sitePaths'

const e2eBaseURL = (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100').replace(/\/$/, '')
const inventory = loadMultisiteAuditInventory()
const baselineRows = loadMultisiteBaselineMatrix()

const stripHash = (value: string) => value.replace(/#.*/, '')
const buildLoopbackURL = (path: string) => `${e2eBaseURL}${path}`
const getCanonicalHost = (canonicalDomain: null | string, fallbackHost: string) => {
  if (!canonicalDomain) return fallbackHost

  return new URL(canonicalDomain).hostname
}

const htmlRouteTypes = new Set([
  'root',
  'localized-root',
  'nested-page',
  'form-page',
  'post-detail',
  'search',
])

test.describe('Multisite baseline matrix contract', () => {
  test('keeps baseline HTTP status and canonical contracts across the generated matrix', async ({ request }) => {
    test.setTimeout(600_000)

    for (const row of baselineRows) {
      const response = await request.get(buildLoopbackURL(stripHash(row.path)), {
        headers: row.host === 'localhost' ? undefined : { host: row.host },
        timeout: 30_000,
      })

      expect(response.status(), `${row.site} ${row.host} ${row.path} status`).toBe(row.expectedStatus)

      if (row.expectedStatus !== 200) {
        continue
      }

      const contentType = response.headers()['content-type'] || ''
      const body = await response.text()

      if (row.routeType === 'robots') {
        const expectedSitemapURL =
          baselineRows.find(
            (candidate) =>
              candidate.site === row.site &&
              candidate.host === row.host &&
              candidate.routeType === 'sitemap-index',
          )?.expectedCanonical || row.expectedCanonical.replace(/\/robots\.txt$/, '/sitemap.xml')

        expect(contentType, `${row.site} robots content-type`).toContain('text/plain')
        expect(body, `${row.site} robots sitemap line`).toContain(`Sitemap: ${expectedSitemapURL}`)
        continue
      }

      if (
        row.routeType === 'sitemap-index' ||
        row.routeType === 'pages-sitemap' ||
        row.routeType === 'posts-sitemap'
      ) {
        expect(contentType, `${row.site} ${row.routeType} content-type`).toMatch(/xml/i)
        if (row.routeType === 'sitemap-index') {
          expect(body, `${row.site} sitemap index pages`).toContain('/pages-sitemap.xml')
          expect(body, `${row.site} sitemap index posts`).toContain('/posts-sitemap.xml')
        } else {
          expect(body, `${row.site} ${row.routeType} xml body`).toMatch(/urlset|sitemapindex/i)
        }
        continue
      }

      if (!htmlRouteTypes.has(row.routeType)) {
        continue
      }

      if (row.expectedCanonical) {
        expect(body, `${row.site} ${row.host} ${row.path} canonical rel`).toContain(
          'rel="canonical"',
        )
        expect(body, `${row.site} ${row.host} ${row.path} canonical href`).toContain(
          `href="${row.expectedCanonical}"`,
        )
      }

      if (row.expectedIndexability === 'noindex') {
        expect(body, `${row.site} ${row.host} ${row.path} noindex`).toMatch(
          /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i,
        )
      }
    }
  })

  test('renders representative baseline business routes per site on local alias with correct locale and canonical', async ({
    page,
  }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1440, height: 900 })

    for (const site of inventory.sites) {
      const routeCandidates: Array<{
        locale: SupportedLocaleCode
        path: string
        routeType: string
      }> = []

      const defaultLocale = site.defaultLocale
      const nestedPath =
        site.nestedRouteSamples[defaultLocale] || Object.values(site.nestedRouteSamples)[0]

      if (nestedPath) {
        routeCandidates.push({
          locale: defaultLocale,
          path: nestedPath,
          routeType: 'nested-page',
        })
      }

      if (site.formRouteSample) {
        routeCandidates.push({
          locale: defaultLocale,
          path: site.formRouteSample,
          routeType: 'form-page',
        })
      }

      if (site.postRouteSample) {
        routeCandidates.push({
          locale: defaultLocale,
          path: site.postRouteSample,
          routeType: 'post-detail',
        })
      }

      routeCandidates.push({
        locale: defaultLocale,
        path: '/search?q=baseline#results',
        routeType: 'search',
      })

      for (const candidate of routeCandidates) {
        const localAliasPath = prefixPathWithSite(
          candidate.path,
          site.localAlias,
          candidate.locale,
        )

        await page.goto(`${e2eBaseURL}${localAliasPath}`, { waitUntil: 'domcontentloaded' })
        await expect(page.locator('html')).toHaveAttribute('lang', candidate.locale)
        await expect(page.getByRole('banner'), `${site.name} ${candidate.routeType} banner`).toBeVisible()

        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
        const expectedCanonical = baselineRows.find(
          (row) =>
            row.site === site.name &&
            row.host === getCanonicalHost(site.canonicalDomain, site.hosts[0] || site.primaryDomain) &&
            row.routeType === candidate.routeType &&
            row.locale === candidate.locale &&
            row.expectedStatus === 200,
        )?.expectedCanonical

        expect(
          canonical,
          `${site.name} ${candidate.routeType} canonical on local alias`,
        ).toBe(expectedCanonical)

        if (candidate.routeType === 'search') {
          await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i)
        }
      }
    }
  })
})
