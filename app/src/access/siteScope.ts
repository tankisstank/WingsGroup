import type { Access, CollectionBeforeChangeHook, Where } from 'payload'

import type { AppUser, RelationID, RelationValue } from '@/types/auth'

import { buildSiteWhere, getUserSiteIDs, hasRole, isSuperAdmin, normalizeRelationID } from './roles'
import { isExplicitWingsGroupLocalDraftPreviewRequest } from '@/wingsgroup/localPreview'

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

const publicMediaWhere: Where = {
  or: [
    { 'governance.managedBy': { not_equals: 'wingsgroup-v3' } },
    {
      and: [
        { 'governance.managedBy': { equals: 'wingsgroup-v3' } },
        { 'governance.publicationState': { equals: 'published' } },
        { 'governance.rightsState': { equals: 'approved' } },
        { 'governance.derivativeState': { equals: 'verified' } },
        { 'governance.sourceAttachmentId': { exists: true } },
        { 'governance.sourceIdentity': { exists: true } },
        { 'governance.sourceArchiveSha256': { exists: true } },
        { 'governance.sourceFileSha256': { exists: true } },
        { 'governance.provenanceReference': { exists: true } },
        { 'governance.rightsEvidence': { exists: true } },
        { site: { exists: true } },
        { url: { exists: true } },
      ],
    },
  ],
}

/**
 * Media is the one public collection whose records may contain governed
 * development assets. Keep those assets invisible unless an authenticated
 * operator is explicitly in the local Next draft preview.
 */
export const wingsGroupMediaReadAccess: Access = ({ req }) => {
  if (
    isExplicitWingsGroupLocalDraftPreviewRequest({
      context: req.context as Record<string, unknown> | undefined,
      headers: req.headers,
      user: req.user,
    })
  ) {
    return siteScopedAccess()({ req })
  }

  return publicMediaWhere
}

export const siteScopedOrPublished = (fieldName = 'site'): Access => {
  return (args) => {
    if (!args.req.user) {
      return {
        and: [
          {
            _status: {
              equals: 'published',
            },
          },
          {
            [fieldName]: {
              exists: true,
            },
          },
        ],
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
