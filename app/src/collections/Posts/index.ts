import type { CollectionConfig } from 'payload'
import type { Site } from '@/payload-types'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import {
  contentCreateAccess,
  contentDeleteAccess,
  normalizeRelationID,
  preventEditorPublish,
} from '@/access/roles'
import { enforceSiteAccess, siteScopedAccess, siteScopedOrPublished } from '@/access/siteScope'
import { Banner } from '../../blocks/Banner/config'
import { Code } from '../../blocks/Code/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { populateAuthors } from './hooks/populateAuthors'
import { revalidateDelete, revalidatePost } from './hooks/revalidatePost'
import { sameSiteFilterOptions, siteField } from '@/fields/site'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from 'payload'

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  access: {
    create: contentCreateAccess,
    delete: contentDeleteAccess,
    read: siteScopedOrPublished(),
    update: siteScopedAccess(),
  },
  // This config controls what's populated by default when a post is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'posts'>
  defaultPopulate: {
    title: true,
    slug: true,
    categories: true,
    meta: {
      image: true,
      description: true,
    },
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
      'Quản lý bài viết theo site. Editor chỉ lưu nháp; site-manager hoặc super-admin duyệt publish.',
    defaultColumns: ['title', 'site', 'slug', 'updatedAt'],
    group: adminGroups.content,
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          id: data?.id as number | string | null | undefined,
          slug: data?.slug,
          collection: 'posts',
          req,
          site: data?.site as number | Site | null | undefined,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        id: data?.id as number | string | null | undefined,
        slug: data?.slug as string,
        collection: 'posts',
        req,
        site: data?.site as number | Site | null | undefined,
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
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'heroImage',
              label: 'Ảnh chính',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'content',
              label: 'Nội dung',
              type: 'richText',
              localized: true,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    BlocksFeature({ blocks: [Banner, Code, MediaBlock] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              required: true,
            },
          ],
          label: 'Nội dung',
        },
        {
          fields: [
            {
              name: 'relatedPosts',
              label: 'Bài viết liên quan',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              filterOptions: ({ id, siblingData }) => {
                const siteID = normalizeRelationID(
                  (siblingData as { site?: Parameters<typeof normalizeRelationID>[0] } | undefined)
                    ?.site,
                )
                const idFilter = id
                  ? {
                      id: {
                        not_in: [id],
                      },
                    }
                  : null

                if (siteID) {
                  return {
                    and: [
                      {
                        site: {
                          equals: siteID,
                        },
                      },
                      ...(idFilter ? [idFilter] : []),
                    ] as const,
                  }
                }

                return idFilter || true
              },
              hasMany: true,
              relationTo: 'posts',
            },
            {
              name: 'categories',
              label: 'Danh mục',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              hasMany: true,
              filterOptions: sameSiteFilterOptions,
              relationTo: 'categories',
            },
          ],
          label: 'Meta',
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
      name: 'publishedAt',
      label: 'Ngày xuất bản',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    {
      name: 'authors',
      label: 'Tác giả',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      hasMany: true,
      relationTo: 'users',
    },
    // This field is only used to populate the user data via the `populateAuthors` hook
    // This is because the `user` collection has access control locked to protect user privacy
    // GraphQL will also not return mutated user data that differs from the underlying schema
    {
      name: 'populatedAuthors',
      type: 'array',
      access: {
        update: () => false,
      },
      admin: {
        disabled: true,
        readOnly: true,
      },
      fields: [
        {
          name: 'id',
          type: 'text',
        },
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    slugField({
      overrides: (field) => {
        field.fields = field.fields.map((item) => {
          if ('name' in item && item.name === 'slug') {
            return {
              ...item,
              label: 'Đường dẫn',
              localized: false,
              admin: {
                ...item.admin,
                description: 'Phần URL của bài viết. Chỉ sửa khi thật sự cần đổi đường dẫn.',
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
    plural: adminLabel('Bài viết', 'Posts'),
    singular: adminLabel('Bài viết', 'Post'),
  },
  hooks: {
    afterChange: [revalidatePost],
    afterRead: [populateAuthors],
    beforeChange: [enforceSiteAccess, preventEditorPublish],
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
