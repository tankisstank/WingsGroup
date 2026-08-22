import path from 'node:path'

import { prepareWingsGroupLocalPreviewIsolation } from './localPreviewIsolation'

export const resolveWingsGroupLocalPreviewMediaDirectory = (
  configuredDirectory = process.env.E09_PREVIEW_MEDIA_DIRECTORY,
): string => {
  if (!configuredDirectory?.trim()) {
    if (process.env.E09_PREVIEW_MEDIA_SEED === 'true') {
      throw new Error(
        'E09_PREVIEW_MEDIA_SEED requires E09_PREVIEW_MEDIA_DIRECTORY; normal public/media is not a preview target.',
      )
    }
    return path.resolve(import.meta.dirname, '../../public/media')
  }

  if (process.env.NODE_ENV === 'production' || process.env.E09_PREVIEW_MEDIA_SEED !== 'true') {
    throw new Error(
      'E09_PREVIEW_MEDIA_DIRECTORY requires the explicit non-production local preview media seed.',
    )
  }

  const databaseURL = process.env.DATABASE_URL
  if (!databaseURL) {
    throw new Error(
      'E09 preview media requires DATABASE_URL to derive the same exclusive preview root.',
    )
  }

  return prepareWingsGroupLocalPreviewIsolation({
    databaseURL,
    mediaDirectory: configuredDirectory,
  }).mediaDirectory
}
