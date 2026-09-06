import {
  applySelection,
  createLifecyclePlan,
  DOICANHVIET_SITE_CODE,
  initializePayloadForApply,
  printLifecycleError,
  printLifecycleJSON,
  relationID,
  resolveSuperAdmin,
  resolveWingsGoSite,
} from './doicanhviet-lifecycle-safety'

const context = { disableRevalidate: true, import: true }

const main = async () => {
  const plan = createLifecyclePlan(process.argv.slice(2), 'delete')
  const selection = applySelection(plan)
  if (!plan.apply) {
    printLifecycleJSON({
      apply: false,
      operation: 'delete',
      requiresExplicitOnlyOnApply: selection.sourceIds.length === 0,
      selection,
      siteCode: DOICANHVIET_SITE_CODE,
    })
    return
  }

  const runtime = await initializePayloadForApply()
  const { payload } = runtime
  try {
    const user = await resolveSuperAdmin(payload, plan.adminEmail!)
    const req = await runtime.createLocalReq({ user }, payload)
    const site = await resolveWingsGoSite(payload, req)
    const productsResult = await payload.find({
      collection: 'tour-products',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
      where: { and: [{ site: { equals: site.id } }, { tourCode: { in: selection.tourCodes } }] },
    })
    const products = [...productsResult.docs].sort((left: any, right: any) =>
      String(left.tourCode).localeCompare(String(right.tourCode), 'en'),
    ) as Array<Record<string, any>>
    const plans: Array<{
      product: Record<string, any>
      departures: any[]
      pageId: number | string | null
    }> = []
    const pageIDs = new Set<string>()
    for (const product of products) {
      const departuresResult = await payload.find({
        collection: 'tour-departures',
        depth: 0,
        pagination: false,
        overrideAccess: true,
        req,
        where: { and: [{ site: { equals: site.id } }, { tourProduct: { equals: product.id } }] },
      })
      const pageId = relationID(product.wrapperPage)
      if (pageId !== null) pageIDs.add(String(pageId))
      plans.push({
        product,
        departures: [...departuresResult.docs].sort((left: any, right: any) =>
          String(left.id).localeCompare(String(right.id), 'en'),
        ),
        pageId,
      })
    }

    const pages = new Map<string, any>()
    for (const pageId of pageIDs) {
      const page = await payload.findByID({
        collection: 'pages',
        id: pageId,
        depth: 0,
        overrideAccess: true,
        req,
      })
      if (String(relationID(page.site)) !== String(site.id))
        throw new Error(`Page site mismatch: ${pageId}`)
      pages.set(pageId, page)
    }

    let departuresDeleted = 0
    for (const { departures, pageId, product } of [...plans].reverse()) {
      for (const departure of [...departures].reverse()) {
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
      if (pageId !== null && pages.has(String(pageId))) {
        await payload.delete({
          collection: 'pages',
          context,
          id: pageId,
          overrideAccess: true,
          req,
        })
      }
    }
    printLifecycleJSON({
      apply: true,
      departuresDeleted,
      operation: 'delete',
      pagesDeleted: pages.size,
      productsDeleted: products.length,
      selection,
      siteCode: DOICANHVIET_SITE_CODE,
      siteId: relationID(site.id),
    })
  } finally {
    await payload.destroy()
  }
}

main().catch((error) => {
  printLifecycleError(error)
  process.exitCode = 1
})
