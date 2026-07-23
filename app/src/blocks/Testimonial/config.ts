import type { Block } from 'payload'

import { asSelectOptions, testimonialPresentationDefinitions } from '@/blocks/presentations'

export const Testimonial: Block = {
  slug: 'testimonial',
  interfaceName: 'TestimonialBlock',
  labels: {
    plural: 'Testimonials',
    singular: 'Testimonial',
  },
  fields: [
    {
      name: 'presentation',
      label: 'Kiểu hiển thị',
      type: 'select',
      defaultValue: 'quote-grid',
      options: asSelectOptions(testimonialPresentationDefinitions),
      required: true,
    },
    { name: 'eyebrow', label: 'Eyebrow', type: 'text' },
    { name: 'title', label: 'Tiêu đề', type: 'text', required: true },
    { name: 'description', label: 'Mô tả', type: 'textarea' },
    {
      name: 'items',
      label: 'Nhận xét',
      type: 'array',
      minRows: 1,
      maxRows: 12,
      fields: [
        { name: 'quote', label: 'Nội dung', type: 'textarea', required: true },
        { name: 'name', label: 'Tên khách hàng', type: 'text', required: true },
        { name: 'role', label: 'Vai trò / hành trình', type: 'text' },
        { name: 'country', label: 'Quốc gia', type: 'text' },
        {
          name: 'noteDate',
          label: 'Ngày ghi chú',
          type: 'date',
          admin: {
            date: {
              displayFormat: 'dd/MM/yyyy',
              pickerAppearance: 'dayOnly',
            },
          },
        },
        { name: 'avatar', label: 'Ảnh đại diện', type: 'upload', relationTo: 'media' },
        { name: 'logo', label: 'Logo', type: 'upload', relationTo: 'media' },
        { name: 'videoURL', label: 'Video URL', type: 'text' },
        {
          name: 'rating',
          label: 'Đánh giá',
          type: 'number',
          min: 1,
          max: 5,
        },
      ],
    },
  ],
}
