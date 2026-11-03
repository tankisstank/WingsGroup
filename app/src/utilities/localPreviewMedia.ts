import path from 'node:path'

import { isWingsGroupLocalPreviewStoreConfigured } from './localPreviewStore'

export const resolveWingsGroupLocalPreviewMediaDirectory = (
  configuredDirectory = process.env.E09_PREVIEW_MEDIA_DIRECTORY,
): string | undefined => {
  if (isWingsGroupLocalPreviewStoreConfigured()) return undefined

  if (!configuredDirectory?.trim()) {
    if (process.env.E09_PREVIEW_MEDIA_SEED === 'true') {
      throw new Error(
        'E09_PREVIEW_MEDIA_SEED requires the authenticated in-memory E09 preview store; normal public/media is not a preview target.',
      )
    }
    return path.resolve(process.cwd(), 'public/media')
  }

  if (process.env.NODE_ENV === 'production' || process.env.E09_PREVIEW_MEDIA_SEED !== 'true') {
    throw new Error(
      'E09_PREVIEW_MEDIA_DIRECTORY requires the explicit non-production local preview media seed.',
    )
  }

  throw new Error(
    'E09_PREVIEW_MEDIA_DIRECTORY is no longer accepted: local preview media must use the authenticated in-memory store.',
  )
}
