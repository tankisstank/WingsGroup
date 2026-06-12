import type { Block } from 'payload'

export const InfoStrip: Block = {
  slug: 'infoStrip',
  interfaceName: 'InfoStripBlock',
  labels: {
    plural: 'Info strips',
    singular: 'Info strip',
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
    },
    {
      name: 'description',
      label: 'Mô tả',
      type: 'textarea',
    },
    {
      name: 'items',
      label: 'Điểm nhấn',
      type: 'array',
      minRows: 1,
      fields: [
        {
          name: 'value',
          label: 'Giá trị lớn',
          type: 'text',
        },
        {
          name: 'label',
          label: 'Nhãn',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          label: 'Mô tả',
          type: 'textarea',
        },
      ],
    },
  ],
}
