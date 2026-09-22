import type { Access, CollectionBeforeChangeHook, PayloadRequest, Where } from 'payload'

import type { AppUser, RelationID, RelationValue } from '@/types/auth'

import { buildSiteWhere, getUserSiteIDs, hasRole, isSuperAdmin, normalizeRelationID } from './roles'
import {
  hasWingsGroupLocalDraftPreviewSignal,
  isExplicitWingsGroupLocalDraftPreviewRequest,
} from '@/wingsgroup/localPreview'
import { defaultSiteCode } from '@/utilities/sitePaths'
import {
  domainCandidates,
  hasValidTrustedSiteContext,
  requestHostCandidates,
} from '@/utilities/siteDomains'
import {
  allSiteAliasToCodeMap,
  getLocaleFromPathname,
  getSiteAliasFromPathname,
  isPublicLocale,
} from '@/utilities/sitePaths'
import {
  isWingsGroupV3DerivativeFilename,
  WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES,
} from '@/fields/wingsGroupV3'

type SiteScopedData = {
  id: RelationID
  site?: RelationValue
}

const hasSiteAccess = (siteIDs: RelationID[], targetSiteID: RelationID): boolean => {
  return siteIDs.some((siteID) => String(siteID) === String(targetSiteID))
}

const isExternalHTTPRequest = (req: Pick<PayloadRequest, 'headers'>): boolean =>
  Boolean(req.headers?.get('host'))

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
      if (isExternalHTTPRequest(args.req)) return false
      return true
    }

    return siteScopedAccess(fieldName)(args)
  }
}

const publicMediaWhere = (requestedFilename?: string): Where => {
  const governedConditions: Where[] = [
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
  ]
  if (requestedFilename) {
    governedConditions.push(
      isWingsGroupV3DerivativeFilename(requestedFilename)
        ? {
            or: [
              ...WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES.map(({ name }) => ({
                [`sizes.${name}.filename`]: { equals: requestedFilename },
              })),
            ],
          }
        : { filename: { equals: requestedFilename } },
    )
  }
  return {
    or: [{ 'governance.managedBy': { not_equals: 'wingsgroup-v3' } }, { and: governedConditions }],
  }
}

const resolveTrustedPublicMediaSiteID = async (req: PayloadRequest): Promise<RelationID | null> => {
  const siteCode = req.headers.get('x-site-code') || null
  const sites = await req.payload.find({
    collection: 'sites',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    where: siteCode
      ? {
          and: [{ code: { equals: siteCode } }, { isActive: { equals: true } }],
        }
      : { isActive: { equals: true } },
  })

  if (siteCode) return sites.docs[0]?.id || null

  const hostCandidates = requestHostCandidates(req.headers)
  const hostSite = sites.docs.find((site) => {
    const domains = [
      ...domainCandidates(site.primaryDomain),
      ...((site.additionalDomains || []) as Array<{ domain?: null | string }>).flatMap(
        ({ domain }) => domainCandidates(domain),
      ),
    ]
    return domains.some((domain) => hostCandidates.includes(domain))
  })

  if (hostSite) return hostSite.id

  const defaultSite = await req.payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [{ code: { equals: defaultSiteCode } }, { isActive: { equals: true } }],
    },
  })

  return defaultSite.docs[0]?.id || null
}

const getPublicMediaWhere = async (req: PayloadRequest): Promise<Where | false> => {
  if (!isExternalHTTPRequest(req)) return publicMediaWhere()

  const publicPath = req.headers.get('x-public-path') || ''
  const publicAlias = getSiteAliasFromPathname(publicPath)
  const publicLocale = getLocaleFromPathname(publicPath)
  const pathSegments = publicPath.split('/').filter(Boolean)
  const pathOffset = publicAlias ? (publicLocale ? 2 : 1) : publicLocale ? 1 : 0
  const mediaPath = `/${pathSegments.slice(pathOffset).join('/')}`
  const contextSiteCode = req.headers.get('x-site-code') || null
  if (
    !mediaPath.startsWith('/media/') ||
    mediaPath.slice('/media/'.length).includes('/') ||
    mediaPath.slice('/media/'.length).includes('\\') ||
    ['.', '..'].includes(mediaPath.slice('/media/'.length)) ||
    (publicLocale && !isPublicLocale(publicLocale)) ||
    (publicAlias && contextSiteCode !== allSiteAliasToCodeMap[publicAlias]) ||
    !(await hasValidTrustedSiteContext(req.headers))
  ) {
    return false
  }

  const siteID = await resolveTrustedPublicMediaSiteID(req)
  if (siteID === null) return false

  const requestedFilename = mediaPath.slice('/media/'.length)

  return {
    and: [{ site: { equals: siteID } }, publicMediaWhere(requestedFilename)],
  }
}

/**
 * Media is the one public collection whose records may contain governed
 * development assets. Keep those assets invisible unless an authenticated
 * operator is explicitly in the local Next draft preview.
 */
export const wingsGroupMediaReadAccess: Access = async ({ req }) => {
  const context = req.context as Record<string, unknown> | undefined
  const headers = req.headers

  if (!req.user) {
    return getPublicMediaWhere(req)
  }

  // A local draft-preview signal is never valid in production. Deny the
  // request instead of falling through to the authenticated site scope, which
  // could otherwise expose pending governed media through a trusted context.
  if (
    process.env.NODE_ENV === 'production' &&
    (await hasWingsGroupLocalDraftPreviewSignal({ context, headers }))
  ) {
    return false
  }

  if (
    await isExplicitWingsGroupLocalDraftPreviewRequest({
      context,
      headers,
      user: req.user,
    })
  ) {
    return siteScopedAccess()({ req })
  }

  // Normal authenticated Media reads retain tenant isolation. Only anonymous
  // reads use the public publication/evidence predicate above.
  return siteScopedAccess()({ req })
}

export const siteScopedOrPublished = (fieldName = 'site'): Access => {
  return (args) => {
    if (!args.req.user) {
      if (isExternalHTTPRequest(args.req)) return false
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
