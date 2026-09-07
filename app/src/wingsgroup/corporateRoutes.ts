import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type { PayloadRequest, Where } from 'payload'
import {
  WINGSGROUP_CONSENT_VERSION,
  WINGSGROUP_DATA_CONTACT,
  WINGSGROUP_LEAD_RETENTION_MONTHS,
  WINGSGROUP_POLICY_ROUTES as WINGSGROUP_CONTACT_POLICY_ROUTES,
  WINGSGROUP_PRIVACY_VERSION,
} from '@/lead-capture/wingsGroupV3'

export const WINGSGROUP_SITE_CODE = 'wings-group' as const
export const WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT = 'wingsGroupV3LocalDraftPreview' as const

export const isWingsGroupLocalDraftPreview = ({
  context,
  status,
}: {
  context?: unknown
  status?: unknown
}): boolean => {
  if (status === 'published' || !context || typeof context !== 'object') return false
  return (context as Record<string, unknown>)[WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT] === true
}

export const WINGSGROUP_CORPORATE_ROUTES = [
  { archetype: 'home', path: '/', policy: false },
  { archetype: 'corporate', path: '/ve-wingsgroup', policy: false },
  { archetype: 'ecosystem', path: '/he-sinh-thai', policy: false },
  { archetype: 'capability', path: '/nang-luc-dich-vu', policy: false },
  { archetype: 'trust', path: '/tin-cay-va-phap-ly', policy: false },
  { archetype: 'editorial', path: '/tin-tuc', policy: false },
  { archetype: 'contact', path: '/lien-he', policy: false },
  { archetype: 'policy', path: '/chinh-sach-bao-mat', policy: true },
  { archetype: 'policy', path: '/dieu-khoan-su-dung', policy: true },
  { archetype: 'policy', path: '/chinh-sach-thanh-toan', policy: true },
] as const

export const WINGSGROUP_PUBLIC_LOCALE_CODES = ['vi', 'en'] as const
export type WingsGroupPublicLocale = (typeof WINGSGROUP_PUBLIC_LOCALE_CODES)[number]

export type WingsGroupRouteDefinition = (typeof WINGSGROUP_CORPORATE_ROUTES)[number]
export type WingsGroupRouteArchetype = WingsGroupRouteDefinition['archetype']
export type WingsGroupRoutePath = WingsGroupRouteDefinition['path']
export type WingsGroupPublicationState = 'approved' | 'hidden' | 'pending'

export const WINGSGROUP_POLICY_ROUTES = WINGSGROUP_CORPORATE_ROUTES.filter(
  (route) => route.policy,
).map((route) => route.path)

export const WINGSGROUP_LEGAL_IDENTITY = {
  internationalName: 'VIETWINGS.,JSC',
  legalEntityName: 'CÔNG TY CỔ PHẦN DU LỊCH ĐÔI CÁNH VIỆT',
  legalRepresentative: 'Giám đốc Phạm Nguyễn Quân',
  licenceNumber: '01-2336/2023/TCDL-GP LHQT',
  registeredOffice: 'Tầng 2 số 28B ngõ 44 Phố Hào Nam, phường Ô Chợ Dừa, quận Đống Đa, TP Hà Nội',
  registrationNumber: '0109983118',
  relationshipStatement:
    'WingsGroup là thương hiệu phát triển mới trong cùng hệ sinh thái tổ chức với VietWings và Đôi Cánh Việt. Hệ sinh thái tiếp tục phát triển các thương hiệu WingsGo, WingSide, WingsCare và các dịch vụ liên quan.',
  travelOffice: 'Tầng 12, Ngọc Khánh Plaza, Số 1 Phạm Huy Thông, Giảng Võ, Hà Nội',
} as const

export const WINGSGROUP_RELATIONSHIP_STATEMENT_EN =
  'WingsGroup is a newly developed brand within the same organisational ecosystem as VietWings and Đôi Cánh Việt. The ecosystem continues to develop WingsGo, WingSide, WingsCare and related services.'

export const WINGSGROUP_POLICY_VALIDATION_MARKER = 'wingsgroup-policy-governance-v1'
export const WINGSGROUP_CONTENT_VALIDATION_MARKER = 'wingsgroup-content-approved-v1'

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const isTrimmedNonempty = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value === value.trim()

export const normalizeCorporateRoutePath = (value: unknown): string => {
  const path = asString(value)
  if (!path) return ''
  if (path === '/') return '/'
  return `/${path.split(/[?#]/u, 1)[0].split('/').filter(Boolean).join('/')}`
}

export const getWingsGroupRouteDefinition = (value: unknown): WingsGroupRouteDefinition | null => {
  const path = normalizeCorporateRoutePath(value)
  return WINGSGROUP_CORPORATE_ROUTES.find((route) => route.path === path) || null
}

/**
 * Shared chrome may cover the editorial archive and one governed article
 * descendant. The article route performs the record-level governance check;
 * this helper only admits the bounded public path shape.
 */
export const isWingsGroupV3SurfacePath = (value: unknown): boolean => {
  const rawPath = asString(value).split(/[?#]/u, 1)[0]
  if (getWingsGroupRouteDefinition(rawPath)) return true
  return /^\/tin-tuc\/[^/]+\/?$/u.test(rawPath)
}

export const isWingsGroupEnglishPublicRoute = ({
  path,
  settings,
}: {
  path: unknown
  settings?: unknown
}): boolean => {
  const definition = getWingsGroupRouteDefinition(path)
  if (!definition) return false

  const state = asRecord(asRecord(settings).wingsGroupV3).englishPublicationState
  return state === 'approved' || (state === 'route-ready' && !definition.policy)
}

export const isWingsGroupV3ExactPublicInventoryEnabled = ({
  settings,
  siteCode,
}: {
  settings?: unknown
  siteCode?: null | string
}): boolean =>
  siteCode === WINGSGROUP_SITE_CODE && asRecord(asRecord(settings).wingsGroupV3).enabled === true

export const isWingsGroupV3PublicSurfacePathAllowed = ({
  locale,
  path,
  settings,
  siteCode,
}: {
  locale?: null | SupportedLocaleCode
  path: unknown
  settings?: unknown
  siteCode?: null | string
}): boolean =>
  !isWingsGroupV3ExactPublicInventoryEnabled({ settings, siteCode }) ||
  (locale === 'vi' && Boolean(getWingsGroupRouteDefinition(path))) ||
  (locale === 'en' && isWingsGroupEnglishPublicRoute({ path, settings }))

export const isWingsGroupPolicyRoute = (value: unknown): boolean =>
  Boolean(getWingsGroupRouteDefinition(value)?.policy)

export const isValidWingsGroupPolicyDate = (value: unknown): boolean => {
  const date = asString(value)
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/u.test(date)) {
    return false
  }
  const parsed = new Date(date)
  if (!Number.isFinite(parsed.getTime())) return false
  return date.length === 10
    ? parsed.toISOString().slice(0, 10) === date
    : parsed.toISOString() === date
}

export const hasTrustedWingsGroupSettings = (value: unknown): boolean => {
  const settings = asRecord(value)
  const wingsGroupV3 = asRecord(settings.wingsGroupV3)
  if (wingsGroupV3.enabled !== true) return false

  const legalIdentity = asRecord(wingsGroupV3.legalIdentity)
  return Object.entries(WINGSGROUP_LEGAL_IDENTITY).every(
    ([field, expected]) => legalIdentity[field] === expected,
  )
}

export const hasApprovedWingsGroupPrivacyGovernance = (value: unknown): boolean => {
  if (!hasTrustedWingsGroupSettings(value)) return false
  const settings = asRecord(value)
  const wingsGroupV3 = asRecord(settings.wingsGroupV3)
  const privacy = asRecord(wingsGroupV3.privacy)

  return (
    privacy.approvalState === 'approved' &&
    asString(privacy.policyVersion) === WINGSGROUP_PRIVACY_VERSION &&
    asString(privacy.consentVersion) === WINGSGROUP_CONSENT_VERSION &&
    privacy.consentRequired === true &&
    privacy.retentionMonths === WINGSGROUP_LEAD_RETENTION_MONTHS &&
    privacy.dataSubjectContact === WINGSGROUP_DATA_CONTACT &&
    privacy.interBranchTransferAllowed === true &&
    asString(privacy.policyRouteVi) === WINGSGROUP_CONTACT_POLICY_ROUTES.vi &&
    asString(privacy.policyRouteEn) === WINGSGROUP_CONTACT_POLICY_ROUTES.en &&
    isTrimmedNonempty(privacy.dataSubjectRightsStatement) &&
    isTrimmedNonempty(privacy.dataSubjectRightsEvidence) &&
    isTrimmedNonempty(privacy.consentEvidenceReference) &&
    isTrimmedNonempty(privacy.approvalReference)
  )
}

export const isWingsGroupPolicyApprovalComplete = (
  value: unknown,
  settingsValue: unknown,
): boolean => {
  if (!hasApprovedWingsGroupPrivacyGovernance(settingsValue)) return false
  const policy = asRecord(value)
  const settings = asRecord(settingsValue)
  const privacy = asRecord(asRecord(settings.wingsGroupV3).privacy)
  return (
    policy.approvalState === 'approved' &&
    policy.legalEntity === WINGSGROUP_LEGAL_IDENTITY.legalEntityName &&
    isTrimmedNonempty(policy.legalOwner) &&
    isTrimmedNonempty(policy.scope) &&
    isValidWingsGroupPolicyDate(policy.effectiveDate) &&
    isTrimmedNonempty(policy.version) &&
    isTrimmedNonempty(policy.approvalReference) &&
    policy.retentionMonths === WINGSGROUP_LEAD_RETENTION_MONTHS &&
    policy.dataSubjectContact === WINGSGROUP_DATA_CONTACT &&
    policy.dataSubjectRightsStatement === privacy.dataSubjectRightsStatement &&
    policy.dataSubjectRightsEvidence === privacy.dataSubjectRightsEvidence &&
    policy.policyVersion === privacy.policyVersion &&
    policy.consentVersion === privacy.consentVersion &&
    policy.consentEvidenceReference === privacy.consentEvidenceReference &&
    policy.privacyApprovalReference === privacy.approvalReference
  )
}

export const hasApprovedPolicyGovernance = (value: unknown, settingsValue: unknown): boolean =>
  isWingsGroupPolicyApprovalComplete(value, settingsValue) &&
  asRecord(value).validationMarker === WINGSGROUP_POLICY_VALIDATION_MARKER

export const getWingsGroupRoutePublicationState = ({
  locale,
  page,
  settings,
  siteCode,
}: {
  locale: SupportedLocaleCode
  page: unknown
  settings?: unknown
  siteCode?: null | string
}): WingsGroupPublicationState => {
  if (siteCode !== WINGSGROUP_SITE_CODE) return 'approved'

  if (locale !== 'vi' && locale !== 'en') return 'hidden'
  if (!hasTrustedWingsGroupSettings(settings)) return 'hidden'

  const pageRecord = asRecord(page)
  const pathname = pageRecord.pathname || (pageRecord.slug === 'home' ? '/' : pageRecord.slug)
  const definition = getWingsGroupRouteDefinition(pathname)
  if (!definition) return 'hidden'

  const governance = asRecord(pageRecord.wingsGroupRoute)
  const publication = asRecord(governance.publication)
  const contentApproval = asRecord(governance.contentApproval)
  const localeKey = locale === 'en' ? 'en' : 'vi'
  if (
    governance.managedBy !== 'wingsgroup-v3' ||
    governance.archetype !== definition.archetype ||
    publication[localeKey] !== 'approved'
  ) {
    return publication[localeKey] === 'pending' ? 'pending' : 'hidden'
  }

  if (contentApproval[localeKey] !== WINGSGROUP_CONTENT_VALIDATION_MARKER) return 'pending'

  if (locale === 'en' && !isWingsGroupEnglishPublicRoute({ path: pathname, settings })) {
    return 'hidden'
  }

  if (definition.policy && !hasApprovedPolicyGovernance(asRecord(governance.policy), settings)) {
    return 'pending'
  }

  return 'approved'
}

export const isWingsGroupRoutePublic = (
  args: Parameters<typeof getWingsGroupRoutePublicationState>[0],
) => getWingsGroupRoutePublicationState(args) === 'approved'

/**
 * A pending policy route may render a controlled publication-status notice.
 * It is deliberately separate from `isWingsGroupRoutePublic`: pending policy
 * content is not approved policy, must not be returned by anonymous Payload
 * reads, and must never enter the public sitemap.
 */
export const isWingsGroupPendingPolicyRouteRenderable = ({
  locale,
  page,
  settings,
  siteCode,
}: Parameters<typeof getWingsGroupRoutePublicationState>[0]): boolean => {
  if (siteCode !== WINGSGROUP_SITE_CODE || locale !== 'vi') return false
  const pageRecord = asRecord(page)
  const pathname = pageRecord.pathname || (pageRecord.slug === 'home' ? '/' : pageRecord.slug)
  const definition = getWingsGroupRouteDefinition(pathname)
  if (!definition?.policy || !hasTrustedWingsGroupSettings(settings)) return false

  const governance = asRecord(pageRecord.wingsGroupRoute)
  const publication = asRecord(governance.publication)
  const policy = asRecord(governance.policy)

  return (
    pageRecord._status === 'published' &&
    governance.managedBy === 'wingsgroup-v3' &&
    governance.archetype === definition.archetype &&
    publication.vi === 'pending' &&
    policy.approvalState === 'pending'
  )
}

const INTERNAL_JARGON = [
  /\broot site\b/iu,
  /\bchild site(?:s)?\b/iu,
  /\bline business(?:es)?\b/iu,
  /\blegacy\b/iu,
  /\bmultisite\b/iu,
  /\btenant\b/iu,
  /\bsite con\b/iu,
  /\bsite gốc\b/iu,
] as const

export const findWingsGroupPublicJargon = (value: unknown): string | null => {
  const visit = (candidate: unknown): string | null => {
    if (typeof candidate === 'string') {
      return INTERNAL_JARGON.find((pattern) => pattern.test(candidate))?.source || null
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const match = visit(item)
        if (match) return match
      }
      return null
    }
    if (candidate && typeof candidate === 'object') {
      for (const [key, item] of Object.entries(candidate)) {
        if (['id', 'managedBy', 'blockType', 'layoutPresetKey'].includes(key)) continue
        const match = visit(item)
        if (match) return match
      }
    }
    return null
  }

  return visit(value)
}

export const isWingsGroupScopedInternalHref = (value: unknown): boolean => {
  const href = asString(value)
  if (!href) return true
  if (/^(?:mailto:|tel:|#)/iu.test(href)) return true
  if (!href.startsWith('/') || href.startsWith('//')) return false
  const path = normalizeCorporateRoutePath(href)
  return Boolean(getWingsGroupRouteDefinition(path))
}

export const findTrustedWingsGroupSettingsForAccess = async (
  req: Pick<PayloadRequest, 'payload'> & Partial<PayloadRequest>,
): Promise<unknown | null> => {
  try {
    const sites = await req.payload.find({
      collection: 'sites',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      req: req as PayloadRequest,
      where: { code: { equals: WINGSGROUP_SITE_CODE } },
    })
    if (sites.docs.length !== 1) return null

    const settings = await req.payload.find({
      collection: 'site-settings',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      req: req as PayloadRequest,
      where: { site: { equals: sites.docs[0].id } },
    })
    return settings.docs.length === 1 ? settings.docs[0] : null
  } catch {
    return null
  }
}

/**
 * Anonymous Payload REST/Local API reads must be no broader than the public
 * renderer. The site relation clause keeps all other tenants unchanged while
 * requiring WingsGroup route and locale governance, including policy approval.
 */
export const buildWingsGroupPublicPageAccessWhere = (locale: unknown, settings: unknown): Where => {
  const otherTenants = {
    'site.code': {
      not_equals: WINGSGROUP_SITE_CODE,
    },
  }
  if (locale !== 'vi' && locale !== 'en') return { or: [otherTenants] }
  if (!hasTrustedWingsGroupSettings(settings)) return { or: [otherTenants] }
  if (
    locale === 'en' &&
    !['route-ready', 'approved'].includes(
      asRecord(asRecord(settings).wingsGroupV3).englishPublicationState as string,
    )
  ) {
    return { or: [otherTenants] }
  }
  const localeField =
    locale === 'en' ? 'wingsGroupRoute.publication.en' : 'wingsGroupRoute.publication.vi'

  const privacy = asRecord(asRecord(asRecord(settings).wingsGroupV3).privacy)
  const englishRouteReady =
    locale === 'en' &&
    asRecord(asRecord(settings).wingsGroupV3).englishPublicationState === 'route-ready'
  const policyRoutes: Where[] =
    !englishRouteReady && hasApprovedWingsGroupPrivacyGovernance(settings)
      ? WINGSGROUP_CORPORATE_ROUTES.filter(({ policy }) => policy).map(
          ({ archetype, path }): Where => ({
            and: [
              { pathname: { equals: path } },
              { 'wingsGroupRoute.archetype': { equals: archetype } },
              { 'wingsGroupRoute.policy.approvalState': { equals: 'approved' } },
              {
                'wingsGroupRoute.policy.validationMarker': {
                  equals: WINGSGROUP_POLICY_VALIDATION_MARKER,
                },
              },
              { 'wingsGroupRoute.policy.legalOwner': { not_equals: '' } },
              {
                'wingsGroupRoute.policy.legalEntity': {
                  equals: WINGSGROUP_LEGAL_IDENTITY.legalEntityName,
                },
              },
              { 'wingsGroupRoute.policy.scope': { not_equals: '' } },
              {
                'wingsGroupRoute.policy.effectiveDate': {
                  greater_than: '1900-01-01T00:00:00.000Z',
                },
              },
              { 'wingsGroupRoute.policy.version': { not_equals: '' } },
              { 'wingsGroupRoute.policy.approvalReference': { not_equals: '' } },
              {
                'wingsGroupRoute.policy.retentionMonths': {
                  equals: WINGSGROUP_LEAD_RETENTION_MONTHS,
                },
              },
              {
                'wingsGroupRoute.policy.dataSubjectContact': {
                  equals: WINGSGROUP_DATA_CONTACT,
                },
              },
              {
                'wingsGroupRoute.policy.dataSubjectRightsStatement': {
                  equals: asString(privacy.dataSubjectRightsStatement),
                },
              },
              {
                'wingsGroupRoute.policy.dataSubjectRightsEvidence': {
                  equals: asString(privacy.dataSubjectRightsEvidence),
                },
              },
              {
                'wingsGroupRoute.policy.policyVersion': {
                  equals: asString(privacy.policyVersion),
                },
              },
              {
                'wingsGroupRoute.policy.consentVersion': {
                  equals: asString(privacy.consentVersion),
                },
              },
              {
                'wingsGroupRoute.policy.consentEvidenceReference': {
                  equals: asString(privacy.consentEvidenceReference),
                },
              },
              {
                'wingsGroupRoute.policy.privacyApprovalReference': {
                  equals: asString(privacy.approvalReference),
                },
              },
            ],
          }),
        )
      : []
  const routeClauses: Where[] = [
    ...WINGSGROUP_CORPORATE_ROUTES.filter(({ policy }) => !policy).map(
      ({ archetype, path }): Where => ({
        and: [
          { pathname: { equals: path } },
          { 'wingsGroupRoute.archetype': { equals: archetype } },
        ],
      }),
    ),
    ...policyRoutes,
  ]

  return {
    or: [
      otherTenants,
      {
        and: [
          { 'site.code': { equals: WINGSGROUP_SITE_CODE } },
          { 'wingsGroupRoute.managedBy': { equals: 'wingsgroup-v3' } },
          { [localeField]: { equals: 'approved' } },
          {
            [`wingsGroupRoute.contentApproval.${locale}`]: {
              equals: WINGSGROUP_CONTENT_VALIDATION_MARKER,
            },
          },
          { or: routeClauses },
        ],
      },
    ],
  }
}
