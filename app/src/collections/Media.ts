import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
} from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { contentCreateAccess, contentDeleteAccess } from '@/access/roles'
import { enforceSiteAccess, siteScopedAccess, wingsGroupMediaReadAccess } from '@/access/siteScope'
import { siteField } from '@/fields/site'
import { adminGroups, adminLabel } from '@/utilities/adminLabels'
import {
  revalidateWingSideDiscovery,
  revalidateWingSideDiscoveryForTourDependency,
} from '@/collections/Tours/hooks/revalidateTourContent'
import { mediaGovernanceField, validateGovernedMediaBeforeChange } from '@/fields/wingsGroupV3'
import { resolveWingsGroupLocalPreviewMediaDirectory } from '@/utilities/localPreviewMedia'

const mediaStaticDir = resolveWingsGroupLocalPreviewMediaDirectory(
  process.env.E09_PREVIEW_MEDIA_DIRECTORY,
)

const revalidateCuratedTourMedia: CollectionAfterChangeHook = async ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    await revalidateWingSideDiscoveryForTourDependency({
      field: 'heroMedia',
      payload,
      value: doc.id,
    })
  }
  return doc
}

const revalidateDeletedTourMedia: CollectionAfterDeleteHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) revalidateWingSideDiscovery()
  return doc
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: contentCreateAccess,
    delete: contentDeleteAccess,
    read: wingsGroupMediaReadAccess,
    update: siteScopedAccess(),
  },
  admin: {
    components: {
      beforeList: ['@/components/ContentLocaleControl#ContentLocaleListControl'],
      edit: {
        beforeDocumentControls: ['@/components/ContentLocaleControl#ContentLocaleDocumentControl'],
      },
    },
    defaultColumns: ['filename', 'alt', 'site', 'updatedAt'],
    group: adminGroups.media,
  },
  fields: [
    {
      name: 'alt',
      label: 'Mô tả ảnh',
      type: 'text',
      localized: true,
      //required: true,
    },
    siteField(),
    {
      name: 'caption',
      label: 'Chú thích',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
    mediaGovernanceField,
  ],
  labels: {
    plural: adminLabel('Thư viện media', 'Media library'),
    singular: adminLabel('Media', 'Media'),
  },
  upload: {
    // Keep the normal public/media default, with an explicit run-owned local-preview override.
    staticDir: mediaStaticDir,
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes:
      process.env.PAYLOAD_IMPORT_ORIGINALS_ONLY === 'true'
        ? []
        : [
            {
              name: 'thumbnail',
              width: 300,
            },
            {
              name: 'square',
              width: 500,
              height: 500,
            },
            {
              name: 'small',
              width: 600,
            },
            {
              name: 'medium',
              width: 900,
            },
            {
              name: 'large',
              width: 1400,
            },
            {
              name: 'xlarge',
              width: 1920,
            },
            {
              name: 'og',
              width: 1200,
              height: 630,
              crop: 'center',
            },
          ],
  },
  hooks: {
    afterChange: [revalidateCuratedTourMedia],
    afterDelete: [revalidateDeletedTourMedia],
    beforeChange: [enforceSiteAccess, validateGovernedMediaBeforeChange],
  },
}
