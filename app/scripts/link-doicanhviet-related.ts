import 'dotenv/config'

import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'

type TourPage = {
  id: number
  title: string
  slug?: string | null
  relatedPages?: number[] | null
}

type TourProduct = {
  id: number
  slug: string
  market: string
  durationDays?: number | null
}

type Departure = {
  tourProduct: number | { id: number }
  priceFrom?: number | null
}

const relationID = (value: number | { id: number }) =>
  typeof value === 'number' ? value : value.id

const whereAnd = (...conditions: Array<Record<string, unknown>>) => ({ and: conditions }) as any

const updateWithRetry = async (operation: () => Promise<unknown>) => {
  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!String(error).includes('SQLITE_BUSY') || attempt === 4) throw error
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    }
  }
  throw lastError
}

const main = async () => {
  const payload = await getPayload({ config })
  const adminEmail = process.env.IMPORT_ADMIN_EMAIL || 'local-admin@wingsgroup.test'
  const admin = await payload.find({
    collection: 'users',
    where: { email: { equals: adminEmail } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (!admin.docs[0]) throw new Error(`Admin user not found: ${adminEmail}`)
  const req = await createLocalReq({ user: admin.docs[0] }, payload)
  const site = await payload.find({
    collection: 'sites',
    where: { code: { equals: 'wings-go' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (!site.docs[0]) throw new Error('WingsGo site not found: wings-go')
  const siteID = site.docs[0].id

  const [pages, products, departures] = await Promise.all([
    payload.find({
      collection: 'pages',
      where: whereAnd({ site: { equals: siteID } }, { pathname: { like: '/tour/%' } }),
      limit: 200,
      depth: 0,
      overrideAccess: true,
      req,
    }),
    payload.find({
      collection: 'tour-products',
      where: { site: { equals: siteID } },
      limit: 200,
      depth: 0,
      overrideAccess: true,
      req,
    }),
    payload.find({
      collection: 'tour-departures',
      where: { site: { equals: siteID } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
      req,
    }),
  ])

  const pageByProduct = new Map<number, TourPage>()
  const pagesBySlug = new Map(pages.docs.map((page) => [page.slug, page as TourPage]))
  for (const product of products.docs as TourProduct[]) {
    const page = pagesBySlug.get(`wings-go-${product.slug}`)
    if (page) pageByProduct.set(product.id, page)
  }

  const minPrice = new Map<number, number>()
  for (const departure of departures.docs as Departure[]) {
    const productID = relationID(departure.tourProduct)
    if (typeof departure.priceFrom !== 'number') continue
    const current = minPrice.get(productID)
    if (current === undefined || departure.priceFrom < current)
      minPrice.set(productID, departure.priceFrom)
  }

  let updated = 0
  for (const product of products.docs as TourProduct[]) {
    const page = pageByProduct.get(product.id)
    if (!page) continue
    const price = minPrice.get(product.id)
    const candidates = (products.docs as TourProduct[])
      .filter((candidate) => candidate.id !== product.id && pageByProduct.has(candidate.id))
      .map((candidate) => {
        const candidatePrice = minPrice.get(candidate.id)
        const priceGap =
          price !== undefined && candidatePrice !== undefined
            ? Math.abs(price - candidatePrice)
            : Number.POSITIVE_INFINITY
        const sameMarket = candidate.market === product.market
        const samePriceBand =
          priceGap <= 10_000_000 || (price !== undefined && priceGap / Math.max(price, 1) <= 0.2)
        const score =
          (sameMarket ? 100 : 0) +
          (samePriceBand ? 50 : 0) +
          (candidate.durationDays === product.durationDays ? 10 : 0) -
          priceGap / 1_000_000
        return { candidate, score, sameMarket, samePriceBand }
      })
      .filter(({ sameMarket, samePriceBand }) => sameMarket || samePriceBand)
      .sort((left, right) => right.score - left.score)
      .slice(0, 4)
      .map(({ candidate }) => pageByProduct.get(candidate.id)!.id)

    await updateWithRetry(() =>
      payload.update({
        collection: 'pages',
        id: page.id,
        data: { relatedPages: candidates },
        context: { disableRevalidate: true, import: true },
        overrideAccess: true,
        req,
      }),
    )
    updated += 1
    console.log(
      JSON.stringify({
        pageId: page.id,
        productId: product.id,
        market: product.market,
        relatedPages: candidates,
      }),
    )
  }

  console.log(JSON.stringify({ updated }, null, 2))
  await payload.destroy()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
