import type { Site } from '@/payload-types'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const relationID = (value: unknown): number | string | null =>
  isRecord(value) && (typeof value.id === 'number' || typeof value.id === 'string')
    ? value.id
    : typeof value === 'number' || typeof value === 'string'
      ? value
      : null

const isGovernedMediaRelation = (value: RecordValue): boolean =>
  typeof value.url === 'string' && typeof value.alt === 'string' && isRecord(value.governance)

/**
 * Anonymous site reads intentionally do not populate the `sites` collection.
 * Payload consequently leaves a governed media relation's `site` as its ID.
 *
 * A page has already been queried under the current site's server-side scope.
 * This adapter restores only that known site identity on matching media records
 * so the client-side publication validator can remain fail-closed for any
 * foreign or unresolved relationship.
 */
export const hydrateScopedWingsGroupMediaRelations = <T>(
  value: T,
  site: Pick<Site, 'code' | 'id'>,
): T => {
  if (site.code !== 'wings-group') return value

  const visit = (current: unknown): unknown => {
    if (Array.isArray(current)) return current.map(visit)
    if (!isRecord(current)) return current

    const hydrated = Object.fromEntries(
      Object.entries(current).map(([key, child]) => [key, visit(child)]),
    )
    if (!isGovernedMediaRelation(current) || String(relationID(current.site)) !== String(site.id)) {
      return hydrated
    }

    return {
      ...hydrated,
      site: { code: site.code, id: site.id },
    }
  }

  return visit(value) as T
}
