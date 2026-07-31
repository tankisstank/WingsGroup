import type { CollectionConfig } from 'payload'

import { contentCreateAccess, contentDeleteAccess, preventEditorPublish } from '@/access/roles'
import { enforceSiteAccess, siteScopedAccess, siteScopedOrPublished } from '@/access/siteScope'
import { sameSiteFilterOptions, siteField } from '@/fields/site'
import { supportedTourCurrencyOptions } from '@/tours/currency'
import { setDepartureInventoryIdentity } from '@/tours/departureCommerce'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'

import {
  revalidateTourDeparture,
  revalidateTourDepartureDelete,
} from './Tours/hooks/revalidateTourContent'

export const TourDepartures: CollectionConfig = {
  slug: 'tour-departures',
  access: {
    create: contentCreateAccess,
    delete: contentDeleteAccess,
    read: siteScopedOrPublished(),
    update: siteScopedAccess(),
  },
  admin: {
    description:
      'Lịch khởi hành và giá bán công khai. Mỗi record là một đợt đi để dùng lại trên tour detail, market, campaign và trang lịch.',
    defaultColumns: [
      'tourProduct',
      'variantRef',
      'departureDate',
      'departureCity',
      'priceFrom',
      'availabilityStatus',
    ],
    group: adminGroups.content,
    useAsTitle: 'departureDate',
  },
  defaultPopulate: {
    tourProduct: true,
    departureDate: true,
    departureCity: true,
    airline: true,
    priceFrom: true,
    availabilityStatus: true,
  },
  fields: [
    siteField(),
    {
      name: 'tourProduct',
      label: 'Tour',
      relationTo: 'tour-products' as any,
      required: true,
      type: 'relationship',
      filterOptions: sameSiteFilterOptions,
    },
    {
      name: 'variantRef',
      label: 'Biến thể áp dụng',
      relationTo: 'departure-variants' as any,
      type: 'relationship',
      filterOptions: sameSiteFilterOptions,
    },
    {
      name: 'variantKey',
      label: 'Mã biến thể',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'departureCity',
      label: 'Điểm đi',
      localized: true,
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'departureDate',
      label: 'Ngày khởi hành',
      required: true,
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'returnDate',
      label: 'Ngày về',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'airline',
      label: 'Hãng bay',
      localized: true,
      type: 'text',
    },
    {
      name: 'priceFrom',
      label: 'Giá từ',
      min: 0,
      required: true,
      type: 'number',
    },
    {
      name: 'currency',
      label: 'Tiền tệ',
      required: true,
      type: 'select',
      defaultValue: 'VND',
      options: supportedTourCurrencyOptions,
    },
    {
      name: 'priceBasis',
      label: 'Cơ sở giá',
      type: 'select',
      options: [
        { label: 'Mỗi khách', value: 'per-person' },
        { label: 'Mỗi booking', value: 'per-booking' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'verifiedAt',
      label: 'Xác minh giá / tồn kho lúc',
      type: 'date',
      admin: {
        description:
          'Commerce chỉ hiển thị khi thời điểm xác minh và hết hạn tạo thành cửa sổ còn hiệu lực.',
        position: 'sidebar',
      },
    },
    {
      name: 'expiresAt',
      label: 'Hết hạn xác minh lúc',
      type: 'date',
      admin: {
        description:
          'Sau thời điểm này chỉ giá, ngày khởi hành và availability ngừng hiển thị; tour vẫn mở để khách liên hệ.',
        position: 'sidebar',
      },
    },
    {
      name: 'inventoryIdentity',
      label: 'Định danh inventory',
      type: 'text',
      unique: true,
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'sourceProvenance',
      label: 'Nguồn inventory',
      type: 'group',
      admin: {
        description:
          'Bằng chứng nguồn cho inventory được đồng bộ. Không dùng trường này cho departure nhập tay.',
      },
      fields: [
        { name: 'sourceSystem', type: 'text' },
        { name: 'sourceUrl', type: 'text' },
        { name: 'sourcePageSha256', type: 'text' },
        { name: 'sourceRowSha256', type: 'text' },
        { name: 'checkedAt', type: 'date' },
        { name: 'managedBy', type: 'text', admin: { readOnly: true } },
      ],
    },
    {
      name: 'promoLabel',
      label: 'Promo label',
      localized: true,
      type: 'text',
    },
    {
      name: 'urgencyLabel',
      label: 'Nhãn khẩn trương',
      localized: true,
      type: 'text',
    },
    {
      name: 'availabilityBadge',
      label: 'Badge hiển thị',
      localized: true,
      type: 'text',
    },
    {
      name: 'availabilityStatus',
      label: 'Trạng thái',
      required: true,
      type: 'select',
      defaultValue: 'open',
      options: [
        { label: 'Mở bán', value: 'open' },
        { label: 'Sắp hết chỗ', value: 'limited' },
        { label: 'Đã kín', value: 'sold-out' },
      ],
    },
    {
      name: 'note',
      label: 'Ghi chú',
      localized: true,
      type: 'textarea',
    },
    {
      name: 'depositNote',
      label: 'Ghi chú đặt cọc',
      localized: true,
      type: 'text',
    },
    {
      name: 'holdNote',
      label: 'Ghi chú giữ chỗ',
      localized: true,
      type: 'text',
    },
    {
      name: 'changePolicyNote',
      label: 'Ghi chú đổi / hủy',
      localized: true,
      type: 'textarea',
    },
    {
      name: 'ctaLabelOverride',
      label: 'Override nhãn CTA',
      localized: true,
      type: 'text',
    },
    {
      name: 'isFeatured',
      label: 'Ưu tiên hiển thị',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'intentConfig',
      label: 'Hook cho phase 2',
      type: 'group',
      fields: [
        {
          name: 'leadFormVariant',
          label: 'Lead form variant',
          type: 'text',
        },
        {
          name: 'bookingIntentMode',
          label: 'Booking intent mode',
          type: 'text',
        },
        {
          name: 'salesRoutingHint',
          label: 'Sales routing hint',
          type: 'text',
        },
        {
          name: 'bookingNote',
          label: 'Booking note',
          localized: true,
          type: 'textarea',
        },
      ],
    },
  ],
  labels: {
    plural: adminLabel('Tour Departures', 'Tour Departures'),
    singular: adminLabel('Tour Departure', 'Tour Departure'),
  },
  hooks: {
    afterChange: [revalidateTourDeparture],
    afterDelete: [revalidateTourDepartureDelete],
    beforeChange: [enforceSiteAccess, preventEditorPublish],
    beforeValidate: [setDepartureInventoryIdentity],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
