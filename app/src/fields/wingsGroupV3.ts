import type { CollectionBeforeChangeHook, Field } from 'payload'

const HTTPS_URL = /^https:\/\//i
const SHA256 = /^[a-f0-9]{64}$/

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const hasHTTPSURL = (value: unknown): boolean => HTTPS_URL.test(asString(value))

const hasSha256 = (value: unknown): boolean => SHA256.test(asString(value))

export const validateConsultationChannels = (value: unknown): true | string => {
  if (!Array.isArray(value)) return true

  const keys = new Set<string>()
  for (const rawChannel of value) {
    const channel = asRecord(rawChannel)
    const key = asString(channel.key)
    if (!key || keys.has(key)) return 'Mỗi kênh tư vấn phải có một key duy nhất.'
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
  const formats = new Set(derivatives.map((item) => item.format))
  if (!formats.has('webp') || !formats.has('avif')) {
    return 'Media publish cần cả WebP và AVIF.'
  }
  if (
    derivatives.some(
      (item) =>
        !Number.isFinite(item.width) ||
        Number(item.width) <= 0 ||
        !hasHTTPSURL(item.url) ||
        !hasSha256(item.sha256),
    )
  ) {
    return 'Mỗi derivative cần width, URL HTTPS và SHA-256 hợp lệ.'
  }

  return true
}

export const validateWingsGroupV3Settings: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const settings = asRecord(data?.wingsGroupV3 ?? originalDoc?.wingsGroupV3)
  if (!settings.enabled) return data

  const privacy = asRecord(settings.privacy)
  if (!asString(privacy.policyVersion)) throw new Error('WingsGroup v3 cần policy version.')
  if (!asString(privacy.consentVersion)) throw new Error('WingsGroup v3 cần consent version.')
  if (privacy.consentRequired !== true) throw new Error('WingsGroup v3 bắt buộc consent.')
  if (privacy.retentionMonths !== 24) throw new Error('WingsGroup v3 giữ lead tối đa 24 tháng.')
  if (!asString(privacy.dataSubjectContact)) {
    throw new Error('WingsGroup v3 cần đầu mối dữ liệu cá nhân.')
  }

  const channelsResult = validateConsultationChannels(settings.consultationChannels)
  if (channelsResult !== true) throw new Error(channelsResult)

  return data
}

export const validateGovernedMediaBeforeChange: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
}) => {
  const governance = data?.governance ?? originalDoc?.governance
  const result = validateMediaGovernance(governance)
  if (result !== true) throw new Error(result)

  const parsed = asRecord(governance)
  if (parsed.managedBy === 'wingsgroup-v3' && parsed.publicationState === 'published') {
    const site = data?.site ?? originalDoc?.site
    const alt = data?.alt ?? originalDoc?.alt
    if (!site) throw new Error('WingsGroup v3 media publish cần site scope.')
    if (!asString(alt))
      throw new Error('WingsGroup v3 media publish cần alt text cho locale hiện tại.')
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
