import type { Block } from 'payload'

import { asSelectOptions, statsPresentationDefinitions } from '@/blocks/presentations'

export const Stats: Block = {
  slug: 'stats',
  interfaceName: 'StatsBlock',
  labels: {
    plural: 'Stats',
    singular: 'Stats',
  },
  fields: [
    {
      name: 'presentation',
      label: 'Kiểu hiển thị',
      type: 'select',
      defaultValue: 'inline-bar',
      options: asSelectOptions(statsPresentationDefinitions),
      required: true,
    },
    { name: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { name: 'title', label: 'Tiêu đề', type: 'text' },
    { name: 'description', label: 'Mô tả', type: 'textarea' },
    {
      name: 'items',
      label: 'Chỉ số',
      type: 'array',
      minRows: 1,
      maxRows: 8,
      fields: [
        { name: 'value', label: 'Giá trị', type: 'text', required: true },
        { name: 'label', label: 'Nhãn', type: 'text', required: true },
        { name: 'description', label: 'Mô tả', type: 'textarea' },
        {
          name: 'progress',
          label: 'Tiến độ (%)',
          type: 'number',
          min: 0,
          max: 100,
          admin: {
            description: 'Optional percentage used by the progress presentation.',
          },
        },
        { name: 'logo', label: 'Logo / hình minh họa', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
