import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import type { Where } from 'payload'

export const WINGSGROUP_SITE_CODE = 'wings-group' as const

export const WINGSGROUP_CORPORATE_ROUTES = [
  { archetype: 'home', path: '/', policy: false },
  { archetype: 'corporate', path: '/ve-wingsgroup', policy: false },
  { archetype: 'capability', path: '/nang-luc-dich-vu', policy: false },
  { archetype: 'trust', path: '/tin-cay-va-phap-ly', policy: false },
  { archetype: 'editorial', path: '/tin-tuc', policy: false },
  { archetype: 'contact', path: '/lien-he', policy: false },
  { archetype: 'policy', path: '/chinh-sach-bao-mat', policy: true },
  { archetype: 'policy', path: '/dieu-khoan-su-dung', policy: true },
  { archetype: 'policy', path: '/chinh-sach-thanh-toan', policy: true },
] as const

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
  registeredOffice:
    'Tầng 2 số 28B ngõ 44 Phố Hào Nam, phường Ô Chợ Dừa, quận Đống Đa, TP Hà Nội',
  registrationNumber: '0109983118',
  relationshipStatement:
    'WingsGroup, VietWings và Đôi Cánh Việt là cùng một tổ chức. WingsGroup, WingsGo, WingSide, WingsCare và các thương hiệu dịch vụ khác là các tên thương hiệu hoặc nhánh dịch vụ công khai mới hơn.',
  travelOffice: 'Tầng 12, Ngọc Khánh Plaza, Số 1 Phạm Huy Thông, Giảng Võ, Hà Nội',
} as const

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export const normalizeCorporateRoutePath = (value: unknown): string => {
  const path = asString(value)
  if (!path) return ''
  if (path === '/') return '/'
  return `/${path.split(/[?#]/u, 1)[0].split('/').filter(Boolean).join('/')}`
}

export const getWingsGroupRouteDefinition = (
  value: unknown,
): WingsGroupRouteDefinition | null => {
  const path = normalizeCorporateRoutePath(value)
  return WINGSGROUP_CORPORATE_ROUTES.find((route) => route.path === path) || null
}

export const isWingsGroupPolicyRoute = (value: unknown): boolean =>
  Boolean(getWingsGroupRouteDefinition(value)?.policy)

const validISODate = (value: unknown): boolean => {
  const date = asString(value)
  return /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/u.test(date)
}

export const hasApprovedPolicyGovernance = (value: unknown): boolean => {
  const policy = asRecord(value)
  return (
    policy.approvalState === 'approved' &&
    asString(policy.legalEntity) === WINGSGROUP_LEGAL_IDENTITY.legalEntityName &&
    Boolean(asString(policy.legalOwner)) &&
    Boolean(asString(policy.scope)) &&
    validISODate(policy.effectiveDate) &&
    Boolean(asString(policy.version)) &&
    Boolean(asString(policy.approvalReference))
  )
}

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

  const pageRecord = asRecord(page)
  const pathname = pageRecord.pathname || (pageRecord.slug === 'home' ? '/' : pageRecord.slug)
  const definition = getWingsGroupRouteDefinition(pathname)
  if (!definition) return 'hidden'

  const governance = asRecord(pageRecord.wingsGroupRoute)
  const publication = asRecord(governance.publication)
  if (
    governance.managedBy !== 'wingsgroup-v3' ||
    governance.archetype !== definition.archetype ||
    publication[locale === 'en' ? 'en' : 'vi'] !== 'approved'
  ) {
    return publication[locale === 'en' ? 'en' : 'vi'] === 'pending' ? 'pending' : 'hidden'
  }

  if (locale === 'en') {
    const siteSettings = asRecord(settings)
    const wingsGroupV3 = asRecord(siteSettings.wingsGroupV3)
    if (wingsGroupV3.englishPublicationState !== 'approved') return 'hidden'
  }

  if (definition.policy && !hasApprovedPolicyGovernance(asRecord(governance.policy))) {
    return 'pending'
  }

  return 'approved'
}

export const isWingsGroupRoutePublic = (args: Parameters<typeof getWingsGroupRoutePublicationState>[0]) =>
  getWingsGroupRoutePublicationState(args) === 'approved'

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

/**
 * Anonymous Payload REST/Local API reads must be no broader than the public
 * renderer. The site relation clause keeps all other tenants unchanged while
 * requiring WingsGroup route and locale governance, including policy approval.
 */
export const buildWingsGroupPublicPageAccessWhere = (
  locale: unknown,
): Where => {
  const localeField = locale === 'en' ? 'wingsGroupRoute.publication.en' : 'wingsGroupRoute.publication.vi'
  return {
    or: [
      {
        'site.code': {
          not_equals: WINGSGROUP_SITE_CODE,
        },
      },
      {
        and: [
          { pathname: { in: WINGSGROUP_CORPORATE_ROUTES.map(({ path }) => path) } },
          { 'site.code': { equals: WINGSGROUP_SITE_CODE } },
          { 'wingsGroupRoute.managedBy': { equals: 'wingsgroup-v3' } },
          { [localeField]: { equals: 'approved' } },
          {
            or: [
              { 'wingsGroupRoute.archetype': { not_equals: 'policy' } },
              {
                and: [
                  { 'wingsGroupRoute.archetype': { equals: 'policy' } },
                  { 'wingsGroupRoute.policy.approvalState': { equals: 'approved' } },
                  { 'wingsGroupRoute.policy.legalOwner': { exists: true } },
                  { 'wingsGroupRoute.policy.legalEntity': { equals: WINGSGROUP_LEGAL_IDENTITY.legalEntityName } },
                  { 'wingsGroupRoute.policy.scope': { exists: true } },
                  { 'wingsGroupRoute.policy.effectiveDate': { exists: true } },
                  { 'wingsGroupRoute.policy.version': { exists: true } },
                  { 'wingsGroupRoute.policy.approvalReference': { exists: true } },
                ],
              },
            ],
          },
        ],
      },
    ],
  }
}
