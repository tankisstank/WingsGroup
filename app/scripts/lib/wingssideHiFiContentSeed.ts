import type { Where } from 'payload'
import { createHash } from 'node:crypto'

import { getWingsSideHiFiCopy } from '../../src/components/WingsSideHiFi/copy'
import {
  getWingsSideSecondaryHeroCopy,
  type WingsSideSecondaryRoute,
} from '../../src/components/WingsSideHiFi/secondaryCopy'
import type { WingsSideHiFiRouteVariant } from '../../src/fields/wingsSideHiFi'
import {
  WINGSSIDE_HIFI_PATH_TO_VARIANT,
  WINGSSIDE_HIFI_VARIANT_TO_PATH,
  resolveWingsSideHiFiPageModel,
  type WingsSideHiFiPageSource,
} from '../../src/utilities/wingsSideHiFiPageModel'
import { WINGSSIDE_HIFI_COMPOSER_ROUTES } from '../../src/utilities/wingsSideHiFiComposer'
import { wingsSideHiFiCardBindings } from '../../src/utilities/wingsSideHiFiMedia'
import { wingsSideLocalizationBackfillContext } from '../../src/utilities/wingsSideLocalizationBackfillContext'
import { applyWingsSideEditorialTerminology } from './wingssideEditorialTerminology'

export const WINGSSIDE_HIFI_SEED_LOCALES = ['en', 'vi', 'it', 'es', 'pt'] as const
export type WingsSideHiFiSeedLocale = (typeof WINGSSIDE_HIFI_SEED_LOCALES)[number]

/** Stable catalog title — never hardcode numeric form IDs (they differ per environment). */
export const WINGSSIDE_HIFI_PLAN_FORM_TITLE = 'WingSide Trip Planner'
export const WINGSSIDE_HIFI_SEED_SITE_CODE = 'wing-side'

export type WingsSideHiFiPlanFormResolveResult =
  | { ok: true; formId: number | string; title: string; siteId: number | string }
  | {
      ok: false
      formId: null
      reason: 'missing' | 'ambiguous' | 'site_missing' | 'unowned'
      detail: string
      candidates: Array<{ id: number | string; siteId?: number | string | null; title?: string }>
    }

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
  dryRun: boolean
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

const buildRawPayloadFromCopy = (
  locale: WingsSideHiFiSeedLocale,
  routeVariant: WingsSideHiFiRouteVariant,
): Record<string, unknown> => {
  const copy = getWingsSideHiFiCopy(locale)

  const common = {
    enabled: true,
    routeVariant,
  }

  const secondaryHero = (route: WingsSideSecondaryRoute) => {
    const hero = getWingsSideSecondaryHeroCopy(locale, route)
    const primaryHref: Record<WingsSideSecondaryRoute, string> = {
      '/about-us': '/plan-your-trip',
      '/contact-us': '#contact-form',
      '/destinations': '#dest-grid',
      '/packages': '#pkg-grid',
      '/styles': '#style-grid',
      '/travel-guide': '#guide-list',
    }
    return {
      eyebrow: hero.eyebrow,
      lede: hero.lede,
      primaryCta: { href: primaryHref[route], label: hero.primary },
      secondaryCta: { href: '/plan-your-trip', label: hero.secondary },
      title: hero.title,
    }
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
          // Dedicated plan hero — never use stepsTitle as H1.
          primaryCta: { href: '#brief', label: copy.plan.primaryCtaLabel },
          secondaryCta: { href: '/destinations', label: copy.home.exploreDestinations },
          title: copy.plan.heroTitle,
          lede: copy.plan.heroLede,
        },
        plan: {
          explore: copy.plan.explore,
          exploreTitle: copy.plan.exploreTitle,
          faq: copy.plan.faq.map((item) => ({
            answer: item.answer,
            question: item.question,
          })),
          faqTitle: copy.plan.faqTitle,
          // Form relationship is resolved at DB seed/apply time by stable title + site.
          // Offline pure contract never hardcodes environment-specific numeric IDs.
          form: null,
          heroLede: copy.plan.heroLede,
          steps: copy.plan.steps,
          stepsKicker: copy.plan.stepsKicker,
          stepsLede: copy.plan.stepsLede,
          stepsTitle: copy.plan.stepsTitle,
        },
      }
    case 'destinations':
      return {
        ...common,
        hero: secondaryHero('/destinations'),
        destinations: {
          closingLinks: [
            {
              body: copy.plan.explore[0]?.body,
              href: '/plan-your-trip',
              title: copy.home.planTripCta,
            },
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
        hero: secondaryHero('/styles'),
        styles: {
          closingLinks: [
            {
              body: 'Carry style into the full brief.',
              href: '/plan-your-trip',
              title: copy.home.planTripCta,
            },
          ],
          closingTitle: copy.styles.cta,
          introTitle: copy.styles.introTitle,
          styles: copy.styles.styles,
        },
      }
    case 'packages': {
      // mediaKey is not a CMS field (upload relation is `media`). Do not seed unknown keys.
      const cards = copy.packages.cards.map((card) => ({
        ...card,
        customizeLabel: 'Customize',
        viewLabel: 'View itinerary',
      }))
      // Contract: five journey cards (seed must not leave a known gap).
      while (cards.length < 5) {
        const index = cards.length
        const binding = wingsSideHiFiCardBindings.packages[index]
        cards.push({
          badge: binding?.badge || 'FRAME',
          body: binding?.body || 'Private journey frame for reaction, not a locked group product.',
          customizeLabel: 'Customize',
          href: binding?.href || '/packages',
          micro: 'Private · customize',
          note: 'Indicative · customize',
          priceFrom: 'On request',
          priceUnit: '',
          title: binding?.title || `Journey frame ${index + 1}`,
          viewLabel: 'View itinerary',
        })
      }
      return {
        ...common,
        hero: secondaryHero('/packages'),
        packages: {
          cards,
          closingLinks: [
            {
              body: 'Send month and group size.',
              href: '/plan-your-trip',
              title: copy.home.planTripCta,
            },
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
        hero: secondaryHero('/travel-guide'),
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
        hero: secondaryHero('/about-us'),
        about: {
          closingLinks: [
            {
              body: 'Start with a short brief.',
              href: '/plan-your-trip',
              title: copy.home.planTripCta,
            },
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
        hero: secondaryHero('/contact-us'),
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

const buildPayloadFromCopy = (
  locale: WingsSideHiFiSeedLocale,
  routeVariant: WingsSideHiFiRouteVariant,
): Record<string, unknown> =>
  applyWingsSideEditorialTerminology(buildRawPayloadFromCopy(locale, routeVariant), locale)

/**
 * Seed desired ⊆ CMS current is enough for idempotency.
 * Extra CMS-only keys (hero.media/eyebrow, null media on cards) are ignored.
 * Array row ids and relationship expansions are normalized away.
 */
const valuesEquivalent = (from: unknown, to: unknown): boolean => {
  if (to == null) return from == null
  if (typeof to !== 'object') return from === to

  // Relationship: desired number/string vs populated object
  if (typeof to === 'number' || typeof to === 'string') {
    if (from === to) return true
    if (from && typeof from === 'object' && 'id' in (from as object)) {
      return (from as { id?: unknown }).id === to
    }
    return false
  }

  if (Array.isArray(to)) {
    if (!Array.isArray(from) || from.length !== to.length) return false
    return to.every((item, index) => valuesEquivalent(from[index], item))
  }

  if (!from || typeof from !== 'object' || Array.isArray(from)) return false
  const fromObj = from as Record<string, unknown>
  const toObj = to as Record<string, unknown>
  // Relationship-shaped CMS object vs seed id already handled above for primitives.
  if (
    'id' in toObj &&
    Object.keys(toObj).length <= 2 &&
    !('href' in toObj) &&
    !('title' in toObj && 'body' in toObj)
  ) {
    return valuesEquivalent(fromObj.id ?? from, toObj.id)
  }

  for (const [key, desiredVal] of Object.entries(toObj)) {
    if (key === 'id') continue
    if (desiredVal == null) continue
    if (!valuesEquivalent(fromObj[key], desiredVal)) return false
  }
  return true
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
    if (!valuesEquivalent(from, to)) {
      changes.push({ field, from, to })
    }
  }
  return changes
}

/**
 * Prefer existing CMS array row IDs (by index) so re-apply does not churn IDs.
 * Falls back to deterministic stable IDs for new rows.
 */
export const mergeStableArrayRowIds = (
  desired: unknown,
  current: unknown,
  path = 'root',
): unknown => {
  if (Array.isArray(desired)) {
    const currentRows = Array.isArray(current) ? current : []
    return desired.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return item
      const row = item as Record<string, unknown>
      const existing = currentRows[index]
      const existingId =
        existing && typeof existing === 'object' && !Array.isArray(existing)
          ? (existing as { id?: unknown }).id
          : undefined
      const id =
        typeof row.id === 'string' || typeof row.id === 'number'
          ? row.id
          : typeof existingId === 'string' || typeof existingId === 'number'
            ? existingId
            : `ws-hifi-${path}-${index + 1}`
      const merged: Record<string, unknown> = { ...row, id }
      for (const [key, child] of Object.entries(merged)) {
        if (key === 'id') continue
        const currentChild =
          existing && typeof existing === 'object' && !Array.isArray(existing)
            ? (existing as Record<string, unknown>)[key]
            : undefined
        merged[key] = mergeStableArrayRowIds(child, currentChild, `${path}.${key}`)
      }
      return merged
    })
  }
  if (desired && typeof desired === 'object') {
    const out: Record<string, unknown> = {}
    const currentObj =
      current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : null
    for (const [key, child] of Object.entries(desired as Record<string, unknown>)) {
      out[key] = mergeStableArrayRowIds(child, currentObj?.[key], `${path}.${key}`)
    }
    return out
  }
  return desired
}

type PageLike = WingsSideHiFiPageSource & {
  id: number | string
  pathname?: null | string
  slug?: null | string
}

/** Minimal Payload surface used by the dry-run / apply (for tests / real adapter). */
export type WingsSideHiFiSeedFindArgs = {
  collection: string
  depth?: number
  limit?: number
  locale?: string
  where?: Where
}

export type WingsSideHiFiSeedUpdateArgs = {
  collection: string
  context?: Record<string, unknown>
  data: Record<string, unknown>
  depth?: number
  disableTransaction?: boolean
  id: number | string
  locale?: string
  overrideAccess?: boolean
  req?: unknown
}

export type WingsSideHiFiSeedPayload = {
  destroy?: () => Promise<void>
  find: (args: WingsSideHiFiSeedFindArgs) => Promise<{ docs: unknown[] }>
  update?: (args: WingsSideHiFiSeedUpdateArgs) => Promise<unknown>
}

type FormLike = {
  id: number | string
  site?: number | string | { id?: number | string; code?: string } | null
  title?: string | null
}

const formSiteId = (form: FormLike): number | string | null => {
  if (form.site == null) return null
  if (typeof form.site === 'number' || typeof form.site === 'string') return form.site
  return form.site.id ?? null
}

/**
 * Resolve the existing WingSide Trip Planner form by stable title + site ownership.
 * Fail closed when missing, unowned, or ambiguous — never invent a form or hardcode IDs.
 */
export const resolveWingsSideHiFiPlanForm = async (args: {
  formTitle?: string
  payload: WingsSideHiFiSeedPayload
  siteCode?: string
}): Promise<WingsSideHiFiPlanFormResolveResult> => {
  const formTitle = args.formTitle || WINGSSIDE_HIFI_PLAN_FORM_TITLE
  const siteCode = args.siteCode || WINGSSIDE_HIFI_SEED_SITE_CODE

  const sites = await args.payload.find({
    collection: 'sites',
    depth: 0,
    limit: 5,
    where: { code: { equals: siteCode } },
  })
  const siteDoc = sites.docs[0] as { id?: number | string; code?: string } | undefined
  const siteId = siteDoc?.id
  if (siteId == null) {
    return {
      ok: false,
      formId: null,
      reason: 'site_missing',
      detail: `No site with code "${siteCode}"`,
      candidates: [],
    }
  }

  const found = await args.payload.find({
    collection: 'forms',
    depth: 0,
    limit: 20,
    where: {
      and: [{ title: { equals: formTitle } }, { site: { equals: siteId } }],
    },
  })
  const owned = (found.docs as FormLike[]).filter((doc) => formSiteId(doc) === siteId)

  // Secondary scan: same title with any site, to distinguish unowned vs missing.
  if (owned.length === 0) {
    const byTitle = await args.payload.find({
      collection: 'forms',
      depth: 0,
      limit: 20,
      where: { title: { equals: formTitle } },
    })
    const titleMatches = byTitle.docs as FormLike[]
    if (titleMatches.length === 0) {
      return {
        ok: false,
        formId: null,
        reason: 'missing',
        detail: `No form titled "${formTitle}" for site ${siteCode}`,
        candidates: [],
      }
    }
    return {
      ok: false,
      formId: null,
      reason: 'unowned',
      detail: `Form titled "${formTitle}" exists but is not owned by site ${siteCode}`,
      candidates: titleMatches.map((doc) => ({
        id: doc.id,
        siteId: formSiteId(doc),
        title: doc.title || undefined,
      })),
    }
  }

  if (owned.length > 1) {
    return {
      ok: false,
      formId: null,
      reason: 'ambiguous',
      detail: `Multiple forms titled "${formTitle}" for site ${siteCode} (${owned.length})`,
      candidates: owned.map((doc) => ({
        id: doc.id,
        siteId: formSiteId(doc),
        title: doc.title || undefined,
      })),
    }
  }

  const form = owned[0]!
  return {
    ok: true,
    formId: form.id,
    title: form.title || formTitle,
    siteId,
  }
}

/** Attach the stable planner form to both conversion routes. */
export const attachResolvedPlanForm = (
  desired: Record<string, unknown>,
  formId: number | string | null,
): Record<string, unknown> => {
  const variant = desired.routeVariant
  if (variant !== 'plan' && variant !== 'contact') return desired
  const key = variant === 'plan' ? 'plan' : 'contact'
  const content = (desired[key] && typeof desired[key] === 'object' ? desired[key] : {}) as Record<
    string,
    unknown
  >
  return {
    ...desired,
    [key]: {
      ...content,
      form: formId,
    },
  }
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
  const siteCode = args.siteCode || 'wing-side'
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
  wouldMutate: pages.filter(
    (p) => p.status === 'would_update' || p.status === 'would_create_fields',
  ).length,
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
  // Align write shape with CMS row IDs before compare so dry-run matches apply.
  const prepared = mergeStableArrayRowIds(desired, currentGroup, target.routeVariant) as Record<
    string,
    unknown
  >
  const changes = shallowDiff(currentGroup, prepared)

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
    // Expose prepared payload for apply path consumers via changes[].to when needed.
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
 * Plan form relationship is resolved by stable title + site — never hardcoded IDs.
 */
export const buildWingsSideHiFiContentSeedDbDryRun = async (args: {
  locale?: WingsSideHiFiSeedLocale | 'all'
  payload: WingsSideHiFiSeedPayload
  siteCode?: string
}): Promise<WingsSideHiFiSeedReport> => {
  if (!args.payload) {
    throw new Error('DB dry-run requires a Payload instance')
  }

  const siteCode = args.siteCode || WINGSSIDE_HIFI_SEED_SITE_CODE
  const locales: WingsSideHiFiSeedLocale[] =
    !args.locale || args.locale === 'all' ? [...WINGSSIDE_HIFI_SEED_LOCALES] : [args.locale]
  const targets = listWingsSideHiFiSeedTargets()
  const pages: WingsSideHiFiSeedPageReport[] = []
  const localesFetched: WingsSideHiFiSeedLocale[] = []

  const planForm = await resolveWingsSideHiFiPlanForm({
    payload: args.payload,
    siteCode,
  })
  const resolvedFormId = planForm.ok ? planForm.formId : null
  const planFormIssue = planForm.ok ? null : `plan_form_${planForm.reason}: ${planForm.detail}`

  for (const locale of locales) {
    const localePages = await fetchWingsSideHiFiPagesForLocale({
      locale,
      payload: args.payload,
      siteCode,
      targets,
    })
    localesFetched.push(locale)

    for (const target of targets) {
      const page = localePages.find((doc) => matchPage(doc, target)) || null
      let desired = buildPayloadFromCopy(locale, target.routeVariant)
      if (target.routeVariant === 'plan' || target.routeVariant === 'contact') {
        desired = attachResolvedPlanForm(desired, resolvedFormId)
      }
      const row = reportPageRow({ desired, locale, page, target })
      if ((target.routeVariant === 'plan' || target.routeVariant === 'contact') && planFormIssue) {
        row.validationIssues = [...row.validationIssues, planFormIssue]
        row.hasContractGap = true
      }
      pages.push(row)
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
      (args.pages ? Object.fromEntries(locales.map((locale) => [locale, args.pages!])) : undefined)
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

export const formatWingsSideHiFiSeedReport = (
  report: WingsSideHiFiSeedReport,
  options?: { applied?: boolean },
): string => {
  const header = options?.applied
    ? 'WingSide hi-fi content seed — APPLY RESULT'
    : 'WingSide hi-fi content seed — DRY RUN (no mutations)'
  const lines = [
    header,
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
  if (options?.applied) {
    lines.push(
      'Apply completed for the requested site only. Re-run dry-run to confirm idempotence.',
    )
  } else {
    lines.push(
      'Apply requires --db --site-code=<code> --apply. Offline mode never mutates. Form IDs are resolved by title+site, never hardcoded.',
    )
  }
  return lines.join('\n')
}

/**
 * Stamp stable array row IDs so EN/VI/IT/ES/PT localization updates the same rows.
 * Deterministic across environments (not random, not env-specific).
 */
export const stampStableArrayRowIds = (value: unknown, path = 'root'): unknown => {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const row = item as Record<string, unknown>
        const stamped = {
          ...row,
          id:
            typeof row.id === 'string' || typeof row.id === 'number'
              ? row.id
              : `ws-hifi-${path}-${index + 1}`,
        }
        const nested: Record<string, unknown> = {}
        for (const [key, child] of Object.entries(stamped)) {
          if (key === 'id') {
            nested[key] = child
            continue
          }
          nested[key] = stampStableArrayRowIds(child, `${path}.${key}`)
        }
        return nested
      }
      return item
    })
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = stampStableArrayRowIds(child, `${path}.${key}`)
    }
    return out
  }
  return value
}

export type WingsSideHiFiSeedApplyReport = WingsSideHiFiSeedReport & {
  applied: true
  dryRun: false
  backupPath?: string | null
  mutatedPages: number
  planForm: WingsSideHiFiPlanFormResolveResult
  siteCode: string
}

/**
 * Guarded idempotent apply for a single site.
 * - Requires explicit siteCode (`wing-side` for the wingside.vn tenant)
 * - Resolves plan form by title+site before write
 * - Preserves stable array row IDs
 * - Skips missing pages (never invents pages)
 * Caller is responsible for SQLite backup + Payload lifecycle.
 */
const seedWriteContext = wingsSideLocalizationBackfillContext

export const applyWingsSideHiFiContentSeed = async (args: {
  locale?: WingsSideHiFiSeedLocale | 'all'
  payload: WingsSideHiFiSeedPayload
  /** Local API request with admin user (createLocalReq). Required for authenticated writes. */
  req?: unknown
  siteCode: string
}): Promise<WingsSideHiFiSeedApplyReport> => {
  if (!args.payload) {
    throw new Error('Apply requires a Payload instance')
  }
  if (!args.siteCode || typeof args.siteCode !== 'string') {
    throw new Error('Apply requires explicit --site-code')
  }
  if (typeof args.payload.update !== 'function') {
    throw new Error('Apply requires payload.update')
  }
  if (!args.req) {
    throw new Error('Apply requires a local admin request (createLocalReq)')
  }

  const siteCode = args.siteCode
  const locales: WingsSideHiFiSeedLocale[] =
    !args.locale || args.locale === 'all' ? [...WINGSSIDE_HIFI_SEED_LOCALES] : [args.locale]
  const targets = listWingsSideHiFiSeedTargets()
  const pages: WingsSideHiFiSeedPageReport[] = []
  const localesFetched: WingsSideHiFiSeedLocale[] = []
  let mutatedPages = 0

  const planForm = await resolveWingsSideHiFiPlanForm({
    payload: args.payload,
    siteCode,
  })
  const resolvedFormId = planForm.ok ? planForm.formId : null
  const planFormIssue = planForm.ok ? null : `plan_form_${planForm.reason}: ${planForm.detail}`

  for (const locale of locales) {
    const localePages = await fetchWingsSideHiFiPagesForLocale({
      locale,
      payload: args.payload,
      siteCode,
      targets,
    })
    localesFetched.push(locale)

    for (const target of targets) {
      const page = localePages.find((doc) => matchPage(doc, target)) || null
      let desired = buildPayloadFromCopy(locale, target.routeVariant)
      if (target.routeVariant === 'plan' || target.routeVariant === 'contact') {
        desired = attachResolvedPlanForm(desired, resolvedFormId)
      }
      const currentGroup = (page?.wingsSideHiFi || null) as Record<string, unknown> | null
      desired = mergeStableArrayRowIds(desired, currentGroup, target.routeVariant) as Record<
        string,
        unknown
      >

      const row = reportPageRow({ desired, locale, page, target })
      if ((target.routeVariant === 'plan' || target.routeVariant === 'contact') && planFormIssue) {
        row.validationIssues = [...row.validationIssues, planFormIssue]
        row.hasContractGap = true
      }

      if (!page || row.status === 'missing_page' || row.status === 'unchanged') {
        pages.push(row)
        continue
      }

      // Fail closed for conversion routes: never write a null form when resolution failed.
      if ((target.routeVariant === 'plan' || target.routeVariant === 'contact') && !planForm.ok) {
        pages.push({
          ...row,
          status: 'would_update',
          validationIssues: [
            ...row.validationIssues,
            'apply_blocked: plan form unresolved — refusing to persist null relationship',
          ],
        })
        continue
      }

      await args.payload.update!({
        collection: 'pages',
        context: seedWriteContext,
        depth: 0,
        disableTransaction: true,
        id: page.id,
        locale,
        overrideAccess: true,
        req: args.req,
        data: {
          wingsSideHiFi: desired,
        },
      })
      mutatedPages += 1
      pages.push({
        ...row,
        status: 'would_update',
        changes: row.changes,
      })
    }
  }

  return {
    applied: true,
    dryRun: false,
    mode: 'db',
    localeCoverage: locales,
    localesFetched,
    mutatedPages,
    pages,
    planForm,
    siteCode,
    summary: summarizeSeedPages(pages),
  }
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

const stableJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableJsonValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableJsonValue(child)]),
    )
  }
  return value
}

export const checksumWingsSideHiFiValue = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(stableJsonValue(value)))
    .digest('hex')

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const projectValueToShape = (current: unknown, shape: unknown): unknown => {
  if (shape == null) return null
  if (Array.isArray(shape)) {
    if (!Array.isArray(current)) return current
    return shape.map((item, index) => projectValueToShape(current[index], item))
  }
  if (!isPlainRecord(shape)) {
    return valuesEquivalent(current, shape) ? shape : current
  }
  if (!isPlainRecord(current)) return current
  const projected: Record<string, unknown> = {}
  for (const [key, childShape] of Object.entries(shape)) {
    projected[key] = projectValueToShape(current[key], childShape)
  }
  return projected
}

const hasProjectedValue = (value: unknown): boolean => {
  if (value === undefined) return false
  if (Array.isArray(value)) return value.some(hasProjectedValue)
  if (isPlainRecord(value)) return Object.values(value).some(hasProjectedValue)
  return true
}

const projectCurrentForPlanChecksum = (
  current: Record<string, unknown> | null,
  expected: Record<string, unknown> | null,
  targetShape: Record<string, unknown>,
): Record<string, unknown> | null => {
  if (expected) return projectValueToShape(current, expected) as Record<string, unknown>
  const projectedTarget = projectValueToShape(current, targetShape)
  return hasProjectedValue(projectedTarget) ? (projectedTarget as Record<string, unknown>) : null
}

const mergeValuePreservingExtras = (current: unknown, next: unknown): unknown => {
  if (Array.isArray(next)) return next
  if (!isPlainRecord(next)) return next
  const out: Record<string, unknown> = isPlainRecord(current) ? { ...current } : {}
  for (const [key, value] of Object.entries(next)) {
    out[key] = mergeValuePreservingExtras(out[key], value)
  }
  return out
}

const removeShapeFromValue = (current: unknown, shape: unknown): unknown => {
  if (!isPlainRecord(current) || !isPlainRecord(shape)) return current
  const out: Record<string, unknown> = { ...current }
  for (const [key, childShape] of Object.entries(shape)) {
    if (!Object.prototype.hasOwnProperty.call(out, key)) continue
    if (isPlainRecord(out[key]) && isPlainRecord(childShape)) {
      const child = removeShapeFromValue(out[key], childShape)
      if (isPlainRecord(child) && Object.keys(child).length === 0) delete out[key]
      else out[key] = child
    } else {
      delete out[key]
    }
  }
  return out
}

const buildReleasePlanWriteValue = (args: {
  current: Record<string, unknown> | null
  previousShape: Record<string, unknown>
  target: Record<string, unknown> | null
}): Record<string, unknown> | null => {
  const preserved = removeShapeFromValue(args.current, args.previousShape)
  const merged = args.target ? mergeValuePreservingExtras(preserved, args.target) : preserved
  return isPlainRecord(merged) && Object.keys(merged).length > 0 ? merged : null
}

export type WingsSideHiFiReleasePlanEntry = {
  after: Record<string, unknown>
  afterChecksum: string
  before: Record<string, unknown> | null
  beforeChecksum: string
  locale: WingsSideHiFiSeedLocale
  pageId: number | string
  pathname: string
  routeVariant: WingsSideHiFiRouteVariant
}

export type WingsSideHiFiReleasePlan = {
  createdAt: string
  entries: WingsSideHiFiReleasePlanEntry[]
  localeCount: number
  pageCount: number
  planForm: Extract<WingsSideHiFiPlanFormResolveResult, { ok: true }>
  siteCode: typeof WINGSSIDE_HIFI_SEED_SITE_CODE
  version: 1
}

const assertExactReleasePlanScope = (plan: WingsSideHiFiReleasePlan) => {
  if (plan.version !== 1)
    throw new Error(`Unsupported WingSide release plan version: ${plan.version}`)
  if (plan.siteCode !== WINGSSIDE_HIFI_SEED_SITE_CODE) {
    throw new Error(`Release plan site must be ${WINGSSIDE_HIFI_SEED_SITE_CODE}`)
  }
  const targets = listWingsSideHiFiSeedTargets()
  const expectedKeys = new Set(
    WINGSSIDE_HIFI_SEED_LOCALES.flatMap((locale) =>
      targets.map((target) => `${locale}:${target.pathname}:${target.routeVariant}`),
    ),
  )
  const actualKeys = plan.entries.map(
    (entry) => `${entry.locale}:${entry.pathname}:${entry.routeVariant}`,
  )
  if (
    plan.entries.length > expectedKeys.size ||
    new Set(actualKeys).size !== actualKeys.length ||
    actualKeys.some((key) => !expectedKeys.has(key))
  ) {
    throw new Error(
      `Release plan scope mismatch: expected at most ${expectedKeys.size} exact locale/route entries, received ${plan.entries.length}`,
    )
  }
  if (
    plan.pageCount !== targets.length ||
    plan.localeCount !== WINGSSIDE_HIFI_SEED_LOCALES.length
  ) {
    throw new Error('Release plan count metadata does not match the fixed WingSide scope')
  }
}

export const buildWingsSideHiFiReleasePlan = async (args: {
  payload: WingsSideHiFiSeedPayload
  siteCode: string
}): Promise<WingsSideHiFiReleasePlan> => {
  if (args.siteCode !== WINGSSIDE_HIFI_SEED_SITE_CODE) {
    throw new Error(`Release remediation is restricted to ${WINGSSIDE_HIFI_SEED_SITE_CODE}`)
  }
  const planForm = await resolveWingsSideHiFiPlanForm({
    payload: args.payload,
    siteCode: args.siteCode,
  })
  if (!planForm.ok) {
    throw new Error(`Planner form resolution failed: ${planForm.reason}: ${planForm.detail}`)
  }

  const targets = listWingsSideHiFiSeedTargets()
  const entries: WingsSideHiFiReleasePlanEntry[] = []
  for (const locale of WINGSSIDE_HIFI_SEED_LOCALES) {
    const pages = await fetchWingsSideHiFiPagesForLocale({
      locale,
      payload: args.payload,
      siteCode: args.siteCode,
      targets,
    })
    for (const target of targets) {
      const matches = pages.filter((page) => matchPage(page, target))
      if (matches.length !== 1) {
        throw new Error(
          `Expected exactly one ${locale} page for ${target.pathname}; found ${matches.length}`,
        )
      }
      const page = matches[0]!
      const current =
        page.wingsSideHiFi && typeof page.wingsSideHiFi === 'object'
          ? (page.wingsSideHiFi as Record<string, unknown>)
          : null
      let after = buildPayloadFromCopy(locale, target.routeVariant)
      if (target.routeVariant === 'plan' || target.routeVariant === 'contact') {
        after = attachResolvedPlanForm(after, planForm.formId)
      }
      after = mergeStableArrayRowIds(after, current, target.routeVariant) as Record<string, unknown>
      const before = projectCurrentForPlanChecksum(current, null, after)
      if (checksumWingsSideHiFiValue(before) === checksumWingsSideHiFiValue(after)) continue
      entries.push({
        after,
        afterChecksum: checksumWingsSideHiFiValue(after),
        before,
        beforeChecksum: checksumWingsSideHiFiValue(before),
        locale,
        pageId: page.id,
        pathname: target.pathname,
        routeVariant: target.routeVariant,
      })
    }
  }

  const plan: WingsSideHiFiReleasePlan = {
    createdAt: new Date().toISOString(),
    entries,
    localeCount: WINGSSIDE_HIFI_SEED_LOCALES.length,
    pageCount: targets.length,
    planForm,
    siteCode: WINGSSIDE_HIFI_SEED_SITE_CODE,
    version: 1,
  }
  assertExactReleasePlanScope(plan)
  return plan
}

const readReleasePlanCurrentValues = async (args: {
  payload: WingsSideHiFiSeedPayload
  plan: WingsSideHiFiReleasePlan
}) => {
  const targets = listWingsSideHiFiSeedTargets()
  const values = new Map<string, Record<string, unknown> | null>()
  for (const locale of WINGSSIDE_HIFI_SEED_LOCALES) {
    const pages = await fetchWingsSideHiFiPagesForLocale({
      locale,
      payload: args.payload,
      siteCode: args.plan.siteCode,
      targets,
    })
    for (const entry of args.plan.entries.filter((candidate) => candidate.locale === locale)) {
      const matches = pages.filter((page) => String(page.id) === String(entry.pageId))
      if (matches.length !== 1) {
        throw new Error(`Page ${entry.pageId} (${locale}) is missing or ambiguous`)
      }
      const current = matches[0]!.wingsSideHiFi
      values.set(
        `${locale}:${entry.pageId}`,
        current && typeof current === 'object' ? (current as Record<string, unknown>) : null,
      )
    }
  }
  return values
}

export const executeWingsSideHiFiReleasePlan = async (args: {
  direction: 'apply' | 'rollback'
  payload: WingsSideHiFiSeedPayload
  plan: WingsSideHiFiReleasePlan
  req?: unknown
}): Promise<{ direction: 'apply' | 'rollback'; mutated: number; verified: number }> => {
  if (typeof args.payload.update !== 'function')
    throw new Error('Release execution requires update')
  assertExactReleasePlanScope(args.plan)
  const currentValues = await readReleasePlanCurrentValues(args)
  const sourceKey = args.direction === 'apply' ? 'before' : 'after'
  const sourceChecksumKey = args.direction === 'apply' ? 'beforeChecksum' : 'afterChecksum'
  const targetKey = args.direction === 'apply' ? 'after' : 'before'
  const targetChecksumKey = args.direction === 'apply' ? 'afterChecksum' : 'beforeChecksum'

  for (const entry of args.plan.entries) {
    const current = currentValues.get(`${entry.locale}:${entry.pageId}`) ?? null
    const sourceShape = entry[sourceKey]
    const targetShape = entry[targetKey] || entry.after
    const projectedCurrent = projectCurrentForPlanChecksum(current, sourceShape, targetShape)
    const sourceMatches = checksumWingsSideHiFiValue(projectedCurrent) === entry[sourceChecksumKey]
    if (!sourceMatches) {
      throw new Error(
        `Drift detected before ${args.direction}: ${entry.locale} ${entry.pathname} does not match plan ${sourceKey}`,
      )
    }
  }

  const completed: WingsSideHiFiReleasePlanEntry[] = []
  try {
    for (const entry of args.plan.entries) {
      const current = currentValues.get(`${entry.locale}:${entry.pageId}`) ?? null
      const next = buildReleasePlanWriteValue({
        current,
        previousShape: args.direction === 'apply' ? entry.before || entry.after : entry.after,
        target: entry[targetKey],
      })
      await args.payload.update({
        collection: 'pages',
        context: seedWriteContext,
        data: { wingsSideHiFi: next },
        depth: 0,
        id: entry.pageId,
        locale: entry.locale,
        overrideAccess: true,
        req: args.req,
      })
      completed.push(entry)
    }

    const verifiedValues = await readReleasePlanCurrentValues(args)
    for (const entry of args.plan.entries) {
      const current = verifiedValues.get(`${entry.locale}:${entry.pageId}`) ?? null
      const projectedCurrent = projectCurrentForPlanChecksum(current, entry[targetKey], entry.after)
      const targetMatches = checksumWingsSideHiFiValue(projectedCurrent) === entry[targetChecksumKey]
      if (!targetMatches) {
        throw new Error(
          `Verification failed after ${args.direction}: ${entry.locale} ${entry.pathname}`,
        )
      }
    }
  } catch (error) {
    for (const entry of completed.reverse()) {
      const current = currentValues.get(`${entry.locale}:${entry.pageId}`) ?? null
      const next = buildReleasePlanWriteValue({
        current,
        previousShape: args.direction === 'apply' ? entry.after : entry.before || entry.after,
        target: entry[sourceKey],
      })
      await args.payload.update({
        collection: 'pages',
        context: seedWriteContext,
        data: { wingsSideHiFi: next },
        depth: 0,
        id: entry.pageId,
        locale: entry.locale,
        overrideAccess: true,
        req: args.req,
      })
    }
    throw error
  }
  return {
    direction: args.direction,
    mutated: completed.length,
    verified: args.plan.entries.length,
  }
}
