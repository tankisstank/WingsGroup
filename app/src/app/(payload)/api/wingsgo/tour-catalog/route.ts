import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import type { Site } from '@/payload-types'
import {
  parseWingsGoCatalogFilters,
  queryWingsGoTourCatalog,
  WINGSGO_CATALOG_BATCH_SIZE,
  type WingsGoCatalogPage,
} from '@/tours/wingsGoCatalog'
import { getCopyLocale, type CopyLocaleCode } from '@/utilities/locales'
import { getCurrentLocale, getCurrentSite } from '@/utilities/siteContext'

const emptyCatalog = {
  all: [],
  featured: [],
  hasMore: false,
  nextOffset: 0,
} as const

const jsonNoStore = (body: unknown, init?: ResponseInit) =>
  NextResponse.json(body, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      'Cache-Control': 'no-store',
    },
  })

const parseNonNegativeInteger = (value: string | null, fallback: number) => {
  if (value === null || value === '') return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const requestedLimit = parseNonNegativeInteger(
    url.searchParams.get('limit'),
    WINGSGO_CATALOG_BATCH_SIZE,
  )
  const offset = parseNonNegativeInteger(url.searchParams.get('offset'), 0)

  if (
    requestedLimit === null ||
    requestedLimit < 1 ||
    requestedLimit > WINGSGO_CATALOG_BATCH_SIZE ||
    offset === null
  ) {
    return jsonNoStore({ error: 'Invalid catalog pagination.' }, { status: 400 })
  }

  try {
    const payload = await getPayload({ config: configPromise })
    const site = await getCurrentSite()
    const requestedLocaleParam = url.searchParams.get('locale')
    const resolvedLocale: CopyLocaleCode =
      requestedLocaleParam === 'en' || requestedLocaleParam === 'vi'
        ? requestedLocaleParam
        : getCopyLocale(await getCurrentLocale())

    if (!site || site.code !== 'wings-go') return jsonNoStore(emptyCatalog)

    const pageResult = await payload.find({
      collection: 'pages',
      depth: 2,
      draft: false,
      fallbackLocale: resolvedLocale === 'en' ? false : 'vi',
      limit: 1,
      locale: resolvedLocale,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [
          { _status: { equals: 'published' } },
          { pathname: { equals: '/tour' } },
          { site: { equals: site.id } },
        ],
      },
    })
    const page = pageResult.docs[0] as unknown as WingsGoCatalogPage | undefined

    if (!page?.wingsGoTourCatalog?.enabled) return jsonNoStore(emptyCatalog)

    const data = await queryWingsGoTourCatalog({
      filters: parseWingsGoCatalogFilters(url.searchParams),
      limit: requestedLimit,
      locale: resolvedLocale,
      offset,
      page,
      payload,
      site: site as Site,
    })

    return jsonNoStore(data)
  } catch (error) {
    // Keep the public contract deliberately generic, but retain the causal
    // error in the server log so an operational failure is diagnosable.
    console.error('WingsGo catalog request failed', error)
    return jsonNoStore({ error: 'Unable to load the WingsGo catalog.' }, { status: 500 })
  }
}
