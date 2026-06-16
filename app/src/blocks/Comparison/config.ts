import type { Block } from 'payload'

import {
  asSelectOptions,
  comparisonPresentationDefinitions,
} from '@/blocks/presentations'
import { link } from '@/fields/link'

export const Comparison: Block = {
  slug: 'comparison',
  interfaceName: 'ComparisonBlock',
  labels: {
    plural: 'Comparisons',
    singular: 'Comparison',
  },
  fields: [
    {
      name: 'presentation',
      label: 'Kiểu hiển thị',
      type: 'select',
      defaultValue: 'matrix',
      options: asSelectOptions(comparisonPresentationDefinitions),
      required: true,
    },
    { name: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { name: 'title', label: 'Tiêu đề', type: 'text', required: true },
    { name: 'description', label: 'Mô tả', type: 'textarea' },
    {
      name: 'options',
      label: 'Phương án',
      type: 'array',
      minRows: 2,
      maxRows: 4,
      fields: [
        { name: 'title', label: 'Tên phương án', type: 'text', required: true },
        { name: 'summary', label: 'Mô tả', type: 'textarea' },
        { name: 'price', label: 'Giá / nhãn', type: 'text' },
        { name: 'featured', label: 'Đề xuất', type: 'checkbox' },
        {
          name: 'features',
          label: 'Tiêu chí',
          type: 'array',
          minRows: 1,
          fields: [
            { name: 'label', label: 'Tiêu chí', type: 'text', required: true },
            { name: 'value', label: 'Giá trị', type: 'text', required: true },
          ],
        },
        link({ appearances: false }),
      ],
    },
  ],
}

