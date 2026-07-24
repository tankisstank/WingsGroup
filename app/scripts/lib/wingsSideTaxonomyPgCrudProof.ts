import config from '../../src/payload.config'
import { createLocalReq, getPayload } from 'payload'

const payload = await getPayload({ config })
const suffix = `${process.pid}-${Date.now()}`
const req = await createLocalReq(
  {
    user: {
      collection: 'users',
      createdAt: new Date(0).toISOString(),
      email: 'taxonomy-pg-proof@internal.invalid',
      id: 0,
      role: 'super-admin',
      sites: [],
      updatedAt: new Date(0).toISOString(),
    } as never,
  },
  payload,
)

let siteID: number | string | null = null
let productID: number | string | null = null

try {
  const site = await payload.create({
    collection: 'sites',
    data: {
      code: `taxonomy-proof-${suffix}`,
      defaultLocale: 'en',
      isActive: false,
      name: `Taxonomy proof ${suffix}`,
      primaryDomain: `taxonomy-proof-${suffix}.invalid`,
      supportedLocales: ['en'],
    },
    overrideAccess: true,
    req,
  })
  siteID = site.id
  const product = await payload.create({
    collection: 'tour-products',
    context: { disableRevalidate: true },
    data: {
      _status: 'published',
      destinationTags: ['hanoi', 'halong'],
      durationDays: 2,
      durationNights: 1,
      itineraryDays: [{ dayNumber: 1, summary: 'Proof day', title: 'Proof day' }],
      market: 'vietnam',
      site: site.id,
      slug: `taxonomy-proof-${suffix}`,
      summary: 'PostgreSQL taxonomy CRUD proof.',
      taxonomyProvenance: { mappingRevision: 'pg-proof' },
      title: `Taxonomy proof ${suffix}`,
      travelStyles: ['culture'],
    },
    draft: true,
    locale: 'en',
    overrideAccess: true,
    req,
  })
  productID = product.id

  const found = await payload.find({
    collection: 'tour-products',
    depth: 0,
    limit: 10,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { site: { equals: site.id } },
        { destinationTags: { in: ['hanoi'] } },
        { travelStyles: { in: ['culture'] } },
      ],
    },
  })
  if (found.docs.length !== 1 || found.docs[0].id !== product.id) {
    throw new Error('PostgreSQL taxonomy has-many query did not return the scoped product')
  }

  const updated = await payload.update({
    collection: 'tour-products',
    context: { disableRevalidate: true },
    data: {
      destinationTags: ['hoian'],
      travelStyles: ['wellness'],
    },
    id: product.id,
    overrideAccess: true,
    req,
  })
  if (
    JSON.stringify(updated.destinationTags) !== JSON.stringify(['hoian']) ||
    JSON.stringify(updated.travelStyles) !== JSON.stringify(['wellness'])
  ) {
    throw new Error('PostgreSQL taxonomy update did not persist')
  }
  console.log(JSON.stringify({ adapter: payload.db.packageName, status: 'pass' }))
} finally {
  if (productID !== null) {
    await payload.delete({
      collection: 'tour-products',
      context: { disableRevalidate: true },
      id: productID,
      overrideAccess: true,
      req,
    })
  }
  if (siteID !== null) {
    await payload.delete({ collection: 'sites', id: siteID, overrideAccess: true, req })
  }
  await payload.destroy()
}

// Payload initializes background job resources that can keep this standalone
// proof process alive after all adapters have been destroyed.
process.exit(0)
