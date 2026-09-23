import type { CollectionConfig } from 'payload'

import { adminAccess, hideFromNonSuperAdmins, superAdminOnly } from '@/access/roles'
import { siteScopedAccess } from '@/access/siteScope'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'
import { localeSelectOptions } from '@/utilities/locales'
import {
  invalidateSitesAfterChange,
  invalidateSitesAfterDelete,
} from '@/collections/hooks/invalidateTenantCache'

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
        description: 'Mã nội bộ, ví dụ wings-group hoặc wings-care.',
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
      labels: {
        plural: 'Domain bổ sung',
        singular: 'Domain bổ sung',
      },
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
      options: localeSelectOptions,
    },
    {
      name: 'defaultLocale',
      label: 'Ngôn ngữ mặc định',
      type: 'select',
      required: true,
      defaultValue: 'vi',
      options: localeSelectOptions,
    },
    {
      name: 'isActive',
      label: 'Đang hoạt động',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  hooks: {
    afterChange: [invalidateSitesAfterChange],
    afterDelete: [invalidateSitesAfterDelete],
  },
  timestamps: true,
  labels: {
    plural: adminLabel('Site', 'Sites'),
    singular: adminLabel('Site', 'Site'),
  },
}
