import type { CollectionBeforeChangeHook } from 'payload'

import { normalizeRelationID } from '@/access/roles'

/**
 * A tour without a tenant can never be published. Keep this check separate
 * from the normal site assignment hook so it also protects scheduled/bulk
 * publishing and requests that deliberately bypass access checks.
 */
export const enforceTourProductPublishSite: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
}) => {
  const targetStatus = data?._status ?? originalDoc?._status

  if (targetStatus !== 'published') {
    return data
  }

  const siteID = normalizeRelationID(data?.site ?? originalDoc?.site)

  if (siteID === undefined) {
    throw new Error('Không thể xuất bản tour khi chưa gán site.')
  }

  return data
}
