import type { Access, CollectionBeforeChangeHook } from 'payload'

import type { AppUser, RelationID, RelationValue } from '@/types/auth'

import { buildSiteWhere, getUserSiteIDs, hasRole, isSuperAdmin, normalizeRelationID } from './roles'

type SiteScopedData = {
  id: RelationID
  site?: RelationValue
}

const hasSiteAccess = (siteIDs: RelationID[], targetSiteID: RelationID): boolean => {
  return siteIDs.some((siteID) => String(siteID) === String(targetSiteID))
}

export const siteScopedAccess = (fieldName = 'site'): Access => {
  return ({ req }) => {
    const user = req.user as AppUser | undefined

    if (!user) {
      return false
    }

    if (isSuperAdmin(user)) {
      return true
    }

    return buildSiteWhere(fieldName, getUserSiteIDs(user))
  }
}

export const siteManagerScopedAccess = (fieldName = 'site'): Access => {
  return (args) => {
    const user = args.req.user as AppUser | undefined

    if (!hasRole(user, ['super-admin', 'site-manager'])) {
      return false
    }

    return siteScopedAccess(fieldName)(args)
  }
}

export const siteScopedOrAnyone = (fieldName = 'site'): Access => {
  return (args) => {
    if (!args.req.user) {
      return true
    }

    return siteScopedAccess(fieldName)(args)
  }
}

export const siteScopedOrPublished = (fieldName = 'site'): Access => {
  return (args) => {
    if (!args.req.user) {
      return {
        _status: {
          equals: 'published',
        },
      }
    }

    return siteScopedAccess(fieldName)(args)
  }
}

export const enforceSiteAccess: CollectionBeforeChangeHook<SiteScopedData> = ({
  data,
  originalDoc,
  req,
}) => {
  if (req.context?.seed) {
    return data
  }

  const user = req.user as AppUser | undefined

  if (!user) {
    throw new Error('Authentication is required.')
  }

  if (isSuperAdmin(user)) {
    return data
  }

  const siteIDs = getUserSiteIDs(user)

  if (siteIDs.length === 0) {
    throw new Error('This user is not assigned to any site.')
  }

  const requestedSiteID = normalizeRelationID(data.site)
  const existingSiteID = normalizeRelationID(originalDoc?.site)
  const fallbackSiteID = siteIDs.length === 1 ? siteIDs[0] : undefined
  const targetSiteID = requestedSiteID ?? existingSiteID ?? fallbackSiteID

  if (targetSiteID === undefined) {
    throw new Error('A site must be selected before saving.')
  }

  if (!hasSiteAccess(siteIDs, targetSiteID)) {
    throw new Error('You do not have access to the selected site.')
  }

  return {
    ...data,
    site: targetSiteID,
  }
}
