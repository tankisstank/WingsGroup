import type { CollectionConfig } from 'payload'

import { enforceSiteAccess, siteScopedOrAnyone } from '@/access/siteScope'
import { contentCreateAccess, contentDeleteAccess } from '@/access/roles'
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
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    siteField(),
    slugField({
      position: undefined,
    }),
  ],
  hooks: {
    beforeChange: [enforceSiteAccess],
  },
}
