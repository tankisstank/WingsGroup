import type { CollectionConfig } from 'payload'

import {
  adminAccess,
  superAdminFieldAccess,
  superAdminOnly,
  usersReadAccess,
  usersUpdateAccess,
} from '@/access/roles'
import { currentUserSiteFilter } from '@/fields/site'
import type { AppRole } from '@/types/auth'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: adminAccess,
    create: superAdminOnly,
    delete: superAdminOnly,
    read: usersReadAccess,
    update: usersUpdateAccess,
  },
  admin: {
    defaultColumns: ['name', 'email', 'role'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        {
          label: 'Super Admin',
          value: 'super-admin',
        },
        {
          label: 'Site Manager',
          value: 'site-manager',
        },
        {
          label: 'Editor',
          value: 'editor',
        },
      ],
      access: {
        create: superAdminFieldAccess,
        update: superAdminFieldAccess,
      },
    },
    {
      name: 'sites',
      label: 'Assigned Sites',
      type: 'relationship',
      relationTo: 'sites',
      hasMany: true,
      required: false,
      filterOptions: currentUserSiteFilter,
      admin: {
        position: 'sidebar',
        condition: (_, siblingData) => siblingData?.role !== 'super-admin',
        description: 'Users with site roles can only access the sites assigned here.',
      },
      validate: (value: unknown, { siblingData }: { siblingData: { role?: AppRole } }) => {
        if (siblingData?.role === 'super-admin') {
          return true
        }

        if (Array.isArray(value) && value.length > 0) {
          return true
        }

        return 'Please assign at least one site to this user.'
      },
      access: {
        create: superAdminFieldAccess,
        update: superAdminFieldAccess,
      },
    },
  ],
  timestamps: true,
}
