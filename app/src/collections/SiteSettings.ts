import type { CollectionConfig, Field } from 'payload'

import { hideFromEditors } from '@/access/roles'
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
import {
  protectWingsGroupSiteSettingsBeforeChange,
  protectWingsGroupSiteSettingsBeforeDelete,
  validateWingsGroupV3Settings,
  wingsGroupV3SettingsField,
} from '@/fields/wingsGroupV3'

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
    { ...siteField(), unique: true } as Field,
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
            description: 'Preset theme mặc định. Các field bên dưới sẽ override preset nếu được nhập.',
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
    wingsGroupV3SettingsField,
  ],
  hooks: {
    afterChange: [invalidateSettingsAfterChange],
    afterDelete: [invalidateSettingsAfterDelete],
    beforeChange: [
      enforceSiteAccess,
      protectWingsGroupSiteSettingsBeforeChange,
      validateWingsGroupV3Settings,
    ],
    beforeDelete: [protectWingsGroupSiteSettingsBeforeDelete],
  },
  labels: {
    plural: adminLabel('Cấu hình site', 'Site settings'),
    singular: adminLabel('Cấu hình site', 'Site setting'),
  },
}
