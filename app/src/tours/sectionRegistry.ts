import type { TourSectionID } from './types'

export const defaultTourSectionOrder: TourSectionID[] = [
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
]

export const defaultTourSectionVisibility: TourSectionID[] = [
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
]

export const normalizeSectionIDs = (value?: null | string[]) => {
  const allowed = new Set(defaultTourSectionOrder)
  const input = Array.isArray(value) ? value : []
  const normalized = input.filter((item): item is TourSectionID => allowed.has(item as TourSectionID))

  return normalized.length > 0 ? normalized : defaultTourSectionOrder
}
