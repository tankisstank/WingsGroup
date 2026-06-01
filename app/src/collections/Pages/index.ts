import type { CollectionConfig } from 'payload'

import { contentCreateAccess, contentDeleteAccess, preventEditorPublish } from '@/access/roles'
import { enforceSiteAccess, siteScopedAccess, siteScopedOrPublished } from '@/access/siteScope'
import { Archive } from '../../blocks/ArchiveBlock/config'
import { CallToAction } from '../../blocks/CallToAction/config'
import { Content } from '../../blocks/Content/config'
import { FormBlock } from '../../blocks/Form/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { sameSiteFilterOptions, siteField } from '@/fields/site'
import { hero } from '@/heros/config'
import { slugField } from 'payload'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { revalidateDelete, revalidatePage } from './hooks/revalidatePage'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  access: {
    create: contentCreateAccess,
    delete: contentDeleteAccess,
    read: siteScopedOrPublished(),
    update: siteScopedAccess(),
  },
  // This config controls what's populated by default when a page is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'pages'>
  defaultPopulate: {
    title: true,
    slug: true,
  },
  admin: {
    components: {
      edit: {
        beforeDocumentControls: ['@/components/AdminGuidance/PageEditGuidance'],
      },
    },
    description:
      'Quản lý trang theo site. Editor chỉ lưu nháp; site-manager hoặc super-admin duyệt publish.',
    defaultColumns: ['title', 'site', 'slug', 'updatedAt'],
    group: 'Nội dung',
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'pages',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'pages',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      label: 'Tiêu đề',
      type: 'text',
      localized: true,
      required: true,
    },
    siteField(),
    {
      name: 'parentPage',
      label: 'Trang cha',
      type: 'relationship',
      admin: {
        description: 'Chọn trang cha nếu cần hiển thị breadcrumb hoặc nhóm nội dung liên quan.',
        position: 'sidebar',
      },
      filterOptions: sameSiteFilterOptions,
      relationTo: 'pages',
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [hero],
          label: 'Hero',
        },
        {
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [CallToAction, Content, MediaBlock, Archive, FormBlock],
              localized: true,
              required: true,
              admin: {
                initCollapsed: true,
              },
            },
          ],
          label: 'Nội dung',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            {
              name: 'breadcrumbLabel',
              label: 'Nhãn breadcrumb',
              type: 'text',
              admin: {
                description: 'Tên ngắn hiển thị trong breadcrumb và schema BreadcrumbList.',
              },
              localized: true,
            },
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'relatedPages',
      label: 'Trang liên quan',
      type: 'relationship',
      admin: {
        description: 'Các trang cùng site được hiển thị bên dưới nội dung để tăng liên kết nội bộ.',
        position: 'sidebar',
      },
      filterOptions: sameSiteFilterOptions,
      hasMany: true,
      relationTo: 'pages',
    },
    {
      name: 'publishedAt',
      label: 'Ngày xuất bản',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    slugField({
      overrides: (field) => {
        field.fields = field.fields.map((item) => {
          if ('name' in item && item.name === 'slug') {
            return {
              ...item,
              label: 'Đường dẫn',
              admin: {
                ...item.admin,
                description: 'Phần URL của trang. Chỉ sửa khi thật sự cần đổi đường dẫn.',
              },
            } as typeof item
          }

          if ('name' in item && item.name === 'generateSlug') {
            return {
              ...item,
              label: 'Tự tạo đường dẫn từ tiêu đề',
            } as typeof item
          }

          return item
        }) as typeof field.fields

        return field
      },
    }),
  ],
  labels: {
    plural: 'Trang',
    singular: 'Trang',
  },
  hooks: {
    afterChange: [revalidatePage],
    beforeChange: [enforceSiteAccess, preventEditorPublish, populatePublishedAt],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
