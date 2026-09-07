import {
  applySelection,
  createLifecyclePlan,
  DOICANHVIET_SITE_CODE,
  initializePayloadForApply,
  mediaFilenamePrefixesFromSourceIDs,
  printLifecycleError,
  printLifecycleJSON,
  relationID,
  resolveSuperAdmin,
  resolveWingsGoSite,
} from './doicanhviet-lifecycle-safety'
import {
  removeAirlineMarkers,
  trimSourceUiTail,
  type NormalizedItineraryDay,
} from './lib/doicanhviet'

const context = { disableRevalidate: true, import: true }

const normalizeComparableText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()

const placeholderPatterns = [
  /^dang cap nhat$/iu,
  /^theo line ban$/iu,
  /^route fallback$/iu,
  /^khach retail can route ro$/iu,
  /^can bang tham quan, nghi va thoi gian tu do$/iu,
]

const isPlaceholder = (value: unknown) => {
  const text = String(value || '').trim()
  if (!text) return true
  return placeholderPatterns.some((pattern) => pattern.test(normalizeComparableText(text)))
}

const cleanOptional = (value: unknown) => {
  const text = trimSourceUiTail(String(value || ''))
  return isPlaceholder(text) ? undefined : text
}

const cleanAccommodation = (value: unknown) => {
  const text = cleanOptional(value)
  if (!text) return undefined
  if (/trả phòng|dùng bữa sáng/iu.test(text) && !/nghỉ đêm|nhận phòng|lưu trú/iu.test(text))
    return undefined
  return text
}

const cleanDay = (day: Record<string, unknown>): NormalizedItineraryDay => ({
  ...day,
  accommodation: cleanAccommodation(day.accommodation),
  notes: cleanOptional(day.notes),
  route: cleanOptional(day.route) || String(day.title || ''),
  summary: cleanOptional(day.summary) || '',
  title: cleanOptional(day.title) || '',
  transport: cleanOptional(day.transport),
  dayNumber: Number(day.dayNumber || 0),
  meals: cleanOptional(day.meals),
})

const main = async () => {
  const plan = createLifecyclePlan(process.argv.slice(2), 'clean')
  const selection = applySelection(plan)
  if (!plan.apply) {
    printLifecycleJSON({
      apply: false,
      operation: 'clean',
      requiresExplicitOnlyOnApply: selection.sourceIds.length === 0,
      selection: {
        ...selection,
        mediaFilenamePrefixes: mediaFilenamePrefixesFromSourceIDs(plan.only),
      },
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
    const products = await payload.find({
      collection: 'tour-products',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
      where: { and: [{ site: { equals: site.id } }, { tourCode: { in: selection.tourCodes } }] },
    })
    const media = await payload.find({
      collection: 'media',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
      where: {
        and: [
          { site: { equals: site.id } },
          {
            or: mediaFilenamePrefixesFromSourceIDs(plan.only).map((prefix) => ({
              filename: { like: prefix },
            })),
          },
        ],
      },
    })

    const productDocs = [...products.docs].sort((left: any, right: any) =>
      String(left.tourCode).localeCompare(String(right.tourCode), 'en'),
    )
    const mediaDocs = [...media.docs].sort((left: any, right: any) =>
      String(left.filename).localeCompare(String(right.filename), 'en'),
    )
    for (const product of productDocs as Array<Record<string, any>>) {
      const itineraryDays = Array.isArray(product.itineraryDays) ? product.itineraryDays : []
      const servicesSummary = product.servicesSummary
        ? {
            ...product.servicesSummary,
            hotelSummary: cleanOptional(product.servicesSummary.hotelSummary),
            mealsSummary: cleanOptional(product.servicesSummary.mealsSummary),
            transportSummary: cleanOptional(product.servicesSummary.transportSummary),
          }
        : product.servicesSummary
      await payload.update({
        collection: 'tour-products',
        context,
        data: {
          itineraryDays: itineraryDays.map(cleanDay),
          servicesSummary,
          summary: cleanOptional(product.summary) || product.summary,
        } as never,
        id: product.id,
        overrideAccess: true,
        req,
      })
    }
    let mediaUpdated = 0
    for (const item of mediaDocs as Array<Record<string, any>>) {
      const alt = removeAirlineMarkers(String(item.alt || ''))
      if (!alt || alt === item.alt) continue
      await payload.update({
        collection: 'media',
        context,
        data: { alt } as never,
        id: item.id,
        overrideAccess: true,
        req,
      })
      mediaUpdated += 1
    }
    printLifecycleJSON({
      apply: true,
      mediaUpdated,
      operation: 'clean',
      productsUpdated: productDocs.length,
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
