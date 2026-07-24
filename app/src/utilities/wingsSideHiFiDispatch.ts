import {
  isWingsSideHiFiComposerRoute,
  type WingsSideHiFiComposerRoute,
} from '@/utilities/wingsSideHiFiComposer'
import {
  resolveWingsSideHiFiPageModel,
  type WingsSideHiFiPageModel,
  type WingsSideHiFiPageSource,
  WINGSSIDE_HIFI_PATH_TO_VARIANT,
} from '@/utilities/wingsSideHiFiPageModel'
import { getPublicRoutePathname } from '@/utilities/sitePaths'
import { getWingsSideHiFiCopy } from '@/components/WingsSideHiFi/copy'
import {
  getWingsSideSecondaryHeroCopy,
  type WingsSideSecondaryRoute,
} from '@/components/WingsSideHiFi/secondaryCopy'

/** Official eight-page WingSide hi-fi route contract. */
export const WINGSSIDE_HIFI_B1_ROUTES = [
  '/',
  '/plan-your-trip',
  '/destinations',
  '/styles',
  '/packages',
  '/travel-guide',
  '/about-us',
  '/contact-us',
] as const

export type WingsSideHiFiB1Route = (typeof WINGSSIDE_HIFI_B1_ROUTES)[number]

export const isWingsSideHiFiB1Route = (route: string): route is WingsSideHiFiB1Route =>
  (WINGSSIDE_HIFI_B1_ROUTES as readonly string[]).includes(route)

/**
 * When true, catch-all must render hi-fi body and suppress legacy hero/blocks/related.
 * Requires the `wing-side` tenant + official route + valid/enabled model (or explicit dev fallback).
 */
export const shouldRenderWingsSideHiFiPageBody = (args: {
  model: WingsSideHiFiPageModel | null
  publicPathname: string
  siteCode?: null | string
}): boolean => {
  if (args.siteCode !== 'wing-side') return false
  const route = getPublicRoutePathname(args.publicPathname)
  if (!isWingsSideHiFiB1Route(route)) return false
  return Boolean(args.model)
}

/**
 * Fail-closed Copy.ts fallback: only when explicitly allowed and CMS hi-fi is not enabled.
 * Never overrides a CMS-enabled document.
 */
export const shouldUseWingsSideHiFiCopyFallback = (args: {
  page?: WingsSideHiFiPageSource | null
}): boolean => {
  if (args.page?.wingsSideHiFi?.enabled) return false
  if (process.env.WINGSSIDE_HIFI_COPY_FALLBACK === 'false') return false
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.WINGSSIDE_HIFI_COPY_FALLBACK !== 'true'
  ) {
    return false
  }
  return (
    process.env.WINGSSIDE_HIFI_COPY_FALLBACK === 'true' || process.env.NODE_ENV !== 'production'
  )
}

/** Build a synthetic enabled payload from Copy.ts for development fallback only. */
export const buildWingsSideHiFiFallbackSource = (
  locale: string | null | undefined,
  publicPathname: string,
): WingsSideHiFiPageSource => {
  const route = getPublicRoutePathname(publicPathname)
  const variant =
    isWingsSideHiFiComposerRoute(route) && route in WINGSSIDE_HIFI_PATH_TO_VARIANT
      ? WINGSSIDE_HIFI_PATH_TO_VARIANT[route as WingsSideHiFiComposerRoute]
      : 'home'
  const copy = getWingsSideHiFiCopy(locale)

  if (variant === 'plan') {
    return {
      title: copy.plan.heroTitle,
      wingsSideHiFi: {
        enabled: true,
        routeVariant: 'plan',
        hero: {
          title: copy.plan.heroTitle,
          lede: copy.plan.heroLede,
          primaryCta: { label: copy.plan.primaryCtaLabel, href: '#brief' },
          secondaryCta: { label: copy.home.exploreDestinations, href: '/destinations' },
        },
        plan: {
          stepsKicker: copy.plan.stepsKicker,
          stepsTitle: copy.plan.stepsTitle,
          stepsLede: copy.plan.stepsLede,
          steps: copy.plan.steps,
          heroLede: copy.plan.heroLede,
          faqTitle: copy.plan.faqTitle,
          faq: copy.plan.faq,
          exploreTitle: copy.plan.exploreTitle,
          explore: copy.plan.explore,
          form: null,
        },
      },
    }
  }

  if (variant !== 'home') {
    const routeCopy = copy[variant]
    const secondaryHero = getWingsSideSecondaryHeroCopy(locale, route as WingsSideSecondaryRoute)
    return {
      title: secondaryHero.title,
      wingsSideHiFi: {
        enabled: true,
        routeVariant: variant,
        hero: {
          eyebrow: secondaryHero.eyebrow,
          lede: secondaryHero.lede,
          primaryCta: { label: secondaryHero.primary, href: '/plan-your-trip' },
          secondaryCta: { label: secondaryHero.secondary, href: '/plan-your-trip' },
          title: secondaryHero.title,
        },
        [variant]: routeCopy,
      },
    }
  }

  return {
    title: copy.heroTitle,
    wingsSideHiFi: {
      enabled: true,
      routeVariant: 'home',
      hero: {
        title: copy.heroTitle,
        lede: copy.heroLede,
        primaryCta: { label: copy.home.planTripCta, href: '#home-planner' },
        secondaryCta: { label: copy.home.exploreDestinations, href: '/destinations' },
      },
      home: {
        pillarsKicker: copy.home.pillarsKicker,
        pillarsTitle: copy.home.pillarsTitle,
        pillarsLede: copy.home.pillarsLede,
        pillars: copy.plan.steps,
        whyKicker: copy.home.whyKicker,
        whyTitle: copy.home.whyTitle,
        whyFeaturedBadge: copy.home.whyFeatured.badge,
        whyFeaturedTitle: copy.home.whyFeatured.title,
        whyFeaturedBody: copy.home.whyFeatured.body,
        whyFeaturedCta: copy.home.whyFeatured.cta,
        whyFeaturedHref: copy.home.whyFeatured.href,
        whyCards: copy.home.whyCards,
        destKicker: copy.home.destKicker,
        destTitle: copy.home.destTitle,
        destLede: copy.home.destLede,
        stylesKicker: copy.home.stylesKicker,
        stylesTitle: copy.home.stylesTitle,
        journeysKicker: copy.home.journeysKicker,
        journeysTitle: copy.home.journeysTitle,
        journeysLede: copy.home.journeysLede,
        notesKicker: copy.home.notesKicker,
        notesTitle: copy.home.notesTitle,
        notes: copy.home.notes,
        trust: copy.home.trust,
        closeTitle: copy.home.closeTitle,
        closeLede: copy.home.closeLede,
        closeCta: copy.home.closeCta,
        closeCtaSecondary: copy.home.closeCtaSecondary,
        related: copy.home.related,
      },
    },
  }
}

export const resolveWingsSideHiFiPageBodyModel = (args: {
  locale?: null | string
  page?: WingsSideHiFiPageSource | null
  publicPathname: string
}): WingsSideHiFiPageModel | null => {
  const route = getPublicRoutePathname(args.publicPathname)
  if (!isWingsSideHiFiB1Route(route)) return null

  const cmsEnabled = Boolean(args.page?.wingsSideHiFi?.enabled)
  if (cmsEnabled && args.page) {
    return resolveWingsSideHiFiPageModel({
      locale: args.locale,
      page: args.page,
      publicPathname: args.publicPathname,
    })
  }

  if (shouldUseWingsSideHiFiCopyFallback({ page: args.page })) {
    return resolveWingsSideHiFiPageModel({
      locale: args.locale,
      page: buildWingsSideHiFiFallbackSource(args.locale, args.publicPathname),
      publicPathname: args.publicPathname,
    })
  }

  return null
}
