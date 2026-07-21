import type { WingsSideHiFiRouteVariant } from '@/fields/wingsSideHiFi'
import { localeCodes, type SupportedLocaleCode } from '@/utilities/locales'
import { getPublicRoutePathname } from '@/utilities/sitePaths'
import {
  isWingsSideHiFiComposerRoute,
  type WingsSideHiFiComposerRoute,
  wingsSideHiFiRequiredOdIds,
} from '@/utilities/wingsSideHiFiComposer'

/** Pathname (public route) → locked variant. */
export const WINGSSIDE_HIFI_PATH_TO_VARIANT: Record<WingsSideHiFiComposerRoute, WingsSideHiFiRouteVariant> =
  {
    '/': 'home',
    '/plan-your-trip': 'plan',
    '/destinations': 'destinations',
    '/styles': 'styles',
    '/packages': 'packages',
    '/travel-guide': 'guide',
    '/about-us': 'about',
    '/contact-us': 'contact',
  }

export const WINGSSIDE_HIFI_VARIANT_TO_PATH: Record<WingsSideHiFiRouteVariant, WingsSideHiFiComposerRoute> =
  {
    home: '/',
    plan: '/plan-your-trip',
    destinations: '/destinations',
    styles: '/styles',
    packages: '/packages',
    guide: '/travel-guide',
    about: '/about-us',
    contact: '/contact-us',
  }

export type WingsSideHiFiCtaModel = {
  href: string
  label: string
}

export type WingsSideHiFiLinkCard = {
  body?: string
  href: string
  title: string
}

export type WingsSideHiFiHeroModel = {
  eyebrow?: string
  lede?: string
  mediaId?: number | string | null
  primaryCta?: WingsSideHiFiCtaModel
  secondaryCta?: WingsSideHiFiCtaModel
  title?: string
}

export type WingsSideHiFiSection = {
  id: string
  kind: string
  mandatory: boolean
  present: boolean
}

export type WingsSideHiFiValidationIssue = {
  code: string
  field: string
  message: string
  severity: 'critical' | 'warning'
}

export type WingsSideHiFiPageModel = {
  enabled: boolean
  hero: WingsSideHiFiHeroModel
  locale: SupportedLocaleCode | string
  /** Ordered section slots for the route — stable for inventory/render. */
  sections: WingsSideHiFiSection[]
  routePath: WingsSideHiFiComposerRoute
  routeVariant: WingsSideHiFiRouteVariant
  /** Route-specific payload (raw structured group for the variant). */
  routeContent: Record<string, unknown> | null
  issues: WingsSideHiFiValidationIssue[]
  isValid: boolean
}

export type WingsSideHiFiPageSource = {
  hero?: {
    media?: number | string | { id?: number | string } | null
    links?: Array<{
      link?: {
        label?: string | null
        url?: string | null
      } | null
    }> | null
    richText?: unknown
  } | null
  layout?: Array<{ blockType?: string; form?: unknown }> | null
  pathname?: string | null
  slug?: string | null
  title?: string | null
  wingsSideHiFi?: {
    about?: Record<string, unknown> | null
    contact?: Record<string, unknown> | null
    destinations?: Record<string, unknown> | null
    enabled?: boolean | null
    guide?: Record<string, unknown> | null
    hero?: {
      eyebrow?: string | null
      lede?: string | null
      media?: number | string | { id?: number | string } | null
      primaryCta?: { href?: string | null; label?: string | null } | null
      secondaryCta?: { href?: string | null; label?: string | null } | null
      title?: string | null
    } | null
    home?: Record<string, unknown> | null
    packages?: Record<string, unknown> | null
    plan?: Record<string, unknown> | null
    routeVariant?: WingsSideHiFiRouteVariant | string | null
    styles?: Record<string, unknown> | null
  } | null
}

/** Mandatory section slots per locked route (hi-fi section order). */
export const WINGSSIDE_HIFI_MANDATORY_SECTIONS: Record<
  WingsSideHiFiRouteVariant,
  readonly { id: string; kind: string }[]
> = {
  home: [
    { id: 'home-hero', kind: 'hero' },
    { id: 'home-planner', kind: 'planner' },
    { id: 'home-pillars', kind: 'pillars' },
    { id: 'home-why', kind: 'why' },
    { id: 'home-dest', kind: 'destinations' },
    { id: 'home-styles', kind: 'styles' },
    { id: 'home-sample-journeys', kind: 'journeys' },
    { id: 'home-notes', kind: 'notes' },
    { id: 'home-close', kind: 'close' },
    { id: 'home-creds', kind: 'credentials' },
    { id: 'home-related', kind: 'related' },
  ],
  plan: [
    { id: 'plan-hero', kind: 'hero' },
    { id: 'plan-form', kind: 'form' },
    { id: 'plan-steps', kind: 'steps' },
    { id: 'plan-explore', kind: 'explore' },
  ],
  destinations: [
    { id: 'dest-hero', kind: 'hero' },
    { id: 'dest-routes', kind: 'routes' },
    { id: 'dest-grid', kind: 'places' },
    { id: 'dest-close', kind: 'closing' },
  ],
  styles: [
    { id: 'styles-hero', kind: 'hero' },
    { id: 'styles-intro', kind: 'intro' },
    { id: 'style-grid', kind: 'styles' },
    { id: 'styles-close', kind: 'closing' },
  ],
  packages: [
    { id: 'pkg-hero', kind: 'hero' },
    { id: 'pkg-grid', kind: 'cards' },
    { id: 'pkg-close', kind: 'closing' },
  ],
  guide: [
    { id: 'guide-hero', kind: 'hero' },
    { id: 'guide-list', kind: 'notes' },
    { id: 'guide-close', kind: 'closing' },
  ],
  about: [
    { id: 'about-hero', kind: 'hero' },
    { id: 'about-story', kind: 'story' },
    { id: 'about-promises', kind: 'promises' },
    { id: 'about-team', kind: 'team' },
    { id: 'about-close', kind: 'closing' },
  ],
  contact: [
    { id: 'contact-hero', kind: 'hero' },
    { id: 'contact-split', kind: 'channels' },
    { id: 'contact-form', kind: 'form' },
    { id: 'contact-after', kind: 'nextSteps' },
    { id: 'contact-close', kind: 'closing' },
  ],
}

const nonEmpty = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return value != null && value !== false
}

const mediaId = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: number | string }).id
    return id ?? null
  }
  return null
}

const asCta = (value: unknown): WingsSideHiFiCtaModel | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const cta = value as { href?: string | null; label?: string | null }
  if (!nonEmpty(cta.label) || !nonEmpty(cta.href)) return undefined
  return { href: String(cta.href).trim(), label: String(cta.label).trim() }
}

const arrayLen = (value: unknown): number => (Array.isArray(value) ? value.length : 0)

export const resolveWingsSideHiFiRouteVariant = (
  publicPathname: string,
  _explicit?: null | string,
): WingsSideHiFiRouteVariant | null => {
  // Path is source of truth for the live route. Explicit CMS variant is
  // validated separately so mismatches stay detectable.
  const route = getPublicRoutePathname(publicPathname)
  if (!isWingsSideHiFiComposerRoute(route)) return null
  return WINGSSIDE_HIFI_PATH_TO_VARIANT[route]
}

const pickRouteContent = (
  group: WingsSideHiFiPageSource['wingsSideHiFi'],
  variant: WingsSideHiFiRouteVariant,
): Record<string, unknown> | null => {
  if (!group) return null
  const map: Record<WingsSideHiFiRouteVariant, unknown> = {
    home: group.home,
    plan: group.plan,
    destinations: group.destinations,
    styles: group.styles,
    packages: group.packages,
    guide: group.guide,
    about: group.about,
    contact: group.contact,
  }
  const value = map[variant]
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

const sectionPresent = (
  variant: WingsSideHiFiRouteVariant,
  sectionId: string,
  routeContent: Record<string, unknown> | null,
  source: WingsSideHiFiPageSource,
  hero: WingsSideHiFiHeroModel,
): boolean => {
  const hasFormBlock = Array.isArray(source.layout)
    ? source.layout.some((block) => {
        const type = block?.blockType
        return (type === 'formBlock' || type === 'form') && block.form != null
      })
    : false

  switch (sectionId) {
    case 'home-hero':
    case 'plan-hero':
    case 'dest-hero':
    case 'styles-hero':
    case 'pkg-hero':
    case 'guide-hero':
    case 'about-hero':
    case 'contact-hero':
      return Boolean(nonEmpty(hero.title) || nonEmpty(source.title))
    case 'home-planner':
      return true // planner is layout/chrome contract; presence checked at render
    case 'home-pillars':
      return arrayLen(routeContent?.pillars) >= 1 || nonEmpty(routeContent?.pillarsTitle)
    case 'home-why':
      return nonEmpty(routeContent?.whyTitle) || arrayLen(routeContent?.whyCards) >= 1
    case 'home-dest':
      return nonEmpty(routeContent?.destTitle)
    case 'home-styles':
      return nonEmpty(routeContent?.stylesTitle)
    case 'home-sample-journeys':
      return nonEmpty(routeContent?.journeysTitle)
    case 'home-notes':
      return arrayLen(routeContent?.notes) >= 1
    case 'home-close':
      return nonEmpty(routeContent?.closeTitle)
    case 'home-creds':
      return arrayLen(routeContent?.credentials) >= 1
    case 'home-related':
      return arrayLen(routeContent?.related) >= 1
    case 'plan-form':
    case 'contact-form':
      return Boolean(routeContent?.form != null || hasFormBlock)
    case 'plan-steps':
      return arrayLen(routeContent?.steps) >= 1 || nonEmpty(routeContent?.stepsTitle)
    case 'plan-explore':
      return arrayLen(routeContent?.explore) >= 1
    case 'dest-routes':
      return arrayLen(routeContent?.routes) >= 1
    case 'dest-grid':
      return arrayLen(routeContent?.places) >= 1
    case 'dest-close':
    case 'styles-close':
    case 'pkg-close':
    case 'guide-close':
    case 'about-close':
    case 'contact-close':
      return nonEmpty(routeContent?.closingTitle) || arrayLen(routeContent?.closingLinks) >= 1
    case 'styles-intro':
      return nonEmpty(routeContent?.introTitle)
    case 'style-grid':
      return arrayLen(routeContent?.styles) >= 1
    case 'pkg-grid':
      return arrayLen(routeContent?.cards) >= 1
    case 'guide-list':
      return arrayLen(routeContent?.notes) >= 1
    case 'about-story':
      return nonEmpty(routeContent?.storyTitle)
    case 'about-promises':
      return arrayLen(routeContent?.promises) >= 1
    case 'about-team':
      return nonEmpty(routeContent?.teamTitle)
    case 'contact-split':
      return arrayLen(routeContent?.channels) >= 1
    case 'contact-after':
      return arrayLen(routeContent?.nextSteps) >= 1
    default:
      return false
  }
}

/**
 * Resolve + validate a normalized WingsSideHiFiPageModel.
 * Missing critical content surfaces as issues — never silently truncates the contract.
 */
export const resolveWingsSideHiFiPageModel = (args: {
  locale?: null | string
  page: WingsSideHiFiPageSource
  publicPathname: string
}): WingsSideHiFiPageModel | null => {
  const requestedLocale = (args.locale || 'en').toLowerCase()
  const locale = (localeCodes as readonly string[]).includes(requestedLocale)
    ? (requestedLocale as SupportedLocaleCode)
    : 'en'
  const route = getPublicRoutePathname(args.publicPathname)
  if (!isWingsSideHiFiComposerRoute(route)) return null

  const group = args.page.wingsSideHiFi
  const enabled = Boolean(group?.enabled)
  const explicitVariant = group?.routeVariant
  const routeVariant = WINGSSIDE_HIFI_PATH_TO_VARIANT[route]

  const routeContent = pickRouteContent(group, routeVariant)
  const hiFiHero = group?.hero
  const pageLinks = args.page.hero?.links || []
  const primaryFromPage = pageLinks[0]?.link
  const secondaryFromPage = pageLinks[1]?.link

  const hero: WingsSideHiFiHeroModel = {
    eyebrow: hiFiHero?.eyebrow?.trim() || undefined,
    title: hiFiHero?.title?.trim() || args.page.title?.trim() || undefined,
    lede: hiFiHero?.lede?.trim() || undefined,
    mediaId: mediaId(hiFiHero?.media) ?? mediaId(args.page.hero?.media),
    primaryCta:
      asCta(hiFiHero?.primaryCta) ||
      (primaryFromPage?.label && primaryFromPage.url
        ? { label: primaryFromPage.label, href: primaryFromPage.url }
        : undefined),
    secondaryCta:
      asCta(hiFiHero?.secondaryCta) ||
      (secondaryFromPage?.label && secondaryFromPage.url
        ? { label: secondaryFromPage.label, href: secondaryFromPage.url }
        : undefined),
  }

  const issues: WingsSideHiFiValidationIssue[] = []

  if (enabled && explicitVariant && explicitVariant !== routeVariant) {
    issues.push({
      code: 'route_variant_mismatch',
      field: 'wingsSideHiFi.routeVariant',
      message: `routeVariant "${explicitVariant}" does not match path "${route}" (expected "${routeVariant}")`,
      severity: 'critical',
    })
  }

  if (enabled && !routeContent) {
    issues.push({
      code: 'missing_route_group',
      field: `wingsSideHiFi.${routeVariant}`,
      message: `Enabled hi-fi page is missing structured group for variant "${routeVariant}"`,
      severity: 'critical',
    })
  }

  const mandatory = WINGSSIDE_HIFI_MANDATORY_SECTIONS[routeVariant]
  const sections: WingsSideHiFiSection[] = mandatory.map((slot) => {
    const present = sectionPresent(routeVariant, slot.id, routeContent, args.page, hero)
    if (enabled && !present) {
      issues.push({
        code: 'missing_mandatory_section',
        field: slot.id,
        message: `Mandatory section "${slot.id}" (${slot.kind}) is empty or incomplete`,
        severity: 'critical',
      })
    }
    return {
      id: slot.id,
      kind: slot.kind,
      mandatory: true,
      present: enabled ? present : present || wingsSideHiFiRequiredOdIds[route].includes(slot.id),
    }
  })

  // Cardinality contracts from independent NO-GO review.
  if (enabled && routeVariant === 'packages') {
    const count = arrayLen(routeContent?.cards)
    if (count < 5) {
      issues.push({
        code: 'packages_card_count',
        field: 'wingsSideHiFi.packages.cards',
        message: `Packages requires 5 journey cards; found ${count}`,
        severity: 'critical',
      })
    }
  }

  if (enabled && routeVariant === 'destinations') {
    const count = arrayLen(routeContent?.places)
    if (count < 6) {
      issues.push({
        code: 'destinations_card_count',
        field: 'wingsSideHiFi.destinations.places',
        message: `Destinations requires 6 place cards; found ${count}`,
        severity: 'critical',
      })
    }
  }

  if (enabled && routeVariant === 'styles') {
    const count = arrayLen(routeContent?.styles)
    if (count < 6) {
      issues.push({
        code: 'styles_card_count',
        field: 'wingsSideHiFi.styles.styles',
        message: `Styles requires 6 style cards; found ${count}`,
        severity: 'critical',
      })
    }
  }

  if (enabled && routeVariant === 'contact' && !sectionPresent(routeVariant, 'contact-form', routeContent, args.page, hero)) {
    issues.push({
      code: 'contact_form_missing',
      field: 'wingsSideHiFi.contact.form',
      message: 'Contact hi-fi requires a message form relationship or layout form block',
      severity: 'critical',
    })
  }

  if (enabled && !nonEmpty(hero.title)) {
    issues.push({
      code: 'hero_title_missing',
      field: 'wingsSideHiFi.hero.title',
      message: 'Hero title is required for enabled hi-fi pages',
      severity: 'critical',
    })
  }

  const critical = issues.filter((issue) => issue.severity === 'critical')

  return {
    enabled,
    hero,
    issues,
    isValid: critical.length === 0,
    locale,
    routeContent,
    routePath: route,
    routeVariant,
    sections,
  }
}

/** Preview/test helper: list critical gaps without throwing. */
export const getWingsSideHiFiCriticalGaps = (
  model: WingsSideHiFiPageModel | null,
): WingsSideHiFiValidationIssue[] => {
  if (!model) return [{ code: 'not_hub_route', field: 'route', message: 'Not a WingSide hub route', severity: 'critical' }]
  return model.issues.filter((issue) => issue.severity === 'critical')
}
