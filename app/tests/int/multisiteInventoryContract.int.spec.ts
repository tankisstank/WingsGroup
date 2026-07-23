import { describe, expect, it } from 'vitest'

import { loadMultisiteAuditInventory } from '../helpers/multisiteAuditInventory'
import { domainCandidates } from '@/utilities/siteDomains'
import { getCanonicalSiteOrigin, getSiteSitemapLocales, getSiteSitemapURL } from '@/utilities/siteSEO'
import {
  buildLocaleSwitchHref,
  getLocaleFromPathname,
  getSiteAliasFromPathname,
  prefixPathWithSite,
  siteCodeToAliasMap,
} from '@/utilities/sitePaths'

describe('multisite inventory contract', () => {
  const inventory = loadMultisiteAuditInventory()

  it('keeps inventory aliases aligned with route utility aliases', () => {
    for (const site of inventory.sites) {
      const alias = siteCodeToAliasMap[site.name]

      expect(alias, `${site.name} alias`).toBe(site.localAlias)
      expect(getSiteAliasFromPathname(`/${site.localAlias}`), `${site.name} path alias`).toBe(
        site.localAlias,
      )
    }
  })

  it('keeps inventory hosts aligned with canonical and domain candidate utilities', () => {
    for (const site of inventory.sites) {
      const siteShape = {
        additionalDomains: site.hosts
          .filter((host) => host !== site.primaryDomain)
          .map((domain) => ({ domain })),
        defaultLocale: site.defaultLocale,
        primaryDomain: site.primaryDomain,
        supportedLocales: site.supportedLocales,
      }

      for (const host of site.hosts) {
        expect(domainCandidates(host), `${site.name} ${host} candidates`).toContain(host)
      }

      expect(
        getCanonicalSiteOrigin({
          settings: { seo: { canonicalDomain: site.canonicalDomain } },
          site: siteShape,
        }),
        `${site.name} canonical`,
      ).toBe(site.canonicalDomain)

      expect(getSiteSitemapLocales(siteShape), `${site.name} public locales`).toEqual(
        site.publicLocales,
      )
    }
  })

  it('preserves nested public business paths when switching locale for every inventory site', () => {
    for (const site of inventory.sites) {
      const alias = site.localAlias

      for (const locale of site.publicLocales) {
        const nestedPath =
          site.nestedRouteSamples[locale] ||
          Object.values(site.nestedRouteSamples)[0] ||
          '/'
        const sourcePath = prefixPathWithSite(nestedPath, alias, locale)

        expect(getSiteAliasFromPathname(sourcePath), `${site.name} ${locale} source alias`).toBe(
          alias,
        )
        expect(getLocaleFromPathname(sourcePath), `${site.name} ${locale} source locale`).toBe(
          locale,
        )

        for (const targetLocale of site.publicLocales) {
          const switched = buildLocaleSwitchHref(sourcePath, targetLocale)

          expect(
            getSiteAliasFromPathname(switched),
            `${site.name} ${locale}->${targetLocale} alias`,
          ).toBe(alias)
          expect(
            getLocaleFromPathname(switched),
            `${site.name} ${locale}->${targetLocale} locale`,
          ).toBe(targetLocale)
          expect(
            switched.replace(new RegExp(`^/${alias}/${targetLocale}`), '') || '/',
            `${site.name} ${locale}->${targetLocale} path suffix`,
          ).toBe(nestedPath)
        }
      }
    }
  })

  it('preserves query and hash when switching locale for every inventory site search route', () => {
    for (const site of inventory.sites) {
      const alias = site.localAlias

      for (const locale of site.publicLocales) {
        const sourcePath = prefixPathWithSite('/search?q=baseline#results', alias, locale)

        for (const targetLocale of site.publicLocales) {
          const switched = buildLocaleSwitchHref(sourcePath, targetLocale)

          expect(switched, `${site.name} ${locale}->${targetLocale} search suffix`).toBe(
            `/${alias}/${targetLocale}/search?q=baseline#results`,
          )
        }
      }
    }
  })

  it('builds locale-specific sitemap URLs for every public inventory route sample', () => {
    for (const site of inventory.sites) {
      const origin = site.canonicalDomain || `https://${site.primaryDomain}`

      for (const locale of site.publicLocales) {
        const nestedPath =
          site.nestedRouteSamples[locale] ||
          Object.values(site.nestedRouteSamples)[0] ||
          '/'
        const expectedPath =
          locale === 'vi'
            ? nestedPath
            : `/${locale}${nestedPath === '/' ? '' : nestedPath}`

        expect(
          getSiteSitemapURL({
            locale,
            origin,
            path: nestedPath,
          }),
          `${site.name} ${locale} sitemap URL`,
        ).toBe(`${origin}${expectedPath === '/' ? '' : expectedPath}`)
      }
    }
  })
})
