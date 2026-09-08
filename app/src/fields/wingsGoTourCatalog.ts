import type { Field } from 'payload'

import { sameSiteFilterOptions } from './site'

/**
 * The `/tour` page owns WingsGo retail curation. Fallback inventory is never
 * stored in this relationship; the renderer fills gaps from the eligible
 * catalog at read time.
 */
export const wingsGoTourCatalogField: Field = {
  name: 'wingsGoTourCatalog',
  label: 'WingsGo tour catalog',
  type: 'group',
  admin: {
    description:
      'Chỉ áp dụng cho trang WingsGo /tour. Chọn tối đa 6 tour nổi bật theo thứ tự; tour dự phòng được tính khi render và không ghi vào CMS.',
  },
  fields: [
    {
      name: 'enabled',
      label: 'Bật catalog động',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'featuredTours',
      label: 'Tour nổi bật',
      type: 'relationship',
      relationTo: 'tour-products',
      hasMany: true,
      maxRows: 6,
      filterOptions: sameSiteFilterOptions,
      admin: {
        description:
          'Giữ đúng thứ tự biên tập. Mỗi tour phải là sản phẩm WingsGo đã publish, có wrapper page cùng site đã publish và có đợt đi tương lai đã publish.',
      },
    },
  ],
}
