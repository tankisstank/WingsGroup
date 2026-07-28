import type { Payload, PayloadRequest } from 'payload'

import {
  hydrateWingsSideHomeCuration,
  projectWingsSideHomeCuration,
} from '../../src/tours/homeCuration'
import { canonicalChecksum } from './wingsSideUs055Rehearsal.mjs'

export const us055HomeFixtureLocales = ['en', 'vi', 'it', 'es', 'pt'] as const
export const us055WhyTravelRoleSlugs = [
  {
    key: 'local-design',
    slug: 'best-of-northern-vietnam-hanoi-ninh-binh-sapa-halong-6-days',
  },
  {
    key: 'flexible-planning',
    slug: 'northern-vietnam-highlights-for-family-6-days',
  },
  {
    key: 'style-matching',
    slug: 'vietnam-luxury-wellness-retreat-escape-8-days',
  },
  {
    key: 'collaborative-care',
    slug: 'highlights-of-vietnam-from-north-to-south-12-days',
  },
] as const

const relationID = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

export const captureUs055HomeFixtureProof = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}) => {
  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: 'wing-side' } },
  })
  if (sites.docs.length !== 1) {
    throw new Error(`US-055 Home proof requires one wing-side site; found ${sites.docs.length}`)
  }
  const site = sites.docs[0]!
  const localeProofs = []

  for (const locale of us055HomeFixtureLocales) {
    const pages = await payload.find({
      collection: 'pages',
      depth: 0,
      fallbackLocale: false,
      limit: 2,
      locale,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          { site: { equals: site.id } },
          { pathname: { equals: '/' } },
          { 'wingsSideHiFi.enabled': { equals: true } },
          { 'wingsSideHiFi.routeVariant': { equals: 'home' } },
        ],
      },
    })
    if (pages.docs.length !== 1) {
      throw new Error(
        `US-055 Home proof requires one ${locale} Home page; found ${pages.docs.length}`,
      )
    }
    const page = pages.docs[0]!
    const hiFi = page.wingsSideHiFi as
      | { home?: Record<string, unknown> | null }
      | null
      | undefined
    const hydrated = await hydrateWingsSideHomeCuration({
      home: hiFi?.home,
      locale,
      pageSite: page.site,
      payload,
    })
    const projection = projectWingsSideHomeCuration({
      home: hydrated,
      locale,
      pageSite: page.site,
    })
    if (
      projection.whyTravel?.state !== 'ready' ||
      projection.whyTravel.cards.length !== us055WhyTravelRoleSlugs.length
    ) {
      throw new Error(
        `US-055 ${locale} Why Travel projection is not ready: ${JSON.stringify(
          projection.whyTravel,
        )}`,
      )
    }
    const cards = projection.whyTravel.cards.map((card, index) => {
      const expected = us055WhyTravelRoleSlugs[index]!
      const expectedPath = `${locale === 'en' ? '' : `/${locale}`}/tour/${expected.slug}`
      if (
        card.key !== expected.key ||
        card.href !== expectedPath ||
        !card.hero.url ||
        relationID(card.id) === null
      ) {
        throw new Error(
          `US-055 ${locale} Why Travel role ${expected.key} did not resolve to ${expectedPath}`,
        )
      }
      return {
        heroChecksum: canonicalChecksum(card.hero),
        href: card.href,
        id: card.id,
        key: card.key,
        sourceSlug: expected.slug,
      }
    })
    if (new Set(cards.map(({ id }) => String(id))).size !== cards.length) {
      throw new Error(`US-055 ${locale} Why Travel roles do not resolve to four unique tours`)
    }
    localeProofs.push({
      cards,
      homeHiFiChecksum: canonicalChecksum(page.wingsSideHiFi),
      homePageID: page.id,
      locale,
      siteID: relationID(page.site),
    })
  }

  const proof = {
    localeCount: localeProofs.length,
    locales: localeProofs,
    roleCount: us055WhyTravelRoleSlugs.length,
    roles: us055WhyTravelRoleSlugs,
    siteID: site.id,
  }
  return {
    ...proof,
    checksum: canonicalChecksum(proof),
  }
}
