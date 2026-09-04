import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { hideFromEditors, normalizeRelationID } from '@/access/roles'
import { enforceSiteAccess, siteManagerScopedAccess, siteScopedOrAnyone } from '@/access/siteScope'
import { link } from '@/fields/link'
import { siteField } from '@/fields/site'
import {
  backgroundStyleOptions,
  asSelectOptions,
  buttonStyleOptions,
  defaultThemeKey,
  fontPresetOptions,
  layoutStyleOptions,
  radiusOptions,
  spacingScaleOptions,
  themeKeyOptions,
  validateHexColor,
} from '@/utilities/themeTokens'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'
import {
  invalidateSettingsAfterChange,
  invalidateSettingsAfterDelete,
} from '@/collections/hooks/invalidateTenantCache'

const brandingMediaFields = [
  ['branding.logoImage', 'branding', 'logoImage'],
  ['branding.faviconImage', 'branding', 'faviconImage'],
  ['seo.defaultImage', 'seo', 'defaultImage'],
] as const

const validateBrandingMediaOwnership: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const nextData = data as {
    branding?: Record<string, unknown>
    seo?: Record<string, unknown>
    site?: unknown
  }
  const previousData = originalDoc as {
    branding?: Record<string, unknown>
    seo?: Record<string, unknown>
    site?: unknown
  } | null
  const siteID =
    normalizeRelationID(nextData.site as never) || normalizeRelationID(previousData?.site as never)
  const branding = {
    ...(previousData?.branding || {}),
    ...(nextData.branding || {}),
  }
  const seo = {
    ...(previousData?.seo || {}),
    ...(nextData.seo || {}),
  }

  if (!siteID) {
    throw new Error('A site is required before branding media can be saved.')
  }

  for (const [fieldName, groupName, propertyName] of brandingMediaFields) {
    const value = groupName === 'branding' ? branding[propertyName] : seo[propertyName]
    const mediaID = normalizeRelationID(value as never)

    if (!mediaID) continue

    const media = await req.payload.findByID({
      collection: 'media',
      depth: 0,
      id: mediaID,
      overrideAccess: true,
      req,
    })
    const mediaSiteID = normalizeRelationID(media.site)

    if (!mediaSiteID || String(mediaSiteID) !== String(siteID)) {
      throw new Error(
        `Branding field ${fieldName} must reference media owned by the selected site.`,
      )
    }
  }

  return data
}

export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  access: {
    create: siteManagerScopedAccess(),
    delete: siteManagerScopedAccess(),
    read: siteScopedOrAnyone(),
    update: siteManagerScopedAccess(),
  },
  admin: {
    components: {
      beforeList: ['@/components/ContentLocaleControl#ContentLocaleListControl'],
      edit: {
        beforeDocumentControls: ['@/components/ContentLocaleControl#ContentLocaleDocumentControl'],
      },
    },
    defaultColumns: ['siteName', 'site', 'updatedAt'],
    group: adminGroups.siteSettings,
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
      localized: true,
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
          validate: validateHexColor,
          admin: {
            description: 'Mã màu hex cho bề mặt thương hiệu chính, ví dụ #0F766E.',
          },
        },
        {
          name: 'accentColor',
          label: 'Màu nhấn',
          type: 'text',
          validate: validateHexColor,
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
        {
          name: 'faviconImage',
          label: 'Favicon',
          type: 'upload',
          relationTo: 'media',
          required: true,
          admin: {
            description: 'Biểu tượng bắt buộc cho tab trình duyệt và shortcut của từng site.',
          },
        },
        {
          name: 'themeKey',
          label: 'Mã theme',
          type: 'select',
          defaultValue: defaultThemeKey,
          options: asSelectOptions(themeKeyOptions),
          required: true,
          admin: {
            description: 'Mã ổn định dùng cho render frontend. Không phụ thuộc tên hiển thị site.',
          },
        },
        {
          name: 'themePreset',
          label: 'Preset giao diện',
          type: 'relationship',
          relationTo: 'theme-presets',
          admin: {
            description:
              'Preset theme mặc định. Các field bên dưới sẽ override preset nếu được nhập.',
          },
        },
        {
          name: 'surfaceColor',
          label: 'Màu nền phụ',
          type: 'text',
          validate: validateHexColor,
          admin: {
            description: 'Override màu nền phụ. Để trống để dùng preset.',
          },
        },
        {
          name: 'surfaceStrongColor',
          label: 'Màu nền nhấn',
          type: 'text',
          validate: validateHexColor,
          admin: {
            description: 'Override màu nền nhấn. Để trống để dùng preset.',
          },
        },
        {
          name: 'backgroundStyle',
          label: 'Kiểu nền trang',
          type: 'select',
          options: asSelectOptions(backgroundStyleOptions),
          admin: {
            description: 'Để trống để dùng preset.',
          },
        },
        {
          name: 'radius',
          label: 'Bo góc',
          type: 'select',
          options: asSelectOptions(radiusOptions),
          admin: {
            description: 'Để trống để dùng preset.',
          },
        },
        {
          name: 'spacingScale',
          label: 'Mật độ khoảng cách',
          type: 'select',
          options: asSelectOptions(spacingScaleOptions),
          admin: {
            description: 'Để trống để dùng preset.',
          },
        },
        {
          name: 'fontPreset',
          label: 'Font',
          type: 'select',
          options: asSelectOptions(fontPresetOptions),
          admin: {
            description: 'Để trống để dùng preset.',
          },
        },
        {
          name: 'buttonStyle',
          label: 'Kiểu nút',
          type: 'select',
          options: asSelectOptions(buttonStyleOptions),
          admin: {
            description: 'Để trống để dùng preset.',
          },
        },
        {
          name: 'layoutStyle',
          label: 'Layout',
          type: 'select',
          options: asSelectOptions(layoutStyleOptions),
          admin: {
            description: 'Để trống để dùng preset.',
          },
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
          localized: true,
        },
        {
          name: 'titleSuffix',
          label: 'Hậu tố tiêu đề',
          type: 'text',
          localized: true,
        },
        {
          name: 'defaultDescription',
          label: 'Mô tả mặc định',
          type: 'textarea',
          localized: true,
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
      name: 'heroDefaults',
      label: 'Hero mặc định',
      type: 'group',
      admin: {
        description:
          'Presentation và hành vi mặc định cho page chọn kế thừa. Nội dung và media vẫn nằm trên từng page.',
      },
      fields: [
        {
          name: 'presentationPreset',
          label: 'Hero presentation',
          type: 'relationship',
          relationTo: 'hero-presentation-presets',
          filterOptions: {
            isActive: {
              equals: true,
            },
          },
        },
        {
          name: 'variant',
          label: 'Hành vi nghiệp vụ mặc định',
          type: 'select',
          defaultValue: 'standard',
          options: [
            { label: 'Standard', value: 'standard' },
            { label: 'Retail departures', value: 'retail-departures' },
            { label: 'Planner', value: 'planner' },
            { label: 'Utility', value: 'utility' },
          ],
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
      localized: true,
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
      localized: true,
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
      localized: true,
    },
  ],
  hooks: {
    afterChange: [invalidateSettingsAfterChange],
    afterDelete: [invalidateSettingsAfterDelete],
    beforeChange: [enforceSiteAccess, validateBrandingMediaOwnership],
  },
  labels: {
    plural: adminLabel('Cấu hình site', 'Site settings'),
    singular: adminLabel('Cấu hình site', 'Site setting'),
  },
}
