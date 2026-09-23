import type { Block } from 'payload'

export const WingsGroupGallery: Block = {
  slug: 'wingsGroupGallery',
  interfaceName: 'WingsGroupGalleryBlock',
  labels: {
    plural: 'Gallery WingsGroup',
    singular: 'Gallery hoạt động & đối tác',
  },
  fields: [
    { name: 'eyebrow', label: 'Nhãn đầu mục', type: 'text' },
    {
      name: 'title',
      label: 'Tiêu đề',
      type: 'text',
      required: true,
      admin: {
        description:
          'Chỉ dùng trên trang Về WingsGroup. Dùng ảnh có quyền sử dụng; không dùng ảnh minh họa làm bằng chứng sự kiện, thành tựu hoặc hợp tác.',
      },
    },
    {
      name: 'description',
      label: 'Mô tả ngắn',
      type: 'textarea',
      admin: { description: 'Giữ trong 1–2 câu; phần này nằm cạnh tiêu đề trên desktop.' },
    },
    {
      name: 'items',
      label: 'Ảnh và đối tác',
      type: 'array',
      minRows: 1,
      maxRows: 12,
      labels: { plural: 'Mục gallery', singular: 'Mục gallery' },
      admin: {
        description:
          'Kéo thả để đổi thứ tự. Dùng kiểu Logo cho nhận diện đối tác; không tải logo chưa được phép sử dụng.',
        initCollapsed: true,
      },
      fields: [
        { name: 'title', label: 'Tên mục', type: 'text', required: true },
        {
          name: 'category',
          label: 'Nhóm nội dung',
          type: 'select',
          defaultValue: 'activity',
          options: [
            { label: 'Hoạt động đoàn', value: 'activity' },
            { label: 'Thành tựu', value: 'achievement' },
            { label: 'Đối tác', value: 'partner' },
            { label: 'Hãng bay', value: 'airline' },
            { label: 'Khách sạn', value: 'hotel' },
          ],
          required: true,
        },
        {
          name: 'media',
          label: 'Ảnh hoặc logo trong thư viện Media',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'mediaType',
          label: 'Cách trình bày',
          type: 'select',
          defaultValue: 'photo',
          options: [
            { label: 'Ảnh hoạt động', value: 'photo' },
            { label: 'Logo / nhận diện', value: 'logo' },
          ],
          required: true,
        },
        {
          name: 'alt',
          label: 'Mô tả ảnh (alt)',
          type: 'text',
          required: true,
          admin: { description: 'Mô tả đúng nội dung ảnh; không ghi thông tin suy đoán.' },
        },
        { name: 'caption', label: 'Chú thích ngắn', type: 'textarea' },
        {
          name: 'illustrative',
          label: 'Ảnh minh họa — hiện nhãn công khai',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'visible',
          label: 'Hiển thị mục này',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
  ],
}
