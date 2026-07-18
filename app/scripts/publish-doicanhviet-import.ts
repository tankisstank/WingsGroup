import 'dotenv/config'

import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'

const context = { disableRevalidate: true, import: true }

const relationID = (value: number | string | { id?: number | string } | null | undefined) =>
  value && typeof value === 'object' ? value.id : value

const main = async () => {
  const payload = await getPayload({ config })
  const adminEmail = process.env.IMPORT_ADMIN_EMAIL || process.env.ADMIN_EMAIL
  if (!adminEmail) throw new Error('Missing IMPORT_ADMIN_EMAIL or ADMIN_EMAIL')

  const admin = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: adminEmail } },
  })
  if (!admin.docs[0]) throw new Error(`Admin user not found: ${adminEmail}`)
  const req = await createLocalReq({ user: admin.docs[0] }, payload)

  const site = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { code: { equals: 'wings-go' } },
  })
  if (!site.docs[0]) throw new Error('WingsGo site not found: wings-go')
  const siteID = site.docs[0].id

  const products = await payload.find({
    collection: 'tour-products',
    depth: 0,
    limit: 200,
    overrideAccess: true,
    req,
    where: {
      and: [{ site: { equals: siteID } }, { tourCode: { like: 'DCV-' } }],
    },
  })

  const productIDs = products.docs.map((product) => product.id)
  let productsPublished = 0
  let pagesPublished = 0
  let departuresPublished = 0
  const now = new Date().toISOString()

  for (const product of products.docs as Array<Record<string, any>>) {
    await payload.update({
      collection: 'tour-products',
      context,
      data: { _status: 'published' } as never,
      id: product.id,
      overrideAccess: true,
      req,
    })
    productsPublished += 1

    const pageID = relationID(product.wrapperPage)
    if (pageID) {
      await payload.update({
        collection: 'pages',
        context,
        data: { _status: 'published', publishedAt: now } as never,
        id: pageID,
        overrideAccess: true,
        req,
      })
      pagesPublished += 1
    }
  }

  if (productIDs.length > 0) {
    const departures = await payload.find({
      collection: 'tour-departures',
      depth: 0,
      limit: 500,
      overrideAccess: true,
      req,
      where: {
        and: [{ site: { equals: siteID } }, { tourProduct: { in: productIDs } }],
      },
    })

    for (const departure of departures.docs) {
      await payload.update({
        collection: 'tour-departures',
        context,
        data: { _status: 'published' } as never,
        id: departure.id,
        overrideAccess: true,
        req,
      })
      departuresPublished += 1
    }
  }

  console.log(
    JSON.stringify(
      {
        departuresPublished,
        pagesPublished,
        productsPublished,
        siteId: siteID,
      },
      null,
      2,
    ),
  )
  await payload.destroy()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
