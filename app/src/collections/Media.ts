import type {
  CollectionAfterReadHook,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  PayloadRequest,
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
import {
  generateWingsGroupV3DerivativeImageName,
  mediaGovernanceField,
  validateWingsGroupV3PublicMedia,
  validateGovernedMediaBeforeChange,
  WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES,
} from '@/fields/wingsGroupV3'
import { resolveWingsGroupLocalPreviewMediaDirectory } from '@/utilities/localPreviewMedia'
import {
  deleteWingsGroupLocalPreviewMedia,
  getWingsGroupLocalPreviewMedia,
  isWingsGroupLocalPreviewStoreConfigured,
  putWingsGroupLocalPreviewMedia,
} from '@/utilities/localPreviewStore'

const localPreviewStore = isWingsGroupLocalPreviewStoreConfigured()
const mediaStaticDir = resolveWingsGroupLocalPreviewMediaDirectory(
  process.env.E09_PREVIEW_MEDIA_DIRECTORY,
)

const storeLocalPreviewMedia: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (!localPreviewStore || !req.file?.data) return data
  const filename = typeof data?.filename === 'string' ? data.filename : req.file.name
  if (!filename) throw new Error('E09 preview media upload has no safe filename.')
  await putWingsGroupLocalPreviewMedia({
    bytes: req.file.data,
    contentType: req.file.mimetype,
    filename,
  })
  return data
}

const deleteLocalPreviewMedia: CollectionAfterDeleteHook = async ({ doc }) => {
  if (localPreviewStore && typeof doc.filename === 'string') {
    await deleteWingsGroupLocalPreviewMedia(doc.filename)
  }
  return doc
}

const serveLocalPreviewMedia = async (
  _req: PayloadRequest,
  { params }: { params: { filename: string } },
): Promise<Response> => {
  if (!localPreviewStore) return new Response(null, { status: 404 })
  return getWingsGroupLocalPreviewMedia(params.filename)
}

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

export const enforceAnonymousGovernedMediaRead: CollectionAfterReadHook = async ({ doc, req }) => {
  const governance = doc?.governance
  if (req.user || governance?.managedBy !== 'wingsgroup-v3') return doc

  const siteID =
    typeof doc.site === 'object' && doc.site && 'id' in doc.site
      ? doc.site.id
      : typeof doc.site === 'number' || typeof doc.site === 'string'
        ? doc.site
        : undefined
  if (siteID === undefined) throw new Error('WingsGroup public media requires site scope.')

  const site = await req.payload.findByID({
    collection: 'sites',
    depth: 0,
    id: siteID,
    overrideAccess: true,
    req,
  })
  const result = validateWingsGroupV3PublicMedia(
    governance,
    site?.code === 'wings-group' ? `https://${site.primaryDomain}` : undefined,
  )
  if (site?.code !== 'wings-group' || result !== true) {
    throw new Error(result === true ? 'WingsGroup public media site scope is invalid.' : result)
  }
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
    ...(mediaStaticDir ? { staticDir: mediaStaticDir } : {}),
    ...(localPreviewStore ? { adminThumbnail: undefined } : { adminThumbnail: 'thumbnail' }),
    disableLocalStorage: localPreviewStore,
    focalPoint: !localPreviewStore,
    handlers: localPreviewStore ? [serveLocalPreviewMedia] : undefined,
    imageSizes: localPreviewStore
      ? []
      : process.env.PAYLOAD_IMPORT_ORIGINALS_ONLY === 'true'
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
            ...WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES.map(({ format, name, width }) => ({
              formatOptions: { format },
              generateImageName: generateWingsGroupV3DerivativeImageName,
              name,
              width,
            })),
          ],
  },
  hooks: {
    afterRead: [enforceAnonymousGovernedMediaRead],
    afterChange: [revalidateCuratedTourMedia],
    afterDelete: [revalidateDeletedTourMedia, deleteLocalPreviewMedia],
    beforeChange: [enforceSiteAccess, validateGovernedMediaBeforeChange, storeLocalPreviewMedia],
  },
}
