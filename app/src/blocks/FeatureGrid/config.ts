import type { Block } from 'payload'

import { link } from '@/fields/link'

export const FeatureGrid: Block = {
  slug: 'featureGrid',
  interfaceName: 'FeatureGridBlock',
  labels: {
    plural: 'Feature grids',
    singular: 'Feature grid',
  },
  fields: [
    {
      name: 'eyebrow',
      label: 'Eyebrow',
      type: 'text',
    },
    {
      name: 'title',
      label: 'Tiêu đề',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'Mô tả',
      type: 'textarea',
    },
    {
      name: 'columns',
      label: 'Số cột desktop',
      type: 'select',
      defaultValue: '3',
      options: [
        {
          label: '2 cột',
          value: '2',
        },
        {
          label: '3 cột',
          value: '3',
        },
        {
          label: '4 cột',
          value: '4',
        },
      ],
    },
    {
      name: 'variant',
      label: 'Biến thể hiển thị',
      type: 'select',
      defaultValue: 'default',
      options: [
        {
          label: 'Mặc định',
          value: 'default',
        },
        {
          label: 'Nhấn mạnh',
          value: 'highlight',
        },
        {
          label: 'Tối giản',
          value: 'minimal',
        },
      ],
    },
    {
      name: 'items',
      label: 'Thẻ nội dung',
      type: 'array',
      minRows: 1,
      fields: [
        {
          name: 'eyebrow',
          label: 'Eyebrow',
          type: 'text',
        },
        {
          name: 'title',
          label: 'Tiêu đề',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          label: 'Mô tả',
          type: 'textarea',
        },
        {
          name: 'image',
          label: 'Ảnh minh họa',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'meta',
          label: 'Meta ngắn',
          type: 'text',
        },
        {
          name: 'enableLink',
          label: 'Bật link',
          type: 'checkbox',
        },
        link({
          appearances: false,
          overrides: {
            admin: {
              condition: (_data, siblingData) => Boolean(siblingData?.enableLink),
            },
          },
        }),
      ],
    },
  ],
}
