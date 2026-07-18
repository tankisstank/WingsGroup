import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { applicationSecurityHeaders } from '@/utilities/securityHeaders'
import {
  getCanonicalSiteOrigin,
  getSiteSitemapLocales,
  getSiteSitemapURL,
  isPublicSEOHost,
} from '@/utilities/siteSEO'
import { loadMultisiteAuditInventory } from '../helpers/multisiteAuditInventory'

const readProjectFile = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('production SEO perimeter', () => {
  const multisiteInventory = loadMultisiteAuditInventory()
  const site = {
    additionalDomains: [{ domain: 'www.wingsgo.vn' }],
    defaultLocale: 'vi' as const,
    primaryDomain: 'wingsgo.vn',
    supportedLocales: ['vi', 'en', 'ja'] as Array<'en' | 'ja' | 'vi'>,
  }

  it('accepts only public SEO hosts', () => {
    expect(isPublicSEOHost('wingsgo.vn')).toBe(true)
    expect(isPublicSEOHost('localhost:3000')).toBe(false)
    expect(isPublicSEOHost('127.0.0.1')).toBe(false)
    expect(isPublicSEOHost('example.com')).toBe(false)
    expect(isPublicSEOHost('preview.invalid')).toBe(false)
  })

  it('uses only a canonical domain owned by the resolved site', () => {
    expect(
      getCanonicalSiteOrigin({
        settings: { seo: { canonicalDomain: 'https://www.wingsgo.vn' } },
        site,
      }),
    ).toBe('https://www.wingsgo.vn')

    expect(
      getCanonicalSiteOrigin({
        settings: { seo: { canonicalDomain: 'https://wingscare.wingsgroup.vn' } },
        site,
      }),
    ).toBe('https://wingsgo.vn')
  })

  it('limits sitemap locales to public locales supported by the current site', () => {
    expect(getSiteSitemapLocales(site)).toEqual(['vi', 'en'])
    expect(
      getSiteSitemapURL({ locale: 'en', origin: 'https://wingsgo.vn', path: '/posts/launch' }),
    ).toBe('https://wingsgo.vn/en/posts/launch')
  })

  it('keeps canonical origins and sitemap locales aligned with the multisite inventory', () => {
    for (const site of multisiteInventory.sites) {
      const siteShape = {
        additionalDomains: site.hosts
          .filter((host) => host !== site.primaryDomain)
          .map((domain) => ({ domain })),
        defaultLocale: site.defaultLocale,
        primaryDomain: site.primaryDomain,
        supportedLocales: site.supportedLocales,
      }

      expect(
        getCanonicalSiteOrigin({
          settings: { seo: { canonicalDomain: site.canonicalDomain } },
          site: siteShape,
        }),
        `${site.name} canonical`,
      ).toBe(site.canonicalDomain)

      expect(getSiteSitemapLocales(siteShape), `${site.name} locales`).toEqual(site.publicLocales)

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
            origin: site.canonicalDomain || `https://${site.primaryDomain}`,
            path: nestedPath,
          }),
          `${site.name} ${locale} sitemap URL`,
        ).toBe(`${site.canonicalDomain || `https://${site.primaryDomain}`}${expectedPath === '/' ? '' : expectedPath}`)
      }
    }
  })

  it('keeps legacy sitemap generation away from public runtime artifacts', () => {
    const config = readProjectFile('next-sitemap.config.cjs')

    expect(config).toContain("outDir: '.next/legacy-next-sitemap-disabled'")
    expect(config).toContain('generateRobotsTxt: false')
    expect(config).not.toMatch(/localhost|127\.0\.0\.1|example\.com/)
  })

  it('site-scopes both content sitemap queries without a shared cross-host cache', () => {
    for (const path of [
      'src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts',
      'src/app/(frontend)/(sitemaps)/posts-sitemap.xml/route.ts',
    ]) {
      const source = readProjectFile(path)

      expect(source).toContain('equals: site.id')
      expect(source).toContain("export const dynamic = 'force-dynamic'")
      expect(source).not.toContain('unstable_cache')
    }
  })
})

describe('application and edge security headers', () => {
  it('exposes the required application header baseline', () => {
    const headers = new Map(applicationSecurityHeaders.map(({ key, value }) => [key, value]))

    expect(headers.get('Content-Security-Policy-Report-Only')).toContain("frame-ancestors 'self'")
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups')
    expect(headers.get('Cross-Origin-Resource-Policy')).toBe('same-site')
    expect(headers.get('Permissions-Policy')).toContain('camera=()')
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
  })

  it('removes production GraphQL and editor job-run attack surfaces', () => {
    const config = readProjectFile('src/payload.config.ts')

    expect(config).toContain("disable: process.env.NODE_ENV === 'production'")
    expect(config).toContain("req.user?.role === 'super-admin'")
    expect(config).not.toContain('if (req.user) return true')
  })

  it('blocks seed and tenant query overrides at both Nginx entrypoints', () => {
    for (const path of [
      'deploy/nginx/wings-travel-production.conf',
      'deploy/nginx/wings-travel-preview.conf',
    ]) {
      const config = readProjectFile(path)

      expect(config).toContain('location ^~ /next/seed')
      expect(config).toMatch(/\(site\|siteAlias\)/)
      expect(config).toContain('proxy_set_header X-Site-Code ""')
      expect(config).toContain('proxy_set_header X-Site-Context-Source ""')
      expect(config).toContain('proxy_set_header X-Site-Host ""')
      expect(config).toContain('add_header X-Content-Type-Options "nosniff" always')
    }
  })

  it('runs the trusted tenant proxy for the public lead endpoint', () => {
    const proxySource = readProjectFile('src/proxy.ts')

    expect(proxySource).toContain("'/api/lead-submissions'")
    expect(proxySource).toContain('createTrustedSiteContextHeaders')
  })
})
