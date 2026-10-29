import type { Block } from 'payload'
import { isSafeHTTPSURL } from '@/utilities/isSafeHTTPSURL'

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export const validateEcosystemProfiles = (value: unknown): true | string => {
  if (!Array.isArray(value) || value.length < 2) return 'Ecosystem cần ít nhất hai profile.'

  const keys = new Set<string>()
  for (const rawProfile of value) {
    const profile = asRecord(rawProfile)
    const key = text(profile.brandKey)
    if (!key || keys.has(key)) return 'Mỗi ecosystem profile phải có brand key duy nhất.'
    keys.add(key)

    if (profile.proofState === 'approved') {
      const references = Array.isArray(profile.proofReferences) ? profile.proofReferences : []
      if (references.length === 0) return 'Proof approved cần ít nhất một proof reference.'
    }

    const cta = asRecord(profile.cta)
    if (cta.state === 'approved-deep-link') {
      if (!isSafeHTTPSURL(cta.url)) return 'Đường dẫn phải là URL HTTPS hợp lệ, không chứa thông tin đăng nhập.'
    }
  }

  return true
}

export const WingsGroupEcosystem: Block = {
  slug: 'wingsGroupEcosystem',
  dbName: 'wg_ecosystem',
  interfaceName: 'WingsGroupEcosystemBlock',
  labels: {
    plural: 'WingsGroup ecosystem',
    singular: 'WingsGroup ecosystem',
  },
  fields: [
    { name: 'eyebrow', label: 'Nhãn đầu mục', type: 'text' },
    { name: 'title', label: 'Tiêu đề', type: 'text', required: true },
    { name: 'description', label: 'Mô tả', type: 'textarea' },
    {
      name: 'profiles',
      dbName: 'wg_eco_profiles',
      label: 'Hồ sơ thương hiệu',
      type: 'array',
      minRows: 2,
      maxRows: 8,
      required: true,
      validate: validateEcosystemProfiles,
      fields: [
        {
          name: 'brandKey',
          dbName: 'wg_eco_brand',
          label: 'Brand key',
          type: 'select',
          required: true,
          options: ['wingsgo', 'wing-side', 'wingsplus', 'wingscare', 'wingspass'],
        },
        { name: 'brandName', label: 'Tên public', type: 'text', required: true },
        { name: 'description', label: 'Mô tả', type: 'textarea', required: true },
        {
          name: 'serviceScope',
          dbName: 'wg_eco_services',
          label: 'Phạm vi dịch vụ',
          type: 'array',
          minRows: 1,
          required: true,
          fields: [{ name: 'label', label: 'Dịch vụ', type: 'text', required: true }],
        },
        {
          name: 'stageMedia',
          label: 'Ảnh sân khấu',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'proofState',
          dbName: 'wg_eco_proof_state',
          label: 'Trạng thái proof',
          type: 'select',
          defaultValue: 'pending',
          required: true,
          options: ['pending', 'approved', 'not-applicable'],
        },
        {
          name: 'proofReferences',
          dbName: 'wg_eco_proof_refs',
          label: 'Proof references',
          type: 'array',
          fields: [{ name: 'key', label: 'Stable proof key', type: 'text', required: true }],
        },
        {
          name: 'cta',
          label: 'CTA',
          type: 'group',
          fields: [
            { name: 'label', label: 'Nhãn CTA', type: 'text', required: true },
            {
              name: 'state',
              dbName: 'wg_eco_cta_state',
              label: 'Đích đến',
              type: 'select',
              defaultValue: 'contact-fallback',
              required: true,
              options: [
                { label: 'Về form liên hệ', value: 'contact-fallback' },
                { label: 'Đến trang web', value: 'approved-deep-link' },
              ],
            },
            { name: 'contactPath', label: 'Đường dẫn form', type: 'text' },
            { name: 'url', label: 'URL HTTPS', type: 'text' },
          ],
        },
      ],
    },
  ],
}
