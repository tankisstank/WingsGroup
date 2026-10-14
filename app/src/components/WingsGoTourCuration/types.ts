export interface CuratedTourCardData {
  id: number | string
  title: string
  slug: string
  market?: string | null
  durationDays?: number | null
  durationNights?: number | null
  thumbnailUrl?: string | null
  priceFrom?: number | null
  currency?: string | null
  nextDepartureDate?: string | null
  departureCity?: string | null
  airline?: string | null
  promoLabel?: string | null
  isPublished: boolean
  hasFutureDeparture: boolean
  hasWrapperPage: boolean
  wrapperPagePathname?: string | null
  slotNumber: number // 1 to 6
  warnings?: string[]
}

export interface TourPickerCandidate {
  id: number | string
  title: string
  slug: string
  market?: string | null
  durationDays?: number | null
  durationNights?: number | null
  thumbnailUrl?: string | null
  priceFrom?: number | null
  currency?: string | null
  nextDepartureDate?: string | null
  promoLabel?: string | null
  isPublished: boolean
  hasFutureDeparture: boolean
  hasWrapperPage: boolean
}

export type SimulatorViewportMode = 'desktop' | 'mobile'

export interface CurationValidationReport {
  isValid: boolean
  totalCount: number
  errors: string[]
  warnings: string[]
  hasDuplicates: boolean
  missingDepartures: Array<number | string>
  missingPromoInHero: Array<number | string>
}
