import type { CollectionConfig } from 'payload'

import { enforceSiteAccess, siteManagerScopedAccess, siteScopedOrAnyone } from '@/access/siteScope'
import { link } from '@/fields/link'
import { siteField } from '@/fields/site'

export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  access: {
    create: siteManagerScopedAccess(),
    delete: siteManagerScopedAccess(),
    read: siteScopedOrAnyone(),
    update: siteManagerScopedAccess(),
  },
  admin: {
    defaultColumns: ['siteName', 'site', 'updatedAt'],
    useAsTitle: 'siteName',
  },
  fields: [
    siteField(),
    {
      name: 'siteName',
      type: 'text',
      required: true,
    },
    {
      name: 'tagline',
      type: 'text',
    },
    {
      name: 'branding',
      type: 'group',
      fields: [
        {
          name: 'logoText',
          type: 'text',
        },
        {
          name: 'brandColor',
          type: 'text',
          admin: {
            description: 'Hex color for primary brand surfaces, for example #0F766E.',
          },
        },
        {
          name: 'accentColor',
          type: 'text',
          admin: {
            description: 'Hex color for secondary accents, for example #F59E0B.',
          },
        },
        {
          name: 'logoImage',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        {
          name: 'defaultTitle',
          type: 'text',
        },
        {
          name: 'titleSuffix',
          type: 'text',
        },
        {
          name: 'defaultDescription',
          type: 'textarea',
        },
        {
          name: 'defaultImage',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'canonicalDomain',
          type: 'text',
        },
      ],
    },
    {
      name: 'supportEmail',
      type: 'email',
    },
    {
      name: 'supportPhone',
      type: 'text',
    },
    {
      name: 'headerNavItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 8,
      admin: {
        initCollapsed: true,
      },
    },
    {
      name: 'footerNavItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 8,
      admin: {
        initCollapsed: true,
      },
    },
    {
      name: 'footerNote',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeChange: [enforceSiteAccess],
  },
}
