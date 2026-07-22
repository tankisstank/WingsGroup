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
  consumedForm?: unknown,
): Page['layout'][0][] => {
  if (!Array.isArray(blocks)) return []

  const consumedFormId = getRelationshipId(consumedForm)

  return blocks.filter((block) => {
    const type = String(block?.blockType || '')
    if (!WINGSSIDE_HIFI_ALLOWED_CMS_BLOCKS.has(type)) return false

    if ((type === 'formBlock' || type === 'form') && consumedFormId != null) {
      const blockForm = 'form' in block ? block.form : null
      return getRelationshipId(blockForm) !== consumedFormId
    }

    return true
  })
}

const getRelationshipId = (value: unknown): null | string => {
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  if (!value || typeof value !== 'object' || !('id' in value)) return null
  const id = (value as { id?: unknown }).id
  return typeof id === 'number' || typeof id === 'string' ? String(id) : null
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
    'pillar-plan',
    'pillar-match',
    'pillar-trade',
    'pillar-notes',
    'dest-hanoi',
    'dest-halong',
    'dest-hoian',
    'dest-hue',
    'dest-mekong',
    'dest-sapa',
    'sample-highlights',
    'sample-north',
    'sample-central',
  ],
  '/plan-your-trip': [
    'plan-steps',
    'plan-form',
    'plan-submit',
    'plan-step-1',
    'plan-step-2',
    'plan-step-3',
    'plan-step-4',
    'plan-explore',
    'plan-explore-1',
    'plan-explore-2',
    'plan-explore-3',
  ],
  '/destinations': [
    'dest-routes',
    'dest-grid',
    'card-hanoi',
    'card-halong',
    'card-hoian',
    'card-hue',
    'card-mekong',
    'card-sapa',
    'dest-mid-cta',
  ],
  '/styles': [
    'styles-intro',
    'style-grid',
    'style-luxury',
    'style-family',
    'style-culture',
    'style-adventure',
    'style-wellness',
    'style-business',
    'style-cta-luxury',
  ],
  '/packages': [
    'pkg-grid',
    'pkg-highlights',
    'pkg-north',
    'pkg-central',
    'pkg-family',
    'pkg-south',
    'pkg-mid-cta',
  ],
  '/travel-guide': ['guide-list', 'note-1', 'note-2', 'note-3', 'guide-empty-rule'],
  '/about-us': ['about-story', 'about-promises', 'about-team'],
  '/contact-us': [
    'contact-split',
    'contact-form',
    'contact-submit',
    'channel-email',
    'channel-phone',
    'channel-wa',
    'contact-after',
    'contact-bridge',
  ],
}
