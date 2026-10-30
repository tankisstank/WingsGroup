import type { getPayload } from 'payload'
import { toBusinessCalendarDay } from '@/tours/businessCalendar'
import type { parseLeadRequest } from './validation'

type PayloadClient = Awaited<ReturnType<typeof getPayload>>

const relationID = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (!value || typeof value !== 'object' || !('id' in value)) return null
  const id = (value as { id?: unknown }).id
  return typeof id === 'number' || typeof id === 'string' ? id : null
}

export const resolveDepartureLeadContext = async ({
  context,
  payload,
  siteID,
}: {
  context: ReturnType<typeof parseLeadRequest>['context']
  payload: PayloadClient
  siteID: number | string
}) => {
  if (!context) return undefined
  if (!context.departureId) return context.departureDate ? null : context

  try {
    const departure = await payload.findByID({
      collection: 'tour-departures',
      depth: 0,
      id: context.departureId,
      overrideAccess: true,
    })
    if (!departure || String(relationID(departure.site)) !== String(siteID)) return null

    const tourID = relationID(departure.tourProduct)
    if (tourID === null) return null
    const tour = await payload.findByID({
      collection: 'tour-products',
      depth: 0,
      draft: false,
      id: tourID,
      overrideAccess: true,
    })
    if (
      !tour ||
      String(relationID(tour.site)) !== String(siteID) ||
      tour._status !== 'published'
    ) {
      return null
    }

    // US-093 D6:
    // 1. Calculate Vietnam business day from departureDate
    const vnDay = toBusinessCalendarDay(departure.departureDate)
    if (!vnDay || !/^\d{4}-\d{2}-\d{2}$/.test(vnDay)) {
      return null
    }

    // 2. Calculate legacy UTC date string
    const oldUtcDay = String(departure.departureDate || '').slice(0, 10)

    // 3. If context.departureDate is provided, it must match either vnDay or oldUtcDay
    if (
      (context.departureDate &&
        context.departureDate !== vnDay &&
        context.departureDate !== oldUtcDay) ||
      (context.tourId && context.tourId !== String(tour.id)) ||
      (context.tourSlug && context.tourSlug !== tour.slug)
    ) {
      return null
    }

    // 4. Stored departureDate is always the Vietnam calendar day
    return {
      departureDate: vnDay,
      departureId: String(departure.id),
      discovery: context.discovery,
      intent: context.intent,
      source: context.source,
      tourId: String(tour.id),
      tourSlug: tour.slug || undefined,
    }
  } catch {
    return null
  }
}
