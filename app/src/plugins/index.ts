import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { importExportPlugin } from '@payloadcms/plugin-import-export'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import type { CollectionBeforeValidateHook, CollectionConfig, Field, Plugin } from 'payload'
import {
  contentCreateAccess,
  contentDeleteAccess,
  contentPublishAccess,
  hideFromEditors,
  hideFromNonSuperAdmins,
} from '@/access/roles'
import { enforceSiteAccess, siteScopedAccess, siteScopedOrAnyone } from '@/access/siteScope'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'
import { siteField } from '@/fields/site'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'

import { Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Payload Website Template` : 'Payload Website Template'
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

const assignSubmissionSite: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!data?.form || data.site) {
    return data
  }

  const formID = typeof data.form === 'object' && 'id' in data.form ? data.form.id : data.form

  if (!formID) {
    return data
  }

  const form = await req.payload.findByID({
    id: formID,
    collection: 'forms',
    depth: 0,
    overrideAccess: true,
    req,
  })

  return {
    ...data,
    site: typeof form.site === 'object' && form.site ? form.site.id : form.site,
  }
}

const restrictDataExchangeCollection = (collection: CollectionConfig): CollectionConfig => ({
  ...collection,
  access: {
    ...collection.access,
    create: contentPublishAccess,
    delete: contentDeleteAccess,
    read: contentPublishAccess,
    update: contentPublishAccess,
  },
  admin: {
    ...collection.admin,
    components: {
      ...collection.admin?.components,
      beforeList: ['@/components/AdminGuidance/DataExchangeGuidance'],
    },
    group: adminGroups.data,
    hidden: hideFromEditors,
  },
  labels:
    collection.slug === 'imports'
      ? {
          plural: adminLabel('Nhập dữ liệu', 'Imports'),
          singular: adminLabel('Nhập dữ liệu', 'Import'),
        }
      : collection.slug === 'exports'
        ? {
            plural: adminLabel('Xuất dữ liệu', 'Exports'),
            singular: adminLabel('Xuất dữ liệu', 'Export'),
          }
        : collection.labels,
})

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
      admin: {
        group: adminGroups.advanced,
        hidden: hideFromNonSuperAdmins,
      },
      labels: {
        plural: adminLabel('Redirects', 'Redirects'),
        singular: adminLabel('Redirect', 'Redirect'),
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formOverrides: {
      access: {
        create: contentCreateAccess,
        delete: contentDeleteAccess,
        read: siteScopedOrAnyone(),
        update: siteScopedAccess(),
      },
      fields: ({ defaultFields }) => {
        const formSiteField = {
          ...siteField(),
          required: false,
        } as Field

        return [formSiteField, ...defaultFields].map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
      hooks: {
        beforeChange: [enforceSiteAccess],
      },
      admin: {
        group: adminGroups.lead,
        hidden: hideFromEditors,
      },
      labels: {
        plural: adminLabel('Biểu mẫu', 'Forms'),
        singular: adminLabel('Biểu mẫu', 'Form'),
      },
    },
    formSubmissionOverrides: {
      access: {
        // Public writes must go through /api/lead-submissions, which validates
        // tenant ownership and applies abuse controls before using Local API.
        create: () => false,
        delete: () => false,
        read: siteScopedAccess(),
        update: () => false,
      },
      fields: ({ defaultFields }) => {
        const submissionSiteField = {
          ...siteField(),
          required: false,
        } as Field

        const privateDeliveryFields: Field[] = [
          {
            name: 'enquiryContext',
            label: 'Enquiry context',
            type: 'group',
            access: {
              read: ({ req }) => Boolean(req.user),
            },
            admin: {
              description:
                'Private journey and discovery metadata. Kept separate from customer-authored form fields.',
              position: 'sidebar',
              readOnly: true,
            },
            fields: [
              { name: 'source', type: 'text', maxLength: 32 },
              { name: 'tourId', type: 'text', maxLength: 128 },
              { name: 'tourSlug', type: 'text', maxLength: 160 },
              {
                name: 'discovery',
                type: 'group',
                fields: [
                  { name: 'destination', type: 'text', maxLength: 64 },
                  { name: 'duration', type: 'text', maxLength: 64 },
                  { name: 'q', type: 'text', maxLength: 80 },
                  { name: 'style', type: 'text', maxLength: 64 },
                  { name: 'type', type: 'text', maxLength: 32 },
                ],
              },
            ],
          },
          {
            name: 'deliveryStatus',
            type: 'select',
            access: {
              read: ({ req }) => Boolean(req.user),
            },
            admin: {
              description: 'Private operational state for notification delivery and reconciliation.',
              position: 'sidebar',
              readOnly: true,
            },
            defaultValue: 'pending',
            options: [
              { label: 'Pending queue', value: 'pending' },
              { label: 'Queued', value: 'queued' },
              { label: 'Delivered', value: 'delivered' },
              { label: 'Queue failed', value: 'queue_failed' },
              { label: 'Delivery failed', value: 'delivery_failed' },
            ],
            required: true,
          },
          {
            name: 'deliveryUpdatedAt',
            type: 'date',
            access: {
              read: ({ req }) => Boolean(req.user),
            },
            admin: { position: 'sidebar', readOnly: true },
          },
          {
            name: 'deliveryErrorCode',
            type: 'text',
            access: {
              read: ({ req }) => Boolean(req.user),
            },
            admin: { position: 'sidebar', readOnly: true },
            maxLength: 64,
          },
        ]

        return [
          {
            ...submissionSiteField,
            admin: {
              ...submissionSiteField.admin,
              position: 'sidebar',
              readOnly: true,
            },
          } as Field,
          ...privateDeliveryFields,
          ...defaultFields,
        ]
      },
      hooks: {
        beforeValidate: [assignSubmissionSite],
      },
      admin: {
        components: {
          beforeList: ['@/components/AdminGuidance/LeadListGuidance'],
        },
        defaultColumns: ['form', 'site', 'createdAt'],
        group: adminGroups.lead,
      },
      labels: {
        plural: adminLabel('Lead gửi về', 'Form submissions'),
        singular: adminLabel('Lead gửi về', 'Form submission'),
      },
    },
  }),
  importExportPlugin({
    defaultVersionStatus: 'draft',
    exportLimit: 1000,
    importLimit: 250,
    overrideExportCollection: ({ collection }) => restrictDataExchangeCollection(collection),
    overrideImportCollection: ({ collection }) => restrictDataExchangeCollection(collection),
    collections: [
      {
        slug: 'sites',
        import: false,
      },
      {
        slug: 'site-settings',
        import: {
          defaultVersionStatus: 'draft',
          disableJobsQueue: true,
        },
        export: {
          disableJobsQueue: true,
        },
      },
      {
        slug: 'theme-presets',
        import: false,
        export: {
          disableJobsQueue: true,
        },
      },
      {
        slug: 'pages',
        import: {
          defaultVersionStatus: 'draft',
          disableJobsQueue: true,
        },
        export: {
          disableJobsQueue: true,
        },
      },
      {
        slug: 'posts',
        import: {
          defaultVersionStatus: 'draft',
          disableJobsQueue: true,
        },
        export: {
          disableJobsQueue: true,
        },
      },
      {
        slug: 'categories',
        import: {
          disableJobsQueue: true,
        },
        export: {
          disableJobsQueue: true,
        },
      },
      {
        slug: 'media',
        import: false,
        export: {
          disableJobsQueue: true,
        },
      },
      {
        slug: 'forms',
        import: {
          disableJobsQueue: true,
        },
        export: {
          disableJobsQueue: true,
        },
      },
      {
        slug: 'form-submissions',
        import: false,
        export: {
          disableJobsQueue: true,
        },
      },
    ],
  }),
  searchPlugin({
    collections: ['posts'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      admin: {
        group: adminGroups.advanced,
        hidden: hideFromNonSuperAdmins,
      },
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
      labels: {
        plural: adminLabel('Search Results', 'Search Results'),
        singular: adminLabel('Search Result', 'Search Result'),
      },
    },
  }),
]
