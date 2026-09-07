import type { Field } from 'payload'

const operatorOnly = ({ req }: { req: { user?: unknown } }): boolean => Boolean(req.user)

/**
 * Private, server-owned governance metadata for WingsGroup v3 leads.
 *
 * The public API writes this group only after trusted tenant resolution and
 * consent validation. Collection access denies anonymous direct creates and
 * all updates; these field guards keep the values private in Local/REST reads.
 */
export const wingsGroupLeadGovernanceField: Field = {
  name: 'wingsGroupLead',
  label: 'WingsGroup lead governance',
  type: 'group',
  access: {
    read: operatorOnly,
    update: () => false,
  },
  admin: {
    description:
      'Metadata riêng do server ghi sau khi xác thực tenant và consent; không chỉnh sửa thủ công.',
    position: 'sidebar',
    readOnly: true,
  },
  fields: [
    {
      name: 'locale',
      type: 'select',
      options: ['vi', 'en'],
    },
    {
      name: 'sourcePath',
      type: 'text',
      maxLength: 512,
    },
    {
      name: 'consentVersion',
      type: 'text',
      maxLength: 64,
    },
    {
      name: 'consentedAt',
      type: 'date',
    },
    {
      name: 'retentionUntil',
      type: 'date',
      index: true,
    },
    {
      name: 'preferredChannel',
      type: 'select',
      options: ['zalo', 'whatsapp', 'messenger', 'callback'],
    },
  ],
}
