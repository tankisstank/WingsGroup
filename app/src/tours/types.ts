export const tourSectionIDs = [
  'hero',
  'facts',
  'reviews',
  'why-choose',
  'route',
  'itinerary',
  'services',
  'departures',
  'faq',
  'related',
  'sticky-cta',
] as const

export type TourSectionID = (typeof tourSectionIDs)[number]

export type TourResolvedData = {
  builderConfig?: Record<string, any> | null
  departures: Array<Record<string, any>>
  featuredDepartures: Array<Record<string, any>>
  nextDeparture: Record<string, any> | null
  sectionOrder: TourSectionID[]
  sectionVisibility: TourSectionID[]
  tour: Record<string, any>
  variants: Array<Record<string, any>>
}

/**
 * View models describe the normalized shape the renderers depend on, sitting
 * between raw Payload documents and the UI. They keep an index signature so
 * existing field access keeps working while we migrate surfaces off bare
 * Record<string, any> one at a time.
 */

export type DepartureCardViewModel = {
  airline?: null | string
  availabilityBadge?: null | string
  availabilityStatus?: null | string
  ctaLabelOverride?: null | string
  currency?: null | string
  departureCity?: null | string
  departureDate?: null | string
  id?: number | string
  priceFrom?: null | number
  promoLabel?: null | string
  returnDate?: null | string
  tourProduct?: Record<string, any> | number | string | null
  urgencyLabel?: null | string
  variantRef?: Record<string, any> | number | string | null
  [key: string]: any
}

export type TourCardViewModel = {
  departureCount?: number
  hasFutureDepartures?: boolean
  heroMedia?: any
  id?: number | string
  lowestPrice?: null | number
  market?: null | string
  marketCard?: Record<string, any> | null
  nextDeparture?: Record<string, any> | null
  slug?: null | string
  summary?: null | string
  title?: null | string
  [key: string]: any
}

export type MarketPageViewModel = {
  departures: DepartureCardViewModel[]
  marketKey: string
  tours: TourCardViewModel[]
}

export type ScheduleHeroStats = {
  lowestPrice?: null | number
  nextDeparture?: Record<string, any> | null
  openCount: number
}

export type SchedulePageViewModel = {
  departures: DepartureCardViewModel[]
  featuredDepartures: DepartureCardViewModel[]
  filtersSeed?: {
    airlines: string[]
    markets: string[]
    statuses: string[]
  }
  groupedDepartures?: Array<{ items: DepartureCardViewModel[]; key: string; label: string }>
  heroStats: ScheduleHeroStats
  trustSignals: string[]
}

export type TourDetailViewModel = TourResolvedData
