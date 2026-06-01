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
    group: 'Dữ liệu',
    hidden: hideFromEditors,
  },
  labels:
    collection.slug === 'imports'
      ? {
          plural: 'Nhập dữ liệu',
          singular: 'Nhập dữ liệu',
        }
      : collection.slug === 'exports'
        ? {
            plural: 'Xuất dữ liệu',
            singular: 'Xuất dữ liệu',
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
        group: 'Nâng cao',
        hidden: hideFromNonSuperAdmins,
      },
      labels: {
        plural: 'Redirects',
        singular: 'Redirect',
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
        group: 'Lead',
        hidden: hideFromEditors,
      },
      labels: {
        plural: 'Biểu mẫu',
        singular: 'Biểu mẫu',
      },
    },
    formSubmissionOverrides: {
      access: {
        create: () => true,
        delete: () => false,
        read: siteScopedAccess(),
        update: () => false,
      },
      fields: ({ defaultFields }) => {
        const submissionSiteField = {
          ...siteField(),
          required: false,
        } as Field

        return [
          {
            ...submissionSiteField,
            admin: {
              ...submissionSiteField.admin,
              position: 'sidebar',
              readOnly: true,
            },
          } as Field,
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
        group: 'Lead',
      },
      labels: {
        plural: 'Lead gửi về',
        singular: 'Lead gửi về',
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
        group: 'Nâng cao',
        hidden: hideFromNonSuperAdmins,
      },
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
      labels: {
        plural: 'Search Results',
        singular: 'Search Result',
      },
    },
  }),
]
