import type { CollectionConfig, Field } from 'payload'

import { contentPublishAccess, hideFromEditors } from '@/access/roles'
import {
  backgroundStyleOptions,
  asSelectOptions,
  buttonStyleOptions,
  fontPresetOptions,
  layoutStyleOptions,
  radiusOptions,
  spacingScaleOptions,
  validateHexColor,
} from '@/utilities/themeTokens'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'

const colorField = (name: string, label: string, defaultValue: string): Field => ({
  name,
  label,
  type: 'text',
  defaultValue,
  required: true,
  validate: validateHexColor,
  admin: {
    description: 'Có thể bấm ô màu để chọn trực quan hoặc nhập mã hex.',
    components: {
      Field: '@/components/ThemePresetEditor/ColorField',
    },
  },
})

export const ThemePresets: CollectionConfig = {
  slug: 'theme-presets',
  access: {
    create: ({ req }) => req.user?.role === 'super-admin',
    delete: ({ req }) => req.user?.role === 'super-admin',
    read: contentPublishAccess,
    update: ({ req }) => req.user?.role === 'super-admin',
  },
  admin: {
    defaultColumns: ['name', 'key', 'isActive', 'updatedAt'],
    group: adminGroups.siteSettings,
    hidden: hideFromEditors,
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      label: 'Tên giao diện',
      type: 'text',
      required: true,
      admin: {
        description: 'Tên dễ hiểu cho người quản trị, ví dụ Premium, Retail hoặc Care.',
      },
    },
    {
      name: 'key',
      label: 'Mã hệ thống',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Mã ổn định cho hệ thống, ví dụ retail hoặc premium. Chỉ nên đổi khi có yêu cầu kỹ thuật.',
      },
    },
    {
      name: 'description',
      label: 'Mô tả',
      type: 'textarea',
    },
    {
      name: 'isActive',
      label: 'Đang sử dụng',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'tokens',
      label: 'Thiết kế giao diện',
      type: 'group',
      admin: {
        description: 'Chỉnh các lựa chọn bên dưới và xem preview để hiểu thay đổi trên site thật.',
      },
      fields: [
        {
          name: 'preview',
          type: 'ui',
          admin: {
            components: {
              Field: '@/components/ThemePresetEditor/PreviewField',
            },
          },
        },
        colorField('brandColor', 'Màu chính', '#0F172A'),
        colorField('accentColor', 'Màu nhấn', '#F59E0B'),
        colorField('surfaceColor', 'Màu nền nhẹ', '#F8FAFC'),
        colorField('surfaceStrongColor', 'Màu nền nổi bật', '#E2E8F0'),
        {
          name: 'backgroundStyle',
          label: 'Kiểu nền trang',
          type: 'select',
          defaultValue: 'soft-gradient',
          options: asSelectOptions(backgroundStyleOptions),
          required: true,
          admin: {
            description: 'Quyết định cảm giác nền tổng thể: đơn giản, gradient mềm, editorial hoặc utility.',
          },
        },
        {
          name: 'radius',
          label: 'Bo góc',
          type: 'select',
          defaultValue: 'lg',
          options: asSelectOptions(radiusOptions),
          required: true,
          admin: {
            description: 'Ảnh hưởng nút, card, form và các khối nội dung.',
          },
        },
        {
          name: 'spacingScale',
          label: 'Khoảng cách',
          type: 'select',
          defaultValue: 'standard',
          options: asSelectOptions(spacingScaleOptions),
          required: true,
          admin: {
            description: 'Compact hiển thị dày hơn, Airy thoáng hơn.',
          },
        },
        {
          name: 'fontPreset',
          label: 'Kiểu chữ',
          type: 'select',
          defaultValue: 'system',
          options: asSelectOptions(fontPresetOptions),
          required: true,
          admin: {
            description: 'Chọn cảm giác chữ tổng thể cho heading và nội dung.',
          },
        },
        {
          name: 'buttonStyle',
          label: 'Kiểu nút',
          type: 'select',
          defaultValue: 'solid',
          options: asSelectOptions(buttonStyleOptions),
          required: true,
          admin: {
            description: 'Ảnh hưởng CTA chính trên hero, card và form.',
          },
        },
        {
          name: 'layoutStyle',
          label: 'Layout',
          type: 'select',
          defaultValue: 'corporate',
          options: asSelectOptions(layoutStyleOptions),
          required: true,
          admin: {
            description: 'Chọn phong cách bố cục phù hợp site: corporate, retail, editorial hoặc utility.',
          },
        },
      ],
    },
  ],
  labels: {
    plural: adminLabel('Preset giao diện', 'Theme presets'),
    singular: adminLabel('Preset giao diện', 'Theme preset'),
  },
}
