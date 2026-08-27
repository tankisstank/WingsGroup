/**
 * Governed production importer for the WingsGroup v3 public content contract.
 *
 * This is intentionally separate from the local preview seed and from the
 * generic corporate-route seed. Plan is read-only; production apply and
 * production verify require the immutable release/operation gate below.
 */
import 'dotenv/config'

import { createHash } from 'node:crypto'
import configPromise from '@payload-config'
import path from 'node:path'
import {
  commitTransaction,
  createLocalReq,
  getPayload,
  initTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'

import {
  buildWingsGroupCorporateRouteSeeds,
  routeGovernanceForSeed,
  wingsGroupSettingsSeed,
} from './lib/wingsGroupCorporateRouteSeed'
import {
  buildWingsGroupV3MediaPlan,
  parseWingsGroupV3MediaManifest,
  type WingsGroupV3MediaManifest,
  type WingsGroupV3MediaPlan,
} from './lib/wingsGroupV3MediaPlan'
import {
  WINGSGROUP_V3_MEDIA_DIRECTORY,
  verifyWingsGroupV3Media,
} from './import-wingsgroup-v3-media'
import {
  WINGSGROUP_CONSENT_COPY,
  WINGSGROUP_CONSENT_VERSION,
  WINGSGROUP_DATA_CONTACT,
  WINGSGROUP_LEAD_RETENTION_MONTHS,
  WINGSGROUP_POLICY_ROUTES,
  WINGSGROUP_PRIVACY_VERSION,
} from '../src/lead-capture/wingsGroupV3'
import { WINGSGROUP_LEGAL_IDENTITY, WINGSGROUP_SITE_CODE } from '../src/wingsgroup/corporateRoutes'

export const WINGSGROUP_V3_CONTENT_FORM_KEY = 'wingsgroup-v3-contact-intake'
export const WINGSGROUP_V3_CONTENT_CONFIRMATION_PREFIX = 'CONFIRM_WINGSGROUP_V3_CONTENT_APPLY'
export const WINGSGROUP_V3_CONTENT_OPERATION_ENV = 'WINGSGROUP_V3_CONTENT_OPERATION_ID'
export const WINGSGROUP_V3_CONTENT_PLAN_ENV = 'WINGSGROUP_V3_CONTENT_PLAN_SHA256'
export const WINGSGROUP_V3_CONTENT_CONFIRMATION_ENV = 'WINGSGROUP_V3_CONTENT_CONFIRMATION_TOKEN'
export const WINGSGROUP_V3_CONTENT_SITE_ENV = 'WINGSGROUP_V3_CONTENT_SITE_CODE'
export const WINGSGROUP_V3_CONTENT_OPERATOR_ENV = 'WINGSGROUP_V3_CONTENT_OPERATOR_EMAIL'
export const WINGSGROUP_V3_CONTENT_MEDIA_COUNT = 13 as const
export const WINGSGROUP_V3_CONTENT_DERIVATIVE_COUNT = 78 as const

const CONTENT_ROUTES = buildWingsGroupCorporateRouteSeeds()
const CONTENT_ROUTE_PATHS = CONTENT_ROUTES.map(({ path: pathname }) => pathname)
const PRODUCTION_CONTEXT = { disableRevalidate: true, wingsGroupV3ProductionContent: true }
const PRODUCTION_DATABASE_HOST = 'postgres'

type UnknownRecord = Record<string, unknown>
type ContentLocale = 'en' | 'vi'
type ContentPhase = 'plan' | 'production-apply' | 'production-verify'
type VerifiedHeroMedia = {
  managedBy: unknown
  publicationState: unknown
  siteCode: unknown
  siteID: number | string
}

export type WingsGroupV3ContentProductionArgs = {
  confirm?: string
  manifestPath: string
  mediaDirectory?: string
  operationID?: string
  planSha256?: string
  releaseSha?: string
  siteCode?: string
  assetsDirectory: string
  operatorEmail?: string
}

export type WingsGroupV3ContentEnvironment = Partial<Record<string, string | undefined>>

export type WingsGroupV3ContentPlan = {
  contentChecksum: string
  derivativeCount: typeof WINGSGROUP_V3_CONTENT_DERIVATIVE_COUNT
  formKey: typeof WINGSGROUP_V3_CONTENT_FORM_KEY
  mediaCount: typeof WINGSGROUP_V3_CONTENT_MEDIA_COUNT
  mediaPlanChecksum: string
  routes: readonly string[]
  siteCode: typeof WINGSGROUP_SITE_CODE
}

type ContentPayload = {
  create: (args: unknown) => Promise<unknown>
  find: (args: unknown) => Promise<{ docs: unknown[] }>
  findByID: (args: unknown) => Promise<unknown>
  update: (args: unknown) => Promise<unknown>
  db?: Payload['db']
}

type ContentRequest = Pick<
  PayloadRequest,
  'context' | 'locale' | 'payload' | 'transactionID' | 'user'
>

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const relationID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  const id = asRecord(value).id
  return typeof id === 'number' || typeof id === 'string' ? id : undefined
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as UnknownRecord)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]),
  )
}

const checksum = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex')

const argumentValue = (argv: string[], name: string): string | undefined => {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

export const productionContentConfirmation = (operationID: string, releaseSha: string): string =>
  `${WINGSGROUP_V3_CONTENT_CONFIRMATION_PREFIX}:${operationID}:${releaseSha}`

export const productionContentOperationID = (value: string | undefined): string => {
  if (!value || !/^[a-z0-9][a-z0-9._-]{15,127}$/u.test(value)) {
    throw new Error('WingsGroup v3 content requires a fresh immutable operation ID.')
  }
  return value
}

const productionReleaseSHA = (value: string | undefined): string => {
  if (!value || !/^[0-9a-f]{40}$/u.test(value)) {
    throw new Error('WingsGroup v3 content requires the exact lowercase 40-character release SHA.')
  }
  return value
}

const productionDatabaseURL = (environment: WingsGroupV3ContentEnvironment): URL => {
  if (!environment.DATABASE_URL) {
    throw new Error('WingsGroup v3 content requires DATABASE_URL.')
  }
  let url: URL
  try {
    url = new URL(environment.DATABASE_URL)
  } catch {
    throw new Error('WingsGroup v3 content requires a valid PostgreSQL DATABASE_URL.')
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('WingsGroup v3 content requires a PostgreSQL DATABASE_URL.')
  }
  if (
    url.hostname !== PRODUCTION_DATABASE_HOST ||
    url.search ||
    url.hash ||
    !/^\/[A-Za-z0-9_][A-Za-z0-9_$.-]*$/u.test(url.pathname)
  ) {
    throw new Error('WingsGroup v3 content requires the exact trusted PostgreSQL target.')
  }
  return url
}

export const assertProductionContentEnvironment = ({
  args,
  environment,
  phase,
}: {
  args: WingsGroupV3ContentProductionArgs
  environment: WingsGroupV3ContentEnvironment
  phase: ContentPhase
}) => {
  if (environment.NODE_ENV !== 'production') {
    throw new Error('WingsGroup v3 content requires NODE_ENV=production.')
  }
  if (environment.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('WingsGroup v3 content requires PAYLOAD_DB_PUSH=false.')
  }
  if (environment[WINGSGROUP_V3_CONTENT_SITE_ENV] !== WINGSGROUP_SITE_CODE) {
    throw new Error('WingsGroup v3 content requires the trusted wings-group site scope.')
  }
  productionDatabaseURL(environment)
  const releaseSha = productionReleaseSHA(args.releaseSha)
  if (environment.WINGSTRAVEL_RELEASE_SHA !== releaseSha) {
    throw new Error('WingsGroup v3 content release SHA binding mismatch.')
  }
  const operationID = productionContentOperationID(args.operationID)
  if (environment[WINGSGROUP_V3_CONTENT_OPERATION_ENV] !== operationID) {
    throw new Error('WingsGroup v3 content operation binding mismatch.')
  }
  if (phase !== 'plan' && args.planSha256 !== environment[WINGSGROUP_V3_CONTENT_PLAN_ENV]) {
    throw new Error('WingsGroup v3 content plan checksum binding mismatch.')
  }
  if (phase !== 'plan') {
    const expected = productionContentConfirmation(operationID, releaseSha)
    if (
      args.confirm !== expected ||
      environment[WINGSGROUP_V3_CONTENT_CONFIRMATION_ENV] !== expected
    ) {
      throw new Error('WingsGroup v3 content requires an operation/release-bound confirmation.')
    }
  }
  return {
    databaseName: productionDatabaseURL(environment).pathname.slice(1),
    operationID,
    releaseSha,
  }
}

export const parseWingsGroupV3ContentCommand = (argv: string[]) => {
  const phase = (argv.find((argument) => !argument.startsWith('--')) || 'plan') as ContentPhase
  if (!['plan', 'production-apply', 'production-verify'].includes(phase)) {
    throw new Error(
      'WingsGroup v3 content supports only plan, production-apply, and production-verify.',
    )
  }
  const manifestPath = argumentValue(argv, '--manifest')
  const assetsDirectory = argumentValue(argv, '--assets-dir')
  if (!manifestPath) throw new Error('--manifest is required.')
  if (!assetsDirectory) throw new Error('--assets-dir is required.')
  const siteCode = argumentValue(argv, '--site-code')
  if (phase !== 'plan' && siteCode !== WINGSGROUP_SITE_CODE) {
    throw new Error(`Production content requires --site-code=${WINGSGROUP_SITE_CODE}.`)
  }
  return {
    assetsDirectory: path.resolve(assetsDirectory),
    confirm: argumentValue(argv, '--confirm'),
    manifestPath: path.resolve(manifestPath),
    mediaDirectory: argumentValue(argv, '--media-dir')
      ? path.resolve(argumentValue(argv, '--media-dir')!)
      : WINGSGROUP_V3_MEDIA_DIRECTORY,
    operationID: argumentValue(argv, '--operation-id'),
    phase,
    planSha256: argumentValue(argv, '--plan-sha256'),
    releaseSha: argumentValue(argv, '--release-sha'),
    siteCode,
    operatorEmail: argumentValue(argv, '--operator-email'),
  }
}

const lexical = (
  heading: string,
  paragraphs: readonly string[],
  headingTag: 'h1' | 'h2' = 'h2',
) => ({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: heading,
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        tag: headingTag,
        type: 'heading',
        version: 1,
      },
      ...paragraphs.map((text) => ({
        children: [
          { detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        type: 'paragraph',
        version: 1,
      })),
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

const link = (label: string, url: string) => ({
  link: { appearance: 'default', label, type: 'custom', url },
})

const contactBlock = () => ({
  blockName: 'WingsGroup production contact intake',
  blockType: 'formBlock',
  enableIntro: false,
  form: WINGSGROUP_V3_CONTENT_FORM_KEY,
  presentation: 'split-contact',
})

const buildProductionHomepage = (locale: ContentLocale) => {
  const vietnamese = locale === 'vi'
  const ecosystemRoute = CONTENT_ROUTES.find(({ path: pathname }) => pathname === '/he-sinh-thai')!
  return {
    description: vietnamese
      ? 'WingsGroup kết nối các thương hiệu và đội ngũ dịch vụ chuyên biệt cho từng nhu cầu hành trình.'
      : 'WingsGroup connects specialist travel brands and service teams around each traveller’s request.',
    hero: {
      behaviorMode: 'override',
      behaviorOverrides: {
        autoplay: true,
        intervalMs: 6500,
        loop: true,
        pauseOnHover: true,
        showArrows: true,
        showDots: true,
        transition: 'crossfade',
        transitionMs: 600,
      },
      links: [
        link(vietnamese ? 'Khám phá dịch vụ' : 'Explore services', '#services'),
        link(
          vietnamese ? 'Trao đổi với chuyên viên' : 'Speak with a specialist',
          '/lien-he#contact-form',
        ),
      ],
      richText: lexical(
        vietnamese
          ? 'Tìm đúng dịch vụ cho hành trình của bạn.'
          : 'Find the right service for your journey.',
        [
          vietnamese
            ? 'Từ chuyến đi nước ngoài đến trải nghiệm tại Việt Nam, dịch vụ sân bay và đoàn riêng, WingsGroup kết nối bạn với đội ngũ phù hợp cho từng nhu cầu.'
            : 'From travel abroad and experiences in Vietnam to airport support and private groups, WingsGroup connects each request with the right service team.',
        ],
        'h1',
      ),
      slides: [
        [
          'wingsgroup-hero-discovery-guide.png',
          vietnamese ? 'Khám phá Việt Nam' : 'Discover Vietnam',
        ],
        [
          'wingsgroup-hero-private-consultation.png',
          vietnamese ? 'Tư vấn hành trình riêng' : 'Private journey advice',
        ],
        [
          'wingsgroup-hero-airport-welcome.png',
          vietnamese ? 'Đón khách tại sân bay' : 'A considered airport welcome',
        ],
        [
          'wingsgroup-hero-partner-meeting.png',
          vietnamese ? 'Gặp gỡ đối tác doanh nghiệp' : 'Corporate travel partnerships',
        ],
      ].map(([media, title]) => ({
        description: vietnamese
          ? 'Một điểm chạm cho nhiều nhu cầu du lịch.'
          : 'One considered starting point for different travel needs.',
        eyebrow: 'WingsGroup',
        media,
        title,
      })),
      type: 'highImpact',
    },
    layout: [
      {
        ...ecosystemRoute[locale].layout[0],
        blockName: 'WingsGroup production ecosystem',
      },
      {
        blockName: 'WingsGroup production trust',
        blockType: 'infoStrip',
        description: vietnamese
          ? 'Thông tin pháp nhân đã được ghi nhận; các hồ sơ chứng minh khác chỉ xuất hiện sau khi được kiểm tra.'
          : 'Corporate identity is recorded; other proof appears only after its source and permission have been checked.',
        eyebrow: vietnamese ? 'Thông tin doanh nghiệp' : 'Corporate information',
        items: [
          { label: vietnamese ? 'Pháp nhân đã được xác nhận' : 'Corporate identity recorded' },
          {
            description: vietnamese
              ? 'Số liệu do WingsGroup cung cấp.'
              : 'Figures supplied by WingsGroup.',
            label: vietnamese ? 'Khách hàng cá nhân đồng hành' : 'Individual travellers served',
            value: vietnamese ? '10.000+' : '10,000+',
          },
          {
            description: vietnamese
              ? 'Số liệu do WingsGroup cung cấp.'
              : 'Figures supplied by WingsGroup.',
            label: vietnamese ? 'Chương trình MICE doanh nghiệp' : 'Corporate MICE programmes',
            value: '500+',
          },
          {
            description: vietnamese
              ? 'Số liệu do WingsGroup cung cấp.'
              : 'Figures supplied by WingsGroup.',
            label: vietnamese
              ? 'Đánh giá hài lòng về dịch vụ Fast Track'
              : 'Fast Track satisfaction rating',
            value: '98%',
          },
        ],
        title: vietnamese
          ? 'Minh bạch để bạn an tâm lựa chọn.'
          : 'Clarity helps you choose with confidence.',
      },
      {
        blockName: 'WingsGroup production proof archive',
        blockType: 'wingsGroupProofArchive',
        description: vietnamese
          ? 'Hồ sơ chỉ xuất hiện sau khi nguồn, ngữ cảnh, quyền công bố và provenance của media đã được xác minh.'
          : 'Records leave pending state only when source, context, permission and media provenance are verified.',
        eyebrow: vietnamese ? 'Dẫn chứng năng lực' : 'Capability records',
        records: [
          {
            key: 'proof-archive-intro',
            kind: 'other',
            media: 'wingsgroup-journey-consultation.png',
            permissionState: 'pending',
            publicationState: 'pending',
            title: vietnamese ? 'Dấu mốc nổi bật' : 'Selected records',
          },
          {
            key: 'proof-certificates',
            kind: 'certificate',
            permissionState: 'pending',
            publicationState: 'pending',
            title: vietnamese
              ? 'Tiêu chuẩn phục vụ được ghi nhận.'
              : 'Service standards, when evidenced.',
          },
          {
            key: 'proof-partner-reviews',
            kind: 'membership',
            permissionState: 'pending',
            publicationState: 'pending',
            title: vietnamese
              ? 'Đồng hành để tạo nên những hành trình tốt hơn.'
              : 'Partnerships, when evidenced.',
          },
          {
            key: 'proof-customer-reviews',
            kind: 'other',
            permissionState: 'pending',
            publicationState: 'pending',
            title: vietnamese
              ? 'Những hành trình được sẻ chia.'
              : 'Customer stories, when approved.',
          },
        ],
        title: vietnamese
          ? 'Những dấu mốc tạo nên niềm tin bền vững.'
          : 'Trust grows from records that can be checked.',
      },
      {
        blockName: 'WingsGroup production editorial archive',
        blockType: 'archive',
        limit: 3,
        populateBy: 'collection',
        presentation: 'magazine',
        relationTo: 'posts',
      },
      contactBlock(),
    ],
    meta: {
      description: vietnamese
        ? 'WingsGroup — điểm bắt đầu để tìm đúng dịch vụ du lịch, thông tin doanh nghiệp và đầu mối phù hợp.'
        : 'WingsGroup — a considered starting point for travel services, corporate information and the right team.',
      title: vietnamese
        ? 'WingsGroup — Hệ sinh thái dịch vụ du lịch'
        : 'WingsGroup — Connected travel expertise',
    },
    title: 'WingsGroup',
  }
}

const productionFormFields = [
  {
    blockName: 'full-name',
    blockType: 'text',
    label: 'Họ và tên / Full name',
    name: 'full-name',
    required: true,
    width: 100,
  },
  {
    blockName: 'email',
    blockType: 'email',
    label: 'Email',
    name: 'email',
    required: false,
    width: 100,
  },
  {
    blockName: 'phone',
    blockType: 'text',
    label: 'Số điện thoại / Phone',
    name: 'phone',
    required: false,
    width: 100,
  },
  {
    blockName: 'brief',
    blockType: 'textarea',
    label: 'Nhu cầu tư vấn / What would you like help with?',
    name: 'brief',
    required: true,
    width: 100,
  },
  {
    blockName: 'consent',
    blockType: 'checkbox',
    defaultValue: false,
    label: WINGSGROUP_CONSENT_COPY.vi,
    name: 'consent',
    required: true,
    width: 100,
  },
]

const productionSettings = {
  ...wingsGroupSettingsSeed.vi,
  englishPublicationState: 'approved',
  legalIdentity: WINGSGROUP_LEGAL_IDENTITY,
  wingsGroupV3: {
    consultationChannels: [
      { key: 'zalo', state: 'unconfigured' },
      { key: 'whatsapp', state: 'unconfigured' },
      { key: 'messenger', state: 'unconfigured' },
    ],
    enabled: true,
    englishPublicationState: 'approved',
    legalIdentity: WINGSGROUP_LEGAL_IDENTITY,
    privacy: {
      approvalReference: 'stakeholder-privacy-consent-2026-08-24',
      approvalState: 'approved',
      consentEvidenceReference: 'stakeholder-privacy-consent-2026-08-24',
      consentRequired: true,
      consentVersion: WINGSGROUP_CONSENT_VERSION,
      dataSubjectContact: WINGSGROUP_DATA_CONTACT,
      dataSubjectRightsEvidence: 'stakeholder-privacy-consent-2026-08-24',
      dataSubjectRightsStatement: 'Người có dữ liệu có thể liên hệ qua info@doicanhviet.com.',
      interBranchTransferAllowed: true,
      policyRouteEn: WINGSGROUP_POLICY_ROUTES.en,
      policyRouteVi: WINGSGROUP_POLICY_ROUTES.vi,
      policyVersion: WINGSGROUP_PRIVACY_VERSION,
      retentionMonths: WINGSGROUP_LEAD_RETENTION_MONTHS,
    },
  },
}

const productionForm = {
  confirmationMessage: lexical('Đã nhận yêu cầu / Request received', [
    'Đội ngũ WingsGroup sẽ xem xét và kết nối bạn với bộ phận phù hợp. The WingsGroup team will review your request and connect it with the right service team.',
  ]),
  confirmationType: 'message',
  fields: productionFormFields,
  submitButtonLabel: 'Nhận tư vấn phù hợp / Request a consultation',
  title: 'Liên hệ WingsGroup / Contact WingsGroup',
}

export const buildWingsGroupV3ContentContract = () => ({
  form: productionForm,
  formKey: WINGSGROUP_V3_CONTENT_FORM_KEY,
  pages: CONTENT_ROUTES.map((route) => ({
    path: route.path,
    governance: routeGovernanceForSeed(route),
    locales: {
      en:
        route.path === '/'
          ? buildProductionHomepage('en')
          : route.path === '/lien-he'
            ? { ...route.en, layout: [...route.en.layout, contactBlock()] }
            : route.en,
      vi:
        route.path === '/'
          ? buildProductionHomepage('vi')
          : route.path === '/lien-he'
            ? { ...route.vi, layout: [...route.vi.layout, contactBlock()] }
            : route.vi,
    },
    publication: routeGovernanceForSeed(route).publication,
  })),
  routes: CONTENT_ROUTE_PATHS,
  settings: productionSettings,
  siteCode: WINGSGROUP_SITE_CODE,
})

const resolveRelations = (
  value: unknown,
  mediaIDs: ReadonlyMap<string, number | string>,
  formID: number | string,
): unknown => {
  if (Array.isArray(value)) return value.map((item) => resolveRelations(item, mediaIDs, formID))
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && mediaIDs.has(value)) return mediaIDs.get(value)
    if (typeof value === 'string' && value.endsWith('.png')) {
      throw new Error(`Missing governed WingsGroup media relation: ${value}.`)
    }
    return value
  }
  const record = value as UnknownRecord
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      key === 'form' && item === WINGSGROUP_V3_CONTENT_FORM_KEY
        ? formID
        : resolveRelations(item, mediaIDs, formID),
    ]),
  )
}

export const resolveWingsGroupV3ContentContract = ({
  contract = buildWingsGroupV3ContentContract(),
  formID,
  mediaIDs,
}: {
  contract?: ReturnType<typeof buildWingsGroupV3ContentContract>
  formID: number | string
  mediaIDs: ReadonlyMap<string, number | string>
}) => {
  const resolved = resolveRelations(contract, mediaIDs, formID) as ReturnType<
    typeof buildWingsGroupV3ContentContract
  >
  return resolved
}

export const buildWingsGroupV3ContentPlan = ({
  mediaPlan,
}: {
  mediaPlan: WingsGroupV3MediaPlan
}): WingsGroupV3ContentPlan => {
  if (mediaPlan.records.length !== WINGSGROUP_V3_CONTENT_MEDIA_COUNT) {
    throw new Error('WingsGroup v3 content requires exactly 13 governed source records.')
  }
  const derivativeCount = mediaPlan.records.reduce(
    (total, record) => total + record.derivatives.length,
    0,
  )
  if (derivativeCount !== WINGSGROUP_V3_CONTENT_DERIVATIVE_COUNT) {
    throw new Error('WingsGroup v3 content requires exactly 78 governed derivative records.')
  }
  const contract = buildWingsGroupV3ContentContract()
  return {
    contentChecksum: checksum({
      contract,
      media: mediaPlan.records.map(({ sourceFile, sourceIdentity }) => ({
        sourceFile,
        sourceIdentity,
      })),
    }),
    derivativeCount: WINGSGROUP_V3_CONTENT_DERIVATIVE_COUNT,
    formKey: WINGSGROUP_V3_CONTENT_FORM_KEY,
    mediaCount: WINGSGROUP_V3_CONTENT_MEDIA_COUNT,
    mediaPlanChecksum: mediaPlan.planChecksum,
    routes: CONTENT_ROUTE_PATHS,
    siteCode: WINGSGROUP_SITE_CODE,
  }
}

const exactOne = <T>(docs: readonly T[], label: string): T => {
  if (docs.length !== 1)
    throw new Error(`WingsGroup v3 content requires exactly one ${label}; found ${docs.length}.`)
  return docs[0]
}

const findSite = async (payload: ContentPayload, req: ContentRequest) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: WINGSGROUP_SITE_CODE } },
  } as never)
  return asRecord(exactOne(result.docs, 'wings-group site'))
}

const findSettings = async (
  payload: ContentPayload,
  req: ContentRequest,
  siteID: number | string,
) => {
  const result = await payload.find({
    collection: 'site-settings',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { site: { equals: siteID } },
  } as never)
  return asRecord(exactOne(result.docs, 'WingsGroup SiteSettings'))
}

const findOperator = async (payload: ContentPayload, req: ContentRequest, email: string) => {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { email: { equals: email }, role: { equals: 'super-admin' } },
  } as never)
  return asRecord(exactOne(result.docs, 'super-admin operator'))
}

const findPages = async (
  payload: ContentPayload,
  req: ContentRequest,
  siteID: number | string,
  locale: ContentLocale,
) => {
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    fallbackLocale: false,
    limit: 100,
    locale,
    overrideAccess: true,
    pagination: false,
    req,
    where: { site: { equals: siteID } },
  } as never)
  const byPath = new Map<string, UnknownRecord>()
  for (const rawPage of result.docs) {
    const page = asRecord(rawPage)
    const pathname =
      typeof page.pathname === 'string' ? page.pathname : page.slug === 'home' ? '/' : ''
    if (!pathname) continue
    if (byPath.has(pathname)) throw new Error(`Duplicate WingsGroup ${locale} Page: ${pathname}.`)
    byPath.set(pathname, page)
  }
  return byPath
}

const findContactForm = async (
  payload: ContentPayload,
  req: ContentRequest,
  siteID: number | string,
) => {
  const result = await payload.find({
    collection: 'forms',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    req,
    where: { site: { equals: siteID } },
  } as never)
  const matches = result.docs.map(asRecord).filter((doc) => doc.title === productionForm.title)
  if (matches.length > 1) throw new Error('Duplicate WingsGroup production contact forms.')
  return matches[0]
}

const verifySettingsContract = (settings: UnknownRecord): void => {
  const expected = asRecord(productionSettings.wingsGroupV3)
  const actual = asRecord(settings.wingsGroupV3)
  const governed = {
    consultationChannels: (Array.isArray(actual.consultationChannels)
      ? actual.consultationChannels
      : []
    ).map((channel) => {
      const item = asRecord(channel)
      return { key: item.key, state: item.state }
    }),
    enabled: actual.enabled,
    englishPublicationState: actual.englishPublicationState,
    legalIdentity: asRecord(actual.legalIdentity),
    privacy: asRecord(actual.privacy),
  }
  if (checksum(governed) !== checksum(expected)) {
    throw new Error(
      'WingsGroup SiteSettings does not match the approved production content contract.',
    )
  }
}

const verifyFormContract = (form: UnknownRecord, siteID: number | string): void => {
  if (String(relationID(form.site)) !== String(siteID))
    throw new Error('WingsGroup contact form is not site scoped.')
  if (form.title !== productionForm.title)
    throw new Error('WingsGroup contact form title is not the approved contract.')
  const fields = Array.isArray(form.fields) ? form.fields.map(asRecord) : []
  const names = fields.map((field) => field.name)
  for (const required of ['full-name', 'brief', 'consent']) {
    if (!names.includes(required))
      throw new Error(`WingsGroup contact form is missing ${required}.`)
  }
  const consent = fields.find((field) => field.name === 'consent')
  if (consent?.blockType !== 'checkbox' || consent.required !== true) {
    throw new Error('WingsGroup contact form consent is not required.')
  }
}

type HeroMediaRelation = { path: string; value: unknown }

const heroMediaRelations = (value: unknown): HeroMediaRelation[] => {
  const hero = asRecord(value)
  const slides = Array.isArray(hero.slides) ? hero.slides.map(asRecord) : []
  const supportingMedia = Array.isArray(hero.supportingMedia) ? hero.supportingMedia : []
  const video = asRecord(hero.video)
  return [
    { path: 'media', value: hero.media },
    ...supportingMedia.map((media, index) => ({ path: `supportingMedia[${index}]`, value: media })),
    ...slides.flatMap((slide, index) => [
      { path: `slides[${index}].media`, value: slide.media },
      { path: `slides[${index}].mobileMedia`, value: slide.mobileMedia },
    ]),
    { path: 'video.desktopVideo', value: video.desktopVideo },
    { path: 'video.mobileVideo', value: video.mobileVideo },
    { path: 'video.poster', value: video.poster },
  ].filter(({ value: relation }) => relation !== null && relation !== undefined)
}

const verifyHeroMediaContract = ({
  expected,
  governedPublishedMedia,
  locale,
  page,
  siteID,
}: {
  expected: UnknownRecord
  governedPublishedMedia: ReadonlyMap<string, VerifiedHeroMedia>
  locale: ContentLocale
  page: UnknownRecord
  siteID: number | string
}): void => {
  const expectedHero = asRecord(asRecord(expected.locales)[locale]).hero
  const expectedRelations = heroMediaRelations(expectedHero)
  const expectedRelationPaths = new Set(expectedRelations.map((relation) => relation.path))
  const actualRelations = heroMediaRelations(page.hero)
  const actualRelationValues = new Map(
    actualRelations.map((relation) => [relation.path, relation.value]),
  )

  for (const actualRelation of actualRelations) {
    if (!expectedRelationPaths.has(actualRelation.path)) {
      throw new Error(
        `WingsGroup ${locale} ${String(page.pathname)} has an unexpected hero media relation ${actualRelation.path}.`,
      )
    }
  }

  for (const expectedRelation of expectedRelations) {
    const expectedID = relationID(expectedRelation.value)
    if (expectedID === undefined) {
      throw new Error(
        `WingsGroup ${locale} ${String(page.pathname)} has an unresolved expected hero media relation ${expectedRelation.path}.`,
      )
    }
    const actualID = relationID(actualRelationValues.get(expectedRelation.path))
    if (actualID === undefined) {
      throw new Error(
        `WingsGroup ${locale} ${String(page.pathname)} required hero media relation ${expectedRelation.path} is missing.`,
      )
    }
    if (String(actualID) !== String(expectedID)) {
      throw new Error(
        `WingsGroup ${locale} ${String(page.pathname)} hero media relation ${expectedRelation.path} mismatches the approved contract.`,
      )
    }
    const verified = governedPublishedMedia.get(String(actualID))
    if (
      !verified ||
      verified.managedBy !== 'wingsgroup-v3' ||
      verified.publicationState !== 'published' ||
      verified.siteCode !== WINGSGROUP_SITE_CODE ||
      String(verified.siteID) !== String(siteID)
    ) {
      throw new Error(
        `WingsGroup ${locale} ${String(page.pathname)} hero media relation ${expectedRelation.path} is not a governed, site-scoped, published WingsGroup media record.`,
      )
    }
  }
}

const verifyPageContract = ({
  locale,
  page,
  expected,
  formID,
  governedPublishedMedia,
  siteID,
}: {
  locale: ContentLocale
  page: UnknownRecord
  expected: UnknownRecord
  formID: number | string
  governedPublishedMedia: ReadonlyMap<string, VerifiedHeroMedia>
  siteID: number | string
}) => {
  if (String(relationID(page.site)) !== String(siteID)) {
    throw new Error(`WingsGroup ${locale} ${String(page.pathname)} is not site scoped.`)
  }
  if (page._status !== 'published' && asRecord(expected.publication)[locale] === 'approved') {
    throw new Error(`WingsGroup ${locale} ${String(page.pathname)} is not published.`)
  }
  if (page.title !== asRecord(asRecord(expected.locales)[locale]).title)
    throw new Error(`WingsGroup ${locale} page title mismatch.`)
  if (asRecord(expected.publication)[locale] !== 'approved' && page._status === 'published') {
    throw new Error(`WingsGroup ${locale} ${String(page.pathname)} is not fail-closed.`)
  }
  const expectedGovernance = asRecord(expected.governance)
  const actualGovernance = asRecord(page.wingsGroupRoute)
  const expectedPolicy = asRecord(expectedGovernance.policy)
  const actualPolicy = asRecord(actualGovernance.policy)
  const governedPolicy = Object.fromEntries(
    Object.keys(expectedPolicy).map((key) => [
      key,
      key === 'effectiveDate' && typeof actualPolicy[key] === 'string'
        ? actualPolicy[key].slice(0, 10)
        : actualPolicy[key],
    ]),
  )
  const governedRoute = {
    archetype: actualGovernance.archetype,
    contentApproval: asRecord(actualGovernance.contentApproval),
    managedBy: actualGovernance.managedBy,
    ...(expectedGovernance.policy !== undefined ? { policy: governedPolicy } : {}),
    publication: asRecord(actualGovernance.publication),
  }
  if (checksum(governedRoute) !== checksum(expectedGovernance)) {
    throw new Error(`WingsGroup ${locale} ${String(page.pathname)} governance mismatch.`)
  }
  verifyHeroMediaContract({
    expected,
    governedPublishedMedia,
    locale,
    page,
    siteID,
  })
  const serialized = JSON.stringify(page.layout)
  if (serialized.includes(WINGSGROUP_V3_CONTENT_FORM_KEY))
    throw new Error('Unresolved production form relation remains in a Page.')
  if (serialized.includes('wingsgroup-') && !serialized.includes(String(formID))) {
    throw new Error(
      `WingsGroup ${locale} ${String(page.pathname)} contains unresolved media relations.`,
    )
  }
}

const emptyLocalizedHero = {
  behaviorMode: null,
  behaviorOverrides: {
    autoplay: null,
    intervalMs: null,
    loop: null,
    pauseOnHover: null,
    showArrows: null,
    showDots: null,
    transition: null,
    transitionMs: null,
  },
  links: [],
  media: null,
  presentation: null,
  presentationMode: null,
  presentationPreset: null,
  richText: null,
  slides: [],
  supportingMedia: [],
  type: 'none',
  variant: null,
  video: { desktopVideo: null, mobileVideo: null, poster: null },
}

const heroDataForLocale = (value: unknown): UnknownRecord => {
  const hero = asRecord(value)
  const behaviorOverrides = asRecord(hero.behaviorOverrides)
  const video = asRecord(hero.video)
  return {
    ...emptyLocalizedHero,
    ...hero,
    behaviorOverrides: {
      ...emptyLocalizedHero.behaviorOverrides,
      ...behaviorOverrides,
    },
    video: {
      ...emptyLocalizedHero.video,
      ...video,
    },
  }
}

type Inventory = {
  form?: UnknownRecord
  governedPublishedMedia?: Map<string, VerifiedHeroMedia>
  mediaIDs: Map<string, number | string>
  pages: { en: Map<string, UnknownRecord>; vi: Map<string, UnknownRecord> }
  settings: UnknownRecord
  site: UnknownRecord
}

export const readWingsGroupV3ContentInventory = async ({
  manifest,
  mediaDirectory = WINGSGROUP_V3_MEDIA_DIRECTORY,
  mediaPlan,
  payload,
  publicOrigin,
  req,
  siteID,
}: {
  manifest: WingsGroupV3MediaManifest
  mediaDirectory?: string
  mediaPlan: WingsGroupV3MediaPlan
  payload: ContentPayload
  publicOrigin: string
  req: ContentRequest
  siteID?: number | string
}): Promise<
  Inventory & { mediaVerification: Awaited<ReturnType<typeof verifyWingsGroupV3Media>> }
> => {
  const site =
    siteID === undefined
      ? await findSite(payload, req)
      : asRecord(
          await payload.findByID({
            collection: 'sites',
            id: siteID,
            depth: 0,
            overrideAccess: true,
            req,
          } as never),
        )
  const resolvedSiteID = relationID(site.id)
  if (resolvedSiteID === undefined) throw new Error('WingsGroup site has no stable ID.')
  if (site.code !== WINGSGROUP_SITE_CODE) throw new Error('Resolved site is not wings-group.')
  const settings = await findSettings(payload, req, resolvedSiteID)
  const pages = {
    en: await findPages(payload, req, resolvedSiteID, 'en'),
    vi: await findPages(payload, req, resolvedSiteID, 'vi'),
  }
  const form = await findContactForm(payload, req, resolvedSiteID)
  const mediaVerification = await verifyWingsGroupV3Media({
    expectedPublicationState: 'published',
    manifest,
    mediaDirectory,
    payload: payload as Payload,
    plan: mediaPlan,
    publicOrigin,
    requirePhysicalDerivatives: true,
    req: req as PayloadRequest,
    siteID: resolvedSiteID,
  })
  if (
    mediaVerification.verified !== WINGSGROUP_V3_CONTENT_MEDIA_COUNT ||
    mediaVerification.responsiveDerivatives.persisted !== WINGSGROUP_V3_CONTENT_DERIVATIVE_COUNT
  ) {
    throw new Error(
      'WingsGroup public content requires the complete published 13-source/78-derivative inventory.',
    )
  }
  const mediaIDs = new Map<string, number | string>()
  const governedPublishedMedia = new Map<string, VerifiedHeroMedia>()
  for (const record of mediaVerification.records) {
    mediaIDs.set(record.sourceIdentity, record.id)
    governedPublishedMedia.set(String(record.id), {
      managedBy: 'wingsgroup-v3',
      publicationState: 'published',
      siteCode: WINGSGROUP_SITE_CODE,
      siteID: resolvedSiteID,
    })
    const planned = mediaPlan.records.find(
      (candidate) => candidate.sourceIdentity === record.sourceIdentity,
    )
    if (planned) {
      mediaIDs.set(planned.sourceFile, record.id)
      mediaIDs.set(planned.importFilename, record.id)
    }
  }
  for (const record of mediaPlan.records) {
    if (!mediaIDs.has(record.sourceIdentity))
      throw new Error(`Missing governed media relation ${record.sourceFile}.`)
  }
  return { form, governedPublishedMedia, mediaIDs, mediaVerification, pages, settings, site }
}

export const verifyWingsGroupV3ContentInventory = ({
  contract = buildWingsGroupV3ContentContract(),
  formID,
  inventory,
}: {
  contract?: ReturnType<typeof buildWingsGroupV3ContentContract>
  formID: number | string
  inventory: Inventory
}): { publishedLocales: number; publishedRoutes: number; routeCount: number } => {
  verifySettingsContract(inventory.settings)
  if (!inventory.form) throw new Error('WingsGroup production contact form is missing.')
  verifyFormContract(inventory.form, relationID(inventory.site.id)!)
  let publishedLocales = 0
  for (const route of contract.pages) {
    for (const locale of ['vi', 'en'] as const) {
      const page = inventory.pages[locale].get(route.path)
      if (!page) throw new Error(`Missing WingsGroup ${locale} route ${route.path}.`)
      verifyPageContract({
        expected: route,
        formID,
        governedPublishedMedia: inventory.governedPublishedMedia || new Map(),
        locale,
        page,
        siteID: relationID(inventory.site.id)!,
      })
      if (route.publication[locale] === 'approved') publishedLocales += 1
    }
  }
  return {
    publishedLocales,
    publishedRoutes: contract.pages.filter((route) => route.publication.vi === 'approved').length,
    routeCount: contract.pages.length,
  }
}

const pageDataForLocale = ({
  contractRoute,
  formID,
  locale,
  mediaIDs,
}: {
  contractRoute: ReturnType<typeof buildWingsGroupV3ContentContract>['pages'][number]
  formID: number | string
  locale: ContentLocale
  mediaIDs: ReadonlyMap<string, number | string>
}) => {
  const localized = asRecord(contractRoute.locales[locale])
  const resolved = resolveRelations(localized, mediaIDs, formID) as UnknownRecord
  return {
    _status: contractRoute.publication[locale] === 'approved' ? 'published' : 'draft',
    hero: heroDataForLocale(resolved.hero),
    layout: resolved.layout,
    meta: resolved.meta ?? { breadcrumbLabel: null, description: null, image: null, title: null },
    pathname: contractRoute.path,
    slug: contractRoute.path === '/' ? 'home' : contractRoute.path.slice(1),
    title: resolved.title,
    wingsGroupRoute: contractRoute.governance,
  }
}

const contentPageWrite = async ({
  contractRoute,
  existing,
  formID,
  locale,
  mediaIDs,
  payload,
  req,
  siteID,
}: {
  contractRoute: ReturnType<typeof buildWingsGroupV3ContentContract>['pages'][number]
  existing?: UnknownRecord
  formID: number | string
  locale: ContentLocale
  mediaIDs: ReadonlyMap<string, number | string>
  payload: ContentPayload
  req: ContentRequest
  siteID: number | string
}) => {
  const data = { ...pageDataForLocale({ contractRoute, formID, locale, mediaIDs }), site: siteID }
  const localeReq = { ...req, fallbackLocale: false, locale, payloadDataLoader: undefined }
  if (existing) {
    return payload.update({
      collection: 'pages',
      context: PRODUCTION_CONTEXT,
      data: data as never,
      id: existing.id,
      locale,
      overrideAccess: true,
      req: localeReq,
    } as never)
  }
  return payload.create({
    collection: 'pages',
    context: PRODUCTION_CONTEXT,
    data: data as never,
    locale,
    overrideAccess: true,
    req: localeReq,
  } as never)
}

export const applyWingsGroupV3Content = async ({
  contract = buildWingsGroupV3ContentContract(),
  inventory,
  payload,
  req,
}: {
  contract?: ReturnType<typeof buildWingsGroupV3ContentContract>
  inventory: Inventory
  payload: ContentPayload
  req: ContentRequest
}) => {
  const siteID = relationID(inventory.site.id)
  const formData = { ...productionForm, site: siteID }
  let form = inventory.form
  if (form) {
    form = (await payload.update({
      collection: 'forms',
      context: PRODUCTION_CONTEXT,
      data: formData as never,
      id: form.id,
      overrideAccess: true,
      req,
    } as never)) as UnknownRecord
  } else {
    form = (await payload.create({
      collection: 'forms',
      context: PRODUCTION_CONTEXT,
      data: formData as never,
      overrideAccess: true,
      req,
    } as never)) as UnknownRecord
  }
  const formID = relationID(form.id)
  if (siteID === undefined || formID === undefined)
    throw new Error('WingsGroup content relation IDs are unavailable.')

  await payload.update({
    collection: 'site-settings',
    context: PRODUCTION_CONTEXT,
    data: productionSettings as never,
    id: inventory.settings.id,
    locale: 'vi',
    overrideAccess: true,
    req: { ...req, locale: 'vi', payloadDataLoader: undefined },
  } as never)
  await payload.update({
    collection: 'site-settings',
    context: PRODUCTION_CONTEXT,
    data: wingsGroupSettingsSeed.en as never,
    id: inventory.settings.id,
    locale: 'en',
    overrideAccess: true,
    req: { ...req, locale: 'en', payloadDataLoader: undefined },
  } as never)

  const writes: string[] = []
  for (const route of contract.pages) {
    let existing = inventory.pages.vi.get(route.path) || inventory.pages.en.get(route.path)
    for (const locale of ['vi', 'en'] as const) {
      const page = await contentPageWrite({
        contractRoute: route,
        existing,
        formID,
        locale,
        mediaIDs: inventory.mediaIDs,
        payload,
        req,
        siteID,
      })
      inventory.pages[locale].set(route.path, page as UnknownRecord)
      existing = page as UnknownRecord
      writes.push(`${locale}:${route.path}`)
    }
  }
  inventory.form = form
  return { formID, writes }
}

export const assertWingsGroupV3ContentPlanBinding = ({
  expected,
  provided,
}: {
  expected: string
  provided: string | undefined
}) => {
  if (provided !== expected || !/^[a-f0-9]{64}$/u.test(provided || '')) {
    throw new Error('WingsGroup v3 content requires the exact immutable plan checksum.')
  }
}

const main = async () => {
  const command = parseWingsGroupV3ContentCommand(process.argv.slice(2))
  const manifest = parseWingsGroupV3MediaManifest(
    JSON.parse(await (await import('node:fs/promises')).readFile(command.manifestPath, 'utf8')),
  )
  const mediaPlan = await buildWingsGroupV3MediaPlan({
    assetsDirectory: command.assetsDirectory,
    manifest,
  })
  if (mediaPlan.errors.length > 0)
    throw new Error(`WingsGroup media plan is not applicable: ${mediaPlan.errors.join('; ')}`)
  const contentPlan = buildWingsGroupV3ContentPlan({ mediaPlan })
  const binding = assertProductionContentEnvironment({
    args: command,
    environment: process.env,
    phase: command.phase,
  })
  const payload = await getPayload({ config: configPromise })
  try {
    const operatorEmail = command.operatorEmail || process.env[WINGSGROUP_V3_CONTENT_OPERATOR_ENV]
    if (!operatorEmail)
      throw new Error('WingsGroup v3 content requires the operator email binding.')
    const operator = await findOperator(
      payload as ContentPayload,
      { payload } as ContentRequest,
      operatorEmail,
    )
    const req = await createLocalReq(
      { context: PRODUCTION_CONTEXT, user: operator as never },
      payload,
    )
    const site = await findSite(payload as ContentPayload, req)
    const resolvedSiteID = relationID(site.id)
    if (resolvedSiteID === undefined) throw new Error('WingsGroup site has no stable ID.')
    const inventory = await readWingsGroupV3ContentInventory({
      manifest,
      mediaDirectory: command.mediaDirectory,
      mediaPlan,
      payload: payload as ContentPayload,
      publicOrigin: `https://${String(site.primaryDomain)}`,
      req,
      siteID: resolvedSiteID,
    })
    if (command.phase === 'plan') {
      console.log(
        JSON.stringify(
          { apply: false, operationID: binding.operationID, phase: 'plan', plan: contentPlan },
          null,
          2,
        ),
      )
      return
    }
    assertWingsGroupV3ContentPlanBinding({
      expected: contentPlan.contentChecksum,
      provided: command.planSha256,
    })
    if (command.phase === 'production-verify') {
      const verification = verifyWingsGroupV3ContentInventory({
        contract: buildWingsGroupV3ContentContract(),
        formID: relationID(inventory.form?.id) || '',
        inventory,
      })
      console.log(
        JSON.stringify(
          {
            ...contentPlan,
            ...verification,
            operationID: binding.operationID,
            phase: command.phase,
          },
          null,
          2,
        ),
      )
      return
    }
    if (!payload.db)
      throw new Error('WingsGroup v3 content apply requires Payload database transaction support.')
    const transactionID = await initTransaction(req)
    if (!transactionID || !req.transactionID)
      throw new Error('WingsGroup v3 content apply could not start an isolated transaction.')
    try {
      const result = await applyWingsGroupV3Content({
        inventory,
        payload: payload as ContentPayload,
        req,
      })
      await commitTransaction(req)
      const verification = verifyWingsGroupV3ContentInventory({
        contract: buildWingsGroupV3ContentContract(),
        formID: result.formID,
        inventory,
      })
      console.log(
        JSON.stringify(
          {
            ...contentPlan,
            ...result,
            ...verification,
            operationID: binding.operationID,
            phase: command.phase,
          },
          null,
          2,
        ),
      )
    } catch (error) {
      if (req.transactionID) await payload.db.rollbackTransaction(req.transactionID)
      throw error
    }
  } finally {
    await payload.destroy()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
