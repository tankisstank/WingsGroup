import type { CollectionConfig } from 'payload'

import { contentCreateAccess, contentDeleteAccess } from '@/access/roles'
import { enforceSiteAccess, siteScopedAccess, siteScopedOrAnyone } from '@/access/siteScope'
import { sameSiteFilterOptions, siteField } from '@/fields/site'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'

import {
  enforceSingleDefaultPerSite,
  preventCurationDelete,
  revalidateTourCuration,
  revalidateTourCurationDelete,
  validateTourCurationTours,
} from './TourCurations/hooks'

export const TourCurations: CollectionConfig = {
  slug: 'tour-curations',
  access: {
    create: contentCreateAccess,
    delete: contentDeleteAccess,
    read: siteScopedOrAnyone(),
    update: siteScopedAccess(),
  },
  admin: {
    defaultColumns: ['name', 'site', 'isDefault', 'updatedAt'],
    description:
      'Quản lý các bộ tour nổi bật, ưu đãi, hot pick độc lập theo từng site hoặc chiến dịch.',
    group: adminGroups.content,
    useAsTitle: 'name',
  },
  defaultPopulate: {
    name: true,
    isDefault: true,
    site: true,
    featuredTours: true,
  },
  fields: [
    siteField(),
    {
      name: 'name',
      label: 'Tên bộ sưu tập',
      type: 'text',
      required: true,
      admin: {
        placeholder: 'VD: Tour nổi bật Mùa hè 2026, Hot Deals WingsGo',
      },
    },
    {
      name: 'isDefault',
      label: 'Bộ mặc định của site',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Nếu bật, bộ tour này sẽ tự động hiển thị trên Trang chủ và trang Catalog /tour khi không có chỉ định riêng. Mỗi site chỉ có tối đa một bộ mặc định.',
        position: 'sidebar',
      },
    },
    {
      name: 'featuredTours',
      label: 'Danh sách tour nổi bật (Tối đa 6 tour)',
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
          'Kéo thả để sắp xếp vị trí hiển thị. 3 vị trí đầu tiên sẽ xuất hiện trên Hero panel.',
      },
    },
    {
      name: 'description',
      label: 'Ghi chú nội bộ',
      type: 'textarea',
      admin: {
        description: 'Mô tả mục đích sử dụng của bộ tour này (nội bộ, không hiển thị ngoài web).',
      },
    },
  ],
  labels: {
    plural: adminLabel('Tour Curations', 'Tour Curations'),
    singular: adminLabel('Tour Curation', 'Tour Curation'),
  },
  hooks: {
    beforeChange: [enforceSiteAccess, enforceSingleDefaultPerSite, validateTourCurationTours],
    beforeDelete: [preventCurationDelete],
    afterChange: [revalidateTourCuration],
    afterDelete: [revalidateTourCurationDelete],
  },
}
