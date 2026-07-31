import type { CollectionBeforeValidateHook } from 'payload'

type Relation = number | string | { id?: number | string | null } | null | undefined

export type GovernedDepartureFreshness = {
  expiresAt?: null | string
  verifiedAt?: null | string
}

const relationID = (value: Relation): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

const dateOnlyUTC = (value: unknown): string | null => {
  const date = new Date(String(value || ''))
  if (!Number.isFinite(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

const normalizeVariantKey = (value: unknown): string | null => {
  const normalized = String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, '-')
  return normalized || null
}

export const buildDepartureInventoryIdentity = ({
  departureDate,
  site,
  tourProduct,
  variantKey,
  variantRef,
}: {
  departureDate?: unknown
  site?: Relation
  tourProduct?: Relation
  variantKey?: unknown
  variantRef?: Relation
}): string | null => {
  const siteID = relationID(site)
  const tourID = relationID(tourProduct)
  const date = dateOnlyUTC(departureDate)
  if (siteID == null || tourID == null || !date) return null

  const variantID = relationID(variantRef)
  const normalizedVariantKey = normalizeVariantKey(variantKey)
  const variant =
    variantID != null
      ? `ref:${variantID}`
      : normalizedVariantKey
        ? `key:${normalizedVariantKey}`
        : 'base'

  return `s:${siteID}|t:${tourID}|d:${date}|v:${variant}`
}

/**
 * Price, departure and availability claims are visible only inside a current
 * verification window. Expiry does not remove the tour or its contact fallback.
 */
export const isDepartureVerificationCurrent = (
  departure: GovernedDepartureFreshness,
  now = Date.now(),
): boolean => {
  const verifiedAt = Date.parse(departure.verifiedAt || '')
  const expiresAt = Date.parse(departure.expiresAt || '')
  return (
    Number.isFinite(verifiedAt) &&
    Number.isFinite(expiresAt) &&
    verifiedAt <= now &&
    expiresAt > now &&
    verifiedAt < expiresAt
  )
}

export const setDepartureInventoryIdentity: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
}) => {
  if (!data) return data
  const merged = { ...(originalDoc || {}), ...data }
  return {
    ...data,
    inventoryIdentity: buildDepartureInventoryIdentity({
      departureDate: merged.departureDate,
      site: merged.site,
      tourProduct: merged.tourProduct,
      variantKey: merged.variantKey,
      variantRef: merged.variantRef,
    }),
  }
}
