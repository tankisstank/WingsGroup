import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook, Field } from 'payload'
import { WINGSGROUP_LEGAL_IDENTITY } from '@/wingsgroup/corporateRoutes'
import {
  WINGSGROUP_CONSENT_VERSION,
  WINGSGROUP_DATA_CONTACT,
  WINGSGROUP_LEAD_RETENTION_MONTHS,
  WINGSGROUP_POLICY_ROUTES,
  WINGSGROUP_PRIVACY_VERSION,
} from '@/lead-capture/wingsGroupV3'

const HTTPS_URL = /^https:\/\//i
const SHA256 = /^[a-f0-9]{64}$/
const EXTERNAL_CONSULTATION_CHANNEL_KEYS = new Set(['zalo', 'whatsapp', 'messenger'])
const SAFE_DERIVATIVE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:avif|webp)$/u
const WINGSGROUP_V3_PUBLISH_CONTEXT_MARKER = Symbol('wingsgroup-v3-production-publish')

type WingsGroupV3ProductionPublishContext = {
  [WINGSGROUP_V3_PUBLISH_CONTEXT_MARKER]: string
}

export const WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES = [
  { format: 'webp', name: 'wingsgroup-v3-640-webp', width: 640 },
  { format: 'avif', name: 'wingsgroup-v3-640-avif', width: 640 },
  { format: 'webp', name: 'wingsgroup-v3-960-webp', width: 960 },
  { format: 'avif', name: 'wingsgroup-v3-960-avif', width: 960 },
  { format: 'webp', name: 'wingsgroup-v3-1440-webp', width: 1440 },
  { format: 'avif', name: 'wingsgroup-v3-1440-avif', width: 1440 },
] as const

export const getWingsGroupV3DerivativeSizeName = (
  format: 'avif' | 'webp',
  width: number,
): string | undefined =>
  WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES.find(
    (size) => size.format === format && size.width === width,
  )?.name

export const createWingsGroupV3ProductionPublishContext = (
  operationID: string,
): Readonly<WingsGroupV3ProductionPublishContext> => {
  if (!/^[a-z0-9][a-z0-9._-]{15,127}$/u.test(operationID)) {
    throw new Error('WingsGroup production publication context requires an operation ID.')
  }
  return Object.freeze({ [WINGSGROUP_V3_PUBLISH_CONTEXT_MARKER]: operationID })
}

const hasWingsGroupV3ProductionPublishContext = (value: unknown): boolean =>
  Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as Partial<WingsGroupV3ProductionPublishContext>)[
      WINGSGROUP_V3_PUBLISH_CONTEXT_MARKER
    ] === 'string',
  )

export const generateWingsGroupV3DerivativeImageName = ({
  extension,
  originalName,
  width,
}: {
  extension: string
  originalName: string
  width: number
}): string => {
  const governedName = /^wg-v3-([a-f0-9]{12})-(.+)$/u.exec(originalName)
  if (!governedName) return `${originalName}-${width}.${extension}`
  return `${governedName[2]}-${governedName[1]}-${width}.${extension}`
}

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const isTrimmedNonempty = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value === value.trim()

const hasHTTPSURL = (value: unknown): boolean => HTTPS_URL.test(asString(value))

const hasSha256 = (value: unknown): boolean => SHA256.test(asString(value))

export const isWingsGroupV3DerivativeFilename = (value: unknown): value is string =>
  typeof value === 'string' && SAFE_DERIVATIVE_FILENAME.test(value)

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as UnknownRecord)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]),
  )
}

export const wingsGroupV3ReleaseGovernanceSnapshot = (value: unknown): string =>
  JSON.stringify(canonicalize(asRecord(value)))

export const validateConsultationChannels = (value: unknown): true | string => {
  if (!Array.isArray(value)) return true

  const keys = new Set<string>()
  for (const rawChannel of value) {
    const channel = asRecord(rawChannel)
    const key = asString(channel.key)
    if (!key || keys.has(key)) return 'Mỗi kênh tư vấn phải có một key duy nhất.'
    if (!EXTERNAL_CONSULTATION_CHANNEL_KEYS.has(key)) {
      return 'Kênh callback chỉ được chọn trong biểu mẫu tiếp nhận, không phải kênh ngoài form.'
    }
    keys.add(key)

    if (channel.state === 'approved') {
      if (!hasHTTPSURL(channel.url)) return 'Kênh đã duyệt phải có URL HTTPS.'
      if (!asString(channel.owner)) return 'Kênh đã duyệt phải có owner.'
      if (!asString(channel.sla)) return 'Kênh đã duyệt phải có SLA.'
      if (!asString(channel.trackingReference)) {
        return 'Kênh đã duyệt phải có bằng chứng tracking.'
      }
    }
  }

  return true
}

export const validateMediaGovernance = (value: unknown): true | string => {
  const governance = asRecord(value)
  if (governance.managedBy !== 'wingsgroup-v3' || governance.publicationState !== 'published') {
    return true
  }

  if (!asString(governance.sourceAttachmentId)) return 'Media publish cần attachment nguồn.'
  if (!asString(governance.sourceIdentity)) return 'Media publish cần source identity.'
  if (!hasSha256(governance.sourceArchiveSha256)) return 'Media publish cần SHA-256 archive.'
  if (!hasSha256(governance.sourceFileSha256)) return 'Media publish cần SHA-256 file nguồn.'
  if (!asString(governance.provenanceReference)) return 'Media publish cần provenance.'
  if (governance.rightsState !== 'approved') return 'Media publish cần quyền sử dụng đã duyệt.'
  if (!asString(governance.rightsEvidence)) return 'Media publish cần bằng chứng quyền sử dụng.'
  if (governance.derivativeState !== 'verified') {
    return 'Media publish cần responsive derivatives đã được xác minh.'
  }

  const derivatives = Array.isArray(governance.responsiveDerivatives)
    ? governance.responsiveDerivatives.map(asRecord)
    : []
  const expectedKeys = new Set(
    WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES.map(({ format, width }) => `${format}:${width}`),
  )
  const actualKeys = new Set<string>()
  if (derivatives.length !== WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES.length) {
    return 'Media publish cần đúng sáu responsive derivatives.'
  }
  for (const item of derivatives) {
    const format = item.format
    const width = item.width
    const key = `${String(format)}:${String(width)}`
    if (!expectedKeys.has(key) || actualKeys.has(key)) {
      return 'Media publish cần đúng một derivative cho từng width/format.'
    }
    actualKeys.add(key)
    if (
      !Number.isInteger(width) ||
      !hasHTTPSURL(item.url) ||
      !hasSha256(item.sha256) ||
      typeof item.height !== 'number' ||
      !Number.isInteger(item.height) ||
      item.height < 1
    ) {
      return 'Mỗi derivative cần width, height, URL HTTPS và SHA-256 hợp lệ.'
    }
    let url: URL
    try {
      url = new URL(String(item.url))
    } catch {
      return 'Mỗi derivative cần URL HTTPS hợp lệ.'
    }
    const filename = url.pathname.slice('/media/'.length)
    if (
      url.protocol !== 'https:' ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith('/media/') ||
      !SAFE_DERIVATIVE_FILENAME.test(filename) ||
      !filename.endsWith(`.${String(format)}`)
    ) {
      return 'Mỗi derivative cần filename flat an toàn dưới /media/.'
    }
  }

  return true
}

export const validateWingsGroupV3PublicMedia = (
  value: unknown,
  publicOrigin?: string,
): true | string => {
  const governance = asRecord(value)
  if (governance.managedBy !== 'wingsgroup-v3' || governance.publicationState !== 'published') {
    return 'WingsGroup public media must be published governed media.'
  }
  const result = validateMediaGovernance(governance)
  if (result !== true) return result
  if (publicOrigin) {
    let origin: URL
    try {
      origin = new URL(publicOrigin)
    } catch {
      return 'Media publish cần public origin hợp lệ.'
    }
    const derivatives = Array.isArray(governance.responsiveDerivatives)
      ? governance.responsiveDerivatives.map(asRecord)
      : []
    if (derivatives.some((item) => new URL(String(item.url)).origin !== origin.origin)) {
      return 'Media publish cần derivative URL cùng origin với site.'
    }
  }
  return true
}

export const validateWingsGroupV3Settings: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  req,
}) => {
  const hasPendingSettings = Object.prototype.hasOwnProperty.call(data || {}, 'wingsGroupV3')
  const settings = asRecord(hasPendingSettings ? data?.wingsGroupV3 : originalDoc?.wingsGroupV3)
  if (
    req.context?.seed !== true &&
    req.user?.role !== 'super-admin' &&
    wingsGroupV3ReleaseGovernanceSnapshot(settings) !==
      wingsGroupV3ReleaseGovernanceSnapshot(originalDoc?.wingsGroupV3)
  ) {
    throw new Error('Chỉ super-admin được thay đổi WingsGroup v3 release governance.')
  }
  if (!settings.enabled) return data

  const privacy = asRecord(settings.privacy)
  if (asString(privacy.policyVersion) !== WINGSGROUP_PRIVACY_VERSION) {
    throw new Error('WingsGroup v3 policy version không khớp lead contract.')
  }
  if (asString(privacy.consentVersion) !== WINGSGROUP_CONSENT_VERSION) {
    throw new Error('WingsGroup v3 consent version không khớp lead contract.')
  }
  if (privacy.consentRequired !== true) throw new Error('WingsGroup v3 bắt buộc consent.')
  if (privacy.retentionMonths !== WINGSGROUP_LEAD_RETENTION_MONTHS) {
    throw new Error('WingsGroup v3 giữ lead tối đa 24 tháng.')
  }
  if (privacy.dataSubjectContact !== WINGSGROUP_DATA_CONTACT) {
    throw new Error('WingsGroup v3 cần đúng đầu mối dữ liệu cá nhân đã duyệt.')
  }
  if (privacy.interBranchTransferAllowed !== true) {
    throw new Error('WingsGroup v3 lead contract cần routing consent đã duyệt.')
  }
  if (
    asString(privacy.policyRouteVi) !== WINGSGROUP_POLICY_ROUTES.vi ||
    asString(privacy.policyRouteEn) !== WINGSGROUP_POLICY_ROUTES.en
  ) {
    throw new Error('WingsGroup v3 privacy route không khớp lead contract.')
  }

  if (privacy.approvalState === 'approved') {
    if (!isTrimmedNonempty(privacy.dataSubjectRightsStatement)) {
      throw new Error(
        'Privacy approval cần nội dung quyền chủ thể dữ liệu do legal owner cung cấp.',
      )
    }
    if (!isTrimmedNonempty(privacy.dataSubjectRightsEvidence)) {
      throw new Error('Privacy approval cần bằng chứng quyền chủ thể dữ liệu.')
    }
    if (!isTrimmedNonempty(privacy.consentEvidenceReference)) {
      throw new Error('Privacy approval cần bằng chứng consent context.')
    }
    if (!isTrimmedNonempty(privacy.approvalReference)) {
      throw new Error('Privacy approval cần bằng chứng phê duyệt.')
    }
  }

  const legalIdentity = asRecord(settings.legalIdentity)
  for (const [field, expected] of Object.entries(WINGSGROUP_LEGAL_IDENTITY)) {
    if (legalIdentity[field] !== expected) {
      throw new Error(`WingsGroup v3 legal identity không hợp lệ: ${field}.`)
    }
  }

  const channelsResult = validateConsultationChannels(settings.consultationChannels)
  if (channelsResult !== true) throw new Error(channelsResult)

  return data
}

const relationID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  const record = asRecord(value)
  return typeof record.id === 'number' || typeof record.id === 'string' ? record.id : undefined
}

const resolveSiteCode = async (
  value: unknown,
  req: Parameters<CollectionBeforeChangeHook>[0]['req'],
): Promise<{ code: string | null; id: number | string } | null> => {
  const id = relationID(value)
  if (id === undefined) return null
  const site = await req.payload.findByID({
    collection: 'sites',
    depth: 0,
    id,
    overrideAccess: true,
    req,
  })
  return { code: typeof site.code === 'string' ? site.code : null, id }
}

const findSettingsForSite = async (
  siteID: number | string,
  req: Parameters<CollectionBeforeChangeHook>[0]['req'],
) =>
  req.payload.find({
    collection: 'site-settings',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { site: { equals: siteID } },
  })

export const protectWingsGroupSiteSettingsBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const target = await resolveSiteCode(data?.site ?? originalDoc?.site, req)
  if (!target) return data

  const isTrustedOperator = req.context?.seed === true || req.user?.role === 'super-admin'
  if (operation === 'create') {
    if (target.code === 'wings-group' && !isTrustedOperator) {
      throw new Error('Chỉ super-admin được tạo WingsGroup SiteSettings.')
    }
    const existing = await findSettingsForSite(target.id, req)
    if (existing.docs.length > 0) {
      throw new Error('Mỗi site chỉ được có một SiteSettings record.')
    }
    return data
  }

  const original = await resolveSiteCode(originalDoc?.site, req)
  if (
    original &&
    String(original.id) !== String(target.id) &&
    (original.code === 'wings-group' || target.code === 'wings-group') &&
    !isTrustedOperator
  ) {
    throw new Error('Chỉ super-admin được chuyển WingsGroup SiteSettings sang site khác.')
  }

  if (target.code === 'wings-group') {
    const existing = await findSettingsForSite(target.id, req)
    if (
      existing.docs.length !== 1 ||
      (originalDoc?.id !== undefined && String(existing.docs[0]?.id) !== String(originalDoc.id))
    ) {
      throw new Error('WingsGroup SiteSettings duplicate hoặc không xác định; từ chối thay đổi.')
    }
  }

  return data
}

export const protectWingsGroupSiteSettingsBeforeDelete: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const settings = await req.payload.findByID({
    collection: 'site-settings',
    depth: 0,
    id,
    overrideAccess: true,
    req,
  })
  const target = await resolveSiteCode(settings.site, req)
  if (target?.code !== 'wings-group') return

  const existing = await findSettingsForSite(target.id, req)
  if (existing.docs.length !== 1 || String(existing.docs[0]?.id) !== String(settings.id)) {
    throw new Error('WingsGroup SiteSettings duplicate hoặc không xác định; từ chối xóa.')
  }
  if (req.context?.seed !== true && req.user?.role !== 'super-admin') {
    throw new Error('Chỉ super-admin được xóa WingsGroup SiteSettings.')
  }
}

export const validateGovernedMediaBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const governance = data?.governance ?? originalDoc?.governance
  const parsed = asRecord(governance)
  const previous = asRecord(originalDoc?.governance)
  const governedSnapshot = (record: UnknownRecord) => ({
    derivativeState: record.derivativeState,
    managedBy: record.managedBy,
    provenanceReference: record.provenanceReference,
    publicationState: record.publicationState,
    responsiveDerivatives: record.responsiveDerivatives,
    rightsEvidence: record.rightsEvidence,
    rightsState: record.rightsState,
    sourceArchiveSha256: record.sourceArchiveSha256,
    sourceAttachmentId: record.sourceAttachmentId,
    sourceFileSha256: record.sourceFileSha256,
    sourceFilename: record.sourceFilename,
    sourceIdentity: record.sourceIdentity,
    usageScope: record.usageScope,
  })
  if (
    req.user?.role !== 'super-admin' &&
    JSON.stringify(governedSnapshot(parsed)) !== JSON.stringify(governedSnapshot(previous))
  ) {
    throw new Error('Chỉ super-admin được thay đổi metadata và trạng thái media governance.')
  }

  const isPublished =
    parsed.managedBy === 'wingsgroup-v3' && parsed.publicationState === 'published'
  const wasPublished =
    previous.managedBy === 'wingsgroup-v3' && previous.publicationState === 'published'
  if (isPublished && !wasPublished && !hasWingsGroupV3ProductionPublishContext(req.context)) {
    throw new Error(
      'WingsGroup v3 publication is server-owned; use the operation-bound production-publish phase.',
    )
  }

  const result = validateMediaGovernance(governance)
  if (result !== true) throw new Error(result)

  if (parsed.managedBy === 'wingsgroup-v3' && parsed.publicationState === 'published') {
    const site = data?.site ?? originalDoc?.site
    const siteID = relationID(site)
    if (siteID === undefined) throw new Error('WingsGroup v3 media publish cần site scope.')
    const siteDoc = await req.payload.findByID({
      collection: 'sites',
      id: siteID,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (siteDoc.code !== 'wings-group') {
      throw new Error('WingsGroup v3 media chỉ được publish trong site wings-group.')
    }
    const publicResult = validateWingsGroupV3PublicMedia(
      governance,
      `https://${siteDoc.primaryDomain}`,
    )
    if (publicResult !== true) throw new Error(publicResult)

    const mediaID = relationID(originalDoc?.id)
    if (mediaID === undefined) {
      throw new Error('Lưu media ở trạng thái ready, nhập alt VI/EN, rồi mới publish.')
    }
    const requestLocale = req.locale === 'en' ? 'en' : req.locale === 'vi' ? 'vi' : undefined
    if (!requestLocale)
      throw new Error('WingsGroup v3 media publish cần locale vi hoặc en rõ ràng.')
    const hasPendingAlt = Object.prototype.hasOwnProperty.call(data || {}, 'alt')
    const effectiveAlt: Partial<Record<'en' | 'vi', unknown>> = {}
    if (hasPendingAlt) effectiveAlt[requestLocale] = data?.alt

    const localesToRead = (['vi', 'en'] as const).filter(
      (locale) => locale !== requestLocale || !hasPendingAlt,
    )
    await Promise.all(
      localesToRead.map(async (locale) => {
        const record = await req.payload.findByID({
          collection: 'media',
          id: mediaID,
          depth: 0,
          fallbackLocale: false,
          locale,
          overrideAccess: true,
          req,
        })
        effectiveAlt[locale] = record.alt
        return record
      }),
    )
    if (!asString(effectiveAlt.vi) || !asString(effectiveAlt.en)) {
      throw new Error('WingsGroup v3 media publish cần alt riêng cho cả vi và en.')
    }
  }

  return data
}

export const wingsGroupV3SettingsField: Field = {
  name: 'wingsGroupV3',
  label: 'WingsGroup v3 governance',
  type: 'group',
  admin: {
    description:
      'Cấu hình fail-closed cho WingsGroup v3. Không bật nhóm này cho tenant không sử dụng contract E09.',
  },
  fields: [
    {
      name: 'enabled',
      label: 'Áp dụng contract WingsGroup v3',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'englishPublicationState',
      label: 'Trạng thái English public',
      type: 'select',
      defaultValue: 'hidden',
      options: [
        { label: 'Ẩn / đang biên tập', value: 'hidden' },
        { label: 'Route đã sẵn sàng', value: 'route-ready' },
        { label: 'Đã duyệt editorial', value: 'approved' },
      ],
    },
    {
      name: 'privacy',
      label: 'Privacy và consent',
      type: 'group',
      fields: [
        { name: 'policyVersion', label: 'Policy version', type: 'text' },
        { name: 'consentVersion', label: 'Consent version', type: 'text' },
        { name: 'consentRequired', label: 'Bắt buộc consent', type: 'checkbox' },
        {
          name: 'retentionMonths',
          label: 'Thời hạn lưu lead (tháng)',
          type: 'number',
          min: 1,
          max: 24,
        },
        { name: 'dataSubjectContact', label: 'Đầu mối dữ liệu', type: 'email' },
        {
          name: 'dataSubjectRightsStatement',
          label: 'Quyền chủ thể dữ liệu đã duyệt',
          type: 'textarea',
          admin: {
            description: 'Do legal owner cung cấp; không tự tạo nội dung quyền.',
          },
        },
        {
          name: 'dataSubjectRightsEvidence',
          label: 'Bằng chứng quyền chủ thể dữ liệu',
          type: 'text',
        },
        {
          name: 'consentEvidenceReference',
          label: 'Bằng chứng consent context',
          type: 'text',
        },
        {
          name: 'approvalState',
          label: 'Trạng thái privacy approval',
          type: 'select',
          defaultValue: 'pending',
          options: ['pending', 'approved', 'rejected'],
        },
        {
          name: 'approvalReference',
          label: 'Bằng chứng privacy approval',
          type: 'text',
        },
        {
          name: 'interBranchTransferAllowed',
          label: 'Cho phép chuyển lead trong cùng tổ chức',
          type: 'checkbox',
        },
        {
          name: 'policyRouteVi',
          label: 'Policy route (VI)',
          type: 'text',
        },
        {
          name: 'policyRouteEn',
          label: 'Policy route (EN)',
          type: 'text',
        },
      ],
    },
    {
      name: 'legalIdentity',
      label: 'Approved legal identity',
      type: 'group',
      admin: {
        description:
          'Dữ liệu pháp nhân đã được chốt cho E09; không thêm chứng nhận, đối tác hoặc review chưa có nguồn.',
      },
      fields: [
        { name: 'legalEntityName', label: 'Tên pháp nhân', type: 'text' },
        { name: 'internationalName', label: 'Tên quốc tế / viết tắt', type: 'text' },
        { name: 'registeredOffice', label: 'Trụ sở đăng ký', type: 'textarea' },
        { name: 'travelOffice', label: 'Văn phòng du lịch', type: 'textarea' },
        { name: 'registrationNumber', label: 'Mã số doanh nghiệp', type: 'text' },
        { name: 'licenceNumber', label: 'Giấy phép lữ hành quốc tế', type: 'text' },
        { name: 'legalRepresentative', label: 'Người đại diện', type: 'text' },
        { name: 'relationshipStatement', label: 'Quan hệ thương hiệu', type: 'textarea' },
      ],
    },
    {
      name: 'consultationChannels',
      label: 'Kênh tư vấn ngoài form',
      type: 'array',
      maxRows: 3,
      validate: validateConsultationChannels,
      admin: {
        description:
          'Kênh chưa cấu hình không chặn release. Chỉ state approved mới được mở URL public.',
      },
      fields: [
        {
          name: 'key',
          label: 'Kênh',
          type: 'select',
          required: true,
          options: ['zalo', 'whatsapp', 'messenger'],
        },
        {
          name: 'state',
          label: 'Trạng thái',
          type: 'select',
          defaultValue: 'unconfigured',
          required: true,
          options: [
            { label: 'Chờ cập nhật', value: 'unconfigured' },
            { label: 'Đang kiểm tra', value: 'pending' },
            { label: 'Đã duyệt', value: 'approved' },
            { label: 'Tắt', value: 'disabled' },
          ],
        },
        { name: 'url', label: 'URL HTTPS', type: 'text' },
        { name: 'owner', label: 'Owner', type: 'text' },
        { name: 'sla', label: 'SLA', type: 'text' },
        { name: 'trackingReference', label: 'Tracking evidence', type: 'text' },
      ],
    },
  ],
}

export const mediaGovernanceField: Field = {
  name: 'governance',
  label: 'Media governance',
  type: 'group',
  admin: {
    description:
      'Metadata xuất bản có kiểm soát. Media cũ không có managedBy tiếp tục hoạt động như hiện tại.',
  },
  fields: [
    {
      name: 'managedBy',
      label: 'Contract quản lý',
      type: 'select',
      options: [{ label: 'WingsGroup v3', value: 'wingsgroup-v3' }],
    },
    {
      name: 'sourceIdentity',
      label: 'Source identity',
      type: 'text',
      unique: true,
      admin: {
        description: 'Khóa attachment-id:source-sha256 để import idempotent, không dùng filename.',
        readOnly: true,
      },
    },
    { name: 'sourceAttachmentId', label: 'Attachment nguồn', type: 'text' },
    { name: 'sourceArchiveSha256', label: 'SHA-256 archive', type: 'text' },
    { name: 'sourceFileSha256', label: 'SHA-256 file', type: 'text' },
    { name: 'sourceFilename', label: 'Tên file nguồn', type: 'text' },
    { name: 'provenanceReference', label: 'Provenance', type: 'text' },
    {
      name: 'rightsState',
      label: 'Quyền sử dụng',
      type: 'select',
      defaultValue: 'pending',
      options: ['pending', 'approved', 'rejected'],
    },
    { name: 'rightsEvidence', label: 'Bằng chứng quyền sử dụng', type: 'text' },
    {
      name: 'usageScope',
      label: 'Phạm vi sử dụng',
      type: 'select',
      options: [{ label: 'Editorial và dịch vụ', value: 'editorial-service' }],
    },
    {
      name: 'publicationState',
      label: 'Trạng thái xuất bản',
      type: 'select',
      defaultValue: 'pending',
      options: ['pending', 'ready', 'published', 'rejected'],
    },
    {
      name: 'derivativeState',
      label: 'Responsive derivatives',
      type: 'select',
      defaultValue: 'pending',
      options: ['pending', 'generated', 'verified'],
    },
    {
      name: 'responsiveDerivatives',
      label: 'Derivative ledger',
      type: 'array',
      fields: [
        { name: 'format', type: 'select', required: true, options: ['webp', 'avif'] },
        { name: 'width', type: 'number', min: 1, required: true },
        { name: 'height', type: 'number', min: 1 },
        { name: 'url', type: 'text', required: true },
        { name: 'sha256', label: 'SHA-256', type: 'text', required: true },
      ],
    },
  ],
}
