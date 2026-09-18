import { isDepartureVerificationCurrent } from '@/tours/departureCommerce'

export type TourAuthoringRelation = number | string | { id?: number | string | null } | null | undefined

export type TourAuthoringSite = {
  code?: string | null
  id: number | string
  name?: string | null
}

export type TourAuthoringSiteState =
  | { kind: 'none'; message: string }
  | { kind: 'fixed'; siteID: number | string; siteName: string }
  | { kind: 'choose'; siteIDs: Array<number | string> }

export const tourAuthoringRelationID = (value: TourAuthoringRelation): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  return value?.id == null ? undefined : value.id
}

export const tourAuthoringSiteCode = (value: TourAuthoringRelation | Partial<TourAuthoringSite>): string | undefined => {
  return typeof value === 'object' && value && 'code' in value && value.code ? value.code : undefined
}

export const getTourAuthoringSiteState = ({
  currentSite,
  isNew,
  userSiteIDs,
}: {
  currentSite?: TourAuthoringRelation
  isNew: boolean
  userSiteIDs: Array<number | string>
}): TourAuthoringSiteState => {
  const currentSiteID = tourAuthoringRelationID(currentSite)
  if (!isNew && currentSiteID !== undefined) {
    return { kind: 'fixed', siteID: currentSiteID, siteName: 'Site hiện tại' }
  }
  if (userSiteIDs.length === 1) {
    return { kind: 'fixed', siteID: userSiteIDs[0], siteName: 'Site được phân quyền' }
  }
  if (userSiteIDs.length > 1) return { kind: 'choose', siteIDs: userSiteIDs }
  return { kind: 'none', message: 'Tài khoản chưa được gán site.' }
}

export const getTourAuthoringTourTypePresentation = (siteCode?: string) => ({
  hidden: siteCode === 'wings-go',
  label: siteCode === 'wing-side' ? 'Loại tour WingSide' : 'Phân loại tour',
})

export const parseTourAuthoringPrice = (value: unknown, currency = 'VND'): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null
  if (typeof value !== 'string' || !value.trim()) return null

  const input = value.trim()
  if (currency === 'VND' && (/^\d{1,3}(?:[.,]\d{3})+$/u.test(input) || /^\d+$/u.test(input))) {
    const parsed = Number(input.replace(/[.,]/gu, ''))
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
  }
  if (currency === 'VND') return null

  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export type TourAuthoringFreshness = 'current' | 'needs-verification' | 'expired'

export const getTourAuthoringFreshness = (
  departure: { expiresAt?: null | string; verifiedAt?: null | string },
  now = Date.now(),
): TourAuthoringFreshness => {
  if (departure.expiresAt && Date.parse(departure.expiresAt) <= now) return 'expired'
  return isDepartureVerificationCurrent(departure, now) ? 'current' : 'needs-verification'
}

export const normalizeTourAuthoringRelations = (value: unknown): Array<number | string> => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => tourAuthoringRelationID(item as TourAuthoringRelation))
    .filter((item): item is number | string => item !== undefined)
}

export const buildTourAuthoringDepartureQuery = (productID: number | string, siteID: number | string) => {
  const params = new URLSearchParams({
    depth: '1',
    limit: '100',
    sort: 'departureDate',
  })
  params.set('where[tourProduct][equals]', String(productID))
  params.set('where[site][equals]', String(siteID))
  return `/api/tour-departures?${params.toString()}`
}
