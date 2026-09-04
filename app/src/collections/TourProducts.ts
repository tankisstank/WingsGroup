import type { CollectionConfig } from 'payload'
import type { Site } from '@/payload-types'

import { contentCreateAccess, contentDeleteAccess, preventEditorPublish } from '@/access/roles'
import { enforceSiteAccess, siteScopedAccess, siteScopedOrPublished } from '@/access/siteScope'
import { sameSiteFilterOptions, siteField } from '@/fields/site'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { slugField } from 'payload'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

import {
  revalidateTourProduct,
  revalidateTourProductDelete,
} from './Tours/hooks/revalidateTourContent'
import { tourDestinationOptions, tourTravelStyleOptions } from '@/tours/taxonomy'
import { enforceTourProductPublishSite } from './Tours/hooks/enforceTourProductPublishSite'

export const TourProducts: CollectionConfig = {
  slug: 'tour-products',
  access: {
    create: contentCreateAccess,
    delete: contentDeleteAccess,
    read: siteScopedOrPublished(),
    update: siteScopedAccess(),
  },
  admin: {
    components: {
      beforeList: [
        '@/components/AdminGuidance/TourProductListGuidance',
        '@/components/ContentLocaleControl#ContentLocaleListControl',
      ],
      edit: {
        beforeDocumentControls: [
          '@/components/AdminGuidance/TourProductEditGuidance',
          '@/components/ContentLocaleControl#ContentLocaleDocumentControl',
        ],
      },
    },
    description:
      'Tour có cấu trúc dùng chung cho WingsGo và WingSide. Dữ liệu này là nguồn thật để render trang tour và discovery theo site.',
    defaultColumns: ['title', 'site', 'tourType', 'destinationTags', 'travelStyles', 'updatedAt'],
    group: adminGroups.content,
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          collection: 'tour-products',
          req,
          site: data?.site as number | Site | null | undefined,
          slug: data?.slug,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        collection: 'tour-products',
        req,
        site: data?.site as number | Site | null | undefined,
        slug: data?.slug as string,
      }),
    useAsTitle: 'title',
  },
  defaultPopulate: {
    title: true,
    slug: true,
    market: true,
    durationDays: true,
    durationNights: true,
    summary: true,
    heroMedia: true,
  },
  fields: [
    {
      name: 'title',
      label: 'Tên tour',
      localized: true,
      required: true,
      type: 'text',
    },
    siteField(),
    {
      name: 'market',
      label: 'Thị trường',
      required: true,
      type: 'select',
      options: [
        { label: 'Hàn Quốc', value: 'korea' },
        { label: 'Nhật Bản', value: 'japan' },
        { label: 'Trung Quốc', value: 'china' },
        { label: 'Việt Nam', value: 'vietnam' },
        { label: 'Thái Lan', value: 'thailand' },
        { label: 'Campuchia', value: 'cambodia' },
        { label: 'Lào', value: 'laos' },
        { label: 'Myanmar', value: 'myanmar' },
        { label: 'Đông Dương', value: 'indochina' },
        { label: 'Thị trường khác', value: 'other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'tourCode',
      label: 'Mã tour',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'tourType',
      label: 'Loại tour WingSide',
      type: 'select',
      options: [
        { label: 'Small group', value: 'group' },
        { label: 'Private', value: 'private' },
        { label: 'Small group + Private', value: 'hybrid' },
      ],
      admin: {
        description:
          'Hybrid biểu diễn tour có cả lịch ghép đã xác minh và lựa chọn thiết kế riêng. Không có giá trị được hiểu là private để public discovery fail closed.',
        position: 'sidebar',
      },
    },
    {
      name: 'destinationTags',
      label: 'Điểm đến',
      type: 'select',
      hasMany: true,
      index: true,
      options: [...tourDestinationOptions],
      admin: {
        description: 'Key ổn định để lọc tour; nhãn hiển thị do CMS quản lý.',
        position: 'sidebar',
      },
    },
    {
      name: 'travelStyles',
      label: 'Phong cách du lịch',
      type: 'select',
      hasMany: true,
      index: true,
      options: [...tourTravelStyleOptions],
      admin: {
        description: 'Phân loại biên tập có kiểm soát; không suy đoán từ tiêu đề.',
        position: 'sidebar',
      },
    },
    {
      name: 'taxonomyProvenance',
      label: 'Đối soát taxonomy',
      type: 'json',
      admin: {
        description: 'Revision, bằng chứng và thời điểm gán taxonomy gần nhất.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'sourceProvenance',
      label: 'Nguồn import / đối soát',
      type: 'json',
      admin: {
        description:
          'Dữ liệu máy đọc để truy vết source system, source ID/URL/hash, batch import và bảng giá gốc.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'priceFrom',
      label: 'Giá từ',
      min: 0,
      type: 'number',
      admin: { position: 'sidebar' },
    },
    {
      name: 'currency',
      label: 'Tiền tệ giá từ',
      type: 'text',
      defaultValue: 'USD',
      admin: { position: 'sidebar' },
    },
    {
      name: 'durationDays',
      label: 'Số ngày',
      min: 1,
      required: true,
      type: 'number',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'durationNights',
      label: 'Số đêm',
      min: 0,
      required: true,
      type: 'number',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'wrapperPage',
      label: 'Page wrapper',
      type: 'relationship',
      relationTo: 'pages',
      filterOptions: sameSiteFilterOptions,
      admin: {
        position: 'sidebar',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Tổng quan',
          fields: [
            {
              name: 'summary',
              label: 'Tóm tắt bán hàng',
              localized: true,
              required: true,
              type: 'textarea',
            },
            {
              name: 'heroMedia',
              label: 'Hero media',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'gallery',
              label: 'Gallery',
              type: 'relationship',
              relationTo: 'media',
              hasMany: true,
            },
            {
              name: 'highlights',
              label: 'Điểm nổi bật',
              type: 'array',
              fields: [
                {
                  name: 'title',
                  label: 'Tiêu đề',
                  localized: true,
                  required: true,
                  type: 'text',
                },
                {
                  name: 'description',
                  label: 'Mô tả',
                  localized: true,
                  required: true,
                  type: 'textarea',
                },
              ],
            },
          ],
        },
        {
          label: 'Decision Panel',
          fields: [
            {
              name: 'factSummary',
              label: 'Thông tin quyết định',
              type: 'group',
              fields: [
                {
                  name: 'routeSummary',
                  label: 'Route',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'mealsSummary',
                  label: 'Bữa ăn',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'groupSizeSummary',
                  label: 'Quy mô đoàn',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'operatorNote',
                  label: 'Điều hành',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'holdNote',
                  label: 'Giữ chỗ',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'hotelSummary',
                  label: 'Khách sạn',
                  localized: true,
                  type: 'text',
                },
              ],
            },
            {
              name: 'reviewSnapshot',
              label: 'Review snapshot',
              type: 'group',
              fields: [
                {
                  name: 'score',
                  label: 'Điểm đánh giá',
                  type: 'number',
                },
                {
                  name: 'reviewCount',
                  label: 'Số review',
                  type: 'number',
                },
                {
                  name: 'travelerCount',
                  label: 'Số khách đã đi',
                  type: 'number',
                },
                {
                  name: 'sourceLabel',
                  label: 'Nguồn review',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'whyGuestsChoose',
                  label: 'Vì sao khách chọn',
                  localized: true,
                  type: 'textarea',
                },
                {
                  name: 'proofQuotes',
                  label: 'Quote minh chứng',
                  type: 'array',
                  fields: [
                    {
                      name: 'quote',
                      label: 'Trích dẫn',
                      localized: true,
                      required: true,
                      type: 'textarea',
                    },
                    {
                      name: 'author',
                      label: 'Tên người nói',
                      localized: true,
                      type: 'text',
                    },
                  ],
                },
              ],
            },
            {
              name: 'routeViz',
              label: 'Route visual',
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
                  name: 'stops',
                  label: 'Các điểm dừng',
                  type: 'array',
                  fields: [
                    {
                      name: 'order',
                      label: 'Thứ tự',
                      required: true,
                      type: 'number',
                    },
                    {
                      name: 'label',
                      label: 'Tên điểm',
                      localized: true,
                      required: true,
                      type: 'text',
                    },
                    {
                      name: 'type',
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
                {
                  name: 'travelLegs',
                  label: 'Chặng di chuyển',
                  type: 'array',
                  fields: [
                    {
                      name: 'from',
                      label: 'Từ',
                      localized: true,
                      required: true,
                      type: 'text',
                    },
                    {
                      name: 'to',
                      label: 'Đến',
                      localized: true,
                      required: true,
                      type: 'text',
                    },
                    {
                      name: 'mode',
                      label: 'Phương thức',
                      localized: true,
                      type: 'text',
                    },
                  ],
                },
              ],
            },
            {
              name: 'badges',
              label: 'Badge',
              type: 'array',
              fields: [
                {
                  name: 'label',
                  label: 'Nhãn',
                  localized: true,
                  required: true,
                  type: 'text',
                },
              ],
            },
            {
              name: 'marketCard',
              label: 'Market card (trang thị trường)',
              type: 'group',
              admin: {
                description:
                  'Dữ liệu hiển thị cho card tour trên trang thị trường. Badge và selling line ở đây được CMS kiểm soát, không suy đoán từ tiêu đề hay giá.',
              },
              fields: [
                {
                  name: 'thumbnailOverride',
                  label: 'Ảnh thumbnail riêng',
                  type: 'upload',
                  relationTo: 'media',
                },
                {
                  name: 'badges',
                  label: 'Badge market card',
                  type: 'array',
                  maxRows: 3,
                  admin: {
                    description:
                      'Tối đa 3 badge, ví dụ: Phù hợp người mới đi, Giá tốt, Line bán chạy.',
                  },
                  fields: [
                    {
                      name: 'label',
                      label: 'Nhãn',
                      localized: true,
                      required: true,
                      type: 'text',
                    },
                  ],
                },
                {
                  name: 'sellingLine',
                  label: 'Selling line',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'priorityLabel',
                  label: 'Nhãn ưu tiên',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'featuredReason',
                  label: 'Lý do nổi bật',
                  localized: true,
                  type: 'textarea',
                },
              ],
            },
            {
              name: 'primaryCTA',
              label: 'CTA chính',
              type: 'group',
              fields: [
                {
                  name: 'mode',
                  label: 'Kiểu CTA',
                  required: true,
                  type: 'select',
                  defaultValue: 'inquiry',
                  options: [
                    { label: 'Inquiry', value: 'inquiry' },
                    { label: 'Hold seat', value: 'hold-seat' },
                    { label: 'Request quote', value: 'request-quote' },
                    { label: 'Contact', value: 'contact' },
                  ],
                },
                {
                  name: 'label',
                  label: 'Nhãn nút',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'href',
                  label: 'Link đích',
                  type: 'text',
                },
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
              ],
            },
          ],
        },
        {
          label: 'Lịch trình',
          fields: [
            {
              name: 'itineraryDays',
              label: 'Ngày hành trình',
              type: 'array',
              required: true,
              fields: [
                {
                  name: 'dayNumber',
                  label: 'Ngày số',
                  min: 1,
                  required: true,
                  type: 'number',
                },
                {
                  name: 'title',
                  label: 'Tiêu đề',
                  localized: true,
                  required: true,
                  type: 'text',
                },
                {
                  name: 'route',
                  label: 'Route / thành phố',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'summary',
                  label: 'Mô tả',
                  localized: true,
                  required: true,
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
                  name: 'notes',
                  label: 'Ghi chú',
                  localized: true,
                  type: 'textarea',
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
                  label: 'Ghi chú phương tiện / tiện ích',
                  localized: true,
                  type: 'text',
                },
                {
                  name: 'media',
                  label: 'Ảnh minh họa',
                  type: 'upload',
                  relationTo: 'media',
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
          label: 'Dịch vụ / FAQ',
          fields: [
            {
              name: 'includes',
              label: 'Bao gồm',
              type: 'array',
              fields: [
                {
                  name: 'label',
                  label: 'Mục',
                  localized: true,
                  required: true,
                  type: 'text',
                },
              ],
            },
            {
              name: 'excludes',
              label: 'Không bao gồm',
              type: 'array',
              fields: [
                {
                  name: 'label',
                  label: 'Mục',
                  localized: true,
                  required: true,
                  type: 'text',
                },
              ],
            },
            {
              name: 'servicesSummary',
              label: 'Tóm tắt dịch vụ',
              type: 'group',
              fields: [
                {
                  name: 'hotelSummary',
                  label: 'Khách sạn / nghỉ đêm',
                  localized: true,
                  type: 'textarea',
                },
                {
                  name: 'mealsSummary',
                  label: 'Ăn uống',
                  localized: true,
                  type: 'textarea',
                },
                {
                  name: 'transportSummary',
                  label: 'Di chuyển',
                  localized: true,
                  type: 'textarea',
                },
                {
                  name: 'operatorNotes',
                  label: 'Lưu ý điều hành',
                  localized: true,
                  type: 'textarea',
                },
                {
                  name: 'notes',
                  label: 'Lưu ý quan trọng',
                  type: 'array',
                  fields: [
                    {
                      name: 'label',
                      label: 'Mục',
                      localized: true,
                      required: true,
                      type: 'text',
                    },
                  ],
                },
              ],
            },
            {
              name: 'faqItems',
              label: 'FAQ',
              type: 'array',
              fields: [
                {
                  name: 'question',
                  label: 'Câu hỏi',
                  localized: true,
                  required: true,
                  type: 'text',
                },
                {
                  name: 'answer',
                  label: 'Trả lời',
                  localized: true,
                  required: true,
                  type: 'textarea',
                },
              ],
            },
            {
              name: 'relatedTours',
              label: 'Tour liên quan',
              type: 'relationship',
              relationTo: 'tour-products' as any,
              hasMany: true,
              filterOptions: sameSiteFilterOptions,
            },
          ],
        },
        {
          label: 'Builder',
          fields: [
            {
              name: 'bcfg',
              label: 'Builder config',
              type: 'group',
              fields: [
                {
                  name: 'template',
                  label: 'Template',
                  required: true,
                  type: 'select',
                  defaultValue: 'dense-retail-default',
                  options: [
                    { label: 'Dense retail default', value: 'dense-retail-default' },
                    { label: 'Dense retail variant', value: 'dense-retail-variant' },
                  ],
                },
                {
                  name: 'stickyCTAEnabled',
                  label: 'Bật sticky CTA',
                  type: 'checkbox',
                  defaultValue: true,
                },
                {
                  name: 'ctaStyle',
                  label: 'Kiểu CTA mặc định',
                  type: 'select',
                  defaultValue: 'hold-seat',
                  options: [
                    { label: 'Giữ chỗ', value: 'hold-seat' },
                    { label: 'Nhận tư vấn', value: 'inquiry' },
                    { label: 'Báo giá', value: 'request-quote' },
                  ],
                },
                {
                  name: 'routeMode',
                  label: 'Kiểu route visual',
                  type: 'select',
                  defaultValue: 'route-map',
                  options: [
                    { label: 'Route map', value: 'route-map' },
                    { label: 'Stop timeline', value: 'stop-timeline' },
                  ],
                },
                {
                  name: 'itinMode',
                  label: 'Kiểu hiển thị itinerary',
                  type: 'select',
                  defaultValue: 'timeline-cards',
                  options: [
                    { label: 'Timeline cards', value: 'timeline-cards' },
                    { label: 'Accordion', value: 'accordion' },
                  ],
                },
                {
                  name: 'depMode',
                  label: 'Kiểu hiển thị lịch khởi hành',
                  type: 'select',
                  defaultValue: 'matrix',
                  options: [
                    { label: 'Matrix', value: 'matrix' },
                    { label: 'Cards', value: 'cards' },
                  ],
                },
              ],
            },
            {
              name: 'sectionVisibility',
              label: 'Section hiển thị',
              type: 'select',
              hasMany: true,
              defaultValue: [
                'hero',
                'facts',
                'why-choose',
                'route',
                'itinerary',
                'services',
                'departures',
                'faq',
                'related',
              ],
              options: [
                { label: 'Hero', value: 'hero' },
                { label: 'Facts', value: 'facts' },
                { label: 'Why choose', value: 'why-choose' },
                { label: 'Route', value: 'route' },
                { label: 'Itinerary', value: 'itinerary' },
                { label: 'Services', value: 'services' },
                { label: 'Departures', value: 'departures' },
                { label: 'FAQ', value: 'faq' },
                { label: 'Related', value: 'related' },
                { label: 'Reviews proof', value: 'reviews' },
                { label: 'Sticky CTA', value: 'sticky-cta' },
              ],
            },
            {
              name: 'sectionOrder',
              label: 'Thứ tự section',
              type: 'select',
              hasMany: true,
              defaultValue: [
                'hero',
                'facts',
                'reviews',
                'why-choose',
                'route',
                'itinerary',
                'services',
                'departures',
                'faq',
                'related',
                'sticky-cta',
              ],
              options: [
                { label: 'Hero', value: 'hero' },
                { label: 'Facts', value: 'facts' },
                { label: 'Reviews proof', value: 'reviews' },
                { label: 'Why choose', value: 'why-choose' },
                { label: 'Route', value: 'route' },
                { label: 'Itinerary', value: 'itinerary' },
                { label: 'Services', value: 'services' },
                { label: 'Departures', value: 'departures' },
                { label: 'FAQ', value: 'faq' },
                { label: 'Related', value: 'related' },
                { label: 'Sticky CTA', value: 'sticky-cta' },
              ],
            },
            {
              name: 'variantStrategy',
              label: 'Chiến lược variant',
              type: 'select',
              defaultValue: 'product-first',
              options: [
                { label: 'Ưu tiên tour gốc', value: 'product-first' },
                { label: 'Ưu tiên variant nổi bật', value: 'variant-first' },
              ],
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          localized: true,
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({ hasGenerateFn: true }),
            MetaImageField({ relationTo: 'media' }),
            MetaDescriptionField({}),
            {
              name: 'breadcrumbLabel',
              label: 'Nhãn breadcrumb',
              type: 'text',
            },
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    slugField({
      overrides: (field) => {
        field.fields = field.fields.map((item) => {
          if ('name' in item && item.name === 'slug') {
            return {
              ...item,
              label: 'Slug tour',
              localized: false,
            } as typeof item
          }

          return item
        }) as typeof field.fields

        return field
      },
    }),
  ],
  labels: {
    plural: adminLabel('Tour Products', 'Tour Products'),
    singular: adminLabel('Tour Product', 'Tour Product'),
  },
  hooks: {
    afterChange: [revalidateTourProduct],
    afterDelete: [revalidateTourProductDelete],
    beforeChange: [enforceSiteAccess, enforceTourProductPublishSite, preventEditorPublish],
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
