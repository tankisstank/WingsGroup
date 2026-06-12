import type { Block } from 'payload'

import { link } from '@/fields/link'

export const PricingTable: Block = {
  slug: 'pricingTable',
  interfaceName: 'PricingTableBlock',
  labels: {
    plural: 'Pricing tables',
    singular: 'Pricing table',
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
      name: 'items',
      label: 'Dòng dữ liệu',
      type: 'array',
      minRows: 1,
      fields: [
        {
          name: 'title',
          label: 'Tên chương trình / dòng giá',
          type: 'text',
          required: true,
        },
        {
          name: 'subtitle',
          label: 'Phụ đề',
          type: 'text',
        },
        {
          name: 'departure',
          label: 'Khởi hành',
          type: 'text',
        },
        {
          name: 'airline',
          label: 'Hãng bay / thị trường',
          type: 'text',
        },
        {
          name: 'price',
          label: 'Giá',
          type: 'text',
          required: true,
        },
        {
          name: 'note',
          label: 'Ghi chú',
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
