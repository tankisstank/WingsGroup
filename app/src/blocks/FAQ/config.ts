import type { Block } from 'payload'

import { asSelectOptions, faqPresentationDefinitions } from '@/blocks/presentations'

export const FAQ: Block = {
  slug: 'faq',
  interfaceName: 'FAQBlock',
  labels: {
    plural: 'FAQs',
    singular: 'FAQ',
  },
  fields: [
    {
      name: 'presentation',
      label: 'Kiểu hiển thị',
      type: 'select',
      defaultValue: 'single-column',
      options: asSelectOptions(faqPresentationDefinitions),
    },
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
          name: 'category',
          label: 'Nhóm câu hỏi',
          type: 'text',
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
