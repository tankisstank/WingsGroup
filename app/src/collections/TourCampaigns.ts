import type { CollectionConfig } from 'payload'
import type { Site } from '@/payload-types'

import { contentCreateAccess, contentDeleteAccess } from '@/access/roles'
import { enforceSiteAccess, siteScopedAccess, siteScopedOrPublished } from '@/access/siteScope'
import { sameSiteFilterOptions, siteField } from '@/fields/site'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { slugField } from 'payload'
import { vietnameseSlugify } from '@/utilities/slugify'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

import {
  revalidateTourCampaign,
  revalidateTourCampaignDelete,
} from './Tours/hooks/revalidateTourContent'

export const TourCampaigns: CollectionConfig = {
  slug: 'tour-campaigns',
  access: {
    create: contentCreateAccess,
    delete: contentDeleteAccess,
    read: siteScopedOrPublished(),
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
      'Campaign season cho tour. Dùng để gom product và departure theo mùa hoặc line bán hàng cụ thể.',
    defaultColumns: ['title', 'site', 'seasonKey', 'updatedAt'],
    group: adminGroups.content,
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          id: data?.id as number | string | null | undefined,
          collection: 'tour-campaigns',
          req,
          site: data?.site as number | Site | null | undefined,
          slug: data?.slug,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        id: data?.id as number | string | null | undefined,
        collection: 'tour-campaigns',
        req,
        site: data?.site as number | Site | null | undefined,
        slug: data?.slug as string,
      }),
    useAsTitle: 'title',
  },
  defaultPopulate: {
    title: true,
    slug: true,
    summary: true,
    heroMedia: true,
  },
  fields: [
    {
      name: 'title',
      label: 'Tên campaign',
      localized: true,
      required: true,
      type: 'text',
    },
    siteField(),
    {
      name: 'campaignCode',
      label: 'Campaign code',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'seasonKey',
      label: 'Season',
      type: 'select',
      required: true,
      defaultValue: 'summer-2026',
      options: [
        { label: 'Summer 2026', value: 'summer-2026' },
        { label: 'Always on', value: 'always-on' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'wrapperPage',
      label: 'Trang bao ngoài',
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
          label: 'Nội dung',
          fields: [
            {
              name: 'summary',
              label: 'Tóm tắt',
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
              name: 'linkedTours',
              label: 'Tour trong campaign',
              type: 'relationship',
              relationTo: 'tour-products' as any,
              hasMany: true,
              filterOptions: sameSiteFilterOptions,
              required: true,
            },
            {
              name: 'featuredDepartures',
              label: 'Đợt khởi hành nổi bật',
              type: 'relationship',
              relationTo: 'tour-departures' as any,
              hasMany: true,
              filterOptions: sameSiteFilterOptions,
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
      slugify: vietnameseSlugify,
      overrides: (field) => {
        field.fields = field.fields.map((item) => {
          if ('name' in item && item.name === 'slug') {
            return {
              ...item,
              label: 'Slug campaign',
              localized: false,
            } as typeof item
          }

          if ('name' in item && item.name === 'generateSlug') {
            return {
              ...item,
              label: 'Tự tạo đường dẫn từ tiêu đề campaign',
            } as typeof item
          }

          return item
        }) as typeof field.fields

        return field
      },
    }),
  ],
  labels: {
    plural: adminLabel('Tour Campaigns', 'Tour Campaigns'),
    singular: adminLabel('Tour Campaign', 'Tour Campaign'),
  },
  hooks: {
    afterChange: [revalidateTourCampaign],
    afterDelete: [revalidateTourCampaignDelete],
    beforeChange: [enforceSiteAccess],
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
