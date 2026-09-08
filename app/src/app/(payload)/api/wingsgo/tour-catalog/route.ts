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
    const locale = await getCurrentLocale()

    if (!site || site.code !== 'wings-go') return jsonNoStore(emptyCatalog)

    const pageResult = await payload.find({
      collection: 'pages',
      depth: 2,
      draft: false,
      fallbackLocale: false,
      limit: 1,
      locale,
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
      offset,
      page,
      payload,
      site: site as Site,
    })

    return jsonNoStore(data)
  } catch {
    return jsonNoStore({ error: 'Unable to load the WingsGo catalog.' }, { status: 500 })
  }
}
