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
      label: 'Deprecated: tự chuyển slide',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        hidden: true,
        description: 'Giữ để tương thích dữ liệu cũ; public renderer luôn bỏ qua.',
      },
    },
    {
      name: 'intervalMs',
      label: 'Deprecated: chu kỳ tự chuyển (ms)',
      type: 'number',
      defaultValue: 5500,
      min: 3000,
      max: 15000,
      admin: {
        hidden: true,
        description: 'Giữ để tương thích dữ liệu cũ; public renderer luôn bỏ qua.',
      },
    },
    {
      name: 'items',
      label: 'Chứng nhận / giải thưởng',
      type: 'array',
      minRows: 1,
      maxRows: 36,
      required: true,
      admin: {
        description:
          'Mỗi mục là một hồ sơ có ảnh và metadata. Dùng trạng thái “Cần xác minh” khi ảnh chưa đủ thông tin; mục đó sẽ không xuất hiện public.',
      },
      fields: [
        {
          name: 'reviewStatus',
          label: 'Trạng thái xác minh',
          type: 'select',
          defaultValue: 'verified',
          required: true,
          options: [
            { label: 'Đã xác minh từ ảnh gốc', value: 'verified' },
            { label: 'Cần editor xác minh', value: 'needs-review' },
          ],
        },
        {
          name: 'kind',
          label: 'Loại',
          type: 'select',
          defaultValue: 'cert',
          required: true,
          options: [
            { label: 'Chứng nhận', value: 'cert' },
            { label: 'Giải thưởng', value: 'award' },
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
          name: 'issuer',
          label: 'Đơn vị trao / cấp',
          type: 'text',
          required: true,
        },
        {
          name: 'recipient',
          label: 'Đơn vị được trao / cấp',
          type: 'text',
          required: true,
        },
        {
          name: 'recognitionYear',
          label: 'Năm ghi nhận',
          type: 'number',
          min: 1900,
          max: 2100,
        },
        {
          name: 'issuedOn',
          label: 'Ngày cấp / trao',
          type: 'date',
          admin: {
            date: {
              displayFormat: 'dd/MM/yyyy',
              pickerAppearance: 'dayOnly',
            },
          },
        },
        {
          name: 'referenceCode',
          label: 'Mã chứng nhận / đại lý',
          type: 'text',
        },
        {
          name: 'sourceFilename',
          label: 'Tên file ảnh gốc',
          type: 'text',
          admin: {
            description: 'Giữ tên file gốc để có thể truy vết và rà soát lại.',
            readOnly: true,
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
