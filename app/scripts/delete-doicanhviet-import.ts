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

  let departuresDeleted = 0
  let pagesDeleted = 0
  let productsDeleted = 0
  const pageIDs = products.docs
    .map((product) => relationID((product as any).wrapperPage))
    .filter(Boolean)

  for (const product of products.docs) {
    const departures = await payload.find({
      collection: 'tour-departures',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      req,
      where: { tourProduct: { equals: product.id } },
    })

    for (const departure of departures.docs) {
      await payload.delete({
        collection: 'tour-departures',
        context,
        id: departure.id,
        overrideAccess: true,
        req,
      })
      departuresDeleted += 1
    }

    await payload.delete({
      collection: 'tour-products',
      context,
      id: product.id,
      overrideAccess: true,
      req,
    })
    productsDeleted += 1
  }

  for (const pageID of pageIDs) {
    await payload
      .delete({
        collection: 'pages',
        context,
        id: pageID as number | string,
        overrideAccess: true,
        req,
      })
      .then(() => {
        pagesDeleted += 1
      })
      .catch(() => undefined)
  }

  console.log(
    JSON.stringify(
      {
        departuresDeleted,
        pagesDeleted,
        productsDeleted,
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
