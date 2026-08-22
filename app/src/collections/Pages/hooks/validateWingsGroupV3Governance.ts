import type { CollectionBeforeChangeHook } from 'payload'
import {
  findWingsGroupPublicJargon,
  getWingsGroupRouteDefinition,
  getWingsGroupRoutePublicationState,
  isWingsGroupLocalDraftPreview,
  isWingsGroupPolicyApprovalComplete,
  isWingsGroupScopedInternalHref,
  WINGSGROUP_CONTENT_VALIDATION_MARKER,
  WINGSGROUP_POLICY_VALIDATION_MARKER,
  WINGSGROUP_SITE_CODE,
} from '@/wingsgroup/corporateRoutes'
import { isWingsGroupDevelopmentMedia } from '@/components/WingsGroupV3/model'

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const relationID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  const record = asRecord(value)
  return typeof record.id === 'number' || typeof record.id === 'string' ? record.id : undefined
}

const sameID = (left: unknown, right: unknown): boolean => {
  const leftID = relationID(left)
  const rightID = relationID(right)
  return leftID !== undefined && rightID !== undefined && String(leftID) === String(rightID)
}

const getPathname = (data: UnknownRecord, originalDoc: UnknownRecord): string => {
  const pathname = data.pathname ?? originalDoc.pathname
  if (typeof pathname === 'string') return pathname
  const slug = data.slug ?? originalDoc.slug
  return slug === 'home' ? '/' : typeof slug === 'string' ? `/${slug}` : ''
}

const governanceSnapshot = (value: unknown): string => JSON.stringify(asRecord(value))

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as UnknownRecord)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]),
  )
}

const LOCALIZED_CONTENT_FIELDS = ['hero', 'layout', 'meta', 'title'] as const
const SHARED_CONTENT_FIELDS = [
  'parentPage',
  'pathname',
  'publishedAt',
  'relatedPages',
  'slug',
] as const
const LOCALE_KEYS = ['vi', 'en'] as const

const contentSnapshot = (
  fields: readonly string[],
  data: UnknownRecord,
  originalDoc: UnknownRecord,
): string =>
  JSON.stringify(
    canonicalize(
      Object.fromEntries(
        fields.map((field) => [
          field,
          Object.prototype.hasOwnProperty.call(data, field) ? data[field] : originalDoc[field],
        ]),
      ),
    ),
  )

const contentChanged = (
  fields: readonly string[],
  data: UnknownRecord,
  originalDoc: UnknownRecord,
): boolean =>
  contentSnapshot(fields, data, originalDoc) !== contentSnapshot(fields, {}, originalDoc)

const collectLinkURLs = (value: unknown, result: unknown[] = []): unknown[] => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectLinkURLs(item, result))
    return result
  }
  if (!value || typeof value !== 'object') return result

  const record = asRecord(value)
  if (record.link && typeof record.link === 'object') {
    const link = asRecord(record.link)
    if (link.type === 'custom' && link.url) result.push(link.url)
  }
  Object.values(record).forEach((item) => collectLinkURLs(item, result))
  return result
}

/**
 * Payload admin relationship filters are editor guidance, not authorization.
 * This hook re-checks every WingsGroup v3 block media relation at the trusted
 * server boundary and applies publication gates only when the Page is public.
 */
export const validateWingsGroupV3Governance: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const dataRecord = asRecord(data)
  const originalRecord = asRecord(originalDoc)
  const site = data?.site ?? originalDoc?.site
  const layout = data?.layout ?? originalDoc?.layout
  if (!site) return data

  const isPublishing = (data?._status ?? originalDoc?._status) === 'published'
  const isLocalDraftPreview = isWingsGroupLocalDraftPreview({
    context: req.context,
    status: data?._status ?? originalDoc?._status,
  })
  const pathname = getPathname(dataRecord, originalRecord)
  const routeDefinition = getWingsGroupRouteDefinition(pathname)
  const hasPendingRouteGovernance = Object.prototype.hasOwnProperty.call(
    data || {},
    'wingsGroupRoute',
  )
  let pendingRouteGovernance = hasPendingRouteGovernance
    ? data?.wingsGroupRoute
    : originalDoc?.wingsGroupRoute
  let siteCode: string | null = null
  let siteID: number | string | undefined
  if (routeDefinition || asRecord(pendingRouteGovernance).managedBy === 'wingsgroup-v3') {
    siteID = relationID(site)
    if (siteID === undefined) throw new Error('WingsGroup corporate route cần site scope.')
    const siteDoc = await req.payload.findByID({
      collection: 'sites',
      id: siteID,
      depth: 0,
      overrideAccess: true,
      req,
    })
    siteCode = typeof siteDoc.code === 'string' ? siteDoc.code : null
  }

  if (
    req.user?.role !== 'super-admin' &&
    governanceSnapshot(pendingRouteGovernance) !== governanceSnapshot(originalDoc?.wingsGroupRoute)
  ) {
    throw new Error('Chỉ super-admin được thay đổi WingsGroup route publication governance.')
  }

  if (siteCode === WINGSGROUP_SITE_CODE) {
    if (!routeDefinition) {
      throw new Error('WingsGroup v3 chỉ cho phép chín corporate routes đã duyệt.')
    }
    let routeGovernance = asRecord(pendingRouteGovernance)
    if (
      routeGovernance.managedBy !== 'wingsgroup-v3' ||
      routeGovernance.archetype !== routeDefinition.archetype
    ) {
      throw new Error('WingsGroup corporate route thiếu archetype governance phù hợp.')
    }

    const settingsResult = await req.payload.find({
      collection: 'site-settings',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      req,
      where: { site: { equals: siteID } },
    })
    if (settingsResult.docs.length !== 1) {
      throw new Error('WingsGroup corporate route cần đúng một trusted SiteSettings record.')
    }
    const settings = settingsResult.docs[0]

    if (routeDefinition.policy) {
      const policy = asRecord(routeGovernance.policy)
      if (policy.approvalState === 'approved') {
        if (!isWingsGroupPolicyApprovalComplete(policy, settings)) {
          throw new Error('WingsGroup policy approval không khớp trusted privacy/legal settings.')
        }
        pendingRouteGovernance = {
          ...routeGovernance,
          policy: { ...policy, validationMarker: WINGSGROUP_POLICY_VALIDATION_MARKER },
        }
      } else {
        pendingRouteGovernance = {
          ...routeGovernance,
          policy: { ...policy, validationMarker: null },
        }
      }
      routeGovernance = asRecord(pendingRouteGovernance)
      if (data) data.wingsGroupRoute = pendingRouteGovernance
    }

    const localeKey = req.locale === 'en' ? 'en' : 'vi'
    const localizedContentChanged = contentChanged(
      LOCALIZED_CONTENT_FIELDS,
      dataRecord,
      originalRecord,
    )
    const sharedContentChanged = contentChanged(SHARED_CONTENT_FIELDS, dataRecord, originalRecord)
    const publication = asRecord(routeGovernance.publication)
    const approvedLocales = LOCALE_KEYS.filter((locale) => publication[locale] === 'approved')
    if (
      isPublishing &&
      req.user?.role !== 'super-admin' &&
      ((localizedContentChanged && publication[localeKey] === 'approved') ||
        (sharedContentChanged && approvedLocales.length > 0))
    ) {
      throw new Error(
        'Nội dung WingsGroup đã duyệt phải chuyển về draft và được super-admin phê duyệt lại.',
      )
    }

    const contentApproval = asRecord(routeGovernance.contentApproval)
    const nextContentApproval: UnknownRecord = { ...contentApproval }
    if (sharedContentChanged) {
      for (const locale of LOCALE_KEYS) nextContentApproval[locale] = null
    } else if (localizedContentChanged) {
      nextContentApproval[localeKey] = null
    }
    if (isPublishing && req.user?.role === 'super-admin') {
      const localesToApprove = sharedContentChanged ? approvedLocales : [localeKey]
      for (const locale of localesToApprove) {
        if (publication[locale] === 'approved') {
          nextContentApproval[locale] = WINGSGROUP_CONTENT_VALIDATION_MARKER
        }
      }
    }
    pendingRouteGovernance = { ...routeGovernance, contentApproval: nextContentApproval }
    routeGovernance = asRecord(pendingRouteGovernance)
    if (data) data.wingsGroupRoute = pendingRouteGovernance

    const pageContent = {
      hero: data?.hero ?? originalDoc?.hero,
      layout,
      meta: data?.meta ?? originalDoc?.meta,
      title: data?.title ?? originalDoc?.title,
    }
    if (isPublishing && findWingsGroupPublicJargon(pageContent)) {
      throw new Error('WingsGroup public copy còn chứa thuật ngữ triển khai nội bộ.')
    }

    for (const href of collectLinkURLs(pageContent)) {
      if (!isWingsGroupScopedInternalHref(href)) {
        throw new Error('WingsGroup corporate route có internal link ngoài site scope.')
      }
    }

    if (
      isPublishing &&
      getWingsGroupRoutePublicationState({
        locale: 'vi',
        page: {
          ...originalRecord,
          ...dataRecord,
          pathname,
          wingsGroupRoute: pendingRouteGovernance,
        },
        settings,
        siteCode,
      }) !== 'approved'
    ) {
      throw new Error('WingsGroup route chưa vượt qua publication gate tiếng Việt hoặc policy.')
    }
  } else if (asRecord(pendingRouteGovernance).managedBy === 'wingsgroup-v3') {
    throw new Error('WingsGroup corporate governance không được gắn vào tenant khác.')
  }

  const checks: Array<{ kind: 'editorial' | 'proof'; media: unknown }> = []
  const scopedRelations: Array<{ collection: 'forms' | 'pages'; value: unknown }> = []

  const parentPage = data?.parentPage ?? originalDoc?.parentPage
  if (parentPage) scopedRelations.push({ collection: 'pages', value: parentPage })

  for (const relatedPage of Array.isArray(data?.relatedPages ?? originalDoc?.relatedPages)
    ? (data?.relatedPages ?? originalDoc?.relatedPages)
    : []) {
    scopedRelations.push({ collection: 'pages', value: relatedPage })
  }

  const hero = asRecord(data?.hero ?? originalDoc?.hero)
  for (const value of [
    hero.media,
    ...(Array.isArray(hero.supportingMedia) ? hero.supportingMedia : []),
  ]) {
    if (value) checks.push({ kind: 'editorial', media: value })
  }
  for (const rawSlide of Array.isArray(hero.slides) ? hero.slides : []) {
    const slide = asRecord(rawSlide)
    if (slide.media) checks.push({ kind: 'editorial', media: slide.media })
    if (slide.mobileMedia) checks.push({ kind: 'editorial', media: slide.mobileMedia })
  }
  const video = asRecord(hero.video)
  for (const value of [video.desktopVideo, video.mobileVideo, video.poster]) {
    if (value) checks.push({ kind: 'editorial', media: value })
  }

  for (const rawBlock of Array.isArray(layout) ? layout : []) {
    const block = asRecord(rawBlock)
    if (block.blockType === 'formBlock' && block.form) {
      scopedRelations.push({ collection: 'forms', value: block.form })
    }
    if (block.blockType === 'wingsGroupEcosystem') {
      for (const rawProfile of Array.isArray(block.profiles) ? block.profiles : []) {
        const profile = asRecord(rawProfile)
        if (profile.stageMedia) checks.push({ kind: 'editorial', media: profile.stageMedia })
      }
    }

    if (block.blockType === 'wingsGroupProofArchive') {
      for (const rawProof of Array.isArray(block.records) ? block.records : []) {
        const proof = asRecord(rawProof)
        if (proof.publicationState === 'approved' && proof.media) {
          checks.push({ kind: 'proof', media: proof.media })
        }
      }
    }
  }

  for (const relation of scopedRelations) {
    const id = relationID(relation.value)
    if (id === undefined) throw new Error('WingsGroup v3 site-scoped relation không hợp lệ.')
    const related = await req.payload.findByID({
      collection: relation.collection,
      id,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (!sameID(related.site, site)) {
      throw new Error('WingsGroup v3 page không được tham chiếu form hoặc page của tenant khác.')
    }
  }

  const mediaByID = new Map<string, UnknownRecord>()
  for (const check of checks) {
    const id = relationID(check.media)
    if (id === undefined) throw new Error('WingsGroup v3 media relation không hợp lệ.')
    const key = String(id)
    if (!mediaByID.has(key)) {
      const media = await req.payload.findByID({
        collection: 'media',
        id,
        depth: isLocalDraftPreview ? 1 : 0,
        overrideAccess: true,
        req,
      })
      mediaByID.set(key, asRecord(media))
    }

    const media = mediaByID.get(key)!
    if (!sameID(media.site, site)) {
      throw new Error('WingsGroup v3 block không được tham chiếu media của tenant khác.')
    }

    const governance = asRecord(media.governance)
    if (!isPublishing) {
      if (
        isLocalDraftPreview &&
        governance.managedBy === 'wingsgroup-v3' &&
        !isWingsGroupDevelopmentMedia(media)
      ) {
        throw new Error(
          'WingsGroup local draft preview chỉ nhận development-governed media hợp lệ.',
        )
      }
      continue
    }
    if (governance.managedBy === 'wingsgroup-v3' && governance.publicationState !== 'published') {
      throw new Error('WingsGroup v3 page không được publish với media chưa qua publication gate.')
    }
    if (check.kind === 'proof' && governance.usageScope === 'editorial-service') {
      throw new Error('Editorial/service media không được sử dụng làm legal hoặc trust proof.')
    }
  }

  return data
}
