import type { CollectionConfig } from 'payload'

import {
  adminAccess,
  hideFromNonSuperAdmins,
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
    group: 'Nâng cao',
    hidden: hideFromNonSuperAdmins,
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      label: 'Tên người dùng',
      type: 'text',
    },
    {
      name: 'role',
      label: 'Vai trò',
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
      label: 'Site được phân quyền',
      type: 'relationship',
      relationTo: 'sites',
      hasMany: true,
      required: false,
      filterOptions: currentUserSiteFilter,
      admin: {
        position: 'sidebar',
        condition: (_, siblingData) => siblingData?.role !== 'super-admin',
        description: 'Người dùng theo site chỉ truy cập được các site được gán tại đây.',
      },
      validate: (value: unknown, { siblingData }: { siblingData: { role?: AppRole } }) => {
        if (siblingData?.role === 'super-admin') {
          return true
        }

        if (Array.isArray(value) && value.length > 0) {
          return true
        }

        return 'Vui lòng gán ít nhất một site cho người dùng này.'
      },
      access: {
        create: superAdminFieldAccess,
        update: superAdminFieldAccess,
      },
    },
  ],
  timestamps: true,
  labels: {
    plural: 'Người dùng',
    singular: 'Người dùng',
  },
}
