import type { CollectionConfig } from 'payload'

import { adminAccess, hideFromNonSuperAdmins, superAdminOnly } from '@/access/roles'
import { siteScopedAccess } from '@/access/siteScope'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'

export const Sites: CollectionConfig = {
  slug: 'sites',
  access: {
    admin: adminAccess,
    create: superAdminOnly,
    delete: superAdminOnly,
    read: siteScopedAccess('id'),
    update: superAdminOnly,
  },
  admin: {
    defaultColumns: ['name', 'code', 'primaryDomain', 'updatedAt'],
    group: adminGroups.advanced,
    hidden: hideFromNonSuperAdmins,
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      label: 'Tên site',
      type: 'text',
      required: true,
    },
    {
      name: 'code',
      label: 'Mã site',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Mã nội bộ, ví dụ wings-travel hoặc wings-care.',
      },
    },
    {
      name: 'primaryDomain',
      label: 'Domain chính',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'additionalDomains',
      label: 'Domain bổ sung',
      type: 'array',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'domain',
          label: 'Domain',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'supportedLocales',
      label: 'Ngôn ngữ hỗ trợ',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['vi', 'en'],
      options: [
        {
          label: 'Tiếng Việt',
          value: 'vi',
        },
        {
          label: 'English',
          value: 'en',
        },
      ],
    },
    {
      name: 'defaultLocale',
      label: 'Ngôn ngữ mặc định',
      type: 'select',
      required: true,
      defaultValue: 'vi',
      options: [
        {
          label: 'Tiếng Việt',
          value: 'vi',
        },
        {
          label: 'English',
          value: 'en',
        },
      ],
    },
    {
      name: 'isActive',
      label: 'Đang hoạt động',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  timestamps: true,
  labels: {
    plural: adminLabel('Site', 'Sites'),
    singular: adminLabel('Site', 'Site'),
  },
}
