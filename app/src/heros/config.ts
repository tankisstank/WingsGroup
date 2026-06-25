import type { Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '@/fields/linkGroup'
import { superAdminFieldAccess } from '@/access/roles'
import {
  heroPresentationDefinitions,
  heroPresentationOptions,
} from '@/heros/presentations/registry'

export const hero: Field = {
  name: 'hero',
  type: 'group',
  localized: true,
  fields: [
    {
      name: 'type',
      type: 'select',
      defaultValue: 'lowImpact',
      label: 'Type',
      options: [
        {
          label: 'None',
          value: 'none',
        },
        {
          label: 'High Impact',
          value: 'highImpact',
        },
        {
          label: 'Medium Impact',
          value: 'mediumImpact',
        },
        {
          label: 'Low Impact',
          value: 'lowImpact',
        },
      ],
      required: true,
    },
    {
      name: 'richText',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      label: false,
    },
    {
      name: 'presentation',
      label: 'Legacy presentation fallback',
      type: 'select',
      options: heroPresentationOptions,
      access: {
        read: superAdminFieldAccess,
      },
      admin: {
        condition: (_, { type } = {}) => type === 'highImpact',
        description:
          'Trường tương thích dữ liệu cũ. Flow mới dùng Nguồn presentation + Presentation override.',
      },
      validate: (value: unknown) =>
        !value ||
        heroPresentationDefinitions.some((definition) => definition.value === value) ||
        'Chọn một kiểu hero đã được đăng ký trong hệ thống.',
    },
    {
      name: 'presentationGuide',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/HeroPresentationGuide',
        },
      },
    },
    {
      name: 'presentationMode',
      label: 'Nguồn presentation',
      type: 'select',
      defaultValue: 'inherit',
      options: [
        { label: 'Kế thừa từ site', value: 'inherit' },
        { label: 'Override trên page', value: 'override' },
      ],
      admin: {
        condition: (_, { type } = {}) => type === 'highImpact',
        description:
          'Editor chọn kế thừa site default hoặc override riêng trên page. Dữ liệu cũ vẫn fallback qua legacy presentation nếu cần.',
      },
    },
    {
      name: 'presentationPreset',
      label: 'Presentation override',
      type: 'relationship',
      relationTo: 'hero-presentation-presets',
      filterOptions: {
        isActive: {
          equals: true,
        },
      },
      admin: {
        condition: (_, { presentationMode, type } = {}) =>
          type === 'highImpact' && presentationMode === 'override',
      },
    },
    {
      name: 'behaviorMode',
      label: 'Chuyển động',
      type: 'select',
      defaultValue: 'inherit',
      options: [
        { label: 'Theo preset', value: 'inherit' },
        { label: 'Override trên page', value: 'override' },
      ],
      admin: {
        condition: (_, { type } = {}) => type === 'highImpact',
      },
    },
    {
      name: 'behaviorOverrides',
      label: 'Override chuyển động',
      type: 'group',
      admin: {
        condition: (_, { behaviorMode, type } = {}) =>
          type === 'highImpact' && behaviorMode === 'override',
      },
      fields: [
        { name: 'autoplay', label: 'Tự động chạy', type: 'checkbox' },
        { name: 'intervalMs', label: 'Thời gian giữ slide (ms)', type: 'number', min: 3000, max: 15000 },
        {
          name: 'transition',
          label: 'Kiểu chuyển',
          type: 'select',
          options: ['crossfade', 'slide', 'zoom'],
        },
        { name: 'transitionMs', label: 'Thời gian chuyển (ms)', type: 'number', min: 200, max: 2000 },
        { name: 'loop', label: 'Lặp lại', type: 'checkbox' },
        { name: 'pauseOnHover', label: 'Dừng khi hover', type: 'checkbox' },
        { name: 'showArrows', label: 'Hiện nút trước/sau', type: 'checkbox' },
        { name: 'showDots', label: 'Hiện chỉ báo', type: 'checkbox' },
      ],
    },
    {
      name: 'variant',
      label: 'Hành vi nghiệp vụ',
      type: 'select',
      defaultValue: 'standard',
      options: [
        {
          label: 'Standard',
          value: 'standard',
        },
        {
          label: 'Retail departures',
          value: 'retail-departures',
        },
        {
          label: 'Planner',
          value: 'planner',
        },
        {
          label: 'Utility',
          value: 'utility',
        },
      ],
      admin: {
        condition: (_, { type } = {}) => type === 'highImpact',
        description:
          'Điều khiển nội dung nghiệp vụ như lịch khởi hành hoặc planner, độc lập với kiểu hiển thị.',
      },
    },
    linkGroup({
      overrides: {
        maxRows: 2,
      },
    }),
    {
      name: 'media',
      label: 'Ảnh hero chính',
      type: 'upload',
      admin: {
        condition: (_, { type } = {}) => ['highImpact', 'mediumImpact'].includes(type),
        description:
          'Dùng cho centered, split, planner và layered hero. Với carousel, nhập ảnh trong Slides. Với video, nhập poster trong Video hero.',
      },
      relationTo: 'media',
    },
    {
      name: 'supportingMedia',
      label: 'Visual bổ sung',
      type: 'upload',
      hasMany: true,
      maxRows: 3,
      relationTo: 'media',
      admin: {
        condition: (_, { type } = {}) => type === 'highImpact',
        description:
          'Dùng cho layered visuals hoặc các template cần ảnh phụ. Nếu template không dùng ảnh phụ, có thể để trống.',
      },
    },
    {
      name: 'slides',
      label: 'Slides',
      type: 'array',
      minRows: 2,
      maxRows: 8,
      localized: true,
      admin: {
        condition: (_, { type } = {}) => type === 'highImpact',
        description:
          'Dùng cho Cinematic carousel. Nếu template hiện tại không phải carousel, có thể để trống.',
      },
      fields: [
        { name: 'eyebrow', label: 'Eyebrow', type: 'text' },
        { name: 'title', label: 'Tiêu đề', type: 'text' },
        { name: 'description', label: 'Mô tả', type: 'textarea' },
        { name: 'media', label: 'Ảnh desktop', type: 'upload', relationTo: 'media', required: true },
        { name: 'mobileMedia', label: 'Ảnh mobile', type: 'upload', relationTo: 'media' },
        linkGroup({
          appearances: ['default', 'outline'],
          overrides: {
            maxRows: 1,
          },
        }),
      ],
    },
    {
      name: 'video',
      label: 'Video hero',
      type: 'group',
      admin: {
        condition: (_, { type } = {}) => type === 'highImpact',
        description:
          'Dùng cho Video background. Poster nên luôn có trước khi publish để làm fallback khi reduced-motion hoặc lỗi phát video.',
      },
      fields: [
        { name: 'desktopVideo', label: 'Video desktop', type: 'upload', relationTo: 'media' },
        { name: 'mobileVideo', label: 'Video mobile', type: 'upload', relationTo: 'media' },
        { name: 'poster', label: 'Poster', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
  label: false,
}
