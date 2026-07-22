import type { Page } from '@/payload-types'

import { getPublicRoutePathname } from './sitePaths'

/** Locked 8-page hub routes that use HiFi inventory as primary body (Bar B). */
export const WINGSSIDE_HIFI_COMPOSER_ROUTES = [
  '/',
  '/plan-your-trip',
  '/destinations',
  '/styles',
  '/packages',
  '/travel-guide',
  '/about-us',
  '/contact-us',
] as const

export type WingsSideHiFiComposerRoute = (typeof WINGSSIDE_HIFI_COMPOSER_ROUTES)[number]

/** CMS layout block types kept when HiFi composer owns the body. */
export const WINGSSIDE_HIFI_ALLOWED_CMS_BLOCKS = new Set([
  'credentialsCarousel',
  'formBlock',
  'form',
])

export const isWingsSideHiFiComposerRoute = (route: string): route is WingsSideHiFiComposerRoute =>
  (WINGSSIDE_HIFI_COMPOSER_ROUTES as readonly string[]).includes(route)

export const shouldUseWingsSideHiFiComposer = (
  siteCode: null | string | undefined,
  publicPathname: string,
): boolean => {
  if (siteCode !== 'wings-side') return false
  return isWingsSideHiFiComposerRoute(getPublicRoutePathname(publicPathname))
}

export const filterCmsLayoutBlocksForHiFiComposer = (
  blocks: Page['layout'] | null | undefined,
): Page['layout'][0][] => {
  if (!Array.isArray(blocks)) return []
  return blocks.filter((block) => {
    const type = block?.blockType
    return typeof type === 'string' && WINGSSIDE_HIFI_ALLOWED_CMS_BLOCKS.has(type)
  })
}

/** Required data-od-id markers per route for inventory proof. */
export const wingsSideHiFiRequiredOdIds: Record<WingsSideHiFiComposerRoute, readonly string[]> = {
  '/': [
    'home-pillars',
    'home-why',
    'home-dest',
    'home-styles',
    'home-sample-journeys',
    'home-close',
    'home-creds',
    'home-related',
  ],
  '/plan-your-trip': ['plan-steps', 'plan-explore'],
  '/destinations': ['dest-routes', 'dest-grid'],
  '/styles': ['styles-intro', 'style-grid'],
  '/packages': ['pkg-grid'],
  '/travel-guide': ['guide-list'],
  '/about-us': ['about-story', 'about-promises', 'about-team'],
  '/contact-us': ['contact-split', 'contact-after'],
}
