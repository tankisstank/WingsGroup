import { expect, test } from '@playwright/test'

import { localeMetadataByCode, type SupportedLocaleCode } from '@/utilities/locales'
import { loadMultisiteAuditInventory } from '../helpers/multisiteAuditInventory'

const e2eBaseURL = (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100').replace(/\/$/, '')
const inventory = loadMultisiteAuditInventory()

const localeSwitchSites = inventory.sites.filter((site) => site.publicLocales.length > 1)

const buildLocalAliasURL = (
  alias: string,
  locale: SupportedLocaleCode,
  pathWithSuffix: string,
) => `${e2eBaseURL}/${alias}/${locale}${pathWithSuffix}`

test.describe('Multisite locale switch contract', () => {
  test('keeps query, hash, and locale-prefixed navigation continuity across multilingual sites on desktop', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 1440, height: 900 })

    for (const site of localeSwitchSites) {
      const sourceLocale = site.defaultLocale
      const targetLocale =
        site.publicLocales.find((locale) => locale !== sourceLocale) || site.publicLocales[0]
      const targetLocaleLabel = localeMetadataByCode[targetLocale].label
      const searchPath = '/search?q=baseline#results'

      await page.goto(buildLocalAliasURL(site.localAlias, sourceLocale, searchPath), {
        waitUntil: 'domcontentloaded',
      })

      const languageSwitcher = page.getByRole('navigation', { name: /language|ngôn ngữ|lingua/i }).first()
      await expect(languageSwitcher, `${site.name} language switcher`).toBeVisible()
      await expect(languageSwitcher).toHaveAttribute('data-client-ready', 'true')
      await expect(
        languageSwitcher.getByRole('link', { name: targetLocaleLabel }),
        `${site.name} switch href`,
      ).toHaveAttribute('href', `/${site.localAlias}/${targetLocale}/search?q=baseline#results`)

      await languageSwitcher.getByRole('link', { name: targetLocaleLabel }).click()
      await expect(page, `${site.name} switched URL`).toHaveURL(
        `${e2eBaseURL}/${site.localAlias}/${targetLocale}/search?q=baseline#results`,
      )
      await expect(page.locator('html')).toHaveAttribute('lang', targetLocale)

      const primaryNavLink = page
        .locator('nav[aria-label="Primary navigation"] .site-header__primary-link')
        .first()
      await expect(primaryNavLink, `${site.name} primary nav link`).toBeVisible()
      const primaryHref = await primaryNavLink.getAttribute('href')
      expect(
        primaryHref,
        `${site.name} primary navigation should stay on switched locale`,
      ).toMatch(new RegExp(`^/${site.localAlias}/${targetLocale}(?:/|$)`))

      await primaryNavLink.click()
      await expect.poll(() => page.url(), {
        message: `${site.name} primary navigation URL should remain on switched locale`,
      }).toContain(`/${site.localAlias}/${targetLocale}`)
      await expect(page.locator('html')).toHaveAttribute('lang', targetLocale)

      await page.goBack({ waitUntil: 'domcontentloaded' })
      await expect(page, `${site.name} back URL`).toHaveURL(
        `${e2eBaseURL}/${site.localAlias}/${targetLocale}/search?q=baseline#results`,
      )
      await expect(page.locator('html')).toHaveAttribute('lang', targetLocale)

      const footerNavigation = page.locator('.site-footer nav').first()
      await expect(footerNavigation, `${site.name} footer navigation`).toBeVisible()
      const footerLink = footerNavigation.locator('a[href^="/"]').first()
      await expect(footerLink, `${site.name} footer link`).toBeVisible()
      const footerHref = await footerLink.getAttribute('href')
      expect(
        footerHref,
        `${site.name} footer navigation should stay on switched locale`,
      ).toMatch(new RegExp(`^/${site.localAlias}/${targetLocale}(?:/|$)`))

      await footerLink.click()
      await expect.poll(() => page.url(), {
        message: `${site.name} footer navigation URL should remain on switched locale`,
      }).toContain(`/${site.localAlias}/${targetLocale}`)
      await expect(page.locator('html')).toHaveAttribute('lang', targetLocale)

      await page.goBack({ waitUntil: 'domcontentloaded' })
      await expect(page, `${site.name} restored search URL`).toHaveURL(
        `${e2eBaseURL}/${site.localAlias}/${targetLocale}/search?q=baseline#results`,
      )

      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page, `${site.name} reload URL`).toHaveURL(
        `${e2eBaseURL}/${site.localAlias}/${targetLocale}/search?q=baseline#results`,
      )
      await expect(page.locator('html')).toHaveAttribute('lang', targetLocale)
    }
  })

  test('renders mobile locale switch hrefs with preserved query and hash across multilingual sites', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 390, height: 844 })

    for (const site of localeSwitchSites) {
      const sourceLocale = site.defaultLocale
      const targetLocale =
        site.publicLocales.find((locale) => locale !== sourceLocale) || site.publicLocales[0]
      const targetLocaleLabel = localeMetadataByCode[targetLocale].label
      const searchPath = '/search?q=baseline#results'

      await page.goto(buildLocalAliasURL(site.localAlias, sourceLocale, searchPath), {
        waitUntil: 'domcontentloaded',
      })

      await expect(page.locator('.site-language-switcher').first()).toHaveAttribute(
        'data-client-ready',
        'true',
      )
      await page.locator('button[aria-controls="mobile-primary-navigation"]').click()
      const mobileNavigation = page.locator('#mobile-primary-navigation')
      await expect(mobileNavigation, `${site.name} mobile navigation`).toBeVisible()

      const switcher = mobileNavigation
        .locator('.site-language-switcher')
        .getByRole('link', { name: targetLocaleLabel })
      await expect(switcher, `${site.name} mobile switch href`).toHaveAttribute(
        'href',
        `/${site.localAlias}/${targetLocale}/search?q=baseline#results`,
      )
    }
  })
})
