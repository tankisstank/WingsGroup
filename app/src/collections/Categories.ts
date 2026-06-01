import type { CollectionConfig } from 'payload'

import { enforceSiteAccess, siteScopedOrAnyone } from '@/access/siteScope'
import { contentCreateAccess, contentDeleteAccess, hideFromEditors } from '@/access/roles'
import { siteScopedAccess } from '@/access/siteScope'
import { siteField } from '@/fields/site'
import { slugField } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: contentCreateAccess,
    delete: contentDeleteAccess,
    read: siteScopedOrAnyone(),
    update: siteScopedAccess(),
  },
  admin: {
    defaultColumns: ['title', 'site', 'updatedAt'],
    group: 'Nội dung',
    hidden: hideFromEditors,
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      label: 'Tên danh mục',
      type: 'text',
      localized: true,
      required: true,
    },
    siteField(),
    slugField({
      overrides: (field) => {
        field.fields = field.fields.map((item) => {
          if ('name' in item && item.name === 'slug') {
            return {
              ...item,
              label: 'Đường dẫn',
            } as typeof item
          }

          if ('name' in item && item.name === 'generateSlug') {
            return {
              ...item,
              label: 'Tự tạo đường dẫn từ tên danh mục',
            } as typeof item
          }

          return item
        }) as typeof field.fields

        return field
      },
      position: undefined,
    }),
  ],
  labels: {
    plural: 'Danh mục',
    singular: 'Danh mục',
  },
  hooks: {
    beforeChange: [enforceSiteAccess],
  },
}
