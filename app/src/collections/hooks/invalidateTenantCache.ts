import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { invalidateSettingsCache, invalidateSitesCache } from '@/infrastructure/cache/tenantCache'

const relationshipID = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

export const invalidateSitesAfterChange: CollectionAfterChangeHook = async () => {
  await invalidateSitesCache()
}

export const invalidateSitesAfterDelete: CollectionAfterDeleteHook = async () => {
  await invalidateSitesCache()
}

export const invalidateSettingsAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc }) => {
  const siteIDs = new Set(
    [relationshipID(doc.site), relationshipID(previousDoc?.site)].filter(
      (id): id is number | string => id !== null,
    ),
  )
  await Promise.all(Array.from(siteIDs, (siteID) => invalidateSettingsCache(siteID)))
}

export const invalidateSettingsAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  const siteID = relationshipID(doc.site)
  if (siteID !== null) await invalidateSettingsCache(siteID)
}
