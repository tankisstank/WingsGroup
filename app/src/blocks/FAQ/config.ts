import type { Block } from 'payload'

export const FAQ: Block = {
  slug: 'faq',
  interfaceName: 'FAQBlock',
  labels: {
    plural: 'FAQs',
    singular: 'FAQ',
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
      label: 'Câu hỏi',
      type: 'array',
      minRows: 1,
      fields: [
        {
          name: 'question',
          label: 'Câu hỏi',
          type: 'text',
          required: true,
        },
        {
          name: 'answer',
          label: 'Câu trả lời',
          type: 'textarea',
          required: true,
        },
      ],
    },
  ],
}
