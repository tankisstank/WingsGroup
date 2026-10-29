import type { CollectionConfig } from 'payload'

import { contentCreateAccess, contentDeleteAccess } from '@/access/roles'
import { enforceSiteAccess, siteScopedAccess, siteScopedOrAnyone } from '@/access/siteScope'
import { sameSiteFilterOptions, siteField } from '@/fields/site'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'

import {
  revalidateTourVariant,
  revalidateTourVariantDelete,
} from './Tours/hooks/revalidateTourContent'

export const DepartureVariants: CollectionConfig = {
  slug: 'departure-variants',
  access: {
    create: contentCreateAccess,
    delete: contentDeleteAccess,
    read: siteScopedOrAnyone(),
    update: siteScopedAccess(),
  },
  admin: {
    components: {
      beforeList: ['@/components/ContentLocaleControl#ContentLocaleListControl'],
      edit: {
        beforeDocumentControls: [
          '@/components/ContentLocaleControl#ContentLocaleCompactDocumentControl',
        ],
      },
    },
    description:
      'Biến thể tour có kiểm soát để dùng lại một tour gốc cho nhiều điểm đi, hãng bay, hoặc nhịp hành trình khác nhau mà không nhân bản toàn bộ trang tour.',
    defaultColumns: ['label', 'tourProduct', 'departureCity', 'airline', 'status'],
    group: adminGroups.content,
    useAsTitle: 'label',
  },
  defaultPopulate: {
    label: true,
    departureCity: true,
    airline: true,
    status: true,
    tourProduct: true,
  },
  fields: [
    siteField(),
    {
      name: 'tourProduct',
      label: 'Tour gốc',
      relationTo: 'tour-products' as any,
      required: true,
      type: 'relationship',
      filterOptions: sameSiteFilterOptions,
    },
    {
      name: 'variantKey',
      label: 'Mã biến thể',
      required: true,
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'label',
      label: 'Nhãn biến thể',
      localized: true,
      required: true,
      type: 'text',
    },
    {
      name: 'status',
      label: 'Trạng thái',
      required: true,
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Đang dùng', value: 'active' },
        { label: 'Ẩn tạm thời', value: 'inactive' },
        { label: 'Lưu trữ', value: 'archived' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Variant Identity',
          fields: [
            {
              name: 'departureCity',
              label: 'Điểm đi',
              localized: true,
              type: 'text',
            },
            {
              name: 'airline',
              label: 'Hãng bay ưu tiên',
              localized: true,
              type: 'text',
            },
            {
              name: 'displayPriority',
              label: 'Ưu tiên hiển thị',
              type: 'number',
              defaultValue: 0,
            },
          ],
        },
        {
          label: 'Content Overrides',
          fields: [
            {
              name: 'summaryOverride',
              label: 'Tóm tắt override',
              localized: true,
              type: 'textarea',
            },
            {
              name: 'heroMediaOverride',
              label: 'Hero media override',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'rvo',
              label: 'Override route visual',
              type: 'group',
              fields: [
                {
                  name: 'mapImage',
                  label: 'Ảnh route/map',
                  type: 'upload',
                  relationTo: 'media',
                },
                {
                  name: 'routeCaption',
                  label: 'Chú thích route',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'st',
                  label: 'Các điểm dừng',
                  type: 'array',
                  fields: [
                    {
                      name: 'order',
                      label: 'Thứ tự',
                      type: 'number',
                      required: true,
                    },
                    {
                      name: 'label',
                      label: 'Tên điểm',
                      localized: true,
                      required: true,
                      type: 'text',
                    },
                    {
                      name: 'tp',
                      label: 'Loại điểm',
                      type: 'select',
                      defaultValue: 'sightseeing',
                      options: [
                        { label: 'Điểm đi', value: 'origin' },
                        { label: 'Điểm đến', value: 'arrival' },
                        { label: 'Tham quan', value: 'sightseeing' },
                        { label: 'Ngủ đêm', value: 'overnight' },
                        { label: 'Chặng về', value: 'return' },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              name: 'servicesOverride',
              label: 'Override dịch vụ',
              type: 'group',
              fields: [
                {
                  name: 'hotelSummary',
                  label: 'Tóm tắt khách sạn',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'transportSummary',
                  label: 'Tóm tắt di chuyển',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'importantNotes',
                  label: 'Lưu ý vận hành',
                  localized: true,
                  type: 'textarea',
                },
              ],
            },
          ],
        },
        {
          label: 'Itinerary Overrides',
          fields: [
            {
              name: 'itineraryDayOverrides',
              label: 'Override theo ngày',
              type: 'array',
              fields: [
                {
                  name: 'dayNumber',
                  label: 'Ngày số',
                  type: 'number',
                  required: true,
                },
                {
                  name: 'title',
                  label: 'Tiêu đề override',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'route',
                  label: 'Route override',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'summary',
                  label: 'Mô tả override',
                  localized: true,
                  type: 'textarea',
                },
                {
                  name: 'meals',
                  label: 'Bữa ăn',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'transport',
                  label: 'Di chuyển',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'accommodation',
                  label: 'Lưu trú',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'dayTheme',
                  label: 'Theme trong ngày',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'dayHighlight',
                  label: 'Điểm nhấn bán hàng',
                  localized: true,
                  type: 'textarea',
                },
                {
                  name: 'sleepingStandard',
                  label: 'Tiêu chuẩn nghỉ đêm',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'equipmentNote',
                  label: 'Ghi chú phương tiện / dịch vụ',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'gallery',
                  label: 'Gallery trong ngày',
                  type: 'relationship',
                  relationTo: 'media',
                  hasMany: true,
                },
              ],
            },
          ],
        },
        {
          label: 'Departure Links',
          fields: [
            {
              name: 'activeDepartures',
              label: 'Đợt khởi hành thuộc biến thể',
              type: 'relationship',
              relationTo: 'tour-departures' as any,
              hasMany: true,
              filterOptions: sameSiteFilterOptions,
            },
          ],
        },
      ],
    },
  ],
  labels: {
    plural: adminLabel('Departure Variants', 'Departure Variants'),
    singular: adminLabel('Departure Variant', 'Departure Variant'),
  },
  hooks: {
    afterChange: [revalidateTourVariant],
    afterDelete: [revalidateTourVariantDelete],
    beforeChange: [enforceSiteAccess],
  },
}
