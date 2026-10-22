import { TARGET_SITE_ID, type OwnedFixtureIDs } from './cmsLifecycleProofSafety'

type Document = Record<string, unknown> & { id: number | string }
type Client = {
  request<T>(endpoint: string): Promise<{ data: T; status: number }>
}

/** Recover only this run's nonce-marked records after an ambiguous HTTP commit. */
export const reconcileCmsProof = async (
  client: Client,
  owned: OwnedFixtureIDs,
  ownerMarker: string,
) => {
  if (!/^\[proof:[0-9a-f-]{36}\]$/u.test(ownerMarker)) {
    throw new Error('Invalid proof ownership marker')
  }
  const find = async (collection: string, filters: Record<string, string>) => {
    const query = new URLSearchParams({ depth: '0', draft: 'true', limit: '2', locale: 'vi' })
    query.set('where[and][0][site][equals]', String(TARGET_SITE_ID))
    let index = 1
    for (const [field, value] of Object.entries(filters)) {
      query.set(`where[and][${index}][${field}][equals]`, value)
      index += 1
    }
    const { data } = await client.request<{ docs: Document[] }>(`/api/${collection}?${query}`)
    if (!Array.isArray(data.docs) || data.docs.length > 1) {
      throw new Error(`Ambiguous proof recovery for ${collection}`)
    }
    const doc = data.docs[0]
    if (!doc) return null
    if (doc.id == null || Number(doc.site) !== TARGET_SITE_ID) {
      throw new Error(`Invalid proof recovery scope for ${collection}`)
    }
    return doc
  }

  if (owned.productID == null) {
    const product = await find('tour-products', { slug: String(owned.slug) })
    if (product) {
      if (product.slug !== owned.slug || !String(product.title).includes(ownerMarker)) {
        throw new Error('Refusing to recover a tour from another run')
      }
      owned.productID = product.id
    }
  }
  if (owned.departureID == null && owned.productID != null) {
    const departure = await find('tour-departures', {
      tourProduct: String(owned.productID),
      variantKey: ownerMarker,
    })
    if (departure) {
      if (
        String(departure.tourProduct) !== String(owned.productID) ||
        departure.variantKey !== ownerMarker
      ) {
        throw new Error('Refusing to recover a departure from another run')
      }
      owned.departureID = departure.id
    }
  }
  if (owned.wrapperID == null) {
    const pathname = `/tour/${owned.slug}`
    const wrapper = await find('pages', { pathname })
    if (wrapper) {
      if (wrapper.pathname !== pathname || !String(wrapper.title).includes(ownerMarker)) {
        throw new Error('Refusing to recover a wrapper from another run')
      }
      owned.wrapperID = wrapper.id
    }
  }
}
