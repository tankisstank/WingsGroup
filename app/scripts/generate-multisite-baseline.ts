import 'dotenv/config'

import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import config from '../src/payload.config'
import type { Page, Site, SiteSetting } from '../src/payload-types'
import { getPayload } from 'payload'

import {
  isPublicLocale,
  type SupportedLocaleCode,
} from '../src/utilities/locales'
import { siteCodeToAliasMap } from '../src/utilities/sitePaths'
import { getSiteSitemapURL } from '../src/utilities/siteSEO'

type RouteRow = {
  evidenceFile: string
  expectedCanonical: string
  expectedIndexability: 'index' | 'noindex'
  expectedStatus: number
  expectedTenant: string
  host: string
  locale: string
  path: string
  routeType: string
  site: string
}

type SiteInventory = {
  additionalDomains: string[]
  canonicalDomain: null | string
  counts: {
    forms: number
    media: number
    pages: number
    pagesByLocale: Partial<Record<SupportedLocaleCode, number>>
    posts: number
    postsByLocale: Partial<Record<SupportedLocaleCode, number>>
    settings: number
  }
  defaultLocale: SupportedLocaleCode
  formRouteSample: null | string
  hosts: string[]
  id: number
  isActive: boolean
  localDevelopmentHosts: string[]
  localAlias: string
  name: string
  nestedRouteSamples: Partial<Record<SupportedLocaleCode, string>>
  postRouteSample: null | string
  primaryDomain: string
  publicLocales: SupportedLocaleCode[]
  supportedLocales: SupportedLocaleCode[]
  themeKey: null | string
}

const timestamp = new Date().toISOString()
const dateStamp = timestamp.slice(0, 10)

const getArgumentValue = (name: string): string | undefined => {
  const inlineArgument = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inlineArgument) return inlineArgument.split('=').slice(1).join('=')

  const index = process.argv.indexOf(name)
  if (index >= 0) return process.argv[index + 1]

  return undefined
}

const outputDir = resolve(
  process.cwd(),
  getArgumentValue('--output-dir') ||
    `../artifacts/audits/multisite-remediation-${dateStamp}`,
)

const isLocalDevelopmentHost = (host: string): boolean =>
  host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')

const normalizeHostList = (hosts: Array<null | string | undefined>): string[] =>
  [...new Set(hosts.map((host) => host?.trim().toLowerCase()).filter(Boolean) as string[])].sort()

const getCanonicalHost = (canonicalDomain: null | string): null | string => {
  if (!canonicalDomain) return null

  try {
    return new URL(canonicalDomain).hostname.toLowerCase()
  } catch {
    return null
  }
}

const toPublicHostList = (
  site: Pick<Site, 'additionalDomains' | 'primaryDomain'>,
  canonicalDomain: null | string,
): string[] => {
  const hosts: Array<null | string | undefined> = [getCanonicalHost(canonicalDomain), site.primaryDomain]
  for (const entry of (site.additionalDomains || []) as Array<{ domain?: null | string }>) {
    hosts.push(entry?.domain)
  }

  return normalizeHostList(hosts).filter((host) => !isLocalDevelopmentHost(host))
}

const toLocalDevelopmentHostList = (site: Pick<Site, 'additionalDomains' | 'primaryDomain'>): string[] =>
  normalizeHostList([
    site.primaryDomain,
    ...((site.additionalDomains || []) as Array<{ domain?: null | string }>).map(({ domain }) => domain),
  ]).filter(isLocalDevelopmentHost)

const extractThemeKey = (settings?: null | SiteSetting): null | string =>
  settings?.branding?.themeKey || null

const extractCanonicalDomain = (settings?: null | SiteSetting): null | string =>
  settings?.seo?.canonicalDomain?.trim() || null

const normalizePathname = (pathname?: null | string): string => {
  if (!pathname || pathname === '/') return '/'
  return pathname.startsWith('/') ? pathname : `/${pathname}`
}

const getLocalizedPath = (path: string, locale: string): string =>
  locale === 'vi' ? path : `/${locale}${path === '/' ? '' : path}`

const sortByPathname = <T extends { pathname?: null | string }>(docs: T[]): T[] =>
  [...docs].sort((left, right) =>
    normalizePathname(left.pathname).localeCompare(normalizePathname(right.pathname)),
  )

const findFormRoute = (pages: Page[]): null | string => {
  const formRoutes = pages.flatMap((page) => {
    const layout = Array.isArray(page.layout) ? page.layout : []
    return layout.some((block) => block?.blockType === 'formBlock')
      ? [normalizePathname(page.pathname || page.slug)]
      : []
  })

  const prioritizedPatterns = [
    /^\/contact(?:\/|$)/,
    /^\/lien-he(?:\/|$)/,
    /^\/request-proposal(?:\/|$)/,
    /^\/plan-your-trip(?:\/|$)/,
  ]

  const prioritizedRoute = formRoutes.find((route) =>
    prioritizedPatterns.some((pattern) => pattern.test(route)),
  )

  if (prioritizedRoute) {
    return prioritizedRoute
  }

  const nonRootRoute = formRoutes.find((route) => route !== '/')
  if (nonRootRoute) {
    return nonRootRoute
  }

  for (const page of pages) {
    const layout = Array.isArray(page.layout) ? page.layout : []
    if (layout.some((block) => block?.blockType === 'formBlock')) {
      return normalizePathname(page.pathname || page.slug)
    }
  }

  return null
}

const mapPagesByLocale = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  site: Site,
): Promise<{
  counts: Partial<Record<SupportedLocaleCode, number>>
  formRouteSample: null | string
  nestedRouteSamples: Partial<Record<SupportedLocaleCode, string>>
  pagesByLocale: Partial<Record<SupportedLocaleCode, Page[]>>
}> => {
  const pagesByLocale: Partial<Record<SupportedLocaleCode, Page[]>> = {}
  const counts: Partial<Record<SupportedLocaleCode, number>> = {}
  const nestedRouteSamples: Partial<Record<SupportedLocaleCode, string>> = {}
  let formRouteSample: null | string = null

  for (const locale of site.supportedLocales as SupportedLocaleCode[]) {
    const result = await payload.find({
      collection: 'pages',
      depth: 0,
      fallbackLocale: false,
      limit: 1000,
      locale,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [
          {
            site: {
              equals: site.id,
            },
          },
          {
            _status: {
              equals: 'published',
            },
          },
        ],
      },
    })

    const pages = sortByPathname(result.docs)
    pagesByLocale[locale] = pages
    counts[locale] = pages.length

    const nested = pages.find((page) => normalizePathname(page.pathname || page.slug) !== '/')
    if (nested) {
      nestedRouteSamples[locale] = normalizePathname(nested.pathname || nested.slug)
    }

    if (!formRouteSample) {
      formRouteSample = findFormRoute(pages)
    }
  }

  return { counts, formRouteSample, nestedRouteSamples, pagesByLocale }
}

const mapPostsByLocale = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  site: Site,
): Promise<{
  counts: Partial<Record<SupportedLocaleCode, number>>
  postRouteSample: null | string
}> => {
  const counts: Partial<Record<SupportedLocaleCode, number>> = {}
  let postRouteSample: null | string = null

  for (const locale of site.supportedLocales as SupportedLocaleCode[]) {
    const result = await payload.find({
      collection: 'posts',
      depth: 0,
      fallbackLocale: false,
      limit: 1000,
      locale,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [
          {
            site: {
              equals: site.id,
            },
          },
          {
            _status: {
              equals: 'published',
            },
          },
        ],
      },
    })

    counts[locale] = result.docs.length
    if (!postRouteSample && result.docs[0]?.slug) {
      postRouteSample = `/posts/${result.docs[0].slug}`
    }
  }

  return { counts, postRouteSample }
}

const countCollection = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: 'forms' | 'media' | 'pages' | 'posts' | 'site-settings',
  siteID: number,
): Promise<number> => {
  const countResult = await payload.count({
    collection,
    overrideAccess: true,
    where: {
      site: {
        equals: siteID,
      },
    },
  })

  return countResult.totalDocs
}

const toCanonicalURL = (
  host: string,
  defaultLocale: SupportedLocaleCode,
  locale: SupportedLocaleCode,
  path: string,
): string =>
  getSiteSitemapURL({ defaultLocale, locale, origin: `https://${host}`, path })

const buildRouteMatrix = (sites: SiteInventory[]): RouteRow[] => {
  const rows: RouteRow[] = []

  for (const site of sites) {
    const publicLocalesForSite = site.supportedLocales.filter((locale) => isPublicLocale(locale))
    const unsupportedLocale = (['ja', 'ko', 'fr', 'de'] as const).find(
      (locale) => !publicLocalesForSite.includes(locale),
    )

    for (const host of site.hosts) {
      const canonicalHost = site.canonicalDomain
        ? new URL(site.canonicalDomain).hostname
        : site.primaryDomain

      rows.push({
        evidenceFile: `staging-matrix/${site.name}-root-${host}.json`,
        expectedCanonical: toCanonicalURL(canonicalHost, site.defaultLocale, site.defaultLocale, '/'),
        expectedIndexability: 'index',
        expectedStatus: 200,
        expectedTenant: site.name,
        host,
        locale: site.defaultLocale,
        path: '/',
        routeType: 'root',
        site: site.name,
      })

      for (const locale of publicLocalesForSite) {
        const nestedPath = site.nestedRouteSamples[locale] || site.nestedRouteSamples[site.defaultLocale]
        const postPath = site.postRouteSample
        const formPath = site.formRouteSample

        rows.push({
          evidenceFile: `staging-matrix/${site.name}-${locale}-locale-root.json`,
          expectedCanonical: toCanonicalURL(canonicalHost, site.defaultLocale, locale, '/'),
          expectedIndexability: 'index',
          expectedStatus: 200,
          expectedTenant: site.name,
          host,
          locale,
          path: getLocalizedPath('/', locale),
          routeType: 'localized-root',
          site: site.name,
        })

        if (nestedPath) {
          rows.push({
            evidenceFile: `staging-matrix/${site.name}-${locale}-nested.json`,
            expectedCanonical: toCanonicalURL(canonicalHost, site.defaultLocale, locale, nestedPath),
            expectedIndexability: 'index',
            expectedStatus: 200,
            expectedTenant: site.name,
            host,
            locale,
            path: getLocalizedPath(nestedPath, locale),
            routeType: 'nested-page',
            site: site.name,
          })
        }

        rows.push({
          evidenceFile: `staging-matrix/${site.name}-${locale}-search.json`,
          expectedCanonical: toCanonicalURL(canonicalHost, site.defaultLocale, locale, '/search'),
          expectedIndexability: 'noindex',
          expectedStatus: 200,
          expectedTenant: site.name,
          host,
          locale,
          path: `${getLocalizedPath('/search', locale)}?q=baseline#results`,
          routeType: 'search',
          site: site.name,
        })

        if (postPath) {
          rows.push({
            evidenceFile: `staging-matrix/${site.name}-${locale}-post.json`,
            expectedCanonical: toCanonicalURL(canonicalHost, site.defaultLocale, locale, postPath),
            expectedIndexability: 'index',
            expectedStatus: 200,
            expectedTenant: site.name,
            host,
            locale,
            path: getLocalizedPath(postPath, locale),
            routeType: 'post-detail',
            site: site.name,
          })
        }

        if (formPath) {
          rows.push({
            evidenceFile: `staging-matrix/${site.name}-${locale}-form.json`,
            expectedCanonical: toCanonicalURL(canonicalHost, site.defaultLocale, locale, formPath),
            expectedIndexability: 'index',
            expectedStatus: 200,
            expectedTenant: site.name,
            host,
            locale,
            path: getLocalizedPath(formPath, locale),
            routeType: 'form-page',
            site: site.name,
          })
        }
      }

      rows.push({
        evidenceFile: `staging-matrix/${site.name}-missing.json`,
        expectedCanonical: '',
        expectedIndexability: 'noindex',
        expectedStatus: 404,
        expectedTenant: site.name,
        host,
        locale: site.defaultLocale,
        path: '/this-route-should-not-exist',
        routeType: 'missing-page',
        site: site.name,
      })

      if (unsupportedLocale) {
        rows.push({
          evidenceFile: `staging-matrix/${site.name}-${unsupportedLocale}-unsupported-locale.json`,
          expectedCanonical: '',
          expectedIndexability: 'noindex',
          expectedStatus: 404,
          expectedTenant: site.name,
          host,
          locale: unsupportedLocale,
          path: `/${unsupportedLocale}`,
          routeType: 'unsupported-locale',
          site: site.name,
        })
      }

      rows.push({
        evidenceFile: `staging-matrix/${site.name}-robots.json`,
        expectedCanonical: `https://${canonicalHost}/robots.txt`,
        expectedIndexability: 'noindex',
        expectedStatus: 200,
        expectedTenant: site.name,
        host,
        locale: site.defaultLocale,
        path: '/robots.txt',
        routeType: 'robots',
        site: site.name,
      })

      rows.push({
        evidenceFile: `staging-matrix/${site.name}-sitemap-index.json`,
        expectedCanonical: `https://${canonicalHost}/sitemap.xml`,
        expectedIndexability: 'noindex',
        expectedStatus: 200,
        expectedTenant: site.name,
        host,
        locale: site.defaultLocale,
        path: '/sitemap.xml',
        routeType: 'sitemap-index',
        site: site.name,
      })

      rows.push({
        evidenceFile: `staging-matrix/${site.name}-pages-sitemap.json`,
        expectedCanonical: `https://${canonicalHost}/pages-sitemap.xml`,
        expectedIndexability: 'noindex',
        expectedStatus: 200,
        expectedTenant: site.name,
        host,
        locale: site.defaultLocale,
        path: '/pages-sitemap.xml',
        routeType: 'pages-sitemap',
        site: site.name,
      })

      rows.push({
        evidenceFile: `staging-matrix/${site.name}-posts-sitemap.json`,
        expectedCanonical: `https://${canonicalHost}/posts-sitemap.xml`,
        expectedIndexability: 'noindex',
        expectedStatus: 200,
        expectedTenant: site.name,
        host,
        locale: site.defaultLocale,
        path: '/posts-sitemap.xml',
        routeType: 'posts-sitemap',
        site: site.name,
      })
    }

    rows.push({
      evidenceFile: `staging-matrix/${site.name}-local-alias.json`,
      expectedCanonical: '',
      expectedIndexability: 'noindex',
      expectedStatus: 200,
      expectedTenant: site.name,
      host: 'localhost',
      locale: site.defaultLocale,
      path: `/${site.localAlias}`,
      routeType: 'local-alias',
      site: site.name,
    })

    for (const host of site.hosts) {
      rows.push({
        evidenceFile: `staging-matrix/${site.name}-production-alias-rejection-${host}.json`,
        expectedCanonical: '',
        expectedIndexability: 'noindex',
        expectedStatus: 404,
        expectedTenant: site.name,
        host,
        locale: site.defaultLocale,
        path: `/${site.localAlias}`,
        routeType: 'production-alias-rejection',
        site: site.name,
      })
    }
  }

  return rows
}

const renderBaselineHealth = (sites: SiteInventory[], migrationHead: null | string) => {
  const lines = [
    '# Multisite baseline health',
    '',
    `- Generated at: \`${timestamp}\``,
    `- Git commit: \`${process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'unknown'}\``,
    `- Node environment: \`${process.env.NODE_ENV || 'development'}\``,
    `- Output root: \`${outputDir.replace(/\\/g, '/')}\``,
    `- Active sites: \`${sites.length}\``,
    '',
    '## Active sites',
    '',
  ]

  for (const site of sites) {
    lines.push(
      `- \`${site.name}\`: hosts=${site.hosts.join(', ')}; defaultLocale=${site.defaultLocale}; publicLocales=${site.publicLocales.join(', ')}; pages=${site.counts.pages}; posts=${site.counts.posts}; forms=${site.counts.forms}; media=${site.counts.media}; theme=${site.themeKey || 'n/a'}`,
    )
  }

  lines.push('', '## Migration head', '', `- Latest migration file: \`${migrationHead || 'unknown'}\``)

  return `${lines.join('\n')}\n`
}

const toCSV = (rows: RouteRow[]): string => {
  const header = [
    'site',
    'host',
    'locale',
    'path',
    'routeType',
    'expectedStatus',
    'expectedCanonical',
    'expectedTenant',
    'expectedIndexability',
    'evidenceFile',
  ]

  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`

  return [
    header.join(','),
    ...rows.map((row) =>
      [
        row.site,
        row.host,
        row.locale,
        row.path,
        row.routeType,
        row.expectedStatus,
        row.expectedCanonical,
        row.expectedTenant,
        row.expectedIndexability,
        row.evidenceFile,
      ]
        .map(escape)
        .join(','),
    ),
  ].join('\n')
}

const main = async () => {
  const payload = await getPayload({ config })
  const sitesResult = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 100,
    locale: 'en',
    overrideAccess: true,
    pagination: false,
    where: {
      isActive: {
        equals: true,
      },
    },
  })

  const siteInventory: SiteInventory[] = []

  for (const site of sitesResult.docs.sort((left, right) => left.code.localeCompare(right.code))) {
    const settingsResult = await payload.find({
      collection: 'site-settings',
      depth: 0,
      limit: 1,
      locale: site.defaultLocale,
      overrideAccess: true,
      pagination: false,
      where: {
        site: {
          equals: site.id,
        },
      },
    })

    const settings = settingsResult.docs[0] || null
    const pageInfo = await mapPagesByLocale(payload, site)
    const postInfo = await mapPostsByLocale(payload, site)

    siteInventory.push({
      additionalDomains: ((site.additionalDomains || []) as Array<{ domain?: null | string }>)
        .map(({ domain }) => domain?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value)),
      canonicalDomain: extractCanonicalDomain(settings),
      counts: {
        forms: await countCollection(payload, 'forms', site.id),
        media: await countCollection(payload, 'media', site.id),
        pages: await countCollection(payload, 'pages', site.id),
        pagesByLocale: pageInfo.counts,
        posts: await countCollection(payload, 'posts', site.id),
        postsByLocale: postInfo.counts,
        settings: await countCollection(payload, 'site-settings', site.id),
      },
      defaultLocale: site.defaultLocale as SupportedLocaleCode,
      formRouteSample: pageInfo.formRouteSample,
      // `hosts` is deliberately production/public-only. Local development
      // domains are recorded separately and must never be used for a
      // production alias-rejection or canonical/SEO assertion.
      hosts: toPublicHostList(site, extractCanonicalDomain(settings)),
      id: site.id,
      isActive: Boolean(site.isActive),
      localDevelopmentHosts: toLocalDevelopmentHostList(site),
      localAlias: siteCodeToAliasMap[site.code] || site.code,
      name: site.code,
      nestedRouteSamples: pageInfo.nestedRouteSamples,
      postRouteSample: postInfo.postRouteSample,
      primaryDomain: site.primaryDomain.trim().toLowerCase(),
      publicLocales: (site.supportedLocales as SupportedLocaleCode[]).filter((locale) =>
        isPublicLocale(locale),
      ),
      supportedLocales: site.supportedLocales as SupportedLocaleCode[],
      themeKey: extractThemeKey(settings),
    })
  }

  const routeRows = buildRouteMatrix(siteInventory)
  const migrationHead =
    (
      await readdir(resolve(process.cwd(), 'src', 'migrations'))
    )
      .filter((entry) => entry.endsWith('.json') || entry.endsWith('.ts'))
      .sort()
      .at(-1) || null
  const inventoryJSON = {
    generatedAt: timestamp,
    migrationHead,
    sites: siteInventory,
  }

  await mkdir(outputDir, { recursive: true })
  await writeFile(resolve(outputDir, 'site-inventory.json'), `${JSON.stringify(inventoryJSON, null, 2)}\n`)
  await writeFile(resolve(outputDir, 'baseline-matrix.csv'), `${toCSV(routeRows)}\n`)
  await writeFile(
    resolve(outputDir, 'baseline-health.md'),
    renderBaselineHealth(siteInventory, migrationHead),
  )

  console.log(
    JSON.stringify(
      {
        outputDir,
        routeRows: routeRows.length,
        sites: siteInventory.length,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
