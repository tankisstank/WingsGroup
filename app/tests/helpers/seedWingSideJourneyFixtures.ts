import type { Payload, PayloadRequest } from 'payload'

import { wingSideJourneyFixtureManifest } from '../fixtures/wingssideJourneyFixtureManifest'

const neutralPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL5XQAAAABJRU5ErkJggg==',
  'base64',
)

const fixtureContext = { disableRevalidate: true }

const findOne = async (
  payload: Payload,
  req: PayloadRequest,
  collection: 'media' | 'pages' | 'tour-products',
  where: Record<string, unknown>,
) => {
  const result = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: where as never,
  })

  return result.docs[0]
}

const localizedTourData = (
  fixture: (typeof wingSideJourneyFixtureManifest.tours)[number],
  locale: (typeof wingSideJourneyFixtureManifest.tenant.locales)[number],
) => ({
  itineraryDays: [
    {
      dayNumber: 1,
      route: 'Synthetic route',
      summary: fixture.localized[locale].summary,
      title: fixture.localized[locale].title,
    },
  ],
  meta: {
    breadcrumbLabel: fixture.localized[locale].title,
    description: fixture.localized[locale].summary,
    title: fixture.localized[locale].title,
  },
  summary: fixture.localized[locale].summary,
  title: fixture.localized[locale].title,
})

const localizedPageData = (
  fixture: (typeof wingSideJourneyFixtureManifest.tours)[number],
  locale: (typeof wingSideJourneyFixtureManifest.tenant.locales)[number],
) => ({
  meta: {
    breadcrumbLabel: fixture.localized[locale].title,
    description: fixture.localized[locale].summary,
    title: fixture.localized[locale].title,
  },
  title: fixture.localized[locale].title,
})

/**
 * Seeds a bounded, synthetic discovery catalog into the disposable Phase-1 E2E database.
 * It intentionally shares only release shape (tenant, locales, cardinality, taxonomy) with
 * production and must never carry production identifiers, content, prices, media URLs, or leads.
 */
export async function seedWingSideJourneyFixtures({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> {
  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: wingSideJourneyFixtureManifest.tenant.code } },
  })
  const wingSideSite = sites.docs[0]

  if (!wingSideSite) {
    throw new Error('WingSide site must exist before discovery fixtures are seeded.')
  }

  const assetKey = wingSideJourneyFixtureManifest.tours[0].media.assetKey
  let media = await findOne(payload, req, 'media', {
    and: [{ site: { equals: wingSideSite.id } }, { filename: { equals: assetKey } }],
  })

  if (!media) {
    media = await payload.create({
      collection: 'media',
      context: fixtureContext,
      data: {
        alt: wingSideJourneyFixtureManifest.tours[0].media.altByLocale.en,
        site: wingSideSite.id,
      } as never,
      file: {
        data: neutralPng,
        mimetype: 'image/png',
        name: assetKey,
        size: neutralPng.byteLength,
      } as never,
      locale: 'en',
      overrideAccess: true,
      req,
    })
  }

  for (const locale of wingSideJourneyFixtureManifest.tenant.locales) {
    await payload.update({
      collection: 'media',
      context: fixtureContext,
      data: { alt: wingSideJourneyFixtureManifest.tours[0].media.altByLocale[locale] } as never,
      id: media.id,
      locale,
      overrideAccess: true,
      req,
    })
  }

  for (const fixture of wingSideJourneyFixtureManifest.tours) {
    const pageWhere = {
      and: [{ site: { equals: wingSideSite.id } }, { slug: { equals: fixture.wrapper.slug } }],
    }
    let page = await findOne(payload, req, 'pages', pageWhere)

    const pageData = {
      _status: fixture.publication,
      hero: { type: 'none' },
      layout: [{ blockType: 'content', columns: [] }],
      pathname: fixture.wrapper.pathname,
      site: wingSideSite.id,
      slug: fixture.wrapper.slug,
      ...localizedPageData(fixture, 'en'),
    }

    if (!page) {
      page = await payload.create({
        collection: 'pages',
        context: fixtureContext,
        data: pageData as never,
        locale: 'en',
        overrideAccess: true,
        req,
      })
    } else {
      page = await payload.update({
        collection: 'pages',
        context: fixtureContext,
        data: pageData as never,
        id: page.id,
        locale: 'en',
        overrideAccess: true,
        req,
      })
    }

    const productWhere = {
      and: [{ site: { equals: wingSideSite.id } }, { slug: { equals: fixture.fixtureKey } }],
    }
    let product = await findOne(payload, req, 'tour-products', productWhere)
    const productData = {
      _status: fixture.publication,
      destinationTags: fixture.taxonomy.destinationTags,
      durationDays: fixture.taxonomy.durationDays,
      durationNights: fixture.taxonomy.durationNights,
      heroMedia: media.id,
      market: 'vietnam',
      primaryCTA: { label: 'Plan a consultation', mode: 'contact' },
      site: wingSideSite.id,
      slug: fixture.fixtureKey,
      travelStyles: fixture.taxonomy.travelStyles,
      wrapperPage: page.id,
      ...(fixture.taxonomy.tourType ? { tourType: fixture.taxonomy.tourType } : {}),
      ...localizedTourData(fixture, 'en'),
    }

    if (!product) {
      product = await payload.create({
        collection: 'tour-products',
        context: fixtureContext,
        data: productData as never,
        locale: 'en',
        overrideAccess: true,
        req,
      })
    } else {
      product = await payload.update({
        collection: 'tour-products',
        context: fixtureContext,
        data: productData as never,
        id: product.id,
        locale: 'en',
        overrideAccess: true,
        req,
      })
    }

    for (const locale of wingSideJourneyFixtureManifest.tenant.locales) {
      if (locale === 'en') continue

      await Promise.all([
        payload.update({
          collection: 'pages',
          context: fixtureContext,
          data: { ...pageData, ...localizedPageData(fixture, locale) } as never,
          id: page.id,
          locale,
          overrideAccess: true,
          req,
        }),
        payload.update({
          collection: 'tour-products',
          context: fixtureContext,
          data: { ...productData, ...localizedTourData(fixture, locale) } as never,
          id: product.id,
          locale,
          overrideAccess: true,
          req,
        }),
      ])
    }
  }
}
