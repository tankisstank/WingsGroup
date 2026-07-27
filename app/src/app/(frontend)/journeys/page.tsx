import type { Metadata } from 'next'
import React from 'react'

import { getWingSideDiscoveryContext } from '@/tours/discovery'
import { getDiscoverySEOPolicy, normalizeDiscoveryQuery } from '@/tours/discoveryCore'
import { getWingSideJourneysCopy, isWingSideJourneyLocale } from '@/tours/journeysCopy'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getCurrentLocale, getCurrentSite } from '@/utilities/siteContext'
import {
  getCanonicalSiteOrigin,
  getSiteSitemapLocales,
  getSiteSitemapURL,
} from '@/utilities/siteSEO'

import {
  generateCmsPageMetadataByPath,
  renderCmsPageByPath,
} from '@/app/(frontend)/[...slug]/page'

import { WingSideJourneysClient } from './WingSideJourneysClient'

type Args = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const routePath = '/journeys'

export default async function JourneysPage({ searchParams: searchParamsPromise }: Args) {
  const site = await getCurrentSite()
  const locale = await getCurrentLocale()
  const searchParams = searchParamsPromise ? await searchParamsPromise : {}

  if (site.code !== 'wing-side' || !isWingSideJourneyLocale(locale)) {
    return renderCmsPageByPath({
      requestedPath: routePath,
      searchParams: searchParamsPromise,
    })
  }

  const context = await getWingSideDiscoveryContext({ input: searchParams, locale })

  return <WingSideJourneysClient context={context} locale={locale} />
}

export async function generateMetadata({
  searchParams: searchParamsPromise,
}: Args): Promise<Metadata> {
  const site = await getCurrentSite()
  const locale = await getCurrentLocale()
  const settings = await getCurrentSiteSettings()

  if (site.code !== 'wing-side' || !isWingSideJourneyLocale(locale)) {
    return generateCmsPageMetadataByPath({ requestedPath: routePath })
  }

  const searchParams = searchParamsPromise ? await searchParamsPromise : {}
  const seo = getDiscoverySEOPolicy(normalizeDiscoveryQuery(searchParams))
  const copy = getWingSideJourneysCopy(locale)
  const origin = getCanonicalSiteOrigin({ settings, site })
  const canonical = getSiteSitemapURL({ locale, origin, path: routePath })
  const languages = Object.fromEntries(
    getSiteSitemapLocales(site).map((publicLocale) => [
      publicLocale,
      getSiteSitemapURL({ locale: publicLocale, origin, path: routePath }),
    ]),
  )
  const title = `${copy.metaTitle} | ${settings?.siteName || 'WingSide'}`

  return {
    alternates: { canonical, languages },
    description: copy.metaDescription,
    metadataBase: new URL(origin),
    openGraph: {
      description: copy.metaDescription,
      siteName: settings?.siteName || 'WingSide',
      title,
      type: 'website',
      url: canonical,
    },
    robots:
      seo.robots === 'index,follow'
        ? { follow: true, index: true }
        : { follow: true, index: false },
    title,
  }
}
