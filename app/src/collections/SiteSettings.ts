import type { CollectionConfig } from 'payload'

import { hideFromEditors } from '@/access/roles'
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
    group: 'Cấu hình site',
    hidden: hideFromEditors,
    useAsTitle: 'siteName',
  },
  fields: [
    siteField(),
    {
      name: 'siteName',
      label: 'Tên site',
      type: 'text',
      required: true,
    },
    {
      name: 'tagline',
      label: 'Tagline',
      type: 'text',
    },
    {
      name: 'branding',
      label: 'Thương hiệu',
      type: 'group',
      fields: [
        {
          name: 'logoText',
          label: 'Tên logo',
          type: 'text',
        },
        {
          name: 'brandColor',
          label: 'Màu chính',
          type: 'text',
          admin: {
            description: 'Mã màu hex cho bề mặt thương hiệu chính, ví dụ #0F766E.',
          },
        },
        {
          name: 'accentColor',
          label: 'Màu nhấn',
          type: 'text',
          admin: {
            description: 'Mã màu hex cho điểm nhấn phụ, ví dụ #F59E0B.',
          },
        },
        {
          name: 'logoImage',
          label: 'Ảnh logo',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'seo',
      label: 'SEO mặc định',
      type: 'group',
      fields: [
        {
          name: 'defaultTitle',
          label: 'Tiêu đề mặc định',
          type: 'text',
        },
        {
          name: 'titleSuffix',
          label: 'Hậu tố tiêu đề',
          type: 'text',
        },
        {
          name: 'defaultDescription',
          label: 'Mô tả mặc định',
          type: 'textarea',
        },
        {
          name: 'defaultImage',
          label: 'Ảnh mặc định',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'canonicalDomain',
          label: 'Domain canonical',
          type: 'text',
        },
      ],
    },
    {
      name: 'supportEmail',
      label: 'Email hỗ trợ',
      type: 'email',
    },
    {
      name: 'supportPhone',
      label: 'Số điện thoại hỗ trợ',
      type: 'text',
    },
    {
      name: 'headerNavItems',
      label: 'Menu header',
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
      label: 'Menu footer',
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
      label: 'Ghi chú footer',
      type: 'textarea',
    },
  ],
  hooks: {
    beforeChange: [enforceSiteAccess],
  },
  labels: {
    plural: 'Cấu hình site',
    singular: 'Cấu hình site',
  },
}
