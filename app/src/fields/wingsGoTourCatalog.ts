import type { Field } from 'payload'
import { disableListColumnRecursively } from '@/utilities/disableListColumn'

import { sameSiteFilterOptions } from './site'

/**
 * The `/tour` page owns WingsGo retail curation. Fallback inventory is never
 * stored in this relationship; the renderer fills gaps from the eligible
 * catalog at read time.
 */
export const wingsGoTourCatalogField: Field = disableListColumnRecursively({
  name: 'wingsGoTourCatalog',
  label: 'WingsGo tour catalog',
  type: 'group',
  admin: {
    description:
      'Chỉ định catalog động và bộ tour nổi bật. Nếu để trống bộ tour nổi bật, hệ thống sẽ tự động dùng bộ mặc định của site.',
    disableListColumn: true,
    disableListFilter: true,
  },
  fields: [
    {
      name: 'enabled',
      label: 'Bật catalog động',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'curation',
      label: 'Bộ tour nổi bật áp dụng',
      type: 'relationship',
      relationTo: 'tour-curations',
      filterOptions: sameSiteFilterOptions,
      admin: {
        description:
          'Chọn bộ tour riêng cho trang này. Nếu để trống, trang sẽ tự động sử dụng bộ tour Mặc định của site.',
      },
    },
    {
      name: 'featuredTours',
      label: 'Tour nổi bật (Legacy)',
      type: 'relationship',
      relationTo: 'tour-products',
      hasMany: true,
      maxRows: 6,
      filterOptions: sameSiteFilterOptions,
      admin: {
        components: {
          Field: '@/components/WingsGoTourCuration/FeaturedToursCurationField',
        },
        description:
          'Dữ liệu legacy. Khuyến khích quản trị tại menu "Bộ tour nổi bật" để tái sử dụng trên nhiều trang.',
      },
    },
  ],
})
