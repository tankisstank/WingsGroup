import type { Block } from 'payload'

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export const validateProofRecords = (value: unknown): true | string => {
  if (!Array.isArray(value)) return true

  const keys = new Set<string>()
  for (const rawRecord of value) {
    const record = asRecord(rawRecord)
    const key = text(record.key)
    if (!key || keys.has(key)) return 'Mỗi proof record phải có stable key duy nhất.'
    keys.add(key)

    if (record.publicationState !== 'approved') continue
    if (!text(record.sourceIssuer)) return 'Proof approved cần source hoặc issuer.'
    if (!text(record.context) && !text(record.evidenceDate)) {
      return 'Proof approved cần context hoặc date.'
    }
    if (record.permissionState !== 'approved' || !text(record.permissionEvidence)) {
      return 'Proof approved cần quyền công bố và evidence.'
    }
    if (!record.media || !text(record.mediaProvenanceReference)) {
      return 'Proof approved cần media và provenance.'
    }
  }

  return true
}

export const WingsGroupProofArchive: Block = {
  slug: 'wingsGroupProofArchive',
  dbName: 'wg_proof',
  interfaceName: 'WingsGroupProofArchiveBlock',
  labels: {
    plural: 'WingsGroup proof archive',
    singular: 'WingsGroup proof archive',
  },
  fields: [
    { name: 'eyebrow', label: 'Nhãn đầu mục', type: 'text' },
    { name: 'title', label: 'Tiêu đề', type: 'text', required: true },
    { name: 'description', label: 'Mô tả', type: 'textarea' },
    {
      name: 'records',
      dbName: 'wg_proof_records',
      label: 'Proof records',
      type: 'array',
      maxRows: 36,
      validate: validateProofRecords,
      admin: {
        description: 'Public renderer chỉ được hiển thị record có publicationState = approved.',
      },
      fields: [
        { name: 'key', label: 'Stable key', type: 'text', required: true },
        {
          name: 'kind',
          dbName: 'wg_proof_kind',
          label: 'Loại',
          type: 'select',
          required: true,
          options: ['licence', 'certificate', 'award', 'membership', 'standard', 'other'],
        },
        {
          name: 'publicationState',
          dbName: 'wg_proof_pub',
          label: 'Trạng thái công bố',
          type: 'select',
          defaultValue: 'pending',
          required: true,
          options: ['pending', 'approved', 'rejected'],
        },
        { name: 'title', label: 'Tiêu đề', type: 'text', required: true },
        { name: 'summary', label: 'Mô tả', type: 'textarea' },
        { name: 'sourceIssuer', label: 'Nguồn / đơn vị cấp', type: 'text' },
        { name: 'context', label: 'Ngữ cảnh', type: 'textarea' },
        { name: 'evidenceDate', label: 'Ngày bằng chứng', type: 'date' },
        {
          name: 'permissionState',
          dbName: 'wg_proof_perm',
          label: 'Quyền công bố',
          type: 'select',
          defaultValue: 'pending',
          required: true,
          options: ['pending', 'approved', 'denied'],
        },
        { name: 'permissionEvidence', label: 'Evidence quyền công bố', type: 'text' },
        { name: 'media', label: 'Media proof', type: 'upload', relationTo: 'media' },
        { name: 'mediaProvenanceReference', label: 'Media provenance', type: 'text' },
      ],
    },
  ],
}
