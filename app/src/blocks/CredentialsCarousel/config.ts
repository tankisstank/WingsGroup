import type { Block } from 'payload'

export const CredentialsCarousel: Block = {
  slug: 'credentialsCarousel',
  interfaceName: 'CredentialsCarouselBlock',
  labels: {
    plural: 'Chứng nhận & giải thưởng',
    singular: 'Chứng nhận & giải thưởng',
  },
  fields: [
    {
      name: 'fullBleed',
      label: 'Nền tràn toàn chiều rộng',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'eyebrow',
      label: 'Nhãn đầu mục',
      type: 'text',
      required: true,
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
      name: 'ariaLabel',
      label: 'Nhãn hỗ trợ truy cập',
      type: 'text',
      admin: {
        description: 'Mặc định dùng tiêu đề nếu để trống.',
      },
    },
    {
      name: 'autoplay',
      label: 'Tự chuyển slide',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'intervalMs',
      label: 'Chu kỳ tự chuyển (ms)',
      type: 'number',
      defaultValue: 5500,
      min: 3000,
      max: 15000,
      admin: {
        condition: (_, siblingData) => siblingData?.autoplay !== false,
      },
    },
    {
      name: 'items',
      label: 'Chứng nhận / giải thưởng',
      type: 'array',
      minRows: 1,
      maxRows: 12,
      required: true,
      fields: [
        {
          name: 'kind',
          label: 'Loại',
          type: 'select',
          defaultValue: 'cert',
          required: true,
          options: [
            { label: 'Chứng nhận', value: 'cert' },
            { label: 'Giải thưởng', value: 'award' },
            { label: 'Thành viên hiệp hội', value: 'member' },
            { label: 'Tiêu chuẩn / ISO', value: 'iso' },
          ],
        },
        {
          name: 'image',
          label: 'Ảnh / logo',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Dùng ảnh hoặc logo đã quản lý trong Media Library.',
          },
        },
        {
          name: 'mark',
          label: 'Chữ đại diện khi chưa có ảnh',
          type: 'text',
          required: true,
        },
        {
          name: 'label',
          label: 'Nhãn nội dung',
          type: 'text',
          required: true,
        },
        {
          name: 'title',
          label: 'Tiêu đề',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          label: 'Nội dung',
          type: 'textarea',
          required: true,
        },
      ],
    },
  ],
}
