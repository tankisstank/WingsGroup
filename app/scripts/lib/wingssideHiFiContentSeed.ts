import type { Where } from 'payload'

import { getWingsSideHiFiCopy } from '../../src/components/WingsSideHiFi/copy'
import type { WingsSideHiFiRouteVariant } from '../../src/fields/wingsSideHiFi'
import {
  WINGSSIDE_HIFI_PATH_TO_VARIANT,
  WINGSSIDE_HIFI_VARIANT_TO_PATH,
  resolveWingsSideHiFiPageModel,
  type WingsSideHiFiPageSource,
} from '../../src/utilities/wingsSideHiFiPageModel'
import { WINGSSIDE_HIFI_COMPOSER_ROUTES } from '../../src/utilities/wingsSideHiFiComposer'
import { wingsSideHiFiCardBindings } from '../../src/utilities/wingsSideHiFiMedia'

export const WINGSSIDE_HIFI_SEED_LOCALES = ['en', 'vi', 'it', 'es', 'pt'] as const
export type WingsSideHiFiSeedLocale = (typeof WINGSSIDE_HIFI_SEED_LOCALES)[number]

export type WingsSideHiFiSeedPageTarget = {
  pathname: string
  routeVariant: WingsSideHiFiRouteVariant
  slug: string
}

export type WingsSideHiFiSeedFieldChange = {
  field: string
  from?: unknown
  to?: unknown
}

export type WingsSideHiFiSeedPageReport = {
  changes: WingsSideHiFiSeedFieldChange[]
  /** Desired payload fails mandatory contract checks (independent of CMS presence). */
  hasContractGap: boolean
  locale: WingsSideHiFiSeedLocale
  /** No matching pages document for this locale/route. */
  missingPage: boolean
  pageId: number | string | null
  pathname: string
  routeVariant: WingsSideHiFiRouteVariant
  /**
   * Primary CMS/action status — not collapsed with contract gaps.
   * Contract issues are always listed in validationIssues + hasContractGap.
   */
  status: 'would_create_fields' | 'would_update' | 'unchanged' | 'missing_page'
  validationIssues: string[]
}

export type WingsSideHiFiSeedMode = 'offline' | 'db'

export type WingsSideHiFiSeedReport = {
  dryRun: true
  mode: WingsSideHiFiSeedMode
  localeCoverage: WingsSideHiFiSeedLocale[]
  pages: WingsSideHiFiSeedPageReport[]
  summary: {
    /** Rows with hasContractGap (desired payload issues), independent of missingPage. */
    validationGaps: number
    /** Rows with missingPage, independent of contract gaps. */
    missingPages: number
    totalTargets: number
    unchanged: number
    wouldMutate: number
  }
  /** Locale keys that were actually read from Payload (db mode only). */
  localesFetched?: WingsSideHiFiSeedLocale[]
}

const pathnameToSlug = (pathname: string): string => {
  if (pathname === '/' || pathname === '') return 'home'
  return pathname.replace(/^\//, '').split('/').filter(Boolean).join('-') || 'home'
}

export const listWingsSideHiFiSeedTargets = (): WingsSideHiFiSeedPageTarget[] =>
  WINGSSIDE_HIFI_COMPOSER_ROUTES.map((pathname) => ({
    pathname,
    routeVariant: WINGSSIDE_HIFI_PATH_TO_VARIANT[pathname],
    slug: pathnameToSlug(pathname),
  }))

const buildPayloadFromCopy = (
  locale: WingsSideHiFiSeedLocale,
  routeVariant: WingsSideHiFiRouteVariant,
): Record<string, unknown> => {
  const copy = getWingsSideHiFiCopy(locale)

  const common = {
    enabled: true,
    routeVariant,
  }

  switch (routeVariant) {
    case 'home':
      return {
        ...common,
        hero: {
          lede: copy.heroLede,
          primaryCta: { href: '/plan-your-trip', label: copy.home.planTripCta },
          secondaryCta: { href: '/destinations', label: copy.home.exploreDestinations },
          title: copy.heroTitle,
        },
        home: {
          closeCta: copy.home.closeCta,
          closeCtaSecondary: copy.home.closeCtaSecondary,
          closeLede: copy.home.closeLede,
          closeTitle: copy.home.closeTitle,
          // Only verified public credentials; empty when none are approved.
          credentials: copy.creds.slides,
          destKicker: copy.home.destKicker,
          destTitle: copy.home.destTitle,
          destLede: copy.home.destLede,
          journeysKicker: copy.home.journeysKicker,
          journeysLede: copy.home.journeysLede,
          journeysTitle: copy.home.journeysTitle,
          notes: copy.home.notes,
          notesKicker: copy.home.notesKicker,
          notesTitle: copy.home.notesTitle,
          pillars: copy.plan.steps,
          pillarsKicker: copy.home.pillarsKicker,
          pillarsLede: copy.home.pillarsLede,
          pillarsTitle: copy.home.pillarsTitle,
          related: copy.home.related,
          stylesKicker: copy.home.stylesKicker,
          stylesTitle: copy.home.stylesTitle,
          trust: copy.home.trust,
          whyCards: copy.home.whyCards,
          whyFeaturedBadge: copy.home.whyFeatured.badge,
          whyFeaturedBody: copy.home.whyFeatured.body,
          whyFeaturedCta: copy.home.whyFeatured.cta,
          whyFeaturedHref: copy.home.whyFeatured.href,
          whyFeaturedTitle: copy.home.whyFeatured.title,
          whyKicker: copy.home.whyKicker,
          whyTitle: copy.home.whyTitle,
        },
      }
    case 'plan':
      return {
        ...common,
        hero: {
          primaryCta: { href: '/plan-your-trip', label: copy.home.planTripCta },
          title: copy.plan.stepsTitle,
          lede: copy.plan.stepsLede,
        },
        plan: {
          explore: copy.plan.explore,
          exploreTitle: copy.plan.exploreTitle,
          faqTitle: copy.plan.faqTitle,
          steps: copy.plan.steps,
          stepsKicker: copy.plan.stepsKicker,
          stepsLede: copy.plan.stepsLede,
          stepsTitle: copy.plan.stepsTitle,
        },
      }
    case 'destinations':
      return {
        ...common,
        hero: {
          primaryCta: { href: '/plan-your-trip', label: copy.home.planTripCta },
          title: copy.destinations.deeperTitle,
        },
        destinations: {
          closingLinks: [
            { body: copy.plan.explore[0]?.body, href: '/plan-your-trip', title: copy.home.planTripCta },
            { body: copy.plan.explore[1]?.body, href: '/styles', title: 'Styles' },
            { body: copy.plan.explore[2]?.body, href: '/packages', title: 'Packages' },
          ],
          closingTitle: 'Shortlist regions - then send one brief',
          deeperTitle: copy.destinations.deeperTitle,
          places: copy.destinations.places,
          routes: copy.destinations.routes,
          routesTitle: copy.destinations.routesTitle,
        },
      }
    case 'styles':
      return {
        ...common,
        hero: {
          primaryCta: { href: '/plan-your-trip', label: copy.home.planTripCta },
          title: copy.styles.introTitle,
        },
        styles: {
          closingLinks: [
            { body: 'Carry style into the full brief.', href: '/plan-your-trip', title: copy.home.planTripCta },
          ],
          closingTitle: copy.styles.cta,
          introTitle: copy.styles.introTitle,
          styles: copy.styles.styles,
        },
      }
    case 'packages': {
      const cards = copy.packages.cards.map((card, index) => ({
        ...card,
        customizeLabel: 'Customize',
        mediaKey: wingsSideHiFiCardBindings.packages[index]?.asset,
        viewLabel: 'View itinerary',
      }))
      // Hi-fi expects 5 cards; existing copy/media currently has 3 — dry-run reports the gap.
      return {
        ...common,
        hero: {
          primaryCta: { href: '/plan-your-trip', label: copy.home.planTripCta },
          secondaryCta: { href: '/contact-us', label: copy.home.closeCtaSecondary },
          title: copy.packages.gridTitle,
        },
        packages: {
          cards,
          closingLinks: [
            { body: 'Send month and group size.', href: '/plan-your-trip', title: copy.home.planTripCta },
            { body: 'Browse regions first.', href: '/destinations', title: 'Destinations' },
            { body: 'Match travel style.', href: '/styles', title: 'Styles' },
          ],
          closingNote: 'Private frames — not locked group seats.',
          closingTitle: 'Have dates already?',
          gridLede: copy.packages.gridLede,
          gridTitle: copy.packages.gridTitle,
        },
      }
    }
    case 'guide':
      return {
        ...common,
        hero: {
          primaryCta: { href: '/plan-your-trip', label: copy.home.planTripCta },
          title: copy.guide.listTitle,
        },
        guide: {
          closingCta: copy.guide.cta,
          closingHref: '/plan-your-trip',
          closingTitle: 'Notes done - ready to brief?',
          listTitle: copy.guide.listTitle,
          notes: copy.guide.notes,
        },
      }
    case 'about':
      return {
        ...common,
        hero: {
          primaryCta: { href: '/plan-your-trip', label: copy.home.planTripCta },
          title: copy.about.storyTitle,
        },
        about: {
          closingLinks: [
            { body: 'Start with a short brief.', href: '/plan-your-trip', title: copy.home.planTripCta },
            { body: 'Message the desk.', href: '/contact-us', title: copy.home.closeCtaSecondary },
          ],
          closingTitle: 'Ready to plan with us?',
          promises: copy.about.promises,
          promisesTitle: copy.about.promisesTitle,
          stepsTitle: copy.about.stepsTitle,
          storyTitle: copy.about.storyTitle,
          teamLede: copy.about.teamLede,
          teamTitle: copy.about.teamTitle,
        },
      }
    case 'contact':
      return {
        ...common,
        hero: {
          primaryCta: { href: '/plan-your-trip', label: copy.home.planTripCta },
          title: copy.contact.channelsTitle,
        },
        contact: {
          channels: copy.contact.channels,
          channelsTitle: copy.contact.channelsTitle,
          closingCta: copy.home.planTripCta,
          closingHref: '/plan-your-trip',
          closingLinks: [
            { body: 'Open the full brief.', href: '/plan-your-trip', title: copy.home.planTripCta },
            { body: 'Browse sample journeys.', href: '/packages', title: 'Packages' },
          ],
          closingTitle: 'Prefer a structured brief?',
          nextSteps: copy.contact.nextSteps.map((step) =>
            typeof step === 'string' ? { body: '', title: step } : step,
          ),
          nextTitle: copy.contact.nextTitle,
        },
      }
    default:
      return common
  }
}

const shallowDiff = (
  current: Record<string, unknown> | null | undefined,
  next: Record<string, unknown>,
  prefix = 'wingsSideHiFi',
): WingsSideHiFiSeedFieldChange[] => {
  const changes: WingsSideHiFiSeedFieldChange[] = []
  for (const [key, to] of Object.entries(next)) {
    const field = `${prefix}.${key}`
    const from = current?.[key]
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ field, from, to })
    }
  }
  return changes
}

type PageLike = WingsSideHiFiPageSource & {
  id: number | string
  pathname?: null | string
  slug?: null | string
}

/** Minimal Payload surface used by the dry-run (for tests / real adapter). */
export type WingsSideHiFiSeedFindArgs = {
  collection: string
  depth?: number
  limit?: number
  locale?: string
  where?: Where
}

export type WingsSideHiFiSeedPayload = {
  destroy?: () => Promise<void>
  find: (args: WingsSideHiFiSeedFindArgs) => Promise<{ docs: unknown[] }>
}

const matchPage = (page: PageLike, target: WingsSideHiFiSeedPageTarget): boolean => {
  const normalized = target.pathname.replace(/\/+$/, '') || '/'
  const path = (page.pathname || '').replace(/\/+$/, '') || '/'
  const slug = page.slug || ''
  return (
    path === normalized ||
    slug === target.slug ||
    (normalized === '/' && (slug === 'home' || slug === 'index' || path === '/'))
  )
}

const targetWhereClauses = (targets: WingsSideHiFiSeedPageTarget[]): Where[] =>
  targets.flatMap((target) => {
    const clauses: Where[] = [
      { pathname: { equals: target.pathname } },
      { pathname: { equals: target.pathname === '/' ? '' : target.pathname } },
      { slug: { equals: target.slug } },
    ]
    if (target.pathname === '/') {
      clauses.push({ slug: { equals: 'home' } }, { slug: { equals: 'index' } })
    }
    return clauses
  })

/**
 * Fetch hub pages for a single locale from Payload.
 * Exported for unit tests of per-locale read behavior.
 */
export const fetchWingsSideHiFiPagesForLocale = async (args: {
  locale: WingsSideHiFiSeedLocale
  payload: WingsSideHiFiSeedPayload
  siteCode?: string
  targets?: WingsSideHiFiSeedPageTarget[]
}): Promise<PageLike[]> => {
  const targets = args.targets || listWingsSideHiFiSeedTargets()
  const siteCode = args.siteCode || 'wings-side'
  const sites = await args.payload.find({
    collection: 'sites',
    depth: 0,
    limit: 5,
    where: { code: { equals: siteCode } },
  })
  const siteDoc = sites.docs[0] as { id?: number | string } | undefined
  const siteId = siteDoc?.id
  if (siteId == null) return []

  const found = await args.payload.find({
    collection: 'pages',
    depth: 0,
    limit: 50,
    locale: args.locale,
    where: {
      and: [{ site: { equals: siteId } }, { or: targetWhereClauses(targets) }],
    },
  })
  return found.docs as PageLike[]
}

const validateDesiredPayload = (
  desired: Record<string, unknown>,
  locale: WingsSideHiFiSeedLocale,
  target: WingsSideHiFiSeedPageTarget,
  page: PageLike | null,
) => {
  // Contract validation runs on the desired payload itself, independent of DB existence.
  const model = resolveWingsSideHiFiPageModel({
    locale,
    page: {
      ...(page || { id: 'virtual', slug: target.slug, pathname: target.pathname }),
      wingsSideHiFi: desired as WingsSideHiFiPageSource['wingsSideHiFi'],
    },
    publicPathname: `/wingsside${target.pathname === '/' ? '' : target.pathname}`,
  })
  return {
    hasCritical: (model?.issues || []).some((issue) => issue.severity === 'critical'),
    validationIssues: (model?.issues || []).map((issue) => `${issue.code}: ${issue.message}`),
  }
}

const summarizeSeedPages = (pages: WingsSideHiFiSeedPageReport[]) => ({
  // Facts counted independently — never collapse missing vs contract gap.
  missingPages: pages.filter((p) => p.missingPage).length,
  totalTargets: pages.length,
  unchanged: pages.filter((p) => p.status === 'unchanged').length,
  validationGaps: pages.filter((p) => p.hasContractGap).length,
  wouldMutate: pages.filter((p) => p.status === 'would_update' || p.status === 'would_create_fields')
    .length,
})

const reportPageRow = (args: {
  desired: Record<string, unknown>
  locale: WingsSideHiFiSeedLocale
  page: PageLike | null
  target: WingsSideHiFiSeedPageTarget
}): WingsSideHiFiSeedPageReport => {
  const { desired, locale, page, target } = args
  const { hasCritical, validationIssues: contractIssues } = validateDesiredPayload(
    desired,
    locale,
    target,
    page,
  )

  if (!page) {
    return {
      changes: Object.keys(desired).map((field) => ({
        field: `wingsSideHiFi.${field}`,
        to: desired[field],
      })),
      hasContractGap: hasCritical,
      locale,
      missingPage: true,
      pageId: null,
      pathname: target.pathname,
      routeVariant: target.routeVariant,
      status: 'missing_page',
      validationIssues: [
        `No pages document for ${target.pathname} (${target.slug})`,
        ...contractIssues,
      ],
    }
  }

  const currentGroup = (page.wingsSideHiFi || null) as Record<string, unknown> | null
  const changes = shallowDiff(currentGroup, desired)

  return {
    changes,
    hasContractGap: hasCritical,
    locale,
    missingPage: false,
    pageId: page.id,
    pathname: target.pathname,
    routeVariant: target.routeVariant,
    status:
      changes.length === 0
        ? 'unchanged'
        : currentGroup?.enabled
          ? 'would_update'
          : 'would_create_fields',
    validationIssues: contractIssues,
  }
}

/**
 * Pure offline dry-run from Copy.ts contract only (no Payload, no hang).
 * Default operational mode for agents and CI.
 */
export const buildWingsSideHiFiContentSeedOfflineDryRun = (args?: {
  locale?: WingsSideHiFiSeedLocale | 'all'
  pagesByLocale?: Partial<Record<WingsSideHiFiSeedLocale, PageLike[]>>
}): WingsSideHiFiSeedReport => {
  const locales: WingsSideHiFiSeedLocale[] =
    !args?.locale || args.locale === 'all' ? [...WINGSSIDE_HIFI_SEED_LOCALES] : [args.locale]
  const targets = listWingsSideHiFiSeedTargets()
  const pages: WingsSideHiFiSeedPageReport[] = []

  for (const locale of locales) {
    const localePages = args?.pagesByLocale?.[locale] || []
    for (const target of targets) {
      const page = localePages.find((doc) => matchPage(doc, target)) || null
      const desired = buildPayloadFromCopy(locale, target.routeVariant)
      pages.push(reportPageRow({ desired, locale, page, target }))
    }
  }

  return {
    dryRun: true,
    mode: 'offline',
    localeCoverage: locales,
    pages,
    summary: summarizeSeedPages(pages),
  }
}

/**
 * DB-backed dry-run: fetch and compare each requested locale independently.
 * Does not mutate. Caller owns Payload lifecycle (must destroy in finally).
 */
export const buildWingsSideHiFiContentSeedDbDryRun = async (args: {
  locale?: WingsSideHiFiSeedLocale | 'all'
  payload: WingsSideHiFiSeedPayload
  siteCode?: string
}): Promise<WingsSideHiFiSeedReport> => {
  if (!args.payload) {
    throw new Error('DB dry-run requires a Payload instance')
  }

  const locales: WingsSideHiFiSeedLocale[] =
    !args.locale || args.locale === 'all' ? [...WINGSSIDE_HIFI_SEED_LOCALES] : [args.locale]
  const targets = listWingsSideHiFiSeedTargets()
  const pages: WingsSideHiFiSeedPageReport[] = []
  const localesFetched: WingsSideHiFiSeedLocale[] = []

  for (const locale of locales) {
    const localePages = await fetchWingsSideHiFiPagesForLocale({
      locale,
      payload: args.payload,
      siteCode: args.siteCode,
      targets,
    })
    localesFetched.push(locale)

    for (const target of targets) {
      const page = localePages.find((doc) => matchPage(doc, target)) || null
      const desired = buildPayloadFromCopy(locale, target.routeVariant)
      pages.push(reportPageRow({ desired, locale, page, target }))
    }
  }

  return {
    dryRun: true,
    mode: 'db',
    localeCoverage: locales,
    localesFetched,
    pages,
    summary: summarizeSeedPages(pages),
  }
}

/**
 * Idempotent dry-run seed report.
 * - mode `offline` (default): pure Copy.ts contract, no Payload
 * - mode `db`: requires payload; per-locale reads; no mutations
 */
export const buildWingsSideHiFiContentSeedDryRun = async (args: {
  locale?: WingsSideHiFiSeedLocale | 'all'
  mode?: WingsSideHiFiSeedMode
  pages?: PageLike[]
  pagesByLocale?: Partial<Record<WingsSideHiFiSeedLocale, PageLike[]>>
  payload?: WingsSideHiFiSeedPayload | null
  siteCode?: string
}): Promise<WingsSideHiFiSeedReport> => {
  const mode: WingsSideHiFiSeedMode = args.mode || (args.payload ? 'db' : 'offline')

  if (mode === 'offline') {
    const locales: WingsSideHiFiSeedLocale[] =
      !args.locale || args.locale === 'all' ? [...WINGSSIDE_HIFI_SEED_LOCALES] : [args.locale]
    // Back-compat: single `pages` array is treated as shared across locales only when
    // pagesByLocale is absent (tests / pure contract without CMS state).
    const pagesByLocale =
      args.pagesByLocale ||
      (args.pages
        ? Object.fromEntries(locales.map((locale) => [locale, args.pages!]))
        : undefined)
    return buildWingsSideHiFiContentSeedOfflineDryRun({
      locale: args.locale,
      pagesByLocale,
    })
  }

  if (!args.payload) {
    throw new Error('mode=db requires payload')
  }

  return buildWingsSideHiFiContentSeedDbDryRun({
    locale: args.locale,
    payload: args.payload,
    siteCode: args.siteCode,
  })
}

/** Ensure Payload is destroyed even when the dry-run throws. */
export const withPayloadDestroy = async <T>(
  payload: WingsSideHiFiSeedPayload | null | undefined,
  work: () => Promise<T>,
): Promise<T> => {
  try {
    return await work()
  } finally {
    if (payload && typeof payload.destroy === 'function') {
      await payload.destroy()
    }
  }
}

export const formatWingsSideHiFiSeedReport = (report: WingsSideHiFiSeedReport): string => {
  const lines = [
    'WingSide hi-fi content seed — DRY RUN (no mutations)',
    `Mode: ${report.mode}`,
    `Locales: ${report.localeCoverage.join(', ')}`,
    report.localesFetched ? `Locales fetched: ${report.localesFetched.join(', ')}` : null,
    `Targets: ${report.summary.totalTargets}`,
    `Would mutate: ${report.summary.wouldMutate}`,
    `Unchanged: ${report.summary.unchanged}`,
    `Missing pages: ${report.summary.missingPages}`,
    `Validation gaps: ${report.summary.validationGaps}`,
    '',
  ].filter((line): line is string => line != null)

  for (const page of report.pages) {
    lines.push(
      `[${page.status}] ${page.locale} ${page.pathname} (${page.routeVariant}) pageId=${page.pageId ?? '—'} changes=${page.changes.length}`,
    )
    if (page.validationIssues.length) {
      for (const issue of page.validationIssues.slice(0, 5)) {
        lines.push(`  ! ${issue}`)
      }
    }
  }

  lines.push('')
  lines.push('Apply is disabled in tranche A. Re-run with an explicit future --apply flag when approved.')
  return lines.join('\n')
}

/** Pure helper for unit tests — no Payload. */
export const previewWingsSideHiFiSeedPayload = (
  locale: WingsSideHiFiSeedLocale,
  routeVariant: WingsSideHiFiRouteVariant,
) => buildPayloadFromCopy(locale, routeVariant)

export const wingsSideHiFiSeedRoutePaths = () =>
  (Object.keys(WINGSSIDE_HIFI_VARIANT_TO_PATH) as WingsSideHiFiRouteVariant[]).map((variant) => ({
    path: WINGSSIDE_HIFI_VARIANT_TO_PATH[variant],
    variant,
  }))
