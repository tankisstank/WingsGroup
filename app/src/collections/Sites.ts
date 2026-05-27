import type { CollectionConfig } from 'payload'

import { adminAccess, superAdminOnly } from '@/access/roles'
import { siteScopedAccess } from '@/access/siteScope'

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
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Internal code, for example wings-travel or wings-care.',
      },
    },
    {
      name: 'primaryDomain',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'additionalDomains',
      type: 'array',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'domain',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'supportedLocales',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['vi', 'en'],
      options: [
        {
          label: 'Vietnamese',
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
      type: 'select',
      required: true,
      defaultValue: 'vi',
      options: [
        {
          label: 'Vietnamese',
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
      type: 'checkbox',
      defaultValue: true,
    },
  ],
  timestamps: true,
}
