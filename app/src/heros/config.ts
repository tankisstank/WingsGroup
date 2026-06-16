import type { Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '@/fields/linkGroup'
import {
  defaultHeroPresentation,
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
      label: 'Kiểu hiển thị hero',
      type: 'select',
      defaultValue: defaultHeroPresentation,
      options: heroPresentationOptions,
      required: true,
      admin: {
        condition: (_, { type } = {}) => type === 'highImpact',
        description:
          'Chỉ thay đổi bố cục hiển thị. Màu sắc, font và button tiếp tục lấy từ theme của site.',
      },
      validate: (value: unknown) =>
        !value ||
        heroPresentationDefinitions.some((definition) => definition.value === value) ||
        'Chọn một kiểu hero đã được đăng ký trong hệ thống.',
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
      type: 'upload',
      admin: {
        condition: (_, { type } = {}) => ['highImpact', 'mediumImpact'].includes(type),
        description: 'Optional for preset-generated drafts; add media before publishing visual pages.',
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
        condition: (_, { presentation, type } = {}) =>
          type === 'highImpact' && presentation === 'layered-visuals',
        description:
          'Tối đa 3 ảnh bổ sung cho style layered. Nếu để trống, hệ thống lặp visual chính để giữ layout ổn định.',
      },
    },
  ],
  label: false,
}
