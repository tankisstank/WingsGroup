import type { CollectionBeforeDeleteHook, CollectionConfig, Field } from 'payload'

import { hideFromNonSuperAdmins, superAdminOnly } from '@/access/roles'
import {
  defaultHeroBehavior,
  heroPresentationOptions,
  validateHeroPreset,
} from '@/heros/presentations/registry'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'

const behaviorFields: Field[] = [
  {
    name: 'autoplay',
    label: 'Tự động chạy',
    type: 'checkbox',
    defaultValue: defaultHeroBehavior.autoplay,
  },
  {
    name: 'intervalMs',
    label: 'Thời gian giữ mỗi slide (ms)',
    type: 'number',
    defaultValue: defaultHeroBehavior.intervalMs,
    min: 3000,
    max: 15000,
  },
  {
    name: 'transition',
    label: 'Kiểu chuyển cảnh',
    type: 'select',
    defaultValue: defaultHeroBehavior.transition,
    options: [
      { label: 'Crossfade', value: 'crossfade' },
      { label: 'Slide', value: 'slide' },
      { label: 'Zoom', value: 'zoom' },
    ],
  },
  {
    name: 'transitionMs',
    label: 'Thời gian chuyển cảnh (ms)',
    type: 'number',
    defaultValue: defaultHeroBehavior.transitionMs,
    min: 200,
    max: 2000,
  },
  {
    name: 'loop',
    label: 'Lặp lại',
    type: 'checkbox',
    defaultValue: defaultHeroBehavior.loop,
  },
  {
    name: 'pauseOnHover',
    label: 'Dừng khi rê chuột',
    type: 'checkbox',
    defaultValue: defaultHeroBehavior.pauseOnHover,
  },
  {
    name: 'showArrows',
    label: 'Hiện nút trước/sau',
    type: 'checkbox',
    defaultValue: defaultHeroBehavior.showArrows,
  },
  {
    name: 'showDots',
    label: 'Hiện chỉ báo slide',
    type: 'checkbox',
    defaultValue: defaultHeroBehavior.showDots,
  },
]

const preventPresetDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const [siteUsage, pageUsage] = await Promise.all([
    req.payload.find({
      collection: 'site-settings',
      depth: 0,
      limit: 1,
      req,
      where: { 'heroDefaults.presentationPreset': { equals: id } },
    }),
    req.payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      req,
      where: { 'hero.presentationPreset': { equals: id } },
    }),
  ])

  if (siteUsage.totalDocs > 0 || pageUsage.totalDocs > 0) {
    throw new Error('Preset đang được sử dụng. Hãy deactivate thay vì xóa.')
  }
}

export const HeroPresentationPresets: CollectionConfig = {
  slug: 'hero-presentation-presets',
  access: {
    create: superAdminOnly,
    delete: superAdminOnly,
    read: () => true,
    update: superAdminOnly,
  },
  admin: {
    defaultColumns: ['name', 'key', 'baseTemplate', 'isActive', 'updatedAt'],
    group: adminGroups.siteSettings,
    hidden: hideFromNonSuperAdmins,
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      label: 'Tên presentation',
      type: 'text',
      required: true,
    },
    {
      name: 'key',
      label: 'Mã hệ thống',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'description',
      label: 'Mô tả sử dụng',
      type: 'textarea',
    },
    {
      name: 'isActive',
      label: 'Cho phép lựa chọn mới',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'baseTemplate',
      label: 'Base template',
      type: 'select',
      options: heroPresentationOptions,
      required: true,
    },
    {
      name: 'slots',
      label: 'Các vùng hiển thị',
      type: 'group',
      fields: [
        { name: 'showBadge', label: 'Hiện badge', type: 'checkbox', defaultValue: true },
        {
          name: 'showPostcards',
          label: 'Hiện nhãn visual',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'showBusinessPanel',
          label: 'Hiện panel nghiệp vụ',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
    {
      name: 'visual',
      label: 'Bố cục visual',
      type: 'group',
      fields: [
        {
          name: 'contentPosition',
          label: 'Vị trí nội dung',
          type: 'select',
          defaultValue: 'left',
          options: ['left', 'center', 'right'],
        },
        {
          name: 'contentAlign',
          label: 'Căn nội dung',
          type: 'select',
          defaultValue: 'left',
          options: ['left', 'center', 'right'],
        },
        {
          name: 'mediaFit',
          label: 'Cách fit media',
          type: 'select',
          defaultValue: 'cover',
          options: ['cover', 'contain'],
        },
        {
          name: 'overlayStrength',
          label: 'Lớp phủ',
          type: 'select',
          defaultValue: 'soft',
          options: ['none', 'soft', 'strong'],
        },
      ],
    },
    {
      name: 'behavior',
      label: 'Chuyển động và điều khiển',
      type: 'group',
      fields: behaviorFields,
    },
  ],
  hooks: {
    beforeDelete: [preventPresetDelete],
    beforeValidate: [
      ({ data }) => {
        const result = validateHeroPreset(data || {})
        if (result !== true) throw new Error(result)
        return data
      },
    ],
  },
  labels: {
    plural: adminLabel('Hero presentations', 'Hero presentations'),
    singular: adminLabel('Hero presentation', 'Hero presentation'),
  },
}
