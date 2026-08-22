import path from 'node:path'

const RUN_OWNED_PREVIEW_ROOTS = ['/tmp', '/dev/shm']

export const isRunOwnedLocalPreviewPath = (value: string): boolean => {
  const resolved = path.resolve(value)
  return RUN_OWNED_PREVIEW_ROOTS.some((root) => {
    const relative = path.relative(root, resolved)
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  })
}

export const resolveWingsGroupLocalPreviewMediaDirectory = (
  configuredDirectory = process.env.E09_PREVIEW_MEDIA_DIRECTORY,
): string => {
  if (!configuredDirectory?.trim()) {
    return path.resolve(import.meta.dirname, '../../public/media')
  }

  if (process.env.NODE_ENV === 'production' || process.env.E09_PREVIEW_MEDIA_SEED !== 'true') {
    throw new Error(
      'E09_PREVIEW_MEDIA_DIRECTORY requires the explicit non-production local preview media seed.',
    )
  }

  const resolved = path.resolve(configuredDirectory)
  if (
    !isRunOwnedLocalPreviewPath(resolved) ||
    !path.basename(path.dirname(resolved)).startsWith('e09-preview-')
  ) {
    throw new Error(
      'E09 preview media must be stored under a run-owned /tmp or /dev/shm e09-preview-* directory.',
    )
  }

  return resolved
}
