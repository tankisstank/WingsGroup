import type { CollectionBeforeChangeHook } from 'payload'

import type { Page } from '@/payload-types'

type Relation = number | string | { id?: number | string | null } | null | undefined

type CatalogSelection = {
  featuredTours?: Relation[] | null
  enabled?: boolean | null
}

type PageWithWingsGoCatalog = Page & {
  wingsGoTourCatalog?: CatalogSelection | null
}

const relationID = (value: Relation): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return undefined
}

const relationIDs = (value: unknown): Array<number | string> =>
  (Array.isArray(value) ? value : [])
    .map((item) => relationID(item as Relation))
    .filter((id): id is number | string => id !== undefined)

const sameID = (left: unknown, right: unknown) => {
  const leftID = relationID(left as Relation)
  const rightID = relationID(right as Relation)
  return leftID !== undefined && rightID !== undefined && String(leftID) === String(rightID)
}

const catalogPath = (data: Partial<Page>, originalDoc?: Page) =>
  data.pathname ||
  originalDoc?.pathname ||
  (data.slug || originalDoc?.slug ? `/${data.slug || originalDoc?.slug}` : '')

const hasFuturePublishedDeparture = async ({
  payload,
  productID,
  siteID,
  req,
}: {
  payload: Parameters<CollectionBeforeChangeHook>[0]['req']['payload']
  productID: number | string
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
  siteID: number | string
}) => {
  const result = await payload.find({
    collection: 'tour-departures',
    depth: 0,
    draft: false,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { _status: { equals: 'published' } },
        { site: { equals: siteID } },
        { tourProduct: { equals: productID } },
        { departureDate: { greater_than: new Date().toISOString() } },
      ],
    },
  })

  return result.docs.length > 0
}

export const validateWingsGoTourCatalog: CollectionBeforeChangeHook<Page> = async ({
  data,
  originalDoc,
  req,
}) => {
  const nextPage = data as Partial<PageWithWingsGoCatalog>
  const previousPage = originalDoc as PageWithWingsGoCatalog | undefined
  const incoming = (nextPage?.wingsGoTourCatalog || {}) as CatalogSelection
  const previous = (previousPage?.wingsGoTourCatalog || {}) as CatalogSelection
  const catalog = { ...previous, ...incoming }
  const selectedIDs = relationIDs(catalog.featuredTours)

  if (!catalog.enabled && selectedIDs.length === 0) {
    return data
  }

  if (selectedIDs.length > 6) {
    throw new Error('WingsGo tour catalog chỉ được chọn tối đa 6 tour nổi bật.')
  }

  const siteID =
    relationID(nextPage?.site as Relation) ?? relationID(previousPage?.site as Relation)
  const pagePath = catalogPath(nextPage, previousPage)

  if (!siteID || pagePath !== '/tour') {
    throw new Error('WingsGo tour catalog chỉ được cấu hình trên page /tour.')
  }

  const site = await req.payload.findByID({
    collection: 'sites',
    depth: 0,
    id: siteID,
    overrideAccess: true,
    req,
  })

  if (site.code !== 'wings-go') {
    throw new Error('WingsGo tour catalog không được dùng cho site khác.')
  }

  if (new Set(selectedIDs.map(String)).size !== selectedIDs.length) {
    throw new Error('WingsGo tour catalog không được chọn trùng tour.')
  }

  if (selectedIDs.length === 0) {
    return data
  }

  const productsResult = await req.payload.find({
    collection: 'tour-products',
    depth: 1,
    draft: false,
    limit: selectedIDs.length,
    locale: req.locale,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [{ id: { in: selectedIDs } }, { site: { equals: siteID } }],
    },
  })

  const productsByID = new Map(productsResult.docs.map((product) => [String(product.id), product]))

  for (const productID of selectedIDs) {
    const product = productsByID.get(String(productID))

    if (!product || product._status !== 'published' || !sameID(product.site, siteID)) {
      throw new Error('Mỗi tour nổi bật phải là TourProduct WingsGo đã publish.')
    }

    const wrapperID = relationID(product.wrapperPage as Relation)
    const wrapper = wrapperID
      ? await req.payload.findByID({
          collection: 'pages',
          depth: 0,
          draft: false,
          id: wrapperID,
          locale: req.locale,
          overrideAccess: true,
          req,
        })
      : null

    if (
      !wrapper ||
      wrapper._status !== 'published' ||
      !sameID(wrapper.site, siteID) ||
      wrapper.pathname !== `/tour/${product.slug}`
    ) {
      throw new Error('Mỗi tour nổi bật phải có wrapper page /tour/<slug> cùng site đã publish.')
    }

    if (!(await hasFuturePublishedDeparture({ payload: req.payload, productID, req, siteID }))) {
      throw new Error('Mỗi tour nổi bật phải có ít nhất một đợt khởi hành tương lai đã publish.')
    }
  }

  return data
}
